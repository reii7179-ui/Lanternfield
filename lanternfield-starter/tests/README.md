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
| `npm run test:rules` | **Active-seat rules.** Six scripted players, watched minute by minute: no ride reopens without the signatures its level needs, or with a padlock on; a red tag waits for the inspector; the chief executive never signs a reopen and nobody countersigns their own work; nothing waits for ever without being escalated; the same seed gives the same season. | ~15 s |
| `npm run test:duties` | **Seat duties.** Every seat-card mistake (17 of them) happens through ordinary commands in a set-up scene, and each one lowers your own score. Idle players in every seat: nothing in the inbox, no escalated request and no escalated sign-off waits past its time. Over $20,000 always goes to the board, from every seat, and the chief executive can only propose it. Crew traits and boss styles are the same for the same seed and for the same old save migrated twice. After whole seasons, no number in the state is NaN and no count, stock, gauge or score is negative. | ~10 s |
| `node tests/engine/workload.js [seeds]` | **Workload** (a report). Actions per park hour each seat needs, counted from the scripted active players (every command they call that succeeds), with the technician also per hour on shift. The technician and supervisor should be the busiest and the chief executive the least busy. | ~2 min |
| `npm run test:engine` | The golden master, the random-input test, the rules and the seat duties. | ~1 min |
| `npm run balance` | **Balance report** (not pass/fail). Spread of scores for each scripted player; compare with the table below. | ~2 min |
| `node tests/browser/smoke.js [n]` | **UI stress.** Plays `n` seasons (default 3) inside the page, presses every kind of button and redraws every panel every park minute. Fails on errors, the game's red error box, or NaN/undefined on screen. | ~1 min per season |
| `node tests/browser/layout.js` | **Layout.** 16 screen sizes, from 360×640 to 2560×1440. Fails on overlapping panels, clipped ride names on the board, ride names overlapping on the map, cut-off buttons, top-bar overflow, sideways scrolling, or an unreachable Start button. | ~1 min |
| `node tests/browser/saves.js` | **Saves.** Broken or old saves start a fresh game; a reload mid-day carries on. | ~15 s |
| `node tests/browser/motion.js` | **Motion setting.** Auto follows the device's reduced-motion setting, Reduced and Full override it, CSS animations stop when reduced, the choice survives a reload and stays out of the saved game. | ~10 s |
| `node tests/browser/ui-motion.js` | **Interface motion.** Panels are patched in place: a card keeps its element across redraws and its slide-in plays once, timer bars slide, top-bar numbers settle on the real value, and a closing dialog fades out then goes. Feedback: a breakdown flashes the edge of the map, and the streak meter follows the streak and cracks when it's lost. With reduced motion nothing animates. | ~20 s |
| `node tests/browser/sound.js` | **Sound.** Off on a first visit, with no audio created. Turning it on, and the four volumes, are remembered across a reload and kept out of the saved game. Audio starts on the first click or key. Without Web Audio the game still runs, silently. | ~15 s |
| `node tests/browser/perf.js` | **Frame time** at 2× speed. Laptop and phone screens fail only below 30 fps. **Phone budget:** a busy afternoon on a 390×844 phone with a 3× screen and the processor slowed 4×. It runs alternately with the game from before the visual work (`baseline/before-visuals.html`), three times each in fresh browsers. It fails if this build's median main-thread time per frame is higher. Headless fps snaps to whole frames and drifts, so fps is printed but not compared. `--phone` runs only the phone budget. | ~3 min |
| `node tests/browser/dusk.js` | **The light changing.** In plain day and night nothing is composed. At dusk the composed ground covers the map on screen, also after panning and zooming. After a zoom late in the afternoon, the night layer is ready again before 18:00. On a phone and a laptop. | ~20 s |
| `node tests/browser/final-screen.js` | **End-of-season screen.** Score split, your own work, playtest record, Copy button. | ~15 s |
| `node tests/browser/playtest.js` | **Playtest record.** One day in, How to play holds a record that parses, with the build stamp, the finished day and the device. Copy the record copies exactly that. A playtest build shows the note on the title screen (same stamp, fits a phone); the normal build doesn't. Inside a frame on another site, as itch.io shows games, the game saves across a reload and Copy still works. | ~20 s |
| `node tests/browser/seats.js` | **Active seats.** A fixed ride waiting for your countersign shows "Sign to reopen" on its board card; the button opens the card with the job sheet, Sign and Send back; signing reopens it after Operations' check. Then every seat: something to do in its first game hour (the technician's daily checks, everyone else an inbox item); tapping it resolves it; ignoring one escalates it, logs it, counts it as missed and lowers your own score; the boss's style shows on your card and traits on a crew card; no sideways scrolling. On a laptop and a phone. | ~1 min |
| `node tests/browser/coach.js` | **Coaching.** Does what each seat's coach asks, with real clicks, all seats side by side; checks the clock waits when it should. The coaches teach the morning duties, escalation, countersigns, padlocks, traits and the boss's style. Options: `--phone`, `--desk`, a seat list. | ~3 min |
| `node tests/browser/real-day.js` | **One real day** of clicks and keys at 2×; checks the playtest record. | ~3–4 min |
| `npm run test:browser` | smoke, layout, saves, motion, ui motion, sound, perf, dusk, final screen, playtest, seats, coach. | ~8 min |
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

## Reference balance (12 seeds, Standard, with the active seats)
Scores are out of 100. Grades: A from 85, B from 70, C from 55. `npm run balance` prints this table.

```
player                      mean    sd  p10  med  p90  fired  grades
sup idle                    15.1   1.4   12   16   16  12/12  D12
sup slow                    36.2  11.6   22   42   49   1/12  D12
sup casual                  58.2  12.6   48   61   72   0/12  B4 C3 D5
sup human                   74.8   5.7   69   74   85   0/12  A2 B7 C3
sup skilled                 84.9   6.4   75   87   93   0/12  A7 B5
sup human relaxed           79.6   9.8   74   82   88   0/12  A4 B7 D1
sup human sharp             60.7   8.9   50   59   75   0/12  B2 C7 D3
sup human 2x                44.2  10.5   35   41   61   0/12  C3 D9
sup human 2x relaxed        65.6   6.2   59   66   74   0/12  B3 C8 D1
sup ignores everything      71.1   5.5   66   72   77   0/12  B8 C4
sup answers fast            71.4   7.9   63   71   84   0/12  B7 C5
sup rubber stamp            81.9   8.4   76   82   92   0/12  A4 B7 C1
sup on the tools            79.8   6.8   70   81   89   0/12  A3 B8 C1
tech idle                   19.3   3.9   13   20   22  11/12  D12
tech active                 69.4   7.0   57   72   77   0/12  B7 C5
mgr idle                    13.9   3.8    9   14   20  11/12  D12
mgr active                  80.9   5.5   78   81   88   0/12  A2 B9 C1
dir idle                    37.8   5.1   33   36   44   1/12  D12
dir active                  75.1   5.5   68   75   81   0/12  A1 B9 C2
ceo idle                    21.4   3.5   18   21   25  12/12  D12
ceo active                  78.9   6.2   74   78   88   0/12  A3 B8 C1
```

What these numbers say:
- Doing nothing in any seat gets you a D, and in most seats fired.
- Dispatching well but ignoring every request and sign-off costs about 14 points (sup ignores everything).
- Rubber-stamping every sheet, or picking up a spanner yourself, scores below doing the job properly.
- Answering every request the minute it lands is no better than answering in time: missing the deadline is what costs.
- Each seat's active player reaches B or A, within about 5 points of the table below.

## Reference balance before the active seats (12 seeds, before any visual work)
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
