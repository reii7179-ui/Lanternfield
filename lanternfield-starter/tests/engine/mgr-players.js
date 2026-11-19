'use strict';
// Five scripted Engineering Managers for balance checks. Usage:
//   const M = require('./mgr-players.js')(L); const s = M.season(seed, 'skilled', 'standard'); s.final
// They play through the engine's own functions, the same ones the buttons call.
module.exports = function (L) {
  const STOCK_DEFAULT = { kit: 3, sensor: 2, contactor: 2, bearing: 2, seal: 2, tyres: 1, chain: 1, relay: 1, breaker: 1, brake: 1, iocard: 1 };
  const STOCK_DEEP = { kit: 4, sensor: 3, contactor: 3, bearing: 3, seal: 3, tyres: 2, chain: 2, relay: 2, breaker: 2, brake: 2, iocard: 2 };
  const PRESETS = {
    idle: { about: 'Does nothing at all: no desk, no requests', idle: true },
    casual: { about: 'Covers gaps and default stock; looks at requests every 6 park minutes; computer picks; no rush jobs', every: 6, spend: 'pick', min: STOCK_DEFAULT },
    skilled: { about: 'Claude\'s A-grade plan: cover both shifts, purchasing manager, deep stock, services below 45%, answers every 2 min, spends on real priorities, rushes the most important unattended fault', every: 2, spend: 'careful', rush: 'top', walk: true, extra: ['mat'], min: STOCK_DEEP, pm: 45 },
    rusher: { about: 'Like skilled, but rushes every fault and approves anything on a rushed ride', every: 2, spend: 'careful', rush: 'all', walk: true, extra: ['mat'], min: STOCK_DEEP, pm: 45 },
    pincher: { about: 'Like skilled, but refuses contractors, overtime and express parts unless guests are stuck', every: 2, spend: 'never', rush: 'top', walk: true, extra: ['mat'], min: STOCK_DEEP, pm: 45 },
  };
  const techs = s => s.crew.filter(t => t.role === 'tech' && !t.temp && !t.agency);
  function gaps(s) { const g = []; for (const tr of Object.keys(L.TRADES)) { const e = techs(s).some(t => t.skills[tr] && t.shift !== 'late'), l = techs(s).some(t => t.skills[tr] && t.shift !== 'early'); if (!e) g.push([tr, 'early']); if (!l) g.push([tr, 'late']); } return g; }
  function desk(s, o) {
    const want = []; if (s.crew.filter(t => t.role === 'sup').length < 2) want.push('sup');
    for (const [tr] of gaps(s)) want.push(tr);
    for (const r of (o.extra || [])) if (!L.has(s, r)) want.push(r);
    for (const role of want) { const i = s.cands.findIndex(c => !c.gone && (c.role === role || (c.role === 'tech' && c.skills[role]))); if (i >= 0 && s.cash > 4000) L.hire(s, i); }
    for (const [tr, half] of gaps(s)) { const ts = techs(s).filter(t => t.skills[tr]); if (ts.length >= 2) L.setShift(s, ts.find(t => t.shift === 'full') || ts[0], half); }
    const sups = s.crew.filter(t => t.role === 'sup'); if (sups[0]) L.setShift(s, sups[0], 'early'); if (sups[1]) L.setShift(s, sups[1], 'late');
    s.pol.auto = true; if (o.pm != null) s.pol.pm = o.pm;
    for (const [k, v] of Object.entries(o.min)) s.min[k] = v;
    if (!L.has(s, 'store')) for (const k in s.min) { const have = s.stock[k] + s.inbound.filter(x => x.sku === k).length; for (let n = have; n < s.min[k]; n++) L.order(s, k, 'std'); }
    if (techs(s).some(t => t.morale < 45)) L.teamMeal(s);
  }
  function spendOk(s, it, o) {
    const r = it.rid && L.ride(s, it.rid), Q = L.REQ[it.k];
    if (o.spend === 'pick') { try { return Q.pick(s, it) === 'yes' || Q.pick(s, it) === 'ot'; } catch (e) { return false; } }
    if (o.spend === 'never') return !!(r && r.job && r.job.rescue);
    if (o.rush === 'all' && r && s.prio === r.id) return true;
    return L.keySpend(s, r) || L.maintSpend(s) + (it.cost || 0) <= s.budget;
  }
  function decide(s, it, o) {
    const Q = L.REQ[it.k]; let opts = []; try { opts = (Q.opts ? Q.opts(s, it) : []).map(x => x.v || x.k || x[0]); } catch (e) { /* stale */ }
    const has = v => !opts.length || opts.includes(v);
    switch (it.k) {
      case 'callout': case 'otsign': return spendOk(s, it, o) ? 'yes' : 'no';
      case 'express': if (has('up')) return 'up'; return spendOk(s, it, o) ? 'yes' : 'wait';
      case 'cover': return has('ot') && spendOk(s, it, o) ? 'ot' : 'short';
      case 'reorder': return 'std';
      case 'rules': return has('align') ? 'align' : 'keep';
      case 'svcplan': return 'worst';
      case 'morale': return 'yes';
    }
    try { return Q.pick ? Q.pick(s, it) : Q.def; } catch (e) { return Q.def; }
  }
  const unattended = s => s.rides.filter(r => r.job && r.job.type === 'fault' && !s.crew.some(c => c.target === r.id) && s.clock - r.job.t0 >= 2);
  function tick(s, o) {
    if (s.clock % o.every) return;
    for (const it of s.inbox.slice()) L.answer(s, it.id, decide(s, it, o));
    for (const r of s.rides) { const so = r.so; if (!so || so.esc) continue; const st = so.steps[so.i]; if (st !== 'mgr' && st !== 'sup' && st !== 'dir') continue;
      if ((so.x || L.soSigner(s, st, so)) !== s.seat) continue; L.countersign(s, r.id, L.soBad(so) ? 'back' : 'sign'); }
    if (o.rush === 'top' && !s.prio) { const r = unattended(s).sort((a, b) => ((!a.sub) - (!b.sub) ? (!b.sub) - (!a.sub) : b.w - a.w))[0]; if (r) L.rush(s, r); }
    if (o.rush === 'all') { const p = s.prio && L.ride(s, s.prio); if (!p || !p.job || s.crew.some(c => c.target === p.id)) { const r = unattended(s).filter(r => r.id !== s.prio)[0]; if (r) L.rush(s, r); } }
    if (o.walk && s.clock % 20 === 0 && !s.inbox.length) L.walk(s);
  }
  function season(seed, preset, diff) {
    const o = PRESETS[preset]; if (!o) throw new Error('unknown preset ' + preset);
    const s = L.newGame(seed); L.setSeat(s, 'mgr'); if (diff) L.setDiff(s, diff);
    while (!s.final) { if (s.phase === 'plan') { if (!o.idle) desk(s, o); L.startDay(s); continue; } if (!o.idle) tick(s, o); L.step(s); s.fx.length = 0; }
    return s;
  }
  return { season, PRESETS };
};
