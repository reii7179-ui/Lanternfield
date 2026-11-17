'use strict';
// Frame-time check at 2x speed on a laptop-sized and a phone-sized screen.
// Fails only if the average frame is slower than 30 fps; it prints the numbers so you can watch the trend.
// Headless browsers render in software, so a real device is usually faster than this.
//   node tests/browser/perf.js
const { launch, openGame, report } = require('./lib.js');
(async () => {
  const browser = await launch(), problems = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { page } = await openGame(browser, { width: w, height: h, touch: w < 900 });
    await page.evaluate(() => { LFUI.act('begin', {}); LFUI.act('go', {}); LFUI.act('speed', { v: 2 }); });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => new Promise(res => {
      const d = []; let last = performance.now(); const t0 = last;
      const f = t => { d.push(t - last); last = t; if (t - t0 < 6000) requestAnimationFrame(f); else { d.sort((a, b) => a - b); const sum = d.reduce((a, b) => a + b, 0); res({ frames: d.length, avgMs: +(sum / d.length).toFixed(1), p95Ms: +d[Math.floor(d.length * .95)].toFixed(1), worstMs: +d[d.length - 1].toFixed(1), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }); } };
      requestAnimationFrame(f);
    }));
    console.log(`${w}x${h}: ${JSON.stringify(r)}`);
    if (r.avgMs > 33.4) problems.push(`${w}x${h}: average frame ${r.avgMs} ms (slower than 30 fps)`);
    await page.close();
  }
  report('perf', problems);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
