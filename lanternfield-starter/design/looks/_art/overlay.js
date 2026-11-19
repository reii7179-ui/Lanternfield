/* Shared game-information layer for the mock-ups: the same rings, badges, labels and markers as the shipped map,
   with the radii and positions a look needs. pj(x, y) projects a park point to drawing space (identity for top-down looks). */
const rideSt = r => ui.title ? 'ok' : L.status(S, r);
const RUNOF = { ok: 1, degraded: .4, down: 0, service: 0, nopower: 0, unstaffed: 0 };
const SPEEDOF = { tide: .16, night: .2, mine: .13, light: .1, boats: .05, flume: .08, carou: .07, gond: .04, wheel: .02, arcade: .25, food: .2, play: .15, wsub: .1, esub: .1 };
const hashOf = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997; return h / 997; };
const ridePh = (r, t) => hashOf(r.id) + t * (SPEEDOF[r.id] || .1) * RUNOF[rideSt(r)]; // phase 2 replaces this with a per-ride accumulator
const ID = (x, y) => [x, y];

const glowCache = {};
function glowSprite(col) {
  if (glowCache[col]) return glowCache[col];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(.35, rgba(col, .45)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (glowCache[col] = c);
}
function glowAt(x, y, rad, col, a) { if (a <= 0) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowSprite(col), x - rad, y - rad, rad * 2, rad * 2); ctx.globalAlpha = 1; }
// the lights a ride's art asked for: tiny dots by day, glows by night
function drawLights(x, y, s, n, on, dim) {
  const op = ctx.globalCompositeOperation;
  for (const [lx, ly, r, col] of LIT) {
    const X = x + lx * s, Y = y + ly * s;
    if (on && n > .15) { ctx.globalCompositeOperation = 'lighter'; glowAt(X, Y, r * s * (2.2 + n * 1.6), col, n * .9 * (dim || 1)); ctx.globalCompositeOperation = op; }
    if (r <= 3) { ctx.fillStyle = on ? (n > .3 ? '#fff4d6' : col) : 'rgba(40,40,60,.6)'; ctx.beginPath(); ctx.arc(X, Y, .9 * s, 0, 7); ctx.fill(); }
  }
  LIT.length = 0;
}

// o: { cy: ring centre offset, R: health ring radius, ly: label offset, pill: label background or null, ink, by: badge row offset }
function rideInfo(r, t, x, y, o) {
  const st = rideSt(r), j = ui.title ? null : r.job, cx = x, cy = y + o.cy, R = o.R, lhNow = !ui.title && S.phase === 'day' && S.clock > L.LH;
  if (ui.sel === r.id) { ctx.strokeStyle = o.selCol || '#f7edd8'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(cx, cy, R + 11, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  const armed = j && j.type === 'fault' && selUnits().some(c => c.skills[j.trade] || j.rescue);
  if (armed && !reduce) { ctx.strokeStyle = rgba('#79c2ff', .5 + .4 * Math.sin(t * 5)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, 7); ctx.stroke(); }
  if (!ui.title) {
    const h = r.health / 100, hc = r.health >= 60 ? '#5fd6a8' : r.health >= 35 ? '#ffb347' : '#ff5d4a';
    ctx.lineWidth = 3; ctx.strokeStyle = o.track || rgba('#f7edd8', .14); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.strokeStyle = hc; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.max(.02, h) * Math.PI * 2); ctx.stroke();
    if (j && j.prog > 0) { ctx.strokeStyle = '#79c2ff'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(cx, cy, R + 5, -Math.PI / 2, -Math.PI / 2 + clamp(j.prog / L.need(j), 0, 1) * Math.PI * 2); ctx.stroke(); }
    else if (lhNow && r.sub) { ctx.strokeStyle = rgba('#ffd27a', .9); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R + 5, -Math.PI / 2, -Math.PI / 2 + clamp(r.lh / L.LIT_MIN, 0, 1) * Math.PI * 2); ctx.stroke(); }
  }
  if (j && j.type === 'fault' && !j.first && S.clock - j.t0 <= L.FAST) {
    const f = clamp((L.FAST - (S.clock - j.t0)) / L.FAST, 0, 1); ctx.strokeStyle = rgba('#79c2ff', reduce ? 1 : .65 + .35 * Math.sin(t * 12)); ctx.lineWidth = 4; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(cx, cy, R + 18, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke(); ctx.lineCap = 'round'; label('⚡', cx - R - 6, cy - R + 2, 13, '#9fd4ff', 700);
  }
  if (ui.coachRide === r.id && !reduce) { ctx.strokeStyle = rgba('#ffb347', .55 + .45 * Math.sin(t * 7)); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(cx, cy, R + 25, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  if (j && j.type === 'fault' && (j.rescue || (j.esc && j.sev === 'minor'))) {
    const due = j.rescue || j.esc, span = j.rescue ? 30 : Math.max(1, j.esc - j.t0), f = clamp((due - S.clock) / span, 0, 1), urgent = !!j.rescue;
    ctx.strokeStyle = urgent ? rgba('#ff5d4a', reduce ? 1 : .6 + .4 * Math.sin(t * 9)) : rgba('#ffb347', .9); ctx.lineWidth = urgent ? 5 : 3.5; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(cx, cy, urgent ? R + 13 : R + 10, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke(); ctx.lineCap = 'round';
  }
  if (r.sub && !ui.title && r.q > 1) { const k = Math.min(9, Math.ceil(r.q / (r.cap * S.qtol) * 9)); ctx.fillStyle = r.jam ? '#ff5d4a' : (o.qCol || rgba('#f7edd8', .75)); for (let i = 0; i < k; i++) { ctx.beginPath(); ctx.arc(cx - (k - 1) * 3 + i * 6, y + o.qy, 2, 0, 7); ctx.fill(); } }
  const nameCol = st === 'nopower' ? (o.offInk || '#a5a7c2') : (o.ink || '#f7edd8');
  const nm = () => o.pill ? pillLabel(r.short, cx, y + o.ly, nameCol, o.pill, st) : label(r.short, cx, y + o.ly, 13.5, nameCol);
  if (o.defer) o.defer.push(nm); else nm();
  if (ui.title) return;
  let bx = cx + R * .72; const by = cy - R * .72;
  const badge = (txt, bg) => { ctx.fillStyle = bg; ctx.strokeStyle = o.badgeLine || '#10142f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 10, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#16122b'; ctx.font = '700 11px "Familjen Grotesk", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, bx, by + 4); bx += 21; };
  if (j && j.type === 'fault') { badge(j.trade[0].toUpperCase(), TC[j.trade]); if (j.mode === 'full' && j.part && j.ps === 'none' && S.stock[j.part] < 1) badge('?', '#b79cf5'); }
  if (j && j.rescue) badge('!', '#ff5d4a');
  if (r.warnAt) badge('!', '#ffb347');
  if (r.patched) badge('P', '#f7edd8');
  if (S.prio === r.id) badge('R', '#ffb347');
  if (r.vouch > S.clock) badge('V', '#8fe8c4');
  if (r.fl > S.clock) badge('F', '#ffd27a');
  if (r.svcReq && !j) badge('S', '#79c2ff');
  const vip = S.events.find(e => e.k === 'vip' && !e.done && e.ride === r.id && e.warned);
  if (vip) { ctx.fillStyle = '#ffd27a'; ctx.strokeStyle = '#10142f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(cx - R - 36, cy - R - 6, 56, 19, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2a1700'; ctx.font = '700 10.5px "Familjen Grotesk", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VIP ' + fmtClock(vip.at), cx - R - 8, cy - R + 7); }
}
// a name on a soft pill, with a small status word when the ride is not running (so colour is never the only signal)
const STWORD = { degraded: 'HALF', down: 'CLOSED', service: 'SERVICE', nopower: 'NO POWER', unstaffed: 'NO CREW' };
function pillLabel(txt, x, y, col, pill, st) {
  const k = clamp(.82 / sc, 1, 1.45), fs = 12.5 * k; ctx.font = `700 ${fs}px "Familjen Grotesk", system-ui, sans-serif`; ctx.textAlign = 'center';
  const w = ctx.measureText(txt).width, word = !ui.title && STWORD[st], ww = word ? (ctx.font = `800 ${9 * k}px "Familjen Grotesk", system-ui, sans-serif`, ctx.measureText(word).width + 10 * k) : 0, tw = w + 14 * k + (word ? ww + 4 * k : 0);
  ctx.fillStyle = pill.bg; ctx.strokeStyle = pill.line || 'transparent'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x - tw / 2, y - fs * .95, tw, fs * 1.45, fs * .72); ctx.fill(); if (pill.line) ctx.stroke();
  let lx = x - tw / 2 + 7 * k;
  if (word) { ctx.fillStyle = SCOL[st] === '#7d7f9c' ? '#a5a7c2' : SCOL[st]; ctx.beginPath(); ctx.roundRect(lx - 3 * k, y - fs * .68, ww, fs * .95, fs * .45); ctx.fill(); ctx.fillStyle = '#16122b'; ctx.textAlign = 'left'; ctx.fillText(word, lx + 2 * k, y - fs * .02); lx += ww + 4 * k; }
  ctx.font = `700 ${fs}px "Familjen Grotesk", system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.fillStyle = col; ctx.fillText(txt, lx, y); ctx.textAlign = 'center';
}

// people on shift: the same markers as the shipped map (sprint, push, route, selection, energy, carrying, waiting, break, talk, You)
function drawCrew(t, frac, pj, o) {
  if (ui.title) return;
  const list = S.crew.filter(c => c.on).map(c => { const p = prev[c.id] || [c.x, c.y], wx = p[0] + (c.x - p[0]) * frac, wy = p[1] + (c.y - p[1]) * frac, [x, y] = pj(wx, wy); return { c, x, y, wx, wy }; }).sort((a, b) => a.y - b.y);
  for (const { c, x, y } of list) {
    const on = ui.units.includes(c.id), col = TC[rk(c)], d = c.fetch ? L.STORE : c.target ? L.ride(S, c.target) : c.dest ? L.ride(S, c.dest) : c.post || null;
    if (d && (c.state === 'walk' || c.state === 'run')) { const q = pj(d.x, d.y); line([[x, y], q], 1.5, rgba(col, .55), [4, 6]); }
  }
  for (const { c, x, y } of list) {
    const on = ui.units.includes(c.id), col = TC[rk(c)];
    if (o.shadow) { ctx.fillStyle = o.shadow; ctx.beginPath(); ctx.ellipse(x + 2, y + 9, 10, 4, 0, 0, 7); ctx.fill(); }
    if (c.sprint > S.clock) { ctx.strokeStyle = rgba('#8fe8c4', .8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 14.5, 0, 7); ctx.stroke(); }
    if (c.push > S.clock) { ctx.strokeStyle = rgba('#ffb347', .9); ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    if (on) { ctx.strokeStyle = '#79c2ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 16 + (reduce ? 0 : Math.sin(t * 5) * 1.5), 0, 7); ctx.stroke(); }
    if (o.token) o.token(c, x, y, col); else {
      ctx.fillStyle = col; ctx.strokeStyle = o.line || '#10142f'; ctx.lineWidth = 2.5; ctx.beginPath();
      if (c.role === 'tech') ctx.arc(x, y, 11, 0, 7); else ctx.roundRect(x - 10, y - 10, 20, 20, 5);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#16122b'; ctx.font = '700 12px "Familjen Grotesk", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(c.name[0], x, y + 4.2);
    }
    if (isMe(c)) { ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, 21, 0, 7); ctx.stroke(); ctx.setLineDash([]); label('You', x, y - 25, 12, '#ffd27a', 700); }
    if (c.carry || c.state === 'run') { ctx.fillStyle = '#f7edd8'; ctx.strokeStyle = '#10142f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.rect(x + 7, y - 15, 9, 8); ctx.fill(); ctx.stroke(); }
    if (c.state === 'wait') { ctx.fillStyle = '#b79cf5'; ctx.beginPath(); ctx.arc(x + 10, y - 9, 4, 0, 7); ctx.fill(); }
    if (c.role === 'tech' && !c.temp && !c.agency && L.enOf(c) < 70) { const e = L.enOf(c) / 100; ctx.fillStyle = 'rgba(16,20,47,.85)'; ctx.fillRect(x - 11, y + 14, 22, 4); ctx.fillStyle = e >= .6 ? '#5fd6a8' : e >= .3 ? '#ffb347' : '#ff5d4a'; ctx.fillRect(x - 10, y + 15, 20 * e, 2); }
    if (c.state === 'break') label('z', x + 13, y - 11, 12, '#9fd4ff', 700);
    if (c.state === 'talk') { ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x + 11, y - 11, 3.5, 0, 7); ctx.fill(); }
    if (ui.coachUnit === c.id && !reduce) { ctx.strokeStyle = rgba('#ffb347', .55 + .45 * Math.sin(t * 7)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.stroke(); }
  }
}
function drawGuests(n, pj, cols, size) {
  let i = 0;
  for (const g of guests) { i++; if (g.wait > 0) continue; const [x, y] = pj(g.x, g.y); ctx.fillStyle = g.sad ? '#ff8f7f' : cols[i % cols.length]; ctx.beginPath(); ctx.arc(x, y, size || 2.3, 0, 7); ctx.fill(); }
}
function drawFxLayer(now, t, pj, lanternCol) {
  for (let i = pings.length - 1; i >= 0; i--) { const p = pings[i], a = (now - p.t0) / 600; if (a >= 1) { pings.splice(i, 1); continue; } const [x, y] = pj(p.x, p.y); ctx.strokeStyle = rgba(p.col, 1 - a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 6 + 22 * a, 0, 7); ctx.stroke(); }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i], a = (now - p.t0) / 1800; if (a >= 1) { pops.splice(i, 1); continue; } const [x, y] = pj(p.x, p.y); ctx.globalAlpha = 1 - a * a; label(p.txt, x, y - 54 - a * 26, 15, p.col, 700); ctx.globalAlpha = 1; }
  if (ui.title && !reduce && lanterns.length < 26 && Math.random() < .04) { const r = S.rides[Math.floor(Math.random() * 12)]; lanterns.push({ x: r.x, y: r.y - 20, vy: 14 + Math.random() * 12, ph: Math.random() * 6, t0: now, life: 9000 }); }
  for (let i = lanterns.length - 1; i >= 0; i--) {
    const l = lanterns[i], a = (now - l.t0) / l.life; if (a >= 1) { lanterns.splice(i, 1); continue; } if (a < 0) continue;
    const [bx, by] = pj(l.x, l.y), y = by - 20 - l.vy * (now - l.t0) / 1000 * 3, x = bx + Math.sin(t * 1.3 + l.ph) * 10, al = Math.min(1, a * 6) * (1 - a);
    const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter'; glowAt(x, y, 30, '#ffb347', .7 * al); ctx.globalCompositeOperation = op;
    ctx.fillStyle = rgba(lanternCol || '#ffd27a', al); ctx.beginPath(); ctx.roundRect(x - 5, y - 7, 10, 13, 3); ctx.fill();
    ctx.fillStyle = rgba('#fff4d6', al * .9); ctx.fillRect(x - 2, y - 3, 4, 6);
  }
}
// deterministic scenery spots: on land, clear of rides, paths and buildings
function sceneryPoints(n, seed, gap) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, out = [];
  const zones = [[40, 70, 330, 560], [330, 30, 400, 190], [360, 240, 300, 420], [650, 150, 330, 420]], N = L.NODES;
  const segs = [[L.GATE, N.P], [N.P, N.W], [N.P, N.N], [N.P, N.E]].concat(S.rides.filter(r => r.via).map(r => [N[r.via], r]));
  const segD = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(p.x - a.x - u * dx, p.y - a.y - u * dy); };
  for (let k = 0; k < n * 40 && out.length < n; k++) {
    const z = zones[Math.floor(rnd() * zones.length)], p = { x: z[0] + 14 + rnd() * (z[2] - 28), y: z[1] + 14 + rnd() * (z[3] - 28) };
    if (Math.hypot(p.x - 150, (p.y - 425) * 1.6) < 110) continue;
    if (S.rides.some(r => Math.hypot(p.x - r.x, p.y - r.y) < 62)) continue;
    if (segs.some(([a, b]) => segD(p, a, b) < (gap || 16))) continue;
    if ([L.STORE, L.YARD, L.SHOP, L.OFFICE, L.GATE].some(q => Math.abs(p.x - q.x) < 52 && Math.abs(p.y - q.y) < 40)) continue;
    if (out.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)) continue;
    out.push({ x: p.x, y: p.y, s: .7 + rnd() * .6, k: rnd() });
  }
  return out;
}
