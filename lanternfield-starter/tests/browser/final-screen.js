'use strict';
// End-of-season screen: plays a whole season inside the page, then checks the score breakdown,
// "your own work" (and, as a technician, their own company/own-work split), the seat's counts (on time, missed, escalated, countersigns, its mistakes), the playtest record and its Copy button.
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
  for (const want of ['how the score is made', 'your own work', 'playtest record', 'run another season', 'on time / missed / escalated', 'countersigns: signed / sent back / missed', 'jobs you took on yourself', 'people pulled off with their padlock on']) if (!txt.includes(want)) problems.push(`final screen is missing "${want}"`);
  await shot(page, 'final-screen');
  await page.evaluate(() => { const c = document.querySelector('.dialog .cards'); if (c) c.scrollIntoView(); }); await page.waitForTimeout(1500);
  await shot(page, 'final-screen-seats');
  const copy = page.locator('[data-a=ptcopy]');
  if (await copy.count()) { await copy.click(); await page.waitForTimeout(300); } else problems.push('no Copy button for the playtest record');
  // as a technician the score is split differently: TECH_CO company, the rest your own work
  { const { page: tp, errors: te } = await openGame(browser);
    await tp.evaluate(() => { LFUI.act('pickseat', { v: 'tech' }); LFUI.act('begin', {}); const S = LFUI.state;
      while (!S.final) { if (S.phase === 'plan') { LF.startDay(S); continue; } LF.step(S); S.fx.length = 0; }
      LFUI.ui.reportAt = 0; LFUI.act('objt', {}); });
    await tp.waitForTimeout(500);
    const t = await tp.evaluate(() => ({ co: LF.TECH_CO, seat: LFUI.state.final.own.seat, line: ((document.querySelector('.dialog .own .num') || {}).innerText || '').replace(/\s+/g, ' ') }));
    const co = Math.round(t.co * 100);
    if (t.seat !== 'tech') problems.push(`technician season was judged in the ${t.seat} seat`);
    else if (!new RegExp(`Company \\d+ × ${co}% \\+ your own work \\d+ × ${100 - co}% = \\d+`).test(t.line)) problems.push(`technician end screen does not show the ${co}/${100 - co} split: "${t.line}"`);
    await shot(tp, 'final-screen-tech');
    problems.push(...(await gameErrors(tp, te)).map(e => `technician: ${e}`)); await tp.close(); }
  report('final screen', problems.concat(await gameErrors(page, errors)));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
