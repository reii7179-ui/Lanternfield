'use strict';
// Sums up the playtest records your testers send you. Paste each one into a text file (any order, anything around them,
// one file or several), then:
//   npm run records -- records.txt [more.txt ...]
// Prints one line per record and a few totals. Records from different builds are kept apart.
const fs = require('fs');
const files = process.argv.slice(2);
if (!files.length) { console.error('Usage: npm run records -- <file with pasted records> [more files]'); process.exit(1); }
const recs = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (let i = s.indexOf('{"build"'); i >= 0; i = s.indexOf('{"build"', i + 1)) { // each record is one JSON object; find where it ends
    let depth = 0, str = false, end = -1;
    for (let j = i; j < s.length; j++) { const c = s[j]; if (str) { if (c === '\\') j++; else if (c === '"') str = false; } else if (c === '"') str = true; else if (c === '{') depth++; else if (c === '}' && !--depth) { end = j; break; } }
    try { recs.push({ file: f, ...JSON.parse(s.slice(i, end + 1)) }); } catch (e) { console.error(`${f}: skipped a record that did not parse (was it cut short?)`); }
  }
}
if (!recs.length) { console.error('No records found: each starts with {"build"'); process.exit(1); }
const med = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const n = (x, d = 1) => x == null ? '-' : (+x).toFixed(d), pad = (x, w) => String(x).padStart(w);
const days = r => (r.days || []).concat(r.today ? [{ ...r.today, partial: true }] : []);
console.log(`${recs.length} record${recs.length > 1 ? 's' : ''}\n`);
console.log('build            seat  difficulty days  react s  fast %  answer s  grade  device');
for (const r of recs) {
  const d = days(r), dv = r.device || {};
  console.log(`${String(r.build).padEnd(16)} ${String(r.seat).padEnd(5)} ${String(r.difficulty).padEnd(10)} ${pad(r.finished + (r.today ? '+' : ''), 4)} ${pad(n(med(d.map(x => x.react))), 8)} ${pad(n(med(d.map(x => x.fast)), 0), 7)} ${pad(n(med(d.map(x => x.answer))), 9)}  ${String(r.grade || '-').padEnd(5)}  ${dv.screen || '?'}${dv.touch ? ' touch' : ''}${dv.motion === 'reduced' ? ', reduced motion' : ''}${dv.sound ? ', sound on' : ''}`);
}
for (const b of [...new Set(recs.map(r => r.build))]) {
  const all = recs.filter(r => r.build === b).flatMap(days);
  console.log(`\n${b}: ${all.length} days from ${recs.filter(r => r.build === b).length} record(s). Median reaction ${n(med(all.map(x => x.react)))} s, fast responses ${n(med(all.map(x => x.fast)), 0)}%, requests answered in ${n(med(all.map(x => x.answer)))} s.`);
}
console.log('\nreact: seconds of running clock from a breakdown to your order. fast: share of faults reached inside the fast-response window.\nanswer: seconds to answer a request. days: finished days (+ means a day in progress is included).');
