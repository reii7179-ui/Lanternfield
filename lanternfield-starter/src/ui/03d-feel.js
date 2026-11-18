/* ---------- feedback: a breakdown is felt, a fast response and a quick fix reward you ----------
   Called for every event the engine reports (drainFx). Visual and sound only, never saved.
   Reduced motion: no shake, no flash, no bursts or sparkles; the sounds still play, and the ride's ring, badge and
   status word already say what happened. */
const FEEL = { shake: null, bursts: [], last: 0, flash: null };
function feel(f, t) {
  const r = f.id && L.ride(S, f.id);
  if (!r || ui.title) return;
  if (f.k === 'major') { // a ride closes: a red shockwave, and a short shake and edge flash (at most one every 1.2 s, so a squall does not rattle the screen)
    burst(r, '#ff5d4a', 74, 700, 6);
    if (!reduce && t - FEEL.last > 1200) { FEEL.last = t; FEEL.shake = { t0: t, amp: 6 }; edgeFlash(); }
  } else if (f.k === 'minor') burst(r, '#ffb347', 52, 520, 4);
  else if (f.k === 'fast') { burst(r, '#d8f0ff', 86, 760, 5); sparkle(r, ['#ffffff', '#bfe3ff', '#79c2ff'], 22, 80, 'star'); }
  else if (f.k === 'fix') { burst(r, '#8fe8c4', 62, 620, 4); sparkle(r, ['#e8fff4', '#8fe8c4'], 10, 52, 'star'); }
  else if (f.k === 'cash') { const m = /×(\d+)/.exec(f.txt || ''); if (m) sparkle(r, ['#ffd27a', '#ffb347', '#fff1c4'], 8 + 4 * +m[1], 52 + 6 * +m[1], 'coin'); } // a quick fix: more coins the longer the streak
}
function burst(r, col, grow, dur, w) { if (!reduce) FEEL.bursts.push({ x: r.x, y: r.y - 6, col, grow, dur, w, t0: performance.now() }); }
function sparkle(r, cols, n, speed, kind) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = speed * (.45 + Math.random() * .7); emit(kind, r.x + Math.cos(a) * 14, r.y - 12 + Math.sin(a) * 10, Math.cos(a) * v, Math.sin(a) * v - 30, .7 + Math.random() * .5, kind === 'coin' ? 2.6 : 2, cols[i % cols.length]); }
}
function edgeFlash() { // a red glow round the edge of the map, in and out in under half a second
  let el = FEEL.flash;
  if (!el) { el = FEEL.flash = document.createElement('div'); el.className = 'edgeflash'; el.setAttribute('aria-hidden', 'true'); $('app').insertBefore(el, $('top')); }
  el.animate([{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 0 }], { duration: 440, easing: 'ease-out' });
}
// where the map is pushed this frame by a shake: a few quick, shrinking jolts over 0.3 s
function shakeNow(now) {
  const s = FEEL.shake; if (!s || reduce) return null;
  const k = (now - s.t0) / 300; if (k >= 1) { FEEL.shake = null; return null; }
  const a = s.amp * (1 - k) * (1 - k); return [a * Math.sin(k * 55), a * Math.cos(k * 47) * .6];
}
function drawBursts(now) {
  for (let i = FEEL.bursts.length - 1; i >= 0; i--) {
    const b = FEEL.bursts[i], k = (now - b.t0) / b.dur; if (k >= 1) { FEEL.bursts.splice(i, 1); continue; }
    const e = 1 - Math.pow(1 - k, 3); ctx.strokeStyle = rgba(b.col, .9 * (1 - k)); ctx.lineWidth = b.w * (1 - k) + .5; ctx.beginPath(); ctx.arc(b.x, b.y, 37 + b.grow * e, 0, 7); ctx.stroke();
  }
}

/* the night's report and the season's end each get their moment once: bells with the lantern count, a fanfare with the
   grade, and for a good season a sky full of lanterns over the park. Called after every render. */
function celebrate() {
  const rep = S.reports[S.reports.length - 1], m = $('modal');
  if (rep && m.querySelector('.lrow') && !(FEEL.night && FEEL.night[0] === S && FEEL.night[1] === rep.day)) { FEEL.night = [S, rep.day]; SFX.lanterns(rep.n, rep.n === L.N_RIDES); }
  if (S.final && m.querySelector('.final') && FEEL.season !== S) {
    FEEL.season = S; const g = S.final.fired || S.final.broke ? 'D' : S.final.grade; SFX.grade(g);
    if (!reduce && (g === 'A' || g === 'B')) for (const r of S.rides) if (r.sub) releaseLanterns(r, g === 'A' ? 5 : 3);
  }
}
