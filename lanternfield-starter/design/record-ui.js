'use strict';
// Recordings of the interface motion (phase 3), as MP4 in design/clips/. Builds the game from src/ with the mock-up scene hook.
//   node design/record-ui.js [ui fast phone reduced]
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'clips'), TMP = path.join(__dirname, 'out', 'video');
const players = fs.readFileSync(path.join(ROOT, 'tests/engine/players.js'), 'utf8').replace('return { season, PLAYERS };', 'return { season, PLAYERS, plan, dispatch, answerAll, seatPlay };').replace("'use strict';", '').replace('module.exports = function makePlayers(L)', 'window.__makePlayers = function makePlayers(L)');
// steps: [wait ms, action] where an action is LFUI.act(name, data) or a function name handled below
const TOUR = [[1800], ['sel', 'fault'], [1300], ['sel', 'other'], [1100], ['desk', 'company'], [1300], ['tab', 'team'], [1100], ['tab', 'stores'], [1000], ['closedesk'], [900], ['help'], [1200], ['closehelp'], [1400]];
const SCENES = {
  ui: { w: 1440, h: 900, steps: TOUR, caption: 'Cards slide in, timers drain, numbers count; the selection, the desk and its tabs, and How to play move instead of snapping' },
  fast: { w: 1440, h: 900, zoom: 1.7, steps: [[6500]], caption: 'The fast-response ring: it beats faster, pings, and turns white-hot as the window closes' },
  phone: { w: 390, h: 844, touch: true, steps: TOUR, caption: 'The same on a phone' },
  reduced: { w: 1440, h: 900, reduce: true, steps: TOUR, caption: 'Reduced motion: everything changes at once, nothing slides, pulses or counts' },
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
      const r = window.__mock.scene({ seed: 101, day: 2, clock: 860, P, o, idle: 4 });
      const S = LFUI.state, fr = S.rides.find(x => x.job && x.job.type === 'fault' && !x.job.first && S.clock - x.job.t0 <= LF.FAST) || S.rides.find(x => x.job);
      window.__fault = fr && fr.id;
      if (s.zoom && fr) window.__mock.zoom(s.zoom, fr.x, fr.y);
      LFUI.ui.sel = null; LFUI.act('speed', { v: 1 }); return r;
    }, s);
    const ready = Date.now() - t0;
    for (const [wait, a, v] of s.steps) {
      if (wait) { await page.waitForTimeout(wait); continue; }
      await page.evaluate(([a, v]) => { const d = a === 'sel' ? { id: v === 'fault' ? window.__fault : 'wheel' } : { v }; LFUI.act(a, d); }, [a, v]);
    }
    const secs = (Date.now() - t0 - ready) / 1000;
    const video = page.video(); await page.close(); await ctx.close();
    const webm = await video.path(), mp4 = path.join(OUT, `phase3-${name}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String((ready + 300) / 1000), '-i', webm, '-t', String(secs - .3), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'veryfast', '-movflags', '+faststart', mp4]);
    console.log(`${name}: ${path.relative(ROOT, mp4)} ${secs.toFixed(1)}s ${JSON.stringify(info)}${errors.length ? ' ERRORS ' + errors.join(' | ') : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
