'use strict';
// Pictures for the itch.io page, taken from the real game (a seeded park jumped to chosen moments), in dist/itch/:
//   cover.png           630×500 at 2× (the thumbnail itch.io shows in lists and at the top of the page)
//   shot-1-day.png ...  screenshots for the page's gallery: a busy afternoon, a squall, Lantern Hour, a phone
//   node design/itch-images.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'dist', 'itch'), FILE = path.join(__dirname, 'out', 'current.html');
const players = fs.readFileSync(path.join(ROOT, 'tests/engine/players.js'), 'utf8').replace('return { season, PLAYERS };', 'return { season, PLAYERS, plan, dispatch, answerAll, seatPlay };').replace("'use strict';", '').replace('module.exports = function makePlayers(L)', 'window.__makePlayers = function makePlayers(L)');
const SHOTS = [
  { name: 'shot-1-day', w: 1280, h: 720, clock: 860 },
  { name: 'shot-2-squall', w: 1280, h: 720, squall: true },
  { name: 'shot-3-lantern-hour', w: 1280, h: 720, clock: 1290, lanterns: 26 },
  { name: 'shot-4-phone', w: 390, h: 844, clock: 900, touch: true, dpr: 3 },
];
async function stage(browser, s) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.dpr || 1.5, hasTouch: !!s.touch }), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + FILE);
  await page.evaluate(() => { localStorage.clear(); for (const k of ['sup', 'desk', 'tech', 'mgr', 'dir', 'ceo']) localStorage.setItem('kll-coached-' + k, '1'); });
  await page.reload(); await page.waitForTimeout(300); await page.addScriptTag({ content: players });
  await page.evaluate(s => {
    const P = window.__makePlayers(LF), o = { seat: 'sup', plan: true, hands: true, inbox: true, smart: true, talk: 'quiet', delay: 4, every: 3, inboxEvery: 4 };
    let clock = s.clock, fresh = !s.lanterns;
    if (s.squall) { window.__mock.scene({ seed: 101, day: 2, clock: 545, P, o, fresh: false }); clock = LFUI.state.waves[0].at + 6; fresh = false; }
    window.__mock.scene({ seed: 101, day: 2, clock, P, o, fresh }); if (s.lanterns) window.__mock.lanterns(s.lanterns);
    if (s.squall) { LFUI.state.speed = 1; setTimeout(() => { LFUI.state.speed = 0; }, 1600); } // let the wind and rain get going
  }, s);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(s.squall ? 2200 : 800);
  return { page, errors };
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  execFileSync('node', [path.join(ROOT, 'build.js'), '--extra', path.join(__dirname, 'looks/_mock'), '--out', FILE], { stdio: 'ignore' });
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  for (const s of SHOTS) {
    const { page, errors } = await stage(browser, s);
    await page.screenshot({ path: path.join(OUT, s.name + '.png') });
    console.log(`dist/itch/${s.name}.png${errors.length ? ' ERRORS ' + errors.join(' | ') : ''}`);
    await page.close();
  }
  // the cover: the map alone at Lantern Hour, closer in, with the title over it
  const { page } = await stage(browser, { w: 1440, h: 900, clock: 1290, lanterns: 30, dpr: 2 });
  await page.evaluate(() => { LFUI.ui.sel = null; window.__mock.zoom(1.2, 560, 300); }); await page.waitForTimeout(900);
  const map = await page.evaluate(() => document.getElementById('map').toDataURL('image/png'));
  await page.close();
  const font = f => fs.readFileSync(path.join(ROOT, 'src/fonts', f)).toString('base64');
  const cover = await browser.newPage({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 2 });
  await cover.setContent(`<!doctype html><style>
@font-face{font-family:Bagel;src:url(data:font/woff2;base64,${font('bagel-fat-one-latin.woff2')}) format("woff2")}
@font-face{font-family:Grot;font-weight:400 700;src:url(data:font/woff2;base64,${font('familjen-grotesk-latin.woff2')}) format("woff2")}
html,body{margin:0;width:630px;height:500px;overflow:hidden;background:#0d1330}
.bg{position:absolute;inset:0;background:url(${map}) center/cover}
.fade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,13,36,.2) 0%,rgba(9,13,36,0) 28%,rgba(9,13,36,.82) 62%,rgba(9,13,36,.96) 100%)}
.t{position:absolute;left:30px;right:20px;bottom:64px;font:400 62px/.95 Bagel;color:#ffb547;text-shadow:0 3px 0 #5a2a00,0 0 26px rgba(255,170,60,.45)}
.s{position:absolute;left:32px;right:30px;bottom:26px;font:600 19px/1.2 Grot;color:#f3ead8;letter-spacing:.01em}
</style><div class="bg"></div><div class="fade"></div><div class="t">Keep<br>Lanternfield lit</div><div class="s">Twelve rides, one crew, and the clock never waits.</div>`);
  await cover.evaluate(() => document.fonts.ready); await cover.waitForTimeout(300);
  await cover.screenshot({ path: path.join(OUT, 'cover.png') });
  console.log('dist/itch/cover.png');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
