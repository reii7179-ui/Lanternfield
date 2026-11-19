'use strict';
// The Manager and Technician balance rules, each in a small set-up scene:
// - a rush past the free limit counts as going over the supervisor's head; the free ones don't;
// - a rush alone never makes a ride a spending priority (keySpend); a major fault, stuck guests or the VIP's ride do;
// - the rolling budget is always a real number, covers at most ROLL days, and decides the days on budget.
//   node tests/engine/mgr-tech.js
const { loadEngine } = require('./load.js');
const L = loadEngine();
const fails = [], check = (ok, what) => { if (!ok) fails.push(what); };
const t0 = Date.now();

// a manager's day at 10:00 with a supervisor on shift and some faults to rush
function dayAt(seat, clock, seed = 77) {
  const s = L.newGame(seed); L.setSeat(s, seat); L.startDay(s);
  while (s.clock < clock) { L.step(s); s.fx.length = 0; }
  return s;
}
const fault = (s, r, sev) => { if (r.job) r.job = null; r.so = null; L.createFault(s, r, { title: 'Test fault', trade: 'mech', sev }); r.job.rescue = 0; return r; };

// --- 1. rush jobs: the first RUSH_FREE a day are yours to call; each one after goes over the supervisor's head
{
  const s = dayAt('mgr', 600), sc = s.sc.mgr, rides = s.rides.filter(r => r.sub).slice(0, L.RUSH_FREE + 2);
  rides.forEach(r => fault(s, r, 'minor'));
  const over0 = sc.over;
  for (let i = 0; i < L.RUSH_FREE; i++) { L.rush(s, rides[i]); }
  check(sc.over === over0 && !(sc.rushOver > 0), `the first ${L.RUSH_FREE} rushes counted as going over the supervisor's head (over ${sc.over - over0}, rushOver ${sc.rushOver})`);
  L.rush(s, rides[L.RUSH_FREE]);
  check(sc.over === over0 + 1 && sc.rushOver === 1, `rush number ${L.RUSH_FREE + 1} did not count as going over the supervisor's head once (over +${sc.over - over0}, rushOver ${sc.rushOver})`);
  check(s.d.waitLag > 0, 'a rush over the limit did not teach the crew to wait');
  L.rush(s, rides[L.RUSH_FREE]); // calling it off is not another rush
  check(sc.rushOver === 1, 'calling a rush off counted as another rush');
  const n0 = sc.rushOver; L.rush(s, rides[L.RUSH_FREE + 1], true); // the computer's own rush never counts against you
  check(sc.rushOver === n0, 'a rush by the computer counted against your seat');
}

// --- 2. keySpend: a rush alone is not a priority
{
  const s = dayAt('mgr', 600), [a, b, c] = s.rides.filter(r => r.sub && !s.events.some(e => e.k === 'vip' && e.ride === r.id));
  fault(s, a, 'minor'); L.rush(s, a, true);
  check(s.prio === a.id && !L.keySpend(s, a), 'a rushed ride with a minor fault counted as a spending priority');
  fault(s, b, 'major'); check(L.keySpend(s, b), 'a major fault did not count as a spending priority');
  fault(s, c, 'minor'); c.job.rescue = s.clock + 30; check(L.keySpend(s, c), 'stuck guests did not count as a spending priority');
  const v = s.events.find(e => e.k === 'vip' && !e.done), vr = v && L.ride(s, v.ride);
  if (vr) { fault(s, vr, 'minor'); check(L.keySpend(s, vr), "a fault on the VIP's ride today did not count as a spending priority"); }
}

// --- 3. the rolling budget: always a real number, judged over at most ROLL days, and a day is on budget when its week is
{
  const M = require('./mgr-players.js')(L);
  for (const [p, seed] of [['skilled', 101], ['idle', 202], ['pincher', 303]]) {
    const s = M.season(seed, p, 'standard'); let ok = 0;
    for (const r of s.reports) {
      if (![r.wkSpend, r.wkBudget, r.wkDays].every(Number.isFinite)) check(false, `${p}: day ${r.day} has a rolling budget that is not a number (${r.wkSpend} of ${r.wkBudget})`);
      if (r.wkDays > L.ROLL) check(false, `${p}: day ${r.day} judged over ${r.wkDays} days, more than ${L.ROLL}`);
      if (r.wkSpend <= r.wkBudget) ok++;
    }
    check(s.sc.mgr.budOk === ok, `${p}: days on budget (${s.sc.mgr.budOk}) do not match the rolling weeks (${ok})`);
    check((s.budLog || []).length <= L.ROLL, `${p}: the budget log kept ${s.budLog.length} days`);
    const w = L.rolling(s); check(Number.isFinite(w.spend) && Number.isFinite(w.budget), `${p}: rolling() gave ${JSON.stringify(w)} after the season`);
  }
  const fresh = L.newGame(5), w0 = L.rolling(fresh); check(Number.isFinite(w0.spend) && w0.budget === fresh.budget && w0.days === 1, `a new game's rolling budget is wrong: ${JSON.stringify(w0)}`);
  const old = JSON.parse(JSON.stringify(fresh)); delete old.budLog; old.v = 8; const m = L.migrate(old);
  check(Array.isArray(m.budLog) && Number.isFinite(L.rolling(m).spend), 'an old save without a budget log does not get one');
}

if (fails.length) { console.error(`MGR-TECH FAILED: ${fails.length} problem(s)`); for (const f of fails) console.error('  ' + f); process.exit(1); }
console.log(`mgr-tech OK: rush limit, keySpend, rolling budget (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
