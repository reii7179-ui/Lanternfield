'use strict';
// Frame time at 2x speed.
// 1. A laptop-sized and a phone-sized screen, from the start of day 1. Fails only below 30 fps.
// 2. The phone budget: a busy afternoon (day 2, about 14:30, guests on every path) on a 390x844 phone with a 3x screen
//    and the processor slowed 4x. The game must run at least as fast as it did before the visual work, kept in
//    tests/browser/baseline/before-visuals.html. Headless frame rates drift from run to run, so the two are measured
//    alternately in fresh browsers (RUNS each) and their medians compared. Headless browsers also draw without a GPU,
//    so a real phone is faster than this: the numbers are for comparing versions, not a promise about any one device.
//   node tests/browser/perf.js            all of it
//   node tests/browser/perf.js --phone    only the phone budget
const fs = require('fs'), path = require('path');
const { launch, openGame, report } = require('./lib.js');
const BASELINE = path.join(__dirname, 'baseline', 'before-visuals.html'), RUNS = 3;
const median = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const players = fs.readFileSync(path.join(__dirname, '../engine/players.js'), 'utf8')
  .replace('return { season, PLAYERS };', 'return { season, PLAYERS, plan, dispatch, answerAll, seatPlay };')
  .replace("'use strict';", '').replace('module.exports = function makePlayers(L)', 'window.__makePlayers = function makePlayers(L)');
const measure = (page, ms) => page.evaluate(ms => new Promise(res => {
  const d = []; let last = performance.now(); const t0 = last;
  const f = t => { d.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else { d.sort((a, b) => a - b); const sum = d.reduce((a, b) => a + b, 0); res({ frames: d.length, fps: +(1000 / (sum / d.length)).toFixed(1), avgMs: +(sum / d.length).toFixed(1), p95Ms: +d[Math.floor(d.length * .95)].toFixed(1), worstMs: +d[d.length - 1].toFixed(1), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }); } };
  requestAnimationFrame(f);
}), ms);

async function busyPhone(file) {
  const browser = await launch(), { page } = await openGame(browser, { width: 390, height: 844, touch: true, dpr: 3, file });
  await page.addScriptTag({ content: players });
  await page.evaluate(() => {
    const L = LF, S = LFUI.state, P = window.__makePlayers(L), o = { seat: 'sup', plan: true, hands: true, inbox: true, smart: true, talk: 'quiet', delay: 4, every: 3, inboxEvery: 4 };
    LFUI.act('begin', {});
    for (;;) { // the scripted attentive supervisor plays up to day 2, 14:30
      if (S.phase === 'plan') { P.plan(S); LFUI.act('go', {}); S.paused = true; continue; }
      if (S.day >= 2 && S.clock >= 870) break;
      if (S.clock % 3 === 0) P.dispatch(S, o); if (S.clock % 4 === 0) P.answerAll(S); P.seatPlay(S, o);
      L.step(S); S.fx.length = 0;
      if (S.phase !== 'day' && S.phase !== 'plan') break;
    }
    LFUI.act('speed', { v: 2 });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(4000); // guests fill the paths
  const r = await measure(page, 6000);
  await browser.close();
  return r;
}

module.exports = { busyPhone };
if (require.main === module) (async () => {
  const browser = await launch(), problems = [], phoneOnly = process.argv.includes('--phone');
  if (!phoneOnly) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { page } = await openGame(browser, { width: w, height: h, touch: w < 900 });
    await page.evaluate(() => { LFUI.act('begin', {}); LFUI.act('go', {}); LFUI.act('speed', { v: 2 }); });
    await page.waitForTimeout(1500);
    const r = await measure(page, 6000);
    console.log(`${w}x${h}: ${JSON.stringify(r)}`);
    if (r.avgMs > 33.4) problems.push(`${w}x${h}: average frame ${r.avgMs} ms (slower than 30 fps)`);
    await page.close();
  }
  const fps = { before: [], now: [] };
  for (let i = 0; i < RUNS; i++) for (const [k, file] of [['before', BASELINE], ['now', null]]) {
    const r = await busyPhone(file); fps[k].push(r.fps);
    console.log(`phone budget, ${k === 'now' ? 'this build ' : 'before visuals'} (390x844 @3x, CPU slowed 4x, busy afternoon): ${JSON.stringify(r)}`);
  }
  const before = median(fps.before), now = median(fps.now);
  if (now < before) problems.push(`phone budget: ${now} fps, slower than the ${before} fps the game managed before the visual work (medians of ${RUNS})`);
  report('perf', problems, `phone budget ${now} fps against ${before} fps before the visual work (medians of ${RUNS})`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
