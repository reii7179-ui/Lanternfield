'use strict';
// The active seats' guarantees that need set-up scenes rather than whole seasons of normal play:
// - every seat-card mistake can happen through ordinary commands, and each one lowers your own score;
// - an escalated request or sign-off is always settled: nothing waits past its time;
// - anything over $20,000 goes to the board, from every seat, and the chief executive cannot approve it alone;
// - crew traits and boss styles are the same for the same seed, and an old save gets the same ones every time;
// - no number in the game state is ever NaN, and counts, stock, scores and gauges never go below zero.
//   node tests/engine/duties.js
const { loadEngine } = require('./load.js');
const L = loadEngine(), P = require('./players.js')(L);
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); };
const t0 = Date.now();

const BASE = { tech: 'tech active', sup: 'sup skilled', mgr: 'mgr active', dir: 'dir active', ceo: 'ceo active' };
// play `days` days in a seat as a sensible player, calling each(s) every park minute first
function run(seat, seed, days, each, extra, setup) {
  const o = Object.assign({}, P.PLAYERS[BASE[seat]], extra || {}), s = L.newGame(seed);
  L.setSeat(s, seat); if (setup) setup(s);
  while (!s.final && s.reports.length < days) {
    if (s.phase === 'plan') { if (o.plan) P.plan(s); L.startDay(s); continue; }
    if (each) each(s);
    if (o.hands && (!o.every || s.clock % o.every === 0)) P.dispatch(s, o);
    if (o.inbox && (!o.inboxEvery || s.clock % o.inboxEvery === 0)) { P.answerAll(s, o); P.signOffs(s, o); }
    P.seatPlay(s, o); L.step(s); s.fx.length = 0;
  }
  return s;
}
const unsent = s => s.rides.filter(r => r.job && r.job.type === 'fault' && !s.crew.some(c => c.target === r.id));
const freeTechs = s => s.crew.filter(c => c.role === 'tech' && c.on && !c.temp && !c.target && !c.post && !(c.hurt > s.clock));
const answerAll = (s, k, v) => { for (const it of s.inbox.slice()) if (it.k === k) L.answer(s, it.id, v); };

// --- 1. the seat-card mistakes: each can happen, and each costs you
const MISTAKES = [
  ['tech', 'skip', 'skipping the lockout', s => { const m = L.me(s); if (m && m.state === 'prep') L.lockout(s, true); }],
  ['tech', 'guess', 'guessing the cause instead of checking', null, null, s => { const m = L.me(s); for (const k in m.skills) m.skills[k] = 1; }], // a junior's hunch is a guess
  ['tech', 'quiet', 'going quiet on a long job', null],
  ['tech', 'gaveIn', 'giving in to a push to cut a corner', s => answerAll(s, 'push', 'give')],
  ['sup', 'tools', 'picking up a spanner', s => { if (!s.tools && s.gates) { const r = unsent(s).find(r => r.job.sev === 'major'); if (r) L.takeJob(s, r.id); } }],
  ['sup', 'wrong', 'sending the nearest, not the right person, to a safety-critical job', s => { for (const r of unsent(s)) { if (!L.safetyJob(r, r.job)) continue;
    const f = freeTechs(s).filter(c => c.skills[r.job.trade]), weak = f.find(c => c.skills[r.job.trade] < 2 || L.hasT(c, 'quick')); if (weak && f.some(c => c !== weak && c.skills[r.job.trade] >= 2 && !L.hasT(c, 'quick'))) L.assign(s, weak, r); } }],
  ['sup', 'otYes', 'yes to every overtime request', s => answerAll(s, 'hold', 'yes'), null, null, 12],
  ['sup', 'padPull', 'pulling someone off a ride with their padlock still on', s => { for (const r of unsent(s)) { const held = s.crew.find(c => c.role === 'tech' && c.on && c.target && c.skills[r.job.trade] && s.rides.some(x => x.job && (x.job.pads || []).includes(c.id))); if (held) { L.assign(s, held, r); return; } } }],
  ['mgr', 'over', 'going over the supervisor\'s head', s => { const r = unsent(s)[0], f = r && freeTechs(s).find(c => c.skills[r.job.trade]); if (f) L.assign(s, f, r); }],
  ['mgr', 'budIgnored', 'ignoring the budget', null, { stamp: true }, s => L.setBudget(s, -9000)],
  ['mgr', 'oneTrade', 'letting one person carry a whole trade', null, null, s => { const ctrl = s.crew.filter(c => c.role === 'tech' && c.skills.ctrl); for (const c of ctrl.slice(1)) delete c.skills.ctrl; if (!ctrl.length) { const c = s.crew.find(c => c.role === 'tech'); c.skills.ctrl = 1; } }],
  ['dir', 'prio', 'changing the priority during the day', s => { if (s.gates && s.clock === L.OPEN + 60) L.setFocus(s, s.focus === 'cost' ? 'uptime' : 'cost'); }],
  ['dir', 'overOk', 'approving every overspend', s => answerAll(s, 'budget', 'ok'), null, s => L.setBudget(s, -9000), 12],
  ['dir', 'vipLate', 'settling a dispute after the VIP arrives', s => { for (const it of s.inbox.slice()) if (it.k === 'vip') it.due = Math.min(it.due, s.clock); }],
  ['ceo', 'spin', 'telling the board what it wants to hear', s => answerAll(s, 'board', 'spin')],
  ['ceo', 'empty', 'leaving key posts empty', null, { plan: false }],
  ['ceo', 'floor', 'running the shift from the boardroom', s => { const r = unsent(s)[0]; if (r && !s.prio) L.rush(s, r); }],
];
for (const [seat, key, what, each, extra, setup, days] of MISTAKES) {
  let s = null, n = 0;
  for (const seed of [101, 202, 303, 404]) { s = run(seat, seed, days || 6, each, extra, setup); n = s.sc[seat][key] || 0; if (n) break; }
  if (!n) { check(false, `${seat}: "${what}" never happened (${key})`); continue; }
  const c = s.sc[seat], with1 = L.personal(s).p; c[key] = 0; const with0 = L.personal(s).p; c[key] = n;
  check(with0 > with1, `${seat}: "${what}" happened ${n} times but did not lower the score (${with1.toFixed(3)} vs ${with0.toFixed(3)} without it)`);
}

// --- 2. escalation always settles: no request in your inbox, no escalated request and no escalated sign-off waits past its time
for (const name of ['sup idle', 'sup ignores everything', 'tech idle', 'mgr idle', 'dir idle', 'ceo idle']) {
  const o = P.PLAYERS[name], s = L.newGame(4242); L.setSeat(s, o.seat); let late = '', escN = 0;
  while (!s.final && s.reports.length < 4) {
    if (s.phase === 'plan') { if (o.plan) P.plan(s); L.startDay(s); continue; }
    if (o.hands) P.dispatch(s, o);
    L.step(s); s.fx.length = 0;
    if (s.phase !== 'day') continue;
    for (const it of s.inbox) if (s.clock > it.due + 1 && !late) late = `${it.k} still in the inbox ${s.clock - it.due} min past its time`;
    for (const a of s.asks) if (a.esc && s.clock > a.due + 1 && !late) late = `escalated ${a.it.k} not settled ${s.clock - a.due} min after its time`;
    for (const r of s.rides) if (r.so && r.so.esc && s.clock > r.so.at + r.so.lag + 30 && !late) late = `escalated sign-off on ${r.id} still waiting ${s.clock - r.so.at} min`;
    escN = s.sc[o.seat].esc || 0;
  }
  check(!late, `${name}: ${late}`);
  check(escN > 0, `${name}: nothing was ever escalated, so the test proves nothing`);
}

// --- 3. over $20,000 is the board's, whoever asks
for (const c of [5000, 15000, 20000, 20001, 24000, 60000]) check((L.band(c) === 'board') === (c > L.LIMIT_BOARD), `band(${c}) is ${L.band(c)}`);
for (const seat of ['tech', 'sup', 'mgr', 'dir', 'ceo']) { const s = L.newGame(7); L.setSeat(s, seat); check(L.decider(s, 'sup', 24000).x === 'board', `a $24,000 request from the ${seat} seat did not go to the board`); }
{ // a big-ticket item over the limit: the chief executive can only propose it, and the board answers at the end of the day
  const s = L.newGame(11); L.setSeat(s, 'ceo'); // at the desk, before the first day
  const r = s.rides.find(r => r.sub); s.big.push({ id: ++s.rq, k: 'refurb', rid: r.id, cost: 24000, x: L.band(24000), day: s.day, t: 'Full refurbishment', why: 'test' });
  const b = s.big[s.big.length - 1], cash = s.cash;
  check(b.x === 'board', `a $24,000 big-ticket item was put in the ${b.x} band`);
  L.decideBig(s, b.id, 'yes', 'You');
  check(s.cash === cash && s.boardQ.some(x => x.id === b.id), 'the chief executive approved a $24,000 item alone instead of proposing it to the board');
}

// --- 4. traits and boss styles come from the seed
{
  const a = L.newGame(31337), b = L.newGame(31337), c = L.newGame(31338);
  check(JSON.stringify(a.styles) === JSON.stringify(b.styles), 'the same seed gave different boss styles');
  check(JSON.stringify(a.crew.map(t => [t.name, t.traits])) === JSON.stringify(b.crew.map(t => [t.name, t.traits])), 'the same seed gave different crew traits');
  check(a.crew.some(t => t.traits && t.traits.length) && Object.keys(a.styles).length === 4, 'no crew traits or boss styles at all');
  const differ = [31338, 31339, 31340, 31341].some(sd => JSON.stringify(L.newGame(sd).styles) !== JSON.stringify(a.styles)); check(differ, 'boss styles never change with the seed');
  // an old save with no traits, styles or salt: migrating it twice gives the same ones
  const old = JSON.parse(JSON.stringify(a)); delete old.styles; delete old.salt; old.v = 7; for (const t of old.crew) delete t.traits;
  const m1 = L.migrate(JSON.parse(JSON.stringify(old))), m2 = L.migrate(JSON.parse(JSON.stringify(old)));
  check(m1 && m1.styles && JSON.stringify(m1.styles) === JSON.stringify(m2.styles), 'migrating the same old save twice gave different boss styles');
  check(m1 && m1.crew.every(t => Array.isArray(t.traits)) && JSON.stringify(m1.crew.map(t => t.traits)) === JSON.stringify(m2.crew.map(t => t.traits)), 'migrating the same old save twice gave different crew traits');
  check(c && JSON.stringify(c.styles) !== undefined, 'newGame failed');
}

// --- 5. no NaN anywhere, and nothing that counts goes below zero
function walk(x, path, out) {
  if (typeof x === 'number') { if (!Number.isFinite(x)) out.push(path + ' is ' + x); return; }
  if (!x || typeof x !== 'object') return;
  for (const k of Object.keys(x)) walk(x[k], path + '.' + k, out);
}
for (const name of ['sup skilled', 'sup ignores everything', 'sup rubber stamp', 'sup on the tools', 'tech active', 'mgr active', 'dir idle', 'ceo active']) {
  const s = P.season(909, P.PLAYERS[name]), bad = []; walk(s, 's', bad);
  for (const seat of Object.keys(s.sc)) for (const [k, v] of Object.entries(s.sc[seat])) if (typeof v === 'number' && v < 0 && k !== 'conf0') bad.push(`sc.${seat}.${k} = ${v}`); // conf0 is -1 until set
  for (const [k, v] of Object.entries(s.stock)) if (v < 0) bad.push(`stock.${k} = ${v}`);
  for (const t of s.crew) for (const k of ['morale', 'en']) if (t[k] != null && (t[k] < 0 || t[k] > 100)) bad.push(`${t.name}.${k} = ${t[k]}`);
  for (const r of s.rides) if (r.health < 0 || r.health > 100) bad.push(`${r.id}.health = ${r.health}`);
  for (const k of ['conf', 'cm', 'glow', 'comp']) if (s[k] < 0 || s[k] > 100) bad.push(`${k} = ${s[k]}`);
  const f = s.final; for (const [k, v] of Object.entries(f.pts)) if (v < 0) bad.push(`final.pts.${k} = ${v}`);
  if (f.total < 0 || f.total > 100 || f.own.p < 0 || f.own.p > 1) bad.push(`final total ${f.total}, own ${f.own.p}`);
  check(!bad.length, `${name}: ${bad.slice(0, 4).join('; ')}`);
}

if (fails.length) { console.error(`DUTIES FAILED: ${fails.length} problem(s)`); for (const f of fails) console.error('  ' + f); process.exit(1); }
console.log(`duties OK: ${MISTAKES.length} seat-card mistakes happen and cost, escalation always settles, $20,000+ goes to the board, traits and styles follow the seed, no NaN or negatives (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
