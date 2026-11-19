'use strict';
// Replay: the same seed and the same player must give exactly the same season, down to every number in the state.
// Each scripted player below plays each seed three times:
//   1. straight through;
//   2. straight through again: the whole final state must match 1 exactly (all game randomness goes through rnd(s));
//   3. saved and loaded every night (the state turned to JSON and back, then migrate()): must also match 1 exactly,
//      which proves nothing the game needs lives outside the saved state.
// States are compared as data: key order is ignored, and both are passed through migrate() first, which only fills in
// fields a fresh game leaves unset (a ride's so, restart, gb) with values that play the same.
//   node tests/engine/replay.js [seeds, default 2]
const { loadEngine } = require('./load.js');
const L = loadEngine(), { season, PLAYERS, plan, desk, dispatch, answerAll, signOffs, seatPlay } = require('./players.js')(L);
const N = +(process.argv[2] || 2), t0 = Date.now(), fails = [];
const NAMES = ['sup skilled', 'sup human', 'sup rubber stamp', 'tech active', 'mgr active', 'dir active', 'ceo active', 'ceo idle'];

// the same loop as season() in players.js, with a save and load between days
function savedEveryNight(seed, o) {
  let s = L.newGame(seed);
  if (o.seat) L.setSeat(s, o.seat);
  if (o.diff) L.setDiff(s, o.diff);
  while (!s.final) {
    if (s.phase === 'plan') { s = L.migrate(JSON.parse(JSON.stringify(s))); if (o.plan) plan(s); if (o.inbox) desk(s); L.startDay(s); continue; }
    if (o.hands && (!o.every || s.clock % o.every === 0)) dispatch(s, o);
    if (o.inbox && (!o.inboxEvery || s.clock % o.inboxEvery === 0)) { answerAll(s, o); signOffs(s, o); }
    seatPlay(s, o);
    L.step(s); s.fx.length = 0;
  }
  return s;
}
// a state as plain data: through JSON and migrate(), with object keys sorted
const canon = s => JSON.stringify(L.migrate(JSON.parse(JSON.stringify(s))), (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((o, x) => (o[x] = v[x], o), {}) : v);
// where two states first differ, for a readable failure
function firstDiff(a, b, path = 's') {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) { const d = firstDiff(a[k], b[k], `${path}.${k}`); if (d) return d; }
  return null;
}

let n = 0;
for (const name of NAMES) for (let i = 1; i <= N; i++) {
  const seed = 1000 + i * 7919, o = PLAYERS[name];
  if (!o) { fails.push(`unknown player ${name}`); continue; }
  const ja = canon(season(seed, o)), jb = canon(season(seed, o)), jc = canon(savedEveryNight(seed, o));
  if (ja !== jb) fails.push(`${name}, seed ${seed}: two plays of the same seed differ at ${firstDiff(JSON.parse(ja), JSON.parse(jb))}`);
  if (jc !== ja) fails.push(`${name}, seed ${seed}: saving and loading every night changed the season, first at ${firstDiff(JSON.parse(ja), JSON.parse(jc))}`);
  n++;
}
if (fails.length) { console.error(`REPLAY FAILED: ${fails.length} problem(s)`); for (const f of fails) console.error('  ' + f); process.exit(1); }
console.log(`replay OK: ${n} seasons played three times each (twice straight, once saved and loaded every night), identical to the last number (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
