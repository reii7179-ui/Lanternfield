'use strict';
// The rules of the active seats, checked minute by minute over whole seasons played by scripted players:
// - no ride or facility reopens without the signatures its level needs, or while any padlock is still on it;
// - a red-tagged ride stays closed until the inspector has cleared it;
// - the chief executive never signs a reopen, and nobody countersigns their own work;
// - every ride waiting to reopen eventually reopens or is escalated (nothing waits for ever);
// - everything is the same for the same seed.
//   node tests/engine/rules.js [seeds, default 4]
const { loadEngine } = require('./load.js');
const L = loadEngine(), P = require('./players.js')(L);
const N = +(process.argv[2] || 4);
const problems = {};
const note = (k, where) => { if (!problems[k]) problems[k] = { n: 0, first: where }; problems[k].n++; };
const SIGN = ['fit', 'sup', 'mgr', 'dir', 'review'];

function watch(name, seed) {
  const o = P.PLAYERS[name], s = L.newGame(seed);
  if (o.seat) L.setSeat(s, o.seat);
  let opened = 0, waited = 0;
  while (!s.final) {
    if (s.phase === 'plan') { if (o.plan) P.plan(s); L.startDay(s); continue; }
    if (o.hands && (!o.every || s.clock % o.every === 0)) P.dispatch(s, o);
    if (o.inbox && (!o.inboxEvery || s.clock % o.inboxEvery === 0)) { P.answerAll(s); P.signOffs(s, o); }
    P.seatPlay(s, o);
    const before = s.rides.map(r => r.so ? JSON.parse(JSON.stringify(r.so)) : null), day = s.day;
    L.step(s); s.fx.length = 0;
    if (s.day !== day || s.phase !== 'day') continue; // the managers sign off whatever is left at closing time
    const where = `${name} seed ${seed} day ${s.day} ${L.fmtClock(s.clock)}`;
    s.rides.forEach((r, i) => {
      const b = before[i]; if (!b) return;
      const now = r.so;
      if (now && now.steps.join() === b.steps.join() && now.i === b.i && !now.esc && s.clock - now.at > 150) note('a ride waited at one step for more than 150 minutes without being escalated', where + ' ' + r.id + ' ' + now.steps[now.i]);
      if (now || r.job) return; // still waiting, or a new fault replaced the sign-off
      opened++; waited += s.clock - b.t0;
      if (b.i !== b.steps.length - 1) note('reopened before its last step', where + ' ' + r.id + ' at ' + b.steps[b.i]);
      if (b.pads.length) note('reopened with a padlock still on', where + ' ' + r.id);
      for (const k of b.steps) if (SIGN.includes(k) && k !== b.steps[b.i] && !b.by[k]) note('reopened without the signature for ' + k, where + ' ' + r.id);
      if (b.steps[b.i] === 'insp' && !(s.clock >= b.inspAt)) note('red tag reopened before the inspector came back', where + ' ' + r.id);
      for (const k of ['sup', 'mgr', 'dir']) if (b.by[k] && b.by[k] === b.wr.who) note('the person who did the work countersigned it', where + ' ' + r.id);
    });
    for (const r of s.rides) if (r.so && ['sup', 'mgr', 'dir', 'review'].includes(r.so.steps[r.so.i]) && r.so.x === 'ceo') note('the chief executive was asked to sign a reopen', where + ' ' + r.id);
    if (s.reports.length > 30) break;
  }
  return { s, opened, waited };
}

const t0 = Date.now(); let total = 0, mins = 0;
for (const name of ['sup skilled', 'sup idle', 'tech active', 'mgr active', 'dir active', 'ceo active'])
  for (let i = 1; i <= N; i++) { const { opened, waited } = watch(name, i * 97); total += opened; mins += waited; }
// determinism: the same seed and player give exactly the same season
for (const name of ['sup human', 'mgr active']) {
  const a = P.season(4242, P.PLAYERS[name]), b = P.season(4242, P.PLAYERS[name]);
  if (JSON.stringify(a.final) !== JSON.stringify(b.final) || a.cash !== b.cash || JSON.stringify(a.reports) !== JSON.stringify(b.reports)) note('the same seed gave a different season', name);
}
if (!total) note('no ride was ever signed back into service', 'all players');
const keys = Object.keys(problems);
if (keys.length) { console.error(`RULES FAILED: ${keys.length} kinds of problem`); for (const k of keys) console.error(`  ${k} (x${problems[k].n}) first at ${problems[k].first}`); process.exit(1); }
console.log(`rules OK: ${total} reopenings checked (average wait ${(mins / Math.max(1, total)).toFixed(1)} park min), deterministic (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
