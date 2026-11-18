'use strict';
// The active seats in the browser (grows step by step):
// - a fixed ride waiting for your countersign shows "Sign to reopen" on its park board card and "SIGN NOW" on the map;
//   the button opens its card with the job sheet, and signing it sends it on, until it reopens;
// - the layout holds on a phone while a ride waits.
//   node tests/browser/seats.js
const { launch, openGame, gameErrors, shot, report } = require('./lib.js');
// a brake fault on a coaster, patched for lack of a part: safety-critical, so the supervisor must countersign
const stage = () => {
  LFUI.act('begin', {}); LFUI.act('go', {}); const S = LFUI.state; S.speed = 0;
  while (S.clock < 700) { LF.step(S); S.fx.length = 0; }
  const r = LF.ride(S, 'tide'); if (r.job) r.job = null; r.so = null;
  LF.createFault(S, r, { title: 'Brake fin worn past its limit', trade: 'mech', sev: 'major' }); r.job.rescue = 0; r.job.mode = 'patch';
  const t = S.crew.find(c => c.role === 'tech' && c.skills.mech && c.on); t.target = null; LF.assign(S, t, r, null, true);
  let n = 0; while (!(r.so && r.so.steps[r.so.i] === 'sup') && n++ < 400) { LF.step(S); S.fx.length = 0; }
  return r.so ? r.so.steps[r.so.i] : 'none';
};
(async () => {
  const browser = await launch(), problems = [];
  for (const [w, h, touch] of [[1366, 768, false], [390, 844, true]]) {
    const tag = `${w}x${h}`, { page, errors } = await openGame(browser, { width: w, height: h, touch });
    const at = await page.evaluate(stage);
    if (at !== 'sup') { problems.push(`${tag}: could not stage a ride waiting for the supervisor's countersign (${at})`); await page.close(); continue; }
    await page.waitForTimeout(500);
    const btn = page.locator('#board [data-fk="sg-tide"]');
    if (!(await btn.count())) problems.push(`${tag}: no "Sign to reopen" on the park board card`);
    else {
      if (!/sign to reopen/i.test(await btn.innerText())) problems.push(`${tag}: the board button says "${await btn.innerText()}"`);
      const box = await btn.boundingBox(); if (!box || box.height < 24) problems.push(`${tag}: the sign button is too small to tap (${box && box.height}px)`);
      await btn.click(); await page.waitForTimeout(300);
    }
    const card = await page.evaluate(() => ({ sel: LFUI.ui.sel, sheet: !!document.querySelector('#selp .sheet'), sign: !!document.querySelector('#selp [data-a="csign"][data-v="sign"]'), back: !!document.querySelector('#selp [data-a="csign"][data-v="back"]'), gap: /safety-critical/.test((document.querySelector('#selp [data-a="csign"][data-v="sign"]') || {}).innerText || '') }));
    if (card.sel !== 'tide' || !card.sheet || !card.sign || !card.back) problems.push(`${tag}: the card does not show the job sheet with Sign and Send back (${JSON.stringify(card)})`);
    if (!card.gap) problems.push(`${tag}: the Sign button does not say the sheet has a patch on a safety-critical part`);
    await shot(page, `seats-signoff-${tag}`);
    if (card.sign) { await page.click('#selp [data-a="csign"][data-v="sign"]'); await page.waitForTimeout(200); }
    const after = await page.evaluate(() => { const S = LFUI.state, r = LF.ride(S, 'tide'); const step0 = r.so ? r.so.steps[r.so.i] : 'open'; for (let i = 0; i < 6; i++) { LF.step(S); S.fx.length = 0; } return { step0, status: LF.status(S, r), by: r.so ? r.so.by : null }; });
    if (after.step0 === 'sup') problems.push(`${tag}: signing did not move the ride on`);
    if (after.status !== 'ok' && after.status !== 'degraded') problems.push(`${tag}: the ride did not reopen after the countersign and Operations' check (${after.status})`);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (wide) problems.push(`${tag}: the page scrolls sideways`);
    problems.push(...(await gameErrors(page, errors)).map(e => `${tag}: ${e}`));
    await page.close();
  }
  report('seats', problems, 'sign to reopen on the board and the card');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
