'use strict';
// Random-input test: plays seasons where every engine command is called at random, at the wrong time, by the wrong seat,
// and checks after every step that nothing throws and no number goes bad (NaN, negative stock, out-of-range health...).
//   node tests/engine/fuzz.js [seasons per style, default 30]
const { loadEngine } = require('./load.js');
const L = loadEngine();
const N = +(process.argv[2] || 30);
let rs = 1;
const r = () => (rs = (rs * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(r() * a.length)];
const issues = {};
const note = (k, where) => { if (!issues[k]) issues[k] = { n: 0, first: where }; issues[k].n++; };

function check(s, w) {
  for (const k of ['cash', 'glow', 'conf', 'comp']) if (!Number.isFinite(s[k])) note(k + ' is not a number', w);
  if (s.conf < 0 || s.conf > 100) note('board confidence out of range', w);
  for (const k in s.stock) if (s.stock[k] < 0) note('negative stock of ' + k, w);
  for (const ri of s.rides) { if (!Number.isFinite(ri.health)) note('ride health not a number', w); if (ri.health < 0 || ri.health > 100) note('ride health out of range', w); }
  for (const t of s.crew) {
    if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) note('crew position not a number', w);
    if (!Number.isFinite(t.morale)) note('morale not a number', w);
    if (t.en != null && !(t.en >= 0 && t.en <= 100)) note('energy out of range', w);
    if (t.risk != null && !Number.isFinite(t.risk)) note('injury risk not a number', w);
    if (t.target && !L.ride(s, t.target)) note('crew sent to a ride that does not exist', w);
    if (t.brk && t.target) note('on a break and on a job at once', w);
    if (t.talk && t.target) note('at a talk and on a job at once', w);
    if (t.agency && s.phase === 'plan') note('agency staff kept overnight', w);
  }
  if (s.prio && !(L.ride(s, s.prio) || {}).job) note('rush job on a ride with nothing wrong', w);
  if (s.seat === 'tech' && !L.staff(s, s.me)) note('technician seat with no technician', w);
  if (s.final && !Number.isFinite(s.final.total)) note('final score not a number', w);
}

const planCmds = s => [
  () => s.cands.length && L.hire(s, Math.floor(r() * s.cands.length)),
  () => L.order(s, pick(Object.keys(L.SKU)), 'std'),
  () => L.setSeat(s, pick(L.LV), pick(s.crew).id),
  () => L.setStrategy(s, pick(Object.keys(L.STRATEGY))),
  () => L.setFocus(s, pick(Object.keys(L.FOCUS))),
  () => L.ask(s, pick(Object.keys(L.ASK)), { rid: pick(s.rides).id, sku: pick(Object.keys(L.SKU)), k: pick(Object.keys(L.PERKS)), tr: pick(['mech', 'elec', 'ctrl', 'sup']), id: pick(L.ORG)[0] }),
  () => L.buyPerk(s, pick(Object.keys(L.PERKS))),
  () => L.setBudget(s, Math.floor(r() * 8000)),
  () => L.setShift(s, pick(s.crew), pick(['early', 'late', 'full'])),
  () => L.overhaul(s, pick(s.rides)),
  () => L.setDiff(s, pick(['relaxed', 'standard', 'sharp'])),
];
const dayCmds = s => [
  () => L.setSeat(s, pick(L.LV), pick(s.crew).id),
  () => { if (s.inbox.length) { const it = pick(s.inbox), o = L.optsOf(s, it); L.answer(s, it.id, o.length ? pick(o).v : 'brief'); } },
  () => L.ask(s, pick(Object.keys(L.ASK)), { rid: pick(s.rides).id, sku: pick(Object.keys(L.SKU)), k: pick(Object.keys(L.PERKS)), tr: pick(['mech', 'elec', 'ctrl']), id: pick(L.ORG)[0] }),
  () => L.assign(s, pick(s.crew), pick(s.rides), pick([undefined, 'full', 'patch'])),
  () => L.walk(s, pick(['safety', 'pace', 'care', undefined])),
  () => L.diagnose(s, Math.floor(r() * 4)),
  () => L.lockout(s, r() < 0.5),
  () => L.order(s, pick(Object.keys(L.SKU)), pick(['exp', 'std'])),
  () => L.callout(s, pick(s.rides)),
  () => L.setMode(s, pick(s.rides), pick(['full', 'patch'])),
  () => L.sprint(s, pick(s.crew)),
  () => L.pushOn(s, pick(s.crew)),
  () => L.moveOrder(s, pick(s.crew), r() * 1000, r() * 680),
  () => L.rest(s, pick(s.crew)),
  () => L.talk(s, null, pick(['safety', 'pace', 'care'])),
  () => L.rush(s, pick(s.rides)),
  () => L.callIn(s, pick(s.crew)),
  () => L.agency(s),
  () => L.vouch(s, pick(s.rides)),
  () => L.orderService(s, pick(s.rides)),
  () => L.fastLane(s, pick(s.rides)),
  () => L.happyHour(s),
  () => L.briefChair(s),
  () => L.standDown(s, pick(s.crew)),
  () => L.holdOver(s, pick(s.crew)),
];

function play(seed, style) {
  const s = L.newGame(seed); rs = seed * 7 + 3; let steps = 0;
  while (!s.final && steps < 30 * 900) {
    if (s.phase === 'plan') {
      if (style === 'fuzz') for (let k = 0; k < 5; k++) { try { pick(planCmds(s))(); } catch (e) { note('throw at the desk: ' + e.message, e.stack.split('\n').slice(0, 3).join(' | ')); } }
      try { L.startDay(s); } catch (e) { note('throw in startDay: ' + e.message, e.stack.split('\n').slice(0, 3).join(' | ')); break; }
      check(s, 'start of day ' + s.day); continue;
    }
    if (style === 'fuzz' && r() < 0.3) { try { pick(dayCmds(s))(); } catch (e) { note('throw on a command: ' + e.message, e.stack.split('\n').slice(0, 3).join(' | ')); } }
    try { L.step(s); } catch (e) { note('throw in step: ' + e.message, `day ${s.day} ${L.fmtClock(s.clock)} seat ${s.seat} ` + e.stack.split('\n').slice(0, 3).join(' | ')); break; }
    s.fx.length = 0; steps++; check(s, `day ${s.day} ${L.fmtClock(s.clock)}`);
  }
  if (!s.final) note('season never finished', 'seed ' + seed);
  return s;
}

const t0 = Date.now();
for (const style of ['idle', 'fuzz']) for (let seed = 1; seed <= N; seed++) play(seed, style);
const keys = Object.keys(issues);
if (keys.length) { console.error(`FUZZ FAILED: ${keys.length} kinds of problem in ${2 * N} seasons`); for (const k of keys) console.error(`  ${k} (x${issues[k].n}) first at ${issues[k].first}`); process.exit(1); }
console.log(`fuzz OK: ${2 * N} seasons, every command at random, no problems (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
