'use strict';
// Scripted players. They stand in for people when checking balance and when pinning results down (golden.js).
// They are deliberately simple and deterministic: same engine + same seed + same player = same season.
// Changing a player changes golden.json, so update it (golden.js --update) in the same commit and say why.

module.exports = function makePlayers(L) {
  const techs = s => s.crew.filter(t => t.role === 'tech' && !t.temp && !t.agency);
  const en = t => (t.en == null ? 100 : t.en);
  const dist = (c, r) => Math.hypot(c.x - r.x, c.y - r.y);
  const unsent = s => s.rides.filter(r => r.job && r.job.type === 'fault' && !s.crew.some(c => c.target === r.id));

  function cover(s) { // trades with nobody on one half of the day
    const gaps = [];
    for (const tr of Object.keys(L.TRADES)) {
      const e = techs(s).some(t => t.skills[tr] && t.shift !== 'late'), l = techs(s).some(t => t.skills[tr] && t.shift !== 'early');
      if (!e) gaps.push([tr, 'early']); if (!l) gaps.push([tr, 'late']);
    }
    return gaps;
  }

  function plan(s) { // the planning desk: cover every trade on both shifts, set stock levels
    for (const role of ['sup'].concat(cover(s).map(g => g[0]))) {
      if (role === 'sup' && L.has(s, 'sup')) continue;
      const i = s.cands.findIndex(c => !c.gone && (c.role === role || (c.role === 'tech' && c.skills[role])));
      if (i >= 0 && s.cash > 3000) L.hire(s, i);
    }
    for (const [tr, half] of cover(s)) { const t = techs(s).filter(t => t.skills[tr]).sort(a => (a.shift === 'full' ? 1 : -1))[0], other = t && techs(s).filter(x => x.skills[tr] && x !== t).length; if (t && other) L.setShift(s, t, half); }
    for (const t of s.crew) if (t.role === 'sup') L.setShift(s, t, 'early');
    s.pol.auto = true; s.pol.pm = 55; s.pol.nopart = 'express';
    for (const [k, v] of Object.entries({ kit: 3, sensor: 2, contactor: 2, bearing: 2, seal: 2, tyres: 1, chain: 1, relay: 1, breaker: 1, brake: 1, iocard: 1 })) s.min[k] = v;
    if (!L.has(s, 'store')) for (const k in s.min) { const have = s.stock[k] + s.inbound.filter(x => x.sku === k).length; for (let n = have; n < s.min[k]; n++) L.order(s, k, 'std'); }
    if (techs(s).some(t => t.morale < 45)) L.teamMeal(s);
  }

  function dispatch(s, o) { // the supervisor's hands
    const padded = id => s.rides.some(r => r.so && r.so.pads.includes(id)); // let them go back for their padlock first
    const freeT = () => s.crew.filter(c => c.role === 'tech' && c.on && !c.temp && !c.target && !c.post && !padded(c.id) && !(c.hurt > s.clock) && !(c.wake > s.clock));
    for (const r of s.rides) { // guests stuck: anyone, now
      const j = r.job; if (!j || !j.rescue || s.clock - j.t0 < o.delay) continue;
      if (s.crew.some(c => c.on && c.role === 'tech' && (c.target === r.id || (c.post && Math.hypot(c.post.x - r.x, c.post.y - r.y) < 60)))) continue;
      const f = freeT().sort((a, b) => dist(a, r) - dist(b, r))[0]; if (!f) continue;
      if (f.skills[j.trade]) L.assign(s, f, r); else L.moveOrder(s, f, r.x + f.ox, r.y + f.oy); L.sprint(s, f);
    }
    const jobs = unsent(s).filter(r => s.clock - r.job.t0 >= o.delay).sort((a, b) => ((!a.sub) - (!b.sub) ? (!b.sub) - (!a.sub) : (b.job.sev === 'major') - (a.job.sev === 'major') || b.w - a.w));
    for (const r of jobs) {
      const j = r.job;
      if (j.mode === 'full' && j.part && j.ps === 'none' && s.stock[j.part] < 1 && !L.incoming(s, j.part)) { if (L.order(s, j.part, 'exp') !== true && !j.lock) L.setMode(s, r, 'patch'); }
      let f = freeT().filter(c => c.skills[j.trade]);
      if (o.smart) { const fresh = f.filter(c => en(c) >= 30); if (fresh.length) f = fresh; }
      const score = c => c.skills[j.trade] * 60 - dist(c, r) / 6 + (o.smart ? en(c) / 3 : 0);
      f.sort((a, b) => score(b) - score(a));
      if (f[0]) L.assign(s, f[0], r);
    }
    for (const r of s.rides) { // a second pair of hands on big jobs
      const j = r.job; if (!j || j.type !== 'fault' || j.sev !== 'major') continue;
      if (s.crew.filter(c => c.target === r.id && c.on).length !== 1) continue;
      const f = freeT().filter(c => c.skills[j.trade] && dist(c, r) < 420 && (!o.smart || en(c) >= 40)).sort((a, b) => dist(a, r) - dist(b, r))[0];
      if (f) L.assign(s, f, r);
    }
    if (s.clock < 1140 && s.clock % 5 === 0) { // service tired rides when quiet
      const c = s.rides.filter(r => !r.job && r.health < 50 && L.status(s, r) !== 'nopower').sort((a, b) => a.health - b.health)[0];
      if (c && s.stock.kit > 0 && !unsent(s).length) { const f = freeT().filter(x => x.skills[L.primary(c)] && (!o.smart || en(x) >= 50))[0]; if (f) L.assign(s, f, c); }
    }
    if (o.smart) { // breaks for tired people when nothing in their trade is waiting
      const waiting = tr => unsent(s).some(r => r.job.trade === tr);
      for (const c of freeT()) if (!c.brk && !c.talk && en(c) < 45 && !Object.keys(c.skills).some(waiting)) L.rest(s, c);
    }
    if (o.talk === 'often' && s.clock % 30 === 0) L.walk(s, 'safety');
    if (o.talk === 'quiet') { // a safety talk when alertness is low and the crew is mostly free
      const on = techs(s).filter(c => c.on), fr = on.filter(c => !c.target);
      if (s.comp >= 45 && on.length && fr.length / on.length >= 0.7 && !unsent(s).length) L.walk(s, 'safety');
    }
  }

  function desk(s) { // big decisions that wait at the desk for this seat: approve a fix the cash can carry, settle a claim if it can
    for (const b of s.big.slice()) {
      if (!(b.x === s.seat || (b.x === 'board' && s.seat === 'ceo'))) continue;
      L.decideBig(s, b.id, b.k === 'claim' ? (s.cash > b.cost + 10000 ? 'settle' : 'contest') : L.worthIt(s, b) ? 'yes' : 'no', 'You');
    }
  }

  function signOffs(s, o) { // a fixed ride waiting for this seat: the technician signs it fit to run and takes their padlock off;
    // a countersigner reads the write-up after o.delay minutes and sends a weak one back; the director does the incident review
    const m = L.me(s);
    if (m && m.state === 'signoff') { L.signFit(s, true); L.padOff(s); }
    if (m && !m.target && !m.post) { const r = s.rides.find(r => r.so && r.so.pads.includes(m.id)); if (r) { if (Math.hypot(m.x - r.x, m.y - r.y) < 60) L.padOff(s); else L.moveOrder(s, m, r.x + m.ox, r.y + m.oy); } }
    for (const r of s.rides) {
      const so = r.so; if (!so || so.esc || s.clock - so.at < (o.delay || 0)) continue;
      const st = so.steps[so.i];
      if ((st === 'sup' || st === 'mgr' || st === 'dir') && L.soSigner(s, st, so) === s.seat) L.countersign(s, r.id, L.soBad(so) ? 'back' : 'sign');
      if (st === 'review' && L.soSigner(s, 'dir', so) === s.seat) L.review(s, r.id, 'retrain');
    }
  }

  function answerAll(s) { // the computer's own pick for every request
    for (const it of s.inbox.slice()) { const Q = L.REQ[it.k]; let v; try { v = Q.pick ? Q.pick(s, it) : 'yes'; } catch (e) { v = Q.def; } L.answer(s, it.id, v); }
  }

  function seatPlay(s, o) {
    if (o.rush && !s.prio) { const r = unsent(s).filter(r => s.clock - r.job.t0 >= 2).sort((a, b) => ((!a.sub) - (!b.sub) ? (!b.sub) - (!a.sub) : b.w - a.w))[0]; if (r) L.rush(s, r); }
    if (o.walk && s.clock % 20 === 0 && !s.inbox.length) L.walk(s);
    if (o.play === 'tech' && s.clock % 2 === 0) {
      const m = L.me(s);
      for (const it of s.inbox.slice()) if (it.k === 'wo') L.answer(s, it.id, 'go');
      if (m && m.on) {
        const j = m.target && L.ride(s, m.target).job;
        if (m.state === 'prep') L.lockout(s, false);
        else if (m.state === 'diag' && j && j.opts) { const tried = j.out || []; L.diagnose(s, !tried.includes(j.gut) ? j.gut : [0, 1, 2].find(k => !tried.includes(k))); }
        else if (!m.target && !m.post && !(m.wake > s.clock)) {
          const r = unsent(s).filter(r => m.skills[r.job.trade]).sort((a, b) => dist(m, a) - dist(m, b))[0];
          if (r && L.enOf(m) >= 20) L.assign(s, m, r); else if (L.enOf(m) < 40 && !m.brk) L.rest(s, m);
        }
      }
    }
    if (o.play === 'dir' && s.clock % 3 === 0) {
      if (L.maintSpend(s) > s.budget * 0.85) L.setBudget(s, 500);
      if (s.focus !== s.strategy) L.setFocus(s, s.strategy);
      if (unsent(s).length >= 3) L.agency(s);
      if (s.glow < 60) L.crowdPleaser(s);
      const w = s.rides.filter(r => !r.job && !r.svcReq && r.health < 40 && L.status(s, r) !== 'nopower').sort((a, b) => a.health - b.health)[0]; if (w) L.orderService(s, w);
      const up = s.d.upW / Math.max(1, s.d.upT);
      if (up > 0.9 && s.clock > 660) { const b = s.rides.filter(r => r.sub && !r.job && r.health > 75 && L.status(s, r) === 'ok').sort((a, b) => b.w - a.w)[0]; if (b) L.fastLane(s, b); }
    }
    if (o.play === 'ceo' && s.clock % 3 === 0) {
      const up = s.d.upW / Math.max(1, s.d.upT);
      if (s.clock >= 700 && up >= 0.88) L.briefChair(s);
      if (s.clock >= 570 && s.clock < 660 && !s.rides.some(r => r.job && r.job.type === 'fault')) L.happyHour(s);
      const r = s.rides.filter(r => r.sub && r.job && r.job.type === 'fault' && r.job.sev === 'major' && !(r.vouch > s.clock)).sort((a, b) => b.w - a.w)[0]; if (r && r.w > 14) L.vouch(s, r);
      if (s.glow < 60) L.crowdPleaser(s);
    }
  }

  function season(seed, o) {
    const s = L.newGame(seed);
    if (o.seat) L.setSeat(s, o.seat);
    if (o.diff) L.setDiff(s, o.diff);
    while (!s.final) {
      if (s.phase === 'plan') { if (o.plan) plan(s); if (o.inbox) desk(s); L.startDay(s); continue; }
      if (o.hands && (!o.every || s.clock % o.every === 0)) dispatch(s, o);
      if (o.inbox && (!o.inboxEvery || s.clock % o.inboxEvery === 0)) answerAll(s);
      if (o.inbox && (!o.inboxEvery || s.clock % o.inboxEvery === 0)) signOffs(s, o);
      seatPlay(s, o);
      L.step(s); s.fx.length = 0;
    }
    return s;
  }

  // delay = park minutes before reacting (2.5 park minutes = 1 real second at 1x); every = how often they look
  const sup = { seat: 'sup', plan: true, hands: true, inbox: true, delay: 0, talk: 'often' };
  const PLAYERS = {
    'sup idle': { seat: 'sup', plan: true, about: 'Sets up the desk, then does nothing in the day' },
    'sup slow': { ...sup, delay: 20, about: 'Reacts 20 park minutes late (8 s at 1x)' },
    'sup casual': { ...sup, delay: 8, every: 4, inboxEvery: 6, about: 'Reacts in about 3-5 s at 1x, ignores energy' },
    'sup human': { ...sup, smart: true, talk: 'quiet', delay: 4, every: 3, inboxEvery: 4, about: 'Attentive: about 2-3 s at 1x, manages breaks and talks' },
    'sup skilled': { ...sup, smart: true, talk: 'quiet', about: 'Instant reactions, manages breaks and talks' },
    'sup human relaxed': { ...sup, smart: true, talk: 'quiet', delay: 5, every: 3, inboxEvery: 4, diff: 'relaxed', about: 'Attentive player on Relaxed' },
    'sup human sharp': { ...sup, smart: true, talk: 'quiet', delay: 5, every: 3, inboxEvery: 4, diff: 'sharp', about: 'Attentive player on Sharp' },
    'sup human 2x': { ...sup, smart: true, talk: 'quiet', delay: 10, every: 6, inboxEvery: 8, about: 'Same reflexes as sup human, playing at 2x' },
    'sup human 2x relaxed': { ...sup, smart: true, talk: 'quiet', delay: 10, every: 6, inboxEvery: 8, diff: 'relaxed', about: 'Same, at 2x on Relaxed' },
    'tech idle': { seat: 'tech', plan: true, about: 'Technician who never answers a work order' },
    'tech active': { seat: 'tech', plan: true, inbox: true, inboxEvery: 3, play: 'tech', about: 'Takes work orders, locks out, diagnoses, rests' },
    'mgr idle': { seat: 'mgr', about: 'Manager who does nothing at all' },
    'mgr active': { seat: 'mgr', plan: true, inbox: true, rush: true, walk: true, about: 'Plans the desk, answers requests, rush jobs, walks the floor' },
    'dir idle': { seat: 'dir', about: 'Director who does nothing at all' },
    'dir active': { seat: 'dir', plan: true, inbox: true, inboxEvery: 3, play: 'dir', walk: true, rush: true, about: 'Budget, focus, agency, services, fast lanes, rush jobs' },
    'ceo idle': { seat: 'ceo', about: 'Chief executive who does nothing at all' },
    'ceo active': { seat: 'ceo', plan: true, inbox: true, inboxEvery: 3, play: 'ceo', walk: true, rush: true, about: 'Vouchers, happy hour, briefings, rush jobs' },
  };
  return { season, PLAYERS, plan, dispatch, answerAll, signOffs, seatPlay };
};
