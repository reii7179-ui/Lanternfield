'use strict';
// Interface motion: panels are patched in place (not rebuilt), so
// - an element that stays keeps its identity across redraws, and a card's slide-in plays once, not on every redraw;
// - timer bars slide to their new width; the top-bar numbers count to, and settle on, the real value;
// - a dialog that closes fades out and is gone a moment later;
// - with reduced motion none of that animates: dialogs close at once, numbers jump, nothing slides.
//   node tests/browser/ui-motion.js
const { launch, openGame, gameErrors, report } = require('./lib.js');
(async () => {
  const browser = await launch(), problems = [];
  for (const dev of ['no-preference', 'reduce']) {
    const calm = dev === 'reduce', tag = calm ? 'reduced motion' : 'full motion';
    const { page, errors } = await openGame(browser, { width: 1366, height: 768 });
    await page.emulateMedia({ reducedMotion: dev }); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(400);
    await page.evaluate(() => { LFUI.act('begin', {}); LFUI.act('go', {}); LFUI.act('speed', { v: 2 }); });
    await page.waitForFunction(() => document.querySelector('#obj .alert') && document.querySelector('#board [data-fk="as-carou"]'), null, { timeout: 20000 });
    const first = await page.evaluate(() => { const a = document.querySelector('#obj .alert'); window.__a = a; window.__tile = document.querySelector('#board [data-fk="as-carou"]'); window.__h = document.getElementById('obj')._h; return { key: a.getAttribute('data-fk'), anims: a.getAnimations().map(x => x.animationName) }; });
    if (calm && first.anims.length) problems.push(`${tag}: a new card animates (${first.anims.join(', ')})`);
    if (!calm && !first.anims.includes('lf-slide')) problems.push(`${tag}: a new card does not slide in`);
    await page.waitForTimeout(1500);
    const later = await page.evaluate(k => {
      const a = document.querySelector(`#obj .alert[data-fk="${k}"]`), redrawn = document.getElementById('obj')._h !== window.__h;
      return { same: a === window.__a, alive: !!(a && a.isConnected), redrawn, tile: document.querySelector('#board [data-fk="as-carou"]') === window.__tile,
        replays: a ? a.getAnimations().filter(x => x.animationName === 'lf-slide' && x.playState === 'running').length : 0,
        bar: a && a.querySelector('i') ? getComputedStyle(a.querySelector('i')).transitionDuration : '' };
    }, first.key);
    if (later.alive && !later.same) problems.push(`${tag}: the alert card was rebuilt instead of updated in place`);
    if (!later.tile) problems.push(`${tag}: a park board tile was rebuilt instead of updated in place`);
    if (!later.redrawn) problems.push(`${tag}: the objectives panel did not redraw during the check, so identity was not tested`);
    if (later.replays) problems.push(`${tag}: the card's slide-in replayed on a redraw`);
    if (later.alive && !calm && !/0\.45s/.test(later.bar)) problems.push(`${tag}: the card's timer bar does not slide (transition ${later.bar})`);
    // numbers settle on the real value once the clock stops
    await page.evaluate(() => LFUI.act('pause', {})); await page.waitForTimeout(900);
    const nums = await page.evaluate(() => ({ cash: document.getElementById('h-cash').textContent, want: LF.fmtMoney(Math.round(LFUI.state.cash)), lit: document.getElementById('h-lit').textContent, wantLit: `${LFUI.state.total}/${LF.N_RIDES * LF.DAYS}` }));
    if (nums.cash !== nums.want) problems.push(`${tag}: cash shows ${nums.cash}, should settle on ${nums.want}`);
    if (nums.lit !== nums.wantLit) problems.push(`${tag}: lanterns show ${nums.lit}, should be ${nums.wantLit}`);
    // a dialog closing: fades out with full motion, gone at once with reduced motion
    await page.evaluate(() => { LFUI.act('pause', {}); LFUI.act('help', {}); }); await page.waitForTimeout(400); // resume first, so closing help leaves no dialog (paused would show the Paused one)
    await page.evaluate(() => { LFUI.act('closehelp', {}); });
    await page.waitForTimeout(40);
    const mid = await page.evaluate(() => { const m = document.getElementById('modal'); return { leaving: m.classList.contains('leaving'), inert: m.inert, empty: !m.querySelector('.dialog [data-a="closehelp"]') }; });
    if (calm && !mid.empty) problems.push(`${tag}: the closed dialog lingered`);
    if (!calm && !(mid.leaving && mid.inert)) problems.push(`${tag}: the closed dialog did not fade out (or still took clicks while it did)`);
    await page.waitForTimeout(400);
    if (!(await page.evaluate(() => !document.querySelector('#modal .dialog [data-a="closehelp"]')))) problems.push(`${tag}: the closed dialog never went away`);
    problems.push(...(await gameErrors(page, errors)).map(e => `${tag}: ${e}`));
    await page.close();
  }
  report('ui motion', problems);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
