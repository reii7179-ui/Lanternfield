/* ---------- sound: a few soft tones, only after the first click ---------- */
let AC = null;
function tone(f, d, type, v, when) {
  if (ui.mute) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v || .05, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) { /* no audio here; the game is silent but complete */ }
}
const SFX = {
  major: () => { tone(466, .09, 'sawtooth', .03); tone(440, .09, 'sawtooth', .03); tone(392, .2, 'triangle', .075, .08); tone(277, .4, 'triangle', .075, .22); }, // a breakdown: a short clash, then a falling sting
  minor: () => tone(330, .2, 'triangle', .05),
  warn: () => tone(440, .16, 'triangle', .04),
  fix: () => { tone(523, .14, 'sine', .06); tone(784, .26, 'sine', .06, .1); },
  cash: () => { tone(880, .1, 'sine', .05); tone(1175, .2, 'sine', .05, .08); },
  send: () => tone(620, .07, 'sine', .04),
  lh: () => { tone(196, 1.4, 'sine', .08); tone(294, 1.4, 'sine', .05, .05); },
  close: () => [392, 494, 587, 784].forEach((f, i) => tone(f, .5, 'sine', .05, i * .14)),
  ready: () => tone(660, .1, 'sine', .03),
  req: () => { tone(740, .09, 'square', .025); tone(988, .12, 'square', .025, .09); },
  fast: () => { tone(784, .07, 'sine', .05); tone(1047, .07, 'sine', .05, .06); tone(1319, .12, 'sine', .05, .12); tone(2093, .35, 'sine', .018, .16); }, // a fast response: a rising chime with a shimmer on top
  lost: () => { tone(330, .12, 'triangle', .05); tone(247, .3, 'triangle', .05, .1); }, // a streak broken
  lanterns: (n, all) => { const P = [523, 587, 659, 784, 880]; for (let i = 0; i < n; i++) tone(P[i % 5] * (1 + Math.floor(i / 5)), .5, 'sine', .035, .3 + i * .14); if (all) [523, 659, 784, 1047].forEach((q, i) => tone(q, 1.2, 'sine', .04, .3 + n * .14 + .1 + i * .02)); }, // one bell per lantern, in time with the count
  grade: g => { const up = { A: [523, 659, 784, 1047, 1319], B: [523, 659, 784, 1047], C: [440, 523, 659], D: [330, 294, 247] }[g] || [440]; up.forEach((q, i) => tone(q, i === up.length - 1 ? .9 : .25, g === 'D' ? 'triangle' : 'sine', .05, .35 + i * .13)); },
};

