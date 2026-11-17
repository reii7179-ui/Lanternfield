/* Look B, "Diorama": isometric 2.5D. The park is a raised island; buildings are boxes, rides stand on round plinths. Mock-up only.
   The ground is drawn through an isometric transform; everything that stands up is drawn upright at its projected point. */
const IK = .74, IC = .866 * IK, IS = .5 * IK, IE = 500 - 155 * IC, IF = 345 - 845 * IS;
const pjI = (x, y) => [IC * x - IC * y + IE, IS * x + IS * y + IF];
const isoT = () => ctx.transform(IC, IS, -IC, IS, IE, IF);
const GB = {
  sea: ['#3f9dc0', '#0b1a46'], sea2: ['#2a7ea4', '#081236'], foam: ['#d9f4ff', '#4a6cb8'],
  top: ['#7cc47a', '#1d3462'], top2: ['#69b46c', '#182c56'], cliff: ['#9b7a55', '#2a2852'], cliff2: ['#7a5c40', '#1c1a3e'], cliffTop: ['#b8936a', '#363464'],
  path: ['#f1e2bd', '#4a4882'], pathEdge: ['#cdb58a', '#2e2c66'], water: ['#4cb6dc', '#173a7c'],
  tree: ['#3f8f55', '#16305a'], treeHi: ['#62b56a', '#22427a'], trunk: ['#7a5638', '#2b2448'],
};
const gb = (k, n) => mix(GB[k][0], GB[k][1], n);
const palB = n => ({
  ink: '#1a1830', metal: mix('#eef0f6', '#a3abd0', n), metal2: mix('#b8bfd2', '#5d6696', n), c1: '#ef5b4c', c2: '#ffcf5a', c3: '#3cc6c0', canvas: '#fffaf0',
  wall: mix('#f1e6d2', '#5a5a8e', n), roof: mix('#e8664a', '#93473c', n), win: '#ffd98a', water: mix('#58c4e6', '#25509e', n), water2: '#e8faff',
  wood: mix('#c98c55', '#8a5a3a', n), rock: mix('#a48a6e', '#423a5a', n), bulb: '#ffd27a', glass: mix('#c4ecff', '#ffe4a8', n), dark: '#2a2440',
  beacon: '#fff0b0', smoke: '#f4f4fa', hum: '#79c2ff',
});
const ZONES = [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]];
let sceneB = null;
function setupB() {
  const N = L.NODES, P = [[L.GATE, N.P], [N.P, N.W], [N.P, N.N], [N.P, N.E]].concat(S.rides.filter(r => r.via).map(r => [N[r.via], r])), lamps = [];
  for (const [a, b] of P) { const d = Math.hypot(b.x - a.x, b.y - a.y), k = Math.floor(d / 60); for (let i = 1; i < k; i++) { const u = i / k, nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d, s = i % 2 ? 11 : -11; lamps.push([a.x + (b.x - a.x) * u + nx * s, a.y + (b.y - a.y) * u + ny * s]); } }
  sceneB = { paths: P, lamps, trees: sceneryPoints(60, 777, 20) };
}
// an isometric box standing on park point (x, y): w along park x, d along park y, h tall (drawing units)
function isoBox(x, y, w, d, h, top, left, right, line) {
  const A = pjI(x - w / 2, y - d / 2), B = pjI(x + w / 2, y - d / 2), C = pjI(x + w / 2, y + d / 2), D = pjI(x - w / 2, y + d / 2), up = p => [p[0], p[1] - h];
  const face = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); if (line) { ctx.strokeStyle = line; ctx.lineWidth = .8; ctx.stroke(); } };
  face([D, C, up(C), up(D)], left); face([B, C, up(C), up(B)], right); face([up(A), up(B), up(C), up(D)], top);
  return { A, B, C, D, up };
}
function isoWindows(p0, p1, h0, n, h, col, glow) { // a row of n windows along a wall from p0 to p1, h0 above the ground
  for (let i = 0; i < n; i++) { const u = (i + .5) / n, x = p0[0] + (p1[0] - p0[0]) * u, y = p0[1] + (p1[1] - p0[1]) * u - h0, sl = (p1[1] - p0[1]) / (p1[0] - p0[0]) || 0; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 2.5, y - 2.5 * sl); ctx.lineTo(x + 2.5, y + 2.5 * sl); ctx.lineTo(x + 2.5, y + 2.5 * sl - h); ctx.lineTo(x - 2.5, y - 2.5 * sl - h); ctx.fill(); if (glow) LIT.push([x, y - h / 2, 4, '#ffd98a']); }
}
const BOXED = {
  arcade(x, y, P, n, run) { const b = isoBox(x, y, 40, 30, 22, P.roof, P.wall, mix('#d8c9b0', '#44447a', n)); isoWindows(b.D, b.C, 4, 3, 9, run ? '#7fe3ff' : P.dark, run); const [sx, sy] = b.up(b.C); ctx.fillStyle = P.c1; ctx.beginPath(); ctx.roundRect(sx - 20, sy - 14, 30, 11, 3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 7px "Familjen Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ARCADE', sx - 5, sy - 6); for (let i = 0; i < 6; i++) LIT.push([sx - 18 + i * 5.2, sy - 15, 1.8, '#ffd27a']); },
  food(x, y, P, n, run) { const b = isoBox(x, y, 46, 30, 20, P.roof, P.wall, mix('#d8c9b0', '#44447a', n)); isoWindows(b.D, b.C, 4, 4, 8, P.win, true); isoWindows(b.B, b.C, 4, 2, 8, P.win, true); const [cx, cy] = b.up(b.B); ctx.fillStyle = P.metal2; ctx.fillRect(cx - 10, cy - 12, 5, 12); if (run) { ctx.fillStyle = P.smoke; ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(cx - 7, cy - 16, 3, 0, 7); ctx.arc(cx - 4, cy - 22, 4, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } const p0 = b.D, p1 = b.C; for (let i = 0; i < 8; i++) { const u0 = i / 8, u1 = (i + 1) / 8; ctx.fillStyle = i % 2 ? P.canvas : P.c1; ctx.beginPath(); ctx.moveTo(p0[0] + (p1[0] - p0[0]) * u0, p0[1] + (p1[1] - p0[1]) * u0 - 15); ctx.lineTo(p0[0] + (p1[0] - p0[0]) * u1, p0[1] + (p1[1] - p0[1]) * u1 - 15); ctx.lineTo(p0[0] + (p1[0] - p0[0]) * u1 - 3, p0[1] + (p1[1] - p0[1]) * u1 - 9); ctx.lineTo(p0[0] + (p1[0] - p0[0]) * u0 - 3, p0[1] + (p1[1] - p0[1]) * u0 - 9); ctx.fill(); } },
  wsub(x, y, P, n, run) { isoBox(x - 10, y - 4, 18, 14, 14, P.metal, P.metal2, mix('#8890a8', '#3a4070', n)); isoBox(x + 12, y + 6, 18, 14, 14, P.metal, P.metal2, mix('#8890a8', '#3a4070', n)); const [sx, sy] = pjI(x + 22, y - 14); ctx.fillStyle = P.c2; ctx.beginPath(); ctx.moveTo(sx, sy - 14); ctx.lineTo(sx + 7, sy - 2); ctx.lineTo(sx - 7, sy - 2); ctx.fill(); ctx.fillStyle = P.ink; ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', sx, sy - 3.5); if (run) LIT.push([pjI(x, y)[0], pjI(x, y)[1] - 18, 9, '#79c2ff']); },
};
BOXED.esub = BOXED.wsub;
const HUTB = { store: [56, 34, 18], yard: [66, 34, 14], shop: [54, 34, 18], office: [48, 34, 26] };
function plinth(x, y, rad, n, st) {
  const ry = rad * IS / IC, col = st === 'down' ? '#c8483c' : st === 'degraded' ? '#e0903a' : st === 'service' ? '#4f8fd0' : st === 'nopower' || st === 'unstaffed' ? '#7d7f9c' : mix('#e9dcc0', '#555590', n);
  ctx.fillStyle = 'rgba(20,20,50,.28)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 9, rad + 4, ry + 3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = mix('#9c8a6c', '#2c2c5a', n); ctx.beginPath(); ctx.ellipse(x, y + 5, rad, ry, 0, 0, Math.PI); ctx.lineTo(x - rad, y); ctx.ellipse(x, y, rad, ry, 0, Math.PI, 0, true); ctx.fill();
  ctx.fillStyle = mix('#efe4cc', '#46467e', n); ctx.beginPath(); ctx.ellipse(x, y, rad, ry, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, rad - 3, ry - 2, 0, 0, 7); ctx.stroke();
}
function draw(now, frac) {
  if (!sceneB) setupB();
  const t = now / 1000, clock = ui.title ? 1290 : S.clock, n = nightOf(clock), day = S.phase === 'day', N = L.NODES, P = palB(n), op = ctx.globalCompositeOperation;
  const bg = ctx.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, gb('sea', n)); bg.addColorStop(1, gb('sea2', n)); ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
  // swell lines on the sea
  ctx.strokeStyle = rgba(GB.foam[0], .25 - .12 * n); ctx.lineWidth = 1.5; for (let i = -6; i < 16; i++) { ctx.beginPath(); for (let x = -400; x < 1500; x += 30) { const y = i * 60 + Math.sin(x / 70 + i) * 4 + x * .1; x === -400 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  // the island: cliffs (layered down), a lit top edge, then the lawn
  for (let d = 26; d >= 0; d -= 2) { ctx.save(); ctx.translate(0, d); isoT(); ctx.fillStyle = d === 0 ? gb('cliffTop', n) : d > 13 ? gb('cliff2', n) : gb('cliff', n); for (const [x, y, w, h] of ZONES) { ctx.beginPath(); ctx.roundRect(x - 14, y - 14, w + 28, h + 28, 58); ctx.fill(); } ctx.restore(); }
  ctx.save(); ctx.translate(0, 26); isoT(); ctx.strokeStyle = rgba(GB.foam[0], .7 - .4 * n); ctx.lineWidth = 3; for (const [x, y, w, h] of ZONES) { ctx.beginPath(); ctx.roundRect(x - 16, y - 16, w + 32, h + 32, 60); ctx.stroke(); } ctx.restore();
  ctx.save(); isoT();
  for (const [x, y, w, h] of ZONES) { ctx.fillStyle = gb('top', n); ctx.beginPath(); ctx.roundRect(x - 10, y - 10, w + 20, h + 20, 54); ctx.fill(); }
  // a soft checker of mown lawn
  ctx.fillStyle = rgba(GB.top2[0], .35 * (1 - n)); for (let x = 0; x < 1000; x += 40) for (let y = 0; y < 700; y += 40) if (((x + y) / 40) % 2 === 0 && ZONES.some(([zx, zy, zw, zh]) => x > zx - 10 && x < zx + zw && y > zy - 10 && y < zy + zh)) ctx.fillRect(x, y, 40, 40);
  // water cut into the lawn
  ctx.fillStyle = gb('cliff', n); ctx.beginPath(); ctx.ellipse(150, 425, 100, 62, 0, 0, 7); ctx.fill();
  ctx.fillStyle = gb('water', n); ctx.beginPath(); ctx.ellipse(152, 428, 94, 56, 0, 0, 7); ctx.fill();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const river = () => { ctx.beginPath(); ctx.moveTo(655, 300); ctx.bezierCurveTo(700, 190, 760, 280, 800, 250); ctx.bezierCurveTo(860, 210, 900, 290, 962, 270); };
  river(); ctx.strokeStyle = gb('cliff', n); ctx.lineWidth = 20; ctx.stroke(); ctx.save(); ctx.translate(1.5, 1.5); river(); ctx.strokeStyle = gb('water', n); ctx.lineWidth = 15; ctx.stroke(); ctx.restore();
  for (const [a, b] of sceneB.paths) line([[a.x, a.y], [b.x, b.y]], 17, gb('pathEdge', n));
  for (const [a, b] of sceneB.paths) line([[a.x, a.y], [b.x, b.y]], 12, gb('path', n));
  ctx.fillStyle = gb('pathEdge', n); ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 38, 0, 7); ctx.fill(); ctx.fillStyle = gb('path', n); ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 34, 0, 7); ctx.fill();
  ctx.fillStyle = mix('#62b9d8', '#2a4a8c', n); ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 13, 0, 7); ctx.fill();
  for (const k of ['W', 'N', 'E']) { ctx.fillStyle = gb('path', n); ctx.beginPath(); ctx.arc(N[k].x, N[k].y, 16, 0, 7); ctx.fill(); }
  line([[L.STORE.x, L.STORE.y], [L.YARD.x, L.YARD.y], [L.SHOP.x, L.SHOP.y + 10]], 4, rgba('#8a7350', .35), [6, 6]);
  for (const r of S.rides) if (r.sub) { const sb = L.ride(S, r.sub), off = L.subDown(S, sb); line([[sb.x, sb.y], [r.x, r.y]], 1.5, off ? rgba('#ff5d4a', .6) : rgba('#f4d35e', .25 + .1 * n), [3, 9]); }
  ctx.restore();
  // fountain jet in the plaza
  { const [fx, fy] = pjI(N.P.x, N.P.y); ctx.fillStyle = rgba('#e8faff', .8); for (let i = 0; i < 6; i++) { const a = i / 6 * 7 + t; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 5, fy - 6 - Math.abs(Math.sin(a * 2)) * 4, 1.6, 0, 7); ctx.fill(); } }
  drawGuests(n, pjI, n > .5 ? ['#ffd9a0', '#ffe9c4', '#ffc98a', '#cfe8ff'] : ['#ffffff', '#ef5b4c', '#3c8fd6', '#ffcf5a', '#7a4fc0'], 2);
  // everything that stands up, back to front
  const items = [], names = [];
  for (const tr of sceneB.trees) { const [x, y] = pjI(tr.x, tr.y); items.push([y, () => { const s = tr.s * 8; ctx.fillStyle = 'rgba(20,20,50,.25)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 2, s, s * .45, 0, 0, 7); ctx.fill(); ctx.fillStyle = gb('trunk', n); ctx.fillRect(x - 1.5, y - 8, 3, 8); ctx.fillStyle = gb('tree', n); ctx.beginPath(); ctx.arc(x, y - 8 - s * .8, s, 0, 7); ctx.fill(); ctx.fillStyle = gb('treeHi', n); ctx.beginPath(); ctx.arc(x - s * .35, y - 8 - s * 1.1, s * .5, 0, 7); ctx.fill(); }]); }
  for (const [lx, ly] of sceneB.lamps) { const [x, y] = pjI(lx, ly); items.push([y, () => { ctx.strokeStyle = P.metal2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 12); ctx.stroke(); ctx.fillStyle = n > .2 ? '#fff1cf' : P.metal; ctx.beginPath(); ctx.arc(x, y - 13, 1.8, 0, 7); ctx.fill(); }]); }
  for (const [p, k, name, hot] of [[L.STORE, 'store', 'Stores'], [L.YARD, 'yard', 'Crew yard'], [L.SHOP, 'shop', 'Workshop', day && S.fab.length && L.onNow(S, 'mach')], [L.OFFICE, 'office', 'Office']]) {
    const [x, y] = pjI(p.x, p.y), [w, d, h] = HUTB[k];
    items.push([y, () => { ctx.fillStyle = 'rgba(20,20,50,.25)'; ctx.beginPath(); ctx.ellipse(x + 10, y + 6, 30, 12, 0, 0, 7); ctx.fill(); const b = isoBox(p.x, p.y, w, d, h, hot ? '#ffb347' : P.roof, P.wall, mix('#d8c9b0', '#44447a', n)); isoWindows(b.D, b.C, 4, k === 'office' ? 3 : 2, k === 'office' ? 14 : 7, P.win, n > .2); drawLights(0, 0, 1, n, true, .7); names.push(() => label(name, x, y + 26, 12, rgba('#fffaf0', .9))); }]);
  }
  for (const r of S.rides) {
    const [x, y] = pjI(r.x, r.y), st = rideSt(r), run = RUNOF[st], lit = st === 'ok' || st === 'degraded';
    items.push([y, () => {
      if (n > .1 && lit) { ctx.globalCompositeOperation = 'lighter'; glowAt(x, y, 70, '#ffb347', .3 * n); ctx.globalCompositeOperation = op; }
      if (st === 'down' && !reduce) { ctx.globalCompositeOperation = 'lighter'; glowAt(x, y - 10, 50, '#ff5d4a', .35 + .25 * Math.sin(t * 6)); ctx.globalCompositeOperation = op; }
      if (BOXED[r.id]) { ctx.globalAlpha = lit || st === 'service' ? 1 : .7; plinth(x, y, 34, n, st); ctx.save(); ctx.translate(0, -4); BOXED[r.id](r.x - 2, r.y - 2, P, n, run); ctx.restore(); ctx.globalAlpha = 1; drawLights(0, -4, 1, n, lit); }
      else { plinth(x, y, 32, n, st); ctx.save(); ctx.translate(x, y - 15); ctx.globalAlpha = lit || st === 'service' ? 1 : .7; ART[r.id](ctx, P, ridePh(r, t), run); ctx.restore(); ctx.globalAlpha = 1; drawLights(x, y - 15, 1, n, lit, st === 'degraded' ? .5 : 1); }
      rideInfo(r, t, x, y, { cy: -16, R: 36, ly: 42, qy: 26, pill: { bg: n > .5 ? 'rgba(22,22,52,.85)' : 'rgba(38,34,64,.82)' }, defer: names });
    }]);
  }
  items.sort((a, b) => a[0] - b[0]); for (const [, f] of items) f();
  // the main gate
  { const [gx, gy] = pjI(L.GATE.x, L.GATE.y); ctx.fillStyle = P.roof; ctx.fillRect(gx - 22, gy - 24, 6, 24); ctx.fillRect(gx + 16, gy - 24, 6, 24); ctx.strokeStyle = P.metal; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy - 24, 19, Math.PI, 0); ctx.stroke(); names.push(() => label('Main gate', gx, gy + 18, 12, rgba('#fffaf0', .9))); }
  for (const f of names) f();
  drawCrew(t, frac, pjI, { token: (c, x, y, col) => {
    ctx.fillStyle = 'rgba(20,20,50,.3)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 10, 8, 3.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.strokeStyle = '#1a1830'; ctx.lineWidth = 2; ctx.beginPath(); if (c.role === 'tech') ctx.roundRect(x - 8, y - 9, 16, 19, 8); else ctx.roundRect(x - 8, y - 9, 16, 19, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(x, y - 13, 5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#16122b'; ctx.font = '700 11px "Familjen Grotesk", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(c.name[0], x, y + 5);
  } });
  if (n > .15) { ctx.globalCompositeOperation = 'lighter'; for (const [lx, ly] of sceneB.lamps) { const [x, y] = pjI(lx, ly); glowAt(x, y - 12, 26, '#ffc070', .55 * n); } ctx.globalCompositeOperation = op; }
  drawFxLayer(now, t, pjI);
  ctx.restore();
  if (ui.box) { const b = ui.box; ctx.fillStyle = 'rgba(121,194,255,.12)'; ctx.strokeStyle = '#79c2ff'; ctx.lineWidth = 1.5; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
  if (n > 0 && n < 1) { ctx.fillStyle = rgba('#ff7b3d', .12 * Math.sin(n * Math.PI)); ctx.fillRect(0, 0, cw, ch); }
}
