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
  mx.fillStyle = ga('bg', n); mx.fillRect(0, 0, W, H);
  mx.fillStyle = ga('landHi', n);
  for (const [x, y, zw, zh] of [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]]) { mx.beginPath(); mx.roundRect(x, y, zw, zh, 46); mx.fill(); }
  mx.fillStyle = ga('water', n); mx.beginPath(); mx.ellipse(150, 425, 96, 58, 0, 0, 7); mx.fill();
  mx.strokeStyle = ga('path', n); mx.lineWidth = 10; mx.lineCap = 'round';
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
const SCOL = { ok: '#ffb347', degraded: '#ff8f3d', down: '#ff5d4a', service: '#79c2ff', nopower: '#7d7f9c', unstaffed: '#7d7f9c', signoff: '#e9c46a', signme: '#ffe08a', restart: '#79c2ff', unchecked: '#e9c46a', ready: '#7d7f9c' };

const guests = [], pops = [], lanterns = [];
const prev = {};
function routeTo(r) { const n = L.NODES[r.via], j = () => (Math.random() - .5) * 14, pts = [[L.NODES.P.x + j(), L.NODES.P.y + j()]]; if (r.via !== 'P') pts.push([n.x + j(), n.y + j()]); pts.push([r.x + j() * 1.6, r.y + 26 + j()]); return pts; }
function pickRide() { const open = S.rides.filter(r => r.sub && L.AV[L.status(S, r)] > 0); if (!open.length) return null; let t = Math.random() * open.reduce((a, r) => a + r.cap, 0); for (const r of open) if ((t -= r.cap) <= 0) return r; return open[0]; }
function stepGuests(dm) {
  const want = reduce ? 0 : Math.round(150 * Math.min(1.3, S.att) * (.6 + .4 * QUAL.q)); // a struggling device draws a thinner crowd (adaptive quality)
  if (guests.length < want && Math.random() < .5) { const r = pickRide(); if (r) guests.push({ x: L.GATE.x + (Math.random() - .5) * 20, y: L.GATE.y, path: routeTo(r), i: 0, ride: r.id, wait: 0, sp: 34 + Math.random() * 16, sad: false }); }
  for (let k = guests.length - 1; k >= 0; k--) {
    const g = guests[k];
    if (g.wait > 0) { const r = L.ride(S, g.ride); if (r && !(L.AV[L.status(S, r)] > 0)) { g.wait = 0; g.sad = true; leave(g); continue; } g.wait -= dm; if (g.wait <= 0) leave(g); continue; }
    const p = g.path[g.i]; if (!p) { guests.splice(k, 1); continue; }
    const dx = p[0] - g.x, dy = p[1] - g.y, d = Math.hypot(dx, dy), stepLen = g.sp * dm;
    if (d <= stepLen) {
      g.x = p[0]; g.y = p[1]; g.i++;
      if (g.i >= g.path.length) {
        if (g.out) { guests.splice(k, 1); continue; }
        const r = L.ride(S, g.ride);
        if (r && L.AV[L.status(S, r)] > 0) g.wait = 6 + Math.random() * 14 + Math.min(40, (r.q || 0) / Math.max(1, r.cap) * 5); else { g.sad = true; leave(g); }
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
