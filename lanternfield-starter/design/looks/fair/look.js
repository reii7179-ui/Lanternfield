/* Look C, "Seaside Fair": a warm, painterly seaside fair, all drawn in code. Mock-up only (design/).
   Textures are painted once into small canvases and used as patterns; rides are painted into sprites, outlined in ink and grained.
   Night is a dusk tint over the painting, with the lights added on top. */
const PC = {
  ink: '#3b2a2a', metal: '#f6efe0', metal2: '#c9b79a', c1: '#d9483b', c2: '#f2b63c', c3: '#3c9a8f', canvas: '#fbf3e1', wall: '#eadcc0', roof: '#c4553f',
  win: '#ffd27a', water: '#62b8c0', water2: '#effaf8', wood: '#a86b3c', rock: '#b8916c', bulb: '#ffdf8a', glass: '#cfe9e6', dark: '#4a3434', beacon: '#fff1b8', smoke: '#f6f1e6', hum: '#9fd4ff',
};
let texC = null;
function paintTex(base, strokes, size, fn) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size);
  let s = 1234 + strokes; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < strokes; i++) fn(g, rnd, size);
  return c;
}
function setupC() {
  const grass = paintTex('#97b56f', 1400, 256, (g, r, z) => { const x = r() * z, y = r() * z, a = -1.2 - r() * .7, l = 3 + r() * 7; g.strokeStyle = ['#7fa35c', '#adc883', '#6f9450', '#bcd391', '#8aac62'][Math.floor(r() * 5)]; g.globalAlpha = .45; g.lineWidth = 1 + r() * 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
  const water = paintTex('#5fb3bb', 500, 256, (g, r, z) => { const x = r() * z, y = r() * z, w = 6 + r() * 14; g.strokeStyle = r() < .6 ? '#8fd3cf' : '#4a9aa8'; g.globalAlpha = .55; g.lineWidth = 1.2 + r(); g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke(); });
  const sand = paintTex('#ead4a2', 900, 128, (g, r, z) => { g.fillStyle = r() < .5 ? '#d9bf88' : '#f5e6c2'; g.globalAlpha = .6; g.beginPath(); g.arc(r() * z, r() * z, .5 + r() * 1.2, 0, 7); g.fill(); });
  const cobble = paintTex('#efdfbb', 0, 64, () => {}); { const g = cobble.getContext('2d'); g.strokeStyle = '#cdb68a'; g.lineWidth = 1.2; for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 ? -4 : 0; x < 64; x += 8) { g.beginPath(); g.roundRect(x + 1, y + 1, 6.5, 6.5, 2.5); g.stroke(); } }
  const grain = paintTex('#808080', 9000, 256, (g, r, z) => { const v = Math.floor(90 + r() * 80); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.floor(r() * z), Math.floor(r() * z), 1, 1); });
  const brush = paintTex('#808080', 600, 128, (g, r, z) => { const v = r() < .5 ? '#5a5a5a' : '#b0b0b0'; g.strokeStyle = v; g.globalAlpha = .5; g.lineWidth = 1 + r() * 2; g.beginPath(); const x = r() * z, y = r() * z; g.moveTo(x, y); g.lineTo(x + 6 + r() * 8, y + (r() - .5) * 4); g.stroke(); });
  const pat = c => ctx.createPattern(c, 'repeat');
  const N = L.NODES, main = [[L.GATE, N.P], [N.P, N.W], [N.P, N.N], [N.P, N.E]];
  const bunt = []; for (const [a, b] of main) { const d = Math.hypot(b.x - a.x, b.y - a.y), k = Math.floor(d / 70); for (let i = 1; i < k; i++) { const u = i / k, nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d, cx = a.x + (b.x - a.x) * u, cy = a.y + (b.y - a.y) * u; bunt.push([cx - nx * 20, cy - ny * 20, cx + nx * 20, cy + ny * 20]); } }
  let s = 31; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, flowers = sceneryPoints(40, 9191, 13).map(p => ({ ...p, c: ['#d9483b', '#f2b63c', '#fbf3e1', '#c77dba'][Math.floor(rnd() * 4)] }));
  texC = { grass: pat(grass), water: pat(water), sand: pat(sand), cobble: pat(cobble), grain: pat(grain), brushC: brush, paths: main.concat(S.rides.filter(r => r.via).map(r => [N[r.via], r])), bunt, trees: sceneryPoints(55, 5150, 18), flowers, spr: {} };
}
// paint one ride (or building) into its sprite: art, ink outline, brush grain
function sprite(key, k, art) {
  const U = 84, px = Math.max(16, Math.ceil(U * k)); let s = texC.spr[key];
  if (!s) s = texC.spr[key] = { a: document.createElement('canvas'), b: document.createElement('canvas') };
  for (const c of [s.a, s.b]) if (c.width !== px) { c.width = c.height = px; }
  const a = s.a.getContext('2d'), b = s.b.getContext('2d');
  a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, px, px); a.setTransform(k, 0, 0, k, 42 * k, 52 * k); art(a);
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, px, px); b.globalCompositeOperation = 'source-over'; b.drawImage(s.a, 0, 0);
  b.globalCompositeOperation = 'source-in'; b.fillStyle = PC.ink; b.fillRect(0, 0, px, px); // b = an ink silhouette
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'destination-over'; const o = 1.3 * k; for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o * .7, o * .7], [-o * .7, o * .7], [o * .7, -o * .7], [-o * .7, -o * .7]]) a.drawImage(s.b, dx, dy);
  a.globalCompositeOperation = 'source-atop'; a.globalAlpha = .22; a.drawImage(texC.brushC, 0, 0, px, px); a.globalAlpha = 1; a.globalCompositeOperation = 'source-over';
  b.globalCompositeOperation = 'source-over';
  return s.a;
}
function roughFill(shape, fill, ink, wob) { // an inked, slightly uneven edge, then the paint
  ctx.fillStyle = ink; for (const [dx, dy] of [[-wob, .4], [wob, -.3], [.3, wob]]) { ctx.save(); ctx.translate(dx, dy); shape(); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = fill; shape(); ctx.fill();
}
function draw(now, frac) {
  if (!texC) setupC();
  const t = now / 1000, clock = ui.title ? 1290 : S.clock, n = nightOf(clock), day = S.phase === 'day', N = L.NODES, dpr = Math.min(window.devicePixelRatio || 1, 2), op = ctx.globalCompositeOperation;
  const zones = [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]];
  ctx.save(); ctx.fillStyle = texC.water; ctx.translate(ox, oy); ctx.scale(sc, sc); ctx.fillRect(-ox / sc, -oy / sc, cw / sc, ch / sc);
  // beach, then the lawn with an inked edge
  const lawn = g => () => { ctx.beginPath(); for (const [x, y, w, h] of zones) ctx.roundRect(x - g, y - g, w + 2 * g, h + 2 * g, 46 + g); };
  ctx.strokeStyle = rgba('#ffffff', .55); ctx.lineWidth = 3; ctx.setLineDash([10, 7]); lawn(34)(); ctx.stroke(); ctx.setLineDash([]);
  roughFill(lawn(26), texC.sand, '#c9a874', 1.2);
  roughFill(lawn(10), texC.grass, '#4f6b3a', 1.6);
  // pond and stream
  roughFill(() => { ctx.beginPath(); ctx.ellipse(150, 425, 104, 66, 0, 0, 7); }, texC.sand, '#c9a874', 1);
  roughFill(() => { ctx.beginPath(); ctx.ellipse(150, 425, 94, 57, 0, 0, 7); }, texC.water, '#3f7f88', 1.2);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const river = () => { ctx.beginPath(); ctx.moveTo(655, 300); ctx.bezierCurveTo(700, 190, 760, 280, 800, 250); ctx.bezierCurveTo(860, 210, 900, 290, 962, 270); };
  river(); ctx.strokeStyle = '#3f7f88'; ctx.lineWidth = 21; ctx.stroke(); river(); ctx.strokeStyle = texC.water; ctx.lineWidth = 17; ctx.stroke();
  // cobbled paths
  for (const [a, b] of texC.paths) line([[a.x, a.y], [b.x, b.y]], 17, '#8d6e4a');
  for (const [a, b] of texC.paths) line([[a.x, a.y], [b.x, b.y]], 13.5, texC.cobble);
  ctx.fillStyle = '#8d6e4a'; ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 38, 0, 7); ctx.fill(); ctx.fillStyle = texC.cobble; ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 35, 0, 7); ctx.fill();
  roughFill(() => { ctx.beginPath(); ctx.arc(N.P.x, N.P.y, 15, 0, 7); }, texC.water, PC.ink, .8);
  for (const k of ['W', 'N', 'E']) { ctx.fillStyle = '#8d6e4a'; ctx.beginPath(); ctx.arc(N[k].x, N[k].y, 18, 0, 7); ctx.fill(); ctx.fillStyle = texC.cobble; ctx.beginPath(); ctx.arc(N[k].x, N[k].y, 15.5, 0, 7); ctx.fill(); }
  line([[L.STORE.x, L.STORE.y], [L.YARD.x, L.YARD.y], [L.SHOP.x, L.SHOP.y + 10]], 3, rgba('#8d6e4a', .5), [5, 6]);
  for (const r of S.rides) if (r.sub) { const sb = L.ride(S, r.sub), off = L.subDown(S, sb); line([[sb.x, sb.y], [r.x, r.y]], 1.5, off ? rgba('#c8372b', .7) : rgba('#6b5a3a', .35), [3, 7]); }
  // flowers, trees
  for (const f of texC.flowers) { ctx.fillStyle = f.c; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(f.x + Math.cos(i * 2.4) * 4 * f.s, f.y + Math.sin(i * 2.4) * 3 * f.s, 1.6, 0, 7); ctx.fill(); } }
  for (const tr of texC.trees) { const s = tr.s * 9, blob = (k, dx, dy) => { ctx.beginPath(); ctx.arc(tr.x + dx - s * .45, tr.y + dy, s * .62 * k, 0, 7); ctx.arc(tr.x + dx + s * .45, tr.y + dy + s * .1, s * .58 * k, 0, 7); ctx.arc(tr.x + dx, tr.y + dy - s * .5, s * .66 * k, 0, 7); };
    ctx.fillStyle = 'rgba(60,50,30,.25)'; blob(1, 4, s * .5); ctx.fill(); ctx.fillStyle = '#3b4f2c'; blob(1.12, 0, 0); ctx.fill(); ctx.fillStyle = '#5c8a46'; blob(1, 0, 0); ctx.fill(); ctx.fillStyle = '#86b062'; blob(.55, -s * .25, -s * .3); ctx.fill(); }
  drawGuests(n, ID, ['#d9483b', '#f2b63c', '#3c9a8f', '#fbf3e1', '#7d5ba6', '#e78a52'], 2.4);
  // the gate: a striped arch
  { const gx = L.GATE.x, gy = L.GATE.y + 4, k = sc * dpr * 1.1; ctx.drawImage(sprite('gate', k, g => { g.fillStyle = PC.c1; g.fillRect(-27, -18, 7, 26); g.fillRect(20, -18, 7, 26); g.lineWidth = 5; g.strokeStyle = PC.canvas; g.beginPath(); g.arc(0, -16, 23.5, Math.PI, 0); g.stroke(); g.lineWidth = 5; g.strokeStyle = PC.c1; g.setLineDash([5, 5]); g.beginPath(); g.arc(0, -16, 23.5, Math.PI, 0); g.stroke(); g.setLineDash([]); for (let i = 0; i < 7; i++) { const a = Math.PI + (i + .5) * Math.PI / 7; lite(Math.cos(a) * 23.5, -16 + Math.sin(a) * 23.5, 2, PC.bulb); } }), gx - 42 * 1.1, gy - 52 * 1.1, 84 * 1.1, 84 * 1.1); }
  const lights = [], takeLights = (x, y, s, on, dim) => { if (on) for (const [lx, ly, r, col] of LIT) lights.push([x + lx * s, y + ly * s, r * s, col, dim || 1]); LIT.length = 0; };
  takeLights(L.GATE.x, L.GATE.y + 4, 1.1, true);
  // service buildings
  for (const [p, k, name, hot] of [[L.STORE, 'store', 'Stores'], [L.YARD, 'yard', 'Crew yard'], [L.SHOP, 'shop', 'Workshop', day && S.fab.length && L.onNow(S, 'mach')], [L.OFFICE, 'office', 'Office']]) {
    ctx.fillStyle = 'rgba(60,50,30,.25)'; ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + 16, 34, 7, 0, 0, 7); ctx.fill();
    ctx.drawImage(sprite('hut-' + k, sc * dpr, g => HUT[k](g, PC)), p.x - 42, p.y - 52, 84, 84); takeLights(p.x, p.y, 1, true, .6);
    if (hot) { ctx.strokeStyle = PC.c1; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.roundRect(p.x - 34, p.y - 26, 68, 46, 8); ctx.stroke(); ctx.setLineDash([]); }
  }
  // rides
  const AS = 1.18;
  for (const r of S.rides) {
    const st = rideSt(r), run = RUNOF[st], lit = st === 'ok' || st === 'degraded', x = r.x, y = r.y, ph = ridePh(r, t);
    ctx.fillStyle = 'rgba(60,50,30,.28)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 21, 32, 8, 0, 0, 7); ctx.fill();
    const img = sprite(r.id, sc * dpr * AS, g => ART[r.id](g, PC, ph, run));
    ctx.globalAlpha = lit || st === 'service' ? 1 : .7; ctx.drawImage(img, x - 42 * AS, y - 52 * AS, 84 * AS, 84 * AS); ctx.globalAlpha = 1;
    takeLights(x, y, AS, lit, st === 'degraded' ? .5 : 1);
  }
  // bunting over the main walks
  for (const [x0, y0, x1, y1] of texC.bunt) {
    const sag = 7, at = u => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag - 14];
    for (const [px, py] of [[x0, y0], [x1, y1]]) { ctx.strokeStyle = PC.ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 15); ctx.stroke(); ctx.strokeStyle = PC.canvas; ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.strokeStyle = PC.ink; ctx.lineWidth = 1; ctx.beginPath(); for (let u = 0; u <= 1.001; u += .1) { const [x, y] = at(u); u ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    for (let i = 0; i < 6; i++) { const u = (i + .5) / 6, [x, y] = at(u); ctx.fillStyle = [PC.c1, PC.canvas, PC.c2, PC.c3, PC.c1, PC.canvas][i]; ctx.strokeStyle = PC.ink; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x - 3.2, y); ctx.lineTo(x + 3.2, y); ctx.lineTo(x, y + 7); ctx.closePath(); ctx.fill(); ctx.stroke(); lights.push([x, y - .5, 1.6, PC.bulb, .8]); }
  }
  // dusk: a cool tint over the painting, then every light on top
  if (n > 0) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = mix('#ffe2bd', '#4d5294', Math.min(1, n * 1.1)); ctx.fillRect(-ox / sc, -oy / sc, cw / sc, ch / sc); ctx.globalCompositeOperation = op; }
  if (n > .15) {
    ctx.globalCompositeOperation = 'lighter';
    for (const r of S.rides) { const st = rideSt(r); if (st === 'ok' || st === 'degraded') glowAt(r.x, r.y + 4, 70, '#ffb05a', .28 * n); }
    for (const [x, y, r, col, dim] of lights) glowAt(x, y, r * (2.4 + n * 1.6), col, .85 * n * dim);
    ctx.globalCompositeOperation = op;
  }
  for (const [x, y, r] of lights) if (r <= 3) { ctx.fillStyle = n > .3 ? '#fff4d6' : PC.bulb; ctx.beginPath(); ctx.arc(x, y, .9, 0, 7); ctx.fill(); }
  for (const r of S.rides) {
    const st = rideSt(r);
    if (st === 'down' && !reduce) { ctx.globalCompositeOperation = n > .3 ? 'lighter' : 'source-over'; glowAt(r.x, r.y - 6, 50, '#ff5d4a', (.3 + .2 * Math.sin(t * 6)) * (n > .3 ? 1 : .6)); ctx.globalCompositeOperation = op; }
    rideInfo(r, t, r.x, r.y, { cy: -6, R: 37, ly: 63, qy: 40, track: rgba('#3b2a2a', .18), badgeLine: PC.ink, pill: { bg: 'rgba(251,243,225,.94)', line: rgba('#3b2a2a', .5) }, ink: PC.ink, offInk: '#7a6a6a', qCol: rgba('#3b2a2a', .7), selCol: PC.ink });
  }
  for (const [p, name] of [[L.STORE, 'Stores'], [L.YARD, 'Crew yard'], [L.SHOP, 'Workshop'], [L.OFFICE, 'Office'], [{ x: L.GATE.x, y: L.GATE.y + 4 }, 'Main gate']]) pillLabel(name, p.x, p.y + 33, PC.ink, { bg: 'rgba(251,243,225,.85)', line: rgba('#3b2a2a', .35) }, 'ok');
  drawCrew(t, frac, ID, { shadow: 'rgba(60,50,30,.3)', line: PC.ink });
  drawFxLayer(now, t, ID);
  ctx.restore();
  // paper grain over the whole picture
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .28; ctx.fillStyle = texC.grain; ctx.fillRect(0, 0, cw, ch); ctx.restore();
  const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .4, cw / 2, ch / 2, Math.max(cw, ch) * .75); vg.addColorStop(0, 'rgba(80,50,30,0)'); vg.addColorStop(1, rgba('#4a2e1e', .35)); ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
  if (ui.box) { const b = ui.box; ctx.fillStyle = 'rgba(60,120,180,.12)'; ctx.strokeStyle = '#2c74b8'; ctx.lineWidth = 1.5; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
}
