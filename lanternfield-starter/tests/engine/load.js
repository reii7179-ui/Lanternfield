'use strict';
// Loads the game engine into Node, with no browser.
// By default it reads the first plain <script> block of index.html, which is the engine.
// Once the code is split into modules, point LF_ENGINE at the engine file instead:
//   LF_ENGINE=src/engine.js node tests/engine/golden.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');

function loadEngine(file) {
  file = path.resolve(ROOT, file || process.env.LF_ENGINE || 'index.html');
  let src = fs.readFileSync(file, 'utf8');
  if (/\.html?$/i.test(file)) {
    const m = src.match(/<script>([\s\S]*?)<\/script>/);
    if (!m) throw new Error(`No plain <script> block in ${file}. Set LF_ENGINE to the engine's .js file.`);
    src = m[1];
  }
  const ctx = vm.createContext({ console });
  vm.runInContext(src, ctx, { filename: file });
  const L = ctx.LF || (ctx.window && ctx.window.LF);
  if (!L || typeof L.newGame !== 'function') throw new Error(`${file} did not define the engine (expected LF with newGame on the global object).`);
  return L;
}

module.exports = { loadEngine, ROOT };
