'use strict';
// The playtest build for itch.io: a zip with index.html at its root, as itch.io's HTML5 uploads expect.
//   npm run package:itch        writes dist/lanternfield-playtest-<version>.zip (and dist/itch/index.html)
// No dependencies: the zip is written here with Node's own deflate. See PLAYTEST.md for the upload steps.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..'), { build } = require('../build.js');
const html = Buffer.from(build({ playtest: true }), 'utf8'), stamp = /const BUILD = '([^']+)'/.exec(html.toString())[1];
const dir = path.join(ROOT, 'dist', 'itch'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'index.html'), html);

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(files) { // files: [[name, Buffer]]; deflated entries, one central directory
  const local = [], central = []; let off = 0; const t = new Date(), dt = ((t.getHours() << 11) | (t.getMinutes() << 5) | (t.getSeconds() >> 1)), dd = (((t.getFullYear() - 1980) << 9) | ((t.getMonth() + 1) << 5) | t.getDate());
  for (const [name, data] of files) {
    const n = Buffer.from(name), z = zlib.deflateRawSync(data, { level: 9 }), c = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(dt, 10); h.writeUInt16LE(dd, 12); h.writeUInt32LE(c, 14); h.writeUInt32LE(z.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(n.length, 26); h.writeUInt16LE(0, 28);
    const e = Buffer.alloc(46); e.writeUInt32LE(0x02014b50, 0); e.writeUInt16LE(20, 4); e.writeUInt16LE(20, 6); e.writeUInt16LE(0, 8); e.writeUInt16LE(8, 10); e.writeUInt16LE(dt, 12); e.writeUInt16LE(dd, 14); e.writeUInt32LE(c, 16); e.writeUInt32LE(z.length, 20); e.writeUInt32LE(data.length, 24); e.writeUInt16LE(n.length, 28); e.writeUInt32LE(0, 30); e.writeUInt32LE(0, 34); e.writeUInt32LE(0, 38); e.writeUInt32LE(off, 42);
    local.push(h, n, z); central.push(e, n); off += h.length + n.length + z.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...local, cd, end]);
}
for (const old of fs.readdirSync(path.join(ROOT, 'dist')).filter(f => /^lanternfield-playtest-.*\.zip$/.test(f))) fs.rmSync(path.join(ROOT, 'dist', old)); // only the current build's zip, so the right one gets uploaded
const out = path.join(ROOT, 'dist', `lanternfield-playtest-${stamp.replace('+', '-')}.zip`);
fs.writeFileSync(out, zip([['index.html', html]]));
console.log(`${path.relative(ROOT, out)}: build ${stamp}, index.html ${(html.length / 1024).toFixed(0)} KB, zip ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
