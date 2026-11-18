# Keep Lanternfield Lit

A real-time maintenance game set in a seaside funfair: twelve rides, a maintenance company and its whole chain of command.
Pick a seat, from the technician with the spanner to the chief executive, and keep the park running for a 14-day season.

## Play
- **On your computer:** double-click `lanternfield-starter/index.html`. It's one self-contained file that works offline in
  any modern browser.
- **Online:** a GitHub Pages link will go here once Pages is switched on for this repository.

A day lasts about five minutes. **How to play** (the **?** button) explains the rest and lists the keyboard controls.

## Every seat has a job
Each seat gets its own duties, matched to its seat card. Leave a duty undone and something in the park waits for it,
which costs time, money and score. The technician and supervisor get many small jobs; the chief executive gets the
fewest and the heaviest.

| Seat | What lands on you |
|---|---|
| Technician | The morning checks on your rides, work orders, lock out, find the cause, a test run, sign it fit to run, take your padlock off |
| Supervisor | The morning check sheet that opens the gates, dispatching, countersigning safety-critical repairs, breaks for worn-out crew, the shift handover at 16:45, overtime |
| Manager | The morning meeting on the supervisor's rules, cover for anyone sick, stores reorders, spending from $300 to $1,500, red-tag countersigns, tomorrow's planned services |
| Director | The morning review that sets the day's priority, disputes between Operations and Engineering, spending up to $5,000, overspends, the review after an injury |
| Chief executive | The board's target and its questions, the regulator, the press, key posts, spending from $5,000 to $20,000 |

### Escalation
Every request has a timer. Answer it in time, and five answers on time in a row lift office morale. Let it run out and
the request is **escalated** to the seat above. That seat decides 10 to 20 minutes later, and whatever the request was
about waits until then. The item and the log both say who it went to. It counts as missed, and misses in a row cost more.
At most three requests sit in your inbox at once. If you're the chief executive, the board decides anything you miss.
It always picks the worse option, and its confidence in you falls.

### Money and countersigns
Spending needs a signature from the right level:

| Amount | Who signs |
|---|---|
| Up to $300 | Supervisor |
| $300 to $1,500 | Manager |
| $1,500 to $5,000, and any overspend | Director |
| $5,000 to $20,000 | Chief executive |
| Over $20,000 | The board, which answers at the end of the day |

Ask for more than your limit and the purchase waits for that signature ("Waiting for the manager, about 12 min"). A weak
request is refused with a reason: money for a minor fault on a quiet ride once the day's budget is spent, for example.
A closed ride, a rush job or guests stuck on a ride are never weak. Now and then a big repair grows out of earlier
choices, such as a ride patched three times. It waits at the planning desk for whoever's limit it falls in.

### Reopening a ride: countersigns and padlocks
A finished repair doesn't reopen the ride on its own. It waits as "fixed, waiting to reopen" until its signatures are done:

| Kind of job | Signatures |
|---|---|
| Quick reset | The technician |
| Normal repair or service | The technician (after a test run), then Operations' empty run |
| Safety-critical, or a patch on a moving ride | Plus the supervisor's countersign |
| Red tag | Plus the manager's countersign and the inspector |
| After an injury | Plus the director's review and countersign |
| Substation | Plus the supervisor; power comes back first |

The chief executive never signs a reopen, and nobody countersigns their own work. Your countersign is the **Sign to
reopen** button on the ride's park board card and map marker. It opens the job sheet: Sign, or Send back a weak one,
such as a sheet with no cause written down or no test run. Leave it 10 minutes and it goes up a seat.

Everyone who works on a ride puts their own **padlock** on it. The ride can't reopen until every lock is off, and the
card shows whose is still on. Pull someone away mid-job and the ride stays shut until they go back for their lock.
Each morning from 08:15 the technicians walk their **daily checks**. The supervisor signs the check sheet that opens
the gates at 09:00, and a ride not checked by then stays shut until it is.

### Character: mistakes, crew traits and boss styles
- **Mistakes:** every mistake on a seat card can happen in the game, and each one costs something. Examples: skipping
  the lockout, picking up a spanner yourself as supervisor, approving every overspend as director, or running the shift
  from the boardroom as chief executive. The end screen counts them.
- **Crew traits** come from the season's seed and are shown on each person's card:
  - careful (slower, but repairs last);
  - quick (faster, but cuts corners);
  - never says no to overtime (tires faster);
  - needs reassurance;
  - argues with Operations.
- **Boss styles:** the person above you has a style for the season, shown on your seat card and the seat picker:
  - cautious spender;
  - firefighter;
  - micromanager, who now and then goes over your head;
  - by the book, who sends back thin job sheets and signs slowly.

  No style makes a seat unwinnable.

The same seed always gives the same traits and styles, and older saves get theirs from their seed when they load.

## Settings worth knowing
- **Motion:** Auto, Reduced or Full, in How to play.
  - **Auto** follows your device's reduced-motion setting.
  - **Reduced** turns off screen shake, flashes, particles and ride motion.
  - **Full** keeps everything.
- **Sound:** off until you turn it on. Effects, park sounds and music are all made in the browser.
- **Offline fonts:** the two fonts are built into `index.html`, so the game looks the same with no connection.

## The code
Everything lives in `lanternfield-starter/`.
- `src/`: the source.
  - `engine.js`: the game rules. No drawing, and the same result every time for the same seed.
  - `ui/`: the map, panels, animation and sound.
  - `css/`: the styles.
  - `fonts/`: the two fonts.
- `npm run build` puts `src/` together into the single `index.html`. **Don't edit `index.html` by hand.** The next build
  overwrites it, and the tests fail if it doesn't match `src/`.
- `CLAUDE.md`: the working rules for changing the game.
- `PLAYTEST.md`: putting the game on itch.io for friends, and reading the playtest records they send back.

## Testing
You need Node.js. In `lanternfield-starter/`, run `npm install` once, then `npx playwright install chromium` for the
browser tests.

| Command | What it checks | Time |
|---|---|---|
| `npm test` | Everything below, plus a check that `index.html` matches `src/` | ~7 min |
| `npm run test:engine` | The golden master, a test that sends random commands looking for crashes, the reopen rules, and the seat duties (every seat-card mistake, escalation, the board's limit, traits and styles) | ~1 min |
| `npm run test:browser` | The game in a real browser: layout at 16 screen sizes, saves, motion, sound, speed on a slowed phone, every seat's duties, coaching | ~8 min |

**The golden master** is the check that gameplay hasn't changed. Scripted players play 35 seasons from fixed starting
seeds, and every result must match the recorded ones in `tests/engine/golden.json` exactly. If it fails and you didn't
mean to change the gameplay, something in the rules changed by accident. If you did mean to, run
`node tests/engine/golden.js --update` and say why in the commit.

More detail in `lanternfield-starter/tests/README.md`.

## Known follow-up: dusk on low-end phones
On the low-end test phone (a 360×640 screen with the processor slowed 6×) the game runs at about 22 fps at dusk.
That's no slower than the game before the visual work: about 45 ms per frame either way. The stall when dusk begins
has been fixed. Most of each frame goes on drawing the map, at any hour of the day, so that's where any further speed-up
would have to come from.

## Credits and licences
- **Fonts:** both are under the SIL Open Font License 1.1. The licence texts are in `lanternfield-starter/src/fonts/`.
  - [Bagel Fat One](https://github.com/JAMO-TYPEFACE/BagelFat), © 2022 The Bagel Fat Project Authors.
  - [Familjen Grotesk](https://github.com/Familjen-Sthlm/Familjen-Grotesk), © 2021 The Familjen Grotesk Project Authors.
- **Art:** no third-party art. Every ride, building and figure is drawn in code (`src/ui/03a-art.js`).
- **Sound and music:** no recordings. Everything is synthesised in the browser, and the waltz is original.
- **Test tools:** [Playwright](https://playwright.dev) (Apache 2.0), used only by the tests and not part of the game.
- **The game itself:** this repository has no licence file yet.
