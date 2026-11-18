# Keep Lanternfield Lit: starter folder

## What's in here
- `index.html`: the game. Double-click it to play.
- `CLAUDE.md`: standing instructions. Claude Code reads this automatically whenever it works in this folder.
- `CLAUDE-CODE-PROMPT.md`: the prompt to paste into Claude Code to start the design and animation work.
- `tests/`: the checks used to build and balance the game, ready to run.
  - The **golden master** tells you whether the gameplay has changed.
  - The **random-input test** catches crashes.
  - The **browser tests** cover layout, saves, coaching and performance.
- `package.json`: short commands for running the tests.
- `PLAYTEST.md`: how to put the game on itch.io for friends, and how to read the playtest records they send back.

## How to start
1. Unzip this folder somewhere you'll keep it, for example `Documents/lanternfield`.
2. If you don't have Node.js, install the LTS version from nodejs.org. The tests need it.
3. Open a terminal in this folder and run `claude`.
4. Paste the prompt from `CLAUDE-CODE-PROMPT.md`. Claude Code will install what the tests need and run them before changing anything.
