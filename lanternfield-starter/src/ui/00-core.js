const L = window.LF, { fmtClock, fmtMoney, clamp } = L;
function oops(where, e) {
  let b = document.getElementById('oops');
  if (!b) { b = document.createElement('div'); b.id = 'oops'; b.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#5a1410;color:#fff;border:2px solid #ff5d4a;border-radius:10px;padding:10px 12px;font:13px/1.4 monospace;white-space:pre-wrap;max-height:45vh;overflow:auto'; b.textContent = 'Lanternfield hit an error. Please send a screenshot of this box.\nBuild Decisions1 · ' + innerWidth + '×' + innerHeight + ' · dpr ' + devicePixelRatio + '\n'; document.body.appendChild(b); }
  if (b.textContent.length < 3000) b.textContent += '\n[' + where + '] ' + (e && (e.stack || e.message) || e);
}
window.addEventListener('error', ev => oops('window', ev.error || ev.message));
const KEY = 'keep-lanternfield-lit-v7', TPS = 2.5, W = 1000, H = 680, SPEEDS = [.5, 1, 2, 4]; // park minutes a real second at 1×, and the speeds on offer
const $ = id => document.getElementById(id);
const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TC = { mech: '#f08a5d', elec: '#f4d35e', ctrl: '#66d1c4', mach: '#c9a6ff', store: '#9db7ff', sup: '#f7edd8', temp: '#b9b9c9', eng: '#ff9ecb', mat: '#8fd3ff', hr: '#b6e388' };
const MGRDOES = {
  eng: 'Rides wear 25% slower. Overhauls cost $1,800 instead of $2,400. Every ride shows its chance of failing in the next hour.',
  mat: 'Standard orders cost 20% less. The express premium drops from 60% to 30%.',
  hr: 'Six applicants a night instead of three, half the hiring fee, training 30% cheaper, and morale holds up better.',
};
const MGRDEPT = { eng: 'Engineering', mat: 'Stores and purchasing', hr: 'People' };
const STAT = { ok: ['Running', 'ok'], degraded: ['Half speed', 'warn'], down: ['Closed', 'bad'], service: ['Being serviced', 'work'], nopower: ['No power', 'bad'], unstaffed: ['No operator', 'dim'], signoff: ['Fixed, waiting to reopen', 'warn'], restart: ['Restarting', 'work'], unchecked: ['Not checked yet', 'warn'], ready: ['Checked, gates shut', 'dim'] };
const SHIFTS = { early: 'Early 08:15 to 17', late: 'Late 14 to 22', full: 'Full day' };
/* motion: 'auto' follows the device's reduced-motion setting; 'reduce' and 'full' override it.
   Kept in its own localStorage key, never in the saved game. `reduce` is read live everywhere. */
const MOTION_KEY = 'kll-motion', MOTIONS = { auto: 'Auto', reduce: 'Reduced', full: 'Full' };
const motionMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let motion = 'auto', reduce = false;
try { const v = localStorage.getItem(MOTION_KEY); if (v in MOTIONS) motion = v; } catch (e) { /* storage blocked: stay on auto */ }
function applyMotion() {
  reduce = motion === 'reduce' || (motion === 'auto' && !!(motionMQ && motionMQ.matches));
  document.documentElement.classList.toggle('calm', reduce);
  document.documentElement.classList.toggle('fullmotion', motion === 'full');
}
function setMotion(v) { if (!(v in MOTIONS)) return; motion = v; try { localStorage.setItem(MOTION_KEY, v); } catch (e) { /* not remembered, still applied */ } applyMotion(); }
applyMotion();
if (motionMQ && motionMQ.addEventListener) motionMQ.addEventListener('change', applyMotion);
/* filled in by build.js: the version and a short hash of the sources (so a playtest record says which build it came
   from), and whether this is a playtest build (npm run package:itch) */
const BUILD = '__BUILD__', PLAYTEST = '__PLAYTEST__' === 'yes';
let S = null;
const ui = { pick: null, pickMe: null, seats: false, role: null, held: null, msgc: '', sel: null, units: [], box: null, touch: false, ai: 0, title: true, help: false, desk: null, tab: 'company', dept: 'ops', auto: false, pdown: false, reportAt: 0, tick: null, tickUntil: 0, lastFeed: 0, msg: '', msgUntil: 0, obj: null, log: false };
Object.defineProperty(ui, 'tech', { get() { return this.units[0] || null; }, set(v) { this.units = v ? [v] : []; } });
const selUnits = () => S.seat === 'tech' ? [L.me(S)].filter(c => c && c.on && ui.units.includes(c.id)) : ui.units.map(id => L.staff(S, id)).filter(c => c && c.role === 'tech' && c.on);
const pings = [];
const say = (r, c) => { if (r !== true && r) { ui.msg = r; ui.msgc = c || 'var(--ember)'; ui.msgUntil = performance.now() + 4500; } return r === true; };
const rk = t => t.temp ? 'temp' : L.roleKey(t);
const title = t => t.temp ? 'Contractor' : L.JOBTITLE[L.roleKey(t)];
const upcoming = () => S.closed ? S.day + 1 : S.day;

