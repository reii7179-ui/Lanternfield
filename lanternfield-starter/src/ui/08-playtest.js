/* ---------- playtest record: how fast you actually react, in seconds of running clock ---------- */
const TPS0 = 2.5; // park minutes per real second at 1×
const PT = { seen: {}, f: [], q: [] };
function ptTrack() { // a fault you sent someone to: minutes from breakdown to your order, at the speed you were playing
  if (S.phase !== 'day') return;
  for (const r of S.rides) { const j = r.job; if (!j || j.type !== 'fault' || !j.first) continue; const k = S.day + ':' + r.id + ':' + j.t0; if (PT.seen[k]) continue; PT.seen[k] = 1;
    if (j.me && j.first >= j.t0) PT.f.push({ s: (j.first - j.t0) / (TPS0 * S.speed), fast: !!j.fast }); }
}
const med = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
function ptClose() { // file today's numbers with the save
  const fs = PT.f.map(x => x.s), qs = PT.q.slice();
  (S.pt = S.pt || []).push({ day: S.reports.length, diff: S.diff || 'standard', seat: S.seat, faults: fs.length, react: fs.length ? +med(fs).toFixed(1) : null, fast: fs.length ? Math.round(PT.f.filter(x => x.fast).length / fs.length * 100) : null, reqs: qs.length, answer: qs.length ? +med(qs).toFixed(1) : null });
  PT.f = []; PT.q = []; PT.seen = {};
}
/* the record a tester sends back: every finished day, today so far, the build it came from and the kind of device */
function ptRecord() {
  const fs = PT.f.map(x => x.s), qs = PT.q.slice(), rec = { build: BUILD, finished: S.reports.length, difficulty: S.diff || 'standard', seat: S.seat, grade: S.final ? S.final.grade : null, total: S.final ? S.final.total : null, days: S.pt || [] };
  if (S.phase === 'day' && (fs.length || qs.length)) rec.today = { day: S.day, faults: fs.length, react: fs.length ? +med(fs).toFixed(1) : null, fast: fs.length ? Math.round(PT.f.filter(x => x.fast).length / fs.length * 100) : null, reqs: qs.length, answer: qs.length ? +med(qs).toFixed(1) : null };
  rec.device = { screen: innerWidth + 'x' + innerHeight, touch: !!ui.touch, motion: reduce ? 'reduced' : 'full', sound: snd.on };
  return rec;
}
// mid: shown in How to play, any time in the season (on the end screen only once there is something to send)
function ptHTML(mid) {
  const rows = S.pt || [], rec = ptRecord(); if (!rows.length && !mid) return '';
  const all = rows.filter(r => r.react != null), send = PLAYTEST ? 'Copy it and send it to whoever shared the game with you: it helps them tune it.' : 'If you are testing the game for someone, copy this and send it to them.';
  const said = all.length ? `Median from a breakdown to your order: <b>${med(all.map(r => r.react))} s</b>; fast responses ${Math.round(all.reduce((a, r) => a + r.fast, 0) / all.length)}% of the time.` : rows.length ? 'You did not send anyone yourself so far.' : 'No finished days yet: each day is added at closing time, and today so far is included.';
  return `<div class="sect"><h2 class="cap">Playtest record</h2><p class="note">How fast you reacted, in seconds of running clock. ${said} ${send}</p>
<textarea class="pt" readonly aria-label="Playtest record">${esc(JSON.stringify(rec))}</textarea><div class="row"><button type="button" class="btn sm" data-a="ptcopy" data-fk="ptc">Copy the record</button></div></div>`;
}
function renderUI() {
  ui.units = ui.units.filter(id => L.staff(S, id));
  hudUpdate();
  if (ui.pdown && performance.now() - ui.pdownAt < 1500) return;
  ui.pdown = false;
  { const t = $('task'); try { const h = taskHTML(), bad = h.startsWith('<div class="task bad"'); setHTML(t, bad ? h.replace(/^<div class="task bad"[^>]*>/, '').replace(/<\/div>$/, '') : h); t.classList.toggle('bad', bad); } catch (e) { oops('panel task', e); } }
  try { ptTrack(); } catch (e) { /* the record is a nice-to-have */ }
  try { coachTick(); setHTML($('coach'), coachHTML()); placeCoach(); } catch (e) { oops('coach', e); }
  if (!ui.dc && S.phase === 'plan' && S.reports.length >= 1 && !S.final && !ui.title && now() >= ui.reportAt && !coached('desk')) { ui.dc = { i: 0 }; ui.tab = 'report'; }
  for (const [id, fn] of [['obj', objHTML], ['rail', railHTML], ['boardcap', capHTML], ['board', boardHTML], ['selp', selHTML], ['log', logHTML], ['modal', modalHTML]]) {
    try { setHTML($(id), fn()); } catch (e) { oops('panel ' + id, e); }
  }
  fitLeft(); coachMarks();
  try { celebrate(); } catch (e) { /* the moment is a nice-to-have */ }
}
function fitLeft() { // objectives grow down from the top, radio lines up from the bottom: when they would meet, the radio lines give way (the Log button stays)
  const app = $('app'), o = $('obj'), g = $('log'); if (!o || !g) return;
  const was = app.classList.contains('logshy'); app.classList.remove('logshy');
  if (ui.log || !app.classList.contains('loglines') || !o.offsetHeight) return;
  const lines = g.querySelector('.radio'); if (!lines || !lines.offsetHeight) return;
  const ob = o.getBoundingClientRect().bottom, top = g.getBoundingClientRect().top; // the Log button sits on top of the lines
  if (ob > top - 6 || (was && ob > top - 24)) app.classList.add('logshy'); // a little hysteresis, so the lines do not flicker
}


