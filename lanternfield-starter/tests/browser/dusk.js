'use strict';
// The light changing (dawn, golden hour, dusk, a squall). While it changes, the ground is composed only for the part of
// the park on screen, and the night layer is prepared in the hour before dusk:
// - in plain day and plain night nothing is composed;
// - at dusk the composed part covers the whole map on screen, also after panning and zooming;
// - after a zoom late in the afternoon (which throws the layers away) the night layer is ready again before 18:00,
//   so dusk does not start with a stall on a slow phone.
//   node tests/browser/dusk.js
const { launch, openGame, gameErrors, shot, report } = require('./lib.js');
(async () => {
  const browser = await launch(), problems = [];
  for (const [w, h, dpr, touch] of [[360, 640, 2, true], [1366, 768, 1, false]]) {
    const tag = `${w}x${h}`, { page, errors } = await openGame(browser, { width: w, height: h, dpr, touch });
    const at = clock => page.evaluate(c => { const S = LFUI.state; while (S.clock < c) { LF.step(S); S.fx.length = 0; } S.speed = 0; LFUI.ui.sel = null; }, clock); // the clock stops there; frames go on
    const ground = () => page.evaluate(() => LFUI.ground());
    await page.evaluate(() => { LFUI.act('begin', {}); LFUI.act('go', {}); });
    await at(870); await page.waitForTimeout(300);
    if (!(await ground()).plain) problems.push(`${tag}: the afternoon, in plain light, still composes the ground`);
    await at(1040); await page.keyboard.press('Equal'); await page.waitForTimeout(300); await page.keyboard.press('Minus'); await page.waitForTimeout(2500);
    if (!(await ground()).nightReady) problems.push(`${tag}: after a zoom at 17:20 the night layer was not ready before dusk`);
    await at(1150); await page.waitForTimeout(300);
    for (const k of ['', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'Equal', 'ArrowRight', 'ArrowDown', 'Minus']) {
      if (k) await page.keyboard.press(k);
      await page.waitForTimeout(250);
      const g = await ground();
      if (g.plain || !g.covers) problems.push(`${tag}: at dusk${k ? ' after ' + k : ''} the composed ground does not cover the map on screen (${JSON.stringify(g)})`);
    }
    await shot(page, `dusk-${tag}`);
    await at(1240); await page.waitForTimeout(300);
    if (!(await ground()).plain) problems.push(`${tag}: full night still composes the ground`);
    problems.push(...(await gameErrors(page, errors)).map(e => `${tag}: ${e}`));
    await page.close();
  }
  report('dusk', problems, 'composed only on screen, night layer ready before dusk');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
