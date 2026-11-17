'use strict';
// End-of-season screen: plays a whole season inside the page, then checks the score breakdown,
// "your own work", the playtest record and its Copy button.
//   node tests/browser/final-screen.js
const { launch, openGame, gameErrors, shot, report } = require('./lib.js');
(async () => {
  const browser = await launch(), problems = [];
  const { page, errors } = await openGame(browser);
  await page.evaluate(() => {
    LFUI.act('begin', {}); const S = LFUI.state;
    S.pt = [{ day: 1, diff: 'standard', seat: 'sup', faults: 9, react: 2.4, fast: 67, reqs: 5, answer: 3.1 }];
    while (!S.final) {
      if (S.phase === 'plan') { for (let k = 0; k < 2; k++) LF.hire(S, 0); LF.startDay(S); continue; }
      for (const r of S.rides) if (r.job && r.job.type === 'fault' && !S.crew.some(c => c.target === r.id)) { const c = S.crew.find(c => c.role === 'tech' && c.on && !c.target && c.skills[r.job.trade]); if (c) LF.assign(S, c, r); }
      for (const it of S.inbox.slice()) { const o = LF.optsOf(S, it); if (o.length) LF.answer(S, it.id, o[0].v); }
      if (S.clock % 30 === 0) LF.walk(S, 'safety');
      LF.step(S); S.fx.length = 0;
    }
    LFUI.ui.reportAt = 0; LFUI.act('objt', {});
  });
  await page.waitForTimeout(500);
  const txt = (await page.evaluate(() => (document.querySelector('.dialog') || {}).innerText || '')).toLowerCase();
  for (const want of ['how the score is made', 'your own work', 'playtest record', 'run another season']) if (!txt.includes(want)) problems.push(`final screen is missing "${want}"`);
  await shot(page, 'final-screen');
  const copy = page.locator('[data-a=ptcopy]');
  if (await copy.count()) { await copy.click(); await page.waitForTimeout(300); } else problems.push('no Copy button for the playtest record');
  report('final screen', problems.concat(await gameErrors(page, errors)));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
