/* ---------- the living park: everything that moves just for show ----------
   Rides turn at their own speed (slower at half speed, still when stopped), broken rides smoke, spark or flash,
   people walk with a stride, carry parts, sit for a break and huddle for a toolbox talk, guests queue, squalls blow in.
   All of it is visual: it lives in VIS and the particle pool, is never saved, and never touches the engine.
   Reduced motion: rides hold still, no particles, nothing flashes; still pictures (a smoke cloud, a spark mark, a lamp) say the same. */
const VIS = { run: false, ride: {}, crew: {}, lit: {}, last: 0 };
const RIDE_SPEED = { tide: .09, night: .11, mine: .07, light: .045, boats: .025, flume: .05, carou: .035, gond: .02, wheel: .012, arcade: .2, food: .12, play: .1, wsub: .1, esub: .1 }; // turns per park minute at full speed
const PMAX = 260, parts = []; // the particle pool, capped
/* adaptive quality: on a device that cannot keep up (frames slower than about 38 fps for a second and a half) the
   decoration thins out in steps: fewer rain drops, smoke puffs, sparks and guests. When frames are quick again for a
   while it comes back. Rings, badges, people, status words and everything else that tells you about the game never change. */
const QUAL = { q: 1, ema: 16.7, slow: 0, fast: 0 };
function qualityTick(ms) {
  if (!(ms > 0) || ms > 250 || document.hidden) return;
  QUAL.ema += (ms - QUAL.ema) * .06;
  if (QUAL.ema > 26) { QUAL.slow += ms; QUAL.fast = 0; if (QUAL.slow > 1500 && QUAL.q > .4) { QUAL.q = Math.max(.4, QUAL.q - .2); QUAL.slow = 0; } }
  else if (QUAL.ema < 19) { QUAL.fast += ms; QUAL.slow = 0; if (QUAL.fast > 6000 && QUAL.q < 1) { QUAL.q = Math.min(1, QUAL.q + .2); QUAL.fast = 0; } }
  else QUAL.slow = QUAL.fast = 0;
}
function emit(k, x, y, vx, vy, life, size, col) { if (reduce || parts.length >= PMAX * QUAL.q || Math.random() > QUAL.q) return; parts.push({ k, x, y, vx, vy, t: 0, life, size, col }); }
const rnd = (a, b) => a + Math.random() * (b - a);

// squalls, from the engine's waves: wind builds for half an hour before one hits, then rain for about half an hour
function weatherNow() {
  let wind = 0, rain = 0;
  if (ui.title || S.phase !== 'day') return { wind, rain };
  for (const w of S.waves || []) {
    const m = S.clock - w.at;
    if (m >= -30 && m < 0) wind = Math.max(wind, (m + 30) / 30 * .6);
    if (m >= 0 && m < 32) { const a = m < 3 ? m / 3 : m > 22 ? (32 - m) / 10 : 1; rain = Math.max(rain, a); wind = Math.max(wind, .6 + .4 * a); }
  }
  return { wind, rain };
}

/* advance everything that moves; dt in real seconds, pm in park minutes (0 when the clock is stopped) */
function lifeStep(dt, pm, n, wx) {
  const lhNow = !ui.title && S.phase === 'day' && S.clock > L.LH;
  for (const r of S.rides) {
    const v = VIS.ride[r.id] || (VIS.ride[r.id] = { ph: hashOf(r.id), puff: 0 }), st = rideSt(r), j = r.job;
    if (!reduce) v.ph += (RIDE_SPEED[r.id] || .1) * (RUNOF[st] || 0) * pm;
    if (reduce || !pm) continue;
    // a broken ride: smoke for mechanical faults, sparks for electrical ones (a control fault flashes a lamp instead)
    if (j && j.type === 'fault' && (st === 'down' || st === 'degraded')) {
      v.puff += dt * (st === 'down' ? 4.5 : 1.5); // a squall can close several rides at once: keep the smoke light
      while (v.puff >= 1) {
        v.puff--;
        if (j.trade === 'mech') emit('smoke', r.x + rnd(-14, 14), r.y - rnd(8, 26), rnd(-3, 3) + wx * 20, rnd(-22, -12), rnd(1.8, 2.8), rnd(3, 5), n > .5 ? '#7f84a8' : '#c9ccd8');
        else if (j.trade === 'elec') for (let i = 0; i < 3; i++) emit('spark', r.x + rnd(-10, 10), r.y - rnd(10, 24), rnd(-45, 45), rnd(-55, -10), rnd(.25, .5), 1.2, Math.random() < .5 ? '#fff4c2' : '#ffd25a');
      }
    }
    // a lantern goes up the moment a ride earns it at Lantern Hour
    if (lhNow && r.sub && r.lh >= L.LIT_MIN && VIS.lit[r.id] !== S.day) { VIS.lit[r.id] = S.day; releaseLanterns(r, 3); }
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; }
    if (p.k === 'spark') p.vy += 140 * dt;
    if (p.k === 'star' || p.k === 'coin') { p.vy += (p.k === 'coin' ? 120 : 50) * dt; p.vx *= 1 - 2.2 * dt; p.vy *= 1 - 1.4 * dt; }
    if (p.k === 'smoke') { p.vx += (wx * 25 - p.vx) * dt * .5; p.size += dt * 4; }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}
function releaseLanterns(r, k) {
  if (reduce) return; const now = performance.now();
  for (let i = 0; i < k; i++) lanterns.push({ x: r.x + (Math.random() - .5) * 24, y: r.y - 16, vy: 15 + Math.random() * 12, ph: Math.random() * 6, t0: now + i * 380, life: 7000 });
}

/* rain and wind: a few hundred short strokes over the visible part of the park, batched into two paths */
function drawWeather(w, t, dt) {
  if (reduce || (!w.rain && w.wind < .2)) return;
  const x0 = -ox / sc, y0 = -oy / sc, vw = cw / sc, vh = ch / sc, gust = w.wind * (1 + .3 * Math.sin(t * 1.7));
  if (w.rain > 0) {
    const nDrops = Math.round(70 * QUAL.q * w.rain * Math.min(1.3, vw * vh / 6e5)), len = 20, dx = gust * 8; // enough to read as rain: in a squall every stroke costs on a phone
    ctx.beginPath();
    for (let i = 0; i < nDrops; i++) { // each drop falls on its own track, so no state is needed
      const s = (i * 9301 + 49297) % 233280 / 233280, u = (i * 4271 + 1237) % 99991 / 99991, f = ((t * (1.6 + s)) + u) % 1;
      const x = x0 + ((s * vw + f * dx * 40) % vw), y = y0 + f * (vh + 40) - 20; ctx.moveTo(x, y); ctx.lineTo(x + dx, y + len);
    }
    ctx.strokeStyle = 'rgba(214,230,255,.62)'; ctx.lineWidth = 1.9 / Math.min(1, sc); ctx.stroke();
  }
  if (w.wind > .2) {
    ctx.beginPath();
    for (let i = 0, nw = Math.round(8 * QUAL.q); i < nw; i++) { const s = (i * 7919) % 101 / 101, f = (t * (.25 + s * .2) * (.6 + gust) + s) % 1, x = x0 - 120 + f * (vw + 240), y = y0 + ((i * 0.618) % 1) * vh; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 40, y - 4, x + 90, y + 2); }
    ctx.strokeStyle = `rgba(230,240,255,${.12 + .15 * w.wind})`; ctx.lineWidth = 1.2 / sc; ctx.stroke();
  }
}
function drawParts() {
  if (!parts.length) return;
  const lv = [null, null, null, null]; let col = '';
  for (const p of parts) if (p.k === 'smoke') { const q = Math.min(3, Math.floor((1 - p.t / p.life) * 4)), path = lv[q] || (lv[q] = new Path2D()); path.moveTo(p.x + p.size, p.y); path.arc(p.x, p.y, p.size, 0, 7); col = p.col; }
  lv.forEach((path, q) => { if (!path) return; ctx.globalAlpha = .55 * (q + .5) / 4; ctx.fillStyle = col; ctx.fill(path); });
  ctx.globalAlpha = 1;
  ctx.beginPath(); let any = false;
  for (const p of parts) if (p.k === 'spark') { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); any = true; }
  if (any) { ctx.strokeStyle = '#ffe58a'; ctx.lineWidth = 1.4; ctx.stroke(); }
  // sparkles (little diamonds) and coins, one fill per colour
  const by = {}; for (const p of parts) if (p.k === 'star' || p.k === 'coin') { const a = 1 - p.t / p.life, s = p.size * (p.k === 'star' ? .6 + .6 * a : 1), path = by[p.col + p.k] || (by[p.col + p.k] = new Path2D()); if (p.k === 'star') { path.moveTo(p.x, p.y - s * 1.6); path.lineTo(p.x + s, p.y); path.lineTo(p.x, p.y + s * 1.6); path.lineTo(p.x - s, p.y); path.closePath(); } else { path.moveTo(p.x + s, p.y); path.ellipse(p.x, p.y, s * Math.abs(Math.cos(p.t * 9)) + .4, s, 0, 0, 7); } }
  for (const k in by) { ctx.fillStyle = k.replace(/(star|coin)$/, ''); ctx.fill(by[k]); }
  ctx.beginPath(); any = false;
  for (const p of parts) if (p.k === 'dust') { const a = 1 - p.t / p.life; ctx.moveTo(p.x + p.size * a, p.y); ctx.arc(p.x, p.y, p.size * (1.4 - a), 0, 7); any = true; }
  if (any) { ctx.fillStyle = 'rgba(214,196,150,.35)'; ctx.fill(); }
}
// what a broken ride shows when nothing may move: a still cloud, a spark mark, or a steady lamp
function staticFault(r, st, t) {
  const j = r.job; if (!j || j.type !== 'fault' || !(st === 'down' || st === 'degraded')) return;
  const x = r.x, y = r.y - 6 - 37 - 4;
  if (j.trade === 'ctrl') { // a warning lamp on a little post: flashes, or stays lit with reduced motion
    const on = reduce || Math.sin(t * 7) > -.2; ctx.fillStyle = '#05071a'; ctx.fillRect(x + 30, y + 14, 3, 12);
    if (on) { const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter'; glowOn(ctx, x + 31.5, y + 12, 16, st === 'down' ? '#ff5d4a' : '#ffb347', .9); ctx.globalCompositeOperation = op; }
    ctx.fillStyle = on ? (st === 'down' ? '#ff7a6a' : '#ffc46a') : '#5a3030'; ctx.strokeStyle = '#05071a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 31.5, y + 12, 4.5, 0, 7); ctx.fill(); ctx.stroke();
  } else if (reduce && j.trade === 'mech') { ctx.fillStyle = 'rgba(205,208,220,.8)'; ctx.beginPath(); ctx.arc(x - 6, y + 22, 6, 0, 7); ctx.arc(x + 2, y + 18, 8, 0, 7); ctx.arc(x + 9, y + 23, 5, 0, 7); ctx.fill(); }
  else if (reduce && j.trade === 'elec') { ctx.strokeStyle = '#ffe58a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y + 12); ctx.lineTo(x + 2, y + 19); ctx.lineTo(x - 2, y + 21); ctx.lineTo(x + 5, y + 29); ctx.stroke(); }
}

/* guests waiting for a ride stand in a line back along the path towards the junction */
function drawQueues(n) {
  const lines = {};
  for (const g of guests) if (g.wait > 0) (lines[g.ride] || (lines[g.ride] = [])).push(g);
  const night = n > .5, rad = 2.3, groups = GUESTC.map(() => new Path2D());
  for (const id in lines) {
    const r = L.ride(S, id); if (!r) continue;
    const nd = L.NODES[r.via] || L.NODES.P, ex = r.x, ey = r.y + 30, d = Math.hypot(nd.x - ex, nd.y - ey) || 1, ux = (nd.x - ex) / d, uy = (nd.y - ey) / d;
    lines[id].forEach((g, i) => { if (i > 18) return; const k = 3 + i * 4.6, zz = (i % 2 ? 1.6 : -1.6), x = ex + ux * k - uy * zz, y = ey + uy * k + ux * zz; if (g.ci == null) g.ci = Math.floor(Math.random() * GUESTC.length); groups[g.ci].moveTo(x + rad, y); groups[g.ci].arc(x, y, rad, 0, 7); });
  }
  GUESTC.forEach((c, i) => { ctx.fillStyle = c[night ? 1 : 0]; ctx.fill(groups[i]); });
}

/* people: an initial token for a head (the same shapes and colours as the crew cards) on a small body that walks */
const darker = c => mix(c, '#141a3c', .45);
function drawCrew(t, frac, dt) {
  if (ui.title) return;
  const b = boost(), on = S.crew.filter(c => c.on), talkers = on.filter(c => c.state === 'talk');
  let tx = 0, ty = 0; for (const c of talkers) { tx += c.x; ty += c.y; } if (talkers.length) { tx /= talkers.length; ty /= talkers.length; }
  const pos = on.map(c => { const p = prev[c.id] || [c.x, c.y]; return { c, x: p[0] + (c.x - p[0]) * frac, y: p[1] + (c.y - p[1]) * frac }; }).sort((a, b2) => a.y - b2.y);
  for (const { c, x, y } of pos) { // routes first, under everyone
    if (!(c.state === 'walk' || c.state === 'run')) continue;
    const d = c.fetch ? L.STORE : c.target ? L.ride(S, c.target) : c.dest ? L.ride(S, c.dest) : c.post || null;
    if (d) line([[x, y], [d.x, d.y]], 1.5, rgba(TC[rk(c)], .6), [4, 6]);
  }
  if (talkers.length > 1) { // a toolbox talk: a ring on the ground round each group standing together
    ctx.strokeStyle = rgba('#ffd27a', .55); ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
    for (const c of talkers) { const near = talkers.filter(o => Math.hypot(o.x - c.x, o.y - c.y) < 70); if (near[0] !== c || near.length < 2) continue; let mx = 0, my = 0; for (const o of near) { mx += o.x; my += o.y; } mx /= near.length; my /= near.length; const rr = Math.max(...near.map(o => Math.hypot(o.x - mx, o.y - my))) + 16 * b; ctx.beginPath(); ctx.ellipse(mx, my + 16 * b, rr, rr * .45, 0, 0, 7); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  for (const { c, x, y } of pos) {
    const v = VIS.crew[c.id] || (VIS.crew[c.id] = { x, y, face: 1, step: 0, mv: 0 }), dx = x - v.x, d = Math.hypot(dx, y - v.y);
    v.x = x; v.y = y; if (d > 40) { v.mv = 0; } else { v.step += d / 8; v.mv += ((dt > 0 && d / dt > 3 ? 1 : 0) - v.mv) * Math.min(1, dt * 10); }
    if (Math.abs(dx) > .02) v.face = dx > 0 ? 1 : -1;
    if (c.state === 'talk' && talkers.length > 1 && Math.abs(tx - x) > 2) v.face = tx > x ? 1 : -1;
    const fast = (c.state === 'run' || c.sprint > S.clock) && v.mv > .3;
    if (fast && !reduce && Math.random() < dt * 9) emit('dust', x - v.face * 5 * b, y + 21 * b, -v.face * rnd(4, 10), rnd(-4, 0), .5, 2.2, '');
    if (c.state === 'work' && !reduce && c.target && Math.random() < dt * 2.2) { const r = L.ride(S, c.target), j = r && r.job; if (j && j.trade === 'elec') for (let i = 0; i < 3; i++) emit('spark', x + v.face * 9 * b, y + 8 * b, rnd(-35, 35), rnd(-45, -10), .3, 1.2, ''); }
    drawPerson(c, x, y, v, t, b, fast);
  }
}
/* a person is drawn from a cached image of their pose (walk frame, facing, carrying, working, sitting, talking...);
   the markers that change all the time (selection, sprint, push, energy, You) are drawn live on top */
const PB = { x: -20, y: -26, w: 46, h: 52 }, personCache = {};
function drawPerson(c, x, y, v, t, b, fast) {
  const st = c.state, sel = ui.units.includes(c.id), face = v.face;
  const walking = v.mv > .3 && (st === 'walk' || st === 'run' || st === 'back'), carrying = !!(c.carry || (st === 'run' && c.dest));
  const cyc = (p, nf) => ((Math.floor(p * nf) % nf) + nf) % nf; // a looping animation, quantised to nf frames
  const frame = reduce ? 0 : walking ? cyc((v.step % 2) / 2, 6) : st === 'work' ? cyc(t * 11 / TAU, 6) : st === 'talk' ? cyc(t * 4 / TAU, 4) : 0;
  const key = [st, walking ? 1 : 0, frame, face, fast && !reduce ? 1 : 0, carrying ? 1 : 0, c.name[0]].join(','), k = sc * dprNow() * b;
  let pc = personCache[c.id]; if (!pc || pc.k !== k || pc.n > 80) pc = personCache[c.id] = { k, n: 0, m: {} };
  let img = pc.m[key];
  if (!img) { img = pc.m[key] = document.createElement('canvas'); pc.n++; img.width = Math.ceil(PB.w * k); img.height = Math.ceil(PB.h * k); const g = img.getContext('2d'); g.setTransform(k, 0, 0, k, -PB.x * k, -PB.y * k); paintPerson(g, c, { st, walking, frame, face, fast: fast && !reduce, carrying }); }
  ctx.save(); ctx.translate(x, y); ctx.scale(b, b); ctx.lineCap = 'round';
  if (c.sprint > S.clock) { ctx.strokeStyle = rgba('#8fe8c4', .85); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 22, 12, 4.5, 0, 0, 7); ctx.stroke(); }
  if (sel) { ctx.strokeStyle = '#79c2ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 16 + (reduce ? 0 : Math.sin(t * 5) * 1.5), 0, 7); ctx.stroke(); }
  ctx.restore();
  blitWorld(img, x + PB.x * b, y + PB.y * b, PB.w * b, PB.h * b, k / b);
  ctx.save(); ctx.translate(x, y); ctx.scale(b, b);
  if (c.push > S.clock) { ctx.strokeStyle = rgba('#ffb347', .9); ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  if (isMe(c)) { ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(0, 0, 21, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  if (c.role === 'tech' && !c.temp && !c.agency && L.enOf(c) < 70) { const e = L.enOf(c) / 100; ctx.fillStyle = 'rgba(16,20,47,.9)'; ctx.fillRect(-11, 25, 22, 4); ctx.fillStyle = e >= .6 ? '#5fd6a8' : e >= .3 ? '#ffb347' : '#ff5d4a'; ctx.fillRect(-10, 26, 20 * e, 2); }
  if (ui.coachUnit === c.id && !reduce) { ctx.strokeStyle = rgba('#ffb347', .55 + .45 * Math.sin(t * 7)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 6, 26, 0, 7); ctx.stroke(); }
  ctx.restore();
  if (isMe(c)) label('You', x, y - 25 * b, 12, '#ffd27a', 700);
}
function paintPerson(g, c, p) {
  const st = p.st, col = TC[rk(c)], body = darker(col), face = p.face, sw = p.walking ? Math.sin(p.frame / 6 * TAU) : 0;
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(0, 22, st === 'hurt' ? 13 : 8, 3, 0, 0, 7); g.fill();
  const limb = (x1, y1, x2, y2, w) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineWidth = w || 2.6; g.stroke(); };
  g.strokeStyle = '#05071a';
  if (st === 'hurt') { // lying down, with a first-aid cross
    g.fillStyle = body; g.beginPath(); g.roundRect(-4, 14, 18, 7, 3); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(8, 3, 8, 8); g.fillStyle = '#ff5d4a'; g.fillRect(11, 4, 2, 6); g.fillRect(9, 6, 6, 2);
  } else {
    const sitting = st === 'break'; g.save(); g.rotate(p.fast ? .25 * face : 0);
    g.strokeStyle = '#1b1f3e';
    if (sitting) { limb(-2, 16, face * 6, 17); limb(face * 6, 17, face * 6, 21); limb(2, 16, face * 8, 17); limb(face * 8, 17, face * 8, 21); }
    else { const s = (p.fast ? 4.5 : 3) * sw; limb(-1.5, 15, -1.5 + s, 21.5); limb(1.5, 15, 1.5 - s, 21.5); }
    g.fillStyle = body; g.strokeStyle = '#05071a'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(-4.5, sitting ? 9 : 7.5, 9, sitting ? 8 : 9, 3); g.fill(); g.stroke();
    g.strokeStyle = body;
    if (p.carrying) { limb(-2, 10, face * 6, 12); limb(2, 10, face * 7, 13); g.fillStyle = '#f7edd8'; g.strokeStyle = '#05071a'; g.lineWidth = 1.4; g.beginPath(); g.rect(face * 6 - 4, 9, 8, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(face * 6 - 4, 12.5); g.lineTo(face * 6 + 4, 12.5); g.stroke(); }
    else if (st === 'work') { const a = -.6 + .7 * Math.sin(p.frame / 6 * TAU), hx = face * (4 + 7 * Math.cos(a)), hy = 10 + 7 * Math.sin(a); limb(0, 10, hx, hy); g.strokeStyle = '#c9d0e4'; limb(hx, hy, hx + face * 4, hy - 3, 2); }
    else if (sitting) { limb(face * 2, 11, face * 7, 12); g.fillStyle = '#f7edd8'; g.fillRect(face * 7 - 2, 9, 4, 4); g.strokeStyle = 'rgba(247,237,216,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(face * 7, 8); g.quadraticCurveTo(face * 7 + 2, 5, face * 7, 2); g.stroke(); }
    else if (st === 'talk') { limb(-2, 10, -4, 15); limb(2, 10, face * 7, 8 + Math.sin(p.frame / 4 * TAU) * 1.5); }
    else { const s = 2.5 * sw; limb(-3, 10, -4 - s, 15); limb(3, 10, 4 + s, 15); }
    g.restore();
  }
  // the head: the same token as the crew card (round for tradespeople, square for everyone else)
  const hy = st === 'hurt' ? 13 : st === 'break' ? 2 : 0, hx = st === 'hurt' ? -9 : 0;
  g.fillStyle = col; g.strokeStyle = '#05071a'; g.lineWidth = 2.5; g.beginPath();
  if (c.role === 'tech') g.arc(hx, hy, 10, 0, 7); else g.roundRect(hx - 9.5, hy - 9.5, 19, 19, 5);
  g.fill(); g.stroke();
  g.fillStyle = '#16122b'; g.font = '800 11.5px "Familjen Grotesk", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.name[0], hx, hy + .8); g.textBaseline = 'alphabetic';
  // what they are doing, in a small bubble above the head
  const bub = (draw, bg) => { g.fillStyle = bg || '#f7edd8'; g.strokeStyle = '#05071a'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(8, hy - 22, 14, 11, 4); g.fill(); g.stroke(); g.beginPath(); g.moveTo(10, hy - 11.5); g.lineTo(9, hy - 8); g.lineTo(13, hy - 11.5); g.fill(); draw(); };
  if (st === 'talk') bub(() => { g.fillStyle = '#16122b'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(11.5 + i * 3.5, hy - 16.5, 1.1, 0, 7); g.fill(); } }, '#ffd27a');
  if (st === 'wait') bub(() => { g.strokeStyle = '#16122b'; g.lineWidth = 1.2; g.beginPath(); g.arc(15, hy - 16.5, 3.4, 0, 7); g.moveTo(15, hy - 18.5); g.lineTo(15, hy - 16.5); g.lineTo(16.5, hy - 15.5); g.stroke(); }, '#b79cf5');
  if (st === 'lock') bub(() => { g.strokeStyle = '#16122b'; g.lineWidth = 1.2; g.beginPath(); g.arc(15, hy - 18, 2, Math.PI, 0); g.stroke(); g.fillStyle = '#16122b'; g.fillRect(12.5, hy - 18, 5, 4); });
  if (st === 'diag' || st === 'check') bub(() => { g.strokeStyle = '#16122b'; g.lineWidth = 1.3; g.beginPath(); g.arc(14, hy - 17.5, 2.6, 0, 7); g.moveTo(16, hy - 15.5); g.lineTo(18.5, hy - 13); g.stroke(); });
  if (st === 'break') { g.font = '800 12px "Familjen Grotesk", system-ui, sans-serif'; g.lineWidth = 3; g.strokeStyle = '#05071a'; g.strokeText('z', 13, hy - 9); g.fillStyle = '#9fd4ff'; g.fillText('z', 13, hy - 9); }
}

/* the light of the day: cool at dawn, golden late afternoon, warm at dusk, darker under a squall. One fill, or none. */
function skyTint(clock, w) {
  let col = null, a = 0;
  if (clock < 600) { col = '#ffc9a8'; a = .1 * (1 - (clock - 540) / 60); }
  else if (clock >= 930 && clock < 1080) { col = '#ffb35a'; a = .07 * (clock - 930) / 150; }
  else if (clock >= 1080 && clock < 1230) { const k = (clock - 1080) / 150; col = '#ff7b3d'; a = .1 * Math.sin(k * Math.PI) + .07 * (1 - k); }
  const dark = Math.max(w.rain * .3, w.wind * .12);
  if (dark > a) { col = '#1c2440'; a = dark; }
  return col && a > .005 ? [col, a] : null;
}
