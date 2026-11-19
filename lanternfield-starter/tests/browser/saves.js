'use strict';
// Save test: a broken, half-written or out-of-date save must start a fresh game, not a dead screen;
// a game reloaded mid-day must carry on where it was; and the 4x button runs the clock at 4x and survives a reload.
//   node tests/browser/saves.js
const { launch, openGame, gameErrors, report } = require('./lib.js');
const KEY = 'keep-lanternfield-lit-v7';
const BAD = { 'empty rides and crew': '{"v":7,"rides":[],"crew":[],"org":{},"sc":{}}', 'cut-off JSON': '{"v":7,"rides":[{"id":"tide"', 'old format': '{"v":6,"rides":[1],"crew":[1],"org":{},"sc":{}}', 'not JSON at all': 'hello' };

(async () => {
  const browser = await launch(), problems = [];
  for (const [label, payload] of Object.entries(BAD)) {
    const { page, errors } = await openGame(browser, { clear: false, initScript: `if (!sessionStorage.__seeded) { sessionStorage.__seeded = 1; localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(payload)}); }` });
    await page.waitForTimeout(500);
    const st = await page.evaluate(() => { try { const S = LFUI.state; return { phase: S.phase, rides: S.rides.length, crew: S.crew.length }; } catch (e) { return { err: e.message }; } });
    if (st.err || st.phase !== 'plan' || st.rides < 12 || !st.crew) problems.push(`${label}: did not start a fresh game (${JSON.stringify(st)})`);
    for (const e of await gameErrors(page, errors)) problems.push(`${label}: ${e}`);
    await page.close();
  }
  // reload mid-day
  const { page, errors } = await openGame(browser);
  await page.evaluate(() => { LFUI.act('begin', {}); LFUI.act('go', {}); LFUI.act('speed', { v: 2 }); });
  await page.waitForTimeout(5000);
  const before = await page.evaluate(() => ({ day: LFUI.state.day, clock: LFUI.state.clock, cash: Math.round(LFUI.state.cash) }));
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ day: LFUI.state.day, clock: LFUI.state.clock, phase: LFUI.state.phase }));
  if (after.day !== before.day || after.phase !== 'day' || Math.abs(after.clock - before.clock) > 15) problems.push(`reload mid-day did not carry on: before ${JSON.stringify(before)}, after ${JSON.stringify(after)}`);
  for (const e of await gameErrors(page, errors)) problems.push('reload: ' + e);
  // 4x: the button runs the park clock at 10 minutes a real second, and a save made at 4x comes back at 4x (paused)
  await page.evaluate(() => LFUI.act('begin', {})); await page.waitForTimeout(300); // past the title screen, back into the day
  await page.click('#b-s4'); await page.waitForTimeout(300);
  const c0 = await page.evaluate(() => LFUI.state.clock), t0 = Date.now(); await page.waitForTimeout(3000);
  const four = await page.evaluate(() => ({ speed: LFUI.state.speed, clock: LFUI.state.clock, pressed: document.getElementById('b-s4').getAttribute('aria-pressed') }));
  const rate = (four.clock - c0) / ((Date.now() - t0) / 1000);
  if (four.speed !== 4 || four.pressed !== 'true') problems.push(`the 4x button did not set 4x (${JSON.stringify(four)})`);
  if (!(rate > 6 && rate < 12)) problems.push(`at 4x the park clock ran ${rate.toFixed(1)} minutes a second, not about 10`);
  await page.waitForTimeout(5200); // the game saves every 5 s
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600);
  const back = await page.evaluate(() => ({ speed: LFUI.state.speed, paused: LFUI.state.paused }));
  if (back.speed !== 4) problems.push(`a save made at 4x came back at ${back.speed}x`);
  for (const e of await gameErrors(page, errors)) problems.push('4x: ' + e);
  report('saves', problems, `${Object.keys(BAD).length} bad saves recovered, reload mid-day carried on, 4x runs at ${rate.toFixed(1)} park minutes a second and survives a reload`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
