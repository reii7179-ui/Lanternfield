'use strict';
// Motion setting: Auto follows the device's reduced-motion setting, Reduced and Full override it, and the choice is remembered.
// It lives in its own localStorage key (kll-motion), never in the saved game.
//   node tests/browser/motion.js
const { launch, openGame, gameErrors, shot, report } = require('./lib.js');
(async () => {
  const browser = await launch(), problems = [];
  const calm = page => page.evaluate(() => document.documentElement.classList.contains('calm'));
  const anim = page => page.evaluate(() => { const b = document.createElement('div'); b.style.cssText = 'animation:x 1s infinite;transition:opacity 1s'; document.body.appendChild(b); const s = getComputedStyle(b), r = s.animationName + '|' + s.transitionDuration; b.remove(); return r; });
  for (const dev of ['no-preference', 'reduce']) {
    const { page, errors } = await openGame(browser);
    await page.emulateMedia({ reducedMotion: dev }); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(300);
    const want = { auto: dev === 'reduce', reduce: true, full: false };
    if (await calm(page) !== want.auto) problems.push(`device ${dev}: Auto should ${want.auto ? '' : 'not '}reduce motion`);
    await page.evaluate(() => LFUI.act('help', {}));
    await page.waitForTimeout(300);
    for (const v of ['reduce', 'full', 'auto']) {
      const b = page.locator(`#modal [data-a="motion"][data-v="${v}"]`);
      if (!(await b.count())) { problems.push('no Motion button for ' + v + ' in How to play'); continue; }
      await b.click(); await page.waitForTimeout(250);
      if (await calm(page) !== want[v]) problems.push(`device ${dev}, ${v}: motion ${want[v] ? 'should' : 'should not'} be reduced`);
      const a = await anim(page);
      if (want[v] !== (a === 'none|0s')) problems.push(`device ${dev}, ${v}: CSS animations ${want[v] ? 'still run' : 'are switched off'} (${a})`);
      if (await page.locator(`#modal [data-a="motion"][data-v="${v}"]`).getAttribute('aria-pressed') !== 'true') problems.push(`${v} button not shown as pressed`);
      if (dev === 'reduce' && v === 'full') await shot(page, 'motion-help');
    }
    await page.locator('#modal [data-a="motion"][data-v="reduce"]').click();
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(300);
    if (!(await calm(page))) problems.push(`device ${dev}: Reduced was not remembered after a reload`);
    const inSave = await page.evaluate(() => JSON.stringify(LFUI.state).includes('kll-motion') || 'motion' in LFUI.state);
    if (inSave) problems.push('the motion setting leaked into the saved game');
    problems.push(...await gameErrors(page, errors));
    await page.close();
  }
  report('motion', problems);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
