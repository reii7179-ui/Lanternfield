/* Look A, "Lantern Glow": polished flat vector at night with a soft glow. Mock-up only (design/). */
const GA = {
  bg: ['#17364a', '#050918'], land: ['#2d6266', '#0e1636'], landHi: ['#3a7676', '#16225a'], rim: ['#5b9a92', '#27357a'],
  speck: ['#4a8a7c', '#1d2b66'], tree: ['#25594d', '#0d1838'], treeHi: ['#4c9478', '#20316c'],
  water: ['#2c8db0', '#0d2152'], sheen: ['#a6e6f5', '#4366b4'], sand: ['#e9d5a6', '#34345f'],
  path: ['#ecd9ad', '#3a3a70'], pathEdge: ['#c2a372', '#22225a'], plaza: ['#f2e2bb', '#45437e'],
};
const ga = (k, n) => mix(GA[k][0], GA[k][1], n);
const palA = n => ({
  ink: '#0d1230', metal: mix('#e3e6ef', '#a3abd0', n), metal2: mix('#aeb5c9', '#5d6696', n), c1: '#ff6b5a', c2: '#ffc75a', c3: '#4fd1c5', canvas: '#fff3dc',
  wall: mix('#43557e', '#262f62', n), roof: mix('#f2845a', '#a84f3c', n), win: '#ffd98a', water: mix('#5cc0e0', '#2a4c9a', n), water2: '#e2f7ff',
  wood: mix('#cf9052', '#8f5d3b', n), rock: mix('#86735f', '#3e3756', n), bulb: '#ffd27a', glass: mix('#c4ecff', '#ffe4a8', n), dark: '#11163a',
  beacon: '#fff0b0', smoke: '#eef0f6', hum: '#79c2ff',
});
let sceneA = null;
function setupA() {
  const N = L.NODES, P = [[L.GATE, N.P], [N.P, N.W], [N.P, N.N], [N.P, N.E]].concat(S.rides.filter(r => r.via).map(r => [N[r.via], r]));
  const lamps = [];
  for (const [a, b] of P) { const d = Math.hypot(b.x - a.x, b.y - a.y), k = Math.floor(d / 56); for (let i = 1; i < k; i++) { const u = i / k, nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d, s = i % 2 ? 9.5 : -9.5; lamps.push([a.x + (b.x - a.x) * u + nx * s, a.y + (b.y - a.y) * u + ny * s]); } }
  let s = 99; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, specks = [];
  for (const [x, y, w, h] of [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]]) for (let i = 0; i < w * h / 520; i++) specks.push([x + 10 + rnd() * (w - 20), y + 10 + rnd() * (h - 20), rnd()]);
  sceneA = { paths: P, lamps, trees: sceneryPoints(70, 4242, 18), specks };
}
function vignette() {
  const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .35, cw / 2, ch / 2, Math.max(cw, ch) * .75);
  g.addColorStop(0, 'rgba(3,5,18,0)'); g.addColorStop(1, 'rgba(3,5,18,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
}
function draw(now, frac) {
  if (!sceneA) setupA();
  const t = now / 1000, clock = ui.title ? 1290 : S.clock, n = nightOf(clock), day = S.phase === 'day', N = L.NODES;
  const bg = ctx.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, ga('bg', n)); bg.addColorStop(1, mix(GA.bg[0], '#0a1030', Math.min(1, n + .3))); ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
  // the sea along the west edge
  ctx.fillStyle = ga('water', n); ctx.beginPath(); ctx.moveTo(-60, 100); ctx.bezierCurveTo(70, 140, 40, 340, -60, 400); ctx.fill();
  ctx.strokeStyle = rgba(GA.sheen[0], .5 - .25 * n); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-40, 120); ctx.bezierCurveTo(52, 150, 26, 330, -40, 382); ctx.stroke();
  // land: a lit rim, then the lawn with a soft top-light
  for (const [x, y, w, h] of [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]]) { ctx.fillStyle = ga('rim', n); ctx.beginPath(); ctx.roundRect(x - 12, y - 12, w + 24, h + 24, 56); ctx.fill(); }
  for (const [x, y, w, h] of [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]]) { ctx.fillStyle = ga('land', n); ctx.beginPath(); ctx.roundRect(x - 9, y - 9, w + 18, h + 18, 54); ctx.fill(); }
  const lg = ctx.createLinearGradient(0, 30, 0, 660); lg.addColorStop(0, ga('landHi', n)); lg.addColorStop(1, ga('land', n)); ctx.fillStyle = lg;
  for (const [x, y, w, h] of [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]]) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 46); ctx.fill(); }
  ctx.fillStyle = ga('speck', n); for (const [x, y, k] of sceneA.specks) { ctx.globalAlpha = .35 + k * .4; ctx.fillRect(x, y, 2.2, 1.2); } ctx.globalAlpha = 1;
  // pond and stream
  ctx.fillStyle = ga('sand', n); ctx.beginPath(); ctx.ellipse(150, 425, 102, 64, 0, 0, 7); ctx.fill();
  const wg = ctx.createLinearGradient(0, 360, 0, 490); wg.addColorStop(0, mix(GA.water[0], '#58bde0', 1 - n)); wg.addColorStop(1, ga('water', n)); ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(150, 425, 96, 58, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = rgba(GA.sheen[0], .55 - .3 * n); ctx.lineWidth = 1.5; for (const [x, y, w] of [[110, 405, 30], [170, 440, 22], [150, 470, 18]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y - 4, x + w, y); ctx.stroke(); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const river = () => { ctx.beginPath(); ctx.moveTo(655, 300); ctx.bezierCurveTo(700, 190, 760, 280, 800, 250); ctx.bezierCurveTo(860, 210, 900, 290, 962, 270); };
  river(); ctx.strokeStyle = ga('sand', n); ctx.lineWidth = 22; ctx.stroke(); river(); ctx.strokeStyle = ga('water', n); ctx.lineWidth = 16; ctx.stroke(); river(); ctx.strokeStyle = rgba(GA.sheen[0], .4 - .2 * n); ctx.lineWidth = 2; ctx.setLineDash([10, 16]); ctx.stroke(); ctx.setLineDash([]);
  // paths
  for (const [a, b] of sceneA.paths) line([[a.x, a.y], [b.x, b.y]], 16, ga('pathEdge', n));
  for (const [a, b] of sceneA.paths) line([[a.x, a.y], [b.x, b.y]], 11, ga('path', n));
  ctx.fillStyle = ga('pathEdge', n); ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 36, 0, 7); ctx.fill(); ctx.fillStyle = ga('plaza', n); ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 32, 0, 7); ctx.fill();
  ctx.strokeStyle = ga('pathEdge', n); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 22, 0, 7); ctx.stroke(); ctx.fillStyle = ga('rim', n); ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 12, 0, 7); ctx.fill();
  for (const k of ['W', 'N', 'E']) { ctx.fillStyle = ga('pathEdge', n); ctx.beginPath(); ctx.arc(N[k].x, N[k].y, 17, 0, 7); ctx.fill(); ctx.fillStyle = ga('path', n); ctx.beginPath(); ctx.arc(N[k].x, N[k].y, 14, 0, 7); ctx.fill(); }
  line([[L.STORE.x, L.STORE.y], [L.YARD.x, L.YARD.y], [L.SHOP.x, L.SHOP.y + 10]], 4, rgba('#d8bf8c', .25), [6, 6]);
  // the main gate: two pillars and an arch
  const gx = L.GATE.x, gy = L.GATE.y + 6; ctx.strokeStyle = palA(n).metal; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy - 6, 24, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = palA(n).roof; ctx.fillRect(gx - 28, gy - 8, 7, 16); ctx.fillRect(gx + 21, gy - 8, 7, 16);
  for (let i = 0; i < 7; i++) { const a = Math.PI + (i + .5) * Math.PI / 7; LIT.push([gx + Math.cos(a) * 24 - gx, gy - 6 + Math.sin(a) * 24 - gy, 2, '#ffd27a']); } drawLights(gx, gy, 1, n, true);
  label('Main gate', gx, gy + 26, 12, rgba('#f7edd8', .75));
  // service buildings
  const P = palA(n);
  for (const [p, k, name, hot] of [[L.STORE, 'store', 'Stores'], [L.YARD, 'yard', 'Crew yard'], [L.SHOP, 'shop', 'Workshop', day && S.fab.length && L.onNow(S, 'mach')], [L.OFFICE, 'office', 'Office']]) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + 15, 34, 7, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y); HUT[k](ctx, P); ctx.restore(); drawLights(p.x, p.y, 1, n, true, .6);
    if (hot) { ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(p.x - 34, p.y - 24, 68, 42, 8); ctx.stroke(); }
    label(name, p.x, p.y + 32, 12, rgba('#f7edd8', .8));
  }
  // power lines from each substation
  for (const r of S.rides) if (r.sub) { const sb = L.ride(S, r.sub), off = L.subDown(S, sb); line([[sb.x, sb.y], [r.x, r.y]], 1.5, off ? rgba('#ff5d4a', .5) : rgba('#f4d35e', .1 + .1 * n), [3, 9]); }
  // trees, back to front
  for (const tr of sceneA.trees) { const s = tr.s * 9; ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(tr.x + 3, tr.y + s * .8, s, s * .45, 0, 0, 7); ctx.fill(); ctx.fillStyle = ga('tree', n); ctx.beginPath(); ctx.arc(tr.x, tr.y, s, 0, 7); ctx.fill(); ctx.fillStyle = ga('treeHi', n); ctx.beginPath(); ctx.arc(tr.x - s * .3, tr.y - s * .3, s * .55, 0, 7); ctx.fill(); }
  drawGuests(n, ID, n > .5 ? ['#ffd9a0', '#ffe9c4', '#ffc98a', '#cfe8ff'] : ['#fff3dc', '#ff9a8c', '#9fd4ff', '#ffd27a', '#b6e388'], 2.3);
  // lamps: posts by day, pools of light by night
  ctx.fillStyle = P.metal2; for (const [x, y] of sceneA.lamps) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); }
  // rides
  const op = ctx.globalCompositeOperation;
  for (const r of S.rides) { const st = rideSt(r), lit = st === 'ok' || st === 'degraded'; if (n > .1 && lit) { ctx.globalCompositeOperation = 'lighter'; glowAt(r.x, r.y + 6, 78, st === 'ok' ? '#ffb347' : '#ff8f3d', .32 * n); ctx.globalCompositeOperation = op; } }
  for (const r of S.rides) {
    const st = rideSt(r), run = RUNOF[st], lit = st === 'ok' || st === 'degraded', x = r.x, y = r.y;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 19, 30, 7, 0, 0, 7); ctx.fill();
    if (st === 'down' && !reduce) { ctx.globalCompositeOperation = 'lighter'; glowAt(x, y - 4, 52, '#ff5d4a', .35 + .25 * Math.sin(t * 6)); ctx.globalCompositeOperation = op; }
    ctx.save(); ctx.translate(x, y); ctx.scale(1.2, 1.2); ctx.globalAlpha = lit || st === 'service' ? 1 : .62; ART[r.id](ctx, P, ridePh(r, t), run); ctx.restore(); ctx.globalAlpha = 1;
    drawLights(x, y, 1.2, n, lit, st === 'degraded' ? .5 : 1);
    rideInfo(r, t, x, y, { cy: -6, R: 37, ly: 62, qy: 40, pill: { bg: 'rgba(9,12,34,.78)', line: rgba('#ffffff', .1) } });
  }
  drawCrew(t, frac, ID, { shadow: 'rgba(0,0,0,.3)' });
  if (n > .15) { ctx.globalCompositeOperation = 'lighter'; for (const [x, y] of sceneA.lamps) glowAt(x, y, 30, '#ffc070', .5 * n); ctx.globalCompositeOperation = op; ctx.fillStyle = '#fff1cf'; for (const [x, y] of sceneA.lamps) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); } }
  drawFxLayer(now, t, ID);
  ctx.restore();
  vignette();
  if (ui.box) { const b = ui.box; ctx.fillStyle = 'rgba(121,194,255,.12)'; ctx.strokeStyle = '#79c2ff'; ctx.lineWidth = 1.5; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
  if (n > 0 && n < 1) { ctx.fillStyle = rgba('#ff7b3d', .1 * Math.sin(n * Math.PI)); ctx.fillRect(0, 0, cw, ch); }
}
