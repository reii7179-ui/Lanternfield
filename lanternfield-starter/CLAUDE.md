# Keep Lanternfield Lit

A real-time maintenance-management browser game. It ships as one self-contained `index.html` that works offline when double-clicked.

## How the code is laid out today
- **Edit the files in `src/`, never `index.html` by hand.** `npm run build` (`build.js`, no dependencies) puts them back together into the one self-contained `index.html`, with the fonts inlined so it works offline. `npm test` starts with `npm run build:check`, which fails if `index.html` is out of date with `src/`.
  - `src/index.html`: the page shell, with placeholder lines for the fonts, CSS, engine and UI.
  - `src/css/*.css`: the styles, in name order.
  - `src/engine.js`: the engine. Pure logic with no DOM, seeded randomness only (`rnd(s)`, never Math.random or Date), and one `step(s)` is one park minute. It exposes `globalThis.LF`. In the build it stays the first plain `<script>`, which the engine tests read; `LF_ENGINE=src/engine.js` points them at the file directly.
  - `src/ui/*.js`: the UI, concatenated in name order inside one closure, so they share one scope. A canvas map (1000×680 world units) plus HTML panels, drawn from engine state. It exposes `window.LFUI` (`state`, `act`, `ui`, `scr`), which the tests rely on.
    - The map's look is "Lantern Glow" (chosen in phase 1): `03a-art.js` draws every ride and building as flat vector art, split into the parts that never move (`base`), the parts that move (`move`) and anything drawn over them (`top`). `03b-map.js` draws the map from caches:
      - the ground: day and night layers blended for the time of day, with the hour's light tint, composed into one image;
      - each ride as one image (base, moving parts, top, lights), repainted at the ride's own pace;
      - the rings and badges that change only now and then.
      The pulsing and draining rings are drawn live. `src/css/20-look.css` styles the HUD to match.
    - The living park is `03c-life.js`: ride motion, broken-ride smoke, sparks and lamps, crew figures (each pose a cached image), queues, squall wind and rain, the light of the hour, and lanterns at Lantern Hour. Its state is in `VIS` and a capped particle pool (`PMAX`), never in the save. With reduced motion, rides hold still and still marks replace the smoke, sparks and flashing lamps.
    - Panels are patched in place, not rebuilt: `setHTML` (`04-panels.js`) matches elements by `data-key`, else `data-fk`, else by tag and position.
      - Give anything in a list that can be added or removed a stable `data-key`, so it keeps its element (and its animation state) across redraws.
      - `src/css/30-motion.css` holds the interface motion: cards slide in once, the few timer bars that matter slide, dialogs fade in and out (a closing dialog lingers for 170 ms as `#modal.leaving`, `inert`), and fast-response alerts pulse.
      - The top-bar numbers count to their new value (`countTo`, driven every frame by `hudTick`).
      - Don't animate `width` on many elements: each one is laid out again every frame.
    - Sound is `02-sound.js`, all synthesised (no audio files):
      - effects for each game event (`SFX`, played from `drainFx` and from actions);
      - a park ambience that follows the day and the weather (`ambTick`);
      - an optional original waltz (`musicTick`).
      Buses for effects, park and music feed a master volume, a makeup gain and a compressor. Keep music voices plain (no filters): audio shares the phone's processor.
  - `src/fonts/`: Bagel Fat One and Familjen Grotesk (Latin subsets, SIL Open Font License).
- Saves are kept in localStorage under `keep-lanternfield-lit-v7` (`state.v === 7`) and checked by `saneSave()` in the UI. Coach-done flags are stored as `kll-coached-<seat>` and `kll-coached-desk`. Player settings that are not part of the game live in their own keys:
  - `kll-motion` (`auto`, `reduce` or `full`);
  - `kll-sound` (`{ on, master, sfx, amb, music }`). Sound is off until the player turns it on. The audio graph is built only then, after a click or key.
- **Playtest builds** (phase 7, see `PLAYTEST.md`): `npm run package:itch` builds with `--playtest` and zips `index.html` for itch.io in `dist/`.
  - Every build carries a stamp, `BUILD` in the UI: the `package.json` version plus a short hash of `src/`. It depends only on the sources, so `build:check` stays stable.
  - `PLAYTEST` is true only in playtest builds. It adds the note on the title screen.
  - The playtest record (`08-playtest.js`) can be copied from How to play at any time, and from the end screen. It holds the stamp, the finished days, today so far and the kind of device. Never put anything personal in it.
  - Copy uses `document.execCommand('copy')` first, because itch.io runs the game in a frame on another site, where the newer clipboard API is blocked.
  - `npm run records -- file.txt` sums up the records testers send back. `npm run package:itch-images` makes the page's cover and screenshots.
- `design/`: art-direction mock-ups, clips, profiles and the itch.io pictures. Not shipped.
- `tests/` holds the engine and browser tests; see `tests/README.md`.

## Rules
- **Don't change gameplay or balance** unless the user asks. `npm run test:golden` must pass after every change. If a change is meant to alter gameplay:
  1. Say so.
  2. Run `node tests/engine/golden.js --update`.
  3. Explain the change in the commit.
- **Keep the engine DOM-free and deterministic.** Animation timers, particles and any other visual-only state belong in the UI and never in the saved game.
- **The shipped game stays one self-contained index.html.** A build step is fine; point the tests at its output with `LF_GAME`, and at the engine file with `LF_ENGINE` once the engine is split out.
- **Keep the accessibility features:**
  - reduced-motion support: the in-game Motion setting (Auto follows the device). Read the live `reduce` flag in the UI; CSS uses `html.calm`;
  - keyboard controls (listed in How to play);
  - touch support;
  - colour is never the only signal;
  - everything readable at 390px wide (the layout test covers 16 sizes, from 360×640 to 2560×1440, and fails if ride names overlap on the map).
- **Old saves must keep loading.** If the saved state changes, migrate it.
- **Performance target:** 60 fps at 2× speed on a mid-range phone. The test is the phone budget in `tests/browser/perf.js`: a busy afternoon on a 390×844 phone with a 3× screen and the processor slowed 4×. It must take no more main-thread time per frame than the game did before the visual work, which is kept as `tests/browser/baseline/before-visuals.html`. Squalls (rain) and Lantern Hour (lights) are the heaviest moments; check them too when you add effects.
  - Keep the map's caches working: anything that doesn't change every frame belongs in a cached layer or sprite.
  - Panels over the map use hard edges, not big soft `box-shadow`s, which measurably slowed the phone.
  - Adaptive quality (`QUAL` in `03c-life.js`): when frames stay slower than about 38 fps, rain, wind, smoke, sparks, sparkles and the guest crowd thin out in steps, and they come back when frames are quick again. Never thin anything that carries game information.
  - Caps: particles (`PMAX`), lanterns, pops, pings and bursts. At most four ride images repaint per frame (`spriteBudget`).
  - The ground while the light changes (dawn, golden hour, dusk, a squall) is composed only for the part of the park on screen plus a margin. It recomposes at most every 0.6 s, or every 1.5 s when adaptive quality has stepped down, and at once when the view moves past the margin. In plain day or night the layer is drawn as it is.
  - Draw a whole layer at an offset into a smaller canvas rather than copying a source rectangle out of it: the rectangle form costs extra.
  - If a zoom throws the night layer away in the late afternoon, it is painted again a quarter at a time between 17:00 and 18:00 (`nightBand`), so dusk doesn't open with a stall. The browser paints a canvas only when it is next used, so each band is used once right away to make it paint then. `LFUI.ground()` reports this for the tests.
  - `design/profile.js` profiles the heaviest moments (busy afternoon, squall, dusk, closing) on a mid and a low phone against the original game. Run it after adding effects.
- **The tests find things through hooks.** These include `window.LF` and `window.LFUI`, the `data-a` button names, and element ids such as `#rail`, `#board`, `#selp`, `#obj`, `#coach` and `#map`. If you rename any of them, update `tests/browser/` in the same change.

## Before calling a change done
1. Run `npm run test:engine` (golden master and random-input test).
2. Run `npm run test:browser` (smoke, layout, saves, motion, sound, perf, dusk, end screen, playtest, coach).
3. Look at the screenshots in `tests/browser/out/` for whatever you changed.

## Working with the user
- Explain changes in plain language and show screenshots.
- Ask before big design decisions, and offer 2 or 3 options with a preview.
- Commit after each step they approve.
