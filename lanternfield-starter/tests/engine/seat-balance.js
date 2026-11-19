'use strict';
// Balance tables for the Manager and Technician seats, 12 seasons per row.
//   node tests/engine/seat-balance.js            both seats
//   node tests/engine/seat-balance.js mgr        one seat (mgr or tech)
// Optional: LF_GAME=path/to/index.html (default: the engine load.js finds)
const { loadEngine } = require(process.env.LOAD || './load.js');
const L = loadEngine(process.env.LF_GAME);
const M = require('./mgr-players.js')(L), T = require('./tech-players.js')(L);
const SEEDS = [101, 202, 303, 404, 505, 606, 707, 808, 909, 1010, 1111, 1212];
const med = a => { const b = a.slice().sort((x, y) => x - y); return +((b[5] + b[6]) / 2).toFixed(1); };
const ROWS = {
  mgr: [['idle', 'standard'], ['casual', 'standard'], ['skilled', 'standard'], ['rusher', 'standard'], ['pincher', 'standard'], ['skilled', 'relaxed'], ['skilled', 'sharp']],
  tech: [['idle', 'standard'], ['casual', 'standard'], ['skilled', 'standard'], ['cutter', 'standard'], ['skilled', 'relaxed'], ['skilled', 'sharp']],
};
const which = process.argv[2] ? [process.argv[2]] : ['mgr', 'tech'];
for (const seat of which) {
  const P = seat === 'mgr' ? M : T;
  console.log(`\n${seat === 'mgr' ? 'ENGINEERING MANAGER' : 'TECHNICIAN'}`);
  console.log('player    diff      median  min  max  A-share  company  own/20' + (seat === 'mgr' ? '  budget-days' : ''));
  for (const [p, d] of ROWS[seat]) {
    const t = [], co = [], own = [], bud = []; let A = 0;
    for (const seed of SEEDS) { const s = P.season(seed, p, d), f = s.final; t.push(f.total); co.push(f.company); own.push(f.own.p * 20); if (seat === 'mgr') bud.push(s.sc.mgr.budOk / 14); if (f.grade === 'A') A++; }
    console.log(p.padEnd(9), d.padEnd(9), String(med(t)).padStart(6), String(Math.min(...t)).padStart(4), String(Math.max(...t)).padStart(4), (Math.round(A / SEEDS.length * 100) + '%').padStart(8), String(med(co)).padStart(8), med(own).toFixed(1).padStart(7) + (seat === 'mgr' ? (Math.round(med(bud) * 100) + '%').padStart(13) : ''));
  }
}
