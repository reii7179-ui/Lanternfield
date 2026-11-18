'use strict';
// The active seats in the browser (grows step by step):
// - a fixed ride waiting for your countersign shows "Sign to reopen" on its park board card and "SIGN NOW" on the map;
//   the button opens its card with the job sheet, and signing it sends it on, until it reopens;
// - the layout holds on a phone while a ride waits;
// - every seat gets something to do in its first game hour, and tapping it resolves it; ignoring one escalates it
//   (logged, counted as missed) and lowers your own score; crew traits and the boss's style show on the cards.
//   node tests/browser/seats.js
const { launch, openGame, gameErrors, shot, report, SEATS } = require('./lib.js');
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
  // every seat: an item in the first game hour; tapping it resolves it; ignoring one escalates it and costs your own score;
  // crew traits and the boss's style show on the cards; on a laptop and on a phone
  for (const [w, h, touch] of [[1366, 768, false], [390, 844, true]]) for (const seat of SEATS) {
    const tag = `${seat}-${w}x${h}`, { page, errors } = await openGame(browser, { width: w, height: h, touch });
    await page.evaluate(x => { LFUI.act('pickseat', { v: x }); LFUI.act('begin', {}); LFUI.act('go', {}); LFUI.state.speed = 0; }, seat);
    // the first game hour: wait for something to do
    const first = await page.evaluate(() => { const S = LFUI.state; const end = LF.PRE + 60;
      while (S.clock < end && !S.inbox.length && !(S.seat === 'tech' && LF.myChecks(S).length)) { LF.step(S); S.fx.length = 0; }
      return { clock: S.clock, items: S.inbox.map(i => i.k), checks: S.seat === 'tech' ? LF.myChecks(S).map(r => r.id) : [] }; });
    if (!first.items.length && !first.checks.length) { problems.push(`${tag}: nothing to do in the first game hour`); await page.close(); continue; }
    await page.waitForTimeout(400);
    if (seat === 'tech') { // walk to the first ride on the sheet and tap Daily check
      await page.evaluate(id => { const S = LFUI.state, m = LF.me(S), r = LF.ride(S, id); m.x = r.x + 10; m.y = r.y + 10; m.post = null; }, first.checks[0]); await page.waitForTimeout(400);
      const b = page.locator('[data-a=dcheck]');
      if (!(await b.count())) problems.push(`${tag}: no Daily check button at the ride`);
      else { await b.first().click(); await page.evaluate(() => { const S = LFUI.state; for (let i = 0; i < 3; i++) { LF.step(S); S.fx.length = 0; } }); }
      const done = await page.evaluate(id => LF.ride(LFUI.state, id).chk === LFUI.state.day, first.checks[0]);
      if (!done) problems.push(`${tag}: tapping Daily check did not check the ride`);
    } else {
      const b = page.locator('#obj [data-a=ans]').first();
      if (!(await b.count())) problems.push(`${tag}: the ${first.items[0]} item has no answer button`);
      else {
        const box = await b.boundingBox(); if (!box || box.height < 24 || box.x < 0 || box.x + box.width > w + 1) problems.push(`${tag}: the answer button is off screen or too small (${JSON.stringify(box)})`);
        const before = await page.evaluate(() => ({ n: LFUI.state.inbox.length, on: LFUI.state.sc[LFUI.state.seat].onTime }));
        await b.click(); await page.waitForTimeout(200);
        const after = await page.evaluate(() => ({ n: LFUI.state.inbox.length, on: LFUI.state.sc[LFUI.state.seat].onTime }));
        if (!(after.n < before.n && after.on > before.on)) problems.push(`${tag}: tapping the answer did not resolve the item (${JSON.stringify([before, after])})`);
      }
    }
    await shot(page, `seats-first-${tag}`);
    // the boss's style on the seat card, and a technician's traits on their card
    const cards = await page.evaluate(() => { const S = LFUI.state, b = LF.above(S, S.seat), st = b !== 'board' && S.styles[b];
      LFUI.ui.sel = null; LFUI.ui.units = []; return { st: st ? LF.STYLE[st][0] : '', note: (document.querySelector('#selp .note.boss') || {}).innerText || '' }; });
    if (cards.st && !cards.note.toLowerCase().includes(cards.st.toLowerCase())) problems.push(`${tag}: the seat card does not show the boss's style (${cards.st}): "${cards.note}"`);
    const tid = await page.evaluate(() => (LFUI.state.crew.find(c => c.role === 'tech' && c.traits && c.traits.length && c.id !== LFUI.state.me) || {}).id);
    if (tid != null && await page.locator(`#rail [data-id="${tid}"]`).count()) {
      await page.click(`#rail [data-id="${tid}"]`); await page.waitForTimeout(300);
      if (!(await page.locator('#selp .chip.trait').count())) problems.push(`${tag}: the crew card shows no traits`);
    }
    // ignoring a request: it escalates when its time runs out, the log says so, and it costs your own score
    const ign = await page.evaluate(() => { const S = LFUI.state, sc = S.sc[S.seat], p0 = LF.personal(S).p, e0 = sc.esc || 0, m0 = sc.missed;
      for (let n = 0; n < 1600 && (sc.esc || 0) === e0 && !S.final; n++) { if (S.phase === 'plan') LF.startDay(S); else { LF.step(S); S.fx.length = 0; } } // until the next morning at most
      return { esc: (sc.esc || 0) - e0, missed: sc.missed - m0, p0, p1: LF.personal(S).p, logged: S.feed.some(f => /escalated/i.test(f.txt)) }; });
    if (!ign.esc) problems.push(`${tag}: nothing was escalated in a day of ignoring everything`);
    else { if (!ign.missed) problems.push(`${tag}: an escalation did not count as missed`); if (!(ign.p1 < ign.p0)) problems.push(`${tag}: ignoring did not lower your own score (${ign.p0.toFixed(3)} -> ${ign.p1.toFixed(3)})`); if (!ign.logged) problems.push(`${tag}: the log does not say it was escalated`); }
    await page.waitForTimeout(300);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (wide) problems.push(`${tag}: the page scrolls sideways`);
    await shot(page, `seats-ignored-${tag}`);
    problems.push(...(await gameErrors(page, errors)).map(e => `${tag}: ${e}`));
    await page.close();
  }
  report('seats', problems, 'sign to reopen on the board and the card; every seat has a duty in its first hour, answered or escalated; traits and boss styles on the cards');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
