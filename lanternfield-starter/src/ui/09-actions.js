/* ---------- actions ---------- */
function send(c, r) { if (say(L.assign(S, c, r))) { SFX.send(); pings.push({ x: r.x, y: r.y, t0: performance.now(), col: '#79c2ff' }); } }
function pickUnit(id, add) {
  ui.sel = null;
  if (S.seat === 'tech') { ui.units = id === S.me ? [] : [id]; return; }
  if (add) { const i = ui.units.indexOf(id); if (i >= 0) ui.units.splice(i, 1); else { const c = L.staff(S, id); if (c && c.role === 'tech') ui.units = ui.units.filter(x => (L.staff(S, x) || {}).role === 'tech').concat(id); else ui.units = [id]; } }
  else ui.units = ui.units.length === 1 && ui.units[0] === id ? [] : [id];
}
function orderRide(r) { // everyone selected who can help goes; anyone at all can get stuck guests down
  const us = selUnits(), tr = r.job ? r.job.trade : L.primary(r); let n = 0, why = '';
  for (const c of us) {
    if (c.skills[tr]) { const res = L.assign(S, c, r); if (res === true) n++; else why = res; }
    else if (r.job && r.job.rescue) { if (L.moveOrder(S, c, r.x + c.ox, r.y + c.oy)) n++; }
    else why = `${c.name} is not qualified for ${L.TRADES[tr].toLowerCase()} work`;
  }
  if (n) { SFX.send(); pings.push({ x: r.x, y: r.y, t0: performance.now(), col: '#79c2ff' }); } else if (why) say(why);
}
function moveAll(x, y) {
  const us = selUnits(); if (!us.length) return;
  us.forEach((c, i) => L.moveOrder(S, c, x + (us.length > 1 ? (i % 3 - 1) * 24 : 0), y + Math.floor(i / 3) * 24));
  SFX.send(); pings.push({ x, y, t0: performance.now(), col: '#8fe8c4' });
}
function sendNearest(r) {
  const j = r && r.job; if (!j || j.type !== 'fault') return;
  const d = c => Math.hypot(c.x - r.x, c.y - r.y), free = S.crew.filter(c => c.role === 'tech' && c.on && !c.temp && !c.target);
  const q = free.filter(c => c.skills[j.trade]).sort((a, b) => d(a) - d(b))[0];
  if (q) { send(q, r); if (j.rescue) L.sprint(S, q); return; }
  const any = j.rescue && free.sort((a, b) => d(a) - d(b))[0];
  if (any) { L.moveOrder(S, any, r.x + any.ox, r.y + any.oy); L.sprint(S, any); SFX.send(); pings.push({ x: r.x, y: r.y, t0: performance.now(), col: '#ff9a8c' }); return; }
  say(`Nobody free for ${L.TRADES[j.trade].toLowerCase()} work. Recall someone or call a contractor.`);
}
function jumpAlert(step) {
  const al = L.alerts(S).filter(a => a.id); if (!al.length) { say('No alarms. All quiet.'); return; }
  ui.ai = step ? (ui.ai + 1) % al.length : 0; const r = L.ride(S, al[ui.ai].id);
  ui.sel = r.id; ui.units = []; focus(r.x, r.y, cam.z > cam.fit * 1.05);
}
const hold = () => { if (S.phase === 'day' && !ui.title && ui.held == null) { ui.held = S.paused; S.paused = true; } };
const unhold = () => { if (!ui.seats && !ui.role && ui.held != null) { S.paused = ui.held; ui.held = null; } };
function act(a, d, el, ev) {
  const day = S.phase === 'day';
  switch (a) {
    case 'seats': ui.seats = true; ui.pick = S.seat; ui.pickMe = S.me; hold(); break;
    case 'closeseats': ui.seats = false; unhold(); break;
    case 'role': ui.role = d.v || S.seat; hold(); break;
    case 'closerole': ui.role = null; unhold(); break;
    case 'pickseat': ui.pick = d.v; break;
    case 'setdiff': L.setDiff(S, d.v); break;
    case 'pickme': ui.pickMe = d.t; ui.pick = 'tech'; break;
    case 'takeseat': L.setSeat(S, d.v, d.v === 'tech' ? ui.pickMe || S.me : null); ui.coach = null; coachStart(); ui.seats = false; ui.role = null; ui.units = []; ui.sel = null; unhold(); SFX.send(); { const m = L.me(S); if (m && m.on) focus(m.x, m.y); } break;
    case 'ans': { const it = S.inbox.find(x => x.id === +d.id); if (L.answer(S, +d.id, d.v)) { SFX.send(); if (it && d.v !== 'brief') PT.q.push((S.clock - it.at) / (TPS0 * S.speed)); } break; }
    case 'ptcopy': { const ta = document.querySelector('.pt'); if (ta) { ta.select(); try { (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => say('Copied', 'var(--jade)'), () => { document.execCommand && document.execCommand('copy'); say('Selected: press Ctrl+C or Cmd+C to copy', 'var(--sky)'); }); } catch (e) { say('Selected: press Ctrl+C or Cmd+C to copy', 'var(--sky)'); } } break; }
    case 'ask': { const r = L.ask(S, d.k, { rid: d.id, sku: d.sku, tr: d.tr, k: d.pk, id: d.oid }); if (r === true) { SFX.send(); say('Asked. The answer comes in a few minutes; it shows top left meanwhile.', 'var(--sky)'); } else say(r, /said yes/.test(r) ? 'var(--jade)' : 'var(--ember)'); break; }
    case 'lock': if (L.lockout(S, false)) SFX.send(); break;
    case 'skiplock': L.lockout(S, true); break;
    case 'dx': L.diagnose(S, +d.i); break;
    case 'proc': if (L.procedure(S)) SFX.send(); break;
    case 'setstrat': if (S.seat === 'ceo') L.setStrategy(S, d.v); break;
    case 'walk': if (L.walk(S, d.v)) SFX.fix(); break;
    case 'svc': { const r = L.ride(S, d.id); if (r && L.orderService(S, r)) SFX.send(); break; }
    case 'fastlane': { const r = L.ride(S, d.id); if (r && L.fastLane(S, r)) SFX.cash(); break; }
    case 'happy': if (L.happyHour(S)) SFX.cash(); break;
    case 'brief': if (L.briefChair(S)) SFX.send(); break;
    case 'setfocus': if (may('focus')) L.setFocus(S, d.v); break;
    case 'budget': if (may('budget')) L.setBudget(S, +d.v); break;
    case 'me': { ui.units = []; ui.sel = null; const m = L.me(S); if (m && m.on) focus(m.x, m.y); break; }
    case 'goride': orderRide(L.ride(S, d.id)); break;
    case 'pause': if (day) S.paused = !S.paused; break;
    case 'speed': S.speed = +d.v; if (day) S.paused = false; break;
    case 'alert': if (d.id) { const r = L.ride(S, d.id); ui.sel = r.id; ui.units = []; focus(r.x, r.y, cam.z > cam.fit * 1.05); } break;
    case 'nearest': sendNearest(L.ride(S, d.id)); break;
    case 'gsend': orderRide(L.ride(S, d.id)); break;
    case 'sprint': if (selUnits().map(c => L.sprint(S, c)).some(Boolean)) SFX.send(); break;
    case 'rest': { const us = S.seat === 'tech' && !selUnits().length ? [L.me(S)].filter(Boolean) : selUnits(); if (us.map(c => L.rest(S, c)).some(Boolean)) SFX.send(); else say(us.length ? 'Nobody selected needs a break' : 'Select someone first'); break; }
    case 'rush': { const r = L.ride(S, d.id || ui.sel); if (r && may('rush') && L.rush(S, r)) SFX.send(); else say(may('rush') ? 'Select a broken ride first' : 'Rush jobs are the manager\'s call'); break; }
    case 'callin': { const c = L.staff(S, d.t || ui.tech); if (c && L.callIn(S, c)) SFX.cash(); break; }
    case 'agency': if (L.agency(S)) SFX.cash(); break;
    case 'vouch': { const r = L.ride(S, d.id); if (r && L.vouch(S, r)) SFX.cash(); break; }
    case 'push': if (selUnits().map(c => L.pushOn(S, c)).some(Boolean)) SFX.send(); break;
    case 'stop': for (const c of selUnits()) L.standDown(S, c); break;
    case 'crowd': if (!may('crowd')) { say(`Crowd-pleasers are the ${L.SEATNAME.dir}'s call.`); break; } if (L.crowdPleaser(S)) SFX.cash(); else say(S.cash < 250 ? 'Not enough cash' : 'Not ready yet'); break;
    case 'allfree': if (S.seat === 'tech') { ui.units = []; break; } ui.units = S.crew.filter(c => c.role === 'tech' && c.on && !c.temp && !c.target).map(c => c.id); ui.sel = null; break;
    case 'mute': setSound(!snd.on); if (snd.on) SFX.ready(); break;
    case 'sound': setSound(d.v === 'on'); if (snd.on) SFX.ready(); break;
    case 'motion': setMotion(d.v); break;
    case 'help': ui.help = true; break;
    case 'closehelp': if (d.self && ev && ev.target !== el) return; ui.help = false; break;
    case 'begin': if (!(S.reports.length || S.phase === 'day') && (ui.pick && ui.pick !== S.seat || ui.pick === 'tech')) L.setSeat(S, ui.pick, ui.pickMe); ui.role = null; ui.title = false; lanterns.length = 0; ui.reportAt = 0; ui.tab = S.closed ? 'report' : 'company'; SFX.send(); break;
    case 'restart': ui.coach = null; ui.dc = null; ui.coachRide = ui.coachUnit = null; fitView(); ui.units = []; ui.pick = S.seat; ui.pickMe = null; S = L.newGame((Math.random() * 4e9) >>> 0); ui.title = true; ui.help = false; ui.seats = false; ui.role = null; ui.held = null; ui.desk = null; ui.tab = 'company'; ui.sel = ui.tech = null; guests.length = 0; break;
    case 'desk': if (day) ui.desk = true; ui.tab = d.v || 'company'; break;
    case 'closedesk': ui.desk = null; break;
    case 'tab': ui.tab = d.v; break;
    case 'coachnext': if (ui.coach) ui.coach.clicked = true; break;
    case 'coachskip': coachOff(true); break;
    case 'dcnext': if (ui.dc) { ui.dc.i++; const st = DESKC[ui.dc.i]; if (!st) { ui.dc = null; markCoached('desk'); } else if (st.tab) ui.tab = st.tab; } break;
    case 'dcskip': ui.dc = null; markCoached('desk'); break;
    case 'go': L.startDay(S); ui.dc = null; coachStart(); ui.desk = null; ui.sel = ui.tech = null; guests.length = 0; lanterns.length = 0; S.paused = false; ui.tab = 'team'; SFX.send(); break;
    case 'sel': { ui.sel = d.id; ui.tech = null; const r = L.ride(S, d.id); if (r) focus(r.x, r.y); break; }
    case 'desel': case 'park': ui.sel = null; ui.tech = null; break;
    case 'objt': ui.obj = !ui.obj; break;
    case 'logt': ui.log = !ui.log; break;
    case 'zoom': zoomAt(ins.l + (cw - ins.l - ins.r) / 2, ins.t + (ch - ins.t - ins.b) / 2, cam.z * +d.v); break;
    case 'fit': fitView(); break;
    case 'focus': focus(+d.x, +d.y, true); break;
    case 'tech': { pickUnit(d.id, (ev && ev.shiftKey) || (ui.touch && ui.units.length > 0 && (L.staff(S, d.id) || {}).role === 'tech')); const c = ui.units.length === 1 ? L.staff(S, ui.units[0]) : S.seat === 'tech' && d.id === S.me && L.me(S); if (c && c.on) focus(c.x, c.y); break; }
    case 'send': send(L.staff(S, d.t), L.ride(S, d.id)); break;
    case 'recall': L.standDown(S, L.staff(S, d.t)); break;
    case 'mode': L.setMode(S, L.ride(S, d.id), d.v); break;
    case 'stand': if (ui.tech) L.standDown(S, L.staff(S, ui.tech)); break;
    case 'hold': if (ui.tech && L.holdOver(S, L.staff(S, ui.tech))) SFX.cash(); break;
    case 'holdp': if (L.holdOver(S, L.staff(S, d.t))) SFX.cash(); break;
    case 'callout': if (L.callout(S, L.ride(S, d.id))) SFX.cash(); break;
    case 'order': if (say(L.order(S, d.k, d.v))) SFX.cash(); break;
    case 'min': if (!may('stock')) break; S.min[d.k] = clamp(S.min[d.k] + +d.v, 0, 5); break;
    case 'shift': L.setShift(S, L.staff(S, d.t), d.v); break;
    case 'hire': if (L.hire(S, +d.i)) SFX.cash(); break;
    case 'dismiss': L.dismiss(S, L.staff(S, d.t)); break;
    case 'train': if (L.train(S, L.staff(S, d.t), d.k)) SFX.cash(); break;
    case 'advert': if (L.advertise(S)) SFX.send(); break;
    case 'raise': if (L.payRise(S, L.staff(S, d.t))) SFX.cash(); break;
    case 'meal': if (L.teamMeal(S)) SFX.cash(); break;
    case 'advance': if (L.advance(S)) SFX.cash(); break;
    case 'dept': ui.dept = d.v; break;
    case 'orgh': if (L.hireOrg(S, d.k)) SFX.send(); break;
    case 'orgf': L.fireOrg(S, d.k); break;
    case 'consult': if (L.consult(S)) SFX.cash(); break;
    case 'perk': if (L.buyPerk(S, d.k)) SFX.cash(); break;
    case 'ovh': if (L.overhaul(S, L.ride(S, d.id))) SFX.cash(); break;
    case 'pol': if (!may('policy')) break; S.pol[d.k] = d.k === 'auto' ? d.v === 'true' : d.k === 'pm' ? +d.v : d.v; break;
    default: return;
  }
  renderUI(); save();
}
function worldPt(ev) { const b = cv.getBoundingClientRect(); return [(ev.clientX - b.left - ox) / sc, (ev.clientY - b.top - oy) / sc]; }
function hit(x, y) {
  const ur = Math.max(16, 20 / sc), rr = Math.max(44, 34 / sc);
  for (const c of S.crew) if (c.on && !c.temp && (Math.hypot(c.x - x, c.y - y) < ur || Math.hypot(c.x - x, c.y + 14 * boost() - y) < ur * .8)) return { unit: c }; // the head token, or the body under it
  let best = null, bd = rr;
  for (const r of S.rides) { const d = Math.hypot(r.x - x, r.y - (y - 8)); if (d < bd) { bd = d; best = r; } }
  if (best) return { ride: best };
  if (Math.abs(x - L.STORE.x) < 40 && Math.abs(y - L.STORE.y) < 26) return { store: true };
  return {};
}
function tap(ev, right) {
  if (ui.title || S.phase !== 'day' || S.paused) return;
  const [x, y] = worldPt(ev), h = hit(x, y), us = selUnits();
  if (S.seat === 'tech') { // you can only move yourself
    const m = L.me(S), can = r => m && m.on && r.job && (r.job.rescue || m.skills[r.job.trade]);
    if (h.unit && !right) pickUnit(h.unit.id);
    else if (h.ride) { if (right || (can(h.ride) && !m.target)) orderRide(h.ride); else { ui.sel = h.ride.id; ui.units = []; } }
    else if (h.store && !right) { ui.desk = true; ui.tab = 'stores'; }
    else if (m && m.on && (right || ev.pointerType !== 'mouse')) moveAll(x, y);
    else { ui.sel = null; ui.units = []; }
    renderUI(); return;
  }
  if (right) { if (us.length) { if (h.ride) orderRide(h.ride); else moveAll(x, y); renderUI(); } return; }
  if (h.unit) pickUnit(h.unit.id, ev.shiftKey);
  else if (h.ride) { const j = h.ride.job; if (us.length && j && (j.rescue || us.some(c => c.skills[j.trade]))) orderRide(h.ride); else { ui.sel = h.ride.id; ui.units = []; } }
  else if (h.store) { ui.desk = true; ui.tab = 'stores'; }
  else if (us.length && ev.pointerType !== 'mouse') moveAll(x, y);
  else { ui.sel = null; ui.units = []; }
  renderUI();
}
function bind() {
  document.addEventListener('click', ev => { const el = ev.target.closest('[data-a]'); if (el && !el.disabled) act(el.dataset.a, el.dataset, el, ev); });
  /* map. Mouse: left-drag boxes a selection, right or middle-drag moves the map, right-click orders. Touch: drag moves the map, pinch zooms, tap selects or orders. */
  const ptrs = new Map(); let drag = null, pinch = null;
  cv.addEventListener('contextmenu', ev => ev.preventDefault());
  cv.addEventListener('pointerdown', ev => {
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic pointer */ }
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ptrs.size === 1) { const box = ev.pointerType === 'mouse' && ev.button === 0 && !ui.title && S.phase === 'day' && !S.paused && S.seat !== 'tech'; drag = { x: ev.clientX, y: ev.clientY, cx: cam.x, cy: cam.y, moved: false, mode: box ? 'box' : 'pan', btn: ev.button }; pinch = null; }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z }; drag = null; ui.box = null; }
  });
  cv.addEventListener('pointermove', ev => {
    if (!ptrs.has(ev.pointerId)) { if (!ui.title && S.phase === 'day') { const [x, y] = worldPt(ev), h = hit(x, y); cv.style.cursor = h.unit || h.ride || h.store ? 'pointer' : 'default'; } return; }
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], b0 = cv.getBoundingClientRect(); zoomAt((a.x + b.x) / 2 - b0.left, (a.y + b.y) / 2 - b0.top, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); }
    else if (drag) {
      const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; if (drag.mode === 'pan') cv.style.cursor = 'grabbing'; }
      if (drag.moved && drag.mode === 'pan') { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; cam.user = true; applyCam(); }
      else if (drag.moved) { const b = cv.getBoundingClientRect(); ui.box = { x0: drag.x - b.left, y0: drag.y - b.top, x1: ev.clientX - b.left, y1: ev.clientY - b.top }; }
    }
  });
  const end = ev => {
    if (!ptrs.has(ev.pointerId)) return;
    ptrs.delete(ev.pointerId);
    if (drag && !drag.moved && ev.type === 'pointerup' && drag.btn !== 1) tap(ev, drag.btn === 2);
    else if (drag && drag.mode === 'box' && ui.box) {
      const b = ui.box, wx0 = (Math.min(b.x0, b.x1) - ox) / sc, wx1 = (Math.max(b.x0, b.x1) - ox) / sc, wy0 = (Math.min(b.y0, b.y1) - oy) / sc, wy1 = (Math.max(b.y0, b.y1) - oy) / sc;
      const got = S.crew.filter(c => c.role === 'tech' && c.on && !c.temp && c.x >= wx0 && c.x <= wx1 && c.y >= wy0 && c.y <= wy1).map(c => c.id);
      ui.units = ev.shiftKey ? [...new Set(ui.units.concat(got))] : got; if (got.length) ui.sel = null; renderUI();
    }
    ui.box = null; drag = null; if (ptrs.size < 2) pinch = null;
    cv.style.cursor = 'default';
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', ev => { ev.preventDefault(); const b = cv.getBoundingClientRect(); zoomAt(ev.clientX - b.left, ev.clientY - b.top, cam.z * Math.exp(-ev.deltaY * .0015)); }, { passive: false });
  /* minimap: tap or drag to move the camera */
  let mdown = false;
  const mgo = ev => { const b = mv.getBoundingClientRect(); cam.x = (ev.clientX - b.left) / b.width * W; cam.y = (ev.clientY - b.top) / b.height * H; cam.user = true; if (cam.z <= cam.fit * 1.02) cam.z = Math.min(Math.max(cam.fit * 1.5, 1), Math.max(2.2, cam.fit * 2)); applyCam(); };
  mv.addEventListener('pointerdown', ev => { mdown = true; try { mv.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic pointer */ } mgo(ev); });
  mv.addEventListener('pointermove', ev => { if (mdown) mgo(ev); });
  mv.addEventListener('pointerup', () => { mdown = false; }); mv.addEventListener('pointercancel', () => { mdown = false; });
  document.addEventListener('keydown', ev => {
    unlockAudio();
    if (ev.target.closest && ev.target.closest('input,textarea') && ev.key !== 'Escape') return; // a slider keeps its arrow keys; Escape still closes
    if (ev.key === 'Escape') { if (ui.help) ui.help = false; else if (ui.role) { ui.role = null; unhold(); } else if (ui.seats) { ui.seats = false; unhold(); } else if (ui.desk) ui.desk = null; else { ui.sel = null; ui.tech = null; } renderUI(); return; }
    if (ui.seats || ui.role) return;
    if (ui.title || ui.help || S.phase !== 'day') return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === 'p') { if (!ui.seats && !ui.role) S.paused = !S.paused; renderUI(); return; }
    if (S.paused || ui.desk || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (k === ' ' || k === 'Tab') { ev.preventDefault(); jumpAlert(k === 'Tab' || ev.repeat); renderUI(); return; }
    const pan = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (pan) { ev.preventDefault(); cam.x += pan[0] * 70 / cam.z; cam.y += pan[1] * 70 / cam.z; cam.user = true; applyCam(); return; }
    if (k === '+' || k === '=') { zoomAt(cw / 2, ch / 2, cam.z * 1.25); return; }
    if (k === '-') { zoomAt(cw / 2, ch / 2, cam.z / 1.25); return; }
    if (k === 'f' || k === 'Home') { fitView(); return; }
    const hot = { a: 'allfree', q: 'sprint', w: 'push', s: 'stop', c: 'crowd', b: 'rest', r: 'rush' }[k];
    if (hot) { act(hot, {}); return; }
    if (k === 'e') { const r = ui.sel && L.ride(S, ui.sel); if (r) { if (S.seat === 'tech') orderRide(r); else sendNearest(r); renderUI(); } else say('Select a broken ride first. Space jumps to the next alarm.'); return; }
    if (S.seat === 'tech') { if (/^Digit/.test(ev.code || '')) { act('me', {}); } return; }
    const techs = S.crew.filter(c => c.role === 'tech' && !c.temp), n = ev.code && ev.code.startsWith('Digit') ? +ev.code.slice(5) : 0;
    if (n >= 1 && n <= techs.length) { pickUnit(techs[n - 1].id, ev.shiftKey); renderUI(); }
  });
  // volume sliders (in How to play): they are inputs, not buttons, so they report through 'input'
  document.addEventListener('input', ev => { const el = ev.target.closest && ev.target.closest('input[data-vol]'); if (el) setVolume(el.dataset.vol, +el.value / 100); });
  document.addEventListener('pointerdown', ev => { unlockAudio(); ui.touch = ev.pointerType !== 'mouse'; if (ev.target.closest('button')) { ui.pdown = true; ui.pdownAt = performance.now(); } });
  const up = () => { if (ui.pdown) { ui.pdown = false; setTimeout(renderUI, 0); } };
  document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  window.addEventListener('pagehide', save);
  const ro = new ResizeObserver(resize); ro.observe($('app')); ro.observe($('top')); ro.observe($('dock'));
}


function drainFx(t) {
  for (const f of S.fx) {
    if (SFX[f.k]) SFX[f.k](f);
    try { feel(f, t); } catch (e) { /* feedback is a nice-to-have */ }
    const r = f.id && L.ride(S, f.id);
    if (r && f.txt) pops.push({ id: r.id, x: r.x, y: r.y - 20 * pops.filter(p => p.id === r.id && t - p.t0 < 1800).length, txt: f.k === 'fast' ? '⚡ ' + f.txt : f.txt, t0: t, big: f.k === 'fast' || f.k === 'cash', col: f.k === 'fix' || f.k === 'cash' ? '#8fe8c4' : f.k === 'warn' ? '#ffd27a' : f.k === 'fast' || f.k === 'ready' ? '#9fd4ff' : '#ff9a8c' });
    if (f.k === 'close') {
      try { ptTrack(); ptClose(); } catch (e) { /* nice-to-have */ }
      ui.reportAt = t + (reduce ? 300 : 3600); ui.sel = ui.tech = null; ui.desk = null; ui.tab = 'report';
      const rep = S.reports[S.reports.length - 1];
      if (!reduce) for (const id of rep.lit) { const rr = L.ride(S, id); for (let i = 0; i < 4; i++) lanterns.push({ x: rr.x + (Math.random() - .5) * 20, y: rr.y - 16, vy: 16 + Math.random() * 14, ph: Math.random() * 6, t0: t + i * 260, life: 5200 }); }
    }
  }
  S.fx.length = 0;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* no storage: the week simply does not carry over */ } }
const saneSave = s => !!(s && s.v === 7 && Array.isArray(s.rides) && s.rides.length >= L.N_RIDES && s.rides.every(r => r && r.id && Number.isFinite(r.health)) && Array.isArray(s.crew) && s.org && s.sc && L.LV.every(x => s.sc[x]) && (s.phase === 'plan' || s.phase === 'day') && Number.isFinite(s.clock) && Number.isFinite(s.day) && Number.isFinite(s.cash) && Array.isArray(s.reports) && Array.isArray(s.feed) && Array.isArray(s.inbox));
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); return saneSave(s) ? s : null; } catch (e) { return null; } }

let last = 0, acc = 0, lastUI = 0, lastSave = 0, lastMini = 0;
function frame(t) {
  requestAnimationFrame(frame);
  try { tick(t); } catch (e) { oops('frame', e); try { const d = Math.min(window.devicePixelRatio || 1, 2); ctx.setTransform(d, 0, 0, d, 0, 0); } catch (e2) { /* keep the loop alive */ } }
}
function tick(t) {
  const dt = last ? Math.min(.1, (t - last) / 1000) : 0; last = t;
  const run = !ui.title && !ui.help && !ui.seats && !ui.role && !S.paused && S.phase === 'day' && !coachHold();
  VIS.run = run; // the living park moves only while the park clock does
  if (run) {
    acc += dt * TPS * S.speed;
    while (acc >= 1 && S.phase === 'day') { for (const c of S.crew) prev[c.id] = [c.x, c.y]; L.step(S); acc -= 1; drainFx(t); if (S.paused) break; }
    if (S.phase !== 'day' || S.paused) acc = 0;
    stepGuests(dt * TPS * S.speed);
  } else if (ui.title && !reduce) stepGuests(dt * TPS);
  draw(t, run ? Math.min(1, acc) : 1);
  hudTick(t); // the top-bar numbers counting to their new values
  ambTick(t); musicTick(); // the park's sound and the music follow the game
  if (t - lastMini > 90) { drawMini(t); lastMini = t; } // the minimap is small: about ten redraws a second is plenty
  if (t - lastUI > 140) { renderUI(); lastUI = t; }
  if (t - lastSave > 5000) { save(); lastSave = t; }
}
function start(data) {
  S = (data && saneSave(data.state) ? data.state : null) || load() || L.newGame(20261115);
  ui.pick = S.seat; ui.pickMe = S.me;
  S.fx = S.fx || []; S.paused = true; S.speed = Math.min(2, S.speed || 1);
  if (data && data.state) ui.title = false;
  if (S.closed) ui.tab = 'report';
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ state: S }));
  for (const [n, fn] of [['bind', bind], ['resize', resize], ['render', renderUI]]) { try { fn(); } catch (e) { oops('start ' + n, e); } }
  requestAnimationFrame(frame);
}
window.LFUI = { get state() { return S; }, act, ui, scr: (x, y) => [ox + x * sc, oy + y * sc], labels: () => mapLabels.map(l => ({ ...l })), quality: () => QUAL.q, feel: () => ({ flash: !reduce && performance.now() - (FEEL.flashT || -1e9) < 440, shake: !!shakeNow(performance.now()) }) }; // the last one is for tests: where a park point is on screen
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
