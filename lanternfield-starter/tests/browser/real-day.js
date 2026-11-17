'use strict';
// One real day played with real clicks and keys at 2x (about 3 minutes): answers requests, sends people with E,
// sends tired people on breaks with B, holds toolbox talks. Checks for errors and that the playtest record was written.
//   node tests/browser/real-day.js
const { launch, openGame, gameErrors, shot, report } = require('./lib.js');
(async () => {
  const browser = await launch(), problems = [];
  const { page, errors } = await openGame(browser);
  await page.click('.dialog [data-a=begin]'); await page.click('[data-a=go]'); await page.click('#b-s2');
  const n = { answers: 0, sends: 0, breaks: 0, talks: 0 }, t0 = Date.now();
  while (Date.now() - t0 < 240e3 && await page.evaluate(() => LFUI.state.phase) === 'day') {
    try {
      const a = page.locator('[data-a=ans]:not([disabled])').first(); if (await a.count()) { await a.click({ timeout: 600 }); n.answers++; }
      const rid = await page.evaluate(() => { const S = LFUI.state, r = S.rides.find(r => r.job && r.job.type === 'fault' && !S.crew.some(c => c.target === r.id)); return r ? r.id : null; });
      if (rid) { await page.click(`#board [data-id="${rid}"]`, { timeout: 600 }); await page.keyboard.press('e'); n.sends++; }
      const tired = await page.evaluate(() => { const S = LFUI.state; if (S.rides.some(r => r.job && r.job.type === 'fault' && !S.crew.some(c => c.target === r.id))) return null; const c = S.crew.find(c => c.role === 'tech' && c.on && !c.target && !c.brk && !c.talk && LF.enOf(c) < 50); return c ? c.id : null; });
      if (tired) { await page.click(`#rail [data-id="${tired}"]`, { timeout: 600 }); await page.keyboard.press('b'); await page.keyboard.press('Escape'); n.breaks++; }
      const w = page.locator('#selp [data-a=walk]:not([disabled])');
      if (await w.count() && await page.evaluate(() => LFUI.state.comp >= 40)) { await w.first().click({ timeout: 600 }); n.talks++; }
    } catch (e) { /* the screen changed under the click */ }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);
  const end = await page.evaluate(() => ({ phase: LFUI.state.phase, record: LFUI.state.pt || [] }));
  if (end.phase !== 'plan') problems.push(`the day did not end within 4 minutes (phase ${end.phase})`);
  if (!end.record.length) problems.push('no playtest record was written for the day');
  await shot(page, 'real-day-end');
  console.log('actions', JSON.stringify(n), 'playtest record', JSON.stringify(end.record));
  report('real day', problems.concat(await gameErrors(page, errors)));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
