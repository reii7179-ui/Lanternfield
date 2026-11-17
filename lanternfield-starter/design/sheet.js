'use strict';
// One comparison sheet per look from design/shots: day and night on a laptop, day on a phone.
//   node design/sheet.js current glow iso fair
const path = require('path'), { chromium } = require('playwright');
const NAMES = { current: ['Lantern Glow, in the game', 'What src/ builds now: cached layers, large high-contrast rings, bigger phone labels, chunky buttons.'], glow: ['A · Lantern Glow', 'Polished flat vector at night with a soft glow. Glass HUD, gold accents.'], iso: ['B · Diorama', 'Isometric 2.5D: a raised island, boxed buildings, rides on plinths. Chunky toy-box HUD.'], fair: ['C · Seaside Fair', 'Warm painterly fair drawn in code: painted textures, inked edges, bunting. Paper HUD.'] };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const look of process.argv.slice(2)) {
    const p = await b.newPage({ viewport: { width: 2000, height: 700 }, deviceScaleFactor: 1.5 });
    const img = n => `${look}-${n}.png`;
    const html = path.join(__dirname, 'shots', `.sheet-${look}.html`);
    require('fs').writeFileSync(html, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0c0f22;font-family:system-ui;color:#f7edd8;padding:22px 26px">
      <div style="display:flex;align-items:baseline;gap:18px;margin-bottom:14px"><b style="font-size:30px">${NAMES[look][0]}</b><span style="font-size:18px;opacity:.75">${NAMES[look][1]}</span></div>
      <div style="display:flex;gap:16px;align-items:flex-start">
        <figure style="margin:0"><img src="${img('desk-day')}" style="width:864px;border-radius:8px;display:block"><figcaption style="opacity:.7;margin-top:6px">14:32, a fault in its ⚡ window</figcaption></figure>
        <figure style="margin:0"><img src="${img('desk-night')}" style="width:864px;border-radius:8px;display:block"><figcaption style="opacity:.7;margin-top:6px">21:30, Lantern Hour</figcaption></figure>
        <figure style="margin:0"><img src="${img('phone-day')}" style="height:540px;border-radius:8px;display:block"><figcaption style="opacity:.7;margin-top:6px">Phone, 390 wide</figcaption></figure>
      </div></body>`);
    await p.goto('file://' + html); await p.waitForTimeout(400); require('fs').unlinkSync(html);
    await p.screenshot({ path: path.join(__dirname, 'shots', `sheet-${look}.png`), fullPage: true });
    await p.close();
  }
  await b.close();
})();
