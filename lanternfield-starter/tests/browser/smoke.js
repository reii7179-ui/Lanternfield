'use strict';
// UI stress test: plays whole seasons fast inside the page, switching seats, pressing every kind of button at random,
// and redrawing every panel (each person, each ride, every desk tab) after every park minute.
// Fails on any thrown error, the game's red error box, or NaN / undefined / [object ...] showing up as text.
//   node tests/browser/smoke.js [seasons, default 3]
const { launch, openGame, gameErrors, shot, report } = require('./lib.js');
const N = +(process.argv[2] || 3);

const SEASON = seed => {
  const ui = LFUI.ui, errs = {}, seen = (k, v) => { errs[k] = errs[k] || v; };
  LFUI.act('restart', {});
  const S = LFUI.state; LF.setDiff(S, ['relaxed', 'standard', 'sharp'][seed % 3]);
  let rs = seed; const r = () => (rs = (rs * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(r() * a.length)];
  const views = () => [() => { ui.tech = null; ui.sel = null; }].concat(S.crew.map(c => () => { ui.tech = c.id; ui.sel = null; }), S.rides.map(x => () => { ui.sel = x.id; ui.tech = null; }));
  const act = (name, d, where) => { try { LFUI.act(name, d || {}); } catch (e) { seen(e.message, where + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')); } };
  const scan = where => { const m = document.body.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b|\[object/g); if (m) seen('bad text on screen: ' + [...new Set(m)].join(', '), where); };
  let n = 0;
  while (!S.final && n < 20000) {
    if (S.phase === 'plan') {
      for (const tab of ['report', 'company', 'team', 'stores', 'projects']) { ui.tab = tab; ui.reportAt = 0; act('tab', { v: tab }, 'desk ' + tab); scan('desk ' + tab + ' day ' + S.day); }
      for (let k = 0; k < 4; k++) LF.hire(S, Math.floor(r() * S.cands.length));
      act('dcnext', {}, 'desk coach'); act(pick(['dcnext', 'dcskip']), {}, 'desk coach');
      S.pol.auto = true; S.pol.pm = 55; S.pol.nopart = pick(['wait', 'patch', 'express']);
      for (const k in S.min) S.min[k] = 1;
      LF.startDay(S); continue;
    }
    if (r() < .1) LF.assign(S, pick(S.crew), pick(S.rides));
    if (r() < .004) act('takeseat', { v: pick(LF.LV) }, 'takeseat');
    if (S.inbox.length && r() < .08) { const it = pick(S.inbox), o = LF.optsOf(S, it); act('ans', { id: it.id, v: o.length && r() < .8 ? pick(o).v : 'brief' }, 'answer ' + it.k); }
    if (r() < .01) act('ask', { k: pick(['help', 'patch', 'express', 'callout', 'service', 'crowd']), id: pick(S.rides).id, sku: pick(Object.keys(LF.SKU)) }, 'ask');
    if (r() < .01) { const c = pick(S.crew); ui.units = [c.id]; act(pick(['rest', 'callin', 'sprint', 'push', 'stop']), { t: c.id }, 'crew command'); }
    if (r() < .006) act(pick(['rush', 'vouch', 'svc', 'fastlane']), { id: pick(S.rides).id }, 'ride command');
    if (r() < .006) act(pick(['happy', 'brief', 'agency', 'coachnext', 'coachskip']), {}, 'seat command');
    if (r() < .006) act('walk', { v: pick(['safety', 'pace', 'care', undefined]) }, 'walk / talk');
    if (r() < .02) LF.callout(S, pick(S.rides));
    if (r() < .02) LF.order(S, pick(Object.keys(LF.SKU)), 'exp');
    if (r() < .01) LF.holdOver(S, pick(S.crew));
    LF.step(S); S.fx.length = 0; n++;
    pick(views())();
    act('objt', {}, `day ${S.day} ${LF.fmtClock(S.clock)} tech=${ui.tech} sel=${ui.sel}`);
    if (n % 90 === 0) scan(`day ${S.day} ${LF.fmtClock(S.clock)} seat ${S.seat}`);
  }
  ui.reportAt = 0; act('objt', {}, 'final screen'); scan('final screen');
  const box = document.getElementById('oops'); if (box) seen('the game\'s red error box appeared', box.textContent.slice(0, 600));
  return { errs, day: S.day, grade: S.final && S.final.grade };
};

(async () => {
  const browser = await launch();
  const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
  await page.evaluate(() => LFUI.act('begin', {}));
  const problems = [];
  for (let i = 1; i <= N; i++) {
    const res = await page.evaluate(SEASON, i * 7919);
    for (const [k, v] of Object.entries(res.errs)) problems.push(`season ${i}: ${k} (at ${v})`);
    console.log(`season ${i}: ended day ${res.day}, grade ${res.grade}, ${Object.keys(res.errs).length} problems`);
  }
  await shot(page, 'smoke-final');
  report('smoke', problems.concat(await gameErrors(page, errors)), `${N} seasons, every panel drawn every park minute`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
