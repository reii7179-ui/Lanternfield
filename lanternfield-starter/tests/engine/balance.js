'use strict';
// Balance report: plays seeded seasons for each scripted player and prints the spread of results.
// This is for judging changes, not a pass/fail test. Compare with the reference numbers in tests/README.md.
//   node tests/engine/balance.js                       every player, 12 seeds
//   node tests/engine/balance.js "sup human,sup slow" 30
const { loadEngine } = require('./load.js');
const L = loadEngine(), { season, PLAYERS } = require('./players.js')(L);
const names = process.argv[2] ? process.argv[2].split(',').map(x => x.trim()) : Object.keys(PLAYERS), N = +(process.argv[3] || 12);
console.log(`${'player'.padEnd(22)} ${'mean'.padStart(5)} ${'sd'.padStart(5)}  p10  med  p90  fired  grades`);
for (const name of names) {
  const o = PLAYERS[name]; if (!o) { console.log(name + ': unknown player. Known: ' + Object.keys(PLAYERS).join(', ')); continue; }
  const t = [], g = {}; let fired = 0;
  for (let i = 1; i <= N; i++) { const s = season(i * 101, o), f = s.final; t.push(f.total); g[f.grade] = (g[f.grade] || 0) + 1; if (f.fired) fired++; }
  const m = t.reduce((a, b) => a + b, 0) / N, sd = Math.sqrt(t.reduce((a, b) => a + (b - m) ** 2, 0) / N); t.sort((a, b) => a - b);
  console.log(`${name.padEnd(22)} ${m.toFixed(1).padStart(5)} ${sd.toFixed(1).padStart(5)}  ${String(t[Math.floor(N * 0.1)]).padStart(3)}  ${String(t[Math.floor(N / 2)]).padStart(3)}  ${String(t[Math.floor(N * 0.9)]).padStart(3)}  ${(fired + '/' + N).padStart(5)}  ${['A', 'B', 'C', 'D'].map(k => g[k] ? k + g[k] : '').filter(Boolean).join(' ')}   ${o.about}`);
}
