# Keep Lanternfield Lit

A real-time maintenance game set in a seaside funfair: twelve rides, a maintenance company and its whole chain of command.
Pick a seat, from the technician with the spanner to the chief executive, and keep the park running for a 14-day season.

## Play
- **On your computer:** double-click `lanternfield-starter/index.html`. It's one self-contained file that works offline in
  any modern browser.
- **Online:** a GitHub Pages link will go here once Pages is switched on for this repository.

A day lasts about five minutes. **How to play** (the **?** button) explains the rest and lists the keyboard controls.

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
| `npm run test:engine` | The golden master and a test that sends random commands looking for crashes | ~35 s |
| `npm run test:browser` | The game in a real browser: layout at 16 screen sizes, saves, motion, sound, speed on a slowed phone, coaching | ~6 min |

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
