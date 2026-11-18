/* Lanternfield engine. Pure state in, pure state out; no DOM. One step is one park minute. */
(function (G) {
'use strict';
const HZ = .6, OPEN = 540, CLOSE = 1320, LH = 1260, DAYS = 14, LIT_MIN = 45, SERVICE_WORK = 45, CASH0 = 20000, OVERHEAD = 7000;
const FAST = 8; // a fault answered within this many minutes is caught early: the job is a fifth smaller
// difficulty: how long the windows are and how much goes wrong. Standard is what the game was tuned on.
const DIFF = {
  relaxed: { name: 'Relaxed', fast: 14, gl: .6, esc: 10, hz: .85, resc: 40, txt: 'Longer windows to react, fewer glitches. For learning, or if real time is new to you.' },
  standard: { name: 'Standard', fast: FAST, gl: 1, esc: 0, hz: 1, resc: 30, txt: 'The game as designed: about three seconds to catch a fault at 1×.' },
  sharp: { name: 'Sharp', fast: 6, gl: 1.25, esc: -5, hz: 1.1, resc: 25, txt: 'Tighter windows, more glitches, less forgiving. For quick hands.' },
};
const D = s => DIFF[s.diff] || DIFF.standard, fastOf = s => D(s).fast;
function setDiff(s, k) { if (!DIFF[k] || s.reports.length || s.phase !== 'plan' || s.day !== 1) return false; s.diff = k; return true; }
const AGENCY = 1100, VOUCH = 300; // two agency technicians for three hours; goodwill vouchers for one closed ride
const TRADES = { mech: 'Mechanical', elec: 'Electrical', ctrl: 'Controls' };
const JOBTITLE = { mech: 'Mechanic', elec: 'Electrician', ctrl: 'Controls tech', mach: 'Machinist', store: 'Storeman', sup: 'Supervisor', eng: 'Engineering Manager', mat: 'Stores and Purchasing Manager', hr: 'HR Manager' };
const MGR = { eng: 320, mat: 280, hr: 260 };
const OFFICE = { x: 962, y: 618 };
const GRADE = ['', 'Apprentice', 'Tradesperson', 'Senior'];
const DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dow = d => DOW[(d - 1) % 7];
const SHIFT = { early: [540, 1020], late: [840, 1320], full: [540, 1320] };
const WAGE = [0, 110, 200, 300];
const YARD = { x: 872, y: 612 }, STORE = { x: 778, y: 612 }, SHOP = { x: 962, y: 528 }, GATE = { x: 500, y: 640 };
const NODES = { P: { x: 500, y: 418 }, W: { x: 285, y: 345 }, N: { x: 500, y: 180 }, E: { x: 745, y: 350 } };
// id, name, short, kind, x, y, substation, riders/min, $ per rider, wear %/hr, path node, trade mix
const DEFS = [
  ['tide',  'Tidebreaker',        'Tidebreaker',  'coaster',  115, 250, 'wsub', 8, .9, 3.2, 'W', { mech: .6, elec: .2, ctrl: .2 }],
  ['light', 'Lighthouse Drop',    'Lighthouse',   'tower',    235, 150, 'wsub', 6, .7, 2.7, 'W', { mech: .5, elec: .2, ctrl: .3 }],
  ['boats', 'Pier Bumper Boats',  'Bumper Boats', 'water',    150, 425, 'wsub', 5, .5, 2.3, 'W', { mech: .6, elec: .3, ctrl: .1 }],
  ['carou', 'Harbor Carousel',    'Carousel',     'carousel', 305, 500, 'wsub', 6, .4, 1.9, 'W', { mech: .5, elec: .4, ctrl: .1 }],
  ['arcade','Midway Arcade',      'Arcade',       'arcade',   392, 428, 'wsub', 7, .5, 1.9, 'P', { elec: .5, ctrl: .5 }],
  ['gond',  'Skyline Gondola',    'Gondola',      'gondola',  385, 95,  'wsub', 6, .5, 2.1, 'N', { mech: .6, ctrl: .3, elec: .1 }],
  ['wheel', 'Lantern Wheel',      'Lantern Wheel','wheel',    592, 292, 'esub', 7, .6, 2.1, 'P', { mech: .4, elec: .4, ctrl: .2 }],
  ['food',  'Grand Food Hall',    'Food Hall',    'food',     615, 448, 'esub', 6, .8, 2.0, 'P', { elec: .6, mech: .4 }],
  ['night', 'Nightjar Coaster',   'Nightjar',     'coaster',  640, 95,  'esub', 8, 1.0, 3.4, 'N', { mech: .6, elec: .2, ctrl: .2 }],
  ['flume', 'Rattlesnake Flume',  'Flume',        'water',    700, 228, 'esub', 6, .7, 2.6, 'E', { mech: .6, elec: .3, ctrl: .1 }],
  ['mine',  'Copper Canyon Mine Train', 'Mine Train', 'coaster', 880, 215, 'esub', 8, .8, 3.0, 'E', { mech: .6, elec: .2, ctrl: .2 }],
  ['play',  'Frontier Playhouse', 'Playhouse',    'theater',  800, 468, 'esub', 5, .5, 1.6, 'E', { ctrl: .6, elec: .4 }],
  ['wsub',  'West Substation',    'West Power',   'power',    140, 585, null,   0, 0,  1.3, null, { elec: .8, ctrl: .2 }],
  ['esub',  'East Substation',    'East Power',   'power',    925, 385, null,   0, 0,  1.3, null, { elec: .8, ctrl: .2 }],
];
const N_RIDES = DEFS.filter(d => d[6]).length;
const MOVING = ['coaster', 'tower', 'water', 'carousel', 'gondola', 'wheel'];
// stock items: name, trade, list price, machinist minutes to fabricate (0 = cannot be made in house), where it is used
const SKU = {
  kit:       ['Service kit',       null,   110, 0,   'One per planned service, any ride'],
  bearing:   ['Bearing set',       'mech', 190, 70,  'Anything that turns, kitchen fans'],
  tyres:     ['Drive tyres',       'mech', 420, 0,   'Coasters, water rides, gondola, carousel'],
  chain:     ['Lift chain links',  'mech', 260, 60,  'Coasters and water rides'],
  brake:     ['Brake fin set',     'mech', 880, 140, 'Coasters and the drop tower'],
  seal:      ['Seal kit',          'mech', 150, 0,   'Gearboxes on every moving ride'],
  contactor: ['Motor contactor',   'elec', 140, 0,   'Every ride and venue'],
  inverter:  ['Drive inverter',    'elec', 1450, 0,  'Every moving ride'],
  breaker:   ['Breaker trip unit', 'elec', 520, 0,   'Substations, Food Hall, Arcade, Playhouse'],
  sensor:    ['Proximity sensor',  'ctrl', 95, 0,    'Every moving ride'],
  relay:     ['Safety relay',      'ctrl', 330, 0,   'E-stop circuits, substations'],
  iocard:    ['PLC I/O card',      'ctrl', 640, 0,   'Coasters, wheel, Arcade, Playhouse'],
};
const STOCK0 = { kit: 3, bearing: 1, tyres: 1, chain: 0, brake: 0, seal: 1, contactor: 1, inverter: 0, breaker: 1, sensor: 2, relay: 0, iocard: 0 };
const FAULTS = [
  ['Drive tyres delaminating', 'mech', 'tyres', ['coaster', 'water', 'gondola', 'carousel'], 'The train judders over the flat sections and the drive wheels smell of hot rubber.'],
  ['Lift chain running slack', 'mech', 'chain', ['coaster', 'water'], 'Cars stall halfway up the lift hill and something clanks loudly under the track.'],
  ['Bearing noise in the wheel assembly', 'mech', 'bearing', MOVING, 'A grinding noise rises every revolution and the housing is too hot to touch.'],
  ['Gearbox oil leak', 'mech', 'seal', MOVING, 'There is a pool of oil under the drive and the gearbox temperature alarm keeps flashing.'],
  ['Brake fin worn past its limit', 'mech', 'brake', ['coaster', 'tower'], 'Trains come into the station too fast and the brakes squeal.'],
  ['Lap bar latch out of adjustment', 'mech', null, ['coaster', 'tower', 'wheel'], 'One lap bar will not show as locked on the panel, so the ride will not dispatch.'],
  ['Extraction fan seized', 'mech', 'bearing', ['food'], 'The kitchen hood alarm is on, smoke is building up and the fan motor hums without turning.'],
  ['Motor overload trip', 'elec', 'contactor', MOVING.concat(['arcade', 'food', 'theater']), 'The drive cuts out under load and an overload has tripped in the panel.'],
  ['Drive inverter fault', 'elec', 'inverter', MOVING, 'The drive display shows a fault code and the motor will not ramp up.'],
  ['Lighting circuit fault', 'elec', null, MOVING.concat(['arcade', 'food', 'theater']), 'Half the lights are out and the circuit breaker trips again as soon as it is reset.'],
  ['Feeder breaker tripped', 'elec', 'breaker', ['power', 'food', 'arcade', 'theater'], 'Power is off to the whole building and the main breaker will not stay in.'],
  ['Transformer running hot', 'elec', null, ['power'], 'The transformer temperature alarm is on and its cooling fans are running flat out.'],
  ['Block zone sensor fault', 'ctrl', 'sensor', ['coaster', 'water', 'gondola'], 'The control system has stopped the trains and says an empty block zone is occupied.'],
  ['Station sensor misreading', 'ctrl', 'sensor', MOVING, 'The ride stops at random and the panel shows the train in the wrong place.'],
  ['E-stop circuit fault', 'ctrl', 'relay', MOVING.concat(['theater']), 'The emergency stop keeps tripping although nobody has pressed a button.'],
  ['Controller stuck in a crash loop', 'ctrl', 'iocard', ['arcade', 'theater', 'coaster', 'wheel'], 'The control screen keeps rebooting and the ride never gets past its start-up checks.'],
  ['Protection relay fault', 'ctrl', 'relay', ['power'], 'Substation protection keeps tripping with no fault on the line.'],
];
// glitches: small, frequent, no part and no diagnosis, but they get worse quickly if nobody comes
// glitches: small, frequent, no part and no diagnosis. Three behaviours:
//   reset: a few minutes' work, but it gets worse after 15 minutes
//   std: a quarter of an hour's work, gets worse after 25 minutes
//   flicker: comes and goes. Leave it 20 minutes and it clears itself, but the ride takes a knock and fails properly within the hour unless it is serviced
const GLITCH = {
  mech: [['Ticket gate jammed', 'reset'], ['Queue gate latch broken', 'reset'], ['A restraint is sticking on one car', 'std'], ['Platform gate sticking', 'std'], ['A drive belt squealing on and off', 'flicker'], ['A loose panel rattling on the cars', 'flicker']],
  elec: [['Card readers offline', 'reset'], ['PA speakers crackling', 'reset'], ['Queue screens dead', 'std'], ['Ride lights half out', 'std'], ['Station lights flickering', 'flicker'], ['A breaker tripping now and then', 'flicker']],
  ctrl: [['Dispatch button not responding', 'reset'], ['Ride clock out of sync', 'reset'], ['Rider counter stuck', 'std'], ['Touchscreen frozen', 'std'], ['Panel showing a phantom alarm', 'flicker'], ['A seat sensor misreading now and then', 'flicker']],
};
const GKIND = { reset: ['Quick reset', [6, 10], 15], std: ['Glitch', [12, 20], 25], flicker: ['Comes and goes', [12, 18], 20] };
const GLITCH_RATE = .0011, GLITCH_ESC = 25;
const TEAM0 = [
  ['Mei', 'tech', { mech: 3 }, 'early'], ['Liam', 'tech', { mech: 1 }, 'late'],
  ['Zara', 'tech', { elec: 2 }, 'early'], ['Marcus', 'tech', { ctrl: 2 }, 'late'], ['Rosa', 'store', null, 'early'], ['Grace', 'sup', null, 'early'],
];
const NAMES = ['Kenji', 'Bea', 'Omar', 'Jun', 'Aisha', 'Nadia', 'Theo', 'Ivy', 'Felix', 'Priya', 'Jonah', 'Lucia', 'Owen', 'Hana', 'Dev', 'Sofia', 'Tomás', 'Amir', 'Chloe', 'Ravi', 'Lena', 'Kofi', 'Wren'];
const RATE = [0, .55, .9, 1.25];
const ATT = [[540, .35], [600, .6], [720, 1], [960, 1], [1080, .8], [1170, .92], [1260, .95], [1320, .8]];
const PERKS = {
  supplier: ['Supplier framework deal', 'Standard orders cost 15% less.', 1500],
  courier:  ['Courier account', 'Express orders land in 60 minutes instead of 90, with no call-out fee.', 1200],
  carts:    ['Golf carts', 'Crew and storeman cross the park 60% faster.', 2200],
  tools:    ['Better toolkits', 'Every repair, service and fabrication goes 20% faster.', 2800],
  sensors:  ['Condition monitoring', 'Rides warn about 40 minutes before they fail, so a service can prevent it.', 3000],
  genny:    ['Backup generator', 'When a substation fails, its rides keep running for 90 minutes.', 2600],
  shade:    ['Queue shade and buskers', 'Guests wait 60% longer before a queue hurts the glow.', 1600],
  nightc:   ['Night contractor', 'Every ride recovers 22 health overnight instead of 8.', 3200],
};
/* the chain of command you can sit in. Each seat can spend up to its limit; above that it has to ask. */
const LV = ['tech', 'sup', 'mgr', 'dir', 'ceo'];
const SAVE_V = 8; // the saved game's version: bump it when the saved state changes, and teach migrate() the step up
function migrate(s) { // an older save brought up to date; anything new starts empty
  if (!s || typeof s !== 'object' || !s.sc) return s;
  if (s.v !== 7 && s.v !== 8) return s;
  for (const x of LV) { const c = s.sc[x]; if (c) Object.assign(c, { missW: c.missW != null ? c.missW : c.missed || 0, run: c.run || 0, mrun: c.mrun || 0, bonus: c.bonus || 0, esc: c.esc || 0 }); }
  Object.assign(s, { big: s.big || [], boardQ: s.boardQ || [], bigN: s.bigN || 0, bigDay: s.bigDay != null ? s.bigDay : -9 });
  for (const r of s.rides || []) Object.assign(r, { pc: r.pc || 0, mf: r.mf || 0, cf: r.cf || 0, hzm: r.hzm || 1, so: r.so || null, restart: r.restart || 0, gb: r.gb || 0 });
  s.v = 8; return s;
}
const RANK = { tech: 0, sup: 1, mgr: 2, dir: 3, ceo: 4 };
const LIMIT = { tech: 0, sup: 300, mgr: 1500, dir: 5000, ceo: 20000 }; // above the chief executive's limit, only the board can say yes
const band = c => c <= LIMIT.sup ? 'sup' : c <= LIMIT.mgr ? 'mgr' : c <= LIMIT.dir ? 'dir' : c <= LIMIT.ceo ? 'ceo' : 'board';
const SEATNAME = { tech: 'Technician', sup: 'Maintenance Supervisor', mgr: 'Engineering Manager', dir: 'Operations Director', ceo: 'Chief Executive', board: 'The board' };
const BOSS = { tech: 'sup', sup: 'mgr', mgr: 'dir', dir: 'ceo', ceo: 'board' };
const COST = { callout: 600, cross: 900, advert: 150, meal: 300, advance: 8000 };
const MEMOS = {
  up: 'Keep uptime at 85% or better today.', lit: 'I want at least ten lanterns up tonight.', net: 'Finish the day in profit.',
  nopatch: 'No patched rides today. Do the job properly.', vip: 'The VIP party must not be let down.',
};

/* helpers */
function rnd(s) { let t = (s.seed = (s.seed + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const R = (s, a, b) => a + (b - a) * rnd(s);
const RI = (s, a, b) => Math.floor(R(s, a, b + 1));
const chance = (s, p) => rnd(s) < p;
const pick = (s, arr) => arr[Math.floor(rnd(s) * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ride = (s, id) => s.rides.find(r => r.id === id);
const staff = (s, id) => s.crew.find(t => t.id === id);
const primary = r => Object.entries(r.mix).sort((a, b) => b[1] - a[1])[0][0];
const need = j => j.type === 'fault' && j.mode === 'patch' ? j.work * 0.4 : j.work;
const speed = s => 30 * s.mult.speed;
const moraleMult = t => t.temp ? 1 : .8 + .3 * t.morale / 100;
const enOf = t => t.en == null ? 100 : t.en;
const enMult = t => t.temp || t.agency ? 1 : .5 + .5 * clamp(enOf(t) / 60, 0, 1); // energy above 60 costs nothing; an exhausted tech works at half speed
const rate = (s, t, tr) => RATE[t.skills[tr] || 0] * (t.tired ? .85 : 1) * moraleMult(t) * s.mult.work * s.m.work * (t.push > s.clock ? 1.6 : 1) * enMult(t) * (t.pace > s.clock ? 1.25 : 1);
const topSkill = t => Object.entries(t.skills).sort((a, b) => b[1] - a[1])[0];
const roleKey = t => t.role === 'tech' ? topSkill(t)[0] : t.role;
const isMgr = t => !!MGR[t.role];
function baseWage(t) { if (MGR[t.role]) return MGR[t.role]; if (t.role === 'store') return 150; if (t.role === 'sup') return 340; if (t.role === 'mach') return WAGE[t.grade] + 10; const g = Object.values(t.skills).sort((a, b) => b - a); return WAGE[g[0]] + (g.length - 1) * 50; }
const wage = t => Math.round(baseWage(t) * (t.raise || 1));
const otCost = t => Math.round(wage(t) * .94);
const onShift = (t, c) => t.temp ? c >= t.arrive : t.agency ? c >= t.inAt && c < t.agency : t.sick ? false : isMgr(t) ? c >= OPEN && c < CLOSE : (!t.inAt || c >= t.inAt) && c >= SHIFT[t.shift][0] && c < SHIFT[t.shift][1];
const has = (s, role) => s.crew.some(t => t.role === role);
const onNow = (s, role) => s.crew.some(t => t.role === role && t.on);
function attendance(c) { for (let i = 1; i < ATT.length; i++) if (c <= ATT[i][0]) { const [c0, v0] = ATT[i - 1], [c1, v1] = ATT[i]; return v0 + (v1 - v0) * Math.max(0, c - c0) / (c1 - c0); } return ATT[ATT.length - 1][1]; }
function fmtClock(c) { return String(Math.floor(c / 60)).padStart(2, '0') + ':' + String(Math.floor(c % 60)).padStart(2, '0'); }
function fmtMoney(n) { n = Math.round(n); const a = Math.abs(n), sg = n < 0 ? '−' : ''; return sg + '$' + (a >= 100000 ? (a / 1000).toFixed(0) + 'k' : a.toLocaleString('en-US')); }
function log(s, txt, k) { s.seq++; s.feed.unshift({ id: s.seq, c: s.clock, txt, k: k || 'info' }); if (s.feed.length > 40) s.feed.length = 40; }
function fx(s, k, id, txt) { s.fx.push({ k, id, txt }); }
function spend(s, cat, amt) { s.cash -= amt; (s.phase === 'day' ? s.d : s.pre)[cat] += amt; }
const ledger = () => ({ income: 0, flat: 0, bonus: 0, wages: 0, salaries: 0, overhead: 0, ot: 0, parts: 0, contract: 0, people: 0, capex: 0 });


/* ---------- the company: departments and every position you can fill ---------- */
const DEPTS = {
  gov: 'Executive office', fin: 'Finance and accounting', hr: 'Human resources', ops: 'Operations', eng: 'Engineering and maintenance',
  sup: 'Supply chain and stores', qhse: 'Quality, safety and environment', sales: 'Sales', mkt: 'Marketing and communications',
  cs: 'Customer service', it: 'Information technology', legal: 'Legal and risk', rnd: 'Research and development', adm: 'Administration and facilities', pm: 'Project office',
};
// which executive each department answers to
const EXEC = { coo: ['ops', 'eng', 'sup'], cfo: ['fin'], cto: ['it', 'rnd'], chro: ['hr'], cmo: ['mkt'], cco: ['sales', 'cs'], gc: ['legal'], cro: ['qhse'] };
// id, title, department, level (x executive, d director, m manager, s supervisor, w staff, j junior), wage a day, most you can employ, effects per person
const ORG = [
  ['pres', 'President and Deputy CEO', 'gov', 'x', 560, 1, { conf: 1 }, 'Every department works 5% better.'],
  ['coo', 'Chief Operating Officer', 'gov', 'x', 520, 1, {}, 'Operations, Engineering and Supply chain work 20% better.'],
  ['cfo', 'Chief Financial Officer', 'gov', 'x', 520, 1, {}, 'Finance works 20% better.'],
  ['cto', 'Chief Technology and Information Officer', 'gov', 'x', 480, 1, {}, 'IT and R&D work 20% better.'],
  ['chro', 'Chief Human Resources Officer', 'gov', 'x', 440, 1, {}, 'Human resources works 20% better.'],
  ['cmo', 'Chief Marketing Officer', 'gov', 'x', 460, 1, {}, 'Marketing works 20% better.'],
  ['cco', 'Chief Commercial Officer', 'gov', 'x', 480, 1, {}, 'Sales and Customer service work 20% better.'],
  ['gc', 'General Counsel', 'gov', 'x', 460, 1, {}, 'Legal and risk works 20% better.'],
  ['cro', 'Chief Risk and Compliance Officer', 'gov', 'x', 440, 1, {}, 'Quality, safety and environment works 20% better.'],
  ['ciso', 'Chief Information Security Officer', 'gov', 'x', 420, 1, { pCyber: -.6 }],
  ['cosec', 'Company Secretary', 'gov', 'w', 260, 1, { conf: 1 }],
  ['ea', 'Executive Assistant', 'gov', 'w', 150, 1, { conf: .5 }],
  ['asst', 'Assistant Manager', 'gov', 's', 160, 3, { overhead: -.01, work: .01 }],
  ['intern', 'Intern or Trainee', 'gov', 'j', 50, 6, { overhead: -.004 }],

  ['fc', 'Financial Controller', 'fin', 'd', 380, 1, {}], ['finmgr', 'Finance Manager', 'fin', 'm', 300, 1, {}],
  ['treas', 'Treasurer', 'fin', 'w', 280, 1, { yield: .003 }],
  ['acct', 'Accountant', 'fin', 'w', 190, 2, { overhead: -.04 }],
  ['macct', 'Management Accountant', 'fin', 'w', 210, 1, { overhead: -.03, capex: -.05 }],
  ['fanal', 'Financial Analyst', 'fin', 'w', 200, 1, { spend: .02 }],
  ['apc', 'Accounts Payable Clerk', 'fin', 'w', 120, 1, { parts: -.03 }],
  ['arc', 'Accounts Receivable Clerk', 'fin', 'w', 120, 1, { flat: 150 }],
  ['payroll', 'Payroll Officer', 'fin', 'w', 140, 1, { morale: 1 }],
  ['credit', 'Credit Controller', 'fin', 'w', 170, 1, { flat: 250 }],
  ['audit', 'Internal Auditor', 'fin', 'w', 220, 1, { leak: -.35 }],
  ['tax', 'Tax Specialist', 'fin', 'w', 230, 1, { tax: -.4 }],

  ['hrdir', 'HR Director', 'hr', 'd', 360, 1, {}],
  ['hrbp', 'HR Business Partner', 'hr', 'w', 220, 1, { morale: 1.5 }],
  ['recruit', 'Recruiter', 'hr', 'w', 170, 1, { fee: -.5 }],
  ['trainer', 'Training and Development Officer', 'hr', 'w', 190, 1, { train: -.3, work: .03 }],
  ['comp', 'Compensation and Benefits Specialist', 'hr', 'w', 200, 1, { morale: 1.5 }],
  ['er', 'Employee Relations Officer', 'hr', 'w', 190, 1, { morale: 1, pLegal: -.2 }],
  ['hradmin', 'HR Administrator', 'hr', 'w', 110, 1, { fee: -.15 }],

  ['opsdir', 'Operations Director', 'ops', 'd', 380, 1, {}], ['opsmgr', 'Operations Manager', 'ops', 'm', 300, 1, {}],
  ['planner', 'Production Planner and Scheduler', 'ops', 'w', 190, 1, { cap: .05 }],
  ['shiftsup', 'Shift Supervisor', 'ops', 's', 200, 2, { cap: .04 }],
  ['lead', 'Line Leader', 'ops', 's', 150, 3, { cap: .02 }],
  ['operator', 'Ride Operator', 'ops', 'w', 110, 8, {}, 'Each one keeps two rides open. A ride with no operator stays shut.'],
  ['attendant', 'Ride Attendant', 'ops', 'w', 80, 6, { cap: .015, glow: .5 }],
  ['indeng', 'Process and Industrial Engineer', 'ops', 'w', 240, 1, { cap: .06, wear: -.04 }],

  ['engdir', 'Engineering Director', 'eng', 'd', 400, 1, {}],
  ['mplanner', 'Maintenance Planner', 'eng', 'w', 210, 1, { work: .06 }],
  ['releng', 'Reliability Engineer', 'eng', 'w', 250, 1, { hazard: -.12 }],
  ['mecheng', 'Mechanical Engineer', 'eng', 'w', 240, 1, { wear: -.05 }],
  ['eleceng', 'Electrical Engineer', 'eng', 'w', 240, 1, { wear: -.04, hazard: -.03 }],
  ['ctrleng', 'Controls Engineer', 'eng', 'w', 240, 1, { hazard: -.06 }],
  ['projeng', 'Project Engineer', 'eng', 'w', 240, 1, { capex: -.08 }],
  ['welder', 'Welder and Fabricator', 'eng', 'w', 160, 1, { fab: .4 }],

  ['scdir', 'Supply Chain Director', 'sup', 'd', 380, 1, {}],
  ['whmgr', 'Warehouse Manager', 'sup', 'w', 260, 1, { exp: -.15 }],
  ['buyer', 'Buyer', 'sup', 'w', 180, 2, { parts: -.05 }],
  ['invc', 'Inventory Controller', 'sup', 'w', 180, 1, { parts: -.06 }],
  ['matplan', 'Materials Planner', 'sup', 'w', 180, 1, { parts: -.03, work: .02 }],
  ['storesup', 'Store Supervisor', 'sup', 's', 180, 1, { exp: -.08 }],
  ['logi', 'Logistics Coordinator', 'sup', 'w', 170, 1, { expTime: -15 }],
  ['dispatch', 'Dispatcher', 'sup', 'w', 140, 1, { expTime: -10 }],
  ['forklift', 'Forklift Driver', 'sup', 'w', 110, 1, { expTime: -10 }],
  ['driver', 'Driver', 'sup', 'w', 110, 1, { exp: -.1 }],

  ['qhsedir', 'Head of Quality, Safety and Environment', 'qhse', 'd', 360, 1, {}],
  ['qmgr', 'Quality Manager', 'qhse', 'm', 300, 1, {}], ['hsemgr', 'Health and Safety Manager', 'qhse', 'm', 300, 1, { pSafety: -.2 }],
  ['qa', 'Quality Assurance Inspector', 'qhse', 'w', 170, 1, { hazard: -.06 }],
  ['qc', 'Quality Control Inspector', 'qhse', 'w', 160, 1, { hazard: -.05 }],
  ['safety', 'Safety Officer', 'qhse', 'w', 190, 2, { pSafety: -.3 }],
  ['envo', 'Environmental Officer', 'qhse', 'w', 180, 1, { pEnv: -.8 }],
  ['compl', 'Compliance Officer', 'qhse', 'w', 200, 1, { fine: -.4 }],

  ['salesdir', 'Sales Director', 'sales', 'd', 380, 1, {}], ['salesmgr', 'Sales Manager', 'sales', 'm', 300, 1, {}],
  ['acctmgr', 'Account Manager', 'sales', 'w', 200, 2, { flat: 350 }],
  ['salesrep', 'Sales Executive', 'sales', 'w', 150, 4, { crowd: .02 }],
  ['bizdev', 'Business Development Manager', 'sales', 'w', 260, 1, { flat: 600 }],

  ['mktdir', 'Head of Marketing', 'mkt', 'd', 360, 1, {}], ['mktmgr', 'Marketing Manager', 'mkt', 'm', 300, 1, {}],
  ['brand', 'Brand Manager', 'mkt', 'w', 230, 1, { crowd: .04 }],
  ['product', 'Product Manager', 'mkt', 'w', 240, 1, { spend: .05 }],
  ['digital', 'Digital Marketer', 'mkt', 'w', 170, 2, { crowd: .03 }],
  ['writer', 'Content Writer', 'mkt', 'w', 130, 1, { crowd: .015 }],
  ['designer', 'Graphic Designer', 'mkt', 'w', 150, 1, { crowd: .015 }],
  ['research', 'Market Researcher', 'mkt', 'w', 170, 1, { spend: .03 }],
  ['pr', 'Public Relations Officer', 'mkt', 'w', 190, 1, { conf: .5, crowd: .02 }],

  ['csmgr', 'Customer Service Manager', 'cs', 'm', 280, 1, {}],
  ['cslead', 'Customer Service Team Leader', 'cs', 's', 180, 1, { pen: -.05 }],
  ['csrep', 'Customer Service Representative', 'cs', 'w', 100, 4, { pen: -.04 }],
  ['call', 'Call Centre Agent', 'cs', 'w', 90, 2, { flat: 120 }],
  ['tsupport', 'Technical Support Specialist', 'cs', 'w', 150, 1, { pIT: -.15 }],

  ['itmgr', 'IT Manager', 'it', 'm', 300, 1, {}],
  ['sysadmin', 'Systems Administrator', 'it', 'w', 210, 1, { pIT: -.35 }],
  ['neteng', 'Network Engineer', 'it', 'w', 210, 1, { pIT: -.3 }],
  ['dev', 'Software Developer', 'it', 'w', 240, 2, { spend: .03 }],
  ['dba', 'Database Administrator', 'it', 'w', 200, 1, { pIT: -.15 }],
  ['danalyst', 'Data Analyst', 'it', 'w', 200, 1, { crowd: .02, spend: .02 }],
  ['cyber', 'Cybersecurity Analyst', 'it', 'w', 220, 1, { pCyber: -.5 }],
  ['helpdesk', 'IT Support Technician', 'it', 'w', 120, 1, { work: .02 }],

  ['counsel', 'Legal Counsel', 'legal', 'm', 300, 1, { fine: -.3 }],
  ['contracts', 'Contracts Manager', 'legal', 'w', 240, 1, { contractor: -.25, parts: -.03 }],
  ['paralegal', 'Paralegal', 'legal', 'w', 140, 1, { pLegal: -.4 }],
  ['risk', 'Risk Manager', 'legal', 'w', 240, 1, { ins: .5 }],

  ['rndmgr', 'R&D Manager', 'rnd', 'm', 320, 1, {}],
  ['scientist', 'Research Scientist', 'rnd', 'w', 240, 2, { rnd: 10 }],
  ['deseng', 'Design Engineer', 'rnd', 'w', 230, 2, { rnd: 8 }],
  ['labtech', 'Lab Technician', 'rnd', 'w', 140, 2, { rnd: 4 }],

  ['officemgr', 'Office Manager', 'adm', 'm', 220, 1, { overhead: -.03 }],
  ['facmgr', 'Facilities Manager', 'adm', 'w', 260, 1, { overhead: -.05 }],
  ['pa', 'Personal Assistant', 'adm', 'w', 130, 1, { conf: .3 }],
  ['admin', 'Administrator', 'adm', 'w', 110, 2, { overhead: -.015 }],
  ['clerk', 'Clerk', 'adm', 'w', 90, 2, { overhead: -.01 }],
  ['recep', 'Receptionist', 'adm', 'w', 100, 1, { glow: 1 }],
  ['guard', 'Security Guard', 'adm', 'w', 100, 4, { leak: -.2 }],
  ['cleaner', 'Cleaner', 'adm', 'w', 85, 6, { glow: 1.5 }],

  ['progmgr', 'Programme Manager', 'pm', 'd', 320, 1, {}], ['projmgr', 'Project Manager', 'pm', 'm', 260, 1, { capex: -.1 }],
  ['projco', 'Project Coordinator', 'pm', 'w', 150, 1, { capex: -.05 }],
];
const ORGX = {}; for (const p of ORG) ORGX[p[0]] = p;
const ADDKEYS = { flat: 1, glow: 1, rnd: 1, conf: 1, morale: 1, ins: 1, expTime: 1, yield: 1 };
const NAMEDMGR = { eng: 'eng', sup: 'mat', hr: 'hr' };
// work out what the whole organisation is doing for you right now
function mods(s) {
  const m = { crowd: 1, spend: 1, cap: 1, pen: 1, wear: 1, hazard: 1, work: 1, parts: 1, exp: 1, overhead: 1, leak: 1, fee: 1, train: 1, capex: 1, contractor: 1, fine: 1, pIT: 1, pCyber: 1, pEnv: 1, pSafety: 1, pLegal: 1, tax: 1, fab: 1, flat: 0, glow: -6, rnd: 0, conf: 0, morale: 0, ins: 0, expTime: 0, yield: 0, eff: {} };
  const n = id => s.org[id] || 0, mm = (.85 + .3 * s.cm / 100) * (s.cm < 20 ? .5 : 1);
  for (const d in DEPTS) {
    const pos = ORG.filter(p => p[2] === d), hasDirPos = pos.some(p => p[3] === 'd');
    const mgr = pos.some(p => p[3] === 'm' && n(p[0])) || (NAMEDMGR[d] && has(s, NAMEDMGR[d])), dir = pos.some(p => p[3] === 'd' && n(p[0]));
    let e = d === 'gov' ? 1 : hasDirPos ? .6 + (mgr ? .2 : 0) + (dir ? .2 : 0) : .6 + (mgr ? .4 : 0);
    for (const x in EXEC) if (EXEC[x].includes(d) && n(x)) e *= 1.2;
    if (n('pres')) e *= 1.05;
    m.eff[d] = e * mm;
  }
  for (const p of ORG) {
    const c = n(p[0]); if (!c) continue;
    for (const k in p[6]) { const v = p[6][k] * m.eff[p[2]]; if (ADDKEYS[k]) m[k] += v * c; else m[k] *= Math.pow(Math.max(.05, 1 + v), c); }
  }
  m.spend *= 1 + .02 * s.enh; m.ins = clamp(m.ins, 0, 1); if (s.spons) m.glow -= 2;
  if (s.strategy === 'uptime') m.spend *= 1.03; else if (s.strategy === 'cost') m.overhead *= .95; else if (s.strategy === 'safety') m.fine *= .6;
  const sf = s.sf || {}; if (sf.supplier) { m.parts *= .85; m.expTime += 30; } if (sf.quiet) m.glow -= 1.5; if (sf.price === 'up') { m.spend *= 1.08; m.glow -= 2; } else if (sf.price === 'down') { m.spend *= .96; m.glow += 2; }
  s.m = m;
  const n2 = n('operator') * 2;
  s.staffed = s.rides.filter(r => r.sub).sort((a, b) => b.w - a.w).slice(0, n2).map(r => r.id);
  return m;
}
const orgWages = s => ORG.reduce((t, p) => t + (s.org[p[0]] || 0) * p[4], 0);
const headcount = s => ORG.reduce((t, p) => t + (s.org[p[0]] || 0), 0) + s.crew.filter(t => !t.temp).length;
const orgFee = s => Math.round(150 * s.m.fee);
function hireOrg(s, id) { const p = ORGX[id]; if (!p || !planning(s) || (s.org[id] || 0) >= p[5] || s.cash < orgFee(s)) return false; spend(s, 'people', orgFee(s)); s.org[id] = (s.org[id] || 0) + 1; mods(s); return true; }
function fireOrg(s, id) { if (!ORGX[id] || !planning(s) || !(s.org[id] > 0)) return false; s.org[id]--; s.cm = clamp(s.cm - 3, 0, 100); mods(s); return true; }

function subDown(s, sb) { const j = sb.job; return !!sb.so || !!(j && j.type === 'fault' && j.sev === 'major' && !(s.up.genny && s.clock < j.t0 + 90)); }
function status(s, r) {
  if (r.sub && subDown(s, ride(s, r.sub))) return 'nopower';
  if (r.so) return 'signoff';
  if (r.restart > s.clock) return 'restart';
  const j = r.job;
  if (j) { if (j.type === 'fault') return j.sev === 'major' ? 'down' : 'degraded'; if (j.started) return 'service'; }
  if (r.sub && !s.staffed.includes(r.id)) return 'unstaffed';
  return 'ok';
}
const AV = { ok: 1, degraded: .5, down: 0, service: 0, nopower: 0, unstaffed: 0, signoff: 0, restart: 0 };

/* world */
function mkStaff(s, name, role, skills, shift, grade) {
  const i = s.nextT++, a = i * 2.3;
  return { id: 't' + i, name, role, skills: skills || {}, grade: grade || 2, shift: shift || 'early', on: false, x: YARD.x, y: YARD.y, ox: Math.round(Math.cos(a) * 30), oy: Math.round(Math.sin(a) * 26), state: 'home', target: null, fetch: false, carry: false, dest: null, post: null, sprint: 0, push: 0, cdS: 0, cdP: 0, lk: null, en: 100, brk: false, talk: 0, wake: 0, inAt: 0, stall: 0, hurt: 0, jobs: 0, xp: 0, day: 0, tired: false, worked: false, morale: 70, raise: 1, raises: 0, sick: false };
}
function place(t) { t.x = YARD.x + t.ox * .7; t.y = YARD.y - 30 + t.oy * .5; if (t.role === 'store') { t.x = STORE.x; t.y = STORE.y; } if (t.role === 'mach') { t.x = SHOP.x; t.y = SHOP.y; } if (isMgr(t)) { t.x = OFFICE.x + ({ eng: -18, mat: 0, hr: 18 })[t.role]; t.y = OFFICE.y; } }
// what each seat is judged on, counted only while you sit in it
const mkSc = () => ({
  tech: { op: 0, tac: 0, str: 0, al: 0, mis: 0, brief: 0, off: 0, min: 0, days: 0, asked: 0, onTime: 0, missed: 0, missW: 0, run: 0, mrun: 0, bonus: 0, esc: 0, over: 0, jobs: 0, dx: 0, ftf: 0, lock: 0, skip: 0, hurt: 0, wo: 0, woOk: 0, woLate: 0, reports: 0, asks: 0 },
  sup: { op: 0, tac: 0, str: 0, al: 0, mis: 0, brief: 0, off: 0, min: 0, days: 0, asked: 0, onTime: 0, missed: 0, missW: 0, run: 0, mrun: 0, bonus: 0, esc: 0, over: 0, disp: 0, resp: 0, respN: 0, quick: 0, rescued: 0, stuck: 0, upSum: 0, asks: 0 },
  mgr: { op: 0, tac: 0, str: 0, al: 0, mis: 0, brief: 0, off: 0, min: 0, days: 0, asked: 0, onTime: 0, missed: 0, missW: 0, run: 0, mrun: 0, bonus: 0, esc: 0, over: 0, budOk: 0, upSum: 0, moraleSum: 0, oneone: 0, asks: 0 },
  dir: { op: 0, tac: 0, str: 0, al: 0, mis: 0, brief: 0, off: 0, min: 0, days: 0, asked: 0, onTime: 0, missed: 0, missW: 0, run: 0, mrun: 0, bonus: 0, esc: 0, over: 0, budOk: 0, upSum: 0, asks: 0 },
  ceo: { op: 0, tac: 0, str: 0, al: 0, mis: 0, brief: 0, off: 0, min: 0, days: 0, asked: 0, onTime: 0, missed: 0, missW: 0, run: 0, mrun: 0, bonus: 0, esc: 0, over: 0, netSum: 0, conf0: -1, upSum: 0, asks: 0 },
});
function newGame(seed) {
  const s = {
    v: SAVE_V, strategy: 'uptime', comp: 20, cdT: 0, later: [], sf: {}, sq: {}, seat: 'sup', me: null, inbox: [], asks: [], rq: 0, sc: mkSc(), budget: 3500, focus: 'uptime', freeze: 0, cool: false, cdW: 0, cdq: {}, spons: 0, aiMin: false, prio: null, talk: null, away: 0, cdV: 0, diff: 'standard', rk: {}, hh: 0,
    streak: 0, best: 0, cdC: 0, waves: [], seed: (seed >>> 0) || 7, day: 1, clock: OPEN, phase: 'plan', closed: false, paused: true, speed: 1,
    cash: CASH0, glow: 80, crowd: 1, heat: false, att: .35, total: 0, seq: 0, nextT: 1,
    rides: [], crew: [], events: [], feed: [], fx: [], reports: [], forecast: null, cands: [], final: null,
    stock: Object.assign({}, STOCK0), min: {}, inbound: [], fab: [], used: {},
    up: {}, mult: { speed: 1, work: 1 }, qtol: 20, d: ledger(), pre: ledger(),
    pol: { auto: true, nopart: 'express', pm: 55 }, safety: { tags: 0, patches: 0, inj: 0 },
    conf: 60, confMult: 1, adv: 0, meal: false, fired: false,
    big: [], boardQ: [], bigN: 0, bigDay: -9,
    org: { operator: 6, cleaner: 2 }, cm: 65, rnd: 0, enh: 0, m: null, staffed: [], itOut: false, consult: 0,
  };
  for (const k in SKU) { s.min[k] = 0; s.used[k] = 0; }
  const wsum = DEFS.reduce((t, d) => t + d[7] * d[8], 0);
  for (const [id, name, short, kind, x, y, sub, cap, fare, wear, via, mix] of DEFS)
    s.rides.push({ id, name, short, kind, x, y, sub, cap, fare, wear, via, mix, w: cap * fare / wsum * 170, health: Math.round(R(s, 64, 95)), job: null, patched: false, warnAt: 0, q: 0, jam: false, crew: 0, lh: 0, earn: 0, rate: 0, ovh: 0, pc: 0, mf: 0, cf: 0, hzm: 1 });
  ride(s, 'night').health = 46; ride(s, 'boats').health = 42; ride(s, 'esub').health = 70;
  for (const [n, role, sk, sh] of TEAM0) s.crew.push(mkStaff(s, n, role, sk && Object.assign({}, sk), sh));
  s.me = s.crew[0].id;
  s.forecast = rollDay(s, 1);
  mods(s);
  s.cands = rollCands(s);
  resetDay(s);
  return s;
}
function rollDay(s, day) {
  const f = { day, weekend: (day - 1) % 7 >= 5, heat: false, events: [] };
  if (day === 1) { f.events.push({ k: 'vip', ride: 'wheel', at: 900 }); f.memo = 'vip'; f.waves = [{ at: 750, size: 2 }]; return f; }
  f.heat = chance(s, .3);
  f.memo = pick(s, ['up', 'lit', 'net', 'nopatch', 'vip']);
  f.events.push({ k: 'vip', ride: pick(s, s.rides.filter(r => r.sub)).id, at: 720 + RI(s, 0, 7) * 60 });
  if (day === 2 || chance(s, .6)) f.events.push({ k: 'insp', at: 660 + RI(s, 0, 8) * 60 });
  // squalls: announced half an hour ahead, then several rides fail within minutes of each other
  f.waves = []; const nw = 1 + (day >= 6 ? 1 : 0), slots = [660, 780, 900, 1020, 1140];
  for (let i = 0; i < nw; i++) f.waves.push({ at: slots.splice(Math.floor(rnd(s) * slots.length), 1)[0] + RI(s, 0, 5) * 10, size: 2 + (day >= 8 ? 1 : 0) });
  f.waves.sort((a, b) => a.at - b.at);
  return f;
}
function rollCands(s) {
  const out = [], taken = new Set(s.crew.map(t => t.name)), names = NAMES.filter(n => !taken.has(n));
  const n = has(s, 'hr') ? 6 : 3, missing = ['sup', 'mach', 'store', 'eng', 'mat', 'hr'].filter(r => r === 'sup' ? s.crew.filter(t => t.role === 'sup').length < 2 : !has(s, r)), roles = [];
  while (missing.length && roles.length < Math.ceil(n / 2)) roles.push(missing.splice(Math.floor(rnd(s) * missing.length), 1)[0]);
  if (!s.reports.length && !s.cands.length) { roles[0] = 'eng'; if (roles.length > 1) roles[1] = 'sup'; }
  { // fairness: tonight's list always has someone for the trade the team is thinnest in
    const cover = tr => s.crew.filter(t => t.role === 'tech' && !t.temp && !t.agency && t.skills[tr]).length, thin = Object.keys(TRADES).sort((a, b) => cover(a) - cover(b))[0];
    if (roles.length < n) roles.push(thin); }
  while (roles.length < n) roles.push(pick(s, ['mech', 'elec', 'ctrl', 'mech', 'elec', 'ctrl', 'mach']));
  for (const role of roles) {
    const name = names.splice(Math.floor(rnd(s) * names.length), 1)[0] || 'Sam', g = rnd(s), grade = g < .38 ? 1 : g < .8 ? 2 : 3;
    out.push(TRADES[role] ? { name, role: 'tech', skills: { [role]: grade }, grade } : { name, role, skills: {}, grade: role === 'mach' ? grade : 2 });
  }
  return out;
}
function resetDay(s) { // put the park in its opening state for s.day without starting the clock
  const f = s.forecast;
  s.clock = OPEN; s.crowd = f.weekend ? 1.2 : 1; s.heat = f.heat;
  s.events = f.events.map(e => Object.assign({ done: false, warned: false }, e)).sort((a, b) => a.at - b.at);
  s.waves = (f.waves || []).map(w => ({ at: w.at, size: w.size, left: 0, warned: false, done: false })); s.cdC = 0;
  const prev = s.reports[s.reports.length - 1];
  s.glow = prev ? clamp(prev.glowEnd * .5 + 45, 55, 90) : 80;
  for (const r of s.rides) { r.q = 0; r.lh = 0; r.earn = 0; r.rate = 0; r.jam = false; r.crew = 0; r.warnAt = 0; }
  s.crew = s.crew.filter(t => !t.temp);
  for (const t of s.crew) { place(t); t.state = 'home'; t.target = null; t.fetch = t.carry = false; t.dest = null; t.day = 0; t.on = false; t.post = null; t.sprint = t.push = t.cdS = t.cdP = 0; t.brk = false; t.talk = 0; t.wake = 0; t.inAt = 0; t.hurt = 0; t.stall = 0; t.risk = t.riskW = t.riskC = 0; t.pace = 0; } // every timer here is a clock of the day, so it must not carry into tomorrow
  s.prio = null; s.talk = null; s.away = 0; s.cdV = 0; s.hh = 0; for (const r of s.rides) { r.vouch = 0; r.fl = 0; r.svcReq = false; }
}
function startDay(s) {
  if (s.phase !== 'plan' || s.final) return;
  if (s.closed) {
    for (const r of s.rides) r.health = Math.min(100, r.health + (s.up.nightc ? 22 : 8));
    for (const t of s.crew) { t.tired = !isMgr(t) && t.worked && t.shiftWas === 'full'; }
    s.day++; s.closed = false; resetDay(s);
  }
  bigLate(s);
  s.phase = 'day'; s.meal = false; s.confMult = s.conf >= 75 ? 1.1 : s.conf < 30 ? .9 : 1;
  for (const t of s.crew) { t.sick = !isMgr(t) && t.morale < 25 && chance(s, .35); if (t.sick) log(s, `${t.name} has called in sick. Morale is on the floor.`, 'bad'); }
  s.d = Object.assign(ledger(), s.pre, { patches: 0, faults: 0, fixed: 0, quick: 0, rescued: 0, lost: 0, glowSum: 0, n: 0, vip: null, insp: null, upW: 0, upT: 0, mkt: 0, seatMin: {}, conf0: s.conf, boardAt: 690 + RI(s, 0, 9) * 30, bq: 0, hq: 0, spin: 0, pressQ: '', pq2: 0, talked: [], al: 0, mis: 0 }); s.pre = ledger();
  s.comp = Math.max(10, s.comp - 30); s.cdT = 0; mods(s);
  for (let i = s.later.length - 1; i >= 0; i--) if (s.later[i].day <= s.day) { const k = s.later.splice(i, 1)[0].k; if (LATER[k]) LATER[k](s); }
  s.inbox = []; s.asks = []; s.cool = false; s.cdW = 0; s.cdq = {}; s.freeze = 0; s.cdTop = {};
  for (const r of s.rides) { const j = r.job; if (!j) continue; // last night's open jobs start the morning fresh on today's clock
    Object.assign(j, { t0: OPEN - 20, rescue: 0, coq: 0, eq: 0, pq: 0, hq: 0, wo: 0, skip: [], first: 0 });
    if (j.type === 'fault') { j.par = OPEN + 40 + Math.round(j.work * 1.1); if (j.esc) j.esc = OPEN + 40; } }
  mods(s); s.itOut = false;
  if (!s.rk) s.rk = {};
  if (s.day > 1) { // what goes wrong when nobody is employed to stop it
    // each risk builds up day by day and lands when it fills, so the same company has the same bad luck
    const m = s.m, roll = (k, p) => { if (s.rk[k] == null) s.rk[k] = R(s, 0, .5); s.rk[k] += clamp(p, 0, .9); if (s.rk[k] >= 1) { s.rk[k] -= 1; return true; } return false; }, hit = (amt, txt, conf) => { amt = Math.round(amt); s.cash -= amt; s.d.bonus -= amt; s.conf = clamp(s.conf - conf, 0, 100); log(s, `${txt} Cost: ${fmtMoney(amt)}.`, 'bad'); };
    if (roll('it', .14 * m.pIT)) { s.itOut = true; log(s, 'Tills and ticketing keep dropping out today. Takings will be about 8% short.', 'bad'); }
    if (roll('cyber', .04 * m.pCyber)) hit(3000, 'A phishing attack redirected a supplier payment.', 6);
    if (roll('env', .12 * m.pEnv)) hit(900 * m.fine, 'Environmental notice for waste handling.', 0);
    if (roll('guest', (.03 + .03 * s.rides.filter(r => r.patched).length + .02 * s.crew.filter(t => t.shift === 'full' && !isMgr(t)).length) * m.pSafety)) { hit(2500 * m.fine * (1 - .5 * m.ins), 'A guest was hurt on site and the claim has landed.', 8); s.cm = clamp(s.cm - 5, 0, 100); }
    if (roll('legal', .06 * m.pLegal)) hit(1500 * m.fine, 'A contract dispute went against you.', 0);
    if (s.cm < 20) log(s, 'Office staff are working to rule. Every department is at half strength until morale recovers.', 'bad');
  }
  for (const t of s.crew) { t.on = onShift(t, OPEN); if (t.on) t.state = 'idle'; t.shiftWas = t.shift; t.worked = true; t.en = t.tired ? 70 : 100; }
  const due = s.inbound.filter(o => !o.at && o.due <= s.day);
  for (const o of due) s.stock[o.sku]++;
  s.inbound = s.inbound.filter(o => o.at || o.due > s.day);
  log(s, `${dow(s.day)}, day ${s.day} of ${DAYS}. Gates open.${s.crowd > 1 ? ' Weekend crowds.' : ''}${s.heat ? ' Heatwave: electrics will run hot.' : ''}`, 'event');
  if (due.length) log(s, `Morning delivery booked into stores: ${due.length} item${due.length > 1 ? 's' : ''}.`);
}

/* faults and jobs */
function createFault(s, r, o) {
  o = o || {};
  let trade = o.trade;
  if (!trade) {
    const mix = Object.entries(r.mix).map(([t, w]) => [t, s.heat && t === 'elec' ? w * 2 : w]);
    let roll = rnd(s) * mix.reduce((t, x) => t + x[1], 0); trade = mix[0][0];
    for (const [t, w] of mix) { if ((roll -= w) <= 0) { trade = t; break; } }
  }
  let pool = FAULTS.filter(f => f[1] === trade && f[3].includes(r.kind));
  if (!pool.length) pool = FAULTS.filter(f => f[1] === trade && !f[2]);
  const tpl = o.title ? [o.title, trade, null] : pick(s, pool);
  const sev = o.sev || (!r.sub || chance(s, r.health < 30 ? .75 : .55) ? 'major' : 'minor');
  if (r.job) dropJob(s, r);
  if (r.so) { r.so = null; r.restart = 0; }
  if (r.blame) { const b = r.blame; r.blame = null; // it failed again (or was red-tagged) after someone countersigned a weak job sheet
    if (b.mine && s.day - b.day <= 1 && s.sc[b.x]) { s.sc[b.x].csHurt = (s.sc[b.x].csHurt || 0) + 1; if (b.x === s.seat) log(s, `${r.name} failed again after you countersigned a job sheet with gaps in it. You share the fault.`, 'bad'); } }
  if (!o.glitch && !o.lock) { if (trade === 'mech') r.mf = (r.mf || 0) + 1; else if (trade === 'ctrl') r.cf = (r.cf || 0) + 1; }
  r.job = { type: 'fault', title: tpl[0], trade, sev, work: Math.round(R(s, 38, 88) * (sev === 'minor' ? .7 : 1)), prog: 0, mode: 'full', lock: !!o.lock, part: tpl[2], ps: 'none', t0: s.clock };
  if (tpl[4]) { // what the technician sees, and three possible causes
    const kin = FAULTS.filter(f => f !== tpl && f[3].includes(r.kind)), same = kin.filter(f => f[1] === trade), d = [];
    const take = arr => { const f = arr.filter(x => !d.includes(x[0]))[Math.floor(rnd(s) * arr.filter(x => !d.includes(x[0])).length)]; if (f) d.push(f[0]); };
    take(same.length ? same : kin); take(kin.length > 1 ? kin : FAULTS.filter(f => f !== tpl)); if (d.length < 2) take(FAULTS.filter(f => f !== tpl));
    const opts = [tpl[0]].concat(d.slice(0, 2)); for (let i = opts.length - 1; i > 0; i--) { const k = Math.floor(rnd(s) * (i + 1)); [opts[i], opts[k]] = [opts[k], opts[i]]; }
    const right = opts.indexOf(tpl[0]), gut = chance(s, .85) ? right : (right + 1 + Math.floor(rnd(s) * 2)) % 3;
    Object.assign(r.job, { sym: tpl[4], ans: tpl[0], opts, gut });
  } else r.job.dx = 1;
  { const j = r.job; j.par = s.clock + 40 + Math.round(j.work * 1.1);
    if (sev === 'minor' && r.sub) j.esc = s.clock + RI(s, 35, 50);
    if (sev === 'major' && r.sub && MOVING.includes(r.kind) && !o.lock && !gentle(s) && chance(s, .5)) { j.rescue = s.clock + D(s).resc; j.rspan = D(s).resc; }
    j.lag = RI(s, 5, 14); } // how long a computer supervisor takes to notice and decide
  r.health = Math.max(0, r.health - 5); r.warnAt = 0; r.svcReq = false;
  if (r.fl > s.clock) { r.fl = 0; s.glow = Math.max(0, s.glow - 6); s.conf = clamp(s.conf - 1, 0, 100); log(s, `${r.name} broke down with a queue of fast-lane guests who paid extra. Refunds and complaints: glow −6.`, 'bad'); }
  s.d.faults++;
  const extra = !r.sub ? (s.up.genny ? ' The generator will carry its rides for 90 minutes.' : ' Its rides have lost power.') : '';
  log(s, `${r.name}: ${tpl[0].toLowerCase()}. ${sev === 'major' ? (r.sub ? 'Ride closed.' : 'Substation down.') : 'Running at half speed.'}${extra}${r.job.rescue ? ` Guests are stuck on it: get anyone there by ${fmtClock(r.job.rescue)}.` : ''}`, 'bad');
  fx(s, sev === 'major' ? 'major' : 'minor', r.id, sev === 'major' ? 'Breakdown' : o.glitch ? GKIND[o.glitch][0] : 'Fault');
}
const gentle = s => s.day === 1 && s.clock < 690;
// luck control: when several things have just broken, the next breakdown is a little less likely (squalls are separate)
const calm = s => { const n = s.rides.filter(r => r.job && r.job.type === 'fault' && !r.job.sq && s.clock - r.job.t0 < 60).length; return n <= 2 ? 1 : Math.max(.35, 1 - .2 * (n - 2)); }; // the first morning of a season: fewer breakdowns, nobody stuck
function glitch(s, r, back) {
  const mix = Object.entries(r.mix); let roll = rnd(s), tr = mix[0][0]; for (const [t, w] of mix) { if ((roll -= w) <= 0) { tr = t; break; } }
  const [title, kind] = pick(s, GLITCH[tr]), K = GKIND[kind];
  if (!back && kind === 'reset' && chance(s, .5)) { // the ride operator resets it, and that is all it needed (for now)
    r.restart = s.clock + 2; r.gb = chance(s, .35) ? s.clock + RI(s, 15, 40) : 0;
    log(s, `${r.name}: ${title.toLowerCase()}. Operations reset it and it is running again.`, 'info'); fx(s, 'minor', r.id, 'Reset'); return;
  }
  createFault(s, r, { title: back ? title + ' (came back)' : title, trade: tr, sev: 'minor', glitch: kind });
  if (kind === 'reset') log(s, back ? `${r.name}: it came back after Operations reset it. It is a job for the crew now.` : `${r.name}: Operations tried a reset and it would not clear. It is a job for the crew.`, 'info');
  Object.assign(r.job, { glitch: kind, work: RI(s, K[1][0], K[1][1]), esc: s.clock + K[2] + (kind === 'flicker' ? 0 : D(s).esc), par: s.clock + 45 }); r.health = Math.min(100, r.health + 5);
}
function dropJob(s, r) { // a job goes away without using its part
  const j = r.job; if (!j) return; if (s.prio === r.id) s.prio = null;
  if (j.part && j.ps !== 'none') s.stock[j.part]++;
  for (const t of s.crew) if (t.target === r.id) release(t);
  r.job = null;
}
function release(t) { t.target = null; t.fetch = false; t.carry = false; t.lk = null; if (t.on) t.state = 'idle'; }
function rouse(s, t) { if (t.brk || t.talk) { t.brk = false; t.talk = 0; t.wake = s.clock + 2; } } // pulled off a break or out of a talk, people take a couple of minutes to get going (and miss the talk)
// returns true, or a short reason it cannot be done
function assign(s, t, r, mode, ai) {
  if (!t || !r || s.phase !== 'day') return 'Not now';
  if (t.role !== 'tech') return `${t.name} does not work on rides`;
  if (!t.on) return `${t.name} is not on shift`;
  const tr = r.job ? r.job.trade : primary(r);
  if (!t.skills[tr]) return `${t.name} is not qualified for ${TRADES[tr].toLowerCase()} work`;
  if (r.so) return `${r.short} is fixed and waiting to be signed back into service`;
  if (!r.job) {
    if (s.stock.kit < 1) return 'No service kits in stores';
    r.job = { type: 'service', trade: tr, work: SERVICE_WORK, prog: 0, started: false, part: 'kit', ps: 'none', t0: s.clock };
  }
  if (mode) setMode(s, r, mode);
  if (!ai && s.seat === 'sup') { const held = s.rides.find(x => x !== r && ((x.job && (x.job.pads || []).includes(t.id)) || (x.so && x.so.pads.includes(t.id)))); if (held) { s.sc.sup.padPull = (s.sc.sup.padPull || 0) + 1; log(s, `${t.name}'s padlock is still on ${held.short}. It cannot reopen until they go back and take it off.`, 'bad'); } }
  rouse(s, t); release(t); t.post = null; t.padRun = null; t.target = r.id; t.state = 'walk';
  if (!ai) { overHead(s); if (s.seat === 'sup') s.sc.sup.disp++; }
  if (r.job.type === 'fault' && !r.job.first) { r.job.first = s.clock; if (!ai && s.seat === 'sup') { s.sc.sup.resp += s.clock - r.job.t0; s.sc.sup.respN++; }
    if (!ai) r.job.me = 1; // for the playtest record: this one you sent yourself
    if (s.clock - r.job.t0 <= fastOf(s)) { const j = r.job; j.fast = 1; j.work = Math.round(j.work * .8); s.d.fast = (s.d.fast || 0) + 1; s.glow = Math.min(100, s.glow + 1); if (!ai && s.seat === 'sup') s.sc.sup.fast = (s.sc.sup.fast || 0) + 1; fx(s, 'fast', r.id, 'Fast response'); } }
  return true;
}
function moveOrder(s, t, x, y, ai) {
  if (!t || t.role !== 'tech' || !t.on || s.phase !== 'day') return false;
  if (!ai) overHead(s);
  rouse(s, t); release(t); t.post = { x: clamp(Math.round(x), 30, 970), y: clamp(Math.round(y), 30, 650) }; t.state = 'walk'; return true;
}
function rest(s, t, ai) { // a proper break: energy comes back ten times faster than standing about, but it takes a few minutes to get going again
  if (!t || t.role !== 'tech' || !t.on || t.temp || t.agency || s.phase !== 'day' || t.brk || enOf(t) >= 95) return false;
  if (!ai) overHead(s); release(t); t.post = null; t.talk = 0; t.brk = true; t.state = 'break'; return true;
}
function sprint(s, t) { if (!t || t.role !== 'tech' || !t.on || s.phase !== 'day' || s.clock < t.cdS) return false; t.sprint = s.clock + 25; t.cdS = s.clock + 120; return true; }
function pushOn(s, t) { if (!t || t.role !== 'tech' || !t.on || t.temp || s.phase !== 'day' || s.clock < t.cdP) return false; t.push = s.clock + 30; t.cdP = s.clock + 150; t.morale = clamp(t.morale - 2, 0, 100); return true; }
function rush(s, r) { // manager and above: this one first, with everyone who can help, pushed
  if (!r || s.phase !== 'day' || !r.job || r.job.type !== 'fault') return false;
  if (s.prio === r.id) { s.prio = null; return true; }
  s.prio = r.id; log(s, `Rush job: ${r.name}. Best people on it now, and push them.`, 'event'); fx(s, 'ready', r.id, 'Rush job'); return true;
}
function callIn(s, t) { // overtime: someone off shift comes in now, about 20 minutes away
  if (!t || s.phase !== 'day' || t.temp || t.agency || isMgr(t) || t.on || t.sick || t.inAt || t.shift === 'full' || !['tech', 'store'].includes(t.role) || s.clock >= LH - 30) return false;
  t.was = t.shift; t.shift = 'full'; t.once = true; t.shiftWas = 'full'; t.inAt = s.clock + 20; t.en = Math.max(enOf(t), 70); t.morale = clamp(t.morale - 3, 0, 100); t.x = GATE.x; t.y = GATE.y; t.brk = false; t.talk = 0;
  log(s, `${t.name} has been called in on overtime and will be on site around ${fmtClock(t.inAt)}.`, 'event'); return true;
}
function agency(s) { // director and above: two agency technicians, a mechanic and an electrician, for three hours
  if (s.phase !== 'day' || s.d.agency || s.clock >= LH - 60 || s.cash < AGENCY) return false;
  spend(s, 'contract', AGENCY); s.d.agency = 1;
  const taken = new Set(s.crew.map(t => t.name)), names = NAMES.filter(n => !taken.has(n)), at = s.clock + 20;
  for (const tr of ['mech', 'elec']) { const nm = names.splice(Math.floor(rnd(s) * names.length), 1)[0] || 'Sam', t = mkStaff(s, nm, 'tech', { [tr]: 2 }, 'early', 2); Object.assign(t, { agency: at + 180, inAt: at, morale: 70, x: GATE.x, y: GATE.y }); s.crew.push(t); }
  log(s, `Two agency technicians are on their way: on site around ${fmtClock(at)}, here until ${fmtClock(at + 180)}.`, 'event'); return true;
}
function vouch(s, r) { // chief executive: goodwill vouchers so guests at a closed ride go home happy anyway
  if (!r || s.phase !== 'day' || !r.sub || !r.job || r.job.type !== 'fault' || s.clock < s.cdV || s.cash < VOUCH || r.vouch > s.clock) return false;
  spend(s, 'contract', VOUCH); s.d.mkt = (s.d.mkt || 0) + VOUCH; r.vouch = s.clock + 60; s.cdV = s.clock + 30; s.glow = Math.min(100, s.glow + 3);
  log(s, `Return vouchers handed out at ${r.name}. Guests in that queue will forgive the wait for the next hour.`, 'good'); fx(s, 'cash', r.id, 'Vouchers'); return true;
}
function orderService(s, r) { // director: a prevention service on a ride now, ahead of the supervisor's own rules
  if (!r || s.phase !== 'day' || r.job || r.so || r.svcReq || status(s, r) === 'nopower' || s.stock.kit < 1) return false;
  r.svcReq = true; log(s, `Service ordered on ${r.name}. The supervisor will close it and send someone when a qualified person is free.`, 'event'); fx(s, 'ready', r.id, 'Service ordered'); return true;
}
function fastLane(s, r) { // director: sell fast-lane passes on one ride for an hour: it earns 40% more, queues jam sooner, and a breakdown in that hour costs goodwill
  if (!r || !r.sub || s.phase !== 'day' || r.job || r.fl > s.clock || (s.d.fl || 0) >= 2 || status(s, r) !== 'ok' || s.clock >= CLOSE - 60) return false;
  r.fl = s.clock + 60; s.d.fl = (s.d.fl || 0) + 1; log(s, `Fast-lane passes on sale at ${r.name} until ${fmtClock(r.fl)}.`, 'event'); fx(s, 'cash', r.id, 'Fast lane'); return true;
}
function happyHour(s) { // chief executive: an hour of half-price entry: more guests and goodwill, less from each, and queues build fast
  if (s.phase !== 'day' || s.d.hh || s.clock >= LH - 60) return false;
  s.d.hh = 1; s.hh = s.clock + 60; s.glow = Math.min(100, s.glow + 8); log(s, `Happy hour until ${fmtClock(s.hh)}: cheap entry. Expect a rush at the gates.`, 'event'); fx(s, 'cash', null); return true;
}
function briefChair(s) { // chief executive: call the chair yourself. Good news lands well; a bad day reported is still a bad day.
  if (s.phase !== 'day' || s.d.brief || s.clock < 660) return false;
  const up = s.d.upW / Math.max(1, s.d.upT), dc = clamp(Math.round((up - .82) * 40), -5, 5); s.d.brief = 1; s.conf = clamp(s.conf + dc, 0, 100);
  log(s, `You briefed the chair: uptime so far ${Math.round(up * 100)}%. ${dc > 0 ? 'She is pleased.' : dc < 0 ? 'She is not.' : 'She noted it.'} Board confidence ${dc >= 0 ? '+' : '−'}${Math.abs(dc)}.`, dc >= 0 ? 'good' : 'bad'); return true;
}
function crowdPleaser(s) {
  if (s.phase !== 'day' || s.clock < s.cdC || s.cash < 250) return false;
  spend(s, 'contract', 250); s.d.mkt = (s.d.mkt || 0) + 250; s.cdC = s.clock + 150; s.glow = Math.min(100, s.glow + 10);
  for (const r of s.rides) { r.q *= .4; r.jam = false; }
  log(s, 'Buskers and free ice cream on the midway. The queues thin out and the mood lifts.', 'good'); fx(s, 'cash', null);
  return true;
}
function breakStreak(s, why) { if (s.streak > 1) log(s, `Streak of ${s.streak} lost: ${why}.`, 'bad'); s.streak = 0; s.d.lost++; }
function setMode(s, r, mode) { const j = r.job; if (j && j.type === 'fault' && !j.lock && (mode === 'full' || mode === 'patch')) j.mode = mode; }
function standDown(s, t) { if (t) { release(t); t.post = null; t.brk = false; } }
function holdOver(s, t) { if (t && !t.temp && t.on && t.shift === 'early' && s.phase === 'day') { t.shift = 'full'; t.shiftWas = 'full'; t.once = true; return true; } return false; }
const calloutCost = s => Math.round(COST.callout * s.m.contractor);
function callout(s, r) {
  const j = r && r.job;
  if (!j || j.type !== 'fault' || s.phase !== 'day' || s.cash < calloutCost(s) || s.crew.some(t => t.temp && t.target === r.id)) return false;
  spend(s, 'contract', calloutCost(s));
  const t = mkStaff(s, 'Contractor', 'tech', { [j.trade]: 2 }); t.temp = true; t.arrive = s.clock + 45; t.target = r.id; t.x = GATE.x; t.y = GATE.y;
  s.crew.push(t);
  log(s, `Contractor called out for ${r.name}. On site around ${fmtClock(t.arrive)}.`, 'event');
  return true;
}
/* ---------- reopening a fixed ride: who signs it back into service, and the padlocks ----------
   A finished job no longer reopens the ride by itself. It waits, "fixed, waiting to reopen", until the right people have
   signed and every padlock on it is off. Never more than two signatures, plus Operations accepting it back:
   - a quick reset (a glitch): the technician reopens it with one tap after their reset;
   - a normal repair or a planned service: the technician signs it fit to run after a test run, then Operations runs it
     empty for a couple of minutes;
   - a safety-critical part (restraints, brakes, safety relays and E-stops, a building's breaker) or any patch on a moving
     ride: the technician signs, the supervisor countersigns, then Operations;
   - red-tagged by the inspector: the technician signs and the manager countersigns, then the inspector comes back to
     clear the tag 20-30 minutes after the countersign (sign quickly and the inspector is booked sooner);
   - after an injury on the job: the director countersigns, once the incident review is done;
   - a substation: the technician signs and the supervisor countersigns; then power comes back and its rides restart
     one by one.
   The chief executive never signs a reopen, and nobody countersigns their own work. A countersign is a check: the card
   shows the write-up (cause found, parts, test run, patch or full repair, who did it) and the signer can send it back.
   Signing a bad write-up shares the fault; sending back a good one costs time and a little morale.
   Anyone who must sign and leaves it more than 10 minutes: it goes one seat up, counts as missed, and the ride waits. */
const FACILITY = ['food', 'arcade', 'theater'];
const SO_STEPS = { reset: ['fit', 'go'], normal: ['fit', 'ops'], safety: ['fit', 'sup', 'ops'], redtag: ['fit', 'mgr', 'insp'], injury: ['fit', 'review', 'dir', 'ops'], sub: ['fit', 'sup', 'power'] };
const SO_NAME = { reset: 'Quick reset', normal: 'Repair', safety: 'Safety-critical', redtag: 'Red tag', injury: 'After an injury', sub: 'Substation' };
const SO_SIGN = 10, SO_OPS = 2; // minutes to sign before it goes up a seat; Operations' empty run
const SO_LAG = { tech: [1, 2], sup: [1, 3], mgr: [2, 5], dir: [3, 6] }; // how long a computer signer takes to get to it and check
const safetyJob = (r, j) => j.type === 'fault' && (j.part === 'brake' || j.part === 'relay' || /lap bar|restraint|e-stop|brake/i.test(j.title || '') || (j.part === 'breaker' && FACILITY.includes(r.kind)));
function soKind(r, j, inj) {
  if (!r.sub) return 'sub';
  if (inj) return 'injury';
  if (j.lock) return 'redtag';
  if (safetyJob(r, j) || (j.type === 'fault' && j.mode === 'patch' && MOVING.includes(r.kind))) return 'safety';
  return j.type === 'fault' && j.glitch ? 'reset' : 'normal';
}
// what the job sheet says. A technician who finds the cause writes it down; a rushed or inexperienced one sometimes does not.
function writeUp(s, r, j, lead) {
  const g = lead ? (lead.temp ? 2 : lead.skills[j.trade] || 1) : 2, mine = lead && s.seat === 'tech' && lead.id === s.me;
  const cause = j.type === 'service' ? 'service' : j.glitch && !safetyJob(r, j) ? 'reset' : j.cause || (mine ? 'found' : chance(s, [0, .72, .9, .97][g] || .9) ? 'found' : 'none');
  return { cause, part: j.type === 'service' ? 'kit' : j.mode === 'full' ? j.part : null, patch: j.type === 'fault' && j.mode === 'patch', test: null, who: lead ? lead.name : 'The crew', tid: lead ? lead.id : 0, grade: g };
}
const soBad = o => o.wr.cause === 'none' || o.wr.cause === 'guess' || o.wr.test === false || (o.wr.patch && o.safe);
const soStep0 = o => o.steps[o.i];
// the seat that must countersign: whoever holds it (an empty post passes it up), never the chief executive, never the worker
function soSigner(s, lvl, o) {
  let x = handler(s, lvl);
  if (x === 'ceo') x = ['dir', 'mgr', 'sup'].filter(y => RANK[y] <= RANK[lvl] || lvl === 'dir').find(y => filled(s, y) || y === s.seat) || 'sup';
  if (o.self && x === o.self) x = above(s, x) === 'ceo' ? (x === 'sup' ? 'mgr' : 'dir') : above(s, x); // the person who did the work never countersigns it
  return x;
}
// what it earns an hour when it runs, for the board card and the map while it waits
function hourly(s, r) {
  if (!r.sub) return s.rides.filter(x => x.sub === r.id).reduce((a, x) => a + hourly(s, x), 0);
  const att = attendance(Math.max(OPEN, s.clock)) * s.crowd * (s.m ? s.m.crowd : 1);
  return Math.round(.8 * r.cap * (s.m ? s.m.cap : 1) * Math.min(1.25, att) * r.fare * .65 * 60 * (s.confMult || 1) * (s.m ? s.m.spend : 1) * (s.clock > LH ? 1.5 : 1));
}
function soStart(s, r, j, crew, mt) {
  const inj = r.injAt === s.clock, k = soKind(r, j, inj), lead = staff(s, j.lead) || crew.find(t => !t.temp) || crew[0] || null;
  // the people finishing take their own padlocks off as they go (you take yours off yourself); anyone who left earlier must come back
  const pads = (j.pads || []).filter(id => { const t = staff(s, id); return t && t.on && !(crew.includes(t) && t !== mt); });
  r.so = { k, steps: SO_STEPS[k], i: 0, t0: s.clock, at: s.clock, lag: 0, esc: 0, x: null, wr: writeUp(s, r, j, lead), lead: lead ? lead.id : 0, pads, safe: !!safetyJob(r, j), back: j.back || 0, by: {},
    job: { type: j.type, title: j.title, trade: j.trade, lock: !!j.lock, mode: j.mode, part: j.part, glitch: j.glitch || null, sev: j.sev } };
  if (j.self) r.so.self = j.self;
  return r.so;
}
const soWhoNext = (s, r) => { const o = r.so, st = soStep0(o);
  return st === 'fit' ? `${o.lead === s.me && s.seat === 'tech' ? 'you sign' : (staff(s, o.lead) || { name: 'the technician' }).name + ' signs'} it fit to run` : st === 'ops' ? 'Operations run it empty' : st === 'insp' ? 'the inspector clears the tag' : st === 'power' ? 'power is restored' : st === 'go' ? 'every padlock is off' : st === 'review' ? 'the incident review' : `${seatWho(s, o.x || soSigner(s, st, o))} countersigns`; };
function soNext(s, r) {
  const o = r.so; o.i++; o.at = s.clock; o.lag = 0; o.esc = 0; o.x = null; o.signedAt = 0;
  if (o.i >= o.steps.length) return soOpen(s, r);
  const st = soStep0(o);
  if (st === 'insp') { o.inspAt = s.clock + RI(s, 20, 30); log(s, `${r.name}: countersigned. The inspector is booked for ${fmtClock(o.inspAt)} to clear the red tag.`, 'info'); }
  if (st === 'sup' || st === 'mgr' || st === 'dir') o.x = soSigner(s, st, o);
  if (o.x === s.seat) { fx(s, 'req', r.id, 'Sign to reopen'); log(s, `${r.name} is waiting for your countersign to reopen. Check the write-up on its card.`, 'event'); }
}
function soOpen(s, r) {
  const o = r.so; r.so = null;
  if (!r.sub) { // power back: the rides it feeds restart one by one
    let k = 0; for (const x of s.rides.filter(x => x.sub === r.id)) x.restart = s.clock + 1 + 1.5 * k++;
    log(s, `${r.name} is signed off and power is back. Its rides restart one by one.`, 'good'); fx(s, 'fix', r.id, 'Power back');
  } else { log(s, `${r.name} is open again.`, 'good'); fx(s, 'fix', r.id, 'Reopened'); }
  // what a weak job sheet costs later: no cause found leaves no history for the next fault, and no test run may mean it was not right
  if (o.wr.cause === 'none' || o.wr.cause === 'guess') { r.nohist = 1; r.health = Math.min(r.health, 72); }
  if (o.wr.test === false && chance(s, .35)) r.warnAt = s.clock + RI(s, 8, 25);
  if (o.stamp) r.blame = { x: o.stamp, day: s.day, tid: o.wr.tid, mine: !!o.stampMine };
}
// a signer said yes
function soSign(s, r, x, who) {
  const o = r.so, st = soStep0(o); o.by[st] = who;
  if (soBad(o)) { o.stamp = x; o.stampMine = who === 'You'; } // signed a weak write-up: shares the fault if it goes wrong
  soNext(s, r);
}
// sent back: the job reopens for whoever did it, to find the cause, finish properly or run the test
function soBack(s, r, who, x) {
  const o = r.so, J = o.job, good = !soBad(o), w = staff(s, o.wr.tid);
  r.so = null;
  r.job = { type: 'fault', title: `${J.title || 'Service'} (sent back)`, trade: J.trade, sev: 'major', work: good ? 8 : 15, prog: 0, mode: 'full', lock: J.lock, part: o.wr.patch && o.safe ? J.part : null, ps: 'none', t0: s.clock, par: s.clock + 40, dx: 1, cause: 'found', back: (o.back || 0) + 1, pads: o.pads.slice(), lag: 2 };
  if (good && w && !w.temp) w.morale = clamp(w.morale - 3, 0, 100);
  if (x === s.seat) { const sc = s.sc[s.seat]; sc.csBack = (sc.csBack || 0) + 1; if (good) sc.csBackGood = (sc.csBackGood || 0) + 1; }
  log(s, `${Who(who, 'sent')} ${r.short} back: ${good ? 'nothing was wrong with the job, so it costs time and ' + (w ? w.name + '\'s' : 'the crew\'s') + ' goodwill' : o.wr.cause !== 'found' && o.wr.cause !== 'service' && o.wr.cause !== 'reset' ? 'no cause on the job sheet' : o.wr.test === false ? 'no test run' : 'a patch on a safety-critical part'}. It goes back to the crew.`, good ? 'bad' : 'info');
  fx(s, 'warn', r.id, 'Sent back');
  if (w && w.on && !w.target && !w.temp && w.skills[J.trade] && !(s.seat === 'tech' && w.id === s.me)) assign(s, w, r, null, true);
}
// you were the signer and let it sit: it goes one seat up
function soEsc(s, r) {
  const o = r.so, x = above(s, s.seat) === 'board' ? 'dir' : above(s, s.seat);
  miss(s); const sc = s.sc[s.seat]; sc.esc = (sc.esc || 0) + 1; sc.csMiss = (sc.csMiss || 0) + 1; s.d.esc = (s.d.esc || 0) + 1;
  o.esc = 1; o.x = x; o.at = s.clock; o.lag = ESC_DELAY[x] || 10;
  log(s, `No signature from you in ${SO_SIGN} minutes: ${r.name} was escalated to ${seatWho(s, x)}, who will get to it in about ${o.lag} minutes. It stays shut until then.`, 'bad');
  fx(s, 'warn', r.id, 'Escalated');
}
function soStepAll(s) {
  for (const r of s.rides) {
    const o = r.so; if (!o) continue;
    o.pads = o.pads.filter(id => { const t = staff(s, id); return t && t.on; }); // someone who has gone home took theirs off on the way out
    const st = soStep0(o);
    if (st === 'fit') {
      const mine = s.seat === 'tech' && o.lead === s.me && !o.esc;
      if (mine) { if (o.signedAt) { if (s.clock >= o.signedAt) soNext(s, r); } else if (s.clock >= o.at + SO_SIGN) soEsc(s, r); continue; }
      if (!o.lag) o.lag = RI(s, ...SO_LAG.tech);
      if (s.clock >= o.at + o.lag) { if (o.wr.test == null) o.wr.test = true; o.by.fit = o.esc ? holder(s, o.x) : (staff(s, o.lead) || { name: 'The crew' }).name; soNext(s, r); }
      continue;
    }
    if (st === 'sup' || st === 'mgr' || st === 'dir') {
      const x = o.x || (o.x = soSigner(s, st, o));
      if (x === s.seat && !o.esc) { if (s.clock >= o.at + SO_SIGN) soEsc(s, r); continue; }
      if (!o.lag) o.lag = RI(s, ...(SO_LAG[x] || SO_LAG.dir));
      if (s.clock >= o.at + o.lag) { if (soBad(o) && chance(s, .75)) soBack(s, r, holder(s, x), x); else soSign(s, r, x, holder(s, x)); }
      continue;
    }
    if (st === 'review') { // the incident review comes before the director's countersign
      const x = o.x || (o.x = soSigner(s, 'dir', o));
      if (x === s.seat && !o.esc) { if (s.clock >= o.at + SO_SIGN + 10) soEsc(s, r); continue; }
      if (!o.lag) o.lag = 15;
      if (s.clock >= o.at + o.lag) reviewDone(s, r, 'retrain', holder(s, x));
      continue;
    }
    if (o.pads.length) { o.at = s.clock; continue; } // nothing runs while anyone's padlock is still on the isolator: the empty run starts once the last is off
    if (st === 'ops' && s.clock >= o.at + SO_OPS) soNext(s, r);
    else if (st === 'insp' && s.clock >= o.inspAt && s.clock > o.at) { log(s, `The inspector cleared the red tag on ${r.name}.`, 'good'); soNext(s, r); }
    else if ((st === 'power' || st === 'go') && s.clock > o.at) soNext(s, r);
  }
}
// the director's incident review: what changes after someone was hurt on this job
const REVIEW = { retrain: ['Retrain', 'The crew go over the job again: the injured person is off 20 min more, alertness up'], stop: ['Stop that job for today', 'No patches for the rest of the day, alertness up a lot'], accept: ['Accept the risk', 'Nothing changes. If it happens again today, the board hears of it'] };
function reviewDone(s, r, v, who) {
  const o = r.so; if (!o || soStep0(o) !== 'review' || !REVIEW[v]) return false;
  if (v === 'retrain') { s.comp = Math.max(0, s.comp - 25); const t = staff(s, o.wr.tid); if (t && t.hurt > s.clock) t.hurt += 20; }
  else if (v === 'stop') { s.comp = Math.max(0, s.comp - 40); s.d.nopatch = 1; }
  else s.d.accepted = (s.d.accepted || 0) + 1;
  log(s, `${Who(who, 'reviewed')} the injury at ${r.short}: ${REVIEW[v][0].toLowerCase()}.`, 'info');
  o.by.review = who; soNext(s, r); return true;
}
// --- your own actions
function signFit(s, test) { // the technician: a test run, then "fit to run" (or sign it straight away, with no test run)
  const t = me(s), r = t && s.rides.find(x => x.so && soStep0(x.so) === 'fit' && x.so.lead === t.id && !x.so.esc && !x.so.signedAt);
  if (!r) return false;
  if (Math.hypot(t.x - r.x, t.y - r.y) > 70) return 'Go back to the ride first';
  const o = r.so; o.wr.test = !!test; o.signedAt = s.clock + (test ? 2 : 0); o.by.fit = 'You';
  onTime(s); const sc = s.sc.tech; sc.fit = (sc.fit || 0) + 1; if (!test) sc.noTest = (sc.noTest || 0) + 1;
  return true;
}
function padOff(s) { // the technician takes their own padlock off a finished job
  const t = me(s), r = t && s.rides.find(x => x.so && x.so.pads.includes(t.id));
  if (!r) return false;
  if (Math.hypot(t.x - r.x, t.y - r.y) > 70) return 'Go back to the ride first';
  r.so.pads = r.so.pads.filter(id => id !== t.id); s.sc.tech.padOff = (s.sc.tech.padOff || 0) + 1; return true;
}
function countersign(s, rid, v) { // you, as the countersigner: sign it back into service, or send it back
  const r = ride(s, rid), o = r && r.so; if (!o || o.esc || (v !== 'sign' && v !== 'back')) return false;
  const st = soStep0(o); if (st !== 'sup' && st !== 'mgr' && st !== 'dir') return false;
  const x = o.x || (o.x = soSigner(s, st, o)); if (x !== s.seat) return false;
  const sc = s.sc[s.seat], bad = soBad(o); onTime(s);
  if (v === 'back') { soBack(s, r, 'You', x); return true; }
  sc.csSign = (sc.csSign || 0) + 1; if (bad) sc.csStamp = (sc.csStamp || 0) + 1; else if (s.clock - o.at <= 3) sc.csFast = (sc.csFast || 0) + 1;
  soSign(s, r, x, 'You'); return true;
}
function review(s, rid, v) { const r = ride(s, rid), o = r && r.so; if (!o || o.esc || soStep0(o) !== 'review' || (o.x || soSigner(s, 'dir', o)) !== s.seat) return false; onTime(s); return reviewDone(s, r, v, 'You'); }

function complete(s, r) {
  const j = r.job, crew = s.crew.filter(t => t.target === r.id && t.on);
  if (j.type === 'fault') {
    if (j.mode === 'full') { r.health = Math.max(r.health, Math.round(R(s, 82, 95))); r.patched = false; if (j.part) s.used[j.part]++;
      if (s.clock <= j.par) { if (s.seat === 'sup') s.sc.sup.quick++; s.streak++; s.best = Math.max(s.best, s.streak); s.d.quick++; const b = 60 * Math.min(s.streak, 6); s.cash += b; s.d.bonus += b; s.glow = Math.min(100, s.glow + 1); fx(s, 'cash', r.id, `Quick fix ×${s.streak} +$${b}`); }
      else if (s.streak) breakStreak(s, `${r.short} took too long`); }
    else { r.health = Math.max(r.health, 35); r.patched = true; r.pc = (r.pc || 0) + 1; s.safety.patches++; s.d.patches++; if (j.part && j.ps !== 'none') s.stock[j.part]++; }
    s.d.fixed++; s.glow = Math.min(100, s.glow + 2);
    if (r.nohist && !j.back) r.nohist = 0; // a cause found and written down this time
    fx(s, 'fix', r.id, j.mode === 'patch' ? 'Patched' : 'Fixed');
  } else {
    r.health = 100; r.patched = false; s.used.kit++;
    fx(s, 'fix', r.id, 'Serviced');
  }
  r.warnAt = 0; r.q = 0; r.job = null;
  const mt = s.seat === 'tech' && crew.find(t => t.id === s.me);
  if (mt) { s.sc.tech.jobs++; if (mt.lk && mt.lk.skip && chance(s, .15 + s.comp / 400)) hurt(s, mt, r, true); }
  { const x = crew.find(t => !t.temp && !t.agency && (t.risk || 0) >= 1 && !(t.hurt > s.clock)); if (x) { const worn = (x.riskW || 0) > (x.riskC || 0); x.risk = x.riskW = x.riskC = 0; if (worn) hurt(s, x, r, x === mt, 'worn out after a long run of jobs with no break'); else hurt(s, x, r, x === mt); } }
  if (s.prio === r.id) s.prio = null;
  s.comp = Math.min(100, s.comp + 4);
  const o = soStart(s, r, j, crew, mt);
  log(s, `${r.name} is ${j.type === 'service' ? 'serviced' : 'fixed'}${j.mode === 'patch' ? ' on a patch, which will not hold for long' : ''}. Waiting to reopen: ${soWhoNext(s, r)}${o.pads.length ? ', once every padlock is off' : ''}.`, 'good');
  for (const t of crew) {
    if (t !== mt || !(o.lead === t.id || o.pads.includes(t.id))) release(t); t.jobs++; t.day++;
    if (!t.temp && t.skills[j.trade] === 1 && ++t.xp >= 5) { t.skills[j.trade] = 2; t.xp = 0; log(s, `${t.name} has earned tradesperson grade in ${TRADES[j.trade].toLowerCase()} work. Their wage goes up.`, 'good'); }
  }
}
function moveTo(t, x, y, sp) { const dx = x - t.x, dy = y - t.y, d = Math.hypot(dx, dy); if (d <= sp) { t.x = x; t.y = y; return true; } t.x += dx / d * sp; t.y += dy / d * sp; return false; }
const partReady = j => !j.part || j.ps === 'onsite' || (j.type === 'fault' && j.mode === 'patch');
function techStep(s, t) {
  if (t.en == null) t.en = 100;
  if (t.hurt > s.clock) { t.state = 'hurt'; return; }
  if (t.wake > s.clock) { t.state = 'wake'; return; }
  const sp = speed(s) * (t.sprint > s.clock ? 2 : 1), tire = n => { if (!t.temp && !t.agency) t.en = clamp(t.en - n, 0, 100); };
  if (!t.target) {
    const mine0 = s.seat === 'tech' && t.id === s.me;
    if (!t.post && !t.brk && !t.talk && !mine0) { const back = s.rides.find(x => x.so && x.so.pads.includes(t.id)); if (back) { t.post = { x: back.x + t.ox, y: back.y + t.oy }; t.padRun = back.id; } } // back to take a padlock off
    if (t.post) { t.state = 'walk'; tire(t.sprint > s.clock ? .35 : .1); if (moveTo(t, t.post.x, t.post.y, sp)) { t.post = null; t.state = 'idle';
      if (t.padRun) { const x = ride(s, t.padRun); if (x && x.so && x.so.pads.includes(t.id)) { x.so.pads = x.so.pads.filter(id => id !== t.id); log(s, `${t.name} came back and took their padlock off ${x.short}.`, 'info'); } t.padRun = null; } } }
    else if (t.talk) { t.state = 'talk'; tire(-.3); }
    else if (t.brk) { t.state = 'break'; tire(-2); if (t.risk) { t.risk *= .99; t.riskW = (t.riskW || 0) * .99; t.riskC = (t.riskC || 0) * .99; } if (t.en >= 100) { t.brk = false; t.state = 'idle'; fx(s, 'rest', null, t.name); } }
    else { t.state = 'idle'; tire(-.1); }
    return;
  }
  const r = ride(s, t.target), j = r && r.job;
  if (!j && r && r.so && s.seat === 'tech' && t.id === s.me && ((r.so.lead === t.id && soStep0(r.so) === 'fit' && !r.so.esc) || r.so.pads.includes(t.id))) { t.state = 'signoff'; return; }
  if (!j || !t.skills[j.trade]) { release(t); return; }
  if (t.fetch) { t.state = 'walk'; if (moveTo(t, STORE.x, STORE.y + 22, sp)) { t.fetch = false; t.carry = true; } return; }
  if (!moveTo(t, r.x + t.ox, r.y + t.oy, sp)) { t.state = 'walk'; tire(t.sprint > s.clock ? .35 : .1); return; }
  if (t.carry) { t.carry = false; if (j.ps === 'tech') j.ps = 'onsite'; }
  if (t.temp && j.part && j.ps === 'none' && j.type === 'fault' && j.mode === 'full') { spend(s, 'contract', Math.round(SKU[j.part][2] * 1.3)); j.ps = 'onsite'; }
  r.crew++;
  const mine = s.seat === 'tech' && t.id === s.me;
  if (mine) { // you lock the ride out, then work out what is wrong
    if ((!t.lk || t.lk.id !== r.id) && !(j.pads || []).includes(t.id)) { t.state = 'prep'; return; }
    if (t.lk && t.lk.id === r.id && t.lk.until > s.clock) { t.state = 'lock'; return; }
    if (j.type === 'fault' && !j.dx) { t.state = t.stall > s.clock ? 'check' : 'diag'; return; }
  }
  if (j.type === 'service') { if (j.ps !== 'onsite') { t.state = 'wait'; return; } j.started = true; }
  const cap = partReady(j) ? need(j) : .3 * j.work;
  if (!mine && !(j.pads || []).includes(t.id)) (j.pads = j.pads || []).push(t.id); // everyone puts their own padlock on before touching it
  if (!j.lead) j.lead = t.id;
  if (j.prog < cap) { j.prog += rate(s, t, j.trade) * (mine && j.ftf ? 1.25 : 1) * (s.prio === r.id ? 1.15 : 1); t.state = 'work'; j.dx = 1; tire(t.push > s.clock ? .9 : .55);
    if (!t.temp && !t.agency && !mine) { const w = t.en < 20 ? (20 - t.en) / 20 * .003 : 0, c = s.comp > 60 ? (s.comp - 60) / 40 * .001 : 0; t.riskW = (t.riskW || 0) + w; t.riskC = (t.riskC || 0) + c; t.risk = (t.risk || 0) + w + c; } }
  else t.state = 'wait';
  if (partReady(j) && j.prog >= need(j)) complete(s, r);
}
function storeStep(s, t) {
  const sp = speed(s) * 1.4;
  if (t.dest) {
    const r = ride(s, t.dest), j = r && r.job;
    if (!j || j.ps !== 'run') { t.dest = null; t.state = 'back'; return; }
    t.state = 'run'; if (moveTo(t, r.x - 24, r.y + 24, sp)) { j.ps = 'onsite'; t.dest = null; t.state = 'back'; }
    return;
  }
  if (!moveTo(t, STORE.x, STORE.y, sp)) { t.state = 'back'; return; }
  t.state = 'idle';
  const r = s.rides.find(r => r.job && r.job.ps === 'res' && s.crew.some(c => c.target === r.id && c.on));
  if (r) { r.job.ps = 'run'; t.dest = r.id; }
}
function logistics(s) {
  const storeOn = onNow(s, 'store');
  for (const r of s.rides) {
    const j = r.job; if (!j || !j.part) continue;
    const wants = j.type === 'service' || j.mode === 'full';
    const on = s.crew.filter(c => c.target === r.id && c.on);
    if (!wants) { if (j.ps === 'res') { s.stock[j.part]++; j.ps = 'none'; } continue; }
    if (j.ps === 'none' && on.length && s.stock[j.part] > 0) { s.stock[j.part]--; j.ps = 'res'; }
    if (j.ps === 'tech' && !on.some(c => c.fetch || c.carry)) j.ps = 'res';
    if (j.ps === 'run' && !s.crew.some(c => c.role === 'store' && c.on && c.dest === r.id)) j.ps = 'res';
    if (j.ps === 'res' && on.length && !storeOn) { (on.find(c => !c.temp) || on[0]).fetch = true; j.ps = 'tech'; }
  }
}
const incoming = (s, sku) => s.inbound.some(o => o.sku === sku && o.at) || s.fab.some(f => f.sku === sku);
function supStep(s) { // whoever is running the shift sends people to work; with nobody running it, people pick jobs up themselves, slowly
  if (s.clock % 2 || s.seat === 'sup') return;
  const P = s.pol, m = me(s), supOn = onNow(s, 'sup');
  if (!P.auto && !m) return; // you said you would dispatch yourself
  const lagOf = r => r.id === s.prio ? 0 : (r.job.lag || 6) + (supOn ? 0 : 10), woOpen = s.inbox.some(i => i.k === 'wo');
  const padded = new Set(); for (const r of s.rides) if (r.so) for (const id of r.so.pads) padded.add(id); // a good supervisor lets people go back for their padlocks first
  const free = tr => s.crew.filter(c => c.role === 'tech' && c.on && !c.temp && !c.target && !c.post && !padded.has(c.id) && !(c.hurt > s.clock) && (tr === '*' || c.skills[tr] && !c.talk && !(c.brk && enOf(c) < 60)) && !(c === m && (woOpen || !supOn)));
  const dist = (c, r) => Math.hypot(c.x - r.x, c.y - r.y);
  // stranded guests first: anyone at all can get them down
  for (const r of s.rides) {
    const j = r.job; if (!j || !j.rescue || j.wo || s.clock - j.t0 < (supOn ? 2 : 6)) continue;
    if (s.crew.some(c => c.on && c.role === 'tech' && (c.target === r.id || (c.post && Math.hypot(c.post.x - r.x, c.post.y - r.y) < 60)))) continue;
    const f = free('*').sort((a, b) => dist(a, r) - dist(b, r))[0]; if (!f) continue;
    if (f === m) { workOrder(s, r, true); continue; }
    if (f.skills[j.trade]) assign(s, f, r, null, true); else moveOrder(s, f, r.x + f.ox, r.y + f.oy, true);
    sprint(s, f);
  }
  if (supOn) for (const c of s.crew) if (c.state === 'wait' && c.target && !c.temp && c !== m) { const j = ride(s, c.target).job; if (j && j.type === 'fault' && j.ps === 'none' && s.stock[j.part] < 1) { j.pads = (j.pads || []).filter(id => id !== c.id); release(c); } } // stood down to wait for the part: they take their own padlock off as they go
  const jobs = s.rides.filter(r => r.job && r.job.type === 'fault' && !r.job.wo && s.clock - r.job.t0 >= lagOf(r) && !s.crew.some(c => c.target === r.id)).sort((a, b) => (b.id === s.prio) - (a.id === s.prio) || ((!a.sub) - (!b.sub) ? (!b.sub) - (!a.sub) : (b.job.sev === 'major') - (a.job.sev === 'major') || b.w - a.w));
  for (const r of jobs) {
    const j = r.job;
    if (supOn && j.mode === 'full' && j.part && j.ps === 'none' && s.stock[j.part] < 1) {
      if (P.nopart === 'patch' && !j.lock && s.focus !== 'safety') j.mode = 'patch';
      else { if (P.nopart === 'express' && !incoming(s, j.part) && s.freeze !== s.day && !budgetWait(s) && price(s, j.part, 'exp') <= LIMIT.sup) order(s, j.part, 'exp'); if (j.prog >= .3 * j.work) continue; }
    }
    const f = free(j.trade).filter(c => !(j.skip || []).includes(c.id)); if (!f.length) continue;
    if (supOn) f.sort((a, b) => (b.skills[j.trade] * 60 - dist(b, r) / 6) - (a.skills[j.trade] * 60 - dist(a, r) / 6));
    else f.sort((a, b) => dist(a, r) - dist(b, r));
    if (f[0] === m) { workOrder(s, r); continue; }
    assign(s, f[0], r, null, true);
  }
  // a good supervisor puts a second pair of hands on a breakdown when someone is close by, and pushes on power cuts
  if (supOn) for (const r of s.rides) {
    const j = r.job; if (!j || j.type !== 'fault' || j.sev !== 'major' || !partReady(j) && j.ps === 'none') continue;
    const on = s.crew.filter(c => c.target === r.id && c.on); if (on.length !== 1) continue;
    const f = free(j.trade).filter(c => c !== m && (r.id === s.prio || dist(c, r) < 420)).sort((a, b) => dist(a, r) - dist(b, r))[0];
    if (f) { assign(s, f, r, null, true); if (!r.sub || r.id === s.prio) { pushOn(s, f); pushOn(s, on[0]); } }
  }
  // a rush job gets every qualified person who is free, and the supervisor pushes them
  if (s.prio) { const r = ride(s, s.prio), j = r && r.job; if (j && j.type === 'fault') for (const c of s.crew.filter(c => c.target === r.id && c.on && !c.temp)) if (c.state === 'work') pushOn(s, c); }
  // tired people are sent for a break when nothing in their trade is waiting
  if (supOn) for (const c of s.crew) if (c.role === 'tech' && c.on && !c.temp && !c.agency && !c.target && !c.post && !c.brk && !c.talk && c !== m && enOf(c) < 35 && (!s.rides.some(r => r.job && r.job.type === 'fault' && c.skills[r.job.trade] && !s.crew.some(x => x.target === r.id)) || free('*').some(x => x !== c && enOf(x) >= 55 && Object.keys(c.skills).some(k => x.skills[k])))) rest(s, c, true);
  for (const r of s.rides) if (r.svcReq && !r.job && s.stock.kit > 0) { const f = free(primary(r)).filter(x => x !== m).sort((a, b) => dist(a, r) - dist(b, r))[0]; if (f && assign(s, f, r, null, true) === true) r.svcReq = false; }
  if (supOn && P.pm && s.clock < 1140 && s.rides.filter(r => r.job && r.job.type === 'service').length < 2) {
    const vipSoon = r => s.events.some(e => e.k === 'vip' && !e.done && e.ride === r.id && e.at - s.clock < 100);
    const reserved = s.rides.filter(r => r.job && r.job.type === 'service' && r.job.ps === 'none').length;
    const c = s.rides.filter(r => !r.job && (r.health < P.pm || r.warnAt) && !vipSoon(r) && status(s, r) !== 'nopower').sort((a, b) => a.health - b.health)[0];
    if (c && s.stock.kit - reserved > 0) { const f = free(primary(c)).filter(x => x !== m); if (f.length) assign(s, f[0], c, null, true); }
  }
}
function doEvent(s, e) {
  if (e.k === 'vip') {
    const r = ride(s, e.ride);
    if (!e.warned && s.clock >= e.at - 90) { e.warned = true; log(s, `A VIP party rides ${r.name} at ${fmtClock(e.at)}. Have it running properly.`, 'event'); }
    if (s.clock >= e.at) {
      e.done = true; e.ok = status(s, r) === 'ok'; s.d.vip = e.ok;
      if (e.ok) { s.cash += 400; s.d.bonus += 400; s.glow = Math.min(100, s.glow + 6); log(s, `The VIP party loved ${r.name}. The owner adds a $400 bonus.`, 'good'); fx(s, 'cash', r.id, '+$400'); }
      else { s.glow = Math.max(0, s.glow - 8); log(s, `The VIP party found ${r.name} out of action.`, 'bad'); fx(s, 'minor', r.id, 'VIP let down'); }
    }
  } else if (e.k === 'insp' && s.clock >= e.at) {
    e.done = true;
    const tagged = s.rides.filter(r => r.patched && !r.job);
    for (const r of tagged) { r.patched = false; createFault(s, r, { title: 'Red-tagged by the inspector', sev: 'major', trade: primary(r), lock: true }); }
    e.n = tagged.length; s.d.insp = tagged.length === 0; s.safety.tags += tagged.length;
    if (tagged.length) { const fine = Math.round(400 * tagged.length * s.m.fine); s.cash -= fine; s.d.bonus -= fine; log(s, `The inspector red-tagged ${tagged.length} patched ride${tagged.length > 1 ? 's' : ''} and fined you ${fmtMoney(fine)}. Only a full repair reopens ${tagged.length > 1 ? 'them' : 'it'}.`, 'bad'); }
    else { s.cash += 300; s.d.bonus += 300; log(s, 'The inspector found no patched rides. Clean sheet bonus: $300.', 'good'); fx(s, 'cash', null); }
  }
}

/* ---------- the chain of command ----------
   Every request belongs to a level. It goes to whoever holds that seat; if the post is empty it climbs to the next one up.
   If that is the seat you are playing, it lands in your inbox with a timer. Otherwise the computer answers for that person. */
const FOCUS = { uptime: 'Keep the rides running', cost: 'Keep costs down', safety: 'Safety first' };
const WALK = { sup: ['Toolbox talk', 'Every free person stops for 8 minutes. Alertness up by the share who attend.', 150, 0], mgr: ['Walk the floor', 'Morale +6, crew more alert. You are away from your desk for 20 min.', 240, 20], dir: ['Department review', 'Office morale +4, crew morale +2. Away from your desk for 30 min.', 300, 30], ceo: ['Walk the park', 'Glow +4, office morale +3. Away from your desk for 30 min.', 300, 30] };
const filled = (s, x) => x === 'sup' ? onNow(s, 'sup') : x === 'mgr' ? has(s, 'eng') : x === 'dir' ? !!((s.org.opsdir || 0) + (s.org.engdir || 0)) : true;
function handler(s, lvl) { for (let i = RANK[lvl]; i < LV.length; i++) { const x = LV[i]; if (x === s.seat || filled(s, x)) return x; } return 'ceo'; }
function holder(s, x) { // who sits in a seat, as the crew would say it
  if (x === s.seat) return 'You';
  if (x === 'sup') { const p = s.crew.find(t => t.role === 'sup' && t.on) || s.crew.find(t => t.role === 'sup'); return p ? p.name : 'The supervisor'; }
  if (x === 'mgr') { const p = s.crew.find(t => t.role === 'eng'); return p ? p.name : 'The Engineering Manager'; }
  if (x === 'dir') return 'The Operations Director';
  if (x === 'ceo') return 'The chief executive';
  return 'The board';
}
const Who = (w, verb) => w + ' ' + verb;
const me = s => s.seat === 'tech' ? staff(s, s.me) : null;
const maintSpend = s => { const d = s.d; if (s.phase !== 'day') return d.wages + d.ot + d.parts + d.contract - (d.mkt || 0);
  return s.crew.filter(t => !t.temp).reduce((a, t) => a + wage(t) + (t.shift === 'full' && !isMgr(t) && !t.sick ? otCost(t) : 0), 0) + d.parts + d.contract - (d.mkt || 0); };
// while the overspend question waits for an answer (in your inbox or escalated), nothing more is spent
const budgetWait = s => s.inbox.some(i => i.k === 'budget') || s.asks.some(a => a.esc && a.it.k === 'budget');
const spendOk = (s, cost, extra) => s.freeze === s.day ? 'spending is on hold for the rest of today' : budgetWait(s) ? 'the overspend is waiting for a decision' : s.cash < cost + extra ? 'cash is too tight' : true;
function helper(s, r, tr) { // the nearest free, qualified person who is not you
  const m = me(s); tr = tr || (r.job ? r.job.trade : primary(r));
  return s.crew.filter(c => c.role === 'tech' && c.on && !c.temp && !c.target && !c.post && !(c.hurt > s.clock) && c.skills[tr] && c !== m)
    .sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y))[0] || null;
}
function bestCand(s, role) { let bi = -1, bg = 0; s.cands.forEach((c, i) => { if (c.gone) return; const ok = TRADES[role] ? c.role === 'tech' && c.skills[role] : c.role === role; if (ok && c.grade > bg) { bi = i; bg = c.grade; } }); return bi; }
function setSeat(s, x, id) {
  if (!(x in RANK)) return false;
  if (x === 'tech') { const ok = c => c && c.role === 'tech' && !c.temp && !c.agency, t = staff(s, id) || staff(s, s.me); const p = ok(t) ? t : s.crew.find(c => ok(c) && c.on) || s.crew.find(ok); if (!p) return false; s.me = p.id; }
  const old = s.inbox; s.inbox = []; s.seat = x;
  for (const it of old) { // anything waiting goes to whoever holds that level now
    if (it.k === 'wo' || it.lvl === 'tech') { const r = ride(s, it.rid); if (r && r.job && r.job.wo === it.id) r.job.wo = 0; continue; }
    const h = handler(s, it.lvl); it.h = h;
    if (h === s.seat) s.inbox.push(it); else if (REQ[it.k].ai !== false) settle(s, it, REQ[it.k].pick(s, it), false, false);
  }
  log(s, `You are now in the ${x === 'tech' ? 'technician\'s seat as ' + staff(s, s.me).name : SEATNAME[x] + '\'s seat'}.`, 'event');
  return true;
}
function overHead(s) { // a senior seat ordering the crew about while the supervisor is running the shift
  if (RANK[s.seat] < 2 || !onNow(s, 'sup') || !s.pol.auto || s.phase !== 'day' || s.clock < (s.d.overAt || 0)) return;
  const sv = s.crew.find(t => t.role === 'sup' && t.on); if (!sv) return;
  s.d.overAt = s.clock + 10; sv.morale = clamp(sv.morale - 2, 0, 100); s.sc[s.seat].over++;
  if (!s.d.overLog) { s.d.overLog = 1; log(s, `You went over ${sv.name}'s head and gave the crew orders yourself. Each time it knocks ${sv.name}'s morale, and the crew learn to wait for you.`, 'bad'); }
}

/* asking up the chain when your seat cannot do something */
const ASK = {
  help: { min: 'sup', check(s, o) { const r = ride(s, o.rid); if (!r || !r.job) return 'the job is already finished'; return helper(s, r) ? true : 'nobody is free to help right now'; },
    run(s, o) { const r = ride(s, o.rid), h = helper(s, r); o.name = h.name; assign(s, h, r, null, true); }, yes: (s, o) => `${o.name} is on the way` },
  patch: { min: 'sup', check(s, o) { const j = (ride(s, o.rid) || {}).job; if (!j || j.type !== 'fault') return 'the job is already finished'; if (j.lock) return 'it is red-tagged, so only a full repair will do'; if (s.focus === 'safety') return 'safety comes first today, so no patches'; if (s.forecast.memo === 'nopatch') return 'the board asked for no patches today'; return true; },
    run(s, o) { setMode(s, ride(s, o.rid), 'patch'); }, yes: () => 'patch it and move on' },
  express: { min: 'sup', cost: (s, o) => price(s, o.sku, 'exp'), check(s, o, c) { if (incoming(s, o.sku)) return 'one is already on its way'; if (s.stock[o.sku] > 0) return 'there is one on the shelf'; if (s.phase !== 'day' || expressEta(s) > CLOSE - 10) return 'it is too late in the day for the courier'; if (s.focus === 'cost' && c > 600) return 'costs come first today, so wait for the standard delivery'; return spendOk(s, c, 1500); },
    run(s, o) { order(s, o.sku, 'exp'); }, yes: (s, o) => `an express ${SKU[o.sku][0].toLowerCase()} is ordered` },
  callout: { min: 'mgr', cost: s => calloutCost(s), check(s, o, c) { const r = ride(s, o.rid); if (!r || !r.job || r.job.type !== 'fault') return 'the job is already finished'; if (s.crew.some(t => t.temp && t.target === r.id)) return 'a contractor is already coming'; const h = helper(s, r); if (h) return `${h.name} is free, so use them`; if (s.focus === 'cost' && r.sub && r.job.sev !== 'major') return 'costs come first today'; return spendOk(s, c, 2500); },
    run(s, o) { callout(s, ride(s, o.rid)); }, yes: (s, o) => `a contractor is coming for ${ride(s, o.rid).short}` },
  stay: { min: 'sup', cost: s => { const t = me(s); return t ? otCost(t) : 0; }, check(s) { const t = me(s); if (!t || t.shift !== 'early' || !t.on) return 'you are not on the early shift'; if (s.focus === 'cost' && !t.target) return 'not without a job to finish'; return true; },
    run(s) { holdOver(s, me(s)); }, yes: () => 'stay on until 22:00 on overtime' },
  service: { min: 'sup', check(s, o) { const r = ride(s, o.rid); if (!r || r.job) return 'it already has a job open'; if (s.stock.kit < 1) return 'there are no service kits in stores'; return helper(s, r) ? true : 'nobody else is free, so service it yourself when you can'; },
    run(s, o) { const r = ride(s, o.rid), h = helper(s, r); o.name = h.name; assign(s, h, r, null, true); s.sc.tech.reports++; }, yes: (s, o) => `${o.name} will service ${ride(s, o.rid).short}` },
  ot: { min: 'mgr', cost: (s, o) => o.cost || 0, check(s, o, c) { if (!Array.isArray(o.tids) || !o.tids.some(id => staff(s, id))) return 'there is nobody to keep on'; if (s.clock >= SHIFT.early[1] - 1) return 'the early shift has already gone home'; if (s.focus === 'cost' && c > 600) return 'costs come first today'; return spendOk(s, c, 1000); },
    run(s, o) { o.names = o.tids.map(id => staff(s, id)).filter(t => t && holdOver(s, t)).map(t => t.name); }, yes: (s, o) => `${(o.names || []).join(' and ') || 'nobody'} can stay on until 22:00` },
  crowd: { min: 'dir', cost: () => 250, check(s, o, c) { if (s.clock < s.cdC) return 'there was one recently'; return spendOk(s, c, 1000); }, run(s) { crowdPleaser(s); }, yes: () => 'buskers and ice cream are on the midway' },
  // at the planning desk
  hire: { min: 'mgr', cost: s => hireFee(s), check(s, o, c) { if (bestCand(s, o.tr) < 0) return 'there is nobody suitable on tonight\'s list'; if (s.crew.length >= 14) return 'the crew is big enough for now'; return spendOk(s, c, 4000); },
    run(s, o) { const i = bestCand(s, o.tr); o.name = s.cands[i].name; hire(s, i); }, yes: (s, o) => `${o.name} starts tomorrow` },
  perk: { min: 'dir', cost: (s, o) => perkCost(s, o.k), check(s, o, c) { if (s.up[o.k]) return 'it is already in place'; return spendOk(s, c, c + 4000); }, run(s, o) { buyPerk(s, o.k); }, yes: (s, o) => `${PERKS[o.k][0].toLowerCase()} is approved` },
  ovh: { min: 'dir', cost: s => ovhCost(s), check(s, o, c) { const r = ride(s, o.rid); if (!r || r.ovh >= 2) return 'it cannot be overhauled again'; if (r.health > 70) return 'it is in good enough shape'; return spendOk(s, c, c + 4000); }, run(s, o) { overhaul(s, ride(s, o.rid)); }, yes: (s, o) => `${ride(s, o.rid).name} goes in for an overhaul tonight` },
  org: { min: 'ceo', cost: s => orgFee(s), check(s, o) { const p = ORGX[o.id]; if (!p || (s.org[o.id] || 0) >= p[5]) return 'the post is already filled'; return s.cash < p[4] * 10 + 8000 ? 'we cannot carry another salary yet' : true; }, run(s, o) { hireOrg(s, o.id); }, yes: (s, o) => `a ${ORGX[o.id][1]} will be recruited` },
};
function decider(s, min, cost) { // the lowest seat above yours that can say yes to this, skipping empty posts
  let layers = 0;
  const empty = [];
  for (let i = Math.max(RANK[s.seat] + 1, RANK[min]); i < LV.length; i++) { const x = LV[i]; layers++; if (LIMIT[x] >= cost && filled(s, x)) return { x, layers, empty }; if (LIMIT[x] >= cost && x !== 'sup') empty.push(x); }
  return { x: cost > LIMIT.ceo ? 'board' : 'ceo', layers: Math.max(1, layers), empty };
}
function ask(s, k, o) {
  const A = ASK[k]; if (!A) return 'Unknown request';
  o = Object.assign({}, o);
  const cost = A.cost ? A.cost(s, o) : 0, d = decider(s, A.min, cost);
  if (s.asks.some(a => a.k === k && a.o.rid === o.rid && a.o.sku === o.sku && a.o.k === o.k && a.o.tr === o.tr && a.o.id === o.id)) return 'Already asked. Waiting for an answer.';
  const it = { id: ++s.rq, k, o, x: d.x, cost, at: s.clock, due: d.x === 'board' ? CLOSE : s.clock + ESC_DELAY[d.x], empty: d.empty };
  s.sc[s.seat].asks++;
  if (d.x === 'board') { it.day = s.phase === 'day' ? s.day : s.day + 1; s.boardQ.push(it); log(s, `That needs the board: it answers at the end of ${it.day === s.day ? 'today' : 'tomorrow'}.`, 'info'); return true; }
  if (s.phase !== 'day') return decideAsk(s, it);
  s.asks.push(it); return true;
}
// a boss turns down spending the day cannot afford, unless the ride really matters today
function weakAsk(s, it) {
  if (!it.cost || s.phase !== 'day') return '';
  const r = it.o && it.o.rid && ride(s, it.o.rid), key = r && (s.prio === r.id || (r.job && (r.job.rescue || (r.job.sev === 'major' && r.w >= 7))));
  if (maintSpend(s) + it.cost > s.budget * .9 && !key) return `the budget is nearly spent and ${r ? r.short + ' is' : 'this is'} not a priority today`;
  return '';
}
function decideAsk(s, it) {
  const A = ASK[it.k], who = holder(s, it.x), why = weakAsk(s, it) || A.check(s, it.o, it.cost);
  const via = it.empty && it.empty.length ? ` (the ${it.empty.map(x => SEATNAME[x]).join(' and ')} post${it.empty.length > 1 ? 's are' : ' is'} empty, so it went up to them)` : '';
  if (why !== true) { const t = `${who} said no${via}: ${why}.`; log(s, t, 'bad'); return t; }
  A.run(s, it.o, it.cost); const t = `${who} said yes${via}: ${A.yes(s, it.o)}.`; log(s, t, 'good'); fx(s, 'ready', it.o.rid || null, 'Approved');
  return t;
}

/* requests that come to a seat */
const OPT = (v, b, sub, go) => ({ v, b, sub: sub || '', go: !!go });
const REQ = {
  // the supervisor to you, the technician
  wo: { lvl: 'tech', ai: false, def: 'no',
    stale: (s, it) => { const r = ride(s, it.rid), t = me(s); return !r || !r.job || !t || !t.on || t.target === it.rid; },
    opts(s, it) { const t = me(s), r = ride(s, it.rid); return [OPT('go', 'On my way', t ? Math.ceil(Math.hypot(t.x - r.x, t.y - r.y) / speed(s)) + ' min walk' : '', true), OPT('no', 'Can\'t now', 'Someone else gets it')]; },
    res(s, it, v, who, late) { const r = ride(s, it.rid), t = me(s); if (r.job && r.job.wo === it.id) r.job.wo = 0;
      if (v === 'go') { s.sc.tech.woOk++; if (it.rescue && !t.skills[r.job.trade]) { moveOrder(s, t, r.x + t.ox, r.y + t.oy, true); sprint(s, t); } else { assign(s, t, r, null, true); if (it.rescue) sprint(s, t); } return ''; }
      (r.job.skip = r.job.skip || []).push(t.id); if (late) { s.sc.tech.woLate++; return `No answer from you, so ${it.from} gave ${r.short} to someone else.`; } return ''; } },
  stay: { lvl: 'tech', ai: false, def: 'go', opts: (s, it) => [OPT('yes', 'Stay on', fmtMoney(it.cost) + ' overtime, tired tomorrow', true), OPT('go', 'Go home at 17:00')],
    res(s, it, v) { if (v === 'yes' && holdOver(s, me(s))) return 'You are staying on until 22:00 on overtime.'; return ''; } },
  // the crew to the supervisor
  help: { lvl: 'sup', def: 'no', stale: (s, it) => { const r = ride(s, it.rid); return !r || !r.job || s.crew.filter(c => c.target === it.rid).length > 1; },
    opts(s, it) { const h = helper(s, ride(s, it.rid)); return [OPT('send', 'Send help', h ? `${h.name}, ${Math.ceil(Math.hypot(h.x - ride(s, it.rid).x, h.y - ride(s, it.rid).y) / speed(s))} min away` : 'Nobody free right now', true), OPT('no', 'Carry on alone')]; },
    pick: (s, it) => helper(s, ride(s, it.rid)) ? 'send' : 'no',
    res(s, it, v, who) { const r = ride(s, it.rid); if (v !== 'send') return ''; const h = helper(s, r); if (!h) return `Nobody was free to help on ${r.short}.`; assign(s, h, r, null, true); return `${Who(who, 'sent')} ${h.name} to help on ${r.short}.`; } },
  part: { lvl: 'sup', ai: false, def: 'wait', stale: (s, it) => { const j = (ride(s, it.rid) || {}).job; return !j || j.type !== 'fault' || j.mode !== 'full' || s.stock[j.part] > 0 || incoming(s, j.part); },
    opts(s, it) { const j = ride(s, it.rid).job, c = price(s, j.part, 'exp'), o = []; if (!j.lock) o.push(OPT('patch', 'Patch it', 'No part, fails again sooner')); o.push(OPT('exp', c > LIMIT[it.h] ? `Ask ${holder(s, BOSS[it.h]).replace('The ', 'the ')}` : 'Express it', `${fmtMoney(c)}${c > LIMIT[it.h] ? ', over your limit' : ', in by ' + fmtClock(expressEta(s))}`, true)); o.push(OPT('wait', 'Wait for stock')); return o; },
    res(s, it, v) { const r = ride(s, it.rid), j = r.job;
      if (v === 'patch') { setMode(s, r, 'patch'); return `${r.short}: patch it and move on.`; }
      if (v === 'exp') { if (price(s, j.part, 'exp') > LIMIT[it.h]) { ask(s, 'express', { rid: r.id, sku: j.part }); return `${r.short}: the express part is over your spending limit, so you asked ${holder(s, BOSS[it.h])}.`; } order(s, j.part, 'exp'); return ''; }
      j.eq = 1; return ''; } },
  hold: { lvl: 'sup', def: 'go', stale: s => s.clock >= SHIFT.early[1],
    opts: (s, it) => [OPT('yes', 'Keep them on', fmtMoney(it.cost) + ' overtime', true), OPT('go', 'Let them go', 'Jobs wait for the late shift')],
    pick: (s, it) => s.focus !== 'cost' && s.cash > 2000 && it.tids.some(id => { const t = staff(s, id), r = t && t.target && ride(s, t.target); return r && r.job && r.job.type === 'fault'; }) ? 'yes' : 'go',
    res(s, it, v, who) { if (v !== 'yes') return '';
      if (it.cost > LIMIT.sup && RANK[it.h] < RANK.mgr) { // over the supervisor's limit: the manager countersigns, and until then nobody stays
        if (who === 'You') { ask(s, 'ot', { tids: it.tids, cost: it.cost }); const a = s.asks[s.asks.length - 1]; return a && a.k === 'ot' ? `Overtime for ${it.tids.length > 1 ? 'them' : 'them'} is ${fmtMoney(it.cost)}, over your ${fmtMoney(LIMIT.sup)}: waiting for ${seatWho(s, a.x)}, about ${a.due - s.clock} min.` : ''; }
        if (handler(s, 'mgr') === s.seat) { raise(s, 'otsign', { tids: it.tids, cost: it.cost, cs: 1, from: who, due: Math.min(s.clock + 15, SHIFT.early[1] - 2), txt: `${who} wants to keep ${it.tids.map(id => (staff(s, id) || {}).name).filter(Boolean).join(' and ')} on overtime to finish their jobs: ${fmtMoney(it.cost)}, over the supervisor's limit. Countersign?` }); return ''; }
      }
      const n = it.tids.map(id => staff(s, id)).filter(t => t && holdOver(s, t)); return n.length ? `${Who(who, 'kept')} ${n.map(t => t.name).join(' and ')} on overtime to finish.` : ''; } },
  otsign: { lvl: 'mgr', def: 'no', stale: s => s.clock >= SHIFT.early[1],
    opts: (s, it) => [OPT('yes', 'Countersign', fmtMoney(it.cost) + ' overtime', true), OPT('no', 'Refuse', 'They go home at 17:00, jobs wait')],
    pick: (s, it) => ASK.ot.check(s, it, it.cost) === true && !weakAsk(s, { cost: it.cost, o: {} }) ? 'yes' : 'no',
    res(s, it, v, who) { if (v !== 'yes') return who === 'You' ? '' : `${who} refused the overtime.`; const n = it.tids.map(id => staff(s, id)).filter(t => t && holdOver(s, t)); return n.length ? `${Who(who, 'countersigned')} overtime for ${n.map(t => t.name).join(' and ')}.` : ''; } },
  defect: { lvl: 'sup', ai: false, def: 'no', stale: (s, it) => { const r = ride(s, it.rid), t = staff(s, it.tid); return !r || !!r.job || !t || !t.on || !!t.target; },
    opts: () => [OPT('yes', 'Service it', 'Uses a kit, closed about 45 min', true), OPT('no', 'Not now')],
    res(s, it, v) { if (v !== 'yes') return ''; const r = ride(s, it.rid), t = staff(s, it.tid); return assign(s, t, r, null, true) === true ? `${t.name} is servicing ${r.short}.` : ''; } },
  squall: { lvl: 'sup', def: 'no', stale: (s, it) => s.clock >= it.due,
    opts: () => [OPT('yes', 'Stand by', 'Free crew to the plaza', true), OPT('no', 'Carry on')], pick: () => 'yes',
    res(s, it, v, who) { if (v !== 'yes') return ''; standBy(s); return `${Who(who, 'stood')} the free crew by in the middle of the park for the squall.`; } },
  // up to the manager
  callout: { lvl: 'mgr', def: 'no', stale: (s, it) => { const r = ride(s, it.rid); return !r || !r.job || r.job.type !== 'fault' || s.crew.some(c => c.target === it.rid); },
    opts: (s, it) => [OPT('yes', 'Call a contractor', fmtMoney(it.cost) + ' plus parts, here in 45 min', true), OPT('no', 'Wait for our crew')],
    pick: (s, it) => ASK.callout.check(s, { rid: it.rid }, it.cost) === true && !weakAsk(s, { cost: it.cost, o: { rid: it.rid } }) ? 'yes' : 'no',
    res(s, it, v, who) { const r = ride(s, it.rid); if (v !== 'yes' || !callout(s, r)) return ''; return who === 'You' ? '' : `${who} approved a contractor for ${r.short}.`; } },
  express: { lvl: 'mgr', def: 'wait', stale: (s, it) => { const j = (ride(s, it.rid) || {}).job; return !j || j.type !== 'fault' || j.mode !== 'full' || j.part !== it.sku || s.stock[it.sku] > 0 || incoming(s, it.sku); },
    opts(s, it) { const j = ride(s, it.rid).job, o = [it.cost > LIMIT[it.h] ? OPT('up', 'Pass it up', `Over your ${fmtMoney(LIMIT[it.h])} limit`, true) : OPT('yes', 'Approve', `${fmtMoney(it.cost)}, in by ${fmtClock(expressEta(s))}`, true)]; if (!j.lock) o.push(OPT('patch', 'Patch instead')); o.push(OPT('wait', 'Wait for stock')); return o; },
    pick: (s, it) => ASK.express.check(s, { sku: it.sku }, it.cost) === true && !weakAsk(s, { cost: it.cost, o: { rid: it.rid } }) ? 'yes' : !ride(s, it.rid).job.lock && s.focus !== 'safety' && s.forecast.memo !== 'nopatch' ? 'patch' : 'wait',
    res(s, it, v, who) { const r = ride(s, it.rid);
      if (v === 'yes') { if (order(s, it.sku, 'exp') !== true) return ''; return `${Who(who, 'approved')} an express ${SKU[it.sku][0].toLowerCase()} for ${r.short}.`; }
      if (v === 'up') { ask(s, 'express', { rid: r.id, sku: it.sku }); return `You passed the express order for ${r.short} up to ${holder(s, BOSS[s.seat])}.`; }
      if (v === 'patch') { setMode(s, r, 'patch'); return `${Who(who, 'told')} the crew to patch ${r.short}.`; }
      r.job.eq = 1; return ''; } },
  morale: { lvl: 'mgr', def: 'no', stale: (s, it) => !staff(s, it.tid),
    opts: () => [OPT('yes', 'One-to-one', 'Morale +12', true), OPT('no', 'Not today', 'Morale −3')], pick: s => has(s, 'eng') || has(s, 'hr') ? 'yes' : 'no',
    res(s, it, v, who) { const t = staff(s, it.tid); if (v === 'yes') { t.morale = clamp(t.morale + 12, 0, 100); if (who === 'You') s.sc[s.seat].oneone = (s.sc[s.seat].oneone || 0) + 1; return `${Who(who, 'sat')} down with ${t.name} for a one-to-one. Morale now ${Math.round(t.morale)}.`; } t.morale = clamp(t.morale - 3, 0, 100); return who === 'You' ? `${t.name} feels brushed off.` : ''; } },
  // up to the director
  vip: { lvl: 'dir', def: 'open', stale: (s, it) => { const r = ride(s, it.rid); return !r || !!r.job || s.clock >= it.vat - 45; },
    opts: () => [OPT('svc', 'Service it now', 'Closed about 45 min, then 100%', true), OPT('open', 'Keep it open', 'Queues keep moving, risk a failure')], pick: (s, it) => ride(s, it.rid).health < 50 ? 'svc' : 'open',
    res(s, it, v, who) { const r = ride(s, it.rid); if (v !== 'svc') return ''; const h = helper(s, r, primary(r)); if (!h || s.stock.kit < 1) return `Nobody was free to service ${r.short} before the VIP party.`; assign(s, h, r, null, true); return `${Who(who, 'sided')} with Engineering: ${h.name} is servicing ${r.short} before the VIP party.`; } },
  budget: { lvl: 'dir', def: 'hold', opts: () => [OPT('ok', 'Approve the overspend', 'Keep fixing whatever it costs'), OPT('hold', 'Hold spending', 'No contractors or express parts today', true)], pick: s => s.focus === 'cost' ? 'hold' : 'ok',
    res(s, it, v, who) { if (v === 'hold') { s.freeze = s.day; return `${Who(who, 'put')} maintenance spending on hold for the rest of the day: no contractors or express parts.`; } return `${Who(who, 'approved')} the overspend.`; } },
  bigexp: { lvl: 'dir', def: 'no', stale: (s, it) => REQ.express.stale(s, it),
    opts(s, it) { const o = [OPT('yes', 'Approve', `${fmtMoney(it.cost)}, in by ${fmtClock(expressEta(s))}`, true)]; if (!ride(s, it.rid).job.lock) o.push(OPT('patch', 'Patch instead')); o.push(OPT('no', 'Refuse', 'Wait for the standard delivery')); return o; },
    pick: (s, it) => s.focus === 'uptime' && spendOk(s, it.cost, 5000) === true && !weakAsk(s, { cost: it.cost, o: { rid: it.rid } }) ? 'yes' : 'no',
    res(s, it, v, who) { if (v === 'no') { ride(s, it.rid).job.eq = 1; return ''; } return REQ.express.res(s, it, v, who); } },
  heat: { lvl: 'dir', def: 'no', opts: () => [OPT('yes', 'Approve', '$900, a third fewer electrical faults today', true), OPT('no', 'Refuse')], pick: s => s.cash > 6000 ? 'yes' : 'no',
    res(s, it, v, who) { if (v !== 'yes' || s.cash < 900) return ''; spend(s, 'contract', 900); s.cool = true; return `${Who(who, 'approved')} portable cooling for the substations.`; } },
  crowd: { lvl: 'dir', def: 'no', stale: s => s.clock < s.cdC, opts: () => [OPT('yes', 'Approve', '$250: glow +10, queues clear', true), OPT('no', 'Refuse')], pick: s => s.cash > 3000 ? 'yes' : 'no',
    res(s, it, v, who) { if (v === 'yes' && crowdPleaser(s)) return who === 'You' ? '' : `${who} approved buskers and ice cream on the midway.`; return ''; } },
  // up to the chief executive
  board: { lvl: 'ceo', def: 'miss', opts: () => [OPT('honest', 'Straight answer', 'What is broken and the plan', true), OPT('spin', 'Keep it upbeat', '+4 now; −10 tonight if the day goes badly'), OPT('later', 'Call back later', 'Confidence −1')], pick: () => 'honest',
    res(s, it, v, who) { const up = s.d.upW / Math.max(1, s.d.upT);
      if (v === 'honest') { const d = up >= .85 ? 2 : up >= .7 ? 0 : -1; s.conf = clamp(s.conf + d, 0, 100); return who === 'You' ? `The chair appreciated a straight answer.${d > 0 ? ' Board confidence +' + d + '.' : d < 0 ? ' She is worried. Board confidence −1.' : ''}` : ''; }
      if (v === 'spin') { s.conf = clamp(s.conf + 4, 0, 100); s.d.spin = 1; return 'The chair sounded pleased. Board confidence +4, for now.'; }
      if (v === 'later') { s.conf = clamp(s.conf - 1, 0, 100); return 'The chair did not enjoy being put off. Board confidence −1.'; }
      s.conf = clamp(s.conf - 4, 0, 100); return 'You missed the chair\'s call. Board confidence −4.'; } },
  press: { lvl: 'ceo', def: 'quiet', opts: () => [OPT('sorry', 'Apologise', '$600 in free tickets, glow +5', true), OPT('quiet', 'No comment', 'Glow −5, board confidence −3')], pick: s => s.cash > 2000 ? 'sorry' : 'quiet',
    res(s, it, v, who) { if (v === 'sorry') { s.cash -= 600; s.d.bonus -= 600; s.glow = Math.min(100, s.glow + 5); return `${Who(who, 'apologised')} in the paper and offered free return tickets. Glow +5.`; } s.glow = Math.max(0, s.glow - 5); s.conf = clamp(s.conf - 3, 0, 100); return '"No comment" made the evening paper. Glow −5, board confidence −3.'; } },
  sponsor: { lvl: 'ceo', def: 'no', opts: () => [OPT('yes', 'Accept', '$2,500 now, glow −2 every day after'), OPT('no', 'Decline', 'Keep the park unbranded', true)], pick: () => 'no',
    res(s, it, v) { if (v !== 'yes') return ''; s.spons = 1; s.cash += 2500; s.d.flat += 2500; mods(s); return 'The sponsor\'s cheque cleared: $2,500. Their logo goes up on the Lantern Wheel.'; } },
};
/* ---------- three kinds of decision ----------
   Operational: daily, guided by procedure and experience, at the front line. Tactical: middle management turning the direction into action.
   Strategic: executive, long-term, high stakes, touching staff, guests, suppliers and neighbours at once. */
const DTYPE = { otsign: 'tac', wo: 'op', stay: 'op', help: 'op', part: 'op', hold: 'op', defect: 'op', squall: 'op', callout: 'tac', express: 'tac', morale: 'tac', vip: 'tac', budget: 'tac', bigexp: 'tac', heat: 'tac', crowd: 'tac', board: 'str', press: 'str', sponsor: 'str', supplier: 'str', noise: 'str', pay: 'str', price: 'str' };
const STRATEGY = { uptime: ['The park that never stops', 'Guests spend 3% more. Managers lean towards paying to keep rides open.'], cost: ['Lean and profitable', 'Overheads 5% lower. Managers lean towards waiting and saving.'], safety: ['The safest park on the coast', 'Fines 40% smaller. Managers lean towards services and no patches.'] };
// which choices pull with which priority; a call that pulls against today's priority is wasted effort
const ALIGN = {
  part: { patch: ['uptime', 'cost'], exp: ['uptime', 'safety'], wait: ['cost', 'safety'] },
  callout: { yes: ['uptime', 'safety'], no: ['cost'] },
  express: { yes: ['uptime', 'safety'], patch: ['uptime', 'cost'], wait: ['cost', 'safety'] },
  bigexp: { yes: ['uptime', 'safety'], patch: ['uptime', 'cost'], no: ['cost', 'safety'] },
  budget: { ok: ['uptime', 'safety'], hold: ['cost'] },
  heat: { yes: ['uptime', 'safety'], no: ['cost'] },
};
const polAligned = s => { const P = s.pol; return s.focus === 'uptime' ? P.nopart === 'express' : s.focus === 'cost' ? P.nopart !== 'express' : P.nopart !== 'patch' && +P.pm >= 55; };
function setStrategy(s, k) {
  if (!STRATEGY[k] || s.phase !== 'plan' || k === s.strategy) return false;
  if (s.reports.length) { s.conf = clamp(s.conf - 5, 0, 100); s.cm = clamp(s.cm - 4, 0, 100); log(s, `New strategy: ${STRATEGY[k][0].toLowerCase()}. Changing course mid-season unsettles people: board confidence −5, office morale −4.`, 'bad'); }
  s.strategy = k; mods(s); return true;
}
function optsOf(s, it) { const Q = REQ[it.k], o = Q.opts(s, it); if (Q.info && !it.brief && it.due - s.clock > 7) o.push(OPT('brief', 'Ask for the figures', 'Uses 6 min of the time you have')); return o; }
const gutOk = (s, t, j) => !!t && j && j.gut != null && (t.skills[j.trade] || 0) + Math.floor(s.sc.tech.ftf / 4) >= 3;
function procedure(s) { // the written procedure rules one cause out; slower than experience, but it never guesses
  const t = me(s), r = t && t.target && ride(s, t.target), j = r && r.job;
  if (!j || !j.opts || j.dx || j.proc || t.state !== 'diag') return false;
  const wrong = j.opts.map((o, i) => i).filter(i => j.opts[i] !== j.ans && !(j.out || []).includes(i));
  if (!wrong.length) return false;
  j.proc = 1; j.ruled = [wrong[Math.floor(rnd(s) * wrong.length)]]; j.rd = t.stall = s.clock + 3; s.sc.tech.proc = (s.sc.tech.proc || 0) + 1; return true;
}
function toolbox(s, who, n) { s.comp = Math.max(0, s.comp - n); s.cdT = s.clock + 150; if (who) log(s, `${who} stopped the crew for a two-minute toolbox talk. Routine jobs are where people stop looking.`, 'info'); }
// consequences that arrive days after a strategic decision
const LATER = {
  council(s) { if (chance(s, .6)) { const c = Math.round(4000 * s.m.fine); s.cash -= c; s.d.bonus -= c; s.conf = clamp(s.conf - 6, 0, 100); s.glow = Math.max(0, s.glow - 4); log(s, `The council acted on the neighbours' noise complaint you set aside: a ${fmtMoney(c)} penalty and a story in the paper. Board confidence −6.`, 'bad'); } else log(s, 'The neighbours\' noise complaint went no further. This time.', 'info'); },
  resent(s) { const t = s.crew.filter(c => c.role === 'tech' && !c.temp).sort((a, b) => baseWage(b) - baseWage(a))[0]; if (t && chance(s, .5)) { for (const c of s.crew) if (!isMgr(c) && !c.temp) c.morale = clamp(c.morale - 8, 0, 100); log(s, `${t.name} has been offered more money by the pier down the coast and is telling everyone. The refused pay rise still stings: crew morale −8.`, 'bad'); } },
  claim(s) { if (chance(s, .6)) { const c = Math.round(14000 * s.m.fine); s.cash -= c; s.d.bonus -= c; s.glow = Math.max(0, s.glow - 6); s.conf = clamp(s.conf - 5, 0, 100); log(s, `The contested injury claim went against you: ${fmtMoney(c)} and a story in the paper. Board confidence −5.`, 'bad'); } else log(s, 'The contested injury claim was dropped.', 'good'); },
  pricey(s) { log(s, 'Guests have noticed the higher prices. The takings are up, and so are the grumbles at the gate.', 'info'); },
  latevan(s) { log(s, 'The exclusive supplier\'s van is slower than the old courier, as the stores team warned. Parts are cheaper all the same.', 'info'); },
};
Object.assign(REQ, {
  supplier: { lvl: 'ceo', def: 'no',
    info: s => { const spent = s.reports.reduce((a, r) => a + (r.pl ? Math.abs(r.pl.parts || 0) : 0), 0) / Math.max(1, s.reports.length) || 900; return `Finance: parts cost about ${fmtMoney(Math.round(spent))} a day, so 15% off saves roughly ${fmtMoney(Math.round(spent * .15 * (DAYS - s.day)))} by the end of the season. Stores: their express van takes 30 minutes longer, and every express part keeps a ride shut that much longer.`; },
    opts: () => [OPT('yes', 'Sign the deal', 'Parts 15% cheaper, express 30 min slower, all season'), OPT('no', 'Stay independent', 'Nothing changes', true)], pick: s => s.strategy === 'cost' ? 'yes' : 'no',
    res(s, it, v, who) { if (v !== 'yes') return who === 'You' ? 'You kept your suppliers as they are.' : ''; s.sf.supplier = 1; mods(s); s.later.push({ day: s.day + 2, k: 'latevan' }); return `${Who(who, 'signed')} an exclusive parts deal: 15% cheaper for the rest of the season, slower express deliveries.`; } },
  noise: { lvl: 'ceo', def: 'ignore',
    info: () => 'Legal: the council has penalised two other venues this year, so about a 60% chance it acts within three days. Operations: quieter evenings cost a little glow every day. Finance: the barrier is a one-off.',
    opts: () => [OPT('barrier', 'Build a sound barrier', '$3,000 once. Problem gone', true), OPT('quiet', 'Turn the music down', 'Free. Glow a little lower every day'), OPT('ignore', 'Set it aside', 'Free today. The council may act')], pick: s => s.cash > 9000 ? 'barrier' : 'quiet',
    res(s, it, v, who) {
      if (v === 'barrier' && s.cash >= 3000) { spend(s, 'capex', 3000); s.glow = Math.min(100, s.glow + 2); return `${Who(who, 'paid')} for a sound barrier on the harbour side. The neighbours sent a thank-you card.`; }
      if (v === 'quiet' || v === 'barrier') { s.sf.quiet = 1; mods(s); return `${Who(who, 'agreed')} to turn the music down in the evenings. The neighbours are content; Lantern Hour is a little flatter.`; }
      s.later.push({ day: s.day + 3, k: 'council' }); return who === 'You' ? 'You set the noise complaint aside. Nothing happens today.' : `${who} set the neighbours' noise complaint aside.`; } },
  pay: { lvl: 'ceo', def: 'no',
    info: s => { const bill = s.crew.filter(t => !isMgr(t) && !t.temp).reduce((a, t) => a + wage(t), 0); return `Finance: 8% on the crew wage bill is ${fmtMoney(Math.round(bill * .08))} a day, about ${fmtMoney(Math.round(bill * .08 * (DAYS - s.day)))} over the rest of the season. HR: crew morale averages ${Math.round(s.crew.filter(t => !isMgr(t) && !t.temp).reduce((a, t) => a + t.morale, 0) / Math.max(1, s.crew.filter(t => !isMgr(t) && !t.temp).length))}; below 25 people call in sick, below 10 they leave. Replacing a technician costs a hiring fee and days of cover.`; },
    opts: () => [OPT('agree', 'Agree to 8%', 'Wages up for good, morale +12', true), OPT('bonus', 'One-off bonus', '$1,200 today, morale +6'), OPT('no', 'Refuse', 'Morale −8, and it may not end there')], pick: s => s.cash > 12000 ? 'agree' : s.cash > 4000 ? 'bonus' : 'no',
    res(s, it, v, who) { const crew = s.crew.filter(t => !isMgr(t) && !t.temp), mo = n => { for (const t of crew) t.morale = clamp(t.morale + n, 0, 100); };
      if (v === 'agree') { for (const t of crew) t.raise = (t.raise || 1) * 1.08; mo(12); return `${Who(who, 'agreed')} an 8% pay rise for the crew. Morale +12, and the wage bill is higher from tomorrow.`; }
      if (v === 'bonus' && s.cash >= 1200) { s.cash -= 1200; s.d.bonus -= 1200; mo(6); return `${Who(who, 'paid')} the crew a one-off bonus. Morale +6.`; }
      mo(-8); s.later.push({ day: s.day + 2, k: 'resent' }); return `${Who(who, 'refused')} the crew's pay request. Morale −8.`; } },
  price: { lvl: 'ceo', def: 'hold',
    info: s => `Marketing: a 10% rise brings in about 8% more per guest, but glow drops two points every day and a duller park draws smaller crowds. A family offer does the opposite. Glow is ${Math.round(s.glow)} now and there are ${DAYS - s.day} days left.`,
    opts: () => [OPT('up', 'Raise prices 10%', 'More per guest, glow lower every day'), OPT('hold', 'Hold prices', 'Nothing changes', true), OPT('down', 'Family offer', 'Less per guest, glow higher every day')], pick: s => s.strategy === 'cost' && s.glow > 70 ? 'up' : 'hold',
    res(s, it, v, who) { if (v === 'hold') return who === 'You' ? 'You held ticket prices.' : ''; s.sf.price = v; mods(s); if (v === 'up') s.later.push({ day: s.day + 2, k: 'pricey' }); return v === 'up' ? `${Who(who, 'raised')} ticket prices by 10% for the rest of the season.` : `${Who(who, 'launched')} a family offer for the rest of the season.`; } },
});

/* ---------- escalation ----------
   A request nobody answers in time does not quietly fall back on a default. It goes up to the computer in the seat above,
   which decides after a while (longer the higher it goes), and until then whatever it is about waits: the ride stays shut,
   the person waits, the part is not ordered. It counts as missed for your seat, and misses in a row count for more.
   The chief executive has only the board above, which decides at once, picks the worse option for you (BOARD_PICK: the
   costly or risky answer, never the safe one), and trusts you less. */
const ESC_DELAY = { sup: 10, mgr: 12, dir: 15, ceo: 20 }, INBOX_CAP = 3;
const BOARD_PICK = { board: 'miss', press: 'quiet', sponsor: 'yes', supplier: 'yes', noise: 'ignore', pay: 'no', price: 'up' }; // the worse option for you, item by item
// what the seat above decides for the requests the computer never answers when they are yours
const ESC_PICK = { wo: () => 'no', stay: () => 'go', defect: s => s.stock.kit > 0 ? 'yes' : 'no',
  part: (s, it) => { const j = (ride(s, it.rid) || {}).job; return s.pol.nopart === 'patch' && j && !j.lock && s.focus !== 'safety' ? 'patch' : s.pol.nopart === 'express' ? 'exp' : 'wait'; } };
function above(s, x) { if (x === 'ceo') return 'board'; for (let i = RANK[x] + 1; i < LV.length; i++) if (filled(s, LV[i])) return LV[i]; return 'ceo'; }
const seatWho = (s, x) => { const h = holder(s, x); return h.startsWith('The ') ? 'the' + h.slice(3) : `${h}, the ${SEATNAME[x].toLowerCase()}`; };
const reqWhat = (s, it) => it.k === 'wo' ? `the work order for ${(ride(s, it.rid) || {}).short || 'a ride'}` : `${it.from}'s request`;
function raise(s, k, o) {
  const Q = REQ[k], h = handler(s, Q.lvl), it = Object.assign({ id: ++s.rq, k, lvl: Q.lvl, h, at: s.clock }, o);
  if (h === s.seat) {
    if (s.inbox.length < INBOX_CAP) { s.inbox.push(it); fx(s, 'req', null); return it; }
    // the inbox is full: this one goes straight up. It is your miss only if you were sitting on something past half its time.
    escalate(s, it, s.inbox.some(x => s.clock - x.at > (x.due - x.at) / 2) ? 'full' : 'busy'); return it;
  }
  if (Q.ai !== false) settle(s, it, Q.pick(s, it), false, false);
  return null;
}
function onTime(s) { const sc = s.sc[s.seat]; sc.onTime++; sc.mrun = 0; sc.run = (sc.run || 0) + 1; if (sc.run % 5 === 0) { sc.bonus = (sc.bonus || 0) + 1; log(s, `${sc.run} answers on time in a row. People know they can count on you.`, 'good'); } }
function miss(s) { const sc = s.sc[s.seat]; sc.missed++; sc.run = 0; sc.mrun = (sc.mrun || 0) + 1; sc.missW = (sc.missW || 0) + Math.min(3, 1 + .5 * (sc.mrun - 1)); }
function escalate(s, it, why) { // why: 'late' ran out of time, 'full' inbox full while you sat on an old item, 'busy' inbox full (not a miss)
  const sc = s.sc[s.seat], x = above(s, s.seat), Q = REQ[it.k], what = reqWhat(s, it);
  if (why !== 'busy') miss(s);
  sc.esc = (sc.esc || 0) + 1; s.d.esc = (s.d.esc || 0) + 1;
  if (x === 'board') {
    const dc = Math.min(9, 3 + 2 * ((sc.mrun || 1) - 1)), v = BOARD_PICK[it.k] || Q.def; let txt = '';
    try { txt = Q.res(s, it, v, 'The board', true); } catch (e) { txt = ''; }
    s.conf = clamp(s.conf - dc, 0, 100);
    log(s, `${why === 'late' ? 'No answer from you in time' : 'Your desk was full'}: the board decided ${what} without you, and not the way you would have. Board confidence −${dc}.${txt ? ' ' + txt : ''}`, 'bad');
    fx(s, 'warn', it.rid || null, 'Board decided'); return;
  }
  it.h = x; it.escTo = x; it.escAt = s.clock;
  s.asks.push({ id: ++s.rq, esc: 1, it, x, at: s.clock, due: s.clock + ESC_DELAY[x] });
  log(s, `${why === 'late' ? 'No answer from you in time' : 'Your inbox was full'}: ${what} was escalated to ${seatWho(s, x)}, who will decide in about ${ESC_DELAY[x]} minutes. Until then it waits.`, 'bad');
  fx(s, 'warn', it.rid || null, 'Escalated');
}
function resolveEsc(s, a) { // the seat above makes the call it was handed
  const it = a.it, Q = REQ[it.k], by = holder(s, a.x), what = reqWhat(s, it);
  if (Q.stale && Q.stale(s, it)) { if (it.k === 'wo') { const r = ride(s, it.rid); if (r && r.job && r.job.wo === it.id) r.job.wo = 0; } log(s, `${by} looked at ${what}: it is no longer needed.`, 'info'); return; }
  let v = Q.def; try { v = ESC_PICK[it.k] ? ESC_PICK[it.k](s, it) : Q.pick ? Q.pick(s, it) : Q.def; } catch (e) { v = Q.def; }
  let txt = '', label = v; try { const o = Q.opts(s, it).find(o => o.v === v); if (o) label = o.b.toLowerCase(); } catch (e) { /* the options may no longer apply */ }
  try { txt = Q.res(s, it, v, by, true); } catch (e) { txt = ''; }
  log(s, txt || `${by} decided ${what}: ${label}.`, 'info');
}
function settle(s, it, v, mine, late) {
  const Q = REQ[it.k]; let txt = '';
  try { txt = Q.res(s, it, v, mine ? 'You' : holder(s, it.h), late); } catch (e) { txt = ''; }
  if (mine) { const sc = s.sc[s.seat]; onTime(s); sc[DTYPE[it.k] || 'op']++; const a = ALIGN[it.k] && ALIGN[it.k][v]; if (a) { if (a.includes(s.focus)) { sc.al++; s.d.al++; } else { sc.mis++; s.d.mis++; } } }
  if (txt) log(s, txt, 'info');
}
function answer(s, id, v) { const i = s.inbox.findIndex(x => x.id === id); if (i < 0 || s.away > s.clock) return false;
  if (v === 'brief') { const b = s.inbox[i], Q = REQ[b.k]; if (!Q.info || b.brief) return false; b.brief = Q.info(s, b); b.due = Math.max(s.clock + 2, b.due - 6); s.sc[s.seat].brief++; return true; }
  const it = s.inbox.splice(i, 1)[0]; settle(s, it, v, true, false); return true; }
function workOrder(s, r, rescue) {
  const t = me(s), j = r.job; if (!t || !j || j.wo) return;
  const it = raise(s, 'wo', { rid: r.id, rescue: !!rescue, from: holder(s, 'sup'), due: s.clock + 15,
    txt: rescue ? `Guests are stuck on ${r.short}. Get there now!` : `${j.sev === 'major' ? 'Breakdown' : 'Fault'} on ${r.name}: ${j.title.toLowerCase()}.` });
  if (it) { j.wo = it.id; s.sc.tech.wo++; }
}
function standBy(s) {
  const m = me(s), P = NODES.P;
  for (const c of s.crew) { if (c.role !== 'tech' || !c.on || c.temp || c === m) continue; const r = c.target && ride(s, c.target); if (r && r.job && r.job.type === 'service' && !r.job.started) release(c); }
  s.crew.filter(c => c.role === 'tech' && c.on && !c.temp && !c.target && c !== m).forEach((c, i) => moveOrder(s, c, P.x + Math.cos(i * 1.9) * 46, P.y + Math.sin(i * 1.9) * 40, true));
}
// lockout and diagnosis: the technician's own decisions at the job
function lockout(s, skip) { const t = me(s); if (!t || t.state !== 'prep' || !t.target) return false; t.lk = { id: t.target, until: skip ? 0 : s.clock + 2, skip: !!skip }; { const j = (ride(s, t.target) || {}).job; if (j && !skip && !(j.pads || []).includes(t.id)) (j.pads = j.pads || []).push(t.id); } s.sc.tech[skip ? 'skip' : 'lock']++; return true; }
// a cause found by checking (the procedure, or ruling things out) goes on the job sheet as found; a lucky first guess does not
function diagnose(s, i) {
  const t = me(s), r = t && t.target && ride(s, t.target), j = r && r.job;
  if (!j || !j.opts || !j.opts[i] || j.dx || t.state !== 'diag' || (j.out || []).includes(i) || (j.ruled || []).includes(i)) return false;
  if (j.opts[i] === j.ans) { j.dx = 1; s.sc.tech.dx++; j.cause = j.proc || j.out || gutOk(s, t, j) ? 'found' : 'guess'; if (!j.out) { j.ftf = true; s.sc.tech.ftf++; fx(s, 'fix', r.id, 'Found it first time'); } else fx(s, 'ready', r.id, 'Found it'); return true; }
  (j.out = j.out || []).push(i); t.stall = s.clock + 6; fx(s, 'minor', r.id, 'Not that');
  log(s, `Not the ${j.opts[i].toLowerCase()}. Six minutes lost checking the wrong thing.`, 'bad'); return 'wrong';
}
function hurt(s, t, r, mine, why) {
  if (r.blame && r.blame.mine && s.day - r.blame.day <= 1 && s.sc[r.blame.x]) s.sc[r.blame.x].csInj = (s.sc[r.blame.x].csInj || 0) + 1; // an injury after a weak countersign counts against the countersigner too
  t.hurt = s.clock + 30; r.injAt = s.clock; s.d.inj = (s.d.inj || 0) + 1; const c = Math.round(800 * s.m.fine); s.cash -= c; s.d.bonus -= c; s.conf = clamp(s.conf - (mine ? 3 : 2), 0, 100); s.safety.inj++; if (mine) s.sc.tech.hurt++; s.d.pressQ = `a technician hurt at ${r.name}`; s.comp = Math.max(0, s.comp - 40);
  log(s, why ? `${t.name} was hurt at ${r.short}: ${why}. First aid, 30 minutes off and a reportable incident. Cost ${fmtMoney(c)}.` : mine ? `You skipped the lockout and ${r.short} moved while your hands were in it. First aid, 30 minutes off and a reportable incident. Cost ${fmtMoney(c)}.` : `${t.name} was hurt finishing ${r.short}: a routine job, a shortcut, nobody watching. First aid, 30 minutes off and a reportable incident. Cost ${fmtMoney(c)}. Nobody had stopped the crew for a toolbox talk.`, 'bad'); fx(s, 'major', r.id, 'Injury');
}
// what a toolbox talk is about: [name, what it does]
const TOPIC = { safety: ['Safety', 'Alertness back up by the share who attend'], pace: ['Pace', 'Attendees work 25% faster for 2 hours, alertness barely moves'], care: ['Wellbeing', 'Attendees: energy +45 and morale +10, alertness up a little'] };
function talk(s, who, topic) { // a toolbox talk: everyone free stops where they are for eight minutes; anyone you pull out of it misses it
  topic = TOPIC[topic] ? topic : 'safety'; if (!s.cdTop) s.cdTop = {};
  if (s.phase !== 'day' || s.talk || s.clock < (s.cdTop[topic] || 0)) return false;
  const on = s.crew.filter(c => c.role === 'tech' && c.on && !c.temp && !c.agency), go = on.filter(c => !c.target && !c.post && !c.brk && !(c.hurt > s.clock) && !(c.wake > s.clock)); // people on a break or on the move carry on
  if (!go.length) return false;
  for (const c of go) { release(c); c.post = null; c.brk = false; c.talk = 1; c.state = 'talk'; }
  s.talk = { end: s.clock + 8, ids: go.map(c => c.id), n: on.length, topic };
  s.cdTop[topic] = s.clock + 150; if (topic === 'safety') s.cdT = s.clock + 150;
  log(s, `${who ? who + ' stopped' : 'You stopped'} ${go.length === on.length ? 'the whole crew' : go.length + ' of the ' + on.length + ' on shift'} for a toolbox talk on ${TOPIC[topic][0].toLowerCase()}. Back to work at ${fmtClock(s.talk.end)}.`, 'info');
  return true;
}
function endTalk(s) {
  const T = s.talk; s.talk = null;
  const was = s.crew.filter(c => T.ids.includes(c.id) && c.talk && c.on);
  for (const c of s.crew) if (c.talk) { c.talk = 0; if (c.state === 'talk') c.state = 'idle'; }
  const tp = T.topic || 'safety', share = was.length / Math.max(1, T.n);
  for (const c of was) { c.morale = clamp(c.morale + (tp === 'care' ? 10 : 2), 0, 100); if (tp === 'care') c.en = Math.min(100, enOf(c) + 45); if (tp === 'pace') c.pace = s.clock + 120; }
  const cut = Math.round((tp === 'safety' ? 55 : tp === 'care' ? 20 : 8) * share); s.comp = Math.max(0, s.comp - cut);
  log(s, `Toolbox talk on ${TOPIC[tp][0].toLowerCase()} over: ${was.length} of ${T.n} heard it. Crew alertness +${cut}${tp === 'pace' ? ', and they will work 25% faster for two hours' : tp === 'care' ? ', morale and energy up' : ''}.`, was.length ? 'good' : 'info'); if (was.length) fx(s, 'ready', null, 'Alert');
}
function walk(s, topic) {
  const w = WALK[s.seat]; if (!w || s.phase !== 'day' || (s.seat !== 'sup' && s.clock < s.cdW)) return false;
  if (s.seat === 'sup') return talk(s, null, topic);
  s.cdW = s.clock + w[2]; s.away = s.clock + w[3];
  const crew = n => { for (const t of s.crew) if (t.on && !t.temp && !isMgr(t)) t.morale = clamp(t.morale + n, 0, 100); };
  if (s.seat === 'mgr') { crew(6); s.comp = Math.max(0, s.comp - 25); } else if (s.seat === 'dir') { crew(2); s.cm = clamp(s.cm + 4, 0, 100); } else { s.glow = Math.min(100, s.glow + 4); s.cm = clamp(s.cm + 3, 0, 100); }
  log(s, `${w[0]}. ${w[1]}`, 'good'); return true;
}
const setFocus = (s, f) => { if (!FOCUS[f]) return false; s.focus = f; return true; };
const setBudget = (s, d) => { s.budget = clamp(s.budget + d, 1000, 9000); return true; };
// the situations that turn into requests, checked every minute
function requests(s) {
  const cd = (k, m) => { if ((s.cdq[k] || 0) > s.clock) return false; s.cdq[k] = s.clock + m; return true; };
  const m = me(s), from = () => onNow(s, 'sup') && s.seat !== 'sup' ? holder(s, 'sup') : 'The crew';
  if (m && m.on && m.shift === 'early' && !m.once && m.target && s.clock === SHIFT.early[1] - 25)
    raise(s, 'stay', { from: holder(s, handler(s, 'sup')), cost: otCost(m), due: SHIFT.early[1] - 12, txt: `Can you stay on to finish ${ride(s, m.target).short}? Your shift ends at 17:00.` });
  for (const r of s.rides) {
    const j = r.job; if (!j || j.type !== 'fault') continue;
    const crew = s.crew.filter(c => c.target === r.id && c.on), age = s.clock - j.t0;
    if (!j.hq && crew.length === 1 && !crew[0].temp && crew[0] !== m && crew[0].state === 'work') {
      const t = crew[0], left = (need(j) - j.prog) / Math.max(.1, rate(s, t, j.trade));
      if (left > 45) { j.hq = 1; raise(s, 'help', { rid: r.id, tid: t.id, from: t.name, due: s.clock + 15, txt: `Big job on ${r.short}: about ${Math.round(left)} minutes on my own. Can I have a hand?` }); }
    }
    const short = j.mode === 'full' && j.part && j.ps === 'none' && s.stock[j.part] < 1 && !incoming(s, j.part);
    if (short && !j.pq && crew.some(c => c.state === 'wait' && !c.temp && c !== m)) {
      j.pq = 1; const t = crew.find(c => c.state === 'wait' && c !== m);
      raise(s, 'part', { rid: r.id, sku: j.part, from: t.name, due: s.clock + 15, txt: `No ${SKU[j.part][0].toLowerCase()} in stores for ${r.short}. What do you want me to do?` });
    }
    if (short && !j.eq && age >= 8 && s.seat !== 'sup' && s.phase === 'day' && expressEta(s) < CLOSE - 10 && price(s, j.part, 'exp') > LIMIT.sup) {
      j.eq = 1; const c = price(s, j.part, 'exp'); // over the supervisor's $300: it needs a countersign from the band it falls in
      raise(s, c > LIMIT.mgr ? 'bigexp' : 'express', { rid: r.id, sku: j.part, cost: c, cs: 1, from: c > LIMIT.mgr ? holder(s, 'mgr') : from(), due: s.clock + 15, txt: `${r.short} needs a ${SKU[j.part][0].toLowerCase()} and stores have none. Express one for ${fmtMoney(c)}? It stays on hold until someone countersigns.` });
    }
    if (!j.coq && j.sev === 'major' && !crew.length && s.seat !== 'sup' && age >= (handler(s, 'mgr') === s.seat ? 10 : 25) && !s.crew.some(c => c.temp && c.target === r.id) && !s.crew.some(c => c.role === 'tech' && c.on && !c.temp && !c.target && c.skills[j.trade])) {
      j.coq = 1; raise(s, 'callout', { rid: r.id, cost: calloutCost(s), cs: 1, from: from(), due: s.clock + 15, txt: `${r.short} is ${r.sub ? 'closed' : 'down'} and nobody qualified for ${TRADES[j.trade].toLowerCase()} work is free. Call a contractor?` });
    }
  }
  if (s.clock === SHIFT.early[1] - 30) {
    const ts = s.crew.filter(c => c.role === 'tech' && c.on && !c.temp && c.shift === 'early' && !c.once && c.target && c !== m);
    if (ts.length) raise(s, 'hold', { tids: ts.map(t => t.id), cost: ts.reduce((a, t) => a + otCost(t), 0), from: ts.length === 1 ? ts[0].name : 'The early shift', due: SHIFT.early[1] - 15, txt: `${ts.map(t => t.name).join(' and ')} ${ts.length > 1 ? 'are' : 'is'} mid-job and finish${ts.length > 1 ? '' : 'es'} at 17:00. Keep ${ts.length > 1 ? 'them' : 'them'} on overtime?` });
  }
  if (s.seat === 'sup' && s.clock % 5 === 0 && cd('defect', 40)) {
    const t = s.crew.find(c => c.role === 'tech' && c.on && !c.temp && !c.target && !c.post && c.state === 'idle');
    const r = t && s.rides.filter(r => !r.job && !r.warnAt && r.health < 45 && t.skills[primary(r)] && status(s, r) !== 'nopower').sort((a, b) => a.health - b.health)[0];
    if (r && s.stock.kit > 0) raise(s, 'defect', { rid: r.id, tid: t.id, from: t.name, due: s.clock + 20, txt: `${r.short} is running rough (${Math.round(r.health)}%). Shall I give it a service?` }); else s.cdq.defect = s.clock + 10;
  }
  for (const w of s.waves) if (w.warned && !w.q && !w.hit) { w.q = 1; raise(s, 'squall', { from: from(), due: w.at, txt: `Squall at ${fmtClock(w.at)}. Pull people off planned services and stand the free crew by in the middle of the park?` }); }
  if (s.clock % 10 === 0 && cd('morale', 30)) {
    const t = s.crew.filter(c => !isMgr(c) && !c.temp && c.morale < 35 && c !== m && !(s.d.talked || []).includes(c.id)).sort((a, b) => a.morale - b.morale)[0];
    if (t) { (s.d.talked = s.d.talked || []).push(t.id); raise(s, 'morale', { tid: t.id, from: t.name, due: s.clock + 30, txt: `${t.name}'s morale is down to ${Math.round(t.morale)}. ${t.name} would like a word.` }); }
  }
  for (const e of s.events) if (e.k === 'vip' && !e.done && !e.q && s.clock >= e.at - 110 && s.clock < e.at - 60) {
    const r = ride(s, e.ride); if (r.job || r.health >= 65) continue;
    e.q = 1; raise(s, 'vip', { rid: r.id, vat: e.at, from: 'Engineering and Operations', due: s.clock + 20, txt: `VIP party on ${r.short} at ${fmtClock(e.at)}. Engineering wants to close it now for a 45-minute service (health ${Math.round(r.health)}%). Operations wants it open for the queues.` });
  }
  if (!s.d.bq && s.clock > OPEN + 5 && maintSpend(s) > s.budget) { s.d.bq = 1; raise(s, 'budget', { from: holder(s, 'mgr'), due: s.clock + 25, txt: `Maintenance has spent or committed ${fmtMoney(maintSpend(s))}, over today's budget of ${fmtMoney(s.budget)}. Approve the overspend, or hold spending?` }); }
  if (s.heat && !s.d.hq && s.clock >= 630) { s.d.hq = 1; raise(s, 'heat', { from: holder(s, 'mgr'), due: s.clock + 30, txt: 'Heatwave. Engineering wants portable cooling for both substations today.' }); }
  if (s.glow < 50 && s.clock > 630 && s.clock >= s.cdC && s.cash > 250 && cd('crowd', 120)) raise(s, 'crowd', { from: 'Operations', due: s.clock + 20, txt: 'The queues are long and guests are grumbling. Buskers and free ice cream on the midway?' });
  if (s.clock === s.d.boardAt) raise(s, 'board', { from: 'Rosalind Teo, chair', due: s.clock + 15, txt: `The chair is on the line wanting an update. Uptime so far today is ${Math.round(s.d.upW / Math.max(1, s.d.upT) * 100)}%.` });
  if (s.d.pressQ && !s.d.pq2) { s.d.pq2 = 1; raise(s, 'press', { from: 'The Harbour Gazette', due: s.clock + 20, txt: `A reporter is asking about ${s.d.pressQ}. Statement?` }); }
  const once = (k, day, at) => { if (s.sq[k] || s.day < day || s.clock !== at) return false; s.sq[k] = 1; return true; };
  if (once('supplier', 2, 660)) raise(s, 'supplier', { from: 'Harbour Bearings', due: s.clock + 40, txt: 'A parts supplier offers an exclusive deal for the rest of the season: everything 15% cheaper, but you buy from nobody else and their express van is slower.' });
  if (once('noise', 4, 1170)) raise(s, 'noise', { from: 'The harbour residents', due: s.clock + 15, txt: 'The neighbours have complained to the council about noise during Lantern Hour, and the councillor is on the phone now.' });
  if (once('pay', 6, 600)) raise(s, 'pay', { from: 'The crew', due: s.clock + 40, txt: 'The crew have asked, together, for an 8% pay rise. They say the pier down the coast pays more.' });
  if (once('price', 9, 570)) raise(s, 'price', { from: 'Marketing', due: s.clock + 40, txt: 'Marketing wants a decision on ticket prices for the rest of the season: raise them, hold them, or run a family offer.' });
  if (s.clock % 60 === 0) s.comp = Math.min(100, s.comp + 3);
  if (s.seat !== 'sup' && s.comp >= 55 && s.clock >= s.cdT && onNow(s, 'sup') && !s.talk) { const on = s.crew.filter(c => c.role === 'tech' && c.on && !c.temp && !c.agency); if (on.filter(c => !c.target).length >= Math.max(1, on.length / 2)) talk(s, holder(s, 'sup'), 'safety'); }
  if (!s.sponQ && s.day >= 3 && s.clock === 720) { s.sponQ = 1; raise(s, 'sponsor', { from: 'Fizzwell Drinks', due: s.clock + 30, txt: 'A soft-drinks brand offers $2,500 now to put its logo on the Lantern Wheel for the rest of the season. Guests will not love it.' }); }
}
// overnight, the people in the seats you are not playing do their jobs
function aiNight(s) {
  const notes = [], who = x => holder(s, x), not = x => s.seat !== x;
  if (not('dir')) {
    const D = who('dir'), f = s.conf < 40 ? 'uptime' : s.cash < 4000 ? 'cost' : s.safety.tags + s.safety.inj >= 2 ? 'safety' : s.strategy;
    if (f !== s.focus) { s.focus = f; notes.push(`${D} set tomorrow's priority: ${FOCUS[f].toLowerCase()}.`); }
    const bill = s.crew.filter(t => !t.temp).reduce((a, t) => a + wage(t), 0), b = Math.round((bill + (f === 'cost' ? 1200 : 2200)) / 100) * 100;
    if (b !== s.budget) { s.budget = b; notes.push(`${D} set the maintenance budget at ${fmtMoney(b)} a day.`); }
    // capital spending only with money to spare, never on a night before the board wants a profit, and one at a time
    const room = s.forecast.memo !== 'net' && s.day - (s.capexDay || -9) >= 2;
    const k = ['tools', 'sensors', 'carts', 'supplier', 'courier', 'genny', 'nightc', 'shade'].find(k => !s.up[k]);
    if (room && k && s.cash >= Math.max(perkCost(s, k) * 3 + 15000, 25000) && buyPerk(s, k)) { s.capexDay = s.day; notes.push(`${D} approved a project: ${PERKS[k][0].toLowerCase()}.`); }
    const r = s.rides.filter(r => r.ovh < 2 && r.health < 30).sort((a, b) => a.health - b.health)[0];
    if (room && s.capexDay !== s.day && r && s.cash >= 25000 && overhaul(s, r)) { s.capexDay = s.day; notes.push(`${D} sent ${r.name} for an overnight overhaul.`); }
  }
  if (not('mgr')) {
    const M = who('mgr'), techs = s.crew.filter(t => t.role === 'tech' && !t.temp);
    if (!s.aiMin) { s.aiMin = true; const mins = { kit: 2, sensor: 1, contactor: 1, bearing: 1, seal: 1, breaker: 1 }; let ch = 0; for (const k in mins) if (s.min[k] < mins[k]) { s.min[k] = mins[k]; ch++; } if (ch) notes.push(`${M} set minimum stock levels, so stores reorder the parts that fail most.`); }
    const pol = s.focus === 'cost' ? 'wait' : s.focus === 'safety' ? 'wait' : 'express';
    if (s.pol.nopart !== pol) { s.pol.nopart = pol; notes.push(`${M} changed the rule for missing parts to "${{ wait: 'wait for stock', express: 'order express' }[pol]}" to match the priority.`); }
    let done = false;
    for (const tr of Object.keys(TRADES)) {
      const ppl = techs.filter(t => t.skills[tr]), e = ppl.filter(t => t.shift !== 'late'), l = ppl.filter(t => t.shift !== 'early');
      if (ppl.length >= 2 && (!e.length || !l.length)) { const mv = ppl.sort((a, b) => a.skills[tr] - b.skills[tr])[0], sh = e.length ? 'late' : 'early'; if (setShift(s, mv, sh)) { notes.push(`${M} moved ${mv.name} to the ${sh} shift so ${TRADES[tr].toLowerCase()} work is covered all day.`); done = true; break; } }
    }
    if (!done) for (const tr of Object.keys(TRADES)) {
      if (techs.filter(t => t.skills[tr]).length >= 2 || s.cash < hireFee(s) + 6000 || s.crew.length >= 13) continue;
      if (bestCand(s, tr) < 0 && s.cash > 8000 && !s.d.advd && advertise(s) && (s.d.advd = 1)) notes.push(`${M} advertised again, looking for ${JOBTITLE[tr].toLowerCase()}s.`);
      const i = bestCand(s, tr); if (i < 0) continue;
      const c = s.cands[i]; hire(s, i); const t = s.crew[s.crew.length - 1], other = techs.find(x => x.skills[tr]);
      if (other) setShift(s, t, other.shift === 'early' ? 'late' : 'early');
      notes.push(`${M} hired ${c.name}, ${GRADE[c.grade].toLowerCase()} ${JOBTITLE[tr].toLowerCase()}, so there are two people who can do ${TRADES[tr].toLowerCase()} work.`); break;
    }
    if (s.crew.filter(t => t.role === 'sup').length < 2 && s.cash > 14000 && bestCand(s, 'sup') >= 0) { const i = bestCand(s, 'sup'), n = s.cands[i].name; hire(s, i); setShift(s, s.crew[s.crew.length - 1], 'late'); notes.push(`${M} hired ${n} as late-shift supervisor, so evenings are dispatched properly.`); }
    const crewM = s.crew.filter(t => !isMgr(t) && !t.temp), avg = crewM.reduce((a, t) => a + t.morale, 0) / Math.max(1, crewM.length);
    if (avg < 45 && s.cash > 3000 && teamMeal(s)) notes.push(`${M} booked a team meal because morale is low.`);
    const app = techs.find(t => topSkill(t)[1] === 1);
    if (app && s.cash > 22000 && s.forecast.memo !== 'net') { const tr = topSkill(app)[0]; if (train(s, app, tr)) notes.push(`${M} sent ${app.name} on a course: now a tradesperson in ${TRADES[tr].toLowerCase()} work.`); }
  }
  if (not('ceo')) {
    const C = who('ceo'), id = ['releng', 'mplanner', 'hsemgr', 'opsmgr', 'safety', 'brand', 'acct', 'digital'].find(id => (s.org[id] || 0) < 1);
    if (id && s.cash > 30000 && hireOrg(s, id)) notes.push(`${C} created a new post: ${ORGX[id][1]}.`);
    if (s.conf < 35 && s.cash > 4000 && consult(s)) notes.push(`${C} brought in consultants to reassure the board.`);
  }
  return notes;
}

function hazard(s, r) { return (r.hzm || 1) * HZ * (.00045 + .012 * Math.pow(Math.max(0, 75 - r.health) / 75, 2)) * (1 + .06 * (s.day - 1)) * (r.patched ? 2.2 : 1) * (r.sub ? 1 : .4) * (s.heat && r.mix.elec >= .4 ? (s.cool ? 1.15 : 1.4) : 1); }
function step(s) {
  if (s.phase !== 'day') return;
  s.clock++;
  let clockedOn = 0;
  for (const t of s.crew) {
    const now = onShift(t, s.clock);
    if (now && !t.on) { t.on = true; t.state = 'idle'; t.worked = true; if (t.inAt) { if (t.inAt === s.clock) log(s, `${t.name} is on site${t.agency ? ' from the agency' : ', on overtime'}.`, 'good'); } else if (!t.temp) clockedOn++; }
    else if (!now && t.on) { t.on = false; release(t); t.post = null; t.dest = null; t.state = 'home'; }
  }
  if (clockedOn) log(s, `Late shift clocked on: ${clockedOn} ${clockedOn > 1 ? 'people' : 'person'}.`);
  if (s.crew.some(t => t.agency && s.clock >= t.agency)) { const gone = s.crew.filter(t => t.agency && s.clock >= t.agency); s.crew = s.crew.filter(t => !gone.includes(t)); log(s, `The agency technicians have gone: ${gone.map(t => t.name).join(' and ')}.`); }
  if (s.talk && s.clock >= s.talk.end) endTalk(s);
  if (s.clock === SHIFT.early[1] && s.crew.some(t => t.shift === 'early')) log(s, 'Early shift has gone home.');
  if (s.day === 1 && s.clock === 548) { const c = ride(s, 'carou'); if (!c.job) createFault(s, c, { sev: 'minor', trade: 'mech' }); }
  if (s.day === 1 && s.clock === 590) { const c = ride(s, 'food'); if (!c.job) createFault(s, c, { sev: 'major', trade: 'elec' }); }
  if (s.clock === LH + 1) { log(s, 'Lantern Hour. Every ride that runs 45 of the next 60 minutes sends up a lantern. Income is up by half.', 'event'); fx(s, 'lh', null); }
  const M = s.m, hh = s.hh > s.clock, att = attendance(s.clock) * s.crowd * M.crowd * (.75 + .25 * s.glow / 100) * (hh ? 1.5 : 1), lh = s.clock > LH;
  s.att = att;
  for (const e of s.events) if (!e.done) doEvent(s, e);
  for (const w of s.waves) {
    if (w.done) continue;
    if (!w.warned && s.clock >= w.at - 30) { w.warned = true; log(s, `A squall is coming in off the sea. Expect about ${w.size} breakdowns from ${fmtClock(w.at)}. Get your people into position.`, 'event'); fx(s, 'warn', null); }
    if (s.clock >= w.at && !w.left && !w.hit) { w.hit = true; w.left = w.size; log(s, 'The squall has hit.', 'bad'); }
    if (w.hit && w.left && (s.clock - w.at) % 4 === 0) {
      const pool = s.rides.filter(r => !r.job && r.sub && status(s, r) === 'ok');
      if (pool.length) { pool.sort((a, b) => a.health - b.health); const q = pool[Math.floor(rnd(s) * Math.min(pool.length, 6))]; createFault(s, q); if (q.job) q.job.sq = 1; }
      if (!--w.left) w.done = true;
    }
  }
  for (let i = s.inbound.length - 1; i >= 0; i--) { const o = s.inbound[i]; if (o.at && s.clock >= o.at) { s.stock[o.sku]++; s.inbound.splice(i, 1); log(s, `Express delivery in stores: ${SKU[o.sku][0].toLowerCase()}.`, 'good'); fx(s, 'ready', null); } }
  let pen = 0, rev = 0;
  for (const r of s.rides) {
    const st = status(s, r), av = AV[st];
    if (r.sub) {
      if (av > 0) {
        r.q += .8 * r.cap * att;
        const cap = r.cap * M.cap, served = Math.min(r.q, cap * av); r.q -= served;
        const fl = r.fl > s.clock, qmax = cap * s.qtol * (fl ? .5 : 1); r.jam = r.q >= qmax; if (r.jam) r.q = qmax;
        const m = served * r.fare * .65 * (lh ? 1.5 : 1) * s.confMult * M.spend * (1 - .04 * M.leak) * (s.itOut ? .92 : 1) * (fl ? 1.4 : 1) * (hh ? .85 : 1); rev += m; r.earn += m; r.rate = m;
      } else { r.q *= .9; r.rate = 0; r.jam = false; }
      pen += r.w * ((1 - av) + (r.jam ? .25 : 0)) * (r.vouch > s.clock ? .3 : 1);
      if (lh) r.lh += av;
      s.d.upW += r.w * av; s.d.upT += r.w;
    }
    const live = r.sub ? av > 0 : st !== 'down' && st !== 'signoff';
    if (live) {
      r.health = Math.max(0, r.health - r.wear / 60 * M.wear * (has(s, 'eng') ? .75 : 1) * (r.sub ? (.4 + .6 * Math.min(1, att)) * (st === 'degraded' ? 1.3 : 1) : (s.heat ? 1.5 : 1)));
      if (!r.job && !r.so) {
        if (r.gb && s.clock >= r.gb) { r.gb = 0; glitch(s, r, true); }
        else if (r.warnAt) { if (s.clock >= r.warnAt) createFault(s, r); }
        else {
          if (chance(s, hazard(s, r) * M.hazard * D(s).hz * calm(s) * (gentle(s) ? .25 : 1))) {
            if (s.up.sensors) { r.warnAt = s.clock + RI(s, 35, 50); log(s, `Monitoring: ${r.name} is running rough. It will fail around ${fmtClock(r.warnAt)} unless it is serviced.`, 'event'); fx(s, 'warn', r.id, 'Running rough'); }
            else createFault(s, r);
          } else if (r.sub && !gentle(s) && chance(s, GLITCH_RATE * D(s).gl * calm(s) * Math.min(1.2, att))) glitch(s, r);
        }
      } else if (!r.job) { /* fixed, waiting to be signed back into service */ } else if (r.job.type === 'fault' && r.job.glitch === 'flicker' && !r.crew && r.job.esc && s.clock >= r.job.esc) {
        dropJob(s, r); r.health = Math.max(0, r.health - 10); r.warnAt = s.clock + RI(s, 40, 55);
        log(s, `${r.name}: the fault cleared itself, for now. It will fail properly around ${fmtClock(r.warnAt)} unless someone services it.`, 'bad'); fx(s, 'warn', r.id, 'Will fail');
      } else if (r.job.type === 'fault' && r.job.sev === 'minor' && r.sub && !r.crew && r.job.esc && s.clock >= r.job.esc) {
        r.job.sev = 'major'; r.job.esc = 0; log(s, `${r.name} was left too long. It got worse and has closed.`, 'bad'); fx(s, 'major', r.id, 'Closed'); breakStreak(s, `${r.short} was left to get worse`);
      }
    }
    if (r.job && r.job.rescue) { const t = s.crew.find(c => c.on && c.role === 'tech' && Math.hypot(c.x - r.x, c.y - r.y) < 48);
      if (t) { r.job.rescue = 0; s.d.rescued++; if (s.seat === 'sup') s.sc.sup.rescued++; s.glow = Math.min(100, s.glow + 3); s.cash += 150; s.d.bonus += 150; log(s, `${t.name} got the guests off ${r.name} safely.`, 'good'); fx(s, 'cash', r.id, 'Rescued +$150'); } }
    if (r.job && r.job.rescue && s.clock >= r.job.rescue) {
      r.job.rescue = 0; if (s.seat === 'sup') s.sc.sup.stuck++; s.d.pressQ = `guests left stuck on ${r.name}`; const fine = Math.round(400 * M.fine); s.cash -= fine; s.d.bonus -= fine; s.glow = Math.max(0, s.glow - 8);
      log(s, `Guests were left stuck on ${r.name}. The fire service got them down and sent a bill for ${fmtMoney(fine)}.`, 'bad'); fx(s, 'major', r.id, 'Guests left stuck'); breakStreak(s, 'guests were left stuck');
    }
    r.crew = 0;
  }
  logistics(s);
  for (const t of s.crew.slice()) {
    if (!t.on) continue;
    if (t.role === 'tech') { techStep(s, t); if (t.temp && !t.target) { s.crew.splice(s.crew.indexOf(t), 1); } }
    else if (t.role === 'store') storeStep(s, t);
    else if (t.role === 'mach') {
      const f = s.fab[0];
      if (f) { t.state = 'work'; f.left -= RATE[t.grade] * moraleMult(t) * s.mult.work * s.m.work * s.m.fab; if (f.left <= 0) { s.fab.shift(); s.stock[f.sku]++; log(s, `Workshop: ${SKU[f.sku][0].toLowerCase()} finished and booked into stores.`, 'good'); fx(s, 'ready', null); } }
      else t.state = 'idle';
    }
  }
  soStepAll(s);
  supStep(s);
  requests(s);
  for (let i = s.inbox.length - 1; i >= 0; i--) { // requests go stale, or run out of time and the default happens
    const it = s.inbox[i], Q = REQ[it.k];
    if (Q.stale && Q.stale(s, it)) { s.inbox.splice(i, 1); if (it.k === 'wo') { const r = ride(s, it.rid), t = me(s); if (r && r.job && r.job.wo === it.id) r.job.wo = 0; if (t && t.target === it.rid) s.sc.tech.woOk++; } continue; }
    if (s.clock >= it.due) { s.inbox.splice(i, 1); escalate(s, it, 'late'); }
  }
  for (let i = s.asks.length - 1; i >= 0; i--) if (s.clock >= s.asks[i].due) { const a = s.asks.splice(i, 1)[0]; if (a.esc) resolveEsc(s, a); else decideAsk(s, a); }
  s.sc[s.seat].min++; s.d.seatMin[s.seat] = (s.d.seatMin[s.seat] || 0) + 1;
  // a service nobody is walking to or working on is called off and its kit goes back on the shelf
  for (const r of s.rides) if (r.job && r.job.type === 'service' && !s.crew.some(t => t.target === r.id)) dropJob(s, r);
  s.glow += (clamp(100 + M.glow - pen * M.pen, 0, 100) - s.glow) * .02;
  s.d.glowSum += s.glow; s.d.n++;
  s.cash += rev; s.d.income += rev;
  if (s.clock >= CLOSE) endDay(s);
}

function endDay(s) {
  for (const r of s.rides) if (r.so) { r.so = null; r.restart = 0; } // the night shift and the managers sign off whatever is still waiting
  for (const r of s.rides) { r.gb = 0; r.restart = 0; }
  for (const a of s.asks.filter(a => a.esc)) resolveEsc(s, a); // every escalation is decided before the park shuts
  s.asks = s.asks.filter(a => !a.esc);
  s.crew = s.crew.filter(t => !t.agency);
  for (const t of s.crew.filter(t => !t.temp)) { spend(s, 'wages', wage(t)); if (t.shiftWas === 'full' && !isMgr(t) && !t.sick) spend(s, 'ot', otCost(t)); if (t.once) { t.shift = t.was || 'early'; t.once = false; t.was = null; } }
  spend(s, 'salaries', orgWages(s)); spend(s, 'overhead', Math.round(OVERHEAD * s.m.overhead));
  { const fl = Math.round(s.m.flat + Math.max(0, s.cash) * s.m.yield); s.cash += fl; s.d.flat += fl; }
  s.crew = s.crew.filter(t => !t.temp);
  for (const r of s.rides) if (r.job && r.job.type === 'service') dropJob(s, r);
  for (const t of s.crew) { release(t); t.on = false; t.state = 'home'; t.dest = null; t.brk = false; t.talk = 0; t.wake = 0; t.inAt = 0; }
  s.prio = null; s.talk = null; s.away = 0;
  for (const r of s.rides) if (r.job && r.job.ps !== 'none' && r.job.ps !== 'onsite') { s.stock[r.job.part]++; r.job.ps = 'none'; }
  const d = s.d, lit = s.rides.filter(r => r.sub && r.lh >= LIT_MIN).map(r => r.id), up = d.upW / Math.max(1, d.upT);
  const mvp = s.crew.slice().sort((a, b) => b.day - a.day)[0];
  const cost = d.wages + d.salaries + d.overhead + d.ot + d.parts + d.contract + d.people + d.capex;
  // the client's demand for the day, and what it does to her confidence in you
  if (d.spin && up < .8) { s.conf = clamp(s.conf - 10, 0, 100); log(s, 'The board found out the day went worse than you told the chair. Board confidence −10.', 'bad'); }
  const mk = s.forecast.memo, met = { up: up >= .85, lit: lit.length >= 10, net: d.income + d.flat + d.bonus - cost >= 0, nopatch: d.patches === 0, vip: d.vip === true }[mk];
  if (met) { s.cash += 300; d.bonus += 300; }
  s.conf = clamp(s.conf + (met ? 6 : -9) + clamp((up - .85) * 60, -7, 6) + s.m.conf, 0, 100);
  const rep = { day: s.day, lit, n: lit.length, pl: { income: Math.round(d.income), flat: d.flat, bonus: d.bonus, wages: d.wages, salaries: d.salaries, overhead: d.overhead, ot: d.ot, parts: d.parts, contract: d.contract, people: d.people, capex: d.capex }, net: Math.round(d.income + d.flat + d.bonus - cost), up, glow: d.glowSum / Math.max(1, d.n), glowEnd: s.glow, faults: d.faults, fixed: d.fixed, quick: d.quick, rescued: d.rescued, lost: d.lost, best: s.best, vip: d.vip, insp: d.insp, mvp: mvp && mvp.day ? { name: mvp.name, n: mvp.day } : null, cash: Math.round(s.cash), memo: { k: mk, met }, conf: Math.round(s.conf) };
  // the day counts towards whichever seat you spent most of it in
  { const sm0 = d.seatMin || {}, mj = Object.keys(sm0).sort((a, b) => sm0[b] - sm0[a])[0] || s.seat;
    if (mj === 'mgr' && !polAligned(s)) { d.mis++; s.sc.mgr.mis++; log(s, `Your rules for the supervisor pulled against the day's priority (${FOCUS[s.focus].toLowerCase()}). The crew spent the day doing things well that nobody upstairs wanted.`, 'bad'); }
    if (mj === 'dir' && s.focus !== s.strategy) { s.sc.dir.off++; s.conf = clamp(s.conf - 1, 0, 100); log(s, `Your priority today (${FOCUS[s.focus].toLowerCase()}) was not the company strategy (${STRATEGY[s.strategy][0].toLowerCase()}). The board noticed. Confidence −1.`, 'bad'); }
    if (d.mis >= 3) { s.conf = clamp(s.conf - 2, 0, 100); log(s, `${d.mis} of your calls today pulled against the day's priority. Effort went into things the company was not trying to do. Board confidence −2.`, 'bad'); }
    else if (d.al >= 3 && !d.mis) { for (const t of s.crew) if (!isMgr(t) && !t.temp) t.morale = clamp(t.morale + 2, 0, 100); log(s, 'Every call you made today pulled the same way as the priority. People knew where they stood: crew morale +2.', 'good'); } }
  const sm = d.seatMin || {}, major = Object.keys(sm).sort((a, b) => sm[b] - sm[a])[0] || s.seat, sc = s.sc[major];
  Object.assign(rep, { seat: major, seatMin: sm, spend: d.wages + d.ot + d.parts + d.contract - (d.mkt || 0), budget: s.budget, focus: s.focus, al: d.al, mis: d.mis, strategy: s.strategy, comp: Math.round(s.comp) });
  sc.days++; sc.upSum += up; if (major === 'mgr' || major === 'dir') sc.budOk += rep.spend <= s.budget ? 1 : 0;
  if (major === 'ceo') { sc.netSum += rep.net; sc.confD = (sc.confD || 0) + Math.round(s.conf - d.conf0); }
  boardDecides(s); bigCheck(s);
  s.inbox = []; s.asks = []; s.freeze = 0;
  s.reports.push(rep); s.total += rep.n;
  s.phase = 'plan'; s.closed = true; s.paused = true;
  log(s, `Park closed. ${rep.n} of ${N_RIDES} lanterns went up tonight.`, 'event');
  fx(s, 'close', null);
  // morale: overtime and dark nights wear people down, bright nights lift them, HR softens the blows
  s.cm = clamp(s.cm + (60 - s.cm) * .1 + s.m.morale + (rep.n >= 10 ? 2 : rep.n < 6 ? -2 : 0), 0, 100);
  s.rnd += s.m.rnd; while (s.rnd >= 60 && s.enh < 10) { s.rnd -= 60; s.enh++; log(s, `R&D delivered ride enhancement ${s.enh}. Guests spend 2% more from now on.`, 'good'); }
  const hrOn = has(s, 'hr');
  for (const t of s.crew.slice()) {
    if (isMgr(t)) continue;
    let dm = (70 - t.morale) * .08; if (t.shiftWas === 'full' && !t.sick) dm -= 12; if (rep.n >= 10) dm += 4; if (rep.n < 6) dm -= 4;
    if (hrOn) dm = dm < 0 ? dm * .5 : dm + 3;
    dm += s.m.morale * .5;
    t.morale = clamp(t.morale + dm, 0, 100); t.sick = false;
    if (t.morale < 10) { s.crew.splice(s.crew.indexOf(t), 1); log(s, `${t.name} has handed in their notice and left.`, 'bad'); }
  }
  if (major === 'mgr') { const cm = s.crew.filter(t => !isMgr(t) && !t.temp); sc.moraleSum += cm.reduce((a, t) => a + t.morale, 0) / Math.max(1, cm.length); }
  if (s.seat === 'tech' && !staff(s, s.me)) { const t = s.crew.find(c => c.role === 'tech' && !c.temp); if (t) s.me = t.id; else s.seat = 'sup'; }
  if (s.cash < -20000) { s.fired = true; s.broke = true; log(s, 'The bank has called in the overdraft. The company is insolvent.', 'bad'); s.final = review(s); return; }
  if (s.conf <= 0) { s.fired = true; s.final = review(s); return; }
  if (s.day >= DAYS) { s.final = review(s); return; }
  mods(s);
  s.forecast = rollDay(s, s.day + 1); s.cands = rollCands(s);
  rep.ai = aiNight(s); bigOvernight(s); mods(s);
  // the storeman tops stock back up to your minimum levels on the overnight order
  if (has(s, 'store')) { let n = 0; for (const k in SKU) { const want = Math.max(s.min[k], s.rides.filter(r => r.job && r.job.part === k && r.job.ps === 'none' && (r.job.type !== 'fault' || r.job.mode === 'full')).length); let have = s.stock[k] + s.inbound.filter(o => o.sku === k).length; while (have < want && order(s, k, 'std') === true) { have++; n++; } } if (n) log(s, `Stores placed the overnight order: ${n} item${n > 1 ? 's' : ''} to reach your minimum levels.`); }
}
// how well you did your own job, 0 to 1, in the seat you spent most of the season in
function personal(s) {
  const seat = LV.slice().sort((a, b) => s.sc[b].min - s.sc[a].min)[0], c = s.sc[seat], days = Math.max(1, c.days), r01 = (a, b, dflt) => a + b ? a / (a + b) : dflt;
  const req = r01(c.onTime + (c.bonus || 0), c.missW != null ? c.missW : c.missed, .5), parts = [];
  const add = (name, w, v) => { parts.push([name, w, clamp(v, 0, 1)]); };
  if (seat === 'tech') { const segDays = Math.max(.5, c.min / (CLOSE - OPEN)); add('Jobs finished', .35, c.jobs / segDays / 4); add('Cause found first time', .2, r01(c.ftf, c.dx - c.ftf, .5)); add('Locked out first', .25, r01(c.lock, c.skip, .5)); add('Work orders answered', .2, r01(c.woOk, c.woLate, .5)); }
  else if (seat === 'sup') { const avg = c.respN ? c.resp / c.respN : 99; add('Response time', .35, (25 - avg) / 17); add('Fast responses', .25, c.respN ? (c.fast || 0) / c.respN : 0); add('Requests answered in time', .2, req); add('No guests left stuck', .2, 1 - c.stuck / 3); }
  else if (seat === 'mgr' || seat === 'dir') { const u = c.days ? c.upSum / c.days : 0; add('Uptime on your days', .4, (u - .7) / .2); add('Days on budget', .2, c.days ? c.budOk / days : 0);
    if (seat === 'mgr') add('Crew morale', .2, c.days ? (c.moraleSum / days - 35) / 30 : 0); else add('Days on strategy', .2, c.days ? 1 - c.off / days : 0); add('Requests answered in time', .2, req); }
  else { add('Profit on your days', .4, c.days ? (c.netSum / days + 2000) / 8000 : 0); add('Board confidence', .3, c.days ? ((c.confD || 0) / days + 3) / 6 : 0); add('Requests answered in time', .3, req); }
  // sign-offs: good ones signed quickly earn a little; a weak sheet you countersigned that went wrong costs more
  const csUp = Math.min(.05, .01 * (c.csFast || 0)), csDown = Math.min(.2, .04 * (c.csHurt || 0) + .06 * (c.csInj || 0));
  if (c.csFast || c.csHurt || c.csInj) parts.push(['Sign-offs', 0, clamp(.5 + csUp * 10 - csDown * 5, 0, 1)]);
  return { seat, p: clamp(parts.reduce((a, x) => a + x[1] * x[2], 0) + csUp - csDown, 0, 1), parts };
}
function review(s) { // the board's end-of-season review
  mods(s);
  const n = s.reports.length, up = s.reports.reduce((t, r) => t + r.up, 0) / n;
  const auditFee = s.fired ? 0 : Math.round(4000 * ((s.org.fc || 0) ? .5 : 1) * ((s.org.audit || 0) ? .5 : 1));
  const gross = s.cash - CASH0 - s.adv - auditFee, tax = Math.max(0, Math.round(gross * .1 * s.m.tax)), net = Math.round(gross - tax);
  const pts = {
    up: 20 * clamp((up - .7) / .25, 0, 1),
    net: 30 * clamp(net / 100000, 0, 1),
    lit: 20 * clamp((s.total - 70) / 90, 0, 1),
    safe: clamp(15 - 2 * s.safety.tags - .5 * s.safety.patches - 3 * (s.safety.inj || 0), 0, 15),
    conf: 15 * clamp((s.conf - 20) / 75, 0, 1),
  };
  const company = pts.up + pts.net + pts.lit + pts.safe + pts.conf, own = personal(s), total = Math.round(company * .8 + own.p * 20);
  const grade = s.fired ? 'D' : total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : 'D';
  return { up, net, tax, auditFee, lit: s.total, pts, company: Math.round(company), own, total, grade, diff: s.diff || 'standard', fired: s.fired, broke: !!s.broke, conf: Math.round(s.conf), tags: s.safety.tags, patches: s.safety.patches, inj: s.safety.inj || 0, heads: headcount(s), perfect: s.reports.filter(r => r.n === N_RIDES).length };
}

/* ---------- big decisions, at the desk between days ----------
   Rare, and caused by what happened before: a ride patched again and again, a gearbox, slewing ring or hydraulic cylinder
   behind repeated failures, a controller that keeps crashing, a ride two overhauls could not save, a claim after an injury.
   They wait at the planning desk for whoever's limit they fall in: the chief executive from $5,000 to $20,000, the board
   above that (proposed by the chief executive, answered at the end of the next day). Left undecided when the gates open,
   they go to the board, which picks the cautious no and trusts you less. Declining a fix leaves the cause in place. */
const WORSE = 1.25, worthIt = (s, b) => DAYS - s.day >= 5 && s.cash >= b.cost + 12000; // a fix pays back only with enough season left
const WORN = { coaster: 'gearbox', water: 'hydraulic cylinder', tower: 'hydraulic cylinder', wheel: 'slewing ring', gondola: 'slewing ring', carousel: 'slewing ring' };
const BIG = {
  // put right, the ride fails less often than before; declined, the cause stays and it fails a quarter more often (WORSE)
  major: { t: r => `Major overhaul of ${r.name}`, why: r => `Patched ${r.pc} times this season, and it keeps coming back. Leave it, and it fails more often.`, cost: () => 5500, fix(s, r) { r.health = 100; r.patched = false; r.hzm = (r.hzm || 1) * .85; }, left(s, r) { r.pc = 0; r.hzm = (r.hzm || 1) * WORSE; } },
  worn: { t: r => `Replace the worn ${WORN[r.kind]} on ${r.name}`, why: r => `${r.mf} mechanical failures this season trace back to it. Leave it, and it fails more often.`, cost: r => r.kind === 'coaster' ? 8500 : 6000, fix(s, r) { r.health = 100; r.hzm = (r.hzm || 1) * .8; }, left(s, r) { r.mf = 0; r.hzm = (r.hzm || 1) * WORSE; } },
  ctrl: { t: r => `Control system upgrade on ${r.name}`, why: r => `${r.cf} control faults this season: the controller is past its best, and it will keep crashing.`, cost: () => 7500, fix(s, r) { r.hzm = (r.hzm || 1) * .9; }, left(s, r) { r.cf = 0; r.hzm = (r.hzm || 1) * WORSE; } },
  refurb: { t: r => `Full refurbishment of ${r.name}`, why: r => `Two overhauls have not saved it: health ${Math.round(r.health)}%, and it fails more often every week.`, cost: () => 24000, fix(s, r) { r.health = 100; r.ovh = 0; r.hzm = .75; }, left() { /* it stays as it is */ } },
  claim: { t: () => 'Injury claim', why: () => 'The technician hurt on site has made a claim. Settle now, or contest it: about a 60% chance it costs more later, and the paper hears of it.', cost: () => 5000 },
};
function bigCheck(s) { // at close: at most one new big decision, spaced out, a few a season
  const cand = [];
  if (s.d.inj && !s.big.some(b => b.k === 'claim') && (s.claims || 0) < 2) cand.push(['claim', null]);
  if (s.day - s.bigDay >= 3 && s.bigN < 4) for (const r of s.rides) {
    if (s.big.some(b => b.rid === r.id) || s.boardQ.some(b => b.rid === r.id)) continue;
    if ((r.pc || 0) >= 3) cand.push(['major', r]);
    else if (WORN[r.kind] && (r.mf || 0) >= 6) cand.push(['worn', r]);
    else if ((r.cf || 0) >= 4) cand.push(['ctrl', r]);
    else if (r.ovh >= 2 && r.health < 50) cand.push(['refurb', r]);
  }
  const c = cand[0]; if (!c) return;
  const [k, r] = c, B = BIG[k], cost = B.cost(r);
  const b = { id: ++s.rq, k, rid: r ? r.id : null, cost, x: band(cost), day: s.day, t: B.t(r), why: B.why(r) };
  if (r) { if (k === 'major') r.pc = 0; else if (k === 'worn') r.mf = 0; else if (k === 'ctrl') r.cf = 0; }
  s.big.push(b); if (k === 'claim') s.claims = (s.claims || 0) + 1; else { s.bigN++; s.bigDay = s.day; }
  log(s, `For the desk: ${b.t}, ${fmtMoney(cost)}. ${b.x === 'board' ? 'Over the chief executive\'s limit, so it goes to the board.' : 'It needs the chief executive.'}`, 'event');
}
const bigOpts = b => b.k === 'claim' ? [OPT('settle', 'Settle', fmtMoney(b.cost) + ' now', true), OPT('contest', 'Contest it', 'Free now; may cost more later')] : b.x === 'board' ? [OPT('yes', 'Propose to the board', `It answers at the end of tomorrow`, true), OPT('no', 'Drop it')] : [OPT('yes', 'Approve', fmtMoney(b.cost) + ', done overnight', true), OPT('no', 'Decline', 'The cause stays')];
function decideBig(s, id, v, who) { // who: 'You', the computer in the seat, or 'The board'
  const i = s.big.findIndex(b => b.id === id); if (i < 0) return false;
  const b = s.big[i], r = b.rid && ride(s, b.rid), B = BIG[b.k], mine = who === 'You';
  if (mine && (!planning(s) || !(b.x === s.seat || (b.x === 'board' && s.seat === 'ceo')))) return false;
  s.big.splice(i, 1);
  if (mine) onTime(s);
  if (b.k === 'claim') {
    if (v === 'settle' && s.cash >= b.cost) { spend(s, 'people', b.cost); log(s, `${Who(who, 'settled')} the injury claim for ${fmtMoney(b.cost)}.`, 'info'); }
    else { s.later.push({ day: s.day + 2, k: 'claim' }); log(s, `${Who(who, 'contested')} the injury claim. The lawyers will know in a couple of days.`, 'info'); }
    return true;
  }
  if (v === 'yes' && b.x === 'board' && who !== 'The board') { b.day = s.phase === 'day' ? s.day : s.day + 1; s.boardQ.push(b); log(s, `${Who(who, 'proposed')} ${b.t.toLowerCase()} to the board. It answers at the end of ${b.day === s.day ? 'today' : 'tomorrow'}.`, 'info'); return true; }
  if (v === 'yes' && s.cash >= b.cost) { spend(s, 'capex', b.cost); B.fix(s, r); log(s, `${Who(who, 'approved')} ${b.t.toLowerCase()} for ${fmtMoney(b.cost)}. The work is done overnight.`, 'good'); return true; }
  B.left(s, r);
  log(s, `${who === 'The board' ? 'The board said no to' : Who(who, 'declined')} ${b.t.toLowerCase()}. ${r.short} will keep failing more often than it should.`, who === 'You' ? 'info' : 'bad'); return true;
}
function boardDecides(s) { // at close: the board answers what was put to it for today
  for (const b of s.boardQ.filter(b => b.day <= s.day)) {
    s.boardQ.splice(s.boardQ.indexOf(b), 1);
    const yes = s.conf >= 55 && s.cash >= b.cost + 10000;
    if (b.k && BIG[b.k]) { const r = b.rid && ride(s, b.rid); if (yes) { spend(s, 'capex', b.cost); BIG[b.k].fix(s, r); log(s, `The board approved ${b.t.toLowerCase()} (${fmtMoney(b.cost)}). The work is done overnight.`, 'good'); } else { BIG[b.k].left(s, r); log(s, `The board turned down ${b.t.toLowerCase()}: ${s.conf < 55 ? 'it does not have the confidence in you' : 'the cash is not there'}.`, 'bad'); } }
    else if (ASK[b.k]) { if (yes && ASK[b.k].check(s, b.o, b.cost) === true) { ASK[b.k].run(s, b.o, b.cost); log(s, `The board said yes: ${ASK[b.k].yes(s, b.o)}.`, 'good'); } else log(s, 'The board said no to your request.', 'bad'); }
  }
}
function bigOvernight(s) { // the computer chief executive decides what is in its limit; a board item it proposes if the cash is there
  for (const b of s.big.slice()) {
    if (b.x === s.seat || (b.x === 'board' && s.seat === 'ceo')) continue;
    const who = holder(s, 'ceo');
    if (b.k === 'claim') decideBig(s, b.id, s.cash > b.cost + 10000 ? 'settle' : 'contest', who);
    else decideBig(s, b.id, worthIt(s, b) ? 'yes' : 'no', who);
  }
}
function bigLate(s) { // the gates open with your big decisions still on the desk: the board takes them
  for (const b of s.big.filter(b => b.x === s.seat || (b.x === 'board' && s.seat === 'ceo'))) {
    miss(s); s.sc[s.seat].esc = (s.sc[s.seat].esc || 0) + 1; s.conf = clamp(s.conf - 3, 0, 100);
    log(s, `You opened the gates with ${b.t.toLowerCase()} still on your desk. The board decided it for you. Board confidence −3.`, 'bad');
    decideBig(s, b.id, b.k === 'claim' ? 'contest' : 'no', 'The board');
  }
}

/* stores */
function price(s, sku, kind) {
  const p = SKU[sku][2];
  if (kind === 'exp') return Math.round(p * (1 + (has(s, 'mat') ? .3 : .6) * s.m.exp)) + (s.up.courier ? 0 : 60);
  if (kind === 'fab') return Math.round(p * .35);
  return Math.round(p * (s.up.supplier ? .85 : 1) * (has(s, 'mat') ? .8 : 1) * s.m.parts);
}
function expressEta(s) { return s.clock + Math.max(30, Math.round((s.up.courier ? 60 : 90) + s.m.expTime)) + (onNow(s, 'store') ? 0 : 30); }
function order(s, sku, kind) {
  if (!SKU[sku]) return 'Unknown item';
  const c = price(s, sku, kind);
  if (kind === 'fab') { if (!SKU[sku][3]) return 'Cannot be made in house'; if (!has(s, 'mach')) return 'You have no machinist'; if (s.fab.length >= 4) return 'The workshop queue is full'; }
  if (kind === 'exp') { if (s.phase !== 'day') return 'Express runs only while the park is open'; if (expressEta(s) > CLOSE - 10) return 'Too late in the day for the courier'; }
  if (s.cash < c) return 'Not enough cash';
  spend(s, 'parts', c);
  if (kind === 'fab') s.fab.push({ sku, left: SKU[sku][3], total: SKU[sku][3] });
  else if (kind === 'exp') { s.inbound.push({ sku, at: expressEta(s), due: s.day }); }
  else s.inbound.push({ sku, at: 0, due: s.phase === 'day' || s.closed ? s.day + 1 : s.day });
  return true;
}
/* people and projects, at the planning desk */
const planning = s => s.phase === 'plan' && !s.final;
const hireFee = s => Math.round((has(s, 'hr') ? 200 : 400) * s.m.fee);
const ovhCost = s => Math.round((has(s, 'eng') ? 1800 : 2400) * s.m.capex);
const perkCost = (s, k) => Math.round(PERKS[k][2] * s.m.capex);
function hire(s, i) {
  const c = s.cands[i]; if (!c || c.gone || !planning(s) || s.cash < hireFee(s) || s.crew.length >= 16) return false;
  spend(s, 'people', hireFee(s)); c.gone = true;
  const t = mkStaff(s, c.name, c.role, Object.assign({}, c.skills), 'early', c.grade); s.crew.push(t); place(t); mods(s);
  return true;
}
function advertise(s) { if (!planning(s) || s.cash < COST.advert) return false; spend(s, 'people', COST.advert); s.cands = rollCands(s); return true; }
function dismiss(s, t) { if (!t || !planning(s)) return false; s.crew.splice(s.crew.indexOf(t), 1); mods(s); for (const c of s.crew) if (!isMgr(c) && !isMgr(t)) c.morale = clamp(c.morale - 4, 0, 100); return true; }
const trainCost = (s, g) => Math.round(700 * (g + 1) * (has(s, 'hr') ? .7 : 1) * s.m.train);
const crossCost = s => Math.round(COST.cross * (has(s, 'hr') ? .7 : 1) * s.m.train);
function train(s, t, tr) { // raise a grade, or add a second trade at apprentice level
  if (!t || !planning(s)) return false;
  if (t.role === 'mach') { const c = trainCost(s, t.grade); if (t.grade >= 3 || s.cash < c) return false; spend(s, 'people', c); t.grade++; t.morale = clamp(t.morale + 6, 0, 100); return true; }
  if (t.role !== 'tech' || !TRADES[tr]) return false;
  const g = t.skills[tr] || 0, c = g ? trainCost(s, g) : crossCost(s);
  if (g >= 3 || s.cash < c) return false;
  spend(s, 'people', c); t.skills[tr] = g + 1; t.morale = clamp(t.morale + 6, 0, 100); return true;
}
function payRise(s, t) { if (!t || !planning(s) || isMgr(t) || t.raises >= 2) return false; t.raise = +(t.raise * 1.1).toFixed(3); t.raises++; t.morale = clamp(t.morale + 15, 0, 100); return true; }
function teamMeal(s) { if (!planning(s) || s.meal || s.cash < COST.meal) return false; spend(s, 'people', COST.meal); s.meal = true; for (const t of s.crew) if (!isMgr(t)) t.morale = clamp(t.morale + (has(s, 'hr') ? 12 : 7), 0, 100); s.cm = clamp(s.cm + 5, 0, 100); mods(s); return true; }
function consult(s) { if (!planning(s) || s.consult === s.reports.length + 1 || s.cash < 1500) return false; spend(s, 'contract', 1500); s.consult = s.reports.length + 1; s.conf = clamp(s.conf + 6, 0, 100); return true; }
function advance(s) { if (!planning(s) || s.adv || s.conf < 50) return false; s.cash += COST.advance; s.adv = COST.advance; s.conf -= 12; return true; }
function setShift(s, t, sh) { if (t && planning(s) && SHIFT[sh] && !isMgr(t)) { t.shift = sh; t.once = false; return true; } return false; }
function buyPerk(s, k) {
  if (!PERKS[k] || s.up[k] || !planning(s) || s.cash < perkCost(s, k)) return false;
  spend(s, 'capex', perkCost(s, k)); s.up[k] = true;
  if (k === 'carts') s.mult.speed = 1.6; if (k === 'tools') s.mult.work = 1.2; if (k === 'shade') s.qtol = 32;
  return true;
}
function overhaul(s, r) {
  if (!r || !planning(s) || r.ovh >= 2 || s.cash < ovhCost(s)) return false;
  spend(s, 'capex', ovhCost(s)); if (r.job) dropJob(s, r);
  r.health = 100; r.wear = +(r.wear * .7).toFixed(2); r.ovh++; r.patched = false; return true;
}

function alerts(s) {
  const out = [];
  if (s.phase !== 'day') return out;
  for (const r of s.rides) {
    const j = r.job; if (!j || j.type !== 'fault') continue;
    const crew = s.crew.some(c => c.target === r.id);
    if (j.rescue) out.push({ k: 'rescue', id: r.id, t0: j.t0, due: j.rescue, txt: `Guests stuck on ${r.short}` });
    if (j.sev === 'minor' && j.esc && !crew) out.push({ k: 'esc', id: r.id, t0: j.t0, due: j.esc, txt: `${r.short} gets worse` });
    else if (!crew && !j.rescue) out.push({ k: 'open', id: r.id, t0: j.t0, due: j.par, txt: `${r.short} ${r.sub ? 'closed' : 'down'}` });
  }
  for (const w of s.waves) if (w.warned && !w.hit) out.push({ k: 'wave', id: null, t0: w.at - 30, due: w.at, txt: `Squall: about ${w.size} breakdowns` });
  return out.sort((a, b) => a.due - b.due);
}
G.LF = { createFault, SO_STEPS, SO_NAME, SO_SIGN, SO_LAG, REVIEW, soKind, soBad, soSigner, soStepAll, safetyJob, hourly, signFit, padOff, countersign, review, worthIt, SAVE_V, migrate, ESC_DELAY, INBOX_CAP, above, escalate, LIMIT_BOARD: 20000, band, weakAsk, BIG, bigOpts, decideBig, DIFF, setDiff, fastOf, GKIND, TOPIC, orderService, fastLane, happyHour, briefChair, personal, GLITCH, GLITCH_RATE, GLITCH_ESC, glitch, FAST, AGENCY, VOUCH, enOf, enMult, gentle, rest, talk, rush, callIn, agency, vouch, DTYPE, STRATEGY, ALIGN, polAligned, setStrategy, optsOf, gutOk, procedure, LV, RANK, LIMIT, SEATNAME, BOSS, FOCUS, WALK, ASK, REQ, setSeat, ask, answer, lockout, diagnose, walk, setFocus, setBudget, handler, holder, filled, maintSpend, me, decider, helper, bestCand, alerts, moveOrder, sprint, pushOn, crowdPleaser, DEPTS, EXEC, ORG, ORGX, ADDKEYS, OVERHEAD, mods, orgWages, headcount, orgFee, hireOrg, fireOrg, perkCost, calloutCost, consult, dow, OPEN, CLOSE, LH, DAYS, LIT_MIN, CASH0, TRADES, JOBTITLE, GRADE, DOW, SHIFT, YARD, STORE, SHOP, OFFICE, GATE, MGR, MEMOS, isMgr, hazard, hireFee, ovhCost, crossCost, advertise, payRise, teamMeal, advance, moraleMult, NODES, N_RIDES, SKU, PERKS, COST, AV,
  newGame, startDay, step, status, assign, setMode, standDown, holdOver, callout, order, price, expressEta, hire, dismiss, train, trainCost, setShift, buyPerk, overhaul,
  ride, staff, primary, need, speed, rate, wage, otCost, topSkill, roleKey, has, onNow, incoming, partReady, attendance, fmtClock, fmtMoney, clamp, subDown };
})(typeof window !== 'undefined' ? window : globalThis);
