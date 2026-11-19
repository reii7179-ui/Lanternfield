/* ---------- ride and building art: flat vector, drawn front-on ----------
   Local units: origin at the ride's map point, ground line at y = 18, about 56 wide. The map draws it 1.2x.
   g: a 2D context. P: the palette (see palA). Each ride has
     base(g, P)            the parts that never move: structure, track, buildings
     move(g, P, ph, run)   the parts that move (cars, cabins, boats, flags, smoke). ph is in turns; run is 0 stopped, about .4 half speed, 1 running
     top(g, P)             optional: still parts drawn over the moving ones (the carousel canopy)
   Lights (bulbs, windows, beacons) are pushed to LIT so the map can make them glow. */
const LIT = [];
const lite = (x, y, r, col) => LIT.push([x, y, r, col]);
const TAU = Math.PI * 2;

function trackOf(ctrl, closed) { // Catmull-Rom through control points: a polyline with arc length, a Path2D and at(u) -> [x, y, angle]
  const c = closed ? ctrl.concat([ctrl[0]]) : ctrl, n = c.length, pts = [];
  const at0 = i => closed ? c[((i % (n - 1)) + n - 1) % (n - 1)] : c[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at0(i - 1), p1 = c[i], p2 = c[i + 1], p3 = closed ? at0(i + 2) : at0(i + 2);
    for (let k = 0; k < 10; k++) {
      const t = k / 10, t2 = t * t, t3 = t2 * t, f = j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      pts.push([f(0), f(1)]);
    }
  }
  pts.push(c[n - 1].slice());
  const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len[len.length - 1], path = new Path2D(); pts.forEach((q, i) => i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]));
  const at = u => { const d = (((u % 1) + 1) % 1) * total; let i = 1; while (i < len.length - 1 && len[i] < d) i++; const a = pts[i - 1], b = pts[i], f = (d - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])]; };
  return { pts, total, path, at };
}
const TRACK = {
  tide: trackOf([[-27, 16], [-22, -2], [-17, -21], [-12, -20], [-5, 12], [3, -8], [10, 11], [17, -1], [23, 10], [27, 16], [0, 17]], true),
  night: trackOf([[-27, 16], [-23, -22], [-17, -23], [-9, 12], [1, 12], [9, 2], [7, -12], [-1, -12], [-2, 0], [6, 11], [16, 8], [22, -6], [27, 16], [0, 17]], true),
  mine: trackOf([[-27, 14], [-20, 2], [-12, 10], [-4, -4], [5, 9], [13, -2], [21, 8], [27, 14], [0, 16]], true),
  flume: trackOf([[-24, -16], [-12, -15], [-2, -6], [-12, 3], [0, 10], [14, 6], [22, 14]], false),
};
const poly = pts => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; };
function train(g, P, tr, u, cars, col) {
  for (let k = 0; k < cars; k++) {
    const [x, y, a] = tr.at(u - k * 7 / tr.total);
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = k ? col : P.c2; g.beginPath(); g.roundRect(-3.2, -4.6, 6.4, 4.2, 1.4); g.fill(); g.restore();
    if (!k) lite(x, y - 3, 4, P.bulb);
  }
}
function supports(g, P, tr, lattice) {
  g.strokeStyle = P.metal2; g.lineWidth = lattice ? .8 : 1.1; g.beginPath();
  for (let i = 0; i < tr.pts.length; i += lattice ? 2 : 4) { const [x, y] = tr.pts[i]; if (y < 13) { g.moveTo(x, y + 1); g.lineTo(x, 18); if (lattice && i % 4 === 0) { g.moveTo(x - 2.5, 18); g.lineTo(x + 2.5, y + 3); } } }
  g.stroke();
}
function rail(g, P, tr, col, w) { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = P.ink; g.lineWidth = w + 1.6; g.stroke(tr.path); g.strokeStyle = col; g.lineWidth = w; g.stroke(tr.path); }
function ground(g, P, w) { g.fillStyle = P.wall; g.beginPath(); g.roundRect(-w / 2, 16.5, w, 4, 2); g.fill(); }
function stripes(g, clip, x0, x1, step, a, b) { g.save(); g.clip(clip); for (let x = x0, i = 0; x < x1; x += step, i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(x, -40, step + .3, 80); } g.restore(); }
function hstripes(g, clip, y0, y1, step, a, b) { g.save(); g.clip(clip); for (let y = y0, i = 0; y < y1; y += step, i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(-40, y, 80, step + .3); } g.restore(); }

const ART = {
  tide: { // wooden coaster on the sea wall
    base(g, P) { ground(g, P, 56); supports(g, P, TRACK.tide, true); rail(g, P, TRACK.tide, P.wood, 2.2); },
    move(g, P, ph) { train(g, P, TRACK.tide, ph, 3, P.c1); },
  },
  night: { // steel looper
    base(g, P) { ground(g, P, 56); supports(g, P, TRACK.night, false); rail(g, P, TRACK.night, P.c3, 2.4); for (const [x, y] of [[-17, -23], [7, -12], [22, -6]]) lite(x, y, 3, P.bulb); },
    move(g, P, ph) { train(g, P, TRACK.night, ph, 3, P.c1); },
  },
  mine: { // mine train through rocks
    base(g, P) {
      g.fillStyle = P.rock; g.fill(poly([[-28, 18], [-22, -6], [-12, -14], [-4, -8], [2, -16], [12, -10], [20, -16], [28, 2], [28, 18]]));
      g.fillStyle = P.dark; g.beginPath(); g.ellipse(-14, 18, 6, 8, 0, Math.PI, 0); g.fill();
      rail(g, P, TRACK.mine, P.wood, 2); lite(-14, 14, 4, P.bulb);
    },
    move(g, P, ph) { train(g, P, TRACK.mine, ph, 4, P.c2); },
  },
  light: { // lighthouse drop tower
    base(g, P) {
      ground(g, P, 34); hstripes(g, poly([[-6, 18], [6, 18], [4, -21], [-4, -21]]), -21, 18, 6.5, P.c1, P.canvas);
      g.fillStyle = P.metal; g.fillRect(-6, -24, 12, 3); g.fillStyle = P.glass; g.fillRect(-4.5, -30, 9, 6); g.fillStyle = P.roof; g.fill(poly([[-6, -30], [6, -30], [0, -35]]));
      lite(0, -27, 10, P.beacon);
    },
    move(g, P, ph) {
      const y = -14 + 26 * (.5 + .5 * Math.cos(ph * TAU)); g.fillStyle = P.c2; g.beginPath(); g.roundRect(-11, y - 2.5, 22, 5, 2); g.fill();
      g.fillStyle = P.ink; for (let i = -8; i <= 8; i += 4) g.fillRect(i - .8, y + 2.5, 1.6, 2.2);
    },
  },
  boats: { // bumper boats in a pool
    base(g, P) {
      g.fillStyle = P.wall; g.beginPath(); g.ellipse(0, 7, 28, 13, 0, 0, TAU); g.fill();
      g.fillStyle = P.water; g.beginPath(); g.ellipse(0, 6, 25, 10.5, 0, 0, TAU); g.fill();
      g.strokeStyle = P.water2; g.lineWidth = .8; g.beginPath(); g.ellipse(-6, 4, 7, 2, 0, 0, Math.PI); g.moveTo(14, 9); g.ellipse(9, 9, 5, 1.5, 0, 0, Math.PI); g.stroke();
    },
    move(g, P, ph) { [P.c1, P.c2, P.c3, P.canvas].forEach((c, i) => { const a = ph * TAU * (i % 2 ? 1 : -1) + i * 1.7, x = Math.cos(a) * 15, y = 6 + Math.sin(a) * 5.5; g.fillStyle = P.ink; g.beginPath(); g.ellipse(x, y + 1, 5.6, 3.6, 0, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 4.8, 3, 0, 0, TAU); g.fill(); g.fillStyle = P.canvas; g.fillRect(x - .6, y - 4, 1.2, 3); }); },
  },
  flume: { // log flume down a hill
    base(g, P) {
      g.fillStyle = P.rock; g.fill(poly([[-28, 18], [-26, -12], [-14, -20], [-4, -10], [6, 6], [20, 12], [28, 18]]));
      g.strokeStyle = P.metal2; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < TRACK.flume.pts.length; i += 6) { const [x, y] = TRACK.flume.pts[i]; g.moveTo(x, y + 2); g.lineTo(x, 18); } g.stroke();
      g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = P.wood; g.lineWidth = 5; g.stroke(TRACK.flume.path); g.strokeStyle = P.water; g.lineWidth = 2.4; g.stroke(TRACK.flume.path);
      g.fillStyle = P.roof; g.fillRect(-27, -20, 10, 3); g.fillStyle = P.wall; g.fillRect(-26, -17, 8, 6);
    },
    move(g, P, ph, run) {
      const [x, y, a] = TRACK.flume.at(ph * .999); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = P.wood; g.beginPath(); g.roundRect(-5, -4, 10, 4, 2); g.fill(); g.fillStyle = P.c1; g.fillRect(-2, -6, 4, 2.5); g.restore();
      if (run > 0) { g.fillStyle = P.water2; const s = (ph * 7) % 1; for (let i = 0; i < 5; i++) { g.globalAlpha = 1 - s; g.beginPath(); g.arc(20 + Math.cos(i * 1.3) * (3 + 8 * s), 12 - Math.abs(Math.sin(i * 1.3)) * 6 * s, 1.4, 0, TAU); g.fill(); } g.globalAlpha = 1; }
    },
  },
  carou: { // carousel: platform, then the turning horses, then the canopy on top
    base(g, P) { g.fillStyle = P.wall; g.beginPath(); g.ellipse(0, 16, 25, 5, 0, 0, TAU); g.fill(); },
    move(g, P, ph) {
      g.strokeStyle = P.metal; g.lineWidth = 1.2; g.beginPath();
      for (let i = 0; i < 7; i++) { const a = ph * TAU + i * TAU / 7, x = Math.sin(a) * 20; if (Math.cos(a) < -.2) continue; g.moveTo(x, -6); g.lineTo(x, 14); } g.stroke();
      for (let i = 0; i < 7; i++) { const a = ph * TAU + i * TAU / 7, x = Math.sin(a) * 20, z = Math.cos(a); if (z < -.2) continue; const y = 5 + Math.sin(ph * TAU * 3 + i) * 2.5; g.fillStyle = [P.canvas, P.c2, P.c3][i % 3]; g.beginPath(); g.ellipse(x, y, 4.2 * (.6 + .4 * z), 2.4, 0, 0, TAU); g.fill(); g.fillRect(x - .6, y, 1.2, 3); }
    },
    top(g, P) {
      stripes(g, poly([[-27, -6], [0, -24], [27, -6]]), -27, 27, 6, P.c1, P.canvas);
      g.fillStyle = P.c1; for (let i = -24; i <= 24; i += 6) { g.beginPath(); g.arc(i, -6, 3, 0, Math.PI); g.fill(); }
      g.strokeStyle = P.metal; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, -31); g.stroke(); g.fillStyle = P.c3; g.fill(poly([[0, -31], [6, -29], [0, -27]]));
      for (let i = -24; i <= 24; i += 8) lite(i, -4, 2.6, P.bulb);
    },
  },
  gond: { // sky gondola: two pylons, a cable, cabins along it
    base(g, P) {
      g.fillStyle = P.metal; g.fill(poly([[-27, 18], [-25, -7], [-23, -7], [-21, 18]])); g.fill(poly([[21, 18], [23, -25], [25, -25], [27, 18]]));
      g.strokeStyle = P.metal2; g.lineWidth = 1; g.beginPath(); for (let u = 0; u <= 1.001; u += .05) { const [x, y] = gondAt(u); u ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.fillStyle = P.wall; g.beginPath(); g.roundRect(-30, 16.5, 12, 4, 2); g.roundRect(18, 16.5, 12, 4, 2); g.fill();
      g.fillStyle = P.wall; g.fillRect(-9, 6, 18, 12); g.fillStyle = P.roof; g.fill(poly([[-11, 6], [0, 0], [11, 6]])); g.fillStyle = P.dark; g.fillRect(-3, 10, 6, 8); // the boarding station
    },
    move(g, P, ph) { for (let k = 0; k < 3; k++) { const u = ((ph + k / 3) % 1) * .84 + .08, [x, y] = gondAt(u); g.strokeStyle = P.metal; g.lineWidth = .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 4); g.stroke(); g.fillStyle = [P.c1, P.c2, P.c3][k]; g.beginPath(); g.roundRect(x - 4, y + 4, 8, 7, 2); g.fill(); g.fillStyle = P.glass; g.fillRect(x - 2.6, y + 5.5, 5.2, 2.5); lite(x, y + 7, 3, P.win); } },
  },
  wheel: { // the Lantern Wheel: legs stay, the rim and cabins turn
    base(g, P) { ground(g, P, 34); g.strokeStyle = P.metal; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, 17); g.lineTo(0, -6); g.lineTo(14, 17); g.stroke(); },
    move(g, P, ph) {
      const cy = -6, R = 21;
      g.strokeStyle = P.metal; g.lineWidth = 2.2; g.beginPath(); g.arc(0, cy, R, 0, TAU); g.stroke();
      g.strokeStyle = P.metal2; g.lineWidth = .9; g.beginPath(); for (let i = 0; i < 8; i++) { const a = ph * TAU + i * TAU / 8; g.moveTo(0, cy); g.lineTo(Math.cos(a) * R, cy + Math.sin(a) * R); } g.stroke();
      for (let i = 0; i < 16; i++) { const a = ph * TAU + i * TAU / 16; lite(Math.cos(a) * R, cy + Math.sin(a) * R, 2, P.bulb); }
      for (let i = 0; i < 8; i++) { const a = ph * TAU + i * TAU / 8, x = Math.cos(a) * R, y = cy + Math.sin(a) * R; g.fillStyle = [P.c1, P.c2, P.c3, P.canvas][i % 4]; g.beginPath(); g.roundRect(x - 3.4, y, 6.8, 6, 1.8); g.fill(); }
      g.fillStyle = P.c3; g.beginPath(); g.arc(0, cy, 3.2, 0, TAU); g.fill();
    },
  },
  arcade: { // midway arcade: the sign stays lit, the screens flicker
    base(g, P) {
      g.fillStyle = P.wall; g.fillRect(-23, -10, 46, 28); g.fillStyle = P.roof; g.fillRect(-25, -13, 50, 4);
      g.fillStyle = P.c1; g.beginPath(); g.roundRect(-17, -25, 34, 12, 3); g.fill(); g.fillStyle = P.canvas; g.font = '700 7px "Familjen Grotesk", sans-serif'; g.textAlign = 'center'; g.fillText('ARCADE', 0, -16.6);
      for (let x = -15; x <= 15; x += 5) { lite(x, -26.5, 1.8, P.bulb); lite(x, -11.5, 1.8, P.bulb); }
      g.fillStyle = P.dark; g.fillRect(-5, 2, 10, 16);
    },
    move(g, P, ph, run) { const scr = [P.c2, P.c3, P.win]; [[-19, -4], [-12, -4], [8, -4], [15, -4]].forEach(([x, y], i) => { g.fillStyle = run ? scr[(i + Math.floor(ph * 6)) % 3] : P.dark; g.fillRect(x - 2.5, y, 5, 6); if (run) lite(x, y + 3, 4, scr[i % 3]); }); },
  },
  food: { // grand food hall: smoke from the chimney while it cooks
    base(g, P) {
      g.fillStyle = P.wall; g.fillRect(-25, -8, 50, 26); g.fillStyle = P.roof; g.fill(poly([[-28, -8], [0, -24], [28, -8]])); g.fillStyle = P.metal; g.fillRect(14, -22, 5, 10);
      stripes(g, poly([[-23, -2], [23, -2], [23, 4], [-23, 4]]), -23, 23, 4.6, P.c1, P.canvas);
      g.fillStyle = P.c1; for (let x = -21; x <= 21; x += 4.6) { g.beginPath(); g.arc(x, 4, 2.3, 0, Math.PI); g.fill(); }
      for (const x of [-17, -8, 8, 17]) { g.fillStyle = P.win; g.fillRect(x - 3, 7, 6, 6); lite(x, 10, 5, P.win); }
      g.fillStyle = P.dark; g.fillRect(-3.5, 7, 7, 11);
    },
    move(g, P, ph, run) { if (!run) return; g.fillStyle = P.smoke; for (let i = 0; i < 3; i++) { const s = (ph * 3 + i / 3) % 1; g.globalAlpha = .6 * (1 - s); g.beginPath(); g.arc(16.5 + Math.sin(s * 6) * 2, -24 - s * 12, 2 + s * 3, 0, TAU); g.fill(); } g.globalAlpha = 1; },
  },
  play: { // frontier playhouse: a big top with a flag
    base(g, P) {
      stripes(g, poly([[-23, -2], [23, -2], [23, 18], [-23, 18]]), -23, 23, 5.75, P.c2, P.canvas);
      stripes(g, poly([[-26, -2], [0, -25], [26, -2]]), -26, 26, 6.5, P.c2, P.canvas);
      g.fillStyle = P.dark; g.fill(poly([[-6, 18], [0, 4], [6, 18]]));
      g.strokeStyle = P.metal; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -25); g.lineTo(0, -33); g.stroke();
      for (let x = -22; x <= 22; x += 11) lite(x, -2, 2.4, P.bulb);
    },
    move(g, P, ph) { g.fillStyle = P.c1; g.fill(poly([[0, -33], [7 + Math.sin(ph * TAU * 2), -31], [0, -29]])); },
  },
  power: { // substation: humming while it supplies power
    base(g, P) {
      g.fillStyle = P.wall; g.fillRect(-26, 12, 52, 6);
      for (const x of [-13, 6]) { g.fillStyle = P.metal; g.fillRect(x - 7, -4, 14, 16); g.fillStyle = P.metal2; for (let i = -5; i <= 5; i += 2.5) g.fillRect(x + i - .6, -2, 1.2, 12); g.fillStyle = P.ink; for (const d of [-4, 0, 4]) g.fillRect(x + d - 1, -10, 2, 6); }
      g.strokeStyle = P.metal2; g.lineWidth = .8; g.beginPath(); g.moveTo(-17, -10); g.quadraticCurveTo(-3, -6, 10, -10); g.moveTo(10, -10); g.quadraticCurveTo(20, -7, 28, -14); g.stroke();
      g.fillStyle = P.c2; g.fill(poly([[19, 0], [26, 12], [12, 12]])); g.fillStyle = P.ink; g.font = '700 8px sans-serif'; g.textAlign = 'center'; g.fillText('!', 19, 10.5);
      g.strokeStyle = P.metal2; g.lineWidth = .7; g.beginPath(); for (let x = -26; x <= 26; x += 4) { g.moveTo(x, 18); g.lineTo(x, 8); } g.moveTo(-26, 9); g.lineTo(26, 9); g.stroke();
    },
    move(g, P, ph, run) { if (run) lite(-3, -8, 8, P.hum); },
  },
};
ART.wsub = ART.power; ART.esub = ART.power;
function gondAt(u) { return [-24 + 48 * u, -6 - 18 * u + Math.sin(u * Math.PI) * 6]; }

/* service buildings */
const HUT = {
  store(g, P) { g.fillStyle = P.wall; g.fillRect(-26, -10, 52, 24); g.fillStyle = P.roof; g.fill(poly([[-29, -10], [-20, -20], [20, -20], [29, -10]])); g.fillStyle = P.metal2; g.fillRect(-12, -2, 24, 16); g.strokeStyle = P.metal; g.lineWidth = .7; g.beginPath(); for (let y = 0; y < 14; y += 2.5) { g.moveTo(-12, y); g.lineTo(12, y); } g.stroke(); },
  yard(g, P) { g.fillStyle = P.wall; g.fillRect(-30, -8, 60, 22); g.fillStyle = P.roof; g.fillRect(-32, -13, 64, 6); for (const x of [-20, -8, 4, 16]) { g.fillStyle = P.win; g.fillRect(x, -3, 7, 6); lite(x + 3.5, 0, 4, P.win); } },
  shop(g, P) { g.fillStyle = P.wall; g.fillRect(-25, -8, 50, 22); g.fillStyle = P.roof; g.fill(poly([[-27, -8], [-27, -18], [-12, -8], [-12, -18], [3, -8], [3, -18], [18, -8], [18, -18], [27, -8]])); g.fillStyle = P.dark; g.fillRect(-8, 2, 16, 12); },
  office(g, P) { g.fillStyle = P.wall; g.fillRect(-22, -12, 44, 26); g.fillStyle = P.roof; g.fillRect(-24, -15, 48, 4); for (let r = 0; r < 2; r++) for (const x of [-16, -6, 4, 12]) { g.fillStyle = P.win; g.fillRect(x, -8 + r * 9, 5, 5); lite(x + 2.5, -5.5 + r * 9, 3, P.win); } },
};
