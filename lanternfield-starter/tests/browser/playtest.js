'use strict';
// The playtest record (phase 7): testers copy it from How to play at any point in the season and send it back.
// - mid-season, How to play holds a record that parses as JSON, with the build stamp, the finished days and the device;
// - Copy the record puts exactly that text on the clipboard;
// - a playtest build (npm run package:itch) shows a note on the title screen saying how to send it, with the same stamp;
//   the normal build does not;
// - inside a frame on another site, as itch.io shows HTML games (no clipboard permission given to the frame), the game runs,
//   saves across a reload, and Copy the record still copies.
//   node tests/browser/playtest.js
const fs = require('fs'), path = require('path'), http = require('http');
const { ROOT, OUT, launch, openGame, gameErrors, shot, report } = require('./lib.js');
const { build } = require(path.join(ROOT, 'build.js'));
const STAMP = /^\d+\.\d+\.\d+\+[0-9a-f]{8}$/;
(async () => {
  const browser = await launch(), problems = [];
  // the normal build, one day into the season
  const { page, errors } = await openGame(browser);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  if (await page.locator('.ptnote').count()) problems.push('the normal build shows the playtest note on the title screen');
  await page.evaluate(() => {
    LFUI.act('begin', {}); LFUI.act('go', {}); const S = LFUI.state; S.paused = true;
    while (S.clock < 1317) { // play day 1 in the engine up to just before closing time (22:00)
      for (const r of S.rides) if (r.job && r.job.type === 'fault' && !S.crew.some(c => c.target === r.id)) { const c = S.crew.find(c => c.role === 'tech' && c.on && !c.target && c.skills[r.job.trade]); if (c) LF.assign(S, c, r); }
      for (const it of S.inbox.slice()) { const o = LF.optsOf(S, it); if (o.length) LF.answer(S, it.id, o[0].v); }
      LF.step(S); S.fx.length = 0;
    }
    S.paused = false; // the game itself plays the last minutes, so its closing-time handling files the day's record
  });
  await page.waitForFunction(() => LFUI.state.phase === 'plan', null, { timeout: 15000 });
  await page.evaluate(() => { LFUI.ui.reportAt = 0; LFUI.act('go', {}); LFUI.act('help', {}); });
  await page.waitForTimeout(500);
  const rec = await page.evaluate(() => { const t = document.querySelector('#modal .pt'); return t ? t.value : null; });
  let r = null;
  if (!rec) problems.push('How to play has no playtest record mid-season');
  else try { r = JSON.parse(rec); } catch (e) { problems.push('the playtest record is not valid JSON: ' + rec.slice(0, 120)); }
  if (r) {
    if (!STAMP.test(r.build)) problems.push(`the record's build stamp looks wrong: ${r.build}`);
    if (r.finished !== 1 || !Array.isArray(r.days) || r.days.length !== 1) problems.push(`the record should hold one finished day: finished ${r.finished}, ${JSON.stringify(r.days)}`);
    if (!r.device || !/^\d+x\d+$/.test(r.device.screen) || !('motion' in r.device) || !('sound' in r.device)) problems.push('the record does not say what device it came from: ' + JSON.stringify(r.device));
    if (/@|mail/i.test(rec)) problems.push('the record looks like it holds an address: ' + rec.slice(0, 200));
  }
  await page.evaluate(() => document.querySelector('#modal .pt').scrollIntoView({ block: 'center' })); await page.waitForTimeout(200);
  await shot(page, 'playtest-help');
  await page.locator('#modal [data-a=ptcopy]').click(); await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(e => 'unreadable: ' + e));
  if (rec && clip !== rec) problems.push(`Copy the record put something else on the clipboard: ${clip.slice(0, 120)}`);
  problems.push(...await gameErrors(page, errors)); await page.close();
  // the playtest build, on a phone: the note on the title screen, readable and inside the dialog
  const file = path.join(OUT, 'playtest.html'); fs.writeFileSync(file, build({ playtest: true }));
  const pt = await openGame(browser, { width: 390, height: 844, dpr: 2, touch: true, file });
  const note = await pt.page.evaluate(() => { const n = document.querySelector('.ptnote'), d = n && n.closest('.dialog'); if (!n) return null; const a = n.getBoundingClientRect(), b = d.getBoundingClientRect();
    return { text: n.innerText, size: parseFloat(getComputedStyle(n).fontSize), inside: a.left >= b.left - 1 && a.right <= b.right + 1, wide: document.documentElement.scrollWidth > innerWidth }; });
  if (!note) problems.push('the playtest build has no note on the title screen');
  else {
    const stamp = (/Playtest build (\S+)\./.exec(note.text) || [])[1];
    if (!r || stamp !== r.build) problems.push(`the playtest build's stamp (${stamp}) differs from the normal build's (${r && r.build}), though the sources are the same`);
    if (!/How to play/.test(note.text) || !/Copy the record/.test(note.text)) problems.push('the title note does not say where to copy the record: ' + note.text);
    if (note.size < 13 || !note.inside || note.wide) problems.push(`the title note does not fit a phone: ${JSON.stringify(note)}`);
  }
  await shot(pt.page, 'playtest-title-phone');
  problems.push(...(await gameErrors(pt.page, pt.errors)).map(e => 'playtest build: ' + e));
  // the playtest build in a frame on another site: the game on 127.0.0.1, the page around it on localhost
  const html = fs.readFileSync(file), serve = body => new Promise(res => { const sv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(body(sv)); }).listen(0, '127.0.0.1', () => res(sv)); });
  const game = await serve(() => html), host = await serve(() => `<!doctype html><body style="margin:0;background:#222"><iframe id="g" src="http://127.0.0.1:${game.address().port}/index.html" width="1280" height="720" style="border:0" allowfullscreen></iframe></body>`);
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 740 } }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://localhost:${host.address().port}` });
  const top = await ctx.newPage(), ferr = []; top.on('pageerror', e => ferr.push(String(e)));
  await top.goto(`http://localhost:${host.address().port}/`); await top.waitForTimeout(800);
  const frame = () => top.frames().find(f => f !== top.mainFrame());
  await frame().evaluate(() => { localStorage.clear(); ['sup', 'desk', 'tech', 'mgr', 'dir', 'ceo'].forEach(k => localStorage.setItem('kll-coached-' + k, '1')); LFUI.act('begin', {}); LFUI.act('go', {}); LFUI.act('speed', { v: 2 }); });
  await top.waitForTimeout(2500);
  const c0 = await frame().evaluate(() => { LFUI.act('pause', {}); return LFUI.state.clock; });
  await top.reload(); await top.waitForTimeout(800);
  const c1 = await frame().evaluate(() => LFUI.state.clock);
  if (c1 !== c0 || c0 <= 495) problems.push(`in a frame on another site the game did not carry on after a reload (clock ${c0} then ${c1})`);
  await frame().evaluate(() => { LFUI.act('pause', {}); LFUI.act('help', {}); }); await top.waitForTimeout(400);
  const frec = await frame().evaluate(() => document.querySelector('#modal .pt').value);
  await frame().locator('#modal [data-a=ptcopy]').click(); await top.waitForTimeout(300);
  const fclip = await top.evaluate(() => navigator.clipboard.readText().catch(e => 'unreadable: ' + e)), toast = await frame().evaluate(() => LFUI.ui.msg);
  if (fclip !== frec) problems.push(`in a frame on another site, Copy the record did not copy (clipboard: ${fclip.slice(0, 80)}; message: ${toast})`);
  problems.push(...ferr.map(e => 'in a frame: ' + e));
  await ctx.close(); game.close(); host.close();
  report('playtest', problems, r ? `record from build ${r.build}, ${rec.length} characters` : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
