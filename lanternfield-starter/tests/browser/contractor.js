'use strict';
// The Manager's contractor, start to finish, with real clicks:
// - as the Engineering Manager, call a contractor from a broken ride's card (nobody of that trade can come);
// - when the contractor has finished, "Sign to reopen" appears on the ride's park board card; the card shows the
//   contractor's job sheet with Sign and Send back; signing it lets the ride reopen.
// On a laptop and a phone.
//   node tests/browser/contractor.js
const { launch, openGame, gameErrors, shot, report } = require('./lib.js');

// 10:00 on day 1 as the Manager, with a major fault on a ride that nobody on shift can fix
const stage = () => {
  LFUI.act('pickseat', { v: 'mgr' }); LFUI.act('begin', {}); LFUI.act('go', {});
  const S = LFUI.state; S.speed = 0;
  while (S.clock < 600) { LF.step(S); S.fx.length = 0; }
  const r = S.rides.find(x => x.sub && !x.job && !x.so && x.id !== 'wheel');
  for (const t of S.crew) if (t.role === 'tech' && !t.temp && t.skills.ctrl) { t.sick = true; t.on = false; t.target = null; } // the controls technicians are off sick today
  LF.createFault(S, r, { title: 'Controller fault', trade: 'ctrl', sev: 'major' }); r.job.rescue = 0;
  LFUI.ui.sel = r.id; return r.id;
};

(async () => {
  const browser = await launch(), problems = [];
  for (const [w, h, touch] of [[1366, 768, false], [390, 844, true]]) {
    const tag = `${w}x${h}`, { page, errors } = await openGame(browser, { width: w, height: h, touch });
    const rid = await page.evaluate(stage); await page.waitForTimeout(500);
    const call = page.locator('#selp [data-a="callout"]');
    if (!(await call.count())) { problems.push(`${tag}: no Contractor button on the broken ride's card`); await page.close(); continue; }
    await call.first().click(); await page.waitForTimeout(200);
    const called = await page.evaluate(id => LFUI.state.crew.some(t => t.temp && t.target === id), rid);
    if (!called) { problems.push(`${tag}: the Contractor button did not call a contractor`); await page.close(); continue; }
    // the contractor arrives, works and signs it fit to run: then it waits for the Manager
    const at = await page.evaluate(id => { const S = LFUI.state, r = LF.ride(S, id); let n = 0;
      while (n++ < 400 && !(r.so && r.so.steps[r.so.i] === 'mgr')) { LF.step(S); S.fx.length = 0; }
      return r.so ? { step: r.so.steps[r.so.i], steps: r.so.steps.join(','), ctr: !!r.so.ctr } : { step: 'none' }; }, rid);
    if (at.step !== 'mgr') { problems.push(`${tag}: the contractor's job never reached the Manager's acceptance (${JSON.stringify(at)})`); await page.close(); continue; }
    await page.waitForTimeout(500);
    const btn = page.locator(`#board [data-fk="sg-${rid}"]`);
    if (!(await btn.count())) problems.push(`${tag}: no "Sign to reopen" on the ride's park board card`);
    else { await btn.click(); await page.waitForTimeout(300); }
    const card = await page.evaluate(() => ({ sheet: !!document.querySelector('#selp .sheet'), sign: !!document.querySelector('#selp [data-a="csign"][data-v="sign"]'), back: !!document.querySelector('#selp [data-a="csign"][data-v="back"]'), ctr: /contractor/i.test((document.querySelector('#selp .so') || {}).innerText || '') }));
    if (!card.sheet || !card.sign || !card.back) problems.push(`${tag}: the card does not show the contractor's job sheet with Sign and Send back (${JSON.stringify(card)})`);
    if (!card.ctr) problems.push(`${tag}: the card does not say it is a contractor's work`);
    await shot(page, `contractor-accept-${tag}`);
    if (card.sign) { await page.click('#selp [data-a="csign"][data-v="sign"]'); await page.waitForTimeout(200); }
    const after = await page.evaluate(id => { const S = LFUI.state, r = LF.ride(S, id), by = r.so ? Object.assign({}, r.so.by) : null; let n = 0;
      while (n++ < 30 && r.so) { LF.step(S); S.fx.length = 0; }
      return { by, status: LF.status(S, r), so: !!r.so }; }, rid);
    if (!after.by || after.by.mgr !== 'You') problems.push(`${tag}: signing did not record the Manager's acceptance (${JSON.stringify(after.by)})`);
    if (after.so || (after.status !== 'ok' && after.status !== 'degraded')) problems.push(`${tag}: the ride did not reopen after the Manager accepted the work (${after.status})`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) problems.push(`${tag}: the page scrolls sideways`);
    problems.push(...(await gameErrors(page, errors)).map(e => `${tag}: ${e}`));
    await page.close();
  }
  report('contractor', problems, 'called from the ride card, accepted by the Manager, ride reopened');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
