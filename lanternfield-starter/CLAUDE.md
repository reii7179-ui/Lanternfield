# Keep Lanternfield Lit

A real-time maintenance-management browser game. It ships as one self-contained `index.html` that works offline when double-clicked.

## How the code is laid out today
- `index.html` holds the CSS and two scripts.
  - The first `<script>` is the engine. It is pure logic with no DOM, uses seeded randomness only (`rnd(s)`, never Math.random or Date), and one `step(s)` is one park minute. It exposes `globalThis.LF`.
  - The second `<script>` is the UI: a canvas map (1000×680 world units) plus HTML panels, drawn from engine state. It exposes `window.LFUI` (`state`, `act`, `ui`, `scr`), which the tests rely on.
- Saves are kept in localStorage under `keep-lanternfield-lit-v7` (`state.v === 7`) and checked by `saneSave()` in the UI. Coach-done flags are stored as `kll-coached-<seat>` and `kll-coached-desk`.
- `tests/` holds the engine and browser tests; see `tests/README.md`.

## Rules
- **Don't change gameplay or balance** unless the user asks. `npm run test:golden` must pass after every change. If a change is meant to alter gameplay:
  1. Say so.
  2. Run `node tests/engine/golden.js --update`.
  3. Explain the change in the commit.
- **Keep the engine DOM-free and deterministic.** Animation timers, particles and any other visual-only state belong in the UI and never in the saved game.
- **The shipped game stays one self-contained index.html.** A build step is fine; point the tests at its output with `LF_GAME`, and at the engine file with `LF_ENGINE` once the engine is split out.
- **Keep the accessibility features:**
  - reduced-motion support;
  - keyboard controls (listed in How to play);
  - touch support;
  - colour is never the only signal;
  - everything readable at 390px wide.
- **Old saves must keep loading.** If the saved state changes, migrate it.
- **Performance target:** 60 fps at 2× speed on a mid-range phone.
- **The tests find things through hooks.** These include `window.LF` and `window.LFUI`, the `data-a` button names, and element ids such as `#rail`, `#board`, `#selp`, `#obj`, `#coach` and `#map`. If you rename any of them, update `tests/browser/` in the same change.

## Before calling a change done
1. Run `npm run test:engine` (golden master and random-input test).
2. Run `npm run test:browser` (smoke, layout, saves, perf, end screen, coach).
3. Look at the screenshots in `tests/browser/out/` for whatever you changed.

## Working with the user
- Explain changes in plain language and show screenshots.
- Ask before big design decisions, and offer 2 or 3 options with a preview.
- Commit after each step they approve.
