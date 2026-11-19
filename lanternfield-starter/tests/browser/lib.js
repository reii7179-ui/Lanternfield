'use strict';
// Shared helpers for the browser tests (Playwright).
// The game file defaults to index.html at the project root. After a build step, point LF_GAME at the built file:
//   LF_GAME=dist/index.html node tests/browser/smoke.js
// The tests use Playwright's own Chromium (npx playwright install chromium) unless CHROME_PATH points at another browser.
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
const GAME = path.resolve(ROOT, process.env.LF_GAME || 'index.html');
const OUT = path.join(__dirname, 'out'); // screenshots land here (ignored by git)
const SEATS = ['sup', 'tech', 'mgr', 'dir', 'ceo'];

async function launch() {
  if (!fs.existsSync(GAME)) throw new Error(`Game file not found: ${GAME}. Set LF_GAME.`);
  fs.mkdirSync(OUT, { recursive: true });
  return chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
}

// Opens the game on a fresh page. coached: true marks every coach as already seen, so it stays out of the way.
async function openGame(browser, { width = 1366, height = 768, touch = false, coached = true, clear = true, initScript = null, dpr = 1, file = null } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, deviceScaleFactor: dpr });
  const errors = [];
  page.on('pageerror', e => errors.push('page error: ' + String(e.stack || e).slice(0, 400)));
  await page.route('**/fonts.g*/**', r => r.abort()); // tests run offline; the game falls back to system fonts
  if (initScript) await page.addInitScript(initScript);
  await page.goto('file://' + (file || GAME), { waitUntil: 'domcontentloaded' });
  if (clear) {
    await page.evaluate(c => { localStorage.clear(); if (c) ['sup', 'desk', 'tech', 'mgr', 'dir', 'ceo'].forEach(k => localStorage.setItem('kll-coached-' + k, '1')); }, coached);
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(400);
  return { page, errors };
}

// The game shows its own red error box when a panel fails to draw; count that as a failure too.
async function gameErrors(page, errors) {
  const box = await page.evaluate(() => { const b = document.getElementById('oops'); return b ? b.textContent.slice(0, 1500) : null; }).catch(() => null);
  return box ? errors.concat(['error box on screen: ' + box]) : errors;
}

async function shot(page, name) { await page.screenshot({ path: path.join(OUT, name + '.png') }); }

// Where a park point (world units) is on screen, for clicking rides on the map.
async function mapPoint(page, x, y) {
  return page.evaluate(([x, y]) => { const b = document.getElementById('map').getBoundingClientRect(), q = LFUI.scr(x, y); return [b.left + q[0], b.top + q[1]]; }, [x, y]);
}

function report(name, problems, extra = '') {
  if (problems.length) { console.error(`${name} FAILED (${problems.length})`); for (const p of problems.slice(0, 20)) console.error('  - ' + p); process.exitCode = 1; }
  else console.log(`${name} OK${extra ? ': ' + extra : ''}`);
}

module.exports = { ROOT, GAME, OUT, SEATS, launch, openGame, gameErrors, shot, mapPoint, report };
