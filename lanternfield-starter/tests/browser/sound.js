'use strict';
// Sound: off until the player turns it on, and the choice and volumes are remembered (localStorage 'kll-sound', never
// in the saved game). With sound off no audio is even created. Without Web Audio the game still runs, silently.
//   node tests/browser/sound.js
const { launch, openGame, gameErrors, report } = require('./lib.js');
const COUNT = () => { // count the audio contexts the page creates
  window.__ac = 0; const A = window.AudioContext; if (A) window.AudioContext = class extends A { constructor(...a) { super(...a); window.__ac++; } };
};
(async () => {
  const browser = await launch(), problems = [];
  const { page, errors } = await openGame(browser, { initScript: COUNT });
  await page.evaluate(() => { LFUI.act('begin', {}); LFUI.act('go', {}); LFUI.act('speed', { v: 2 }); });
  await page.mouse.click(700, 400); await page.keyboard.press('p'); await page.keyboard.press('p');
  await page.evaluate(() => { LFUI.ui.sel = null; LFUI.ui.units = []; }); await page.waitForTimeout(1500); // nothing selected, so the command card shows the Sound button
  const off = await page.evaluate(() => ({ ac: window.__ac, btn: (document.querySelector('[data-a="mute"]') || {}).textContent || '', stored: localStorage.getItem('kll-sound') }));
  if (off.ac) problems.push(`sound is off by default, yet ${off.ac} audio context(s) were created`);
  if (!/Off/.test(off.btn)) problems.push(`the Sound button should say Off on a first visit (it says "${off.btn}")`);
  // turn it on in How to play, set the volumes
  await page.evaluate(() => { LFUI.act('pause', {}); LFUI.act('help', {}); }); await page.waitForTimeout(300);
  await page.click('#modal [data-a="sound"][data-v="on"]'); await page.waitForTimeout(300);
  for (const [k, v] of [['music', 40], ['amb', 70], ['sfx', 60]]) await page.evaluate(([k, v]) => { const i = document.querySelector(`#modal input[data-vol="${k}"]`); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, [k, v]);
  await page.waitForTimeout(300);
  const on = await page.evaluate(() => ({ ac: window.__ac, stored: JSON.parse(localStorage.getItem('kll-sound') || '{}'), disabled: document.querySelector('#modal input[data-vol="music"]').disabled, inSave: 'snd' in LFUI.state || JSON.stringify(LFUI.state).includes('"music"') }));
  if (!on.ac) problems.push('turning sound on did not start any audio');
  if (!on.stored.on) problems.push('turning sound on was not remembered');
  if (Math.abs(on.stored.music - .4) > .01 || Math.abs(on.stored.amb - .7) > .01 || Math.abs(on.stored.sfx - .6) > .01) problems.push(`the volume sliders were not remembered: ${JSON.stringify(on.stored)}`);
  if (on.disabled) problems.push('the volume sliders stay disabled with sound on');
  if (on.inSave) problems.push('the sound settings leaked into the saved game');
  // the choice survives a reload; audio waits for the first click or key, as browsers require
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
  const back = await page.evaluate(() => ({ btn: (document.querySelector('[data-a="mute"]') || {}).textContent || '', stored: JSON.parse(localStorage.getItem('kll-sound') || '{}') }));
  if (!back.stored.on) problems.push('sound on was forgotten after a reload');
  await page.evaluate(() => { LFUI.act('begin', {}); }); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (!(await page.evaluate(() => window.__ac))) problems.push('after a reload with sound on, a key press did not start the audio');
  // turning it off is remembered too
  await page.evaluate(() => LFUI.act('mute', {})); await page.waitForTimeout(200);
  if (JSON.parse(await page.evaluate(() => localStorage.getItem('kll-sound'))).on) problems.push('turning sound off was not remembered');
  problems.push(...await gameErrors(page, errors));
  await page.close();
  // no Web Audio at all: everything still works, silently
  const quiet = await openGame(browser, { initScript: () => { delete window.AudioContext; delete window.webkitAudioContext; } });
  await quiet.page.evaluate(() => { localStorage.setItem('kll-sound', JSON.stringify({ on: true, master: 1, sfx: 1, amb: 1, music: 1 })); });
  await quiet.page.reload({ waitUntil: 'domcontentloaded' }); await quiet.page.waitForTimeout(400);
  await quiet.page.evaluate(() => { LFUI.act('begin', {}); LFUI.act('go', {}); LFUI.act('speed', { v: 2 }); }); await quiet.page.mouse.click(700, 400); await quiet.page.waitForTimeout(2500);
  problems.push(...(await gameErrors(quiet.page, quiet.errors)).map(e => 'without Web Audio: ' + e));
  report('sound', problems);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
