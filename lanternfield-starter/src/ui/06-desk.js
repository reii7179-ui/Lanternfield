/* ---------- the planning desk ---------- */
const lantSVG = lit => `<svg viewBox="0 0 34 44" aria-hidden="true"><path d="M17 2v5" stroke="${lit ? '#f7edd8' : '#565c8a'}" stroke-width="2" stroke-linecap="round"/><rect x="6" y="8" width="22" height="26" rx="9" fill="${lit ? '#ffb347' : 'none'}" stroke="${lit ? '#ffd27a' : '#565c8a'}" stroke-width="2"/>${lit ? '<rect x="12" y="14" width="10" height="14" rx="5" fill="#fff1c9"/>' : ''}<path d="M11 36h12l-2 5h-8z" fill="${lit ? '#f7edd8' : '#565c8a'}"/></svg>`;
function plTable(pl, net) {
  const row = (n, v, neg) => `<tr><td>${n}</td><td class="r">${v ? (neg ? '−' : '') + fmtMoney(Math.abs(v)).replace('−', '') : '·'}</td></tr>`;
  return `<table class="t"><tbody>${row('Takings from the rides', pl.income)}${row('Group sales, sponsors and interest', pl.flat)}${row('Bonuses less fines and incidents', pl.bonus, pl.bonus < 0)}${row('Maintenance crew wages', pl.wages, 1)}${row('Company salaries', pl.salaries, 1)}${row('Overheads: power, lease, insurance', pl.overhead, 1)}${row('Overtime', pl.ot, 1)}${row('Parts and stores', pl.parts, 1)}${row('Contractors', pl.contract, 1)}${row('Hiring and training', pl.people, 1)}${row('Projects', pl.capex, 1)}<tr class="sum"><td>Result for the day</td><td class="r" style="color:var(--${net >= 0 ? 'jade' : 'ember'})">${fmtMoney(net)}</td></tr></tbody></table>`;
}
function reportTab() {
  const rep = S.reports[S.reports.length - 1], rides = S.rides.filter(r => r.sub);
  let li = 0; const allLit = rep.n === L.N_RIDES;
  return `<div class="row" style="gap:20px;align-items:flex-end"><div class="bignum"><span class="cnt" aria-hidden="true" style="--to:${rep.n};--dur:${rep.n * 140}ms;--delay:300ms"></span><span class="sr">${rep.n}</span><span style="font-size:.4em;color:var(--dim)"> of ${L.N_RIDES}</span></div><div class="rephead" style="flex:1;min-width:200px;--delay:${300 + rep.n * 140}ms"><h2 style="font:400 26px/1.05 var(--display)">${L.dow(rep.day)} night: ${rep.n === L.N_RIDES ? 'every lantern up' : rep.n >= 9 ? 'a bright night' : rep.n >= 6 ? 'a patchy night' : 'a dark night'}</h2><p class="dim">${S.total} lanterns so far. ${L.DAYS - rep.day} day${L.DAYS - rep.day === 1 ? '' : 's'} to go.</p></div></div>
<div class="lrow${allLit ? ' all' : ''}" style="--n:${rep.n}">${rides.map(r => `<div class="lant${rep.lit.includes(r.id) ? ' lit' : ''}"${rep.lit.includes(r.id) ? ` style="--i:${li++}"` : ''}>${lantSVG(rep.lit.includes(r.id))}<span>${esc(r.short)}</span></div>`).join('')}</div>
<div class="two"><div class="tw">${plTable(rep.pl, rep.net)}</div><div class="tiles">
<div class="tile"><small>Uptime</small><b>${Math.round(rep.up * 100)}%</b><i>earnings-weighted</i></div>
<div class="tile"><small>Average glow</small><b>${Math.round(rep.glow)}</b><i>out of 100</i></div>
<div class="tile"><small>Faults</small><b>${rep.fixed} fixed</b><i>${rep.faults} raised today</i></div>
<div class="tile"><small>VIP party</small><b>${rep.vip == null ? 'None' : rep.vip ? 'Delighted' : 'Let down'}</b><i>${rep.insp == null ? 'no inspection' : rep.insp ? 'inspector: clean sheet' : 'inspector: red tags'}</i></div>
<div class="tile"><small>The board asked</small><b style="color:var(--${rep.memo.met ? 'jade' : 'ember'})">${rep.memo.met ? 'Delivered' : 'Missed'}</b><i>${esc(L.MEMOS[rep.memo.k])} Confidence now ${rep.conf}.</i></div>
<div class="tile"><small>Quick fixes</small><b>${rep.quick || 0}</b><i>${rep.rescued || 0} rescue${rep.rescued === 1 ? '' : 's'} · best streak ×${rep.best || 0}</i></div>
${rep.mvp ? `<div class="tile"><small>Busiest hands</small><b>${esc(rep.mvp.name)}</b><i>${rep.mvp.n} job${rep.mvp.n > 1 ? 's' : ''} finished</i></div>` : ''}</div></div>
${seatReport(rep)}`;
}
function deskNote(k) { // who owns this part of the desk, and what your seat can do about it
  const x = S.seat, owner = L.SEATNAME[OWN[k]], askB = (kk, attrs, lbl) => `<button type="button" class="btn sm" data-a="ask" data-k="${kk}" ${attrs}>${lbl}</button>`;
  if (may(k)) return L.RANK[x] > L.RANK[OWN[k]] ? `<div class="warnbox c-dim">This is normally the ${owner}'s job. As ${ROLE[x].title} you can step in, but every change you make here is one they did not make.</div>` : '';
  let asks = '';
  if (k === 'roster' && S.phase === 'plan') asks = `<div class="row">${['mech', 'elec', 'ctrl', 'sup'].map(tr => askB('hire', `data-tr="${tr}" data-fk="ah-${tr}"`, `Ask for another ${L.JOBTITLE[tr].toLowerCase()}`)).join('')}</div>`;
  return `<div class="warnbox c-dim"><b>The ${owner} decides this.</b> As ${ROLE[x].title} you can see it but not change it.${asks ? ' You can ask, and they will answer tonight.' : ''}${asks}</div>`;
}
function teamTab() {
  const plan = S.phase === 'plan', ed = plan && may('roster'), people = S.crew.filter(c => !c.temp), fee = L.hireFee(S);
  const bill = people.reduce((t, c) => t + L.wage(c) + (c.shift === 'full' && !L.isMgr(c) ? L.otCost(c) : 0), 0);
  const cov = Object.keys(L.TRADES).map(tr => {
    const on = sh => people.filter(c => c.skills[tr] && (c.shift === sh || c.shift === 'full')).map(c => c.name);
    const e = on('early'), l = on('late');
    return `<div${!e.length || !l.length ? ' class="hasgap"' : ''}><b class="t-${tr}" style="color:var(--c)">${L.TRADES[tr]}</b>09 to 14: ${e.length ? esc(e.join(', ')) : '<span class="gap">nobody</span>'}<br>14 to 17: ${e.concat(l.filter(n => !e.includes(n))).length ? esc(e.concat(l.filter(n => !e.includes(n))).join(', ')) : '<span class="gap">nobody</span>'}<br>17 to 22: ${l.length ? esc(l.join(', ')) : '<span class="gap">nobody</span>'}</div>`;
  }).join('');
  const sv = role => { const p = people.filter(c => c.role === role); return p.length ? p.map(c => `${c.name} (${SHIFTS[c.shift].toLowerCase()})`).join(', ') : '<span class="gap">none employed</span>'; };
  const rows = people.map(c => {
    let acts = '';
    if (ed) {
      if (c.role === 'tech') {
        for (const tr in c.skills) if (c.skills[tr] < 3) acts += `<button type="button" class="btn sm" data-a="train" data-t="${c.id}" data-k="${tr}" data-fk="tr-${c.id}-${tr}"${S.cash >= L.trainCost(S, c.skills[tr]) ? '' : ' disabled'}>${L.TRADES[tr].slice(0, 4)} to grade ${c.skills[tr] + 1}, ${fmtMoney(L.trainCost(S, c.skills[tr]))}</button> `;
        for (const tr in L.TRADES) if (!c.skills[tr] && Object.keys(c.skills).length < 2) acts += `<button type="button" class="btn sm" data-a="train" data-t="${c.id}" data-k="${tr}" data-fk="tr-${c.id}-${tr}"${S.cash >= L.crossCost(S) ? '' : ' disabled'}>Add ${L.TRADES[tr].toLowerCase()}, ${fmtMoney(L.crossCost(S))}</button> `;
      } else if (c.role === 'mach' && c.grade < 3) acts += `<button type="button" class="btn sm" data-a="train" data-t="${c.id}" data-k="" data-fk="tr-${c.id}"${S.cash >= L.trainCost(S, c.grade) ? '' : ' disabled'}>To grade ${c.grade + 1}, ${fmtMoney(L.trainCost(S, c.grade))}</button> `;
      if (!L.isMgr(c) && c.raises < 2) acts += `<button type="button" class="btn sm" data-a="raise" data-t="${c.id}" data-fk="rs-${c.id}">Pay rise 10%</button> `;
      acts += `<button type="button" class="btn sm" data-a="dismiss" data-t="${c.id}" data-fk="dm-${c.id}">Let go</button>`;
    } else if (!plan && S.seat !== 'tech' && c.on && c.shift === 'early') acts = `<button type="button" class="btn sm" data-a="holdp" data-t="${c.id}" data-fk="hp-${c.id}">Hold on overtime, ${fmtMoney(L.otCost(c))}</button>`;
    return `<tr><td><div class="row" style="flex-wrap:nowrap">${avHTML(c)}<div><b>${esc(c.name)}</b><small>${title(c)}${gradeOf(c) ? ', ' + L.GRADE[gradeOf(c)].toLowerCase() : ''}${c.tired ? ' · tired after a full day' : ''}</small></div></div></td>
<td style="white-space:nowrap">${skillsHTML(c) || '<span class="dim">·</span>'}</td><td class="r">${fmtMoney(L.wage(c))}${c.shift === 'full' && !L.isMgr(c) ? `<small>+${fmtMoney(L.otCost(c))} overtime</small>` : ''}</td>
<td>${L.isMgr(c) ? '<span class="dim">Office hours</span>' : `<span class="seg3" role="group" aria-label="Shift for ${esc(c.name)}">${Object.keys(SHIFTS).map(sh => `<button type="button" data-a="shift" data-t="${c.id}" data-v="${sh}" data-fk="sh-${c.id}-${sh}" aria-pressed="${c.shift === sh}"${ed ? '' : ' disabled'}>${sh === 'early' ? 'Early' : sh === 'late' ? 'Late' : 'Full day'}</button>`).join('')}</span>`}</td>
<td style="min-width:90px">${L.isMgr(c) ? '<span class="dim">·</span>' : `<div class="meter c-${c.morale >= 55 ? 'ok' : c.morale >= 30 ? 'warn' : 'bad'}"><div class="bar"><span style="width:${Math.round(c.morale)}%"></span></div><b>${Math.round(c.morale)}</b></div>`}</td><td>${acts}</td></tr>`;
  }).join('');
  const P = S.pol, hasSup = L.has(S, 'sup');
  const seg = (k, opts) => `<span class="seg3">${opts.map(([v, l]) => `<button type="button" data-a="pol" data-k="${k}" data-v="${v}" data-fk="pol-${k}-${v}" aria-pressed="${String(P[k]) === String(v)}"${may('policy') ? '' : ' disabled'}>${l}</button>`).join('')}</span>`;
  const cands = plan ? `<section class="sect"><h2 class="cap">Applicants <span class="chip c-dim">${fmtMoney(fee)} to take one on</span><button type="button" class="btn sm" data-a="advert" data-fk="advert"${ed && S.cash >= L.COST.advert ? '' : ' disabled'}>Advertise again, ${fmtMoney(L.COST.advert)}</button></h2><div class="cards">${S.cands.map((c, i) => { const k = c.role === 'tech' ? Object.keys(c.skills)[0] : c.role, w = L.wage(c); return `<div class="card${c.gone ? ' sold' : ''}"><div class="row" style="flex-wrap:nowrap"><span class="av t-${k}" aria-hidden="true">${esc(c.name[0])}</span><div><h3>${esc(c.name)}</h3><span class="note">${L.JOBTITLE[k]}${c.role === 'tech' || c.role === 'mach' ? ', ' + L.GRADE[c.grade].toLowerCase() + ' ' + pips(c.grade, k) : ''}</span></div></div><p>${{ sup: 'Dispatches work orders to the policy you set, so you can run the business.', mach: 'Makes bearings, chain links and brake fins in the workshop at about a third of list price.', store: 'Runs parts out to the job and books deliveries in. Places the overnight order to your minimum levels.', eng: MGRDOES.eng, mat: MGRDOES.mat, hr: MGRDOES.hr }[c.role] || `Only does ${L.TRADES[k].toLowerCase()} work.${c.grade === 1 ? ' Slow for now. Earns tradesperson grade after five jobs.' : ''}`}</p><div class="row" style="justify-content:space-between"><span class="price num">${fmtMoney(w)}<span style="font:500 12px var(--body);color:var(--dim)"> a day</span></span>${c.gone ? '<span class="chip c-ok">Hired</span>' : `<button type="button" class="btn${S.cash >= fee ? ' go' : ''}" data-a="hire" data-i="${i}" data-fk="hire-${i}"${ed && S.cash >= fee && S.crew.length < 16 ? '' : ' disabled'}>${ed ? 'Hire' : 'Manager decides'}</button>`}</div></div>`; }).join('')}</div></section>` : '';
  return `${deskNote('roster')}<section class="sect"><h2 class="cap">Cover ${plan ? 'for ' + L.dow(upcoming()) : 'today'}${(() => { const g = Object.keys(L.TRADES).reduce((n, tr) => n + ['early', 'late'].filter(sh => !people.some(c => c.skills[tr] && (c.shift === sh || c.shift === 'full'))).length, 0); return g ? ` <span class="chip c-bad">${g} gap${g > 1 ? 's' : ''}</span>` : ' <span class="chip c-ok">every trade covered</span>'; })()}</h2><div class="cover">${cov}<div><b>Support</b>Storeman: ${sv('store')}<br>Machinist: ${sv('mach')}<br>Supervisor: ${sv('sup')}</div></div>
<p class="note">People only do the work they are qualified for. A fault with nobody of that trade on shift waits, unless you pay for overtime or a contractor.</p></section>
<section class="sect"><h2 class="cap">Roster <span class="chip c-warn num">${fmtMoney(bill)} wage bill a day</span></h2><div class="tw"><table class="t"><thead><tr><th>Name</th><th>Trade and grade</th><th class="r">Wage</th><th>Shift</th><th>Morale</th><th>${plan ? 'Develop' : ''}</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">A full day is five hours of overtime at time and a half. The person works 15% slower the next day and their morale drops. Morale sets how fast people work. Below 25 they start calling in sick, and below 10 they quit.${plan ? '' : ' Shifts, hiring and training are set at the planning desk after closing.'}</p>${ed ? `<div class="row"><button type="button" class="btn sm" data-a="meal" data-fk="meal"${!S.meal && S.cash >= L.COST.meal ? '' : ' disabled'}>${S.meal ? 'Team meal booked' : `Buy the team a meal, ${fmtMoney(L.COST.meal)}: morale +${L.has(S, 'hr') ? 12 : 7} for everyone`}</button></div>` : ''}</section>
<section class="sect"><h2 class="cap">Supervisor policy</h2>${may('policy') ? '' : `<p class="note">Set by the ${L.SEATNAME.mgr}. ${S.seat === 'sup' ? 'While you run the shift these rules do nothing: you decide.' : ''}</p>`}${hasSup ? `<div class="tw"><table class="t"><tbody>
<tr><td>Dispatch work orders<small>Critical and high earners first, best qualified person who is free.</small></td><td>${seg('auto', [[true, 'Supervisor'], [false, 'I will']])}</td></tr>
<tr><td>When the part is not in stores<small>Wait for stock, patch and move on, or pay for an express order.</small></td><td>${seg('nopart', [['wait', 'Wait'], ['patch', 'Patch'], ['express', 'Express']])}</td></tr>
<tr><td>Service rides when health drops below<small>Before 19:00, when someone is free and a kit is in stores.</small></td><td>${seg('pm', [[0, 'Off'], [40, '40%'], [55, '55%'], [70, '70%']])}</td></tr></tbody></table></div>` : '<div class="empty">You have no supervisor, so every work order is yours to dispatch. Hire one and they will dispatch to rules you set here.</div>'}</section>${cands}`;
}
function storesTab() {
  const day = S.phase === 'day', when = day || S.closed ? (day ? 'tomorrow 09:00' : '09:00') : '09:00';
  const rows = Object.keys(L.SKU).map(k => {
    const [n, tr, , fab, use] = L.SKU[k], inb = S.inbound.filter(o => o.sku === k), fb = S.fab.filter(f => f.sku === k).length;
    const res = S.rides.filter(r => r.job && r.job.part === k && r.job.ps !== 'none' && r.job.ps !== 'onsite').length;
    const want = S.rides.filter(r => r.job && r.job.type === 'fault' && r.job.part === k && r.job.mode === 'full' && r.job.ps === 'none').length;
    const b = (kind, lbl) => { const c = L.price(S, k, kind); return `<button type="button" class="btn sm" data-a="order" data-k="${k}" data-v="${kind}" data-fk="od-${k}-${kind}"${S.cash >= c && canSpend(c) ? '' : ' disabled'}${canSpend(c) ? '' : ' title="Over your spending limit"'}>${lbl} ${fmtMoney(c)}</button>`; };
    return `<tr><td><b>${n}</b><small>${use}</small></td><td>${tr ? `<span class="chip t-${tr}">${L.TRADES[tr].slice(0, 4)}</span>` : '<span class="chip c-dim">Any</span>'}</td>
<td class="r"><b style="font-size:15px;color:var(--${S.stock[k] ? 'ink' : want ? 'ember' : 'dim'})">${S.stock[k]}</b>${res ? `<small>${res} picked</small>` : ''}${want ? `<small style="color:var(--ember)">${want} job${want > 1 ? 's' : ''} waiting</small>` : ''}</td>
<td class="r">${inb.length + fb || '·'}${inb.some(o => o.at) ? `<small>${fmtClock(Math.min(...inb.filter(o => o.at).map(o => o.at)))}</small>` : ''}</td>
<td><span class="step"><button type="button" data-a="min" data-k="${k}" data-v="-1" data-fk="mn-${k}" aria-label="Lower minimum for ${n}"${may('stock') ? '' : ' disabled'}>−</button><b class="num">${S.min[k]}</b><button type="button" data-a="min" data-k="${k}" data-v="1" data-fk="mx-${k}" aria-label="Raise minimum for ${n}"${may('stock') ? '' : ' disabled'}>+</button></span></td>
<td class="r">${S.used[k] || '·'}</td><td style="white-space:nowrap">${b('std', 'Order')} ${day ? b('exp', 'Express') : ''} ${fab && L.has(S, 'mach') ? b('fab', 'Make') : ''}</td></tr>`;
  }).join('');
  const value = Object.keys(L.SKU).reduce((t, k) => t + S.stock[k] * L.SKU[k][2], 0);
  const lim = S.seat === 'tech' ? '<div class="warnbox c-dim"><b>Technicians draw parts; they do not buy them.</b> Ask for an express part from your own card when a job is waiting.</div>' : !may('stock') ? `<div class="warnbox c-dim">You can buy parts up to ${fmtMoney(L.LIMIT[S.seat])} each. Minimum stock levels are the ${L.SEATNAME.mgr}'s call.</div>` : L.LIMIT[S.seat] < 1e6 ? `<p class="note">Your spending limit: ${fmtMoney(L.LIMIT[S.seat])} an order.</p>` : '';
  return `${lim}<p class="note" style="max-width:86ch">A full repair needs its part on the shelf. Standard orders arrive at ${when}${S.up.supplier ? ' at 15% off' : ''}. Express costs 60% more${S.up.courier ? '' : ' plus a $60 call-out'} and lands in ${S.up.courier ? 60 : 90} minutes, only while the park is open. ${L.has(S, 'mach') ? 'Your machinist makes some mechanical parts at about a third of list price.' : 'With a machinist you could make some mechanical parts in house.'} ${L.has(S, 'store') ? 'Each night the storeman orders up to the minimum you set.' : 'With no storeman, crew fetch their own parts and nobody places the overnight order.'}</p>
<div class="tw"><table class="t"><thead><tr><th>Item</th><th>Trade</th><th class="r">On shelf</th><th class="r">Coming</th><th>Minimum</th><th class="r">Used</th><th>Buy</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="row"><span class="chip c-dim num">${fmtMoney(value)} sitting on the shelves</span>${S.fab.length ? `<span class="chip t-mach">Workshop queue: ${S.fab.map(f => esc(L.SKU[f.sku][0].toLowerCase()) + ' ' + Math.round((1 - f.left / f.total) * 100) + '%').join(', ')}</span>` : ''}${S.heat || (S.forecast && S.forecast.heat) ? '<span class="chip c-bad">Heatwave: expect more electrical faults</span>' : ''}</div>`;
}
function projectsTab() {
  const okP = c => may('perk') && canSpend(c), askP = L.RANK[S.seat] >= 1 && S.phase === 'plan';
  const cards = Object.keys(L.PERKS).map(k => { const [n, sub] = L.PERKS[k], c = L.perkCost(S, k), own = S.up[k]; return `<div class="card${own ? ' sold' : ''}"><h3>${n}</h3><p>${sub}</p><div class="row" style="justify-content:space-between"><span class="price num">${fmtMoney(c)}</span>${own ? '<span class="chip c-ok">In place</span>' : okP(c) ? `<button type="button" class="btn${S.cash >= c ? ' go' : ''}" data-a="perk" data-k="${k}" data-fk="pk-${k}"${S.cash >= c ? '' : ' disabled'}>Approve</button>` : `<button type="button" class="btn" data-a="ask" data-k="perk" data-pk="${k}" data-fk="pk-${k}"${askP ? '' : ' disabled'}>Ask ${esc(askWho('dir', c))}</button>`}</div></div>`; }).join('');
  const rides = S.rides.slice().sort((a, b) => a.health - b.health).map(r => `<tr><td><b>${esc(r.name)}</b><small>${r.sub ? fmtMoney(r.cap * r.fare * .65 * 60 * .8) + ' an hour at peak' : 'Powers six rides'}${r.patched ? ' · on a patch' : ''}${r.job && r.job.type === 'fault' ? ' · open fault' : ''}</small></td><td style="min-width:130px"><div class="meter c-${r.health >= 60 ? 'ok' : r.health >= 35 ? 'warn' : 'bad'}"><div class="bar"><span style="width:${Math.round(r.health)}%"></span></div><b>${Math.round(r.health)}%</b></div></td><td class="r">${r.wear.toFixed(1)}% an hour</td><td class="r">${r.ovh >= 2 ? '<span class="chip c-ok">Overhauled twice</span>' : okP(L.ovhCost(S)) ? `<button type="button" class="btn sm" data-a="ovh" data-id="${r.id}" data-fk="ov-${r.id}"${S.cash >= L.ovhCost(S) ? '' : ' disabled'}>Overhaul ${fmtMoney(L.ovhCost(S))}</button>` : `<button type="button" class="btn sm" data-a="ask" data-k="ovh" data-id="${r.id}" data-fk="ov-${r.id}"${askP ? '' : ' disabled'}>Ask for an overhaul</button>`}</td></tr>`).join('');
  return `${may('perk') ? deskNote('perk') : `<div class="warnbox c-dim"><b>Projects and overhauls are the ${L.SEATNAME.dir}'s call</b>, up to ${fmtMoney(L.LIMIT.dir)}.${S.seat === 'tech' ? ' Technicians do not ask for capital spending directly.' : ' You can ask at the planning desk, and get an answer straight away.'}</div>`}<section class="sect"><h2 class="cap">Capital projects</h2><p class="note">One-off spends that last the rest of the season. They come out of the same cash the board judges the company on.</p><div class="cards">${cards}</div></section>
<section class="sect"><h2 class="cap">Overnight overhaul</h2><p class="note">Health to 100%, any fault or patch cleared, and the ride wears 30% slower from then on.</p><div class="tw"><table class="t"><thead><tr><th>Asset</th><th>Health</th><th class="r">Wear</th><th></th></tr></thead><tbody>${rides}</tbody></table></div></section>`;
}
const pc = v => Math.round(Math.abs(v) * 100) + '%';
const FXT = {
  crowd: v => `Guests +${pc(v)}`, spend: v => `Spend per rider +${pc(v)}`, cap: v => `Ride capacity +${pc(v)}`, pen: v => `Closures hurt the glow ${pc(v)} less`, wear: v => `Wear −${pc(v)}`, hazard: v => `Faults −${pc(v)}`,
  work: v => `Repairs ${pc(v)} faster`, parts: v => `Parts −${pc(v)}`, exp: v => `Express premium −${pc(v)}`, overhead: v => `Overheads −${(Math.abs(v) * 100).toFixed(1).replace('.0', '')}%`, leak: v => `Theft and leakage −${pc(v)}`, fee: v => `Hiring fees −${pc(v)}`,
  train: v => `Training −${pc(v)}`, capex: v => `Projects and overhauls −${pc(v)}`, contractor: v => `Contractors −${pc(v)}`, fine: v => `Fines −${pc(v)}`, pIT: v => `System outages −${pc(v)}`, pCyber: v => `Cyber attacks −${pc(v)}`,
  pEnv: v => `Environmental fines −${pc(v)}`, pSafety: v => `Guest injuries −${pc(v)}`, pLegal: v => `Legal disputes −${pc(v)}`, tax: v => `Year-end tax −${pc(v)}`, fab: v => `Workshop ${pc(v)} faster`, flat: v => `Brings in ${fmtMoney(v)} a day`,
  glow: v => `Glow +${v}`, rnd: v => `${v} research points a day`, conf: v => `Board confidence +${v} a day`, morale: v => `Morale +${v} a day`, ins: () => 'Insurance pays half of injury claims', expTime: v => `Express ${Math.abs(v)} minutes faster`, yield: () => 'Earns 0.3% a day on cash in the bank',
};
function fxText(p) {
  const auto = Object.entries(p[6]).map(([k, v]) => FXT[k](v)).join('. ');
  if (p[7]) return p[7] + (auto ? ' ' + auto + '.' : '');
  if (auto) return auto + '.';
  const hasDir = L.ORG.some(x => x[2] === p[2] && x[3] === 'd');
  return p[3] === 'd' ? 'Lifts everyone in the department by a further 20 points of effectiveness.' : hasDir ? 'Lifts the department from 60% to 80% effectiveness.' : 'Lifts the department from 60% to full effectiveness.';
}
const LVL = { x: 'Executive', d: 'Director', m: 'Manager', s: 'Supervisor', w: 'Staff', j: 'Junior' };
function dirHTML() { // the director's levers, visible to everyone
  const ed = may('focus'), ce = S.seat === 'ceo' && S.phase === 'plan';
  return `<div class="sect"><h2 class="cap">Company strategy <span class="chip c-dim">${S.seat === 'ceo' ? (ce ? 'yours to set' : 'change it at the planning desk') : 'set by the chief executive'}</span></h2>
<div class="row"><span class="seg3" role="group" aria-label="Strategy">${Object.keys(L.STRATEGY).map(k => `<button type="button" data-a="setstrat" data-v="${k}" data-fk="ds-${k}" aria-pressed="${S.strategy === k}"${ce ? '' : ' disabled'}>${L.STRATEGY[k][0]}</button>`).join('')}</span></div>
<p class="note">${L.STRATEGY[S.strategy][1]} A strategic choice: it lasts all season, and changing it after the first day costs board confidence and office morale. The director's daily priority is expected to follow it.</p></div>
<div class="sect"><h2 class="cap">Direction for ${S.phase === 'plan' ? L.dow(upcoming()) : 'today'} <span class="chip c-dim">${ed ? 'yours to set' : 'set by the ' + L.SEATNAME.dir}</span></h2>
${S.phase === 'day' && S.gates ? '<p class="note" style="color:var(--lantern)">The gates are open: changing the priority now means an hour of slower work, and the managers are unsettled.</p>' : ''}<div class="row"><span class="seg3" role="group" aria-label="Priority">${Object.keys(L.FOCUS).map(f => `<button type="button" data-a="setfocus" data-v="${f}" data-fk="df-${f}" aria-pressed="${S.focus === f}"${ed ? '' : ' disabled'}>${L.FOCUS[f]}</button>`).join('')}</span>
<span class="step"><button type="button" data-a="budget" data-v="-250" data-fk="db-dn" aria-label="Lower the maintenance budget"${ed ? '' : ' disabled'}>−</button><b class="num" style="min-width:120px;text-align:center">${fmtMoney(S.budget)} a day</b><button type="button" data-a="budget" data-v="250" data-fk="db-up" aria-label="Raise the maintenance budget"${ed ? '' : ' disabled'}>+</button></span></div>
<p class="note">The priority steers every manager: with uptime first they pay for express parts and contractors, with costs first they wait for stock, with safety first nobody patches. The maintenance budget covers crew wages, overtime, parts and contractors, and the Engineering Manager is judged against it.</p></div>`;
}
const KC = { ok: 'jade', warn: 'lantern', bad: 'ember', dim: 'ink' };
function seatKPIs(x) {
  const c = S.sc[x], pct = (a, b) => b ? Math.round(a / b * 100) : null, P = v => v == null ? '·' : v + '%';
  const rate = (v, good, ok, low) => v == null ? 'dim' : (low ? v <= good : v >= good) ? 'ok' : (low ? v <= ok : v >= ok) ? 'warn' : 'bad';
  const dec = pct(c.onTime, c.onTime + c.missed), time = c.min >= 60 ? Math.round(c.min / 60) + ' h' : c.min + ' min';
  const out = [['Time in this seat', `${time} of park time${c.days ? ', ' + c.days + ' day' + (c.days > 1 ? 's' : '') : ''}`, 'dim']];
  if (x === 'tech') { const f = pct(c.ftf, c.dx), lk = pct(c.lock, c.lock + c.skip), wo = pct(c.woOk, c.woOk + c.woLate); out.push(['Jobs finished', c.jobs, 'dim'], ['Cause found first time', P(f), rate(f, 70, 45)], ['Locked out before work', P(lk), rate(lk, 100, 80)], ['Work orders answered in time', P(wo), rate(wo, 85, 60)]); if (c.hurt) out.push(['Injuries', c.hurt, 'bad']); }
  if (x === 'sup') { const r = c.respN ? Math.round(c.resp / c.respN) : null; out.push(['Average response to a fault', r == null ? '·' : r + ' min', rate(r, 10, 20, true)], ['Quick fixes', c.quick, 'dim'], ['Guests rescued', c.rescued, 'dim'], ['Guests left stuck', c.stuck, c.stuck ? 'bad' : 'ok']); }
  if (x === 'mgr' || x === 'dir' || x === 'ceo') { const u = c.days ? Math.round(c.upSum / c.days * 100) : null; out.push(['Uptime on your days', P(u), rate(u, 85, 75)]); }
  if (x === 'mgr' || x === 'dir') { const b = pct(c.budOk, c.days); out.push(['Days on budget', P(b), rate(b, 70, 40)]); }
  if (x === 'mgr' && c.days) { const m = Math.round(c.moraleSum / c.days); out.push(['Crew morale at closing', m, rate(m, 55, 35)]); }
  if (x === 'ceo' && c.days) out.push(['Profit on your days', fmtMoney(c.netSum), c.netSum >= 0 ? 'ok' : 'bad'], ['Board confidence change', ((c.confD || 0) > 0 ? '+' : '') + (c.confD || 0), (c.confD || 0) >= 0 ? 'ok' : 'bad']);
  out.push(['Requests answered in time', P(dec), rate(dec, 85, 60)]);
  out.push(['Decisions: operational / tactical / strategic', `${c.op} / ${c.tac} / ${c.str}`, 'dim']);
  if (x === 'tech') out.push(['Procedures checked', c.proc || 0, 'dim']);
  if (x === 'sup' || x === 'mgr' || x === 'dir') { const a = pct(c.al, c.al + c.mis); out.push(['Calls in line with the priority', P(a), rate(a, 80, 55)]); }
  if (x === 'dir') out.push(['Days off the company strategy', c.off, c.off ? 'warn' : 'ok']);
  if (x === 'ceo') out.push(['Times you asked for the figures', c.brief, 'dim']);
  if (x !== 'tech' && x !== 'sup') out.push(['Times you went over the supervisor\'s head', c.over, c.over ? (c.over > 5 ? 'bad' : 'warn') : 'ok']);
  return out;
}
const kpiRows = x => seatKPIs(x).map(([n, v, c]) => `<div class="krow"><span>${n}</span><b style="color:var(--${KC[c]})">${v}</b></div>`).join('');
function seatReport(rep) {
  const x = rep.seat || S.seat, ai = rep.ai || [];
  return `<div class="two"><div class="scard"><h3>Your seat: ${ROLE[x].title}</h3>${kpiRows(x)}<p class="note">${/^[aeiou]/i.test(ROLE[x].lvl) ? 'An' : 'A'} ${ROLE[x].lvl.toLowerCase()} is judged on ${ROLE[x].judged.join(', ').toLowerCase()}. These figures cover every minute you have spent in this seat.</p></div>
<div class="scard"><h3>Overnight, your colleagues decided</h3>${ai.length ? `<ul class="ai">${ai.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="note">Nothing changed overnight.</p>'}<p class="note">${S.seat === 'ceo' ? 'These are your managers doing their jobs. You can overrule them at the desk, but that is skipping levels.' : 'These are the jobs of the seats you are not playing. Take one of those seats to make these calls yourself.'}</p></div></div>`;
}
/* the seat picker and the real-life role card */
function seatCards(sel, act) {
  return `<div class="seats" role="radiogroup" aria-label="Seats">${L.LV.slice().reverse().map(x => `<button type="button" class="seat${x === sel ? ' on' : ''}" role="radio" aria-checked="${x === sel}" data-a="${act}" data-v="${x}" data-fk="st-${x}">${x === S.seat && !ui.title ? '<em>You</em>' : ''}<small>${ROLE[x].lvl}</small><b>${ROLE[x].title}</b><span>${ROLE[x].line}</span>${x !== S.seat && S.styles && S.styles[x] ? `<span class="sty"><b>This season: ${esc(L.STYLE[S.styles[x]][0])}.</b> ${esc(L.STYLE[S.styles[x]][1])}</span>` : ''}</button>`).join('')}</div>`;
}
function whoPick(sel) { // which technician to be
  const techs = S.crew.filter(c => c.role === 'tech' && !c.temp);
  return `<div class="sect"><h2 class="cap">Which technician?</h2><div class="who" role="radiogroup">${techs.map(c => `<button type="button" role="radio" data-a="pickme" data-t="${c.id}" data-fk="pm-${c.id}" aria-pressed="${c.id === sel}">${esc(c.name)}, ${title(c).toLowerCase()} · ${c.shift === 'late' ? 'late shift' : c.shift === 'full' ? 'full day' : 'early shift'}</button>`).join('')}</div></div>`;
}
function chainHTML(view) {
  const you = ui.title ? ui.pick || S.seat : S.seat, isYou = x => x === you;
  const node = (x, name, who, vac, lim) => `<div class="cn${vac ? ' vac' : ''}${isYou(x) ? ' me' : ''}${x === view && !isYou(x) ? ' view' : ''}"><b>${name}</b><span class="lim">${lim}</span><small>${who}</small></div>`;
  const sups = S.crew.filter(c => c.role === 'sup'), eng = S.crew.find(c => c.role === 'eng'), dirs = (S.org.opsdir || 0) + (S.org.engdir || 0), techs = S.crew.filter(c => c.role === 'tech' && !c.temp);
  const by = x => isYou(x) ? 'You, playing this seat' : 'Played by the computer';
  return `<div class="chain">${[
    node('board', 'The board', 'Rosalind Teo, chair. Judges the chief executive.', false, ''),
    node('ceo', 'Chief Executive', by('ceo'), false, 'any spend'),
    node('dir', 'Operations Director', dirs ? by('dir') : isYou('dir') ? 'You. The post is empty, so you are acting in it.' : 'Empty post: its decisions go up to the chief executive.', !dirs && !isYou('dir'), 'up to $5,000'),
    node('mgr', 'Engineering Manager', eng ? (isYou('mgr') ? 'You' : eng.name) : isYou('mgr') ? 'You. The post is empty, so you are acting in it.' : 'Empty post: its decisions go up to the director.', !eng && !isYou('mgr'), 'up to $1,500'),
    node('sup', 'Maintenance Supervisor', isYou('sup') ? 'You' : sups.length ? sups.map(c => `${c.name} (${c.shift === 'late' ? 'late' : c.shift === 'full' ? 'all day' : 'early'})`).join(', ') + '. When nobody is on shift, the crew pick up jobs themselves and ask the manager.' : 'Empty post: the crew pick up jobs themselves.', !sups.length && !isYou('sup'), 'up to $300'),
    node('tech', 'Technicians', techs.map(c => isYou('tech') && c.id === (ui.title ? ui.pickMe || S.me : S.me) ? c.name + ' (you)' : c.name).join(', '), false, '$0: they ask'),
  ].join('<i aria-hidden="true"></i>')}</div>`;
}
function roleHTML(x) {
  const R0 = ROLE[x], li = a => `<ul>${a.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  return `<div class="scrim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="r-t">
<div class="rhead"><div><small class="dim" style="letter-spacing:.1em;text-transform:uppercase;font-weight:700;font-size:11px">${R0.lvl}</small><h2 id="r-t" style="font:400 30px/1.05 var(--display);color:var(--lantern)">${R0.title}</h2></div><button type="button" class="x" data-a="closerole" aria-label="Close" data-fk="rx">✕</button></div>
<p class="lede" style="max-width:none">${esc(R0.line)}</p>
<div class="two"><div class="sect"><h2 class="cap">In real life</h2><p class="life">${esc(R0.life)}</p><h2 class="cap">In this game</h2><p class="life">${esc(R0.game)}</p></div><div class="sect"><h2 class="cap">Chain of command</h2>${chainHTML(x)}</div></div>
<div class="sect"><h2 class="cap">The decisions at this level <span class="kind k-${DEC[x][0]}">${x === 'dir' ? 'Tactical, shading into strategic' : KIND[DEC[x][0]][0]}</span></h2><div class="rl"><div><h4>Time horizon</h4>${DEC[x][1]}</div><div><h4>What is at risk</h4>${DEC[x][2]}</div><div><h4>How to decide well</h4>${DEC[x][3]}</div><div><h4>In this game</h4>${DEC[x][4]}</div></div></div>
<div class="rl"><div><h4>Reports to</h4>${esc(R0.reports)}</div><div><h4>Manages</h4>${esc(R0.manages)}</div><div><h4>Decides alone</h4>${li(R0.alone)}</div><div><h4>Recommends to the boss</h4>${li(R0.recommends)}</div><div><h4>Can approve</h4>${esc(R0.approves)}</div><div><h4>Part in hiring</h4>${esc(R0.hiring)}</div><div><h4>Judged on</h4>${li(R0.judged)}</div><div><h4>Common mistakes</h4>${esc(R0.mistakes)}</div></div>
${S.sc[x].min ? `<div class="scard"><h3>Your record in this seat</h3>${kpiRows(x)}</div>` : ''}
<div class="row">${x !== S.seat || x === 'tech' ? `<button type="button" class="btn go" data-a="takeseat" data-v="${x}" data-fk="rtake">${x === S.seat ? 'Stay in this seat' : 'Take this seat'}</button>` : ''}<button type="button" class="btn${x === S.seat && x !== 'tech' ? ' go' : ''}" data-a="closerole" data-fk="rback">Back</button></div></div></div>`;
}
function seatsHTML() {
  const v = ui.pick || S.seat;
  return `<div class="scrim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="s-t">
<div class="rhead"><div><h2 id="s-t" style="font:400 28px/1.05 var(--display)">Change seat</h2><p class="dim">Take any chair in the chain of command. The computer plays everyone else, and the park keeps its history.</p></div><button type="button" class="x" data-a="closeseats" aria-label="Close" data-fk="sx">✕</button></div>
${seatCards(v, 'pickseat')}${v === 'tech' ? whoPick(ui.pickMe || S.me) : ''}
<div class="row"><button type="button" class="btn go" data-a="takeseat" data-v="${v}" data-fk="stake">${v === S.seat && v !== 'tech' ? 'Stay as ' + ROLE[v].title : 'Take the ' + ROLE[v].title.toLowerCase() + '\'s seat'}</button><button type="button" class="btn" data-a="role" data-v="${v}" data-fk="srole">What does a ${ROLE[v].title.toLowerCase()} do?</button><button type="button" class="btn" data-a="closeseats" data-fk="sback">Back</button></div></div></div>`;
}
function companyTab() {
  const plan = S.phase === 'plan', c = S.conf, m = L.mods(S), fee = L.orgFee(S), people = S.crew.filter(x => !x.temp);
  const crewIn = { eng: p => p.role === 'tech' || p.role === 'sup' || p.role === 'eng' || p.role === 'mach', sup: p => p.role === 'store' || p.role === 'mat', hr: p => p.role === 'hr' };
  const heads = d => L.ORG.filter(p => p[2] === d).reduce((t, p) => t + (S.org[p[0]] || 0), 0) + (crewIn[d] ? people.filter(crewIn[d]).length : 0);
  const chips = [];
  const ch = (txt, cls) => chips.push(`<span class="chip c-${cls || 'ok'}">${txt}</span>`);
  if (m.crowd !== 1) ch(`Guests +${pc(m.crowd - 1)}`); if (m.spend !== 1) ch(`Spend +${pc(m.spend - 1)}`); if (m.cap !== 1) ch(`Capacity +${pc(m.cap - 1)}`);
  ch(`Glow ${m.glow >= 0 ? '+' : '−'}${Math.abs(Math.round(m.glow))}`, m.glow >= 0 ? 'ok' : 'bad');
  if (m.wear !== 1) ch(`Wear −${pc(1 - m.wear)}`); if (m.hazard !== 1) ch(`Faults −${pc(1 - m.hazard)}`); if (m.work !== 1) ch(`Repairs +${pc(m.work - 1)}`); if (m.parts !== 1) ch(`Parts −${pc(1 - m.parts)}`);
  if (m.overhead !== 1) ch(`Overheads −${pc(1 - m.overhead)}`); ch(`Leakage ${(4 * m.leak).toFixed(1)}% of takings`, m.leak < .5 ? 'ok' : 'warn');
  if (m.flat) ch(`${fmtMoney(m.flat)} a day from sales`); if (m.rnd) ch(`${Math.round(m.rnd)} research points a day, ${S.enh} enhancements`);
  const risks = [['System outage', .14 * m.pIT], ['Cyber attack', .04 * m.pCyber], ['Environmental fine', .12 * m.pEnv], ['Guest injury', .03 * m.pSafety], ['Legal dispute', .06 * m.pLegal]].map(([n, p]) => `${n} ${Math.round(Math.min(.9, p) * 100)}%`).join(' · ');
  const d = L.DEPTS[ui.dept] ? ui.dept : 'ops', exec = Object.keys(L.EXEC).find(x => L.EXEC[x].includes(d));
  const deptBtns = Object.keys(L.DEPTS).map(k => `<button type="button" class="dbtn${k === d ? ' on' : ''}" data-a="dept" data-v="${k}" data-fk="dp-${k}"><b>${L.DEPTS[k]}</b><span>${heads(k)} ${heads(k) === 1 ? 'person' : 'people'}${k === 'gov' ? '' : ' · ' + Math.round(m.eff[k] * 100) + '%'}</span></button>`).join('');
  const own = may('org') || (S.seat === 'dir' && ['ops', 'eng', 'sup'].includes(d)), askable = !own && L.RANK[S.seat] >= 2;
  const rows = L.ORG.filter(p => p[2] === d).map(p => { const n = S.org[p[0]] || 0; return `<tr${n ? '' : ' style="opacity:.82"'}><td><b>${p[1]}</b><small>${LVL[p[3]]}</small></td><td>${fxText(p)}</td><td class="r">${fmtMoney(p[4])}</td><td style="white-space:nowrap"><span class="step"><button type="button" data-a="orgf" data-k="${p[0]}" data-fk="of-${p[0]}" aria-label="Let one ${p[1]} go"${plan && own && n ? '' : ' disabled'}>−</button><b class="num" style="min-width:34px;text-align:center;color:var(--${n ? 'lantern' : 'dim'})">${n} / ${p[5]}</b>${own ? `<button type="button" data-a="orgh" data-k="${p[0]}" data-fk="oh-${p[0]}" aria-label="Hire a ${p[1]}"${plan && n < p[5] && S.cash >= fee ? '' : ' disabled'}>+</button>` : `<button type="button" data-a="ask" data-k="org" data-oid="${p[0]}" data-fk="oh-${p[0]}" aria-label="Ask the chief executive for a ${p[1]}" title="Ask the chief executive"${askable && plan && n < p[5] ? '' : ' disabled'}>+</button>`}</span></td></tr>`; }).join('');
  const named = crewIn[d] ? people.filter(crewIn[d]) : [];
  return `<div class="org">
<div class="onode client"><div class="row" style="flex-wrap:nowrap"><span class="av" style="--c:var(--lantern)" aria-hidden="true">R</span><div style="flex:1"><b>Rosalind Teo and the board</b><small>Chairman of Lanternfield Park Ltd. The board speaks for the shareholders and is your boss.</small></div><b class="num" style="font:400 26px var(--display)">${Math.round(c)}</b></div>
<div class="meter c-${c >= 75 ? 'ok' : c >= 30 ? 'warn' : 'bad'}"><span>Confidence in you</span><div class="bar"><span style="width:${Math.round(c)}%"></span></div></div>
<small>${c >= 75 ? 'A confident board is opening doors: takings are up 10%.' : c < 30 ? 'A nervous board is costing you: takings are down 10%.' : 'At 75 takings rise 10%. Below 30 they fall 10%.'} At zero the board removes you. So does an overdraft past $20,000.</small>
<div class="warnbox c-warn"><b>${plan ? L.dow(upcoming()) + "'s demand" : "Today's demand"}:</b> ${esc(L.MEMOS[(S.forecast || {}).memo] || 'None')} Deliver it for $300 and more confidence. Miss it and confidence falls twice as far.</div>
${plan && may('board') ? `<div class="row"><button type="button" class="btn sm" data-a="advance" data-fk="adv"${!S.adv && c >= 50 ? '' : ' disabled'}>${S.adv ? 'Shareholder loan taken: $8,000 comes off your result at the review' : 'Ask for an $8,000 shareholder loan (once, costs 12 confidence)'}</button><button type="button" class="btn sm" data-a="consult" data-fk="cons"${S.consult !== S.reports.length + 1 && S.cash >= 1500 ? '' : ' disabled'}>Bring in management consultants, $1,500: confidence +6</button></div>` : ''}</div>
<div class="stem"></div>
<div class="onode you"><b>${S.seat === 'ceo' ? 'You, Chief Executive' : 'Chief Executive, played by the computer'}</b><small>${S.seat !== 'ceo' ? `You are sitting in as ${ROLE[S.seat].title}. ` : ''}${L.headcount(S)} people on the payroll · ${fmtMoney(L.orgWages(S) + people.reduce((t, p) => t + L.wage(p), 0))} in pay a day · ${fmtMoney(L.OVERHEAD * m.overhead)} overheads a day · office morale ${Math.round(S.cm)}</small></div>
<div class="stem"></div></div>
${dirHTML()}
${own ? '' : `<div class="warnbox c-dim">${askable ? `Hiring in ${L.DEPTS[d].toLowerCase()} is the chief executive's call. Press + to ask; you get an answer at once.` : `Hiring here is decided above your seat.`}</div>`}
<div class="row">${chips.join('')}</div>
<p class="note">Chance each day of something going wrong: ${risks}. Patched rides and overtime push the injury risk up.</p>
<div class="orgb"><nav class="dlist" aria-label="Departments">${deptBtns}</nav>
<div class="sect"><h2 class="cap">${L.DEPTS[d]}${d === 'gov' ? '' : ` <span class="chip c-${m.eff[d] >= .95 ? 'ok' : m.eff[d] >= .75 ? 'warn' : 'bad'}">${Math.round(m.eff[d] * 100)}% effective</span>`}${exec ? `<span class="chip c-dim">Answers to the ${L.ORGX[exec][1]}${S.org[exec] ? '' : ' (vacant)'}</span>` : ''}<span class="chip c-dim">${fmtMoney(fee)} to hire</span></h2>
${d === 'gov' ? '' : '<p class="note">People deliver their effect multiplied by the department\'s effectiveness: 60% leaderless, more with a manager and a director, more again with the right executive. Office morale moves every department up or down.</p>'}
${named.length ? `<div class="row">${named.map(p => `<span class="chip t-${rk(p)}">${esc(p.name)}, ${title(p)}</span>`).join('')}<span class="note">Named people are hired and rostered on the Team tab.</span></div>` : ''}
<div class="tw"><table class="t"><thead><tr><th>Position</th><th>What they do</th><th class="r">Pay a day</th><th>Employed</th></tr></thead><tbody>${rows}</tbody></table></div>
${plan ? '' : '<p class="note">Hiring and letting go happen at the planning desk after closing.</p>'}</div></div>`;
}
const HOW = `<ol class="how">
<li>This is real time. The clock never waits: a day lasts about five minutes, and pausing freezes your orders too.</li>
<li>Pick a seat in the chain of command: technician, supervisor, manager, director or chief executive. Each has its own controls, its own inbox and its own spending limit. Anything over your limit, you ask for. The computer plays everyone else.</li>
<li>Decisions come in three kinds, and each request is labelled. Operational ones are quick and routine: follow procedure, stay alert. Tactical ones are checked against the day's priority. Strategic ones last all season and their results arrive days later.</li>
<li>Requests land top left with a timer. Answer in time or the cautious default happens. An empty post pushes its work up to the next seat, so fill posts at the desk.</li>
<li>Faults run on timers too. A half-speed ride gets worse if nobody reaches it (small glitches within 25 minutes), guests stuck on a broken ride must be reached within 30 minutes, and squalls break several rides at once.</li>
<li>Speed pays. Send someone qualified within 8 minutes of a fault (the blue ring) and it is a fast response: the job shrinks by a fifth.</li>
<li>People tire. Work drains energy, and below 60 a technician slows down; worn out, they get hurt. Rotate who you send, and give tired people a break (B) in quiet spells. Pulling someone off a break or out of a toolbox talk costs a couple of minutes.</li>
<li>Senior seats have their own levers. Manager and up: a rush job (R) puts everyone who can help on one ride. Director and up: agency crew for three hours, a prevention service on a worn ride, a fast lane on a healthy one. Chief executive: goodwill vouchers for a closed ride, a happy hour, a briefing to the chair. Walking the floor takes you away from your desk, and requests wait while you are gone.</li>
<li>Toolbox talks have topics: Safety brings alertness back, Wellbeing restores energy and morale, Pace makes people faster for two hours. Each has its own cooldown, and anyone you pull out misses it.</li>
<li>Glitches come in three kinds: a quick reset gets worse after 15 minutes, a standard glitch after 25, and an intermittent one clears itself if left, then fails properly within the hour unless serviced.</li>
<li>Your grade is 80% the company's result and 20% your own work in the seat you played most. Difficulty (chosen at the start) changes the reaction windows and how much goes wrong; ½× speed is there whenever you need it.</li>
<li>Between days the planning desk shows what your colleagues decided overnight. At 21:00 Lantern Hour starts, and after 14 days the board reviews the company, while each seat you played gets its own scorecard.</li>
</ol>`;
function finalHTML() {
  const f = S.final, verdict = f.broke ? 'The company is insolvent.' : f.fired ? 'The board has removed you.' : { A: 'The board extends your contract, with a bonus.', B: 'The board extends your contract.', C: 'You keep the job, on probation.', D: 'The board is looking for a new chief executive.' }[f.grade];
  let kk = 0; const kpi = (n, v, max, txt) => `<div class="kpi" style="--k:${kk++}"><span>${n}<br><span class="dim">${txt}</span></span><div class="bar c-${v / max >= .8 ? 'ok' : v / max >= .5 ? 'warn' : 'bad'}"><span style="width:${Math.round(v / Math.max(1e-9, max) * 100)}%"></span></div><b class="num" style="text-align:right">${Math.round(v)} / ${max}</b></div>`;
  return `<div class="scrim soft final"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="f-t">
<div class="row" style="gap:24px;align-items:flex-end"><div class="grade" aria-hidden="true">${f.grade}</div><div style="flex:1;min-width:220px"><h2 class="title" id="f-t" style="font-size:clamp(28px,5vw,44px)">${verdict}</h2><p class="lede">${f.broke ? 'The overdraft passed $20,000 and the bank called it in.' : f.fired ? 'Their confidence in you ran out before the season did.' : `<span class="cnt" aria-hidden="true" style="--to:${f.total};--dur:1.3s;--delay:.55s;--ease:cubic-bezier(.2,.8,.3,1)"></span><span class="sr">${f.total}</span> points out of 100. You ended with ` + f.heads + ' people on the payroll.'}</p><p class="note">${L.DIFF[f.diff || 'standard'].name} difficulty.</p></div></div>
${f.own ? `<div class="own"><div class="row" style="justify-content:space-between"><b>How the score is made</b><span class="num">Company ${f.company} × 80% + your own work ${Math.round(f.own.p * 20)} / 20 = ${f.total}</span></div><p class="note">Your own work is judged in the seat you spent most of the season in: ${ROLE[f.own.seat].title.toLowerCase()}.</p><div class="sect" style="gap:8px">${f.own.parts.map(([n, w, v]) => kpi(n, v * w * 20, Math.round(w * 20), Math.round(v * 100) + '%')).join('')}</div></div>` : ''}
<div class="sect" style="gap:12px">${kpi('Uptime', f.pts.up, 20, Math.round(f.up * 100) + '% across the season')}${kpi('Profit after tax', f.pts.net, 30, fmtMoney(f.net) + ' after ' + fmtMoney(f.tax) + ' tax and a ' + fmtMoney(f.auditFee) + ' audit')}${kpi('Lanterns', f.pts.lit, 20, f.lit + ' of ' + L.N_RIDES * L.DAYS)}${kpi('Safety', f.pts.safe, 15, f.patches + ' patches, ' + f.tags + ' red tags')}${kpi('Board confidence', f.pts.conf, 15, f.conf + ' out of 100')}</div>
<div class="days" style="grid-template-columns:repeat(${S.reports.length},minmax(0,1fr))">${S.reports.map(r => `<div><b>${r.n}</b><span style="height:${r.n / L.N_RIDES * 100}%"></span>${L.dow(r.day).slice(0, 2)}</div>`).join('')}</div>
<p class="note">The company score (out of 100) is above. Grades: A from 85, B from 70, C from 55. Full company marks need 95% uptime, ${fmtMoney(100000)} profit after tax, 160 lanterns, no patches and a confident board.</p>
<div class="sect"><h2 class="cap">The seats you played</h2><div class="cards">${L.LV.filter(x => S.sc[x].min > 0).map(x => `<div class="scard"><h3>${ROLE[x].title}</h3>${kpiRows(x)}</div>`).join('')}</div></div>
${ptHTML()}<div class="row"><button type="button" class="btn go big" data-a="restart" data-fk="again">Run another season</button></div></div></div>`;
}
/* the big decisions of the season wait at the desk for whoever's limit they fall in */
function bigHTML() {
  const mine = b => b.x === S.seat || (b.x === 'board' && S.seat === 'ceo');
  const rows = S.big.map(b => `<div class="bigd${mine(b) ? ' mine' : ''}" data-key="big-${b.id}"><div><b>${esc(b.t)}</b> <span class="num">${fmtMoney(b.cost)}</span><small>${esc(b.why)}</small>
<small class="dim">${mine(b) ? (b.x === 'board' ? 'Over your $20,000 limit: propose it, and the board answers at the end of tomorrow. Undecided when the gates open, the board drops it.' : 'Yours to decide before you open the gates, or the board decides it, and trusts you less.') : `For ${esc(lc(L.holder(S, b.x === 'board' ? 'ceo' : b.x)))} to decide tonight.`}</small></div>
${mine(b) && S.phase === 'plan' ? `<div class="row">${L.bigOpts(b).map(o => `<button type="button" class="btn${o.go ? ' go' : ''}" data-a="big" data-id="${b.id}" data-v="${o.v}" data-fk="big-${b.id}-${o.v}">${esc(o.b)}<small>${esc(o.sub)}</small></button>`).join('')}</div>` : ''}</div>`).join('');
  const board = S.boardQ.map(b => `<div class="bigd" data-key="bq-${b.id}"><div><b>With the board: ${esc(b.t || 'your request')}</b> <span class="num">${fmtMoney(b.cost)}</span><small>It answers at the end of ${b.day <= S.day && S.phase === 'day' ? 'today' : b.day <= S.day ? 'the day' : 'tomorrow'}.</small></div></div>`).join('');
  return rows || board ? `<div class="sect bigs"><h2 class="cap">Big decisions</h2>${rows}${board}</div>` : '';
}
function deskHTML() {
  const plan = S.phase === 'plan', tabs = (plan && S.reports.length ? [['report', 'Last night']] : []).concat([['company', 'Company'], ['team', 'Team'], ['stores', 'Stores']], plan ? [['projects', 'Projects']] : []);
  const tab = tabs.some(t => t[0] === ui.tab) ? ui.tab : tabs[0][0], fc = S.forecast, chips = [];
  if (plan && fc) {
    chips.push(`<span class="tag ${fc.weekend ? 'c-work' : 'c-dim'}">${fc.weekend ? 'Weekend: 20% more guests' : 'Weekday crowd'}</span>`, `<span class="tag ${fc.heat ? 'c-bad' : 'c-ok'}">${fc.heat ? 'Heatwave' : 'Mild weather'}</span>`);
    for (const e of fc.events) chips.push(e.k === 'vip' ? `<span class="tag c-warn">VIP party on ${esc(L.ride(S, e.ride).short)} at ${fmtClock(e.at)}</span>` : `<span class="tag c-bad">Inspector at ${fmtClock(e.at)}</span>`);
  }
  const body = tab === 'report' ? reportTab() : tab === 'stores' ? storesTab() : tab === 'projects' ? projectsTab() : tab === 'team' ? teamTab() : companyTab();
  return `<div class="scrim"><div class="dialog wide" role="dialog" aria-modal="true" aria-labelledby="d-t">
<div class="row"><div style="flex:1;min-width:220px"><h2 id="d-t" style="font:400 26px/1.05 var(--display)">${plan ? 'Planning desk: ' + L.dow(upcoming()) : 'Desk'}</h2><p class="dim">${plan ? (may('roster') ? 'Set the roster, stock the shelves, then open the gates.' : 'See what your colleagues decided overnight, then open the gates.') : 'The clock is still running out there.'}</p>${plan && S.day === 1 && !S.reports.length && !coached(S.seat) ? '<p style="color:var(--lantern);font-weight:700">First season? Leave all this for now and open the gates. Your first day is coached, and tonight the coach shows you this desk.</p>' : ''}</div><button type="button" class="btn sm" data-a="seats" data-fk="d-seat">Seat: ${esc(ROLE[S.seat].title)}</button><span class="chip c-warn num" style="font-size:14px;padding:4px 10px">${fmtMoney(S.cash)} in the bank</span>${plan ? '' : '<button type="button" class="x" data-a="closedesk" aria-label="Close desk">✕</button>'}</div>
${chips.length ? `<div class="row">${chips.join('')}</div>` : ''}
${deskCoachHTML()}${bigHTML()}<nav class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-a="tab" data-v="${k}" data-fk="tab-${k}" aria-selected="${k === tab}">${l}</button>`).join('')}</nav>
<div class="tabbody" data-key="tab-${tab}">${body}</div>
<div class="row" style="position:sticky;bottom:-20px;background:var(--panel);padding:10px 0 2px;border-top:1px solid var(--line)">${plan ? `<button type="button" class="btn go big" data-a="go" data-fk="go">Open the gates for ${L.dow(upcoming())}</button>` : '<button type="button" class="btn go" data-a="closedesk" data-fk="cd">Back to the park</button>'}${now() < ui.msgUntil ? `<span style="color:${ui.msgc || 'var(--ember)'};font-weight:700">${esc(ui.msg)}</span>` : ''}</div></div></div>`;
}
const now = () => performance.now();
/* sound settings, in How to play: on or off (off until the player chooses), and a volume for each part */
function soundSettingsHTML() {
  const vol = (k, l, note) => `<label class="vol"><span><b>${l}</b>${note ? `<small>${note}</small>` : ''}</span><input type="range" min="0" max="100" step="5" value="${Math.round(snd[k] * 100)}" data-vol="${k}" data-key="vol-${k}" aria-label="${l} volume"${snd.on ? '' : ' disabled'}><output>${Math.round(snd[k] * 100)}</output></label>`;
  return `<div class="setrow"><div><b id="snd-l">Sound</b><small>Effects, the sound of the park and optional music, all made in the game. Your choice is remembered on this device.</small></div><span class="seg3" role="group" aria-labelledby="snd-l"><button type="button" data-a="sound" data-v="off" data-fk="snd-off" aria-pressed="${!snd.on}">Off</button><button type="button" data-a="sound" data-v="on" data-fk="snd-on" aria-pressed="${snd.on}">On</button></span></div>
<div class="vols">${vol('master', 'Master')}${vol('sfx', 'Effects', 'Alarms, dispatches, fixes')}${vol('amb', 'Park', 'Crowd, sea, weather')}${vol('music', 'Music', 'Off at 0')}</div>`;
}
function modalHTML() {
  const h = dialogHTML(), k = ui.help ? 'help' : ui.title ? (ui.role ? 'role' : 'title') : ui.role ? 'role' : ui.seats ? 'seats' : S.phase === 'day' && S.paused ? 'pause' : S.final ? 'final' : 'desk';
  return h.replace('<div class="scrim', `<div data-key="dlg-${k}" class="scrim`);
}
function dialogHTML() {
  if (ui.help) return `<div class="scrim" data-a="closehelp" data-self="1"><div class="dialog slim" role="dialog" aria-modal="true" aria-labelledby="h-t"><div class="rhead"><h3 id="h-t">How to play</h3><button type="button" class="x" data-a="closehelp" aria-label="Close">✕</button></div>${HOW}
<p class="note">On the map: the inner ring round a ride is its health. A red countdown ring means guests are stuck, an amber one means the fault is about to get worse, and a blue one with ⚡ is the fast-response window. The small bar under a person is their energy. A letter badge is an open fault and its trade, a purple ? means the part is not in stores, P is a patch. Round tokens are tradespeople.</p><p class="note"><b>Mouse:</b> drag a box to select, Shift-click to add, right-click to send or move, right-drag or arrow keys to move the map, scroll to zoom. <b>Touch:</b> tap people on the right to select, tap a ride to send, tap the ground to move, drag the map, pinch to zoom. <b>Keys:</b> Space next alarm, 1 to 9 pick people, A all free crew, E send nearest, B break, R rush job, Q sprint, W push, S stop, C crowd-pleaser, P pause, F whole park.</p>${ptHTML(true)}<div class="setrow"><div><b id="mo-l">Motion</b><small>Reduced turns off shaking, flashing, pulsing and drifting effects. Auto follows your device setting.</small></div><span class="seg3" role="group" aria-labelledby="mo-l">${Object.entries(MOTIONS).map(([v, l]) => `<button type="button" data-a="motion" data-v="${v}" data-fk="mo-${v}" aria-pressed="${motion === v}">${l}</button>`).join('')}</span></div>${soundSettingsHTML()}
<div class="row"><button type="button" class="btn go" data-a="closehelp" data-fk="ch">Back</button><button type="button" class="btn" data-a="restart">Start a new season</button></div></div></div>`;
  if (ui.title && ui.role) return roleHTML(ui.role);
  if (ui.title) { const fresh = !(S.reports.length || S.phase === 'day'), v = ui.pick || S.seat, me0 = L.staff(S, ui.pickMe || S.me);
    return `<div class="scrim soft"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="t-t">
<h1 class="title" id="t-t">Keep Lanternfield lit</h1>${PLAYTEST ? `<p class="ptnote"><b>Playtest build ${esc(BUILD)}.</b> Thanks for trying it! Play as much as you like, then open How to play (the button below, or <b>?</b> at the top while you play), press <b>Copy the record</b> and send it to whoever shared the game with you.</p>` : ''}
<p class="lede" style="max-width:62ch">A seaside funfair in real time: twelve rides, a maintenance company and its whole chain of command, from the technician with the spanner to the chief executive. Pick a seat and find out what that job really involves.</p>
${fresh ? `<div class="sect" style="gap:6px"><h2 class="cap">Difficulty</h2><div class="diffs" role="radiogroup" aria-label="Difficulty">${Object.keys(L.DIFF).map(k => `<button type="button" role="radio" aria-checked="${(S.diff || 'standard') === k}" data-a="setdiff" data-v="${k}" data-fk="df-${k}">${L.DIFF[k].name}</button>`).join('')}</div><p class="note">${L.DIFF[S.diff || 'standard'].txt}</p></div><div class="sect"><h2 class="cap">Choose your seat</h2>${seatCards(v, 'pickseat')}${v === 'tech' ? whoPick(ui.pickMe || S.me) : ''}<p class="note">You can change seat at any time with the Seat button at the top. The computer plays everyone else.${coached('sup') ? '' : ' <b style="color:var(--lantern)">New here? Start as the Maintenance Supervisor. Every seat is coached the first time you play it.</b>'}</p></div>` : `<p class="note">You are in the ${ROLE[S.seat].title.toLowerCase()}'s seat. Change it any time with the Seat button at the top.</p>`}
<div class="row tstart"><button type="button" class="btn go big" data-a="begin" data-fk="begin">${fresh ? `Start as ${v === 'tech' && me0 ? esc(me0.name) + ', ' + title(me0).toLowerCase() : ROLE[v].title}` : 'Carry on'}</button><button type="button" class="btn" data-a="role" data-v="${fresh ? v : S.seat}" data-fk="t-role">What does a ${ROLE[fresh ? v : S.seat].title.toLowerCase()} do?</button><button type="button" class="btn" data-a="help" data-fk="t-help">How to play</button>${fresh ? '' : '<button type="button" class="btn" data-a="restart">Start a new season</button>'}</div></div></div>`; }
  if (ui.role) return roleHTML(ui.role);
  if (ui.seats) return seatsHTML();
  if (S.phase === 'plan' && now() < ui.reportAt) return '';
  if (S.phase === 'day' && S.paused) return `<div class="scrim"><div class="dialog slim" role="dialog" aria-modal="true" aria-labelledby="p-t" style="width:min(420px,100%);text-align:center;align-items:center">
<h2 id="p-t" style="font:400 40px/1 var(--display);color:var(--lantern)">Paused</h2><p class="dim">${fmtClock(S.clock)} on ${L.dow(S.day)}. The park is frozen, and so are your orders.</p>
<div class="row" style="justify-content:center"><button type="button" class="btn go big" data-a="pause" data-fk="resume">Resume</button><button type="button" class="btn" data-a="help">How to play</button></div></div></div>`;
  if (S.final) return finalHTML();
  if (S.phase === 'plan' || ui.desk) return deskHTML();
  return '';
}

