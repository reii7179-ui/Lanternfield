/* ---------- sound: effects, a park that sounds like the time of day, and optional music ----------
   Everything is synthesised here (no audio files), so the game stays one small file that works offline.
   Sound is off until the player turns it on. The choice and the four volumes live in localStorage 'kll-sound', never
   in the saved game. Browsers only let audio start after a click or a key, so the audio graph is built on first use.
   Buses: effects, ambience and music each have a volume, all through a master volume and a gentle compressor. */
const SOUND_KEY = 'kll-sound';
const snd = { on: false, master: .8, sfx: .8, amb: .5, music: 0 }; // music is optional: off (0) until the player raises it
try { const v = JSON.parse(localStorage.getItem(SOUND_KEY) || 'null'); if (v && typeof v === 'object') for (const k in snd) if (typeof v[k] === typeof snd[k]) snd[k] = v[k]; } catch (e) { /* storage blocked: defaults */ }
let AC = null, BUS = null, NOISE = null;
function audio() { // the audio graph, built once and only when sound is on
  if (AC || !snd.on) return AC;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    // the voices are written quiet; a makeup gain brings them to a healthy level and the compressor keeps the loud ones from clipping
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .2; comp.connect(AC.destination);
    const g = () => AC.createGain(), master = g(), sfx = g(), amb = g(), music = g(), makeup = g(); makeup.gain.value = 3.6;
    master.connect(makeup); makeup.connect(comp); for (const b of [sfx, amb, music]) b.connect(master);
    BUS = { master, sfx, amb, music, out: comp };
    NOISE = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolumes(true);
  } catch (e) { AC = null; BUS = null; /* no audio here: the game is silent but complete */ }
  return AC;
}
function saveSound() { try { localStorage.setItem(SOUND_KEY, JSON.stringify(snd)); } catch (e) { /* not remembered, still applied */ } }
function applyVolumes(now) {
  if (!BUS) return;
  const t = AC.currentTime, set = (n, v) => now ? n.gain.setValueAtTime(v, t) : n.gain.setTargetAtTime(v, t, .06), sq = v => v * v; // volume sliders feel even on a squared curve
  set(BUS.master, snd.on ? sq(snd.master) : 0); set(BUS.sfx, sq(snd.sfx) * 2.2); set(BUS.amb, sq(snd.amb) * .65); set(BUS.music, sq(snd.music) * 2.8);
}
function setSound(on) {
  snd.on = !!on; saveSound();
  if (snd.on) { audio(); if (AC && AC.state === 'suspended') AC.resume(); }
  applyVolumes();
  if (!snd.on) { ambStop(); musicStop(); }
}
function setVolume(k, v) { if (!(k in snd) || k === 'on') return; snd[k] = clamp(v, 0, 1); saveSound(); applyVolumes(); if (k === 'sfx' || k === 'master') SFX.ready(); }
function unlockAudio() { if (snd.on) { audio(); if (AC && AC.state === 'suspended') AC.resume(); } } // called on every click and key
document.addEventListener('visibilitychange', () => { if (!AC) return; if (document.hidden) AC.suspend(); else if (snd.on) AC.resume(); });

/* the voices everything is made of: a tone with an envelope, a filtered noise burst, a bell */
function tone(f, d, type, v, when, o) {
  if (!snd.on || !audio()) return;
  try {
    o = o || {}; const t = AC.currentTime + (when || 0), osc = AC.createOscillator(), g = AC.createGain();
    osc.type = type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v || .05, t + (o.att || .012)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    let out = osc; if (o.lp) { const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); out = fl; }
    out.connect(g); g.connect(o.bus || BUS.sfx); osc.start(t); osc.stop(t + d + .05);
  } catch (e) { /* the game is complete without it */ }
}
function noiseBurst(d, v, when, type, freq, q, o) {
  if (!snd.on || !audio()) return;
  try {
    o = o || {}; const t = AC.currentTime + (when || 0), src = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
    src.buffer = NOISE; src.playbackRate.value = .8 + Math.random() * .4; fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(freq || 1000, t); if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + d); fl.Q.value = q || 1;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + (o.att || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    src.connect(fl); fl.connect(g); g.connect(o.bus || BUS.sfx); src.start(t, Math.random()); src.stop(t + d + .05);
  } catch (e) { /* the game is complete without it */ }
}
function bell(f, d, v, when, bus) { for (const [m, k] of [[1, 1], [2.76, .35], [5.4, .12]]) tone(f * m, d / (m > 1 ? m * .6 : 1), 'sine', v * k, when, { bus }); }

/* the effects: each event in the game has its own short sound */
const SFX = {
  major: f => { // a ride closed: a two-tone alarm and a thump; three urgent beeps when guests are stuck on it
    const r = f && f.id && L.ride(S, f.id), stuck = r && r.job && r.job.rescue;
    tone(90, .35, 'sine', .12, 0, { to: 45 });
    if (stuck) for (let i = 0; i < 3; i++) tone(988, .1, 'square', .045, i * .13, { lp: 2400 });
    else for (let i = 0; i < 2; i++) { tone(740, .13, 'square', .045, i * .28, { lp: 1800 }); tone(554, .13, 'square', .045, i * .28 + .14, { lp: 1800 }); }
  },
  minor: () => { tone(587, .16, 'triangle', .07); tone(494, .22, 'triangle', .07, .11); noiseBurst(.03, .04, 0, 'highpass', 3000); }, // a fault: a soft falling pair
  warn: () => tone(880, .22, 'sine', .065, 0, { to: 860 }), // something to keep an eye on: a single ping
  send: () => { noiseBurst(.045, .1, 0, 'bandpass', 1800, 2); tone(1200, .06, 'square', .05, .04, { lp: 2500 }); tone(1600, .05, 'square', .04, .09, { lp: 2500 }); }, // a dispatch: a radio click and chirp
  fix: () => { bell(659, .5, .05); bell(831, .5, .045, .09); bell(988, .9, .05, .18); }, // back in service: a rising bell
  cash: () => { tone(1319, .09, 'triangle', .07); tone(1760, .25, 'triangle', .07, .07); noiseBurst(.04, .04, .07, 'highpass', 6000); }, // money: a coin
  req: () => { tone(523, .12, 'sine', .07, 0, { to: 600 }); tone(784, .18, 'sine', .07, .1, { to: 820 }); }, // a request in the inbox
  fast: () => { tone(784, .07, 'sine', .075); tone(1047, .07, 'sine', .075, .06); tone(1319, .12, 'sine', .075, .12); tone(2093, .35, 'sine', .025, .16); }, // a fast response: a rising chime with a shimmer
  lh: () => { bell(98, 3, .1); bell(147, 2.6, .05, .04); noiseBurst(2.2, .02, 0, 'lowpass', 500, .7, { att: .8 }); }, // Lantern Hour: a gong
  close: () => [392, 494, 587, 784].forEach((q, i) => bell(q, .9, .04, i * .14)), // closing time
  ready: () => bell(1047, .4, .055), // a part ready, an express in, a volume check
  rest: () => tone(440, .35, 'sine', .03, 0, { to: 392 }), // back from a break
  lost: () => { tone(330, .12, 'triangle', .07); tone(247, .3, 'triangle', .07, .1); }, // a streak broken
  lanterns: (n, all) => { const P = [523, 587, 659, 784, 880]; for (let i = 0; i < n; i++) bell(P[i % 5] * (1 + Math.floor(i / 5)), .7, .03, .3 + i * .14); if (all) [523, 659, 784, 1047].forEach((q, i) => tone(q, 1.2, 'sine', .04, .3 + n * .14 + .1 + i * .02)); }, // one bell per lantern, in time with the count
  grade: g => { const up = { A: [523, 659, 784, 1047, 1319], B: [523, 659, 784, 1047], C: [440, 523, 659], D: [330, 294, 247] }[g] || [440]; up.forEach((q, i) => tone(q, i === up.length - 1 ? .9 : .25, g === 'D' ? 'triangle' : 'sine', .05, .35 + i * .13)); },
};

/* the park around you: crowd murmur with the attendance, the sea, machinery humming while rides run, gulls by day and
   crickets at night, wind and rain in a squall. Quieter while paused. Only running while sound and ambience are on. */
let AMB = null, ambAt = 0;
function ambStart() {
  if (AMB || !audio()) return;
  const loop = (type, freq, q) => { const src = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); src.buffer = NOISE; src.loop = true; src.playbackRate.value = .7 + Math.random() * .6; fl.type = type; fl.frequency.value = freq; fl.Q.value = q; g.gain.value = 0; src.connect(fl); fl.connect(g); g.connect(BUS.amb); src.start(0, Math.random() * 2); return { src, fl, g }; };
  const hum = AC.createGain(), hl = AC.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 160; hum.gain.value = 0; hl.connect(hum); hum.connect(BUS.amb);
  const oscs = [49, 73.5].map(f => { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(hl); o.start(); return o; });
  AMB = { crowd: loop('bandpass', 750, .8), sea: loop('lowpass', 420, .7), wind: loop('bandpass', 320, 1.2), rain: loop('highpass', 2800, .5), hum, oscs };
}
function ambStop() { if (!AMB) return; try { for (const k of ['crowd', 'sea', 'wind', 'rain']) AMB[k].src.stop(); for (const o of AMB.oscs) o.stop(); AMB.hum.disconnect(); } catch (e) { /* already stopped */ } AMB = null; }
function ambTick(now) {
  if (now - ambAt < 400) return; ambAt = now;
  if (!snd.on || snd.amb <= 0 || !AC || AC.state !== 'running') { if (AMB && (!snd.on || snd.amb <= 0)) ambStop(); return; }
  ambStart(); if (!AMB) return;
  const t = AC.currentTime, s = (node, v, tc) => node.gain.setTargetAtTime(v, t, tc || 1.2), day = S.phase === 'day' && !ui.title, clock = ui.title ? 1290 : S.clock, n = nightOf(clock), w = weatherNow();
  const duck = !ui.title && (S.paused || !VIS.run) ? .45 : 1, open = day ? 1 : ui.title ? .5 : .15;
  const running = S.rides.filter(r => r.sub && (RUNOF[rideSt(r)] || 0) > 0).length / L.N_RIDES;
  s(AMB.crowd.g, duck * open * (.05 + .1 * Math.min(1.3, ui.title ? .6 : S.att || 0)) * (1 - .45 * n));
  AMB.crowd.fl.frequency.setTargetAtTime(650 + Math.random() * 250, t, .8);
  s(AMB.sea.g, duck * (.06 + .04 * Math.sin(now / 2600)), 2);
  s(AMB.hum, duck * open * .05 * running);
  s(AMB.wind.g, duck * .09 * w.wind); AMB.wind.fl.frequency.setTargetAtTime(220 + 220 * Math.random() * w.wind, t, 1.5);
  s(AMB.rain.g, duck * .12 * w.rain, .8);
  if (duck < 1) return;
  const amb = { bus: BUS.amb };
  if (n < .35 && Math.random() < .035) { const f = 1300 + Math.random() * 300; for (let i = 0; i < 2; i++) tone(f, .28, 'sine', .02, i * .32, { to: f * .7, ...amb }); } // a gull
  if (day && n < .6 && running > .5 && Math.random() < .03) noiseBurst(.9, .012, 0, 'bandpass', 900, 3, { to: 1700, att: .3, ...amb }); // a distant cheer from a coaster
  if (n > .6 && Math.random() < .25) for (let i = 0; i < 5; i++) tone(4400 + Math.random() * 300, .03, 'sine', .006, i * .07, amb); // crickets
}

/* music, optional (off until the player raises its volume): an original fairground waltz. Kept light: plain triangle
   and sine voices with no filters, as few at a time as possible, because audio shares the phone's processor. By day a calliope over
   oom-pah-pah; at dusk slower and softer; after dark a music box. Notes are scheduled a little ahead on the audio clock. */
const WALTZ = [ // 16 bars of 3 beats: chord root (semitones from the key) and melody [beat, length, semitones above the key's C5]
  [0, [[0, 1, 4], [1, 1, 7], [2, 1, 12]]], [7, [[0, 2, 11], [2, 1, 7]]], [7, [[0, 1, 5], [1, 1, 7], [2, 1, 11]]], [0, [[0, 2, 12], [2, 1, 4]]],
  [0, [[0, 1, 7], [1, .5, 9], [1.5, .5, 7], [2, 1, 4]]], [5, [[0, 1, 5], [1, 1, 9], [2, 1, 12]]], [7, [[0, 1, 11], [1, 1, 14], [2, 1, 7]]], [0, [[0, 3, 12]]],
  [9, [[0, 1, 9], [1, 1, 12], [2, 1, 16]]], [2, [[0, 2, 14], [2, 1, 9]]], [7, [[0, 1, 11], [1, 1, 7], [2, 1, 2]]], [0, [[0, 2, 4], [2, 1, 7]]],
  [5, [[0, 1, 9], [1, 1, 5], [2, 1, 12]]], [0, [[0, 1, 7], [1, 1, 4], [2, 1, 0]]], [7, [[0, 1, 2], [1, 1, -1], [2, 1, 2]]], [0, [[0, 3, 0]]],
];
const MINOR_CHORD = new Set([2, 9]); // ii and vi
let MUS = null;
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
function musicStop() { if (MUS) clearInterval(MUS.timer); MUS = null; }
function musicTick() {
  if (!snd.on || snd.music <= 0 || !AC || AC.state !== 'running') { if (MUS && (!snd.on || snd.music <= 0)) musicStop(); return; }
  if (!MUS) MUS = { bar: 0, next: AC.currentTime + .1, timer: setInterval(musicTick, 120) };
  const clock = ui.title ? 600 : S.clock, n = nightOf(clock), mood = ui.title ? 'day' : n > .6 ? 'night' : n > .05 ? 'dusk' : 'day';
  const bpm = { day: 112, dusk: 96, night: 84 }[mood], beat = 60 / bpm, key = mood === 'dusk' ? 5 : 0, bus = BUS.music, soft = !ui.title && S.paused ? .5 : 1;
  while (MUS.next < AC.currentTime + .4) {
    const [root, mel] = WALTZ[MUS.bar % WALTZ.length], t0 = MUS.next - AC.currentTime, R = 48 + key + root, third = MINOR_CHORD.has(root) ? 3 : 4;
    if (mood !== 'night') { // oom-pah-pah
      tone(midiHz(R - 12), beat * .9, 'triangle', .07 * soft, t0, { bus });
      for (const b of [1, 2]) for (const iv of [third, 7]) tone(midiHz(R + 12 + iv), beat * .4, 'triangle', .02 * soft, t0 + b * beat, { bus });
    } else tone(midiHz(R), beat * 2.8, 'sine', .04 * soft, t0, { bus });
    for (const [b, len, m] of mel) { // the tune: a calliope by day, a music box after dark
      const f = midiHz(72 + key + m + (mood === 'night' ? 12 : 0)), when = t0 + b * beat;
      if (mood === 'night') { tone(f, len * beat * 1.6, 'sine', .035 * soft, when, { bus }); tone(f * 2.76, len * beat * .5, 'sine', .01 * soft, when, { bus }); } // a music box: a sine and one bell partial
      else tone(f, len * beat * .95, 'triangle', .05 * soft, when, { bus, att: .02 });
    }
    MUS.next += 3 * beat; MUS.bar++;
  }
}
