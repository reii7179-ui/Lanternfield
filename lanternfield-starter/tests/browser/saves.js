'use strict';
// Save test: a broken, half-written or out-of-date save must start a fresh game, not a dead screen;
// and a game reloaded mid-day must carry on where it was.
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
  report('saves', problems, `${Object.keys(BAD).length} bad saves recovered, reload mid-day carried on`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
