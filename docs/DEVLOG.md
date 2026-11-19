# SATURN development log

One entry per phase, newest last. Each entry covers:
- what changed and the files touched;
- test results;
- any change to gameplay or tuning, and why.

## Phase 0: baseline (19 Nov 2026)

Branch `saturn/phase-0`.

**Base branch.** `main` is still the original single-file game: no `src/`, no `build.js`, and none of the systems SATURN builds on (escalation, sign-offs, padlocks, traits). So this branch starts from `claude/active-seats` (PR #2, on top of PR #1).

**Decisions:**
- The park stays as the business. The customer side will be corporate bookings, group sales and sponsorship, with no outside repair workshop.
- The 14-day season stays.
- Prices stay in $.
- Forms show the key fields, pre-filled where the person would know the answer.
- About 15 key chairs will be playable, one per department.
- ½× stays alongside 4×.

**Where the code differs from the task's description** (checked against `src/`):
- The engine is one file, `src/engine.js` (about 2,100 lines), not separate modules.
- `ORG` has 113 office posts across 15 departments, not about 90.
- The game starts with 6 crew; the three managers are hireable crew posts.
- The engine's functions take `s`; the interface holds `S`.
- Request IDs come from `s.rq`, and `s.seq` numbers the radio log.
- The interface saves to localStorage every 5 s of real time and after each action.
- `SO_STEPS` also has a `go` step (quick reset).
- `ESC_DELAY` is 10, 12, 15 and 20 minutes for the supervisor, manager, director and chief executive.
- Changing seat is a seat-picker dialog, not a position tree.

**What changed:**
- **4× speed.** A 4× button joins ½×, 1× and 2× (10 park minutes a real second). Only these four speeds are accepted, and a save made at 4× comes back at 4× (speeds used to be capped at 2× on load). How to play mentions it.
  - The panels still redraw on a 140 ms timer, not per step, so 4× costs only the extra engine steps.
  - Files: `src/index.html`, `src/ui/00-core.js` (`SPEEDS`), `src/ui/04-panels.js`, `src/ui/09-actions.js`, `src/ui/06-desk.js`.
- **Replay test** (`tests/engine/replay.js`, `npm run test:replay`, part of `npm run test:engine`). Eight scripted players, two seeds each, play every season three times: twice straight through, and once saved and loaded every night. All three final states must be identical.
  - States are compared as data: key order is ignored, and both pass through `migrate()`, which only fills in fields a fresh game leaves unset.
  - Checked by planting a `Math.random()` in a copy of the engine: the test fails at once.
  - `players.js` now also exports `desk`, so the test can play the night exactly as a season does.
- **4× in the performance test** (`tests/browser/perf.js`). The busy phone afternoon is also played at 4×, and the time inside the engine's step must stay under 2 ms per frame.
  - First result: 0.41 ms per frame, 61 steps in 6 s (31 at 2×).
  - The whole frame cost about 3 ms more than at 2×, because the guests, crew and rides move twice as fast. The engine is a small part of that.
- **Docs.** This log is new. `tests/README.md` describes the replay test and the 4× check.

**Gameplay:** unchanged. The golden master is identical.

**Status: paused, work in progress.** The 4× check added to `tests/browser/saves.js` still fails: after the reload, something covers the 4× button. The full test run hasn't been done yet.
