'use strict';
// Listenable demos of the sound (phase 5), in design/clips/:
//   sound-reel.mp3      every effect in turn (the times are printed)
//   sound-day.mp4       a busy afternoon at 1x with the park and the music
//   sound-evening.mp4   Lantern Hour's gong into the night: the crowd thins, crickets, the music box
//   sound-squall.mp4    a squall: wind building, then rain and breakdown alarms
// The game's audio is captured inside the page (MediaRecorder on the master bus) and laid over the screen recording.
//   node design/record-sound.js [reel day evening squall]
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'clips'), TMP = path.join(__dirname, 'out', 'sound');
const players = fs.readFileSync(path.join(ROOT, 'tests/engine/players.js'), 'utf8').replace('return { season, PLAYERS };', 'return { season, PLAYERS, plan, dispatch, answerAll, seatPlay };').replace("'use strict';", '').replace('module.exports = function makePlayers(L)', 'window.__makePlayers = function makePlayers(L)');
const VOL = { on: true, master: .9, sfx: .8, amb: .7, music: .55 };
const REEL = [['major', 'Breakdown (ride closed)'], ['majorStuck', 'Breakdown with guests stuck'], ['minor', 'Fault'], ['warn', 'Warning'], ['send', 'Dispatch'], ['fix', 'Fixed'], ['cash', 'Cash'], ['req', 'Request in the inbox'], ['fast', 'Fast response'], ['ready', 'Part ready'], ['lost', 'Streak lost'], ['lh', 'Lantern Hour'], ['close', 'Closing time'], ['lanterns', 'Report: 12 lanterns'], ['gradeA', 'Season grade A'], ['gradeD', 'Season grade D']];
const SCENES = {
  day: { clock: 860, speed: 1, secs: 20 },
  evening: { clock: 1255, fresh: false, speed: 1, secs: 16 },
  squall: { squall: true, speed: 2, secs: 14 },
};
async function open(browser, video) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(video ? { recordVideo: { dir: TMP, size: { width: 1440, height: 900 } } } : {}) });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.join(__dirname, 'out', 'current.html'));
  await page.evaluate(v => { localStorage.clear(); localStorage.setItem('kll-sound', JSON.stringify(v)); for (const k of ['sup', 'desk', 'tech', 'mgr', 'dir', 'ceo']) localStorage.setItem('kll-coached-' + k, '1'); }, VOL);
  await page.reload(); await page.waitForTimeout(300); await page.addScriptTag({ content: players });
  await page.mouse.click(60, 25); // a click on the title: browsers start audio only after one
  return { ctx, page, errors };
}
(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : ['reel', ...Object.keys(SCENES)];
  fs.mkdirSync(OUT, { recursive: true }); fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
  execFileSync('node', [path.join(ROOT, 'build.js'), '--extra', path.join(__dirname, 'looks/_mock'), '--out', path.join(__dirname, 'out', 'current.html')], { stdio: 'ignore' });
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  for (const name of names) {
    if (name === 'reel') {
      const { ctx, page } = await open(browser, false);
      await page.evaluate(() => { const P = window.__makePlayers(LF); window.__mock.scene({ seed: 101, day: 2, clock: 860, P, o: { seat: 'sup', plan: true, hands: true, inbox: true, smart: true, talk: 'quiet', delay: 4, every: 3, inboxEvery: 4 } }); });
      const gap = 1.6, b64 = await page.evaluate(([reel, gap]) => {
        const S = LFUI.state, stuck = S.rides.find(r => r.job && r.job.rescue), any = S.rides.find(r => r.job && !r.job.rescue) || S.rides[0];
        reel.forEach(([k], i) => setTimeout(() => {
          if (k === 'major') window.__mock.sfx('major', { id: any.id }); else if (k === 'majorStuck') window.__mock.sfx('major', { id: stuck ? stuck.id : any.id });
          else if (k === 'lanterns') window.__mock.sfx('lanterns', 12, true); else if (k === 'gradeA') window.__mock.sfx('grade', 'A'); else if (k === 'gradeD') window.__mock.sfx('grade', 'D'); else window.__mock.sfx(k);
        }, 300 + i * gap * 1000));
        LFUI.act('pause', {}); // the park quiet behind the reel
        return window.__mock.recordAudio(300 + reel.length * gap * 1000 + 1500);
      }, [REEL, gap]);
      const webm = path.join(TMP, 'reel.webm'); fs.writeFileSync(webm, Buffer.from(b64, 'base64'));
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:a', 'libmp3lame', '-q:a', '4', path.join(OUT, 'sound-reel.mp3')]);
      console.log('reel: design/clips/sound-reel.mp3\n' + REEL.map(([, l], i) => `  ${(0.3 + i * gap).toFixed(1).padStart(5)} s  ${l}`).join('\n'));
      await ctx.close(); continue;
    }
    const s = SCENES[name], t0 = Date.now(), { ctx, page, errors } = await open(browser, true);
    await page.evaluate(s => {
      const P = window.__makePlayers(LF), o = { seat: 'sup', plan: true, hands: true, inbox: true, smart: true, talk: 'quiet', delay: 4, every: 3, inboxEvery: 4 };
      let clock = s.clock, fresh = s.fresh !== false;
      if (s.squall) { window.__mock.scene({ seed: 101, day: 2, clock: 545, P, o, fresh: false }); clock = LFUI.state.waves[0].at - 10; fresh = false; }
      window.__mock.scene({ seed: 101, day: 2, clock, P, o, fresh }); window.__mock.drive(P, o); LFUI.ui.sel = null;
    }, s);
    const ready = Date.now() - t0;
    const b64 = await page.evaluate(s => { LFUI.act('speed', { v: s.speed }); return window.__mock.recordAudio(s.secs * 1000); }, s);
    const video = page.video(); await page.close(); await ctx.close();
    const webm = path.join(TMP, name + '.webm'); fs.writeFileSync(webm, Buffer.from(b64, 'base64'));
    const mp4 = path.join(OUT, `sound-${name}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(ready / 1000 + .1), '-i', await video.path(), '-i', webm, '-map', '0:v', '-map', '1:a', '-t', String(s.secs - .2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', mp4]);
    console.log(`${name}: ${path.relative(ROOT, mp4)}${errors.length ? ' ERRORS ' + errors.join(' | ') : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
