'use strict';
// Short screen recordings of the real game (built from src/ with the mock-up scene hook), as MP4 in design/clips/.
//   node design/record.js [day talk squall lantern phone reduced]
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'clips'), TMP = path.join(__dirname, 'out', 'video');
const players = fs.readFileSync(path.join(ROOT, 'tests/engine/players.js'), 'utf8').replace('return { season, PLAYERS };', 'return { season, PLAYERS, plan, dispatch, answerAll, seatPlay };').replace("'use strict';", '').replace('module.exports = function makePlayers(L)', 'window.__makePlayers = function makePlayers(L)');
const SCENES = {
  day: { w: 1440, h: 900, clock: 860, speed: 1, secs: 10, caption: 'A busy afternoon at 1x: rides running, two broken, crew walking, guests queuing' },
  close: { w: 1440, h: 900, clock: 860, speed: 1, secs: 10, zoom: [1.45, 470, 250], caption: 'Close up at 1x: the wheel turns, coaster trains run, broken rides smoke and spark' },
  talk: { w: 1440, h: 900, clock: 700, speed: 1, secs: 8, zoom: [1.4, 800, 520], after: "LF.talk(LFUI.state, null, 'safety')", caption: 'A toolbox talk: the crew stop and huddle' },
  squall: { w: 1440, h: 900, squall: true, speed: 2, secs: 10, caption: 'A squall at 2x: wind builds, then rain and breakdowns' },
  lantern: { w: 1440, h: 900, clock: 1284, fresh: false, speed: 2, secs: 9, caption: 'Lantern Hour at 2x: each ride that earns its lantern sends it up' },
  phone: { w: 390, h: 844, clock: 860, speed: 2, secs: 8, touch: true, caption: 'Phone, 2x' },
  reduced: { w: 1440, h: 900, clock: 860, speed: 1, secs: 6, reduce: true, caption: 'Reduced motion: rides hold still, no particles; still marks show the faults' },
};
(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES);
  fs.mkdirSync(OUT, { recursive: true }); fs.rmSync(TMP, { recursive: true, force: true });
  const file = path.join(__dirname, 'out', 'current.html');
  execFileSync('node', [path.join(ROOT, 'build.js'), '--extra', path.join(__dirname, 'looks/_mock'), '--out', file], { stdio: 'ignore' });
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  for (const name of names) {
    const s = SCENES[name], t0 = Date.now();
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, hasTouch: !!s.touch, recordVideo: { dir: TMP, size: { width: s.w, height: s.h } }, reducedMotion: s.reduce ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto('file://' + file);
    await page.evaluate(() => { localStorage.clear(); for (const k of ['sup', 'desk', 'tech', 'mgr', 'dir', 'ceo']) localStorage.setItem('kll-coached-' + k, '1'); });
    await page.reload(); await page.waitForTimeout(300); await page.addScriptTag({ content: players });
    const info = await page.evaluate(s => {
      const P = window.__makePlayers(LF), o = { seat: 'sup', plan: true, hands: true, inbox: true, smart: true, talk: 'quiet', delay: 4, every: 3, inboxEvery: 4 };
      let clock = s.clock, fresh = s.fresh !== false;
      if (s.squall) { window.__mock.scene({ seed: 101, day: 2, clock: 545, P, o, fresh: false }); clock = LFUI.state.waves[0].at - 8; fresh = false; }
      const r = window.__mock.scene({ seed: 101, day: 2, clock, P, o, fresh });
      if (s.after) (0, eval)(s.after);
      if (s.drive !== false) window.__mock.drive(P, o);
      if (s.zoom) window.__mock.zoom(...s.zoom);
      LFUI.ui.sel = null; LFUI.act('speed', { v: s.speed }); return r;
    }, s);
    const ready = Date.now() - t0;
    await page.waitForTimeout(s.secs * 1000);
    const video = page.video(); await page.close(); await ctx.close();
    const webm = await video.path(), mp4 = path.join(OUT, `phase2-${name}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String((ready + 400) / 1000), '-i', webm, '-t', String(s.secs - .6), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'veryfast', '-movflags', '+faststart', mp4]);
    console.log(`${name}: ${path.relative(ROOT, mp4)} ${JSON.stringify(info)}${errors.length ? ' ERRORS ' + errors.join(' | ') : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
