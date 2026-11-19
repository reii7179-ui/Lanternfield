'use strict';
// The Manager and Technician balance rules, each in a small set-up scene:
// - a rush past the free limit counts as going over the supervisor's head; the free ones don't;
// - a rush alone never makes a ride a spending priority (keySpend); a major fault, stuck guests or the VIP's ride do;
// - the rolling budget is always a real number, covers at most ROLL days, and decides the days on budget;
// - a contractor on the way does not hold the job, and is stood down for the call-off fee when our own crew start it;
// - every contractor job needs the Manager's acceptance before it reopens;
// - the technician's grade is TECH_CO company, the rest their own work; every other seat stays 80/20;
// - a job counts as done properly only with a lockout, the cause found and a test run;
// - the same seed gives the same season;
// - on Sharp a technician needs more jobs done properly for full marks and gets shorter windows; on Relaxed, fewer and longer.
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

// --- 4. a contractor on the way does not hold the job: our own crew can be sent, and the contractor is stood down
{
  const s = dayAt('mgr', 600), r = s.rides.find(x => x.sub && !x.job); fault(s, r, 'major');
  const cash0 = s.cash; check(L.callout(s, r) === true, 'could not call a contractor');
  const fee = cash0 - s.cash, c = s.crew.find(t => t.temp && t.target === r.id);
  check(c && !L.attended(s, r), 'a ride with only a contractor on the way counted as attended');
  const own = s.crew.find(t => t.role === 'tech' && t.on && !t.temp && t.skills[r.job.trade]);
  if (own) { own.target = null; L.assign(s, own, r, null, true); own.x = r.x + 10; own.y = r.y + 10; for (let i = 0; i < 4; i++) { L.step(s); s.fx.length = 0; }
    check(!s.crew.includes(c), 'the contractor was not stood down when our own crew started the job');
    check(Math.abs((cash0 - s.cash) - L.CALL_OFF) < fee, `standing the contractor down did not refund the call-out (paid ${fee}, now ${cash0 - s.cash})`); }
}

// --- 5. every contractor job needs the Manager's acceptance before it reopens
{
  const M = require('./mgr-players.js')(L); let ctr = 0, signed = 0;
  for (const [p, seed] of [['skilled', 404], ['casual', 505]]) {
    const step0 = L.step, seen = new Map();
    L.step = s => { const before = s.rides.map(r => r.so); step0(s);
      s.rides.forEach((r, i) => { const o = before[i];
        if (r.so && r.so.ctr && !seen.has(r.so)) { seen.set(r.so, 1); ctr++; check(r.so.steps.includes('mgr'), `${p}: a contractor's job had no Manager step (${r.so.steps.join(',')})`); }
        if (o && o.ctr && !r.so && !r.job) { if (o.by.mgr) signed++; else check(false, `${p}: ${r.id} reopened after a contractor's job without the Manager's acceptance`); } }); };
    M.season(seed, p, 'standard'); L.step = step0;
  }
  check(ctr > 0 && signed > 0, `no contractor job came up to check (${ctr} jobs, ${signed} accepted)`);
}

// --- 6. the grade: a technician's is TECH_CO company and the rest their own work; every other seat stays 80/20
{
  const want = { tech: { co: L.TECH_CO, own: Math.round((1 - L.TECH_CO) * 100) }, sup: { co: .8, own: 20 }, mgr: { co: .8, own: 20 }, dir: { co: .8, own: 20 }, ceo: { co: .8, own: 20 } };
  check(L.TECH_CO >= .25 && L.TECH_CO <= .35, `the technician's company weight ${L.TECH_CO} is outside 25-35%`);
  for (const seat of Object.keys(want)) {
    const s = L.newGame(808); L.setSeat(s, seat); L.startDay(s); while (s.phase === 'day') { L.step(s); s.fx.length = 0; }
    const f = L.review(s), w = want[seat], co = Object.values(f.pts).reduce((a, x) => a + x, 0);
    check(f.own.seat === seat, `${seat}: the own-work score was judged in the ${f.own.seat} seat`);
    check(f.split && f.split.co === w.co && f.split.own === w.own, `${seat}: the grade split is ${JSON.stringify(f.split)}, not ${JSON.stringify(w)}`);
    check(f.total === Math.round(co * w.co + f.own.p * w.own), `${seat}: total ${f.total} is not company ${co.toFixed(1)} x ${w.co} + own ${f.own.p.toFixed(3)} x ${w.own}`);
  }
}

// --- 7. a technician's job counts as done properly only with a lockout, the cause found and a test run
{
  const s = L.newGame(909); L.setSeat(s, 'tech');
  const sheet = (lk, cause, test, fit) => ({ mine: { lk }, wr: { cause, test }, lead: s.me, by: { fit } });
  check(L.isProper(s, sheet(true, 'found', true, 'You')), 'a job locked out, cause found and test-run did not count as done properly');
  check(!L.isProper(s, sheet(false, 'found', true, 'You')), 'a job without a lockout counted as done properly');
  check(!L.isProper(s, sheet(true, 'found', false, 'You')), 'a job signed without a test run counted as done properly');
  check(!L.isProper(s, sheet(true, 'guess', true, 'You')) && !L.isProper(s, sheet(true, 'none', true, 'You')), 'a job with the cause guessed or not found counted as done properly');
  check(!L.isProper(s, sheet(true, 'found', true, 'Mo')), 'your own job, signed fit by someone else after you missed it, counted as done properly');
  check(L.isProper(s, sheet(true, 'service', true, 'You')) && L.isProper(s, sheet(true, 'reset', true, 'You')), 'a service or a quick reset (no cause to find) did not count as done properly');
  check(!L.isProper(s, { wr: { cause: 'found', test: true }, lead: 'x', by: {} }), "a job you did not work on counted as yours");
  const T = require('./tech-players.js')(L);
  const cut = T.season(606, 'cutter', 'standard').sc.tech, sk = T.season(606, 'skilled', 'standard').sc.tech;
  check(cut.jobs > 0 && cut.jobsOk === 0, `the cutter (no lockout, no test run) finished ${cut.jobs} jobs and ${cut.jobsOk} counted as done properly`);
  check(sk.jobsOk > 0 && sk.jobsOk <= sk.jobs, `the skilled technician has ${sk.jobsOk} jobs done properly of ${sk.jobs}`);
  const old = JSON.parse(JSON.stringify(L.newGame(5))); delete old.sc.tech.jobsOk; old.sc.tech.jobs = 7; old.v = 9;
  check(L.migrate(old).sc.tech.jobsOk === 7 && old.v === L.SAVE_V, 'an older save does not get its jobs done properly');
}

// --- 8. the same seed gives the same season, in both seats
{
  const M = require('./mgr-players.js')(L), T = require('./tech-players.js')(L);
  const sum = s => JSON.stringify({ f: s.final, cash: s.cash, lit: s.total, sc: s.sc, reports: s.reports });
  check(sum(M.season(1313, 'skilled', 'standard')) === sum(M.season(1313, 'skilled', 'standard')), 'the same seed gave two different Manager seasons');
  check(sum(T.season(1313, 'skilled', 'standard')) === sum(T.season(1313, 'skilled', 'standard')), 'the same seed gave two different Technician seasons');
}

// --- 9. difficulty reaches the technician's own work: more jobs for full marks and shorter windows on Sharp, fewer and longer on Relaxed
{
  const D = L.DIFF;
  check(D.relaxed.jobs < D.standard.jobs && D.standard.jobs < D.sharp.jobs && D.standard.jobs === L.JOBS_DAY, `jobs for full marks do not rise with difficulty: ${D.relaxed.jobs}, ${D.standard.jobs}, ${D.sharp.jobs}`);
  const part = (diff, n) => { const s = L.newGame(31); L.setSeat(s, 'tech'); s.diff = diff; Object.assign(s.sc.tech, { min: L.CLOSE - L.OPEN, days: 1, jobs: n, jobsOk: n });
    return L.personal(s).parts.find(x => x[0] === 'Jobs done properly')[2]; };
  const [pr, ps, pt] = ['relaxed', 'standard', 'sharp'].map(d => part(d, 2.8));
  check(pr > ps && ps > pt, `the same 2.8 jobs a day did not score lower on harder difficulties (relaxed ${pr}, standard ${ps}, sharp ${pt})`);
  for (const diff of ['relaxed', 'standard', 'sharp']) {
    const s = L.newGame(4545); L.setDiff(s, diff); L.setSeat(s, 'tech'); L.startDay(s); let wo = null;
    while (!wo && s.phase === 'day') { L.step(s); s.fx.length = 0; wo = s.inbox.find(x => x.k === 'wo'); }
    const want = Math.round(15 * D[diff].win);
    check(wo && wo.due - wo.at === want, `${diff}: a work order gave ${wo ? wo.due - wo.at : 'none'} minutes to answer, not ${want}`);
  }
  // the window multipliers: shorter on Sharp, longer on Relaxed, none on Standard (only the player's own technician has them)
  check(L.DIFF.sharp.win < 1 && L.DIFF.relaxed.win > 1 && L.DIFF.standard.win === 1, 'the technician\'s window multipliers are not shorter on Sharp and longer on Relaxed');
}

if (fails.length) { console.error(`MGR-TECH FAILED: ${fails.length} problem(s)`); for (const f of fails) console.error('  ' + f); process.exit(1); }
console.log(`mgr-tech OK: rush limit, keySpend, rolling budget, contractor stand-down, contractor acceptance, grade split, jobs done properly, same seed same season, difficulty in the technician's own work (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
