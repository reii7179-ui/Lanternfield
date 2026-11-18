'use strict';
// Coach walkthrough: starts a fresh season in each seat and does exactly what the coach asks, with real clicks,
// the way a new player would. Checks that every step can be completed, that the clock really waits on the
// "do this now" steps, and that the coach finishes and remembers it. Runs all seats side by side.
//   node tests/browser/coach.js                    all seats at 1366x768
//   node tests/browser/coach.js sup,tech --phone   chosen seats on a phone-sized screen
//   node tests/browser/coach.js sup --desk         the supervisor's whole first day, then the coached planning desk (about 4 min)
const { launch, openGame, gameErrors, shot, mapPoint, report, SEATS } = require('./lib.js');
const args = process.argv.slice(2), seats = (args.find(a => !a.startsWith('--')) || SEATS.join(',')).split(',');
const PHONE = args.includes('--phone'), DESK = args.includes('--desk');
const [W, H] = PHONE ? [390, 844] : [1366, 768], TOUCH = PHONE;

async function runSeat(browser, seat) {
  const problems = [], tag = `coach-${seat}-${W}x${H}`;
  const { page, errors } = await openGame(browser, { width: W, height: H, touch: TOUCH, coached: false });
  if (seat !== 'sup') await page.click(`.dialog [data-a=pickseat][data-v=${seat}]`);
  await page.click('.dialog [data-a=begin]'); await page.waitForTimeout(300);
  await page.click('[data-a=go]'); await page.waitForTimeout(400);
  await page.evaluate(() => LFUI.act('speed', { v: 2 }));
  const info = () => page.evaluate(() => { const c = LFUI.ui.coach; return { clock: LFUI.state.clock, i: c ? c.i : null, at: c ? c.at : null, txt: document.getElementById('coach').innerText.replace(/\s+/g, ' '), waiting: document.getElementById('b-pause').textContent === 'Waiting', unit: LFUI.ui.coachUnit, ride: LFUI.ui.coachRide, btn: !!document.querySelector('#coach [data-a=coachnext]') }; });
  const seen = new Set(); let held = 0; const t0 = Date.now(), limit = DESK ? 300e3 : 180e3; // the morning before the gates, and the active-seat lessons, make the coached day longer
  while (Date.now() - t0 < limit) {
    const s = await info();
    if (s.i === null && !DESK) break;
    if (s.i !== null && s.at !== null && !seen.has(s.i)) {
      seen.add(s.i); await shot(page, `${tag}-step${s.i}`);
      if (s.waiting) { const c1 = s.clock; await page.waitForTimeout(900); const c2 = (await info()).clock; if (c1 === c2) held++; else problems.push(`step ${s.i + 1}: says the clock is waiting, but it moved (${c1} -> ${c2})`); }
    }
    try { // do what the coach asks
      const sel = await page.evaluate(u => LFUI.ui.units.includes(u), s.unit);
      if (s.unit && s.at !== null && !sel && await page.locator(`#rail [data-id="${s.unit}"]`).count()) await page.click(`#rail [data-id="${s.unit}"]`, { timeout: 1500 });
      else if (s.ride && s.at !== null && seat === 'sup' && await page.evaluate(() => LFUI.ui.units.length > 0)) {
        const [x, y] = await page.evaluate(id => { const r = LF.ride(LFUI.state, id); return [r.x, r.y]; }, s.ride).then(p => mapPoint(page, p[0], p[1]));
        if (TOUCH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y, { button: 'right' });
      } else if (seat === 'mgr' && /rush job/i.test(s.txt) && s.ride) { await page.click(`#board [data-id="${s.ride}"]`, { timeout: 1500 }); await page.keyboard.press('r'); }
      else if (seat === 'tech' && s.at !== null) {
        let did = false;
        for (const q of ['#obj [data-a=ans][data-v=go]', '[data-a=lock]', '[data-a=dx]', '[data-a=fit][data-v=test]', '[data-a=padoff]']) { const l = page.locator(q); if (await l.count()) { await l.first().click({ timeout: 1500 }); did = true; break; } }
        if (!did && s.btn) await page.click('#coach [data-a=coachnext]', { timeout: 1500 });
      } else if (s.btn) await page.click('#coach [data-a=coachnext]', { timeout: 1500 });
      else if (/request|decision for you/i.test(s.txt)) { const l = page.locator('#obj [data-a=ans]:not([disabled])'); if (await l.count()) await l.first().click({ timeout: 1500 }); }
      else if (/press B|tap Break/.test(s.txt) && s.unit) await page.keyboard.press('b');
      else if (/toolbox talk/i.test(s.txt)) { const l = page.locator('#selp [data-a=walk]:not([disabled])'); if (await l.count()) await l.first().click({ timeout: 1500 }); }
      else if (/Call in now/.test(s.txt) && s.unit) { const l = page.locator('#selp [data-a=callin]'); if (await l.count()) await l.first().click({ timeout: 1500 }); }
    } catch (e) { /* the screen changed under the click; try again next round */ }
    // keep the park ticking over for the parts the coach does not cover (supervisor only, after the early lessons)
    await page.evaluate(() => { const S = LFUI.state; if (S.seat !== 'sup' || (LFUI.ui.coach && LFUI.ui.coach.i < 5)) return; for (const r of S.rides) if (r.job && r.job.type === 'fault' && !S.crew.some(c => c.target === r.id)) { const c = S.crew.find(c => c.role === 'tech' && c.on && !c.target && !c.brk && c.skills[r.job.trade]); if (c) LF.assign(S, c, r); } });
    if (DESK && await page.evaluate(() => LFUI.state.phase) === 'plan') {
      await page.waitForTimeout(4500);
      for (let k = 0; k < 6; k++) {
        const d = await page.evaluate(() => ({ on: !!LFUI.ui.dc, i: LFUI.ui.dc && LFUI.ui.dc.i }));
        if (!d.on) break; await shot(page, `${tag}-desk${k}`);
        await page.click('.dcoach [data-a=dcnext]', { timeout: 2000 }); await page.waitForTimeout(300);
      }
      if (await page.evaluate(() => localStorage.getItem('kll-coached-desk')) !== '1') problems.push('the planning-desk coach did not finish');
      break;
    }
    await page.waitForTimeout(250);
  }
  const left = await page.evaluate(() => LFUI.ui.coach && LFUI.ui.coach.i);
  if (left !== null && left !== undefined) problems.push(`coach stuck on step ${left + 1}: "${(await info()).txt.slice(0, 120)}"`);
  if (await page.evaluate(k => localStorage.getItem('kll-coached-' + k), seat) !== '1') problems.push('the coach was not marked as done');
  for (const e of await gameErrors(page, errors)) problems.push(e);
  await page.close();
  return { seat, steps: seen.size, held, problems };
}

(async () => {
  const browser = await launch();
  const results = await Promise.all(seats.map(s => runSeat(browser, s)));
  const problems = [];
  for (const r of results) { console.log(`${r.seat}: ${r.steps} steps shown, clock held on ${r.held}${r.problems.length ? ', ' + r.problems.length + ' problems' : ''}`); for (const p of r.problems) problems.push(`${r.seat}: ${p}`); }
  report('coach', problems, `${seats.join(', ')} at ${W}x${H}${DESK ? ' plus the planning desk' : ''}`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
