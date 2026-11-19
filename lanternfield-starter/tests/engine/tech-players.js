'use strict';
// Four scripted Technicians for balance checks. Usage:
//   const T = require('./tech-players.js')(L); const s = T.season(seed, 'skilled', 'standard'); s.final
// They play through the engine's own functions, the same ones the buttons call. The computer runs every other seat.
module.exports = function (L) {
  const PRESETS = {
    idle: { about: 'Does nothing at all', idle: true },
    casual: { about: 'Looks every 6 park minutes; takes work orders, locks out, guesses the cause, test-runs, but never asks for help or parts and does no morning checks', every: 6, guess: true, test: true, checks: false, asks: false },
    skilled: { about: 'Looks every 2 park minutes; morning checks, takes work orders, locks out, uses experience or the written procedure (never a blind guess), asks for help or parts when a job is long or stuck, test-runs, takes the padlock off, refuses unsafe pushes, rests when tired', every: 2, guess: false, test: true, checks: true, asks: true, rest: true },
    cutter: { about: 'Like skilled, but skips the lockout, guesses, signs without a test run and gives in to every push', every: 2, guess: true, test: false, checks: true, asks: true, rest: true, skipLock: true, giveIn: true },
  };
  const near = (t, r) => Math.hypot(t.x - r.x, t.y - r.y) <= 60;
  const go = (s, t, r) => L.moveOrder(s, t, r.x + (t.ox || 0), r.y + (t.oy || 0));
  function tick(s, o) {
    if (s.clock % o.every) return;
    const t = L.me(s); if (!t) return;
    for (const it of s.inbox.slice()) {
      if (it.k === 'wo') L.answer(s, it.id, t.target && t.target !== it.rid ? 'no' : 'go');
      else if (it.k === 'push') L.answer(s, it.id, o.giveIn ? 'give' : 'refuse');
      else if (it.k === 'stay') L.answer(s, it.id, 'go');
      else { const Q = L.REQ[it.k]; let v; try { v = Q.pick ? Q.pick(s, it) : Q.def; } catch (e) { v = Q.def; } L.answer(s, it.id, v); }
    }
    if (!t.on) return;
    // finished jobs: test run and sign "fit to run", then my padlock off
    const fit = s.rides.find(r => r.so && r.so.steps[r.so.i] === 'fit' && r.so.lead === t.id && !r.so.esc && !r.so.signedAt);
    if (fit) { if (near(t, fit)) L.signFit(s, !!o.test); else if (!t.target) go(s, t, fit); return; }
    const pad = s.rides.find(r => r.so && r.so.pads && r.so.pads.includes(t.id));
    if (pad) { if (near(t, pad)) L.padOff(s); else if (!t.target) go(s, t, pad); return; }
    const r = t.target && L.ride(s, t.target), j = r && r.job;
    if (j) {
      if (t.state === 'prep') { L.lockout(s, !!o.skipLock); return; }
      if (t.state === 'diag' && j.opts && !j.dx) {
        const tried = (j.out || []).concat(j.ruled || []), left = [0, 1, 2].filter(k => j.opts[k] && !tried.includes(k));
        if (o.guess || L.gutOk && j.gut != null && L.procedure && (t.skills[j.trade] || 0) + Math.floor(s.sc.tech.ftf / 4) >= 3) { L.diagnose(s, left.includes(j.gut) ? j.gut : left[0]); return; }
        if (!j.proc) { if (L.procedure(s)) return; }
        if (!(t.stall > s.clock)) L.diagnose(s, left.includes(j.gut) ? j.gut : left[0]);
        return;
      }
      if (o.asks && j.type === 'fault' && !s.asks.some(a => a.o && a.o.rid === r.id) && !j.askedAt) {
        if (t.state === 'wait' && j.part) L.ask(s, 'express', { rid: r.id, sku: j.part });
        else if (t.state === 'work' && !s.crew.some(c => c !== t && c.target === r.id && c.on) && j.sev === 'major') L.ask(s, 'help', { rid: r.id });
      }
      return;
    }
    // morning checks on my stretch of the park
    if (o.checks && !t.chkUntil) { const c = L.myChecks(s).sort((a, b) => Math.hypot(t.x - a.x, t.y - a.y) - Math.hypot(t.x - b.x, t.y - b.y))[0]; if (c) { if (near(t, c)) L.dailyCheck(s, c.id); else go(s, t, c); return; } }
    if (o.rest && !t.brk && L.enOf(t) < 40) L.rest(s, t);
  }
  function season(seed, preset, diff) {
    const o = PRESETS[preset]; if (!o) throw new Error('unknown preset ' + preset);
    const s = L.newGame(seed); L.setSeat(s, 'tech'); if (diff) L.setDiff(s, diff);
    while (!s.final) { if (s.phase === 'plan') { L.startDay(s); continue; } if (!o.idle) tick(s, o); L.step(s); s.fx.length = 0; }
    return s;
  }
  return { season, PRESETS };
};
