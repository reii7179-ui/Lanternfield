'use strict';
// Golden master: the same seeded seasons, played by the same scripted players, must give exactly the same results.
// This is how you know visual or code changes have not quietly changed how the game plays.
//   node tests/engine/golden.js            check against golden.json (exits 1 on any difference)
//   node tests/engine/golden.js --update   rewrite golden.json: only when a gameplay change is intended, and say so in the commit
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { loadEngine } = require('./load.js');
const L = loadEngine(), { season, PLAYERS } = require('./players.js')(L);

const SET = ['sup human', 'sup skilled', 'sup human sharp', 'tech active', 'mgr active', 'dir active', 'ceo active'];
const SEEDS = [101, 202, 303, 404, 505];
const FILE = path.join(__dirname, 'golden.json');

function result(s) {
  const f = s.final;
  const digest = crypto.createHash('sha1').update(JSON.stringify({ final: f, days: s.reports.map(r => [r.day, r.up, r.net, r.n, r.faults, r.conf]) })).digest('hex').slice(0, 16);
  return { grade: f.grade, total: f.total, company: f.company, own: Math.round(f.own.p * 1000) / 1000, cash: Math.round(s.cash), lanterns: s.total, injuries: f.inj, days: s.reports.length, digest };
}

const t0 = Date.now(), now = {};
for (const name of SET) for (const seed of SEEDS) now[`${name} / ${seed}`] = result(season(seed, PLAYERS[name]));
const secs = ((Date.now() - t0) / 1000).toFixed(1);

if (process.argv.includes('--update')) {
  fs.writeFileSync(FILE, JSON.stringify({ note: 'Written by tests/engine/golden.js --update. Do not edit by hand.', players: SET, seeds: SEEDS, results: now }, null, 1) + '\n');
  console.log(`golden.json updated: ${Object.keys(now).length} seasons in ${secs}s`);
  process.exit(0);
}
if (!fs.existsSync(FILE)) { console.error('No golden.json yet. Run with --update once, on a version you trust.'); process.exit(2); }
const want = JSON.parse(fs.readFileSync(FILE, 'utf8')).results;
const bad = [];
for (const k of Object.keys(want)) {
  const a = want[k], b = now[k];
  if (!b) { bad.push(`${k}: missing`); continue; }
  const diff = Object.keys(a).filter(f => a[f] !== b[f]).map(f => `${f} ${a[f]} -> ${b[f]}`);
  if (diff.length) bad.push(`${k}: ${diff.join(', ')}`);
}
if (bad.length) {
  console.error(`GOLDEN MASTER FAILED: ${bad.length} of ${Object.keys(want).length} seasons play differently from golden.json.`);
  for (const line of bad.slice(0, 12)) console.error('  ' + line);
  console.error('If the gameplay change was not intended, find what changed in the engine. If it was, run with --update and explain it in the commit.');
  process.exit(1);
}
console.log(`golden master OK: ${Object.keys(want).length} seasons identical (${secs}s)`);
