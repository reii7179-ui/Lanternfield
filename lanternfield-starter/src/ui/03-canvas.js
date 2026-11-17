/* ---------- canvas ---------- */
const cv = $('map'), ctx = cv.getContext('2d'), mv = $('mini'), mx = mv.getContext('2d');
let cw = 0, ch = 0, sc = 1, ox = 0, oy = 0;
/* camera: world point at the centre of the visible map, and zoom. ins = screen edges covered by the HUD. */
const cam = { x: W / 2, y: H / 2, z: 0, fit: 1, user: false };
const ins = { l: 0, t: 0, r: 0, b: 0 };
function applyCam() {
  const vw = (cw - ins.l - ins.r) / cam.z, vh = (ch - ins.t - ins.b) / cam.z, pad = 40, padL = pad + (cw < 900 ? 170 / cam.z : 0);
  cam.x = vw >= W ? W / 2 : clamp(cam.x, vw / 2 - padL, W - vw / 2 + pad);
  cam.y = vh >= H ? H / 2 : clamp(cam.y, vh / 2 - pad, H - vh / 2 + pad);
  sc = cam.z; ox = ins.l + (cw - ins.l - ins.r) / 2 - cam.x * sc; oy = ins.t + (ch - ins.t - ins.b) / 2 - cam.y * sc;
}
function resize() {
  const r = $('app').getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = Math.max(50, r.width); ch = Math.max(50, r.height);
  const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ins.t = $('top').offsetHeight; ins.b = $('dock').offsetHeight; const th = ins.t; ins.r = cw >= 700 ? 64 : 0;
  $('app').style.setProperty('--th', th + 'px'); $('app').style.setProperty('--dh', ins.b + 'px');
  ins.l = 0;
  cam.fit = Math.max(.2, Math.min((cw - ins.r) / W, (ch - ins.t - ins.b) / H));
  const roomy = cam.fit >= .66, hs = roomy ? cw - ins.r - W * cam.fit : 0, vs = roomy ? ch - ins.t - ins.b - H * cam.fit : 0, extraT = Math.min(vs, 150);
  ins.l = Math.min(hs, 252); ins.t += extraT;
  const freeL = ins.l + (hs - ins.l) / 2 + 30 * cam.fit, freeB = (vs - extraT) / 2;
  $('app').classList.toggle('loglines', freeL >= 200 || freeB >= 84);
  $('app').style.setProperty('--lw', (freeL >= 200 ? Math.min(380, freeL - 14) : 380) + 'px');
  if (ui.obj == null) ui.obj = freeL >= 236 || extraT >= 130;
  if (!cam.user || cam.z < cam.fit) { cam.z = Math.max(cam.fit, .66); if (!cam.user) { cam.x = W / 2; cam.y = H / 2; } }
  applyCam();
  /* a resize wipes the canvas after this frame's draw, so paint again before the browser shows it */
  if (S && last) { try { draw(performance.now(), 1); } catch (e) { /* the next frame repaints */ } }
}
function zoomAt(px, py, nz) {
  nz = clamp(nz, cam.fit, Math.max(2.2, cam.fit * 2));
  const wx = (px - ox) / sc, wy = (py - oy) / sc;
  cam.z = nz; cam.user = nz > cam.fit * 1.02;
  cam.x = wx - (px - (ins.l + (cw - ins.l - ins.r) / 2)) / nz; cam.y = wy - (py - (ins.t + (ch - ins.t - ins.b) / 2)) / nz;
  applyCam();
}
function fitView() { cam.user = false; cam.z = Math.max(cam.fit, .66); cam.x = W / 2; cam.y = H / 2; applyCam(); }
/* bring a world point into view; force centres on it */
function focus(x, y, force) {
  const m = 50 / sc, x0 = (ins.l - ox) / sc + m, x1 = (cw - ins.r - ox) / sc - m, y0 = (ins.t - oy) / sc + m, y1 = (ch - ins.b - oy) / sc - m;
  if (force || x < x0 || x > x1 || y < y0 || y > y1) { cam.x = x; cam.y = y; cam.user = true; applyCam(); }
}
function drawMini(t) {
  const w = mv.clientWidth, h = mv.clientHeight; if (!w || !h || !S) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (mv.width !== Math.round(w * dpr) || mv.height !== Math.round(h * dpr)) { mv.width = Math.round(w * dpr); mv.height = Math.round(h * dpr); }
  const n = nightOf(ui.title ? 1290 : S.clock);
  mx.setTransform(dpr * w / W, 0, 0, dpr * h / H, 0, 0);
  mx.fillStyle = mix('#1f3d49', '#0b1029', n); mx.fillRect(0, 0, W, H);
  mx.fillStyle = mix('#2a5057', '#1a2250', n);
  for (const [x, y, zw, zh] of [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]]) { mx.beginPath(); mx.roundRect(x, y, zw, zh, 46); mx.fill(); }
  mx.fillStyle = mix('#3d8aa0', '#1a2b5c', n); mx.beginPath(); mx.ellipse(150, 425, 96, 58, 0, 0, 7); mx.fill();
  mx.strokeStyle = mix('#d8bf8c', '#4b4676', n); mx.lineWidth = 10; mx.lineCap = 'round';
  const N = L.NODES;
  for (const k of ['W', 'N', 'E']) { mx.beginPath(); mx.moveTo(N.P.x, N.P.y); mx.lineTo(N[k].x, N[k].y); mx.stroke(); }
  mx.beginPath(); mx.moveTo(L.GATE.x, L.GATE.y); mx.lineTo(N.P.x, N.P.y); mx.stroke();
  mx.fillStyle = '#566'; for (const p of [L.STORE, L.YARD, L.SHOP, L.OFFICE]) mx.fillRect(p.x - 24, p.y - 16, 48, 32);
  for (const r of S.rides) {
    const st = ui.title ? 'ok' : L.status(S, r), blink = (st === 'down' || (r.job && r.job.rescue)) && !reduce && Math.sin(t / 160) > 0;
    mx.fillStyle = blink ? '#fff' : SCOL[st]; mx.beginPath();
    if (r.sub) mx.arc(r.x, r.y, 27, 0, 7); else mx.rect(r.x - 24, r.y - 24, 48, 48);
    mx.fill();
    if (ui.sel === r.id) { mx.strokeStyle = '#fff'; mx.lineWidth = 9; mx.beginPath(); mx.arc(r.x, r.y, 42, 0, 7); mx.stroke(); }
  }
  if (!ui.title) for (const c of S.crew) if (c.on) { mx.fillStyle = TC[rk(c)]; mx.strokeStyle = ui.units.includes(c.id) ? '#79c2ff' : '#10142f'; mx.lineWidth = ui.units.includes(c.id) ? 9 : 5; mx.beginPath(); mx.arc(c.x, c.y, 13, 0, 7); mx.fill(); mx.stroke(); }
  const x0 = (ins.l - ox) / sc, y0 = (ins.t - oy) / sc, vw = (cw - ins.l - ins.r) / sc, vh = (ch - ins.t - ins.b) / sc;
  if (vw < W * .98 || vh < H * .98) { mx.strokeStyle = '#f7edd8'; mx.lineWidth = 8; mx.strokeRect(Math.max(4, x0), Math.max(4, y0), Math.min(vw, W - 8 - Math.max(0, x0)), Math.min(vh, H - 8 - Math.max(0, y0))); }
}

const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
function rgba(c, a) { const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
function nightOf(c) { if (c < 600) return .25 - .25 * (c - 540) / 60; if (c <= 1080) return 0; if (c <= 1230) return (c - 1080) / 150; return 1; }
const GLYPH = {
  coaster: 'M-7 4C-4-6-1-6 1 0S5 6 7-4', tower: 'M0-7V6M-3.5 6h7M-2.5-3h5',
  water: 'M-7-1q1.75-2.5 3.5 0t3.5 0 3.5 0 3.5 0M-7 3.5q1.75-2.5 3.5 0t3.5 0 3.5 0 3.5 0',
  carousel: 'M-6-2.5 0-7l6 4.5M-5-2.5V6M5-2.5V6M0-2.5V6',
  wheel: 'M6 0A6 6 0 1 1-6 0A6 6 0 1 1 6 0M0-6V6M-6 0H6M-4.2-4.2l8.4 8.4M4.2-4.2l-8.4 8.4',
  gondola: 'M-7-6 7-2M-1-4v3.5M-4.5-0.5h7v5.5h-7z', theater: 'M-6-5h12v5q0 6-6 6t-6-6zM-3-2h1M2-2h1M-2.5 2q2.5 2 5 0',
  food: 'M-3.5-6V6M-5.5-6v3.5q2 2 4 0V-6M3-6q3.5 3 0 6.5V6', arcade: 'M-6 3h12v3.5H-6zM0 3v-5M2.2-4A2.2 2.2 0 1 1-2.2-4A2.2 2.2 0 1 1 2.2-4',
  power: 'M1.5-7.5-4.5 1h4L-1.5 7.5l6-8.5h-4z',
};
const P2 = {}; for (const k in GLYPH) P2[k] = new Path2D(GLYPH[k]);
const SCOL = { ok: '#ffb347', degraded: '#ff8f3d', down: '#ff5d4a', service: '#79c2ff', nopower: '#7d7f9c', unstaffed: '#7d7f9c' };

const guests = [], pops = [], lanterns = [];
const prev = {};
function routeTo(r) { const n = L.NODES[r.via], j = () => (Math.random() - .5) * 14, pts = [[L.NODES.P.x + j(), L.NODES.P.y + j()]]; if (r.via !== 'P') pts.push([n.x + j(), n.y + j()]); pts.push([r.x + j() * 1.6, r.y + 26 + j()]); return pts; }
function pickRide() { const open = S.rides.filter(r => r.sub && L.AV[L.status(S, r)] > 0); if (!open.length) return null; let t = Math.random() * open.reduce((a, r) => a + r.cap, 0); for (const r of open) if ((t -= r.cap) <= 0) return r; return open[0]; }
function stepGuests(dm) {
  const want = reduce ? 0 : Math.round(150 * Math.min(1.3, S.att));
  if (guests.length < want && Math.random() < .5) { const r = pickRide(); if (r) guests.push({ x: L.GATE.x + (Math.random() - .5) * 20, y: L.GATE.y, path: routeTo(r), i: 0, ride: r.id, wait: 0, sp: 34 + Math.random() * 16, sad: false }); }
  for (let k = guests.length - 1; k >= 0; k--) {
    const g = guests[k];
    if (g.wait > 0) { g.wait -= dm; if (g.wait <= 0) leave(g); continue; }
    const p = g.path[g.i]; if (!p) { guests.splice(k, 1); continue; }
    const dx = p[0] - g.x, dy = p[1] - g.y, d = Math.hypot(dx, dy), stepLen = g.sp * dm;
    if (d <= stepLen) {
      g.x = p[0]; g.y = p[1]; g.i++;
      if (g.i >= g.path.length) {
        if (g.out) { guests.splice(k, 1); continue; }
        const r = L.ride(S, g.ride);
        if (r && L.AV[L.status(S, r)] > 0) g.wait = 6 + Math.random() * 14; else { g.sad = true; leave(g); }
      }
    } else { g.x += dx / d * stepLen; g.y += dy / d * stepLen; }
  }
}
function leave(g) {
  const from = L.ride(S, g.ride), back = from && from.via !== 'P' ? [[L.NODES[from.via].x, L.NODES[from.via].y]] : [];
  const next = !g.sad && Math.random() < .55 && S.clock < L.CLOSE - 40 ? pickRide() : null;
  if (next && next.id !== g.ride) { g.path = back.concat(routeTo(next)); g.ride = next.id; g.out = false; }
  else { g.path = back.concat([[L.NODES.P.x, L.NODES.P.y], [L.GATE.x + (Math.random() - .5) * 20, L.GATE.y + 10]]); g.out = true; }
  g.i = 0; g.wait = 0;
}

function line(pts, w, col, dash) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); }
function label(txt, x, y, size, col, weight) { size *= clamp(.82 / sc, 1, 1.45); ctx.font = `${weight || 600} ${size}px "Familjen Grotesk", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,13,34,.85)'; ctx.strokeText(txt, x, y); ctx.fillStyle = col || '#f7edd8'; ctx.fillText(txt, x, y); }
function hut(p, w, h, name, n, path, hot) {
  ctx.fillStyle = mix('#3a4a5a', '#1b2248', n); ctx.strokeStyle = hot ? '#ffb347' : path; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(p.x - w / 2, p.y - h / 2, w, h, 8); ctx.fill(); ctx.stroke();
  label(name, p.x, p.y + h / 2 + 15, 12, rgba('#f7edd8', .75));
}

function draw(now, frac) {
  const t = now / 1000, clock = ui.title ? 1290 : S.clock, n = nightOf(clock), day = S.phase === 'day', lhNow = !ui.title && day && S.clock > L.LH;
  ctx.fillStyle = mix('#1f3d49', '#0b1029', n); ctx.fillRect(0, 0, cw, ch);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
  const zone = mix('#2a5057', '#131a3d', n), water = mix('#3d8aa0', '#1a2b5c', n), path = mix('#d8bf8c', '#4b4676', n);
  ctx.fillStyle = zone;
  for (const [x, y, w, h] of [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]]) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 46); ctx.fill(); }
  ctx.fillStyle = water; ctx.beginPath(); ctx.ellipse(150, 425, 96, 58, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-40, 120); ctx.bezierCurveTo(60, 150, 30, 330, -40, 380); ctx.fill();
  ctx.beginPath(); ctx.moveTo(655, 300); ctx.bezierCurveTo(700, 190, 760, 280, 800, 250); ctx.bezierCurveTo(860, 210, 900, 290, 962, 270); ctx.lineWidth = 16; ctx.strokeStyle = water; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const N = L.NODES;
  const paths = [[[L.GATE.x, L.GATE.y], [N.P.x, N.P.y]], [[N.P.x, N.P.y], [N.W.x, N.W.y]], [[N.P.x, N.P.y], [N.N.x, N.N.y]], [[N.P.x, N.P.y], [N.E.x, N.E.y]]];
  for (const r of S.rides) if (r.via) paths.push([[N[r.via].x, N[r.via].y], [r.x, r.y]]);
  for (const p of paths) line(p, 11, path);
  line([[L.STORE.x, L.STORE.y], [L.YARD.x, L.YARD.y], [L.SHOP.x, L.SHOP.y + 10]], 4, rgba('#d8bf8c', .25), [6, 6]);
  ctx.fillStyle = path; ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 30, 0, 7); ctx.fill();
  for (const k of ['W', 'N', 'E']) { ctx.beginPath(); ctx.arc(N[k].x, N[k].y, 13, 0, 7); ctx.fill(); }
  ctx.strokeStyle = path; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(L.GATE.x, L.GATE.y + 6, 22, Math.PI, 0); ctx.stroke();
  label('Main gate', L.GATE.x, L.GATE.y + 30, 12, rgba('#f7edd8', .7));
  hut(L.STORE, 66, 40, 'Stores', n, path, false);
  hut(L.YARD, 80, 40, 'Crew yard', n, path, false);
  hut(L.SHOP, 64, 40, 'Workshop', n, path, day && S.fab.length && L.onNow(S, 'mach'));
  hut(L.OFFICE, 66, 36, 'Office', n, path, false);
  for (const r of S.rides) if (r.sub) { const sb = L.ride(S, r.sub), off = L.subDown(S, sb); line([[sb.x, sb.y], [r.x, r.y]], 1.5, off ? rgba('#ff5d4a', .5) : rgba('#f4d35e', .1 + .08 * n), [3, 9]); }
  for (const g of guests) { if (g.wait > 0) continue; ctx.fillStyle = g.sad ? rgba('#ff8f7f', .9) : rgba(n > .5 ? '#ffd9a0' : '#f7edd8', .55 + .35 * n); ctx.beginPath(); ctx.arc(g.x, g.y, 2.3, 0, 7); ctx.fill(); }
  for (const r of S.rides) drawRide(r, t, n, lhNow);
  // people on shift
  if (!ui.title) for (const c of S.crew) {
    if (!c.on) continue;
    const p = prev[c.id] || [c.x, c.y], x = p[0] + (c.x - p[0]) * frac, y = p[1] + (c.y - p[1]) * frac, on = ui.units.includes(c.id), col = TC[rk(c)];
    const d = c.fetch ? L.STORE : c.target ? L.ride(S, c.target) : c.dest ? L.ride(S, c.dest) : c.post || null;
    if (c.sprint > S.clock) { ctx.strokeStyle = rgba('#8fe8c4', .8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 14.5, 0, 7); ctx.stroke(); }
    if (c.push > S.clock) { ctx.strokeStyle = rgba('#ffb347', .9); ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    if (d && (c.state === 'walk' || c.state === 'run')) line([[x, y], [d.x, d.y]], 1.5, rgba(col, .55), [4, 6]);
    if (on) { ctx.strokeStyle = '#79c2ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 16 + (reduce ? 0 : Math.sin(t * 5) * 1.5), 0, 7); ctx.stroke(); }
    ctx.fillStyle = col; ctx.strokeStyle = '#10142f'; ctx.lineWidth = 2.5; ctx.beginPath();
    if (c.role === 'tech') ctx.arc(x, y, 11, 0, 7); else ctx.roundRect(x - 10, y - 10, 20, 20, 5);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#16122b'; ctx.font = '700 12px "Familjen Grotesk", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(c.name[0], x, y + 4.2);
    if (isMe(c)) { ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, 21, 0, 7); ctx.stroke(); ctx.setLineDash([]); label('You', x, y - 25, 12, '#ffd27a', 700); }
    if (c.carry || c.state === 'run') { ctx.fillStyle = '#f7edd8'; ctx.strokeStyle = '#10142f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.rect(x + 7, y - 15, 9, 8); ctx.fill(); ctx.stroke(); }
    if (c.state === 'wait') { ctx.fillStyle = '#b79cf5'; ctx.beginPath(); ctx.arc(x + 10, y - 9, 4, 0, 7); ctx.fill(); }
    if (c.role === 'tech' && !c.temp && !c.agency && L.enOf(c) < 70) { const e = L.enOf(c) / 100; ctx.fillStyle = 'rgba(16,20,47,.85)'; ctx.fillRect(x - 11, y + 14, 22, 4); ctx.fillStyle = e >= .6 ? '#5fd6a8' : e >= .3 ? '#ffb347' : '#ff5d4a'; ctx.fillRect(x - 10, y + 15, 20 * e, 2); }
    if (c.state === 'break') label('z', x + 13, y - 11, 12, '#9fd4ff', 700);
    if (c.state === 'talk') { ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x + 11, y - 11, 3.5, 0, 7); ctx.fill(); }
    if (ui.coachUnit === c.id && !reduce) { ctx.strokeStyle = rgba('#ffb347', .55 + .45 * Math.sin(t * 7)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.stroke(); }
  }
  for (let i = pings.length - 1; i >= 0; i--) { const p = pings[i], a = (now - p.t0) / 600; if (a >= 1) { pings.splice(i, 1); continue; } ctx.strokeStyle = rgba(p.col, 1 - a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + 22 * a, 0, 7); ctx.stroke(); }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i], a = (now - p.t0) / 1800; if (a >= 1) { pops.splice(i, 1); continue; } ctx.globalAlpha = 1 - a * a; label(p.txt, p.x, p.y - 44 - a * 26, 15, p.col, 700); ctx.globalAlpha = 1; }
  if (ui.title && !reduce && lanterns.length < 26 && Math.random() < .04) { const r = S.rides[Math.floor(Math.random() * 12)]; lanterns.push({ x: r.x, y: r.y - 20, vy: 14 + Math.random() * 12, ph: Math.random() * 6, t0: now, life: 9000 }); }
  for (let i = lanterns.length - 1; i >= 0; i--) {
    const l = lanterns[i], a = (now - l.t0) / l.life; if (a >= 1) { lanterns.splice(i, 1); continue; } if (a < 0) continue;
    const y = l.y - l.vy * (now - l.t0) / 1000 * 3, x = l.x + Math.sin(t * 1.3 + l.ph) * 10, al = Math.min(1, a * 6) * (1 - a);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 26); g.addColorStop(0, rgba('#ffb347', .55 * al)); g.addColorStop(1, rgba('#ffb347', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
    ctx.fillStyle = rgba('#ffd27a', al); ctx.beginPath(); ctx.roundRect(x - 5, y - 7, 10, 13, 3); ctx.fill();
  }
  ctx.restore();
  if (ui.box) { const b = ui.box; ctx.fillStyle = 'rgba(121,194,255,.12)'; ctx.strokeStyle = '#79c2ff'; ctx.lineWidth = 1.5; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
  if (n > 0 && n < 1) { ctx.fillStyle = rgba('#ff7b3d', .1 * Math.sin(n * Math.PI)); ctx.fillRect(0, 0, cw, ch); }
}
function drawRide(r, t, n, lhNow) {
  const st = ui.title ? 'ok' : L.status(S, r), col = SCOL[st], x = r.x, y = r.y, j = ui.title ? null : r.job;
  const pulse = st === 'down' && !reduce ? .55 + .45 * Math.sin(t * 6) : 1;
  const lit = st === 'ok' || st === 'degraded';
  const rad = 40 + 34 * n, a = (lit ? .16 + .5 * n : st === 'nopower' || st === 'unstaffed' ? .05 : .4) * pulse;
  const g = ctx.createRadialGradient(x, y, 6, x, y, rad); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
  if (ui.sel === r.id) { ctx.strokeStyle = '#f7edd8'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(x, y, 40, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  const armed = j && j.type === 'fault' && selUnits().some(c => c.skills[j.trade] || j.rescue);
  if (armed && !reduce) { ctx.strokeStyle = rgba('#79c2ff', .5 + .4 * Math.sin(t * 5)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 37, 0, 7); ctx.stroke(); }
  ctx.fillStyle = lit && n > .3 ? mix('#141a3c', '#4a3210', n * .6) : '#141a3c'; ctx.strokeStyle = col; ctx.lineWidth = 3.5;
  ctx.beginPath(); if (r.sub) ctx.arc(x, y, 22, 0, 7); else ctx.roundRect(x - 20, y - 20, 40, 40, 8); ctx.fill(); ctx.stroke();
  if (!ui.title) {
    const h = r.health / 100, hc = r.health >= 60 ? '#5fd6a8' : r.health >= 35 ? '#ffb347' : '#ff5d4a';
    ctx.lineWidth = 3; ctx.strokeStyle = rgba('#f7edd8', .12); ctx.beginPath(); ctx.arc(x, y, 28.5, 0, 7); ctx.stroke();
    ctx.strokeStyle = hc; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, 28.5, -Math.PI / 2, -Math.PI / 2 + Math.max(.02, h) * Math.PI * 2); ctx.stroke();
    if (j && j.prog > 0) { ctx.strokeStyle = '#79c2ff'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(x, y, 34.5, -Math.PI / 2, -Math.PI / 2 + clamp(j.prog / L.need(j), 0, 1) * Math.PI * 2); ctx.stroke(); }
    else if (lhNow && r.sub) { ctx.strokeStyle = rgba('#ffd27a', .9); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 34.5, -Math.PI / 2, -Math.PI / 2 + clamp(r.lh / L.LIT_MIN, 0, 1) * Math.PI * 2); ctx.stroke(); }
  }
  if (j && j.type === 'fault' && !j.first && S.clock - j.t0 <= L.FAST) { // the fast-response window: a blue ring that drains
    const f = clamp((L.FAST - (S.clock - j.t0)) / L.FAST, 0, 1); ctx.strokeStyle = rgba('#79c2ff', reduce ? 1 : .65 + .35 * Math.sin(t * 12)); ctx.lineWidth = 4; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(x, y, 47, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke(); ctx.lineCap = 'round'; label('⚡', x - 34, y - 30, 13, '#9fd4ff', 700); }
  if (ui.coachRide === r.id && !reduce) { ctx.strokeStyle = rgba('#ffb347', .55 + .45 * Math.sin(t * 7)); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(x, y, 54, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  if (j && j.type === 'fault' && (j.rescue || (j.esc && j.sev === 'minor'))) { // countdown ring: red for stuck guests, amber for a fault about to get worse
    const due = j.rescue || j.esc, span = j.rescue ? 30 : Math.max(1, j.esc - j.t0), f = clamp((due - S.clock) / span, 0, 1), urgent = !!j.rescue;
    ctx.strokeStyle = urgent ? rgba('#ff5d4a', reduce ? 1 : .6 + .4 * Math.sin(t * 9)) : rgba('#ffb347', .9); ctx.lineWidth = urgent ? 5 : 3.5; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(x, y, urgent ? 42 : 39, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke(); ctx.lineCap = 'round';
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(1.75, 1.75); ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const gc = st === 'nopower' ? '#8a8ca8' : '#f7edd8';
  if (r.kind === 'power') { ctx.fillStyle = gc; ctx.fill(P2.power); } else { ctx.strokeStyle = gc; ctx.stroke(P2[r.kind]); }
  ctx.restore();
  if (r.sub && !ui.title && r.q > 1) { const k = Math.min(9, Math.ceil(r.q / (r.cap * S.qtol) * 9)); ctx.fillStyle = r.jam ? '#ff5d4a' : rgba('#f7edd8', .75); for (let i = 0; i < k; i++) { ctx.beginPath(); ctx.arc(x - (k - 1) * 3 + i * 6, y + 41, 2, 0, 7); ctx.fill(); } }
  label(r.short, x, y + 59, 13.5, st === 'nopower' ? '#a5a7c2' : '#f7edd8');
  if (ui.title) return;
  let bx = x + 22;
  const badge = (txt, bg) => { ctx.fillStyle = bg; ctx.strokeStyle = '#10142f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, y - 24, 10, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#16122b'; ctx.font = '700 11px "Familjen Grotesk", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, bx, y - 20); bx += 21; };
  if (j && j.type === 'fault') { badge(j.trade[0].toUpperCase(), TC[j.trade]); if (j.mode === 'full' && j.part && j.ps === 'none' && S.stock[j.part] < 1) badge('?', '#b79cf5'); }
  if (j && j.rescue) badge('!', '#ff5d4a');
  if (r.warnAt) badge('!', '#ffb347');
  if (r.patched) badge('P', '#f7edd8');
  if (S.prio === r.id) badge('R', '#ffb347');
  if (r.vouch > S.clock) badge('V', '#8fe8c4');
  if (r.fl > S.clock) badge('F', '#ffd27a');
  if (r.svcReq && !j) badge('S', '#79c2ff');
  const vip = S.events.find(e => e.k === 'vip' && !e.done && e.ride === r.id && e.warned);
  if (vip) { ctx.fillStyle = '#ffd27a'; ctx.strokeStyle = '#10142f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 70, y - 36, 56, 19, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2a1700'; ctx.font = '700 10.5px "Familjen Grotesk", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VIP ' + fmtClock(vip.at), x - 42, y - 23); }
}

