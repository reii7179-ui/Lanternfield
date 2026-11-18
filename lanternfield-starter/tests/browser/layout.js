'use strict';
// Layout test at phone, tablet and laptop sizes, on a busy moment of day 1 and on the title screen.
// Fails if: the objectives card covers the log, a ride name is clipped on the park board, a command button is cut off
// (desktop and tablet only: on phones the command card scrolls by design), the top bar's figures run off screen
// (except phone landscape, where they scroll by design), the page scrolls sideways, the title's Start button is unreachable,
// or two ride names on the map overlap at the default zoom (LFUI.labels() reports where each name was drawn).
// Screenshots go to tests/browser/out/.
//   node tests/browser/layout.js
const { launch, openGame, gameErrors, shot, report } = require('./lib.js');
const SIZES = [[2560, 1440], [1920, 1080], [1440, 900], [1366, 768], [1280, 720], [1180, 820], [1024, 768], [1024, 600], [820, 1180], [768, 1024],
  [844, 390], [667, 375], [412, 915], [390, 844], [375, 667], [360, 640]];
const phone = (w, h) => w <= 620 || h <= 520;

const CHECK = () => {
  const r = e => e.getBoundingClientRect(), vis = e => e && e.offsetParent && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const o = document.getElementById('obj'), lines = document.querySelector('#log .radio'), lb = document.querySelector('#log .lbtn');
  const out = {};
  out.objCoversLog = vis(o) && ((vis(lines) && r(o).bottom > r(lines).top) || (vis(lb) && r(o).bottom > r(lb).top));
  out.clippedNames = [...document.querySelectorAll('.as b')].filter(b => vis(b) && (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1)).map(b => b.textContent);
  const sp = document.getElementById('selp'), sb = r(sp).bottom;
  out.cutCommands = [...sp.querySelectorAll('.cmd')].filter(vis).filter(c => r(c).bottom > sb + 1).map(c => c.querySelector('b').textContent);
  const st = [...document.querySelectorAll('.stat')].filter(vis), res = document.querySelector('.res');
  out.topBarCut = st.length ? r(st[st.length - 1]).right > innerWidth + 1 || res.scrollWidth > res.clientWidth + 1 : false;
  out.sideScroll = document.documentElement.scrollWidth > innerWidth + 1;
  const L = LFUI.labels(), ov = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  out.labelsOverlap = []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (ov(L[i], L[j]) > .15 * Math.min(L[i].w * L[i].h, L[j].w * L[j].h)) out.labelsOverlap.push(L[i].id + '/' + L[j].id);
  return out;
};

(async () => {
  const browser = await launch(), problems = [];
  for (const [w, h] of SIZES) {
    const touch = w < 900, tag = `${w}x${h}`;
    // title screen
    const t = await openGame(browser, { width: w, height: h, touch, coached: false });
    const title = await t.page.evaluate(() => { const b = document.querySelector('.dialog [data-a=begin]').getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; });
    if (!title) problems.push(`${tag}: the Start button on the title screen is off screen`);
    await shot(t.page, `layout-${tag}-title`); await t.page.close();
    // a busy moment in the park
    const { page, errors } = await openGame(browser, { width: w, height: h, touch });
    await page.evaluate(() => { LFUI.act('begin', {}); LFUI.act('go', {}); const S = LFUI.state; for (let i = 0; i < 95; i++) { LF.step(S); S.fx.length = 0; } S.cash = 123456; S.total = 150; });
    await page.waitForTimeout(700);
    const c = await page.evaluate(CHECK);
    if (c.objCoversLog) problems.push(`${tag}: the objectives card covers the log`);
    if (c.clippedNames.length) problems.push(`${tag}: ride names clipped on the park board: ${c.clippedNames.join(', ')}`);
    if (c.cutCommands.length && !phone(w, h)) problems.push(`${tag}: command buttons cut off: ${c.cutCommands.join(', ')}`);
    if (c.topBarCut && !(h <= 520)) problems.push(`${tag}: top bar figures run off the screen`);
    if (c.sideScroll) problems.push(`${tag}: the page scrolls sideways`);
    if (c.labelsOverlap.length) problems.push(`${tag}: ride names overlap on the map: ${c.labelsOverlap.join(', ')}`);
    await shot(page, `layout-${tag}`);
    for (const e of await gameErrors(page, errors)) problems.push(`${tag}: ${e}`);
    await page.close();
  }
  report('layout', problems, `${SIZES.length} screen sizes`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
