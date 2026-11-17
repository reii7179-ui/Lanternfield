'use strict';
// Builds the single self-contained index.html from the files in src/.
//   node build.js          write index.html
//   node build.js --check  fail if index.html is out of date with src/ (someone edited the built file by hand)
//   node build.js --extra design/looks/glow --out design/out/glow.html
//                          a variant: the .css and .js files in each --extra folder are added after src's own
//                          (a later function declaration replaces an earlier one), written to --out instead
//
// src/index.html is the page shell. Each placeholder line is replaced by:
//   <!-- @fonts -->   the fonts in src/fonts/, inlined as base64 so the game works offline
//   <!-- @css -->     src/css/*.css, in name order
//   <!-- @engine -->  src/engine.js (stays the first plain <script>, which the engine tests read)
//   <!-- @ui -->      src/ui/*.js, in name order, inside the interface's one closure
// No dependencies, no minifying: the built file stays readable.
const fs = require('fs'), path = require('path');
const ROOT = __dirname, SRC = path.join(ROOT, 'src'), OUT = path.join(ROOT, 'index.html');

const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const dir = d => fs.readdirSync(path.join(SRC, d)).filter(f => !f.startsWith('.')).sort();
const ending = s => s.endsWith('\n') ? s : s + '\n';

const FONTS = [
  // family, weight range, file
  ['Bagel Fat One', '400', 'bagel-fat-one-latin.woff2'],
  ['Familjen Grotesk', '400 700', 'familjen-grotesk-latin.woff2'], // a variable font: one file covers every weight
];
function fontCSS() {
  const faces = FONTS.map(([fam, wt, file]) => {
    const b64 = fs.readFileSync(path.join(SRC, 'fonts', file)).toString('base64');
    return `@font-face{font-family:"${fam}";font-style:normal;font-weight:${wt};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
  });
  return `<style>/* Fonts: SIL Open Font License 1.1, see src/fonts/ */\n${faces.join('\n')}\n</style>\n`;
}

function build({ extra = [] } = {}) {
  const more = ext => extra.flatMap(d => fs.readdirSync(d).filter(f => f.endsWith(ext)).sort().map(f => ending(fs.readFileSync(path.join(d, f), 'utf8'))));
  const parts = {
    '<!-- @fonts -->': fontCSS(),
    '<!-- @css -->': dir('css').filter(f => f.endsWith('.css')).map(f => ending(read('css/' + f))).concat(more('.css')).join(''),
    '<!-- @engine -->': ending(read('engine.js')),
    '<!-- @ui -->': dir('ui').filter(f => f.endsWith('.js')).map(f => ending(read('ui/' + f))).concat(more('.js')).join(''),
  };
  const seen = new Set();
  const html = read('index.html').split('\n').map(l => {
    const k = l.trim();
    if (!(k in parts)) return l + '\n';
    seen.add(k);
    return parts[k];
  }).join('').replace(/\n$/, ''); // split() leaves one empty last line; its newline was already added
  for (const k in parts) if (!seen.has(k)) throw new Error(`src/index.html is missing the placeholder ${k}`);
  return html;
}

if (require.main === module) {
  const argv = process.argv.slice(2), opt = k => argv.flatMap((a, i) => a === k && argv[i + 1] ? [argv[i + 1]] : []);
  const extra = opt('--extra').map(d => path.resolve(d)), out = opt('--out')[0];
  const html = build({ extra });
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(path.resolve(out), html);
    console.log(`built ${out} (${(html.length / 1024).toFixed(0)} KB)${extra.length ? ' with ' + extra.map(d => path.relative(ROOT, d)).join(', ') : ''}`);
  } else if (argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== html) { console.error('index.html is out of date with src/. Edit src/, then run: npm run build'); process.exit(1); }
    console.log('build check OK: index.html matches src/');
  } else {
    fs.writeFileSync(OUT, html);
    console.log(`built index.html (${(html.length / 1024).toFixed(0)} KB)`);
  }
}
module.exports = { build };
