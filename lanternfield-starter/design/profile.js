'use strict';
// Frame-time profile of the heaviest moments, on two slowed-down phones, for this build and the game before the visual
// work. Prints a table: average and slow-frame times, frames over 50 ms (visible stutters), main-thread work per frame.
//   node design/profile.js [runs]            (default 2 runs of each; takes several minutes)
// Moments: a busy afternoon; a squall arriving; dusk (the light changing, caches repainting); closing time into the report.
const fs = require('fs'), path = require('path');
const { launch, openGame } = require('../tests/browser/lib.js');
const ROOT = path.join(__dirname, '..'), RUNS = +(process.argv[2] || 2);
const BUILDS = { before: path.join(ROOT, 'tests/browser/baseline/before-visuals.html'), now: path.join(ROOT, 'index.html') };
const PHONES = { mid: { width: 390, height: 844, dpr: 3, cpu: 4 }, low: { width: 360, height: 640, dpr: 2, cpu: 6 } };
const MOMENTS = { afternoon: 'day', squall: 'squall', dusk: 1100, closing: 1310 };
const players = fs.readFileSync(path.join(ROOT, 'tests/engine/players.js'), 'utf8').replace('return { season, PLAYERS };', 'return { season, PLAYERS, plan, dispatch, answerAll, seatPlay };').replace("'use strict';", '').replace('module.exports = function makePlayers(L)', 'window.__makePlayers = function makePlayers(L)');
async function one(file, phone, moment) {
  const browser = await launch(), { page } = await openGame(browser, { width: phone.width, height: phone.height, dpr: phone.dpr, touch: true, file });
  await page.addScriptTag({ content: players });
  await page.evaluate(moment => {
    const L = LF, S = LFUI.state, P = window.__makePlayers(L), o = { seat: 'sup', plan: true, hands: true, inbox: true, smart: true, talk: 'quiet', delay: 4, every: 3, inboxEvery: 4 };
    LFUI.act('begin', {});
    const until = () => moment === 'day' ? 870 : moment === 'squall' ? (S.waves[0] ? S.waves[0].at - 4 : 870) : moment;
    for (;;) {
      if (S.phase === 'plan') { P.plan(S); LFUI.act('go', {}); S.paused = true; continue; }
      if (S.day >= 2 && S.clock >= until()) break;
      if (S.clock % 3 === 0) P.dispatch(S, o); if (S.clock % 4 === 0) P.answerAll(S); P.seatPlay(S, o); L.step(S); S.fx.length = 0;
    }
    LFUI.act('speed', { v: 2 });
  }, moment);
  const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: phone.cpu });
  await page.waitForTimeout(1500);
  const busy = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'TaskDuration').value;
  const b0 = await busy();
  const r = await page.evaluate(() => new Promise(res => { const d = []; let last = performance.now(); const t0 = last; const f = t => { d.push(t - last); last = t; if (t - t0 < 7000) requestAnimationFrame(f); else { const s = d.slice().sort((a, b) => a - b); res({ n: d.length, avg: d.reduce((a, b) => a + b, 0) / d.length, p95: s[Math.floor(s.length * .95)], worst: s[s.length - 1], over50: d.filter(x => x > 50.5).length }); } }; requestAnimationFrame(f); }));
  r.main = (await busy() - b0) * 1000 / r.n;
  await browser.close();
  return r;
}
(async () => {
  const rows = [];
  for (const [pn, phone] of Object.entries(PHONES)) for (const [mn, moment] of Object.entries(MOMENTS)) {
    const res = {};
    for (let i = 0; i < RUNS; i++) for (const [bn, file] of Object.entries(BUILDS)) (res[bn] = res[bn] || []).push(await one(file, phone, moment));
    const med = (a, k) => a.map(x => x[k]).sort((x, y) => x - y)[Math.floor(a.length / 2)];
    for (const bn of Object.keys(BUILDS)) rows.push([pn, mn, bn, med(res[bn], 'avg'), med(res[bn], 'p95'), med(res[bn], 'over50'), med(res[bn], 'main')]);
    console.log(rows.slice(-2).map(r => `${r[0].padEnd(4)} ${r[1].padEnd(10)} ${r[2].padEnd(7)} fps ${(1000 / r[3]).toFixed(1).padStart(5)}  avg ${r[3].toFixed(1).padStart(5)} ms  slowest 5% ${r[4].toFixed(1).padStart(5)} ms  stutters ${String(r[5]).padStart(3)}  main ${r[6].toFixed(1).padStart(5)} ms`).join('\n'));
  }
})().catch(e => { console.error(e); process.exit(1); });
