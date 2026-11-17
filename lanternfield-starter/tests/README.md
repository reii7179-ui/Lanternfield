# Tests

Two kinds of test:

- **Engine tests** (`tests/engine/`) run the game rules in Node, with no browser and no installs.
- **Browser tests** (`tests/browser/`) drive the real page with Playwright.

Run everything from the project folder.

## Setup (once)
```
npm install
npx playwright install chromium
```

## Commands
| Command | What it checks | Time |
|---|---|---|
| `npm run build` | Not a test: rebuilds `index.html` from `src/`. Run it after every change to `src/`. | 1 s |
| `npm run build:check` | `index.html` matches `src/` (nobody edited the built file by hand). `npm test` runs it first. | 1 s |
| `npm run test:golden` | **Golden master.** 35 seeded seasons played by scripted players must match `golden.json` exactly. This is the "gameplay didn't change" check. | ~15 s |
| `npm run test:fuzz` | **Random input.** 60 seasons with every engine command called at random. Nothing may throw, and no number may go bad (NaN, negative stock, out-of-range health or energy). | ~15 s |
| `npm run test:engine` | Both of the above. | ~30 s |
| `npm run balance` | **Balance report** (not pass/fail). Spread of scores for each scripted player; compare with the table below. | ~2 min |
| `node tests/browser/smoke.js [n]` | **UI stress.** Plays `n` seasons (default 3) inside the page, presses every kind of button and redraws every panel every park minute. Fails on errors, the game's red error box, or NaN/undefined on screen. | ~1 min per season |
| `node tests/browser/layout.js` | **Layout.** 7 screen sizes. Fails on overlapping panels, clipped ride names, cut-off buttons, top-bar overflow, sideways scrolling, or an unreachable Start button. | ~30 s |
| `node tests/browser/saves.js` | **Saves.** Broken or old saves start a fresh game; a reload mid-day carries on. | ~15 s |
| `node tests/browser/motion.js` | **Motion setting.** Auto follows the device's reduced-motion setting, Reduced and Full override it, CSS animations stop when reduced, the choice survives a reload and stays out of the saved game. | ~10 s |
| `node tests/browser/perf.js` | **Frame time** at 2× speed. Laptop and phone screens fail only below 30 fps. **Phone budget:** a busy afternoon on a 390×844 phone with a 3× screen and the processor slowed 4×. It runs alternately with the game from before the visual work (`baseline/before-visuals.html`), three times each in fresh browsers. It fails if this build's median main-thread time per frame is higher. Headless fps snaps to whole frames and drifts, so fps is printed but not compared. `--phone` runs only the phone budget. | ~3 min |
| `node tests/browser/final-screen.js` | **End-of-season screen.** Score split, your own work, playtest record, Copy button. | ~15 s |
| `node tests/browser/coach.js` | **Coaching.** Does what each seat's coach asks, with real clicks, all seats side by side; checks the clock waits when it should. Options: `--phone`, `--desk`, a seat list. | ~2 min |
| `node tests/browser/real-day.js` | **One real day** of clicks and keys at 2×; checks the playtest record. | ~3–4 min |
| `npm run test:browser` | smoke, layout, saves, motion, perf, final screen, coach. | ~6 min |
| `npm run test:slow` | real day, phone coach, desk coach. | ~10 min |

Screenshots from the browser tests are saved in `tests/browser/out/`.

## Pointing the tests at a different file
- `LF_GAME=dist/index.html`: the built game, for the browser tests.
- `LF_ENGINE=src/engine.js`: the engine file, for the engine tests. By default they read the first plain `<script>` block of `index.html`, which is the same code once built.
- `CHROME_PATH=/path/to/chrome`: use a specific browser instead of Playwright's Chromium.

## When the golden master fails
- **If you didn't mean to change gameplay,** find what changed in the engine. Common causes:
  - calling `rnd(s)` a different number of times;
  - changing the order of an update;
  - touching a constant;
  - putting visual state into game state.
- **If you did mean to,** run `node tests/engine/golden.js --update` and say why in the commit.
- **If you changed `players.js`,** the golden master changes too. Update it in the same commit.

## Reference balance (12 seeds, before any visual work)
Scores are out of 100. Grades: A from 85, B from 70, C from 55.

```
player                  mean    sd  p10  med  p90  fired  grades
sup idle                14.8   1.3   13   15   16  12/12  D12   Sets up the desk, then does nothing in the day
sup slow                41.8  13.0   20   47   55   0/12  C2 D10   Reacts 20 park minutes late (8 s at 1x)
sup casual              59.4  11.7   51   65   70   0/12  B2 C6 D4   Reacts in about 3-5 s at 1x, ignores energy
sup human               74.9   5.2   69   75   82   0/12  B9 C3   Attentive: about 2-3 s at 1x, manages breaks and talks
sup skilled             84.1   4.6   77   84   90   0/12  A5 B7   Instant reactions, manages breaks and talks
sup human relaxed       83.7   6.7   72   85   92   0/12  A7 B5   Attentive player on Relaxed
sup human sharp         64.2   8.5   53   65   74   0/12  B4 C5 D3   Attentive player on Sharp
sup human 2x            56.7   8.8   44   59   63   0/12  C9 D3   Same reflexes as sup human, playing at 2x
sup human 2x relaxed    73.4   8.6   60   75   83   0/12  A1 B7 C4   Same, at 2x on Relaxed
tech idle               19.0   8.0   11   17   27   8/12  D12   Technician who never answers a work order
tech active             71.5   8.0   58   76   80   0/12  B8 C4   Takes work orders, locks out, diagnoses, rests
mgr idle                15.8   4.3   10   16   22  10/12  D12   Manager who does nothing at all
mgr active              85.2   4.1   80   85   89   0/12  A8 B4   Plans the desk, answers requests, rush jobs, walks the floor
dir idle                23.3   5.4   16   22   30   7/12  D12   Director who does nothing at all
dir active              75.7   4.2   72   75   80   0/12  B11 C1   Budget, focus, agency, services, fast lanes, rush jobs
ceo idle                30.1   9.1   22   28   46  10/12  D12   Chief executive who does nothing at all
ceo active              82.0   5.8   75   83   90   0/12  A4 B8   Vouchers, happy hour, briefings, rush jobs
```

What these numbers say:
- Doing nothing in any seat gets you fired or a D.
- Reacting late costs a lot.
- An attentive player gets a B on Standard and an A on Relaxed.
- Each seat's active player reaches B or A.
