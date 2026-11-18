/* ---------- the map: "Lantern Glow", flat vector at night with a soft glow ----------
   Speed (the phone budget in tests/browser/perf.js):
   - The ground (land, water, paths, trees, buildings, lamp posts) is painted once per zoom level into two world-sized
     layers, day and night, with the night lights baked in. Each frame blends them by the time of day; panning is free.
   - Each ride's art, shadow and lights are painted into a sprite, repainted only when the zoom, the dusk level or
     whether it is lit changes. Ride names are cached the same way.
   - Rings, badges, people and guests are drawn live every frame: they are the game state.
   Everything here is visual only and never touches the saved game. */
const GA = { // day colour, night colour
  bg: ['#17364a', '#060a1e'], land: ['#2d6266', '#0e1636'], landHi: ['#3a7676', '#16225a'], rim: ['#5b9a92', '#27357a'],
  speck: ['#4a8a7c', '#1d2b66'], tree: ['#25594d', '#0d1838'], treeHi: ['#4c9478', '#20316c'],
  water: ['#2c8db0', '#0d2152'], waterHi: ['#58bde0', '#123068'], sheen: ['#a6e6f5', '#4366b4'], sand: ['#e9d5a6', '#34345f'],
  path: ['#ecd9ad', '#3a3a70'], pathEdge: ['#c2a372', '#22225a'], plaza: ['#f2e2bb', '#45437e'],
};
const ga = (k, n) => mix(GA[k][0], GA[k][1], n);
const hexOf = c => c[0] === '#' ? c : '#' + c.match(/\d+/g).slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join(''); // 'rgb(r,g,b)' to '#rrggbb'
const palA = n => ({
  ink: '#0d1230', metal: mix('#e3e6ef', '#a3abd0', n), metal2: mix('#aeb5c9', '#5d6696', n), c1: '#ff6b5a', c2: '#ffc75a', c3: '#4fd1c5', canvas: '#fff3dc',
  wall: mix('#43557e', '#262f62', n), roof: mix('#f2845a', '#a84f3c', n), win: '#ffd98a', water: mix('#5cc0e0', '#2a4c9a', n), water2: '#e2f7ff',
  wood: mix('#cf9052', '#8f5d3b', n), rock: mix('#86735f', '#3e3756', n), bulb: '#ffd27a', glass: mix('#c4ecff', '#ffe4a8', n), dark: '#11163a',
  beacon: '#fff0b0', smoke: '#eef0f6', hum: '#79c2ff',
});
const ZONES = [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]];
const RUNOF = { ok: 1, degraded: .4, down: 0, service: 0, nopower: 0, unstaffed: 0, signoff: 0, restart: 0, unchecked: 0, ready: 0 }; // a state missing here would stop the ride's phase being a number
const ART_SCALE = 1.2;
const rideSt = r => ui.title ? 'ok' : L.status(S, r);
const hashOf = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997; return h / 997; };
const dprNow = () => Math.min(window.devicePixelRatio || 1, 2);
const fontsReady = () => !document.fonts || document.fonts.status === 'loaded'; // cached text is repainted once the fonts arrive
const boost = () => clamp(.82 / sc, 1, 1.5); // rings, badges and markers grow when the map is small on screen (phones)
const labelPx = () => cw < 600 ? 15 : cw < 900 ? 14 : 13; // ride names, in screen pixels at the default zoom

/* glow sprites: one soft radial dot per colour */
const glowCache = {};
function glowSprite(col) {
  if (glowCache[col]) return glowCache[col];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(.35, rgba(col, .45)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (glowCache[col] = c);
}
function glowOn(g, x, y, rad, col, a) { if (a <= 0) return; g.globalAlpha = Math.min(1, a); g.drawImage(glowSprite(col), x - rad, y - rad, rad * 2, rad * 2); g.globalAlpha = 1; }
// the lights some art asked for: tiny bulbs always, glows when it is dark enough
function paintLights(g, s, n, on, dim) {
  const op = g.globalCompositeOperation;
  if (on && n > .15) { g.globalCompositeOperation = 'lighter'; for (const [x, y, r, col] of LIT) glowOn(g, x * s, y * s, r * s * (1.8 + n * .8), col, n * .9 * (dim || 1)); g.globalCompositeOperation = op; }
  let dots = null; for (const [x, y, r] of LIT) if (r <= 3) { if (!dots) { dots = new Path2D(); } dots.moveTo(x * s + .9 * s, y * s); dots.arc(x * s, y * s, .9 * s, 0, 7); }
  if (dots) { g.fillStyle = on ? (n > .3 ? '#fff4d6' : '#ffd27a') : 'rgba(40,40,60,.6)'; g.fill(dots); }
  LIT.length = 0;
}

/* the park's fixed scenery, worked out once: lamp posts along the paths, trees and grass clear of everything */
let scene = null;
function sceneOf() {
  if (scene) return scene;
  const N = L.NODES, paths = [[L.GATE, N.P], [N.P, N.W], [N.P, N.N], [N.P, N.E]].concat(S.rides.filter(r => r.via).map(r => [N[r.via], r])), lamps = [];
  for (const [a, b] of paths) { const d = Math.hypot(b.x - a.x, b.y - a.y), k = Math.floor(d / 56); for (let i = 1; i < k; i++) { const u = i / k, nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d, s = i % 2 ? 9.5 : -9.5; lamps.push([a.x + (b.x - a.x) * u + nx * s, a.y + (b.y - a.y) * u + ny * s]); } }
  let s = 99; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, specks = [];
  for (const [x, y, w, h] of ZONES) for (let i = 0; i < w * h / 520; i++) specks.push([x + 10 + rnd() * (w - 20), y + 10 + rnd() * (h - 20), rnd()]);
  const segD = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(p.x - a.x - u * dx, p.y - a.y - u * dy); };
  const trees = [];
  for (let k = 0; k < 2800 && trees.length < 70; k++) {
    const z = ZONES[Math.floor(rnd() * ZONES.length)], p = { x: z[0] + 14 + rnd() * (z[2] - 28), y: z[1] + 14 + rnd() * (z[3] - 28) };
    if (Math.hypot(p.x - 150, (p.y - 425) * 1.6) < 110 || S.rides.some(r => Math.hypot(p.x - r.x, p.y - r.y) < 62) || paths.some(([a, b]) => segD(p, a, b) < 18)) continue;
    if ([L.STORE, L.YARD, L.SHOP, L.OFFICE, L.GATE].some(q => Math.abs(p.x - q.x) < 52 && Math.abs(p.y - q.y) < 40) || trees.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)) continue;
    trees.push({ x: p.x, y: p.y, s: .7 + rnd() * .6 });
  }
  return (scene = { paths, lamps, specks, trees });
}

/* the ground, painted into a world-sized layer for one time of day (n = 0 day, 1 night) at k pixels per park unit */
const WB = { x: -90, y: -70, w: 1180, h: 820 };
function paintGround(g, n, k) {
  const sc0 = scene, N = L.NODES, P = palA(n);
  const ln = (pts, w, col, dash) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.lineWidth = w; g.strokeStyle = col; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); };
  g.fillStyle = ga('bg', n); g.fillRect(WB.x, WB.y, WB.w, WB.h);
  // the sea along the west edge
  g.fillStyle = ga('water', n); g.beginPath(); g.moveTo(-90, 100); g.bezierCurveTo(70, 140, 40, 340, -90, 400); g.fill();
  g.strokeStyle = rgba(GA.sheen[0], .5 - .25 * n); g.lineWidth = 2; g.beginPath(); g.moveTo(-40, 120); g.bezierCurveTo(52, 150, 26, 330, -40, 382); g.stroke();
  // land: a lit rim joining the lawns, then the lawns with a soft top light, then grass
  g.fillStyle = ga('rim', n); for (const [x, y, w, h] of ZONES) { g.beginPath(); g.roundRect(x - 13, y - 13, w + 26, h + 26, 58); g.fill(); }
  const lg = g.createLinearGradient(0, 30, 0, 660); lg.addColorStop(0, ga('landHi', n)); lg.addColorStop(1, ga('land', n)); g.fillStyle = lg; // the lawns overlap, so only the outer edge shows a rim
  for (const [x, y, w, h] of ZONES) { g.beginPath(); g.roundRect(x - 10, y - 10, w + 20, h + 20, 55); g.fill(); }
  g.fillStyle = ga('speck', n); for (const [x, y, q] of sc0.specks) { g.globalAlpha = .35 + q * .4; g.fillRect(x, y, 2.2, 1.2); } g.globalAlpha = 1;
  // pond and stream
  g.fillStyle = ga('sand', n); g.beginPath(); g.ellipse(150, 425, 102, 64, 0, 0, 7); g.fill();
  const wg = g.createLinearGradient(0, 360, 0, 490); wg.addColorStop(0, ga('waterHi', n)); wg.addColorStop(1, ga('water', n)); g.fillStyle = wg; g.beginPath(); g.ellipse(150, 425, 96, 58, 0, 0, 7); g.fill();
  g.strokeStyle = rgba(GA.sheen[0], .55 - .3 * n); g.lineWidth = 1.5; for (const [x, y, w] of [[110, 405, 30], [170, 440, 22], [150, 470, 18]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 4, x + w, y); g.stroke(); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  const river = () => { g.beginPath(); g.moveTo(655, 300); g.bezierCurveTo(700, 190, 760, 280, 800, 250); g.bezierCurveTo(860, 210, 900, 290, 962, 270); };
  river(); g.strokeStyle = ga('sand', n); g.lineWidth = 22; g.stroke(); river(); g.strokeStyle = ga('water', n); g.lineWidth = 16; g.stroke();
  river(); g.strokeStyle = rgba(GA.sheen[0], .4 - .2 * n); g.lineWidth = 2; g.setLineDash([10, 16]); g.stroke(); g.setLineDash([]);
  // paths and plazas
  for (const [a, b] of sc0.paths) ln([[a.x, a.y], [b.x, b.y]], 16, ga('pathEdge', n));
  for (const [a, b] of sc0.paths) ln([[a.x, a.y], [b.x, b.y]], 11, ga('path', n));
  g.fillStyle = ga('pathEdge', n); g.beginPath(); g.arc(N.P.x, N.P.y, 36, 0, 7); g.fill(); g.fillStyle = ga('plaza', n); g.beginPath(); g.arc(N.P.x, N.P.y, 32, 0, 7); g.fill();
  g.strokeStyle = ga('pathEdge', n); g.lineWidth = 1.5; g.beginPath(); g.arc(N.P.x, N.P.y, 22, 0, 7); g.stroke(); g.fillStyle = ga('rim', n); g.beginPath(); g.arc(N.P.x, N.P.y, 12, 0, 7); g.fill();
  for (const q of ['W', 'N', 'E']) { g.fillStyle = ga('pathEdge', n); g.beginPath(); g.arc(N[q].x, N[q].y, 17, 0, 7); g.fill(); g.fillStyle = ga('path', n); g.beginPath(); g.arc(N[q].x, N[q].y, 14, 0, 7); g.fill(); }
  ln([[L.STORE.x, L.STORE.y], [L.YARD.x, L.YARD.y], [L.SHOP.x, L.SHOP.y + 10]], 4, rgba('#d8bf8c', .25), [6, 6]);
  // the main gate
  const gx = L.GATE.x, gy = L.GATE.y + 6;
  g.strokeStyle = P.metal; g.lineWidth = 3; g.beginPath(); g.arc(gx, gy - 6, 24, Math.PI, 0); g.stroke();
  g.fillStyle = P.roof; g.fillRect(gx - 28, gy - 8, 7, 16); g.fillRect(gx + 21, gy - 8, 7, 16);
  for (let i = 0; i < 7; i++) { const a = Math.PI + (i + .5) * Math.PI / 7; lite(Math.cos(a) * 24, -6 + Math.sin(a) * 24, 2, '#ffd27a'); }
  g.save(); g.translate(gx, gy); paintLights(g, 1, n, true); g.restore();
  // service buildings
  for (const [p, key] of [[L.STORE, 'store'], [L.YARD, 'yard'], [L.SHOP, 'shop'], [L.OFFICE, 'office']]) {
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(p.x + 4, p.y + 15, 34, 7, 0, 0, 7); g.fill();
    g.save(); g.translate(p.x, p.y); HUT[key](g, P); paintLights(g, 1, n, true, .6); g.restore();
  }
  // trees
  for (const tr of sc0.trees) { const s = tr.s * 9; g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(tr.x + 3, tr.y + s * .8, s, s * .45, 0, 0, 7); g.fill(); g.fillStyle = ga('tree', n); g.beginPath(); g.arc(tr.x, tr.y, s, 0, 7); g.fill(); g.fillStyle = ga('treeHi', n); g.beginPath(); g.arc(tr.x - s * .3, tr.y - s * .3, s * .55, 0, 7); g.fill(); }
  // lamp posts, and their pools of light after dark
  g.fillStyle = n > .3 ? '#fff1cf' : P.metal2; for (const [x, y] of sc0.lamps) { g.beginPath(); g.arc(x, y, 1.7, 0, 7); g.fill(); }
  if (n > .15) { g.globalCompositeOperation = 'lighter'; for (const [x, y] of sc0.lamps) glowOn(g, x, y, 30, '#ffc070', .5 * n); g.globalCompositeOperation = 'source-over'; }
  // after dark every lit ride throws a pool of warm light on the ground (a ride that is not lit covers its pool: see draw)
  if (n > .15) { g.globalCompositeOperation = 'lighter'; for (const r of S.rides) glowOn(g, r.x, r.y + 6, 78, '#ffb347', .32 * n); g.globalCompositeOperation = 'source-over'; }
  // building names (sized for the zoom this layer is painted at)
  const fs = Math.max(12, labelPx() * .9 / sc);
  g.font = `600 ${fs}px "Familjen Grotesk", system-ui, sans-serif`; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = fs * .32; g.strokeStyle = 'rgba(8,11,32,.9)'; g.fillStyle = rgba('#f7edd8', .85);
  for (const [txt, x, y] of [['Main gate', gx, gy + 26], ['Stores', L.STORE.x, L.STORE.y + 32], ['Crew yard', L.YARD.x, L.YARD.y + 32], ['Workshop', L.SHOP.x, L.SHOP.y + 32], ['Office', L.OFFICE.x, L.OFFICE.y + 32]]) { g.strokeText(txt, x, y + fs * .3); g.fillText(txt, x, y + fs * .3); }
}
const groundLayers = { k: 0, built: 0, day: null, night: null, gen: 0 };
function groundLayer(which, k) {
  const L0 = groundLayers;
  const c = L0[which] || (L0[which] = document.createElement('canvas')), w = Math.ceil(WB.w * k), h = Math.ceil(WB.h * k);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, -WB.x * k, -WB.y * k); paintGround(g, which === 'night' ? 1 : 0, k);
  return c;
}
/* the hour before dusk: if a zoom has thrown the night layer away, it is painted again a quarter at a time over four frames,
   so dusk does not open with a stall (on a slow phone the whole layer at once takes several frames' worth of time) */
const ONE = (() => { const c = document.createElement('canvas'); c.width = c.height = 1; return c.getContext('2d'); })();
function nightBand(G) {
  const k = G.k, P = G.pre || (G.pre = { band: 0 }), B = 4, w = Math.ceil(WB.w * k), h = Math.ceil(WB.h * k);
  const c = G.night || (G.night = document.createElement('canvas')); if (P.band === 0 && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; }
  const g = c.getContext('2d'), y0 = Math.floor(h * P.band / B), y1 = Math.floor(h * (P.band + 1) / B);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(0, y0, w, y1 - y0); g.clip();
  g.setTransform(k, 0, 0, k, -WB.x * k, -WB.y * k); paintGround(g, 1, k); g.restore();
  ONE.drawImage(c, 0, y0, 1, 1, 0, 0, 1, 1); // the browser paints a canvas only when it is next used: use one pixel of it now, so this band is painted now
  if (++P.band === B) { G.nightK = k; G.pre = null; }
}
/* the ground the player sees: the day and night layers blended for the time of day, with the light of the hour (dawn, golden
   hour, dusk, a squall) laid over it.
   - In full day or full night with no tint, the layer itself is drawn: nothing to compose.
   - While the light changes, the blend is composed into one image, but only for the part of the park on screen (plus a
     margin for panning and shake): on a phone that is about half the park. It is recomposed when the light has changed,
     at most every 0.6 s, and less often on a phone that is struggling (adaptive quality), or at once when the view moves
     past the margin. */
const groundNow = { c: null, key: '', r: null }, mapLabels = [];
function drawGround(n, now, tint) {
  const k = Math.min(2.2, sc * dprNow()), G = groundLayers, ch0 = Math.abs(k / (G.k || k) - 1);
  // repaint on a real zoom change (at most 5 times a second while pinching) or once the fonts arrive
  if (!G.k || G.fonts !== fontsReady() || (ch0 > .02 && (now - G.built > 200 || ch0 > .3))) { sceneOf(); G.k = k; G.built = now; G.fonts = fontsReady(); G.dayK = G.nightK = 0; G.pre = null; }
  const need = n < 1 ? ['day'] : []; if (n > 0) need.push('night');
  for (const w of need) if (G[w + 'K'] !== G.k) { groundLayer(w, G.k); G[w + 'K'] = G.k; G.pre = null; }
  if (n === 0 && !ui.title && S.phase === 'day' && S.clock >= 1020 && S.clock < 1080 && G.nightK !== G.k && now - G.built > 1000) nightBand(G);
  const nq = Math.round(n * 48) / 48, ta = tint ? Math.round(tint[1] * 30) / 30 : 0, C = groundNow, d = dprNow();
  const s = sc * d / G.k, bx = (ox + WB.x * sc) * d, by = (oy + WB.y * sc) * d; // layer pixels to screen pixels, and where the layer's corner lands
  const fill = (img, x0, y0) => { // the sea and sky outside the park, unless the image covers the whole map
    const ix = bx + x0 * s, iy = by + y0 * s;
    if (!(Math.abs(s - 1) < 1e-6 && Math.round(ix) <= 0 && Math.round(iy) <= 0 && Math.round(ix) + img.width >= cv.width && Math.round(iy) + img.height >= cv.height)) { ctx.fillStyle = C.bg; ctx.fillRect(0, 0, cw, ch); }
  };
  if (!(nq > 0 && nq < 1) && !(ta > 0)) { // plain day or night
    const lay = nq >= 1 ? G.night : G.day; C.key = ''; C.r = C.vis = null; C.bg = ga('bg', nq); // the next change of light composes afresh
    fill(lay, 0, 0); blitWorld(lay, WB.x, WB.y, WB.w, WB.h, G.k);
  } else {
    const lw = G[need[0]].width, lh = G[need[0]].height, cl = (v, m) => Math.max(0, Math.min(m, v));
    const vx0 = cl(Math.floor(-bx / s), lw), vy0 = cl(Math.floor(-by / s), lh), vx1 = cl(Math.ceil((cv.width - bx) / s), lw), vy1 = cl(Math.ceil((cv.height - by) / s), lh);
    const key = [G.k, nq, tint ? tint[0] : '', ta, G.dayK, G.nightK].join('|'), layersKey = [G.k, G.dayK, G.nightK].join('|'), r = C.r;
    C.vis = [vx0, vy0, vx1, vy1]; // what is on screen, in layer pixels (the tests check the composed part covers it)
    const inside = C.c && r && C.layers === layersKey && vx0 >= r[0] && vy0 >= r[1] && vx1 <= r[2] && vy1 <= r[3];
    const every = Math.min(1500, 600 / Math.max(.4, QUAL.q)); // light changes: every 0.6 s, up to 1.5 s on a struggling phone
    if (vx1 > vx0 && vy1 > vy0 && (!inside || (C.key !== key && now - (C.at || 0) > every))) {
      const mx = Math.max(48, Math.round((vx1 - vx0) * .125)), my = Math.max(48, Math.round((vy1 - vy0) * .125)), q = 32; // the margin, and a grid so a small pan reuses the image
      const x0 = cl(Math.floor((vx0 - mx) / q) * q, lw), y0 = cl(Math.floor((vy0 - my) / q) * q, lh), x1 = cl(Math.ceil((vx1 + mx) / q) * q, lw), y1 = cl(Math.ceil((vy1 + my) / q) * q, lh), w = x1 - x0, h = y1 - y0;
      const c = C.c || (C.c = document.createElement('canvas')); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      // whole layers drawn at an offset (the canvas clips them): cheaper than copying a part of a layer, which costs extra
      if (nq < 1) g.drawImage(G.day, -x0, -y0); if (nq > 0) { g.globalAlpha = nq < 1 ? nq : 1; g.drawImage(G.night, -x0, -y0); g.globalAlpha = 1; }
      if (ta > 0) { g.fillStyle = rgba(tint[0], ta); g.fillRect(0, 0, w, h); }
      C.r = [x0, y0, x1, y1]; C.at = now; C.key = key; C.layers = layersKey;
      C.bg = ta > 0 ? mix(hexOf(ga('bg', nq)), tint[0], ta) : ga('bg', nq); // the sea and sky outside the park, in the same light
    }
    if (C.r && C.layers === layersKey) { const [x0, y0, x1, y1] = C.r; fill(C.c, x0, y0); blitWorld(C.c, WB.x + x0 / G.k, WB.y + y0 / G.k, (x1 - x0) / G.k, (y1 - y0) / G.k, G.k); }
    else { ctx.fillStyle = C.bg || ga('bg', nq); ctx.fillRect(0, 0, cw, ch); } // the park is off screen
  }
  ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
}
/* draw a cached image of the park box (wx, wy, ww, wh) painted at k pixels per unit. When k matches the current zoom it is
   copied to whole device pixels, which is far cheaper than resampling it; otherwise (mid-pinch) it is scaled. */
function blitWorld(img, wx, wy, ww, wh, k) {
  const d = dprNow();
  if (Math.abs(k - sc * d) < 1e-6) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(img, Math.round((ox + wx * sc) * d), Math.round((oy + wy * sc) * d)); ctx.restore(); }
  else { ctx.save(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.translate(ox, oy); ctx.scale(sc, sc); ctx.drawImage(img, wx, wy, ww, wh); ctx.restore(); }
}

/* ride sprites: the parts of a ride that never move (base, with its shadow and lights) and anything drawn over the
   moving parts (top), painted at the current zoom and repainted only when the zoom, the dusk level or being lit changes */
const SPR_BOX = { x: -55, y: -66, w: 110, h: 110 }; // in park units around the ride's point
const sprites = {};
let spriteBudget = 0; // ride images that may be repainted this frame: at dusk all of them change together, so the work is spread over a few frames
const palCache = {};
const palOf = n => { const nb = Math.round(n * 16); return palCache[nb] || (palCache[nb] = palA(nb / 16)); };
function rideSprite(r, n, st, part) {
  const a = ART[r.id]; if (part === 'top' && !a.top) return null;
  const k = sc * dprNow(), nb = Math.round(n * 16), on = st === 'ok' || st === 'degraded', lm = on ? (st === 'degraded' ? 'dim' : 'on') : 'off', id = r.id + part;
  let s = sprites[id];
  const key = nb + lm + (st === 'service') + fontsReady();
  if (s && s.key === key && Math.abs(k / s.k - 1) < .12) return s;
  if (s && Math.abs(k / s.k - 1) < .12 && spriteBudget <= 0) return s; // over this frame's repaint budget: keep the last look a moment longer
  spriteBudget--;
  if (!s) s = sprites[id] = { c: document.createElement('canvas'), k: 0, key: '' };
  const w = Math.ceil(SPR_BOX.w * k), h = Math.ceil(SPR_BOX.h * k);
  if (s.c.width !== w || s.c.height !== h) { s.c.width = w; s.c.height = h; } else s.c.getContext('2d').clearRect(0, 0, w, h);
  const g = s.c.getContext('2d'), P = palOf(n);
  g.setTransform(k, 0, 0, k, -SPR_BOX.x * k, -SPR_BOX.y * k);
  if (part === 'base') { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(3, 22, 32, 7, 0, 0, 7); g.fill(); }
  g.save(); g.scale(ART_SCALE, ART_SCALE); g.lineCap = 'round'; g.lineJoin = 'round';
  a[part](g, P); g.restore(); paintLights(g, ART_SCALE, nb / 16, on, lm === 'dim' ? .5 : 1);
  if (lm === 'off' && st !== 'service') { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(8,11,32,.45)'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; } // a stopped ride is dimmed, not see-through
  s.k = k; s.key = key;
  return s;
}
/* each ride is one image: the cached base, the moving parts at their current phase, the cached top and the lights.
   It is repainted at the ride's own pace (coaster trains every frame, the slow wheel every third), staggered across rides,
   so a frame copies 14 images instead of drawing every moving part. */
const frames = {}; let frameNo = 0;
const RIDE_EVERY = { tide: 1, night: 1, mine: 1, light: 2, flume: 2, boats: 2, carou: 2, wheel: 3, gond: 3, arcade: 4, food: 4, play: 4, wsub: 6, esub: 6 };
function rideFrame(r, n, st, idx) {
  const base = rideSprite(r, n, st, 'base'), top = rideSprite(r, n, st, 'top'), v = VIS.ride[r.id], ph = v ? v.ph : hashOf(r.id), rock = st === 'down' && r.job && r.job.rescue && !reduce;
  const f = frames[r.id] || (frames[r.id] = { c: document.createElement('canvas'), key: '', ph: NaN, k: 0 });
  const key = base.key + base.k + (top ? top.key : '') + st, due = (frameNo + idx) % (RIDE_EVERY[r.id] || 3) === 0;
  if (f.key === key && !(due && (f.ph !== ph || rock))) return f;
  const c = f.c; if (c.width !== base.c.width || c.height !== base.c.height) { c.width = base.c.width; c.height = base.c.height; }
  const g = c.getContext('2d'), k = base.k, on = st === 'ok' || st === 'degraded', shown = on || st === 'service';
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.drawImage(base.c, 0, 0);
  g.setTransform(k, 0, 0, k, -SPR_BOX.x * k, -SPR_BOX.y * k);
  if (rock) { g.translate(0, -6); g.rotate(Math.sin((VIS.vt || 0) * 2.6 + ph * 6) * .035); g.translate(0, 6); } // stuck with guests on: it rocks
  g.save(); g.scale(ART_SCALE, ART_SCALE); g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = shown ? 1 : .7; ART[r.id].move(g, palOf(n), ph, RUNOF[st] || 0); g.restore();
  paintLights(g, ART_SCALE, n, on, st === 'degraded' ? .5 : 1);
  if (top) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(top.c, 0, 0); }
  f.key = key; f.ph = ph; f.k = k;
  return f;
}
function drawRide(r, n, st, idx) { const f = rideFrame(r, n, st, idx); blitWorld(f.c, r.x + SPR_BOX.x, r.y + SPR_BOX.y, SPR_BOX.w, SPR_BOX.h, f.k); }

/* ride names: a pill, with a status word when the ride is not running (so colour is never the only signal) */
const STWORD = { degraded: '½ SPEED', down: 'CLOSED', service: 'SERVICE', nopower: 'NO POWER', unstaffed: 'NO CREW', signoff: 'TO SIGN', signme: 'SIGN NOW', restart: 'RESTART', unchecked: 'NOT CHECKED' };
const pills = {};
function namePill(r, st) {
  const fs = Math.max(12.5, labelPx() / sc), k = sc * dprNow(), word = ui.title ? '' : STWORD[st] || '', key = `${fs.toFixed(2)}|${k.toFixed(3)}|${word}|${st === 'nopower'}|${fontsReady()}`;
  const p = pills[r.id]; if (p && p.key === key) return p;
  const c = (p && p.c) || document.createElement('canvas'), g = c.getContext('2d'), wf = `800 ${fs * .7}px "Familjen Grotesk", system-ui, sans-serif`, nf = `700 ${fs}px "Familjen Grotesk", system-ui, sans-serif`;
  g.font = wf; const ww = word ? g.measureText(word).width + fs * .8 : 0; g.font = nf; const nw = g.measureText(r.short).width;
  const W = nw + fs * 1.1 + (word ? ww + fs * .35 : 0), Hh = fs * 1.5;
  c.width = Math.ceil(W * k) + 2; c.height = Math.ceil(Hh * k) + 2; g.setTransform(k, 0, 0, k, k, k);
  g.fillStyle = 'rgba(8,11,32,.84)'; g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1 / k * 1.5; g.beginPath(); g.roundRect(0, 0, W, Hh, Hh / 2); g.fill(); g.stroke();
  let x = fs * .55;
  if (word) { g.fillStyle = st === 'nopower' || st === 'unstaffed' ? '#b7b9d2' : SCOL[st]; g.beginPath(); g.roundRect(x - fs * .2, Hh * .2, ww, Hh * .6, Hh * .3); g.fill(); g.fillStyle = '#16122b'; g.font = wf; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(word, x + fs * .2, Hh / 2 + fs * .03); x += ww + fs * .35; }
  g.font = nf; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = st === 'nopower' ? '#c3c5dc' : '#f7edd8'; g.fillText(r.short, x, Hh / 2 + fs * .04);
  return (pills[r.id] = { c, key, k, w: c.width / k, h: c.height / k });
}

/* rings and badges round a ride: large, with a dark edge so they read on light paths, dark grass and bright glows */
function ringOn(g, x, y, R, a0, a1, w, col, edge) {
  g.beginPath(); g.arc(x, y, R, a0, a1);
  if (edge !== false) { g.strokeStyle = 'rgba(5,7,22,.88)'; g.lineWidth = w + 3.2; g.stroke(); }
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
}
const ring = (...a) => ringOn(ctx, ...a);
/* the rings and badges that change only now and then (health, work progress, the Lantern Hour ring, selection, badges)
   are cached per ride and repainted when one of them changes; the ones that pulse or drain are drawn live */
const infos = {};
function badgesOf(r) {
  const j = r.job, out = [];
  if (j && j.type === 'fault') { out.push([j.trade[0].toUpperCase(), TC[j.trade]]); if (j.mode === 'full' && j.part && j.ps === 'none' && S.stock[j.part] < 1) out.push(['?', '#b79cf5']); }
  if (j && j.rescue) out.push(['!', '#ff5d4a']);
  if (r.warnAt) out.push(['!', '#ffb347']);
  if (r.patched) out.push(['P', '#f7edd8']);
  if (S.prio === r.id) out.push(['R', '#ffb347']);
  if (r.vouch > S.clock) out.push(['V', '#8fe8c4']);
  if (r.fl > S.clock) out.push(['F', '#ffd27a']);
  if (r.svcReq && !j) out.push(['S', '#79c2ff']);
  return out;
}
function infoSprite(r, b) {
  const j = ui.title ? null : r.job, R = 37, top = -Math.PI / 2, lhNow = !ui.title && S.phase === 'day' && S.clock > L.LH, k = sc * dprNow();
  const prog = j && j.prog > 0 ? Math.round(clamp(j.prog / L.need(j), 0, 1) * 72) : -1, lh = prog < 0 && lhNow && r.sub ? Math.round(clamp(r.lh / L.LIT_MIN, 0, 1) * 45) : -1;
  const bl = ui.title ? [] : badgesOf(r), key = [ui.title ? -1 : Math.round(r.health), prog, lh, ui.sel === r.id, bl.map(x => x[0] + x[1]).join(''), b.toFixed(3), k.toFixed(4), fontsReady()].join('|');
  let s = infos[r.id]; if (s && s.key === key) return s;
  const x0 = -(R + 16 * b), x1 = Math.max(R + 16 * b, (R + 2) * .72 + bl.length * 24 * b + 2), y0 = -(R + 16 * b), y1 = R + 16 * b; // only as wide as its badges need: blitting empty pixels costs
  if (!s) s = infos[r.id] = { c: document.createElement('canvas') };
  const c = s.c, w = Math.ceil((x1 - x0) * k), h = Math.ceil((y1 - y0) * k); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } else c.getContext('2d').clearRect(0, 0, w, h);
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); g.lineCap = 'butt';
  if (ui.sel === r.id) { g.setLineDash([5, 5]); ringOn(g, 0, 0, R + 11 * b, 0, 7, 2.2 * b, '#f7edd8'); g.setLineDash([]); }
  if (!ui.title) {
    const hc = r.health >= 60 ? '#5fd6a8' : r.health >= 35 ? '#ffb347' : '#ff5d4a';
    ringOn(g, 0, 0, R, 0, 7, 4 * b, 'rgba(247,237,216,.16)');
    g.lineCap = 'round'; ringOn(g, 0, 0, R, top, top + Math.max(.02, Math.round(r.health) / 100) * TAU, 4 * b, hc, false); g.lineCap = 'butt';
    if (prog >= 0) ringOn(g, 0, 0, R + 6 * b, top, top + prog / 72 * TAU, 4.5 * b, '#79c2ff');
    else if (lh >= 0) ringOn(g, 0, 0, R + 6 * b, top, top + lh / 45 * TAU, 3.5 * b, '#ffd27a');
  }
  const br = 11 * b; let bx = (R + 2) * .72; const by = -(R + 2) * .72;
  for (const [txt, bg] of bl) { g.fillStyle = bg; g.strokeStyle = '#05071a'; g.lineWidth = 2.6 * b; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#16122b'; g.font = `800 ${12.5 * b}px "Familjen Grotesk", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, bx, by + .5 * b); bx += br * 2 + 2 * b; }
  Object.assign(s, { key, k, x0, y0, w: x1 - x0, h: y1 - y0 });
  return s;
}
function rideInfo(r, t, st, names) {
  const j = ui.title ? null : r.job, b = boost(), cx = r.x, cy = r.y - 6, R = 37, top = -Math.PI / 2;
  const inf = infoSprite(r, b); blitWorld(inf.c, cx + inf.x0, cy + inf.y0, inf.w, inf.h, inf.k);
  ctx.lineCap = 'butt';
  const armed = j && j.type === 'fault' && selUnits().some(c => c.skills[j.trade] || j.rescue);
  if (armed && !reduce) ring(cx, cy, R + 8 * b, 0, 7, 2.2 * b, rgba('#79c2ff', .5 + .4 * Math.sin(t * 5)), false);
  if (j && j.type === 'fault' && (j.rescue || (j.esc && j.sev === 'minor'))) { // countdown: red for stuck guests, amber for a fault about to get worse
    const due = j.rescue || j.esc, span = j.rescue ? 30 : Math.max(1, j.esc - j.t0), f = clamp((due - S.clock) / span, 0, 1), urgent = !!j.rescue;
    ring(cx, cy, R + (urgent ? 13 : 11) * b, top, top + f * TAU, (urgent ? 5.5 : 4) * b, urgent ? rgba('#ff5d4a', reduce ? 1 : .7 + .3 * Math.sin(t * 9)) : '#ffb347');
  }
  if (j && j.type === 'fault' && !j.first && S.clock - j.t0 <= L.FAST) {
    // the fast-response window: a blue ring that drains. It beats faster as the window closes, sends out a sonar ping,
    // and turns white-hot in its last quarter. Reduced motion: a steady ring.
    const f = clamp((L.FAST - (S.clock - j.t0)) / L.FAST, 0, 1), rr = R + 19 * b, hz = 1.2 + 2.8 * (1 - f), beat = reduce ? 0 : Math.max(0, Math.sin(t * hz * TAU));
    const col = f < .25 ? '#e6f6ff' : '#79c2ff';
    if (!reduce) { const per = 1.3 - .7 * (1 - f), q = (t % per) / per; ring(cx, cy, rr + q * 18 * b, 0, 7, 2.5 * b * (1 - q), rgba('#79c2ff', .55 * (1 - q)), false); }
    ring(cx, cy, rr, top, top + f * TAU, 5 * b, rgba(col, reduce ? 1 : .75 + .25 * beat));
    const bx = cx - rr * .72, by = cy - rr * .72, bs = b * (1 + .14 * beat);
    ctx.fillStyle = '#0a0e2a'; ctx.strokeStyle = col; ctx.lineWidth = 2 * b; ctx.beginPath(); ctx.arc(bx, by, 10.5 * bs, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = f < .25 ? '#ffffff' : '#bfe3ff'; ctx.save(); ctx.translate(bx, by); ctx.scale(bs * 1.1, bs * 1.1); ctx.beginPath(); ctx.moveTo(1.5, -7); ctx.lineTo(-4.5, 1); ctx.lineTo(-.5, 1); ctx.lineTo(-1.5, 7); ctx.lineTo(4.5, -1.5); ctx.lineTo(.5, -1.5); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  if (ui.coachRide === r.id && !reduce) { ctx.setLineDash([6, 6]); ring(cx, cy, R + 26 * b, 0, 7, 3 * b, rgba('#ffb347', .55 + .45 * Math.sin(t * 7)), false); ctx.setLineDash([]); }
  ctx.lineCap = 'round';
  if (r.sub && !ui.title && r.q > 1) { const q = Math.min(9, Math.ceil(r.q / (r.cap * S.qtol) * 9)); ctx.fillStyle = r.jam ? '#ff5d4a' : rgba('#f7edd8', .8); ctx.beginPath(); for (let i = 0; i < q; i++) { const qx = cx - (q - 1) * 3 * b + i * 6 * b, qy = r.y + 37 + 3 * b; ctx.moveTo(qx + 2 * b, qy); ctx.arc(qx, qy, 2 * b, 0, 7); } ctx.fill(); }
  const p = namePill(r, st === 'signoff' && soMine(r) ? 'signme' : st), ly = r.y + 33 + 21.5 * b + p.h / 2; names.push(() => blitWorld(p.c, cx - p.w / 2, ly - p.h / 2, p.w, p.h, p.k));
  if (st === 'signoff' && !ui.title) { const lost = L.hourly(S, r); if (lost > 0) names.push(() => label(`−${fmtMoney(lost)}/h`, cx, ly + p.h / 2 + 8, 10.5, '#ffd27a', 700)); } // what the wait is costing
  mapLabels.push({ id: r.id, x: ox + (cx - p.w / 2) * sc, y: oy + (ly - p.h / 2) * sc, w: p.w * sc, h: p.h * sc }); // where each name is on screen (for the layout test)
  if (ui.title) return;
  const vip = S.events.find(e => e.k === 'vip' && !e.done && e.ride === r.id && e.warned);
  if (vip) { const vw = 58 * b, vh = 19 * b, vx = cx - R - vw * .7, vy = cy - R - 4; ctx.fillStyle = '#ffd27a'; ctx.strokeStyle = '#05071a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(vx, vy, vw, vh, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2a1700'; ctx.font = `700 ${10.5 * b}px "Familjen Grotesk", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('VIP ' + fmtClock(vip.at), vx + vw / 2, vy + vh * .7); }
}

/* guests: one fill per colour */
const GUESTC = [['#fff3dc', '#ffd9a0'], ['#ff9a8c', '#ffc98a'], ['#9fd4ff', '#cfe8ff'], ['#ffd27a', '#ffe9c4'], ['#b6e388', '#ffd9a0']];
function drawGuests(n) {
  const night = n > .5, rad = 2.3, groups = GUESTC.map(() => new Path2D()), sad = new Path2D();
  for (const g of guests) {
    if (g.wait > 0) continue;
    if (g.ci == null) g.ci = Math.floor(Math.random() * GUESTC.length); // a guest keeps their colour (visual only)
    const p = g.sad ? sad : groups[g.ci]; p.moveTo(g.x + rad, g.y); p.arc(g.x, g.y, rad, 0, 7);
  }
  GUESTC.forEach((c, i) => { ctx.fillStyle = c[night ? 1 : 0]; ctx.fill(groups[i]); });
  ctx.fillStyle = '#ff8f7f'; ctx.fill(sad);
}

function draw(now, frac) {
  const t = now / 1000, clock = ui.title ? 1290 : S.clock, n = nightOf(clock), day = S.phase === 'day', op = ctx.globalCompositeOperation;
  // the living park moves with the park clock: still when paused, faster at 2x; the title screen idles at 1x
  const dt = VIS.last ? Math.min(.1, Math.max(0, (now - VIS.last) / 1000)) : 0, pm = VIS.run ? dt * TPS * S.speed : ui.title ? dt * TPS : 0, w = weatherNow();
  qualityTick(dt * 1000);
  VIS.last = now; if (pm > 0) VIS.vt = (VIS.vt || 0) + dt;
  // hard caps on everything that can pile up (a long squall, a fast season at 2x): the oldest go first
  for (const [arr, cap] of [[lanterns, 160], [pops, 24], [pings, 24], [FEEL.bursts, 24]]) if (arr.length > cap) arr.splice(0, arr.length - cap);
  lifeStep(pm > 0 ? dt : 0, pm, n, w.wind);
  const sh = shakeNow(now); if (sh) { ox += sh[0]; oy += sh[1]; } // a breakdown jolts the map (only the drawing: clicks use the steady view)
  drawGround(n, now, skyTint(clock, w)); // leaves the park transform on
  if (day && S.fab.length && L.onNow(S, 'mach')) { ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(L.SHOP.x - 34, L.SHOP.y - 24, 68, 42, 8); ctx.stroke(); }
  for (const r of S.rides) if (r.sub) { const sb = L.ride(S, r.sub), off = L.subDown(S, sb); line([[sb.x, sb.y], [r.x, r.y]], 1.5, off ? rgba('#ff5d4a', .6) : rgba('#f4d35e', .1 + .1 * n), [3, 9]); }
  drawGuests(n); drawQueues(n);
  // rides: a pool of light when lit after dark, a red pulse when closed by a fault, then the art
  if (n > .15) for (const r of S.rides) { const st = rideSt(r); if (!(st === 'ok' || st === 'degraded')) glowOn(ctx, r.x, r.y + 6, 70, '#0b1230', .6 * n); } // a ride that is not lit has no pool of light
  ctx.globalCompositeOperation = 'lighter';
  for (const r of S.rides) {
    const st = rideSt(r);
    if (st === 'down') glowOn(ctx, r.x, r.y - 4, 54, '#ff5d4a', reduce ? .45 : .4 + .25 * Math.sin(t * 6));
  }
  ctx.globalCompositeOperation = op;
  frameNo++; spriteBudget = 4; S.rides.forEach((r, i) => drawRide(r, n, rideSt(r), i));
  for (const r of S.rides) staticFault(r, rideSt(r), t);
  drawParts();
  drawWeather(w, VIS.vt || 0); // rain and wind under the game's information: names, rings, badges and people stay crisp in a squall

  const names = []; mapLabels.length = 0; for (const r of S.rides) rideInfo(r, t, rideSt(r), names); for (const f of names) f();
  drawBursts(now);
  drawCrew(t, frac, pm > 0 ? dt : 0);
  for (let i = pings.length - 1; i >= 0; i--) { const p = pings[i], a = (now - p.t0) / 600; if (a >= 1) { pings.splice(i, 1); continue; } ctx.strokeStyle = rgba(p.col, 1 - a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + 22 * a, 0, 7); ctx.stroke(); }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i], a = (now - p.t0) / 1800; if (a >= 1) { pops.splice(i, 1); continue; } ctx.globalAlpha = 1 - a * a; const pin = reduce ? 1 : 1 + .4 * Math.max(0, 1 - a * 7); label(p.txt, p.x, p.y - 56 - (reduce ? 0 : a * 26), (p.big ? 18 : 15) * pin, p.col, p.big ? 800 : 700); ctx.globalAlpha = 1; } // pops pop in, then rise and fade
  if (ui.title && !reduce && lanterns.length < 26 && Math.random() < .04) { const r = S.rides[Math.floor(Math.random() * 12)]; lanterns.push({ x: r.x, y: r.y - 20, vy: 14 + Math.random() * 12, ph: Math.random() * 6, t0: now, life: 9000 }); }
  for (let i = lanterns.length - 1; i >= 0; i--) {
    const l = lanterns[i], a = (now - l.t0) / l.life; if (a >= 1) { lanterns.splice(i, 1); continue; } if (a < 0) continue;
    const y = l.y - 20 - l.vy * (now - l.t0) / 1000 * 3, x = l.x + Math.sin(t * 1.3 + l.ph) * 10, al = Math.min(1, a * 6) * (1 - a);
    ctx.globalCompositeOperation = 'lighter'; glowOn(ctx, x, y, 30, '#ffb347', .7 * al); ctx.globalCompositeOperation = op;
    ctx.fillStyle = rgba('#ffd27a', al); ctx.beginPath(); ctx.roundRect(x - 5, y - 7, 10, 13, 3); ctx.fill(); ctx.fillStyle = rgba('#b4553f', al); ctx.fillRect(x - 3, y - 9, 6, 2.5); ctx.fillRect(x - 3, y + 6, 6, 2); ctx.fillStyle = rgba('#fff4d6', al * .9); ctx.fillRect(x - 2, y - 3, 4, 6);
  }
  ctx.restore();
  if (sh) { ox -= sh[0]; oy -= sh[1]; }
  drawEdgeFlash(now);
  if (ui.box) { const b = ui.box; ctx.fillStyle = 'rgba(121,194,255,.12)'; ctx.strokeStyle = '#79c2ff'; ctx.lineWidth = 1.5; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
}
