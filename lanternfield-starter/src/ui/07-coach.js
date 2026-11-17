/* ---------- coaching: each seat is taught by doing the first time you play it, and the clock waits while the coach asks you to act ---------- */
const coached = k => { try { return localStorage.getItem('kll-coached-' + k) === '1' || (k === 'sup' && localStorage.getItem('kll-coached-v1') === '1'); } catch (e) { return true; } };
const markCoached = k => { try { localStorage.setItem('kll-coached-' + k, '1'); } catch (e) { /* nowhere to remember it */ } };
function coachOff(skip) { if (ui.coach) markCoached(ui.coach.seat); ui.coach = null; ui.coachRide = ui.coachUnit = null; if (skip) say('Coaching off. How to play is under ? at the top.', 'var(--sky)'); }
function coachStart() { if (!ui.coach && S.phase === 'day' && !coached(S.seat)) ui.coach = { seat: S.seat, i: 0, at: null, since: S.clock }; }
const techOn = tr => S.crew.filter(c => c.role === 'tech' && c.on && !c.temp && c.skills[tr]).sort((a, b) => b.skills[tr] - a.skills[tr]);
const sentTo = id => S.crew.some(c => c.target === id);
const keyOf = c => c ? S.crew.filter(x => x.role === 'tech' && !x.temp).indexOf(c) + 1 : 0;
const tapOr = (touch, mouse) => ui.touch ? touch : mouse;
const CR = () => ui.coach && ui.coach.rid && L.ride(S, ui.coach.rid);
const openFault = (skipTrade) => S.rides.filter(r => r.job && r.job.type === 'fault' && !sentTo(r.id) && techOn(r.job.trade).length && r.job.trade !== skipTrade).sort((a, b) => a.job.t0 - b.job.t0)[0];
const gapNow = () => { // a trade with nobody on shift right now, and someone off shift who could be called in
  for (const tr of Object.keys(L.TRADES)) { if (techOn(tr).length) continue; const c = S.crew.find(c => c.role === 'tech' && !c.on && !c.temp && !c.agency && !c.sick && !c.inAt && c.skills[tr] && c.shift !== 'full'); if (c) return { tr, c }; } return null; };
const TOPICTXT = 'Pick the topic: Safety when crew alertness (on your card) is low, Wellbeing when people are tired, Pace before a busy spell. Each topic has its own cooldown.';
const COACHES = {
  sup: [
    { hold: true, btn: 'Show me', text: () => 'You run the maintenance shift. Rides wear out and break, and your job is to send the right person, fast. I will walk you through it. While I am asking you to do something, the clock waits.' },
    { hold: true, when: () => openFault(), pick: () => openFault().id, ride: () => ui.coach.rid, unit: () => { const r = CR(); return r && r.job && (techOn(r.job.trade)[0] || {}).id; },
      done: () => { const r = CR(); return !r || !r.job || sentTo(r.id) || selUnits().some(c => c.skills[r.job.trade]); },
      text: () => { const r = CR(), tr = r && r.job ? r.job.trade : 'mech', m = techOn(tr)[0]; return `${esc(r ? r.name : 'A ride')} has a fault. The letter badge is the trade: ${tr[0].toUpperCase()} means ${L.TRADES[tr].toLowerCase()}. An amber ring is its timer: if nobody comes, it gets worse. First select ${m ? esc(m.name) : 'someone qualified'}: ${tapOr('tap', 'click')} them in the column on the right${m && !ui.touch ? `, or press ${keyOf(m)}` : ''}.`; } },
    { hold: true, when: () => { const r = CR(); return r && r.job && !sentTo(r.id); }, ride: () => ui.coach.rid, unit: () => { const r = CR(); return r && r.job && !selUnits().some(c => c.skills[r.job.trade]) ? (techOn(r.job.trade)[0] || {}).id : null; }, done: () => { const r = CR(); return !r || !r.job || sentTo(r.id); },
      text: () => { const r = CR(), nm = esc(r ? r.name : 'the ride'); return r && r.job && selUnits().some(c => c.skills[r.job.trade]) ? `Now ${tapOr(`tap ${nm} on the map`, `right-click ${nm} on the map (or press E)`)} to send them, or use the Fix button on their card. The blue ring round it is the fast-response window.` : `Select someone qualified first (the highlighted person on the right), then ${tapOr('tap', 'right-click')} ${nm}.`; } },
    { until: 35, done: () => { const r = CR(); return !r || !r.job; }, text: () => 'Sent inside the blue ring: that is a fast response ⚡, and the job shrinks by a fifth. Fixes finished on time in a row build a streak (top bar) that pays a bonus.' },
    { hold: true, wait: 180, when: () => { const f = CR(); return openFault(f && f.job ? f.job.trade : (ui.coach.tr || '')); }, pick: () => { const f = CR(); return openFault(f && f.job ? f.job.trade : (ui.coach.tr || '')).id; },
      ride: () => ui.coach.rid, unit: () => { const r = CR(); return r && r.job && (techOn(r.job.trade)[0] || {}).id; }, done: () => { const r = CR(); return !r || !r.job || sentTo(r.id); },
      text: () => { const r = CR(), tr = r && r.job ? r.job.trade : 'elec', e = techOn(tr)[0]; return `${esc(r ? r.name : 'A ride')}: ${tr[0].toUpperCase()} means ${L.TRADES[tr].toLowerCase()}. Only someone with that trade can fix it. Select ${e ? esc(e.name) : 'them'}${e && !ui.touch ? ` (press ${keyOf(e)})` : ''} and send them.`; } },
    { wait: 240, when: () => S.inbox.length > 0, until: 25, done: () => !S.inbox.length, text: () => 'A request has landed top left, with a timer. Answer before it runs out, or the cautious default happens. Each one is labelled operational, tactical or strategic.' },
    { when: () => S.clock >= 640 || S.crew.some(c => c.on && c.role === 'tech' && L.enOf(c) < 75), until: 40, done: () => S.crew.some(c => c.brk),
      unit: () => (S.crew.filter(c => c.on && c.role === 'tech' && !c.temp && !c.agency).sort((a, b) => L.enOf(a) - L.enOf(b))[0] || {}).id,
      text: () => `The small bar beside each person is their energy. Work drains it, and a tired tech works slower and can get hurt. In a quiet spell, select the most tired person and ${tapOr('tap Break', 'press B')}: a break refills energy far faster than standing about.` },
    { wait: 300, when: () => S.clock < 1200 && gapNow(), pick: () => { const g = gapNow(); ui.coach.cid = g.c.id; ui.coach.tr = g.tr; return null; }, unit: () => ui.coach.cid, until: 30, done: () => { const c = L.staff(S, ui.coach.cid); return !c || c.on || !!c.inAt; },
      text: () => { const c = L.staff(S, ui.coach.cid), tr = ui.coach.tr; return `Nobody on shift can do ${L.TRADES[tr || 'ctrl'].toLowerCase()} work right now${c ? `, and ${esc(c.name)} is not in until ${fmtClock(L.SHIFT[c.shift][0])}` : ''}. If a fault in that trade comes, call ${c ? esc(c.name) : 'them'} in: ${tapOr('tap', 'click')} them on the right, then Call in now. Overtime costs money; a closed ride costs more.`; } },
    { hold: true, btn: 'Got it', wait: 600, when: () => S.waves.some(w => w.warned && !w.hit), done: () => S.waves.some(w => w.hit) || S.crew.some(c => c.post && Math.hypot(c.post.x - L.NODES.P.x, c.post.y - L.NODES.P.y) < 140),
      text: () => `A squall hits at ${fmtClock((S.waves.find(w => !w.hit) || {}).at || 750)} and will break about two rides at once. Get ahead of it: ${tapOr('tap Select free crew on your card', 'press A to select every free person')}, then ${tapOr('tap', 'right-click')} the middle of the park so they are close to everything.` },
    { when: () => S.comp >= 25 && !S.talk, until: 40, done: () => !!S.talk, el: '#selp [data-a=walk]:not([disabled])', text: () => `Crew alertness (on your card) falls through a routine day, and that is when people get hurt. A toolbox talk stops everyone free for 8 minutes. ${TOPICTXT}` },
    { btn: 'Done', until: 30, text: () => 'That is the job. Rides that run through Lantern Hour at 21:00 send up a lantern. After 14 days the board grades the company, and your own work counts too. When you feel quick enough, try 2×.' },
  ],
  tech: [
    { hold: true, btn: 'Show me', text: () => { const m = L.me(S); return `You are ${m ? esc(m.name) : 'a technician'}${m ? ', ' + esc(title(m).toLowerCase()) : ''}. The supervisor sends you work orders; you do the job with your own hands, step by step. While I ask you to do something, the clock waits.`; } },
    { hold: true, when: () => S.inbox.some(i => i.k === 'wo'), done: () => !S.inbox.some(i => i.k === 'wo') || !!(L.me(S) || {}).target, el: '#obj [data-a=ans][data-v=go]', text: () => 'A work order has landed top left. Tap On my way to take it, or Can\'t now if you are busy and someone else gets it.' },
    { when: () => { const m = L.me(S); return m && m.target; }, until: 60, done: () => { const m = L.me(S); return !m || ['prep', 'lock', 'diag', 'check', 'work', 'wait'].includes(m.state); }, text: () => 'On your way. The faster you get there, the sooner the ride reopens. Sprint (Q) doubles your speed for a while, with a cooldown.' },
    { hold: true, when: () => (L.me(S) || {}).state === 'prep', done: () => { const m = L.me(S) || {}; return m.state !== 'prep' || !!(m.lk && m.lk.id === m.target); }, el: '[data-a=lock]', text: () => 'Lock it out first: your own padlock on the isolator, so nobody can start the ride with your hands in it. Tap Lock out and tag. Skipping is quicker, and that is how people get hurt.' },
    { hold: true, wait: 60, when: () => (L.me(S) || {}).state === 'diag', done: () => { const m = L.me(S) || {}, j = m.target && (L.ride(S, m.target) || {}).job; return !['diag', 'check'].includes(m.state) || !j || !!j.dx || !!(j.out && j.out.length); }, el: '[data-a=dx]', text: () => 'Find the cause: read the symptoms and pick the most likely one. A wrong guess costs six minutes. Your gut feeling is right most of the time; the procedure button tells you for sure, slowly.' },
    { btn: 'Done', until: 40, text: () => 'Once it is fixed you are free. Pick up jobs in your trade from your card, service tired rides when it is quiet, and take a break (B) when your energy bar is low. Your own work counts towards the grade.' },
  ],
  mgr: [
    { hold: true, btn: 'Show me', text: () => 'You are the Engineering Manager. The supervisor runs the shift; you run the department: people, budget, parts, and the rules the supervisor works to.' },
    { hold: true, btn: 'Got it', when: () => S.rides.some(r => r.job && r.job.type === 'fault' && !sentTo(r.id)), pick: () => S.rides.filter(r => r.job && r.job.type === 'fault' && !sentTo(r.id)).sort((a, b) => b.w - a.w)[0].id, ride: () => ui.coach.rid, done: () => !!S.prio, el: '#selp [data-a=rush]',
      text: () => `The supervisor takes a few minutes to react. When a breakdown matters (a big ride, a substation, the VIP ride), select it and press R, or tap Rush job on its card: everyone who can help goes now, and works faster. Try it on ${esc((CR() || {}).name || 'the ride')}.` },
    { btn: 'Next', el: '#rail .t-sup', text: () => 'Your rules steer the supervisor: what to do when a part is missing, and when to service tired rides. Tap the supervisor on the right to see and change them.' },
    { wait: 120, when: () => S.inbox.length > 0, until: 25, done: () => !S.inbox.length, text: () => 'Requests land top left with a timer. Answer before it runs out, or the cautious default happens. Empty posts above and below you change who asks what.' },
    { btn: 'Next', el: '#selp [data-a=walk]', text: () => 'Walking the floor lifts morale and alertness, but you are away from your desk for 20 minutes and requests wait. Go when your inbox is empty.' },
    { btn: 'Done', until: 30, text: () => 'At night the planning desk is yours: rosters, hiring, training and minimum stock. Keep every trade covered on both shifts.' },
  ],
  dir: [
    { hold: true, btn: 'Show me', text: () => 'You are the Operations Director: the day\'s priority, the budget, and the bigger calls when things go wrong.' },
    { btn: 'Next', el: '#selp [data-a=setfocus]', text: () => 'Set today\'s priority on your card. The managers work to it, and the board checks it against the company strategy (Company tab). The budget buttons cap maintenance spending.' },
    { btn: 'Next', el: '#selp [data-a=agency]', text: () => 'On a bad day, bring in agency crew: two technicians for three hours. Select a worn ride and Order a service before it breaks. A fast lane earns more from a healthy ride, but a breakdown then costs goodwill.' },
    { btn: 'Done', until: 40, text: () => 'Any breakdown can be a rush job (R): everyone who can help goes now. Requests and big spends land top left. Your own score is uptime, budget and staying on strategy.' },
  ],
  ceo: [
    { hold: true, btn: 'Show me', text: () => 'You are the Chief Executive. The board, the press, and anything nobody below you can decide comes to your inbox, top left.' },
    { btn: 'Next', el: '#selp [data-a=happy]', text: () => 'Your levers: when a big ride closes, select it for goodwill vouchers. Happy hour brings guests in when the park is healthy (not when it is not). Brief the chair when the day is going well. R makes any breakdown a rush job.' },
    { wait: 120, when: () => S.inbox.length > 0, until: 30, done: () => !S.inbox.length, text: () => 'A decision for you, top left. Strategic ones last all season and their results arrive days later.' },
    { btn: 'Done', until: 40, text: () => 'At night you set the strategy and fill posts across the company (Company tab). Empty posts push their work up to you. Your own score is profit and the board\'s confidence.' },
  ],
};
const curStep = () => { const C = ui.coach; return C && (COACHES[C.seat] || [])[C.i]; };
function coachTick() {
  const C = ui.coach; if (!C) return;
  if (S.seat !== C.seat) { ui.coach = null; ui.coachRide = ui.coachUnit = null; return; } // a different seat has its own coach
  if (S.phase !== 'day') { ui.coachRide = ui.coachUnit = null; return; } // carries on tomorrow
  const list = COACHES[C.seat] || [];
  for (let n = 0; n <= list.length; n++) {
    const st = list[C.i]; if (!st) { coachOff(false); return; }
    if (C.at == null) {
      if (st.wait && S.clock - C.since >= st.wait) { C.i++; C.since = S.clock; continue; }
      if (st.when && !st.when()) { ui.coachRide = ui.coachUnit = null; return; }
      C.at = S.clock; C.clicked = false; if (st.pick) { const id = st.pick(); if (id) C.rid = id; }
      { const r = st.ride && L.ride(S, st.ride()); if (r) focus(r.x, r.y, true); } // bring what it is talking about into view
    }
    if ((st.done && st.done()) || C.clicked || (st.until && !st.hold && S.clock - C.at >= st.until)) { C.i++; C.at = null; C.since = S.clock; continue; }
    ui.coachRide = st.ride ? st.ride() : null; ui.coachUnit = st.unit ? st.unit() || null : null; return;
  }
}
function placeCoach() { // keep the card off whatever it is asking you to click
  const el = $('coach'), on = !!el.innerHTML; $('app').classList.toggle('coaching', on); if (!on) { $('app').classList.remove('coachride'); return; }
  const r = ui.coachRide && L.ride(S, ui.coachRide), u = ui.coachUnit && L.staff(S, ui.coachUnit), p = r || (u && u.on ? u : null);
  el.classList.toggle('top', !!$('task').innerHTML.trim() || (!!p && oy + p.y * sc > ins.t + (ch - ins.t - ins.b) / 2)); // the technician's own card sits bottom centre
  // if the ride it points at is under the objectives card (narrow screens), hide that card until the step is done
  let under = false; if (r) { const b = $('obj').getBoundingClientRect(), m = $('map').getBoundingClientRect(), x = m.left + ox + r.x * sc, y = m.top + oy + r.y * sc; under = x > b.left - 30 && x < b.right + 30 && y > b.top - 30 && y < b.bottom + 30; }
  $('app').classList.toggle('coachride', under);
}
const coachHold = () => { const C = ui.coach, st = curStep(); return !!(st && st.hold && C.at != null && !ui.title && !ui.desk && S.phase === 'day'); };
function coachHTML() {
  const C = ui.coach, st = curStep(); if (!st || C.at == null || ui.title || S.phase !== 'day') return '';
  const n = (COACHES[C.seat] || []).length;
  return `<div class="ch">${C.seat === 'sup' && S.day === 1 ? 'Your first morning' : 'New seat: ' + esc(ROLE[C.seat].title)}<em>${C.i + 1} of ${n}</em></div><p>${st.text()}</p>${st.hold && !st.btn ? '<div class="wait">The clock is waiting for you.</div>' : ''}<div class="row">${st.btn ? `<button type="button" class="btn go sm" data-a="coachnext" data-fk="cn">${st.btn}</button>` : ''}<button type="button" class="btn sm" data-a="coachskip" data-fk="cs">Skip coaching</button></div>`;
}
function coachMarks() { // put the glow on the button the coach is talking about
  for (const e of document.querySelectorAll('.cmd.coachme,[data-a].coachme:not(.unit):not(.as)')) e.classList.remove('coachme');
  const st = curStep(); if (st && st.el && ui.coach && ui.coach.at != null) { const e = document.querySelector(st.el); if (e) e.classList.add('coachme'); }
}
/* the planning desk, taught on the first night */
const DESKC = [
  { tab: 'report', text: () => 'This is the planning desk. Every night you see how the day went, then get ready for tomorrow. This is last night\'s report.' },
  { tab: 'team', text: () => `The cover grid shows who can fix what on each shift, and red means nobody: a fault in that trade waits until someone arrives. ${may('roster') ? 'Hire someone for a red gap from tonight\'s candidates below, then set their shift so both halves of the day are covered.' : 'Rosters are the Engineering Manager\'s call: you can ask for a hire here, and they decide tonight. In the day you can call someone in to cover a gap.'}` },
  { tab: 'stores', text: () => may('stock') ? 'Stores: overnight the storeman tops up to the minimum you set here. Keep one of each part that fails often, or rides wait for an express delivery.' : 'Stores: overnight the storeman tops up to the minimums the manager set. A part not on the shelf means an expensive express delivery, or a patch.' },
  { tab: null, text: () => 'That is the desk. Open the gates when you are ready.' },
];
function deskCoachHTML() {
  const d = ui.dc; if (!d || S.phase !== 'plan' || S.final) return '';
  const st = DESKC[d.i]; if (!st) return '';
  return `<div class="dcoach" role="status"><div class="ch" style="display:flex;gap:8px;font:700 11px var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--lantern)">Your first night<em style="margin-left:auto;font-style:normal;color:var(--dim)">${d.i + 1} of ${DESKC.length}</em></div><p>${st.text()}</p><div class="row"><button type="button" class="btn go sm" data-a="dcnext" data-fk="dcn">${d.i + 1 < DESKC.length ? 'Next' : 'Done'}</button>${d.i + 1 < DESKC.length ? '<button type="button" class="btn sm" data-a="dcskip" data-fk="dcs">Skip</button>' : ''}</div></div>`;
}
