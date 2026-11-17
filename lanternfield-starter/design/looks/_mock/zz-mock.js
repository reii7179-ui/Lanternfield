/* Mock-up builds only (design/), never in the shipped game: jump a seeded game to a chosen moment for screenshots. */
window.__mock = {
  // P: the scripted players from tests/engine/players.js; o: the player settings ('sup human')
  scene({ seed, day, clock, idle = 6, fresh = true, P, o }) {
    S = L.newGame(seed); S.fx = []; L.setSeat(S, 'sup');
    ui.title = false; ui.desk = null; ui.tab = 'team'; ui.dc = null; ui.coach = null;
    const at = () => S.day > day || (S.day === day && S.phase === 'day' && S.clock >= clock);
    while (!at()) {
      if (S.phase === 'plan') { P.plan(S); L.startDay(S); continue; }
      const late = S.day === day && S.clock >= clock - idle; // stop answering just before, so a fresh fault is on the map
      if (!late) { if (S.clock % o.every === 0) P.dispatch(S, o); if (S.clock % o.inboxEvery === 0) P.answerAll(S); P.seatPlay(S, o); }
      L.step(S); S.fx.length = 0;
    }
    // keep going (still hands-off) until a fault is inside its fast-response window, for at most 40 minutes
    for (let i = 0; i < 40 && fresh && !S.rides.some(r => r.job && r.job.type === 'fault' && !r.job.first && S.clock - r.job.t0 <= L.FAST - 2); i++) { L.step(S); S.fx.length = 0; }
    for (const c of S.crew) prev[c.id] = [c.x, c.y];
    lanterns.length = 0; guests.length = 0; for (let i = 0; i < 900; i++) stepGuests(.25);
    S.paused = false; S.speed = 0; // frozen without the pause dialog
    const down = S.rides.filter(r => r.job && r.job.type === 'fault').map(r => r.short);
    ui.sel = (S.rides.find(r => r.job && r.job.type === 'fault') || {}).id || null;
    return { day: S.day, clock: L.fmtClock(S.clock), faults: down, crewOn: S.crew.filter(c => c.on).length, guests: guests.length };
  },
  lanterns(n) { // n lanterns caught mid-rise above the lit rides (a slow drift, so a screenshot finds them in place)
    const lit = S.rides.filter(r => r.sub && r.lh >= L.LIT_MIN), now = performance.now();
    for (let i = 0; i < n; i++) { const r = lit[i % Math.max(1, lit.length)] || S.rides[i % 12], h = 30 + Math.random() * 240, vy = 16, e = h / (3 * vy) * 1000; lanterns.push({ x: r.x + (Math.random() - .5) * 40, y: r.y - 16, vy, ph: Math.random() * 6, t0: now - e, life: e / .35 }); }
  },
  zoom(z, x, y) { cam.z = z; cam.x = x; cam.y = y; cam.user = true; applyCam(); },
  // keep the scripted player playing while the clip runs (recordings only): it acts before every park minute
  drive(P, o) { const step = LF.step; LF.step = st => { if (st.phase === 'day') { if (st.clock % o.every === 0) P.dispatch(st, o); if (st.clock % o.inboxEvery === 0) P.answerAll(st); P.seatPlay(st, o); } return step(st); }; },
};
