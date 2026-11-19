'use strict';
// Workload: how many actions per park hour each seat needs, counted from the scripted active players (every engine
// command they call that succeeds: dispatching, answering, signing, checking, ...). Not pass/fail: a report.
// The technician and supervisor should be the busiest and the chief executive the least busy.
//   node tests/engine/workload.js [seeds, default 6]
const { loadEngine } = require('./load.js');
const L = loadEngine(), N = +(process.argv[2] || 6);
const ACTIONS = ['assign', 'moveOrder', 'rest', 'sprint', 'pushOn', 'rush', 'callIn', 'agency', 'vouch', 'orderService', 'fastLane', 'happyHour', 'briefChair', 'crowdPleaser',
  'setMode', 'standDown', 'holdOver', 'callout', 'answer', 'lockout', 'diagnose', 'procedure', 'ask', 'talk', 'walk', 'setFocus', 'setBudget', 'signFit', 'padOff', 'countersign', 'reviewInjury', 'dailyCheck'];
const count = {};
for (const k of ACTIONS) { const f = L[k]; if (typeof f !== 'function') continue;
  L[k] = (...a) => { const s = a[0], b0 = k === 'setBudget' || k === 'setFocus' ? s.budget + '|' + s.focus : '', r = f(...a);
    if (r === true && s && s.phase === 'day' && (!b0 || b0 !== s.budget + '|' + s.focus)) { count[k] = (count[k] || 0) + 1; count._ = (count._ || 0) + 1; } return r; }; } // a setting set to what it already was is not an action
const P = require('./players.js')(L);
const rows = [];
for (const name of ['tech active', 'sup human', 'sup skilled', 'mgr active', 'dir active', 'ceo active']) {
  for (const k in count) delete count[k];
  let mins = 0, onMins = 0;
  for (let i = 1; i <= N; i++) { const o = P.PLAYERS[name], s = L.newGame(i * 101); if (o.seat) L.setSeat(s, o.seat); if (o.diff) L.setDiff(s, o.diff); // P.season, counting the minutes the technician is on shift
    while (!s.final) { if (s.phase === 'plan') { if (o.plan) P.plan(s); if (o.inbox && P.desk) P.desk(s); L.startDay(s); continue; }
      if (o.hands && (!o.every || s.clock % o.every === 0)) P.dispatch(s, o);
      if (o.inbox && (!o.inboxEvery || s.clock % o.inboxEvery === 0)) { P.answerAll(s, o); if (P.signOffs) P.signOffs(s, o); }
      P.seatPlay(s, o); L.step(s); s.fx.length = 0; const m = L.me(s); if (m && m.on) onMins++; }
    mins += s.sc[o.seat].min; }
  if (name === 'tech active') rows.push(['  (on shift)', (count._ || 0) / (onMins / 60), '']);
  const per = (count._ || 0) / (mins / 60), top = Object.entries(count).filter(([k]) => k !== '_').sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${(v / (mins / 60)).toFixed(1)}`).join(', ');
  rows.splice(rows.length - (name === 'tech active' ? 1 : 0), 0, [name, per, top]);
}
console.log('player        actions per park hour   (top actions per hour)');
for (const [n, per, top] of rows) console.log(`${n.padEnd(13)} ${per.toFixed(1).padStart(6)}               ${top}`);
