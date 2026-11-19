'use strict';
// Art-direction screenshots: builds each look as a variant of the real game and photographs the same moments.
//   node design/shoot.js current glow iso fair
// A look is a folder in design/looks/ whose .css and .js are added after src's own (see build.js --extra).
// "current" is the game as it is. Shots land in design/shots/.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'shots');

// The moments: same seed, same scripted player ('sup human'), so every look shows the same park state.
const SEED = +(process.env.SEED || 101), DAY = +(process.env.DAY || 2);
const SHOTS = [
  { name: 'desk-day', w: 1440, h: 900, clock: 860 },
  { name: 'desk-night', w: 1440, h: 900, clock: 1290, lanterns: 22 },
  { name: 'phone-day', w: 390, h: 844, clock: 860, touch: true },
];
const players = fs.readFileSync(path.join(ROOT, 'tests/engine/players.js'), 'utf8')
  .replace('return { season, PLAYERS };', 'return { season, PLAYERS, plan, dispatch, answerAll, seatPlay };')
  .replace("'use strict';", '').replace('module.exports = function makePlayers(L)', 'window.__makePlayers = function makePlayers(L)');

(async () => {
  const looks = process.argv.slice(2).length ? process.argv.slice(2) : ['current'];
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  for (const look of looks) {
    const file = path.join(__dirname, 'out', look + '.html'), extra = ['--extra', path.join(__dirname, 'looks/_mock')];
    if (look !== 'current') extra.push('--extra', path.join(__dirname, 'looks/_art'), '--extra', path.join(__dirname, 'looks', look));
    execFileSync('node', [path.join(ROOT, 'build.js'), ...extra, '--out', file], { stdio: 'inherit' });
    for (const s of SHOTS) {
      const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2, hasTouch: !!s.touch });
      const errors = []; page.on('pageerror', e => errors.push(String(e)));
      await page.goto('file://' + file);
      await page.evaluate(() => { localStorage.clear(); for (const k of ['sup', 'desk', 'tech', 'mgr', 'dir', 'ceo']) localStorage.setItem('kll-coached-' + k, '1'); });
      await page.reload(); await page.waitForTimeout(300);
      await page.addScriptTag({ content: players });
      const info = await page.evaluate(([seed, day, clock, n]) => {
        const P = window.__makePlayers(window.LF), o = { seat: 'sup', plan: true, hands: true, inbox: true, smart: true, talk: 'quiet', delay: 4, every: 3, inboxEvery: 4 };
        const r = window.__mock.scene({ seed, day, clock, fresh: !n, P, o }); if (n) window.__mock.lanterns(n); return r;
      }, [SEED, DAY, s.clock, s.lanterns || 0]);
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(700);
      const png = path.join(OUT, `${look}-${s.name}.png`);
      await page.screenshot({ path: png });
      console.log(`${look} ${s.name}: ${JSON.stringify(info)}${errors.length ? ' ERRORS ' + errors.join(' | ') : ''}`);
      await page.close();
    }
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
