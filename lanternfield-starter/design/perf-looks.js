'use strict';
// Rough frame cost of each art-direction mock-up: a laptop screen, and a phone with the CPU slowed 4x.
//   node design/perf-looks.js current glow iso fair      (run design/shoot.js first: it builds design/out/<look>.html)
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const players = fs.readFileSync(path.join(__dirname, '../tests/engine/players.js'), 'utf8').replace('return { season, PLAYERS };', 'return { season, PLAYERS, plan, dispatch, answerAll, seatPlay };').replace("'use strict';", '').replace('module.exports = function makePlayers(L)', 'window.__makePlayers = function makePlayers(L)');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  for (const look of process.argv.slice(2)) for (const [w, h, dpr, thr] of [[1440, 900, 1, 1], [390, 844, 3, 4]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: w < 900 });
    await page.goto('file://' + path.join(__dirname, 'out', look + '.html'));
    await page.evaluate(() => { localStorage.clear(); for (const k of ['sup', 'desk', 'tech', 'mgr', 'dir', 'ceo']) localStorage.setItem('kll-coached-' + k, '1'); });
    await page.reload(); await page.waitForTimeout(300); await page.addScriptTag({ content: players });
    await page.evaluate(() => { const P = window.__makePlayers(window.LF); window.__mock.scene({ seed: 101, day: 2, clock: 860, P, o: { seat: 'sup', plan: true, hands: true, inbox: true, smart: true, talk: 'quiet', delay: 4, every: 3, inboxEvery: 4 } }); LFUI.state.speed = 2; });
    const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => new Promise(res => { const d = []; let last = performance.now(); const t0 = last; const f = t => { d.push(t - last); last = t; if (t - t0 < 5000) requestAnimationFrame(f); else { d.sort((a, b) => a - b); res({ fps: Math.round(1000 / (d.reduce((a, b) => a + b, 0) / d.length)), p95: +d[Math.floor(d.length * .95)].toFixed(1) }); } }; requestAnimationFrame(f); }));
    console.log(`${look.padEnd(8)} ${w}x${h}@${dpr}x cpu/${thr}: ${r.fps} fps, slowest 5% ${r.p95} ms`);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
