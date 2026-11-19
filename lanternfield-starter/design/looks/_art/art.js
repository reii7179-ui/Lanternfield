/* Shared ride art for the art-direction mock-ups (design/ only).
   Every ride is drawn front-on in local units: origin at the ride's map point, ground line at y = 18, about 56 wide.
   g: a 2D context. P: the look's palette. ph: animation phase in turns (0..1 repeating), already scaled by how fast the ride runs.
   Lights (bulbs, windows, beacons) are pushed to LIT so each look can make them glow its own way. */
const LIT = [];
const lite = (x, y, r, col) => LIT.push([x, y, r, col]);
const TAU = Math.PI * 2;

function trackOf(ctrl, closed) { // Catmull-Rom through control points: a polyline with arc length, a Path2D and at(u)
  const c = closed ? ctrl.concat([ctrl[0]]) : ctrl, n = c.length, P = i => closed ? c[(i + n - 1) % (n - 1)] : c[Math.max(0, Math.min(n - 1, i))], pts = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = closed ? c[(i - 1 + n - 1) % (n - 1)] : P(i - 1), p1 = c[i], p2 = c[i + 1], p3 = closed ? c[(i + 2) % (n - 1)] : P(i + 2);
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
function rail(g, P, tr, col, w) { g.strokeStyle = P.ink; g.lineWidth = w + 1.6; g.stroke(tr.path); g.strokeStyle = col; g.lineWidth = w; g.stroke(tr.path); }
function ground(g, P, w) { g.fillStyle = P.wall; g.beginPath(); g.roundRect(-w / 2, 16.5, w, 4, 2); g.fill(); }
function stripes(g, clip, x0, x1, step, a, b) { g.save(); g.clip(clip); for (let x = x0, i = 0; x < x1; x += step, i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(x, -40, step + .3, 80); } g.restore(); }
function hstripes(g, clip, y0, y1, step, a, b) { g.save(); g.clip(clip); for (let y = y0, i = 0; y < y1; y += step, i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(-40, y, 80, step + .3); } g.restore(); }
const poly = pts => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; };

const ART = {
  tide(g, P, ph) { // wooden coaster on the sea wall
    ground(g, P, 56); supports(g, P, TRACK.tide, true); rail(g, P, TRACK.tide, P.wood, 2.2); train(g, P, TRACK.tide, ph, 3, P.c1);
  },
  night(g, P, ph) { // steel looper
    ground(g, P, 56); supports(g, P, TRACK.night, false); rail(g, P, TRACK.night, P.c3, 2.4); train(g, P, TRACK.night, ph, 3, P.c1);
    for (const [x, y] of [[-17, -23], [7, -12], [22, -6]]) lite(x, y, 3, P.bulb);
  },
  mine(g, P, ph) { // mine train through rocks
    g.fillStyle = P.rock; g.fill(poly([[-28, 18], [-22, -6], [-12, -14], [-4, -8], [2, -16], [12, -10], [20, -16], [28, 2], [28, 18]]));
    g.fillStyle = P.dark; g.beginPath(); g.ellipse(-14, 18, 6, 8, 0, Math.PI, 0); g.fill();
    rail(g, P, TRACK.mine, P.wood, 2); train(g, P, TRACK.mine, ph, 4, P.c2);
    lite(-14, 14, 4, P.bulb);
  },
  light(g, P, ph, run) { // lighthouse drop tower
    ground(g, P, 34); const col = poly([[-6, 18], [6, 18], [4, -21], [-4, -21]]);
    hstripes(g, col, -21, 18, 6.5, P.c1, P.canvas);
    g.fillStyle = P.metal; g.fillRect(-6, -24, 12, 3); g.fillStyle = P.glass; g.fillRect(-4.5, -30, 9, 6); g.fillStyle = P.roof; g.fill(poly([[-6, -30], [6, -30], [0, -35]]));
    lite(0, -27, 10, P.beacon);
    const y = -14 + 26 * (.5 + .5 * Math.cos(ph * TAU)); g.fillStyle = P.c2; g.beginPath(); g.roundRect(-11, y - 2.5, 22, 5, 2); g.fill();
    g.fillStyle = P.ink; for (let i = -8; i <= 8; i += 4) g.fillRect(i - .8, y + 2.5, 1.6, 2.2);
  },
  boats(g, P, ph) { // bumper boats in a pool
    g.fillStyle = P.wall; g.beginPath(); g.ellipse(0, 7, 28, 13, 0, 0, TAU); g.fill();
    g.fillStyle = P.water; g.beginPath(); g.ellipse(0, 6, 25, 10.5, 0, 0, TAU); g.fill();
    g.strokeStyle = P.water2; g.lineWidth = .8; g.beginPath(); g.ellipse(-6, 4, 7, 2, 0, 0, Math.PI); g.moveTo(14, 9); g.ellipse(9, 9, 5, 1.5, 0, 0, Math.PI); g.stroke();
    [P.c1, P.c2, P.c3, P.canvas].forEach((c, i) => { const a = ph * TAU * (i % 2 ? 1 : -1) + i * 1.7, x = Math.cos(a) * 15, y = 6 + Math.sin(a) * 5.5; g.fillStyle = P.ink; g.beginPath(); g.ellipse(x, y + 1, 5.6, 3.6, 0, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 4.8, 3, 0, 0, TAU); g.fill(); g.fillStyle = P.canvas; g.fillRect(x - .6, y - 4, 1.2, 3); });
  },
  flume(g, P, ph, run) { // log flume down a hill
    g.fillStyle = P.rock; g.fill(poly([[-28, 18], [-26, -12], [-14, -20], [-4, -10], [6, 6], [20, 12], [28, 18]]));
    g.strokeStyle = P.metal2; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < TRACK.flume.pts.length; i += 6) { const [x, y] = TRACK.flume.pts[i]; g.moveTo(x, y + 2); g.lineTo(x, 18); } g.stroke();
    g.strokeStyle = P.wood; g.lineWidth = 5; g.lineCap = 'round'; g.stroke(TRACK.flume.path); g.strokeStyle = P.water; g.lineWidth = 2.4; g.stroke(TRACK.flume.path);
    const [x, y, a] = TRACK.flume.at(ph * .999); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = P.wood; g.beginPath(); g.roundRect(-5, -4, 10, 4, 2); g.fill(); g.fillStyle = P.c1; g.fillRect(-2, -6, 4, 2.5); g.restore();
    if (run > 0) { g.fillStyle = P.water2; const s = (ph * 7) % 1; for (let i = 0; i < 5; i++) { const sx = 20 + Math.cos(i * 1.3) * (3 + 8 * s), sy = 12 - Math.abs(Math.sin(i * 1.3)) * (6 * s) ; g.globalAlpha = 1 - s; g.beginPath(); g.arc(sx, sy, 1.4, 0, TAU); g.fill(); } g.globalAlpha = 1; }
    g.fillStyle = P.roof; g.fillRect(-27, -20, 10, 3); g.fillStyle = P.wall; g.fillRect(-26, -17, 8, 6);
  },
  carou(g, P, ph) { // carousel
    g.fillStyle = P.wall; g.beginPath(); g.ellipse(0, 16, 25, 5, 0, 0, TAU); g.fill();
    g.strokeStyle = P.metal; g.lineWidth = 1.2; g.beginPath();
    for (let i = 0; i < 7; i++) { const a = ph * TAU + i * TAU / 7, x = Math.sin(a) * 20; if (Math.cos(a) < -.2) continue; g.moveTo(x, -6); g.lineTo(x, 14); } g.stroke();
    for (let i = 0; i < 7; i++) { const a = ph * TAU + i * TAU / 7, x = Math.sin(a) * 20, z = Math.cos(a); if (z < -.2) continue; const y = 5 + Math.sin(ph * TAU * 3 + i) * 2.5; g.fillStyle = [P.canvas, P.c2, P.c3][i % 3]; g.beginPath(); g.ellipse(x, y, 4.2 * (.6 + .4 * z), 2.4, 0, 0, TAU); g.fill(); g.fillRect(x - .6, y, 1.2, 3); }
    const top = poly([[-27, -6], [0, -24], [27, -6]]); stripes(g, top, -27, 27, 6, P.c1, P.canvas);
    g.fillStyle = P.c1; for (let i = -24; i <= 24; i += 6) { g.beginPath(); g.arc(i, -6, 3, 0, Math.PI); g.fill(); }
    g.strokeStyle = P.metal; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, -31); g.stroke(); g.fillStyle = P.c3; g.fill(poly([[0, -31], [6, -29], [0, -27]]));
    for (let i = -24; i <= 24; i += 8) lite(i, -4, 2.6, P.bulb);
  },
  gond(g, P, ph) { // sky gondola
    const A = [-24, -6], B = [24, -24], cab = u => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + Math.sin(u * Math.PI) * 6];
    g.fillStyle = P.metal; g.fill(poly([[-27, 18], [-25, -7], [-23, -7], [-21, 18]])); g.fill(poly([[21, 18], [23, -25], [25, -25], [27, 18]]));
    g.strokeStyle = P.metal2; g.lineWidth = 1; g.beginPath(); for (let u = 0; u <= 1.001; u += .05) { const [x, y] = cab(u); u ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (let k = 0; k < 3; k++) { const u = ((ph + k / 3) % 1) * .84 + .08, [x, y] = cab(u); g.strokeStyle = P.metal; g.lineWidth = .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 4); g.stroke(); g.fillStyle = [P.c1, P.c2, P.c3][k]; g.beginPath(); g.roundRect(x - 4, y + 4, 8, 7, 2); g.fill(); g.fillStyle = P.glass; g.fillRect(x - 2.6, y + 5.5, 5.2, 2.5); lite(x, y + 7, 3, P.win); }
    ground(g, P, 12); g.save(); g.translate(48, 0); ground(g, P, 12); g.restore();
  },
  wheel(g, P, ph) { // the Lantern Wheel
    const cy = -6, R = 21; ground(g, P, 34);
    g.strokeStyle = P.metal; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, 17); g.lineTo(0, cy); g.lineTo(14, 17); g.stroke();
    g.lineWidth = 2.2; g.beginPath(); g.arc(0, cy, R, 0, TAU); g.stroke();
    g.strokeStyle = P.metal2; g.lineWidth = .9; g.beginPath(); for (let i = 0; i < 8; i++) { const a = ph * TAU + i * TAU / 8; g.moveTo(0, cy); g.lineTo(Math.cos(a) * R, cy + Math.sin(a) * R); } g.stroke();
    for (let i = 0; i < 16; i++) { const a = ph * TAU + i * TAU / 16; lite(Math.cos(a) * R, cy + Math.sin(a) * R, 2, P.bulb); }
    for (let i = 0; i < 8; i++) { const a = ph * TAU + i * TAU / 8, x = Math.cos(a) * R, y = cy + Math.sin(a) * R; g.fillStyle = [P.c1, P.c2, P.c3, P.canvas][i % 4]; g.beginPath(); g.roundRect(x - 3.4, y, 6.8, 6, 1.8); g.fill(); }
    g.fillStyle = P.c3; g.beginPath(); g.arc(0, cy, 3.2, 0, TAU); g.fill();
  },
  arcade(g, P, ph, run) { // midway arcade
    g.fillStyle = P.wall; g.fillRect(-23, -10, 46, 28); g.fillStyle = P.roof; g.fillRect(-25, -13, 50, 4);
    g.fillStyle = P.c1; g.beginPath(); g.roundRect(-17, -25, 34, 12, 3); g.fill(); g.fillStyle = P.canvas; g.font = '700 7px "Familjen Grotesk", sans-serif'; g.textAlign = 'center'; g.fillText('ARCADE', 0, -16.6);
    for (let x = -15; x <= 15; x += 5) { lite(x, -26.5, 1.8, P.bulb); lite(x, -11.5, 1.8, P.bulb); }
    g.fillStyle = P.dark; g.fillRect(-5, 2, 10, 16);
    const scr = [P.c2, P.c3, P.win]; [[-19, -4], [-12, -4], [8, -4], [15, -4]].forEach(([x, y], i) => { g.fillStyle = run ? scr[(i + Math.floor(ph * 6)) % 3] : P.dark; g.fillRect(x - 2.5, y, 5, 6); if (run) lite(x, y + 3, 4, scr[i % 3]); });
  },
  food(g, P, ph, run) { // grand food hall
    g.fillStyle = P.wall; g.fillRect(-25, -8, 50, 26); g.fillStyle = P.roof; g.fill(poly([[-28, -8], [0, -24], [28, -8]]));
    g.fillStyle = P.metal; g.fillRect(14, -22, 5, 10);
    if (run) { g.fillStyle = P.smoke; for (let i = 0; i < 3; i++) { const s = (ph * 3 + i / 3) % 1; g.globalAlpha = .6 * (1 - s); g.beginPath(); g.arc(16.5 + Math.sin(s * 6) * 2, -24 - s * 12, 2 + s * 3, 0, TAU); g.fill(); } g.globalAlpha = 1; }
    const awn = poly([[-23, -2], [23, -2], [23, 4], [-23, 4]]); stripes(g, awn, -23, 23, 4.6, P.c1, P.canvas);
    g.fillStyle = P.c1; for (let x = -21; x <= 21; x += 4.6) { g.beginPath(); g.arc(x, 4, 2.3, 0, Math.PI); g.fill(); }
    for (const x of [-17, -8, 8, 17]) { g.fillStyle = P.win; g.fillRect(x - 3, 7, 6, 6); lite(x, 10, 5, P.win); }
    g.fillStyle = P.dark; g.fillRect(-3.5, 7, 7, 11);
  },
  play(g, P, ph) { // frontier playhouse: a big top
    const wall = poly([[-23, -2], [23, -2], [23, 18], [-23, 18]]); stripes(g, wall, -23, 23, 5.75, P.c2, P.canvas);
    const top = poly([[-26, -2], [0, -25], [26, -2]]); stripes(g, top, -26, 26, 6.5, P.c2, P.canvas);
    g.fillStyle = P.dark; g.fill(poly([[-6, 18], [0, 4], [6, 18]]));
    g.strokeStyle = P.metal; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -25); g.lineTo(0, -33); g.stroke();
    g.fillStyle = P.c1; g.fill(poly([[0, -33], [7 + Math.sin(ph * TAU * 2), -31], [0, -29]]));
    for (let x = -22; x <= 22; x += 11) lite(x, -2, 2.4, P.bulb);
  },
  power(g, P, ph, run) { // substation
    g.fillStyle = P.wall; g.fillRect(-26, 12, 52, 6);
    for (const x of [-13, 6]) { g.fillStyle = P.metal; g.fillRect(x - 7, -4, 14, 16); g.fillStyle = P.metal2; for (let i = -5; i <= 5; i += 2.5) g.fillRect(x + i - .6, -2, 1.2, 12); g.fillStyle = P.ink; for (const d of [-4, 0, 4]) { g.fillRect(x + d - 1, -10, 2, 6); } }
    g.strokeStyle = P.metal2; g.lineWidth = .8; g.beginPath(); g.moveTo(-17, -10); g.quadraticCurveTo(-3, -6, 10, -10); g.moveTo(10, -10); g.quadraticCurveTo(20, -7, 28, -14); g.stroke();
    g.fillStyle = P.c3; g.fill(poly([[19, 0], [26, 12], [12, 12]])); g.fillStyle = P.ink; g.font = '700 8px sans-serif'; g.textAlign = 'center'; g.fillText('!', 19, 10.5);
    if (run) lite(-3, -8, 8, P.hum);
    g.strokeStyle = P.metal2; g.lineWidth = .7; g.beginPath(); for (let x = -26; x <= 26; x += 4) { g.moveTo(x, 18); g.lineTo(x, 8); } g.moveTo(-26, 9); g.lineTo(26, 9); g.stroke();
  },
};
ART.wsub = ART.power; ART.esub = ART.power;

/* service buildings */
const HUT = {
  store(g, P) { g.fillStyle = P.wall; g.fillRect(-26, -10, 52, 24); g.fillStyle = P.roof; g.fill(poly([[-29, -10], [-20, -20], [20, -20], [29, -10]])); g.fillStyle = P.metal2; g.fillRect(-12, -2, 24, 16); g.strokeStyle = P.metal; g.lineWidth = .7; g.beginPath(); for (let y = 0; y < 14; y += 2.5) { g.moveTo(-12, y); g.lineTo(12, y); } g.stroke(); },
  yard(g, P) { g.fillStyle = P.wall; g.fillRect(-30, -8, 60, 22); g.fillStyle = P.roof; g.fillRect(-32, -13, 64, 6); for (const x of [-20, -8, 4, 16]) { g.fillStyle = P.win; g.fillRect(x, -3, 7, 6); lite(x + 3.5, 0, 4, P.win); } },
  shop(g, P) { g.fillStyle = P.wall; g.fillRect(-25, -8, 50, 22); g.fillStyle = P.roof; g.fill(poly([[-27, -8], [-27, -18], [-12, -8], [-12, -18], [3, -8], [3, -18], [18, -8], [18, -18], [27, -8]])); g.fillStyle = P.dark; g.fillRect(-8, 2, 16, 12); },
  office(g, P) { g.fillStyle = P.wall; g.fillRect(-22, -12, 44, 26); g.fillStyle = P.roof; g.fillRect(-24, -15, 48, 4); for (let r = 0; r < 2; r++) for (const x of [-16, -6, 4, 12]) { g.fillStyle = P.win; g.fillRect(x, -8 + r * 9, 5, 5); lite(x + 2.5, -5.5 + r * 9, 3, P.win); } },
};
