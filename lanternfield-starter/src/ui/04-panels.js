/* ---------- panels ---------- */
/* Panels are patched in place rather than rebuilt: an element that is still there keeps its identity, so a timer bar can
   slide to its new width, a card that is new slides in once, and focus and scroll stay put. Elements are matched by
   data-key (or data-fk), otherwise by tag and position. Clicks are delegated from the document, so nothing is lost. */
const morphTpl = document.createElement('template');
const nodeKey = n => n.nodeType === 1 ? (n.getAttribute('data-key') || n.getAttribute('data-fk')) : null;
const sameNode = (a, b) => a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.tagName === b.tagName && nodeKey(a) === nodeKey(b)));
function patchNode(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  const aa = a.attributes;
  for (let i = aa.length - 1; i >= 0; i--) { const n = aa[i].name; if (!b.hasAttribute(n)) a.removeAttribute(n); }
  for (const { name, value } of b.attributes) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  morphChildren(a, b);
  if (a.tagName === 'TEXTAREA' && a.value !== b.textContent) a.value = b.textContent;
}
function morphChildren(from, to) {
  let a = from.firstChild, b = to.firstChild;
  while (b) {
    const nb = b.nextSibling;
    if (!a) from.appendChild(b);
    else if (sameNode(a, b)) { patchNode(a, b); a = a.nextSibling; }
    else {
      const k = nodeKey(b); let m = null;
      if (k) for (let x = a.nextSibling; x; x = x.nextSibling) if (nodeKey(x) === k) { m = x; break; }
      if (m) { from.insertBefore(m, a); patchNode(m, b); }
      else if (!k && !nodeKey(a) && a.nodeType === b.nodeType && a.nodeType === 1 && a.tagName === b.tagName) { patchNode(a, b); a = a.nextSibling; }
      else from.insertBefore(b, a);
    }
    b = nb;
  }
  while (a) { const n = a.nextSibling; from.removeChild(a); a = n; }
}
function setHTML(el, html) {
  if (el._h === html) return;
  // a dialog that closes fades out for a moment (it ignores the pointer and the keyboard while it does)
  if (el.id === 'modal') {
    clearTimeout(el._bye); el.classList.remove('leaving'); el.inert = false;
    if (!html && el.firstElementChild && !reduce) { el._h = html; el.classList.add('leaving'); el.inert = true; el._bye = setTimeout(() => { el.classList.remove('leaving'); el.inert = false; if (el._h === '') el.textContent = ''; }, 170); return; }
  }
  const f = document.activeElement, fk = f && el.contains(f) ? f.getAttribute('data-fk') : null, st = el.scrollTop, sl = el.scrollLeft, inner = el.querySelector('.dialog'), ist = inner ? inner.scrollTop : 0;
  const keep = {}; for (const x of el.querySelectorAll('[data-sc]')) keep[x.dataset.sc] = x.scrollTop;
  morphTpl.innerHTML = html; morphChildren(el, morphTpl.content); el._h = html; el.scrollTop = st; el.scrollLeft = sl;
  for (const x of el.querySelectorAll('[data-sc]')) if (keep[x.dataset.sc]) x.scrollTop = keep[x.dataset.sc];
  const ni = el.querySelector('.dialog'); if (ni && ist && ni !== inner) ni.scrollTop = ist;
  if (fk && document.activeElement !== f) { const n = el.querySelector(`[data-fk="${fk}"]`); if (n) n.focus({ preventScroll: true }); }
}
const pips = (n, tr) => `<span class="pips t-${tr}" aria-label="grade ${n} of 3">${[1, 2, 3].map(i => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>`;
const avHTML = c => `<span class="av t-${rk(c)}" aria-hidden="true">${esc(c.name[0])}</span>`;
const gradeOf = c => c.role === 'tech' ? L.topSkill(c)[1] : c.role === 'mach' ? c.grade : 0;
const skillsHTML = c => c.role === 'tech' ? Object.entries(c.skills).sort((a, b) => b[1] - a[1]).map(([tr, g]) => `<span>${L.TRADES[tr].slice(0, 4)} ${pips(g, tr)}</span>`).join(' ') : c.role === 'mach' ? pips(c.grade, 'mach') : '';
function shiftLine(c) {
  if (c.temp) return 'One job, then leaves';
  if (c.agency) return `Agency, here until ${fmtClock(c.agency)}`;
  if (L.isMgr(c)) return 'Office hours';
  if (c.sick) return 'Off sick today';
  const [a, b] = L.SHIFT[c.shift];
  if (S.phase !== 'day') return SHIFTS[c.shift];
  return c.on ? `On until ${fmtClock(b)}${c.shift === 'full' ? ' (overtime)' : ''}` : S.clock < a ? `Starts ${fmtClock(a)}` : 'Gone home';
}
function staffLine(c) {
  if (c.sick) return 'Called in sick';
  if (!c.on && c.inAt && S.phase === 'day' && S.clock < c.inAt) return `${c.agency ? 'Agency' : 'Called in'}: on site about ${fmtClock(c.inAt)}`;
  if (!c.on) return c.temp ? `Arrives ${fmtClock(c.arrive)}` : S.phase === 'day' && S.clock >= L.SHIFT[c.shift][0] ? 'Off shift' : 'Not in yet';
  if (L.isMgr(c)) return MGRDEPT[c.role];
  if (c.role === 'store') { const d = c.dest && L.ride(S, c.dest); return c.state === 'run' && d ? `Running a part to ${d.short}` : c.state === 'back' || c.state === 'run' ? 'Heading back to stores' : 'At the counter'; }
  if (c.role === 'mach') return S.fab.length ? `Making ${L.SKU[S.fab[0].sku][0].toLowerCase()}` : 'Workshop idle';
  if (c.role === 'sup') return S.seat === 'sup' ? 'You are running the shift' : S.pol.auto ? 'Running the shift' : 'Standing by';
  const d = c.target && L.ride(S, c.target);
  if (c.fetch) return 'Fetching a part from stores';
  if (d && c.state === 'walk') return `Walking to ${d.short}`;
  if (d && c.state === 'wait') return `Waiting for a part at ${d.short}`;
  if (d && c.state === 'work') return `${d.job && d.job.type === 'service' ? 'Servicing' : 'Fixing'} ${d.short}`;
  if (c.state === 'hurt') return 'Hurt, having first aid';
  if (c.state === 'break') return 'On a break';
  if (c.state === 'talk') return 'At the toolbox talk';
  if (c.state === 'wake') return 'Getting going';
  if (d && c.state === 'prep') return `At ${d.short}, not locked out`;
  if (d && c.state === 'lock') return `Locking out ${d.short}`;
  if (d && (c.state === 'diag' || c.state === 'check')) return `Finding the fault on ${d.short}`;
  return 'Free';
}
function eta(c, r) {
  const j = r.job, d = Math.hypot(c.x - (r.x + c.ox), c.y - (r.y + c.oy)), tr = j ? j.trade : L.primary(r), rt = L.rate(S, c, tr);
  return { walk: Math.ceil(d / L.speed(S)), work: rt ? Math.ceil(Math.max(0, (j ? L.need(j) - j.prog : 45)) / rt) : 0, tr };
}
/* the numbers on the top bar count to their new value (about half a second, easing out) instead of jumping;
   cash tints green or red for a moment when it moves. A small routine change (minStep) just changes: cash ticks up a
   little every park minute, and counting that would redraw the top bar every frame. Reduced motion: they simply change. */
const counters = {};
function countTo(id, value, fmt, tint, minStep) {
  const now = performance.now();
  let c = counters[id];
  if (!c) c = counters[id] = { el: $(id), from: value, to: value, shown: value, t0: now };
  c.fmt = fmt;
  if (value !== c.to && Math.abs(value - c.shown) < (minStep || 0)) { c.from = c.to = value; }
  else if (value !== c.to) {
    if (!reduce && !ui.title && tint && Math.abs(value - c.shown) >= tint) { const base = getComputedStyle(c.el).color; c.el.animate([{ color: value > c.shown ? '#8fe8c4' : '#ff8f7f' }, { color: base }], { duration: 900, easing: 'ease-out' }); }
    c.from = c.shown; c.to = value; c.t0 = now;
  }
  if (reduce || ui.title) c.shown = c.to;
  paintCounter(c, now);
}
function paintCounter(c, now) {
  const k = Math.min(1, (now - c.t0) / 550), e = 1 - Math.pow(1 - k, 3);
  c.shown = k >= 1 ? c.to : c.from + (c.to - c.from) * e;
  const txt = c.fmt(c.shown); if (c.el.textContent !== txt) c.el.textContent = txt;
}
function hudTick(now) { for (const id in counters) { const c = counters[id]; if (c.shown !== c.to) paintCounter(c, now); } }
const pop = el => { if (!reduce) el.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.3,1)' }); };
function hudUpdate() {
  const day = S.phase === 'day';
  $('h-day').textContent = `Day ${upcoming() > L.DAYS ? L.DAYS : upcoming()} of ${L.DAYS}`; $('h-dow').textContent = L.dow(Math.min(L.DAYS, upcoming()));
  $('h-clock').textContent = day ? fmtClock(S.clock) : S.closed ? 'Closed' : '08:30';
  const run = !S.paused && day && !ui.title && !ui.help && !ui.seats && !ui.role;
  const wait = run && coachHold();
  $('b-pause').setAttribute('aria-pressed', String(!run || wait)); $('b-pause').textContent = wait ? 'Waiting' : run ? 'Pause' : 'Paused';
  for (const [v, id] of [[.5, 'b-sh'], [1, 'b-s1'], [2, 'b-s2']]) $(id).setAttribute('aria-pressed', String(run && S.speed === v));
  countTo('h-cash', Math.round(S.cash), v => fmtMoney(Math.round(v)), 100, 100); $('h-cash').className = 'num' + (S.cash < 0 ? ' neg' : '');
  countTo('h-up', day && S.d.upT ? Math.round(S.d.upW / S.d.upT * 100) : S.reports.length ? Math.round(S.reports[S.reports.length - 1].up * 100) : 100, v => Math.round(v) + '%');
  countTo('h-conf', Math.round(S.conf), v => String(Math.round(v))); $('h-conf').className = 'num' + (S.conf < 30 ? ' neg' : '');
  countTo('h-glow', Math.round(S.glow), v => String(Math.round(v))); $('h-glowbar').style.width = Math.round(S.glow) + '%';
  $('h-glowbar').style.background = S.glow >= 60 ? 'var(--lantern)' : S.glow >= 35 ? 'var(--mech)' : 'var(--ember)';
  countTo('h-lit', S.total, v => `${Math.round(v)}/${L.N_RIDES * L.DAYS}`);
  { // the streak: a pip for each quick fix up to the ×6 bonus cap, warmer as it builds; a lost streak cracks
    const e = $('h-streak'), n = S.streak || 0, v = '×' + n, box = $('s-streak');
    if (e.textContent !== v) {
      const was = e._n || 0;
      if (n > was) pop(e);
      else if (was >= 2 && n === 0 && !ui.title) { SFX.lost(); if (!reduce) box.animate([{ transform: 'none' }, { transform: 'translateX(-5px)', color: '#ff8f7f' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 380, easing: 'ease-out' }); }
      e._n = n; e.textContent = v;
      box.className = 'stat' + (n >= 6 ? ' heat3' : n >= 4 ? ' heat2' : n >= 2 ? ' heat1' : '');
      box.querySelectorAll('.spips i').forEach((p, i) => p.classList.toggle('on', i < Math.min(6, n)));
    }
  } $('h-streak').style.color = S.streak >= 3 ? 'var(--jade)' : '';
  { const b = $('b-seat'), t = `<small>Seat</small>${esc(seatTitle(S.seat))}`; if (b._h !== t) { b.innerHTML = t; b._h = t; } }
  const us = selUnits(), arm = us.length && day && !ui.title && !ui.desk && !S.paused && S.seat !== 'tech'; $('armed').hidden = !arm;
  if (arm) $('armed').textContent = `${us.length === 1 ? us[0].name : us.length + ' people'} selected. ${ui.touch ? 'Tap a ride to send, tap the ground to move.' : 'Click a fault to send. Right-click to move or send.'}${L.RANK[S.seat] >= 2 && L.onNow(S, 'sup') && S.pol.auto ? ' You are going over the supervisor\'s head.' : ''}`;
  const now = performance.now(), f = S.feed[0];
  if (f && f.id !== ui.lastFeed) { ui.lastFeed = f.id; ui.tick = f; ui.tickUntil = now + 5500; }
  const tk = $('ticker'), was = tk.textContent;
  if (now < ui.msgUntil) { tk.textContent = ui.msg; tk.style.setProperty('--c', ui.msgc || 'var(--ember)'); }
  else if (ui.tick && now < ui.tickUntil && !ui.title && day) { tk.textContent = ui.tick.txt; tk.style.setProperty('--c', ui.tick.k === 'bad' ? 'var(--ember)' : ui.tick.k === 'good' ? 'var(--jade)' : ui.tick.k === 'event' ? 'var(--lantern)' : 'var(--dim)'); }
  else tk.textContent = '';
  if (tk.textContent && tk.textContent !== was && !reduce) tk.animate([{ opacity: 0, translate: '0 -8px' }, { opacity: 1, translate: '0 0' }], { duration: 220, easing: 'ease-out' });
}
function partLine(j) {
  if (!j.part) return 'No part needed';
  const n = L.SKU[j.part][0];
  if (j.type === 'fault' && j.mode === 'patch') return 'Patch needs no part';
  return { none: S.stock[j.part] > 0 ? `${n}: in stores` : L.incoming(S, j.part) ? `${n}: on its way to stores` : `${n}: none in stores`, res: `${n}: picked, waiting for a runner`, run: `${n}: storeman is bringing it`, tech: `${n}: being fetched`, onsite: `${n}: on site` }[j.ps];
}
