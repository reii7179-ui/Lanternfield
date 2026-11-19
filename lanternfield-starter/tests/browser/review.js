'use strict';
// The Director's incident review, with real clicks: after an injury the ride waits for the Director's review.
// Pressing a review button records the review and moves the sign-off on. It never ends the season and never runs
// the board's end-of-season review. On a laptop and a phone.
//   node tests/browser/review.js
const { launch, openGame, gameErrors, shot, report } = require('./lib.js');

// 10:00 on day 1 as the Director, with a ride fixed after an injury and waiting for the Director's review
const stage = () => {
  LFUI.act('pickseat', { v: 'dir' }); LFUI.act('begin', {}); LFUI.act('go', {});
  const S = LFUI.state; S.speed = 0;
  while (S.clock < 600) { LF.step(S); S.fx.length = 0; }
  const r = S.rides.find(x => x.sub && !x.job && !x.so), lead = S.crew.find(t => t.role === 'tech' && t.on && !t.temp);
  r.so = { k: 'injury', steps: LF.SO_STEPS.injury.slice(), i: 1, t0: S.clock, at: S.clock, lag: 0, esc: 0, x: null, wr: { cause: 'found', part: null, patch: false, test: true, who: lead.name, tid: lead.id, grade: 2 },
    lead: lead.id, pads: [], safe: true, back: 0, by: { fit: lead.name }, ctr: false, job: { type: 'fault', title: 'Drive chain guard', trade: 'mech', lock: true, mode: 'full', part: null, glitch: null, sev: 'major' } };
  // count every run of the board's season review from here on
  const season = LF.review; window.__seasonReviews = 0; LF.review = s => { window.__seasonReviews++; return season(s); };
  return { rid: r.id, signer: LF.soSigner(S, 'dir', r.so), day: S.day };
};

(async () => {
  const browser = await launch(), problems = [];
  for (const [w, h, touch] of [[1366, 768, false], [390, 844, true]]) {
    const tag = `${w}x${h}`, { page, errors } = await openGame(browser, { width: w, height: h, touch });
    const st = await page.evaluate(stage);
    if (st.signer !== 'dir') { problems.push(`${tag}: the staged incident review is not the Director's (${st.signer})`); await page.close(); continue; }
    await page.waitForTimeout(500);
    const board = page.locator(`#board [data-fk="sg-${st.rid}"]`);
    if (!(await board.count())) { problems.push(`${tag}: no button for the incident review on the ride's park board card`); await page.close(); continue; }
    await board.click(); await page.waitForTimeout(300);
    const btn = page.locator('#selp [data-a="review"]');
    if (!(await btn.count())) { problems.push(`${tag}: the ride's card has no incident review buttons`); await page.close(); continue; }
    await shot(page, `review-${tag}`);
    await btn.first().click(); await page.waitForTimeout(300);
    const after = await page.evaluate(id => { const S = LFUI.state, r = LF.ride(S, id);
      return { by: r.so ? r.so.by.review : null, step: r.so ? r.so.steps[r.so.i] : null, final: !!S.final, phase: S.phase, day: S.day, seasonReviews: window.__seasonReviews,
        endScreen: !!document.querySelector('.final') }; }, st.rid);
    if (after.by !== 'You') problems.push(`${tag}: pressing the review did not record the Director's review (${JSON.stringify(after)})`);
    if (after.step !== 'dir') problems.push(`${tag}: the sign-off did not move on to the Director's countersign (step ${after.step})`);
    if (after.final || after.phase !== 'day' || after.day !== st.day || after.endScreen) problems.push(`${tag}: pressing the review ended the season (${JSON.stringify(after)})`);
    if (after.seasonReviews) problems.push(`${tag}: pressing the review ran the board's season review ${after.seasonReviews} time(s)`);
    problems.push(...(await gameErrors(page, errors)).map(e => `${tag}: ${e}`));
    await page.close();
  }
  report('review', problems, 'the Director\'s review is recorded and never ends or reviews the season');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
