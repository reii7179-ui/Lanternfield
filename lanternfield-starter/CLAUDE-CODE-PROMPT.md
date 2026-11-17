# Prompt to paste into Claude Code

Open a terminal in this folder, run `claude`, and paste everything below the line.

---

I'm building "Keep Lanternfield Lit", a real-time maintenance-management game. It is one self-contained file, index.html, in this folder. I want to take its look, animation and sound to a much higher level without changing how it plays.

First, read CLAUDE.md and tests/README.md. They describe the code, the rules, and the tests that already exist. Then set up the tests (npm install, npx playwright install chromium) and run `npm test` so we start from green.

## Hard rules
1. **Don't change gameplay or balance.** `npm run test:golden` must pass after every change. Only update the golden master if I ask for a gameplay change.
2. **Keep the engine free of DOM and rendering code.** Visual-only state (animation timers, particles) lives in the UI layer and never in the saved game.
3. **The final build must still be one self-contained index.html** that works offline when double-clicked: bundle or inline the fonts and any assets. Developing in modules with a build step is fine; point the tests at the build with LF_GAME and LF_ENGINE.
4. **Performance:** a steady 60 fps on a mid-range phone at 2× speed. Measure it.
5. **Accessibility stays:**
   - Reduced motion turns off shake, flashes and particles.
   - Keyboard controls keep working.
   - Colour is never the only signal.
   - Text stays readable at phone size.
6. **Old saves must still load.** If you add to the saved state, migrate it.

## How I want you to work
- Give me a short plan before writing code, and wait for my approval.
- Work in phases. After each phase:
  1. Run the tests.
  2. Show me screenshots, plus a short screen recording where motion matters.
  3. Commit to git.
  4. Wait for my OK.
- When there's a real design choice, give me 2 or 3 options with a preview and let me pick.
- Tell me plainly when something needs art you can't make (painted illustrations, recorded audio). Suggest free sources such as CC0 asset packs, or alternatives drawn in code.

## Phases
0. **Setup.**
   - Run `git init` and make a first commit.
   - Get the existing tests passing.
   - If you split the file into modules with a build step, keep every test passing against the built file.
1. **Art direction.** Mock up three looks for the map and rides, including how the HUD would match, and let me choose. For example:
   - polished flat vector at night with a soft glow;
   - isometric 2.5D;
   - a warm, painterly seaside fair.
2. **Living park.**
   - **Rides move.** The wheel turns, coaster cars run the track, gondola cabins travel, flume boats splash and the carousel spins.
   - **Motion shows state:** running, half speed, stopped, or broken (smoke, sparks, a stuck car).
   - **Crew** walk with direction and a stride, carry parts, sit down for a break, gather for a toolbox talk, and visibly sprint.
   - **Guests** flow along the paths and bunch into queues.
   - **Atmosphere:** a day-to-night lighting cycle, lanterns rising at Lantern Hour, and squalls with rain and wind.
3. **Interface motion.** Subtle, quick, and never in the way:
   - inbox cards slide in;
   - timers drain smoothly;
   - numbers count up;
   - the fast-response ⚡ ring feels urgent;
   - panels transition instead of snapping.
4. **Feedback and juice.** All of it respects reduced motion.
   - A breakdown is felt: a short shake or flash, and a sound sting.
   - A fast response feels rewarding.
   - Streaks build visibly.
   - The end-of-day lantern count and the season grade get a proper moment.
5. **Sound.**
   - A richer set of effects: fault alarms by severity, dispatch, fix, cash and requests.
   - A light ambient park loop that changes through the day, and optional music.
   - Separate volume sliders.
   - Sound stays off until the player turns it on, and their choice is remembered.
6. **Polish and performance.**
   - Profile on a throttled phone.
   - Cache static layers and cap particles.
   - Check every screen size.
   - Fix anything the new visuals made harder to read.
7. **Playtest build.** Help me put the game online so friends can play it and send me their playtest record. Ask me first which host to use.

Start with phase 0 and your plan.
