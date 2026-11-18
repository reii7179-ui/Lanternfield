/* ---------- HUD panels: objectives, unit rail, park board, selection and command card, log ---------- */
const cmd = (a, attrs, b, small, cls, dis, pressed) => `<button type="button" class="cmd${cls ? ' ' + cls : ''}" data-a="${a}" ${attrs}${dis ? ' disabled' : ''}${pressed != null ? ` aria-pressed="${pressed}"` : ''}><b>${b}</b>${small ? `<small>${small}</small>` : ''}</button>`;
const enCol = c => { const e = L.enOf(c); return e >= 60 ? 'jade' : e >= 30 ? 'lantern' : 'ember'; };
const enChip = c => c.role === 'tech' && !c.temp && !c.agency ? `<span class="chip c-${{ jade: 'ok', lantern: 'warn', ember: 'bad' }[enCol(c)]}">Energy ${Math.round(L.enOf(c))}</span>` : '';
const isStuck = j => j && j.type === 'fault' && j.mode === 'full' && j.part && j.ps === 'none' && S.stock[j.part] < 1;
function inboxHTML() {
  if (S.phase !== 'day') return '';
  const items = S.inbox.slice().sort((a, b) => (b.k === 'wo') - (a.k === 'wo') || a.due - b.due), show = items.slice(0, 3);
  const cards = show.map(it => {
    const o = L.optsOf(S, it), kd = L.DTYPE[it.k] || 'op', left = Math.max(0, it.due - S.clock), f = clamp(left / Math.max(1, it.due - it.at), 0, 1), hot = left <= 5 || it.rescue;
    const hint = it.brief ? '' : kd === 'str' ? `<small class="rqn">${KIND.str[1]}</small>` : L.ALIGN[it.k] ? `<small class="rqn">Priority today: ${L.FOCUS[S.focus].toLowerCase()}.</small>` : '';
    const brief = it.brief ? `<p class="brief">${esc(it.brief)}</p>` : '';
    const note = it.lvl !== S.seat && it.lvl !== 'tech' ? `<small class="rqn">Normally the ${L.SEATNAME[it.lvl]}'s call. Nobody is in that post right now, so it comes to you.</small>` : '';
    return `<div data-key="rq-${it.id}" class="req${it.k === 'wo' ? ' wo' : ''}${hot ? ' hot' : ''}" role="group" aria-label="Request from ${esc(it.from)}"><div class="rqh"><span>${esc(it.from)}</span><span class="num">${left} min</span></div><small class="kind k-${kd}">${KIND[kd][0]} decision</small>${it.cs ? `<small class="kind k-cs"><span aria-hidden="true">✍</span> Countersign: on hold until signed</small>` : ''}<p>${esc(it.txt)}</p>${brief}${hint}${note}<div class="rqo">${o.map(x => `<button type="button" class="cmd${x.go && (it.k === 'wo' || it.k === 'stay') ? ' go' : ''}"${S.away > S.clock ? ' disabled' : ''} data-a="ans" data-id="${it.id}" data-v="${x.v}" data-fk="rq-${it.id}-${x.v}"><b>${esc(x.b)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</button>`).join('')}</div><i style="width:${Math.round(f * 100)}%"></i></div>`;
  }).join('');
  const sent = S.asks.map(a => { const n = Math.max(1, a.due - S.clock);
    if (a.esc) return `<div class="sent esc" data-key="esc-${a.id}"><b><span aria-hidden="true">⤴</span> Escalated to ${esc(lc(L.holder(S, a.x)))}</b>: ${esc(a.it.k === 'wo' ? 'your work order' : a.it.from + '\'s request')}${a.it.rid ? ' on ' + esc(L.ride(S, a.it.rid).short) : ''}. Waiting for their decision, about ${n} min.</div>`;
    let t = ''; try { t = ASKTXT[a.k](a.o); } catch (e) { t = 'a decision'; } return `<div class="sent" data-key="ask-${a.id}">Waiting for <b>${esc(lc(L.holder(S, a.x)))}</b>, about ${n} min: you asked for ${esc(t)}.</div>`; }).join('');
  const away = S.away > S.clock ? `<div class="sent"><b>You are out of the office until ${fmtClock(S.away)}.</b> Requests wait for you, and their clocks keep running.</div>` : '';
  return cards || sent ? `<div class="inbox${away ? ' away' : ''}" data-key="inbox" aria-live="polite">${away}${cards}${items.length > 3 ? `<div class="more">${items.length - 3} more waiting</div>` : ''}${sent}</div>` : '';
}
// a fault still inside its fast-response window: the card beats faster as the window closes (three steps, so it does not restart)
const fastBeat = id => { const r = id && L.ride(S, id), j = r && r.job, age = j ? S.clock - j.t0 : 99; if (!j || j.first || age > L.FAST) return ''; const f = (L.FAST - age) / L.FAST; return f > .5 ? '1.1s' : f > .25 ? '.75s' : '.5s'; };
const fastLeft = id => { const r = id && L.ride(S, id), j = r && r.job; const age = j ? S.clock - j.t0 : 99; return j && !j.first && age <= L.FAST ? `<span class="bolt">⚡</span> ${L.FAST - age} min` : 'nobody sent'; };
function objHTML() {
  const day = S.phase === 'day', evs = [];
  for (const e of S.events) if (!e.done) evs.push([e.at, e.k === 'vip' ? `VIP party rides ${L.ride(S, e.ride).short}` : 'Inspector walks the park']);
  if (S.phase === 'day' && !S.gates) { const n = S.rides.filter(r => r.sub && r.chk === S.day).length, all = S.rides.filter(r => r.sub).length; evs.push([L.OPEN, `Gates open · ${n} of ${all} rides checked`]); }
  if (S.phase === 'day' && (S.dplan || []).length) evs.push([Math.max(S.clock, L.OPEN + 20), `Planned services: ${S.dplan.map(id => L.ride(S, id).short).join(', ')}`]);
  for (const [at, txt] of [[L.SHIFT.late[0], 'Late shift clocks on'], [L.SHIFT.early[1], 'Early shift goes home'], [L.LH, 'Lantern Hour begins'], [L.CLOSE, 'Park closes']]) if (S.clock < at) evs.push([at, txt]);
  for (const o of S.inbound) if (o.at) evs.push([o.at, `Express: ${L.SKU[o.sku][0].toLowerCase()}`]);
  for (const w of S.waves || []) if (!w.hit && w.warned) evs.push([w.at, `Squall hits: about ${w.size} breakdowns`]);
  evs.sort((a, b) => a[0] - b[0]);
  const tags = [];
  if (day && S.clock > L.LH) tags.push('<span class="tag c-warn">Lantern Hour</span>');
  if (S.crowd > 1) tags.push('<span class="tag c-work">Weekend crowds</span>');
  if (S.heat) tags.push('<span class="tag c-bad">Heatwave</span>');
  const lit = day && S.clock > L.LH ? S.rides.filter(r => r.sub && r.lh >= L.LIT_MIN).length : 0;
  const al = L.alerts(S).slice(0, 4).map(a => { const left = a.due - S.clock, f = clamp(left / Math.max(1, a.due - a.t0), 0, 1);
    const beat = a.k === 'open' ? fastBeat(a.id) : '';
    return `<button type="button" class="alert a-${a.k}${beat ? ' fast' : ''}"${beat ? ` style="--beat:${beat}"` : ''} data-a="alert" data-id="${a.id || ''}" data-fk="al-${a.k}-${a.id}"><b>${esc(a.txt)}</b><span class="num">${a.k === 'open' ? fastLeft(a.id) : left + ' min'}</span><i style="width:${Math.round(f * 100)}%"></i></button>`; }).join('');
  return `<button type="button" class="ohead" data-a="objt" data-fk="objt" aria-expanded="${ui.obj}"><span>${S.inbox.length ? 'Inbox' : 'Objectives'}</span><em>${S.inbox.length ? `<span class="count">${S.inbox.length}</span>` : ''}Day ${Math.min(L.DAYS, upcoming())}/${L.DAYS}</em><i aria-hidden="true">${ui.obj ? '▾' : '▸'}</i></button>${inboxHTML()}${al ? `<div class="alerts" data-key="alerts">${al}</div>` : ''}
${ui.obj ? `<div class="obody" data-key="obody"><div class="oitem main"><i aria-hidden="true">★</i><span>${esc(L.MEMOS[(S.forecast || {}).memo] || 'Keep the rides open.')}</span></div>
${day && S.clock > L.LH ? `<div class="oitem main"><i aria-hidden="true">✦</i><span>Lanterns earned tonight: ${lit} of ${L.N_RIDES}</span></div>` : ''}
${evs.slice(0, 4).map(([at, txt]) => `<div class="oitem"><time>${fmtClock(at)}</time><span>${esc(txt)}</span></div>`).join('')}
${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}</div>` : ''}`;
}
function railHTML() {
  const day = S.phase === 'day'; let k = 0;
  return S.crew.map(c => {
    const tech = c.role === 'tech', key = tech && !c.temp ? ++k : 0;
    const s = !c.on ? 'line' : c.state === 'work' ? 'sky' : c.state === 'wait' ? 'mach' : c.state === 'walk' || c.state === 'run' || c.fetch ? 'lantern' : 'jade';
    return `<button type="button" class="unit t-${rk(c)}${ui.coachUnit === c.id ? ' coachme' : ''}${ui.units.includes(c.id) ? ' on' : ''}${c.on ? '' : ' off'}${tech && c.on && !c.target && day && S.rides.some(r => r.job && r.job.type === 'fault' && c.skills[r.job.trade] && !S.crew.some(x => x.target === r.id)) ? ' call' : ''}" data-a="tech" data-id="${c.id}" data-fk="u-${c.id}" aria-pressed="${ui.units.includes(c.id)}" title="${esc(c.name)}, ${title(c)}: ${esc(staffLine(c))}${tech && !c.temp && !c.agency ? ', energy ' + Math.round(L.enOf(c)) : ''}"><span class="ul" aria-hidden="true">${esc(c.name[0])}</span>${key ? `<kbd>${key}</kbd>` : ''}<span class="un">${esc(c.name)}</span>${tech && !c.temp && !c.agency ? `<span class="ue" aria-hidden="true"><i style="height:${Math.round(L.enOf(c))}%;background:var(--${enCol(c)})"></i></span>` : ''}<i class="us" style="background:var(--${s})"></i></button>`;
  }).join('');
}
/* a fixed ride waiting for you: your countersign, your incident review, your "fit to run", or your padlock still on it */
function soMine(r) {
  const o = r && r.so; if (!o || o.esc || S.phase !== 'day') return false;
  const st = o.steps[o.i];
  if (st === 'fit' && S.seat === 'tech' && o.lead === S.me && !o.signedAt) return true;
  if ((st === 'sup' || st === 'mgr' || st === 'dir') && L.soSigner(S, st, o) === S.seat) return true;
  if (st === 'review' && L.soSigner(S, 'dir', o) === S.seat) return true;
  return S.seat === 'tech' && o.pads.includes(S.me);
}
function boardHTML() {
  return S.rides.map(r => {
    const st = L.status(S, r), j = r.job, on = S.crew.some(c => c.target === r.id), hc = r.health >= 60 ? 'ok' : r.health >= 35 ? 'warn' : 'bad';
    const badge = j ? (j.type === 'fault' ? `<i class="bd t-${j.trade}">${L.TRADES[j.trade][0]}</i>` : '<i class="bd c-work">S</i>') : r.warnAt ? '<i class="bd c-warn">!</i>' : r.patched ? '<i class="bd c-dim">P</i>' : '';
    return `<div class="asw" data-key="asw-${r.id}"><button type="button" class="as c-${STAT[st][1]}${ui.sel === r.id ? ' on' : ''}${j && j.type === 'fault' && !on ? ' alarm' : ''}${S.prio === r.id ? ' rush' : ''}${ui.coachRide === r.id ? ' coachme' : ''}" data-a="sel" data-id="${r.id}" data-fk="as-${r.id}" title="${esc(r.name)}: ${STAT[st][0]}"><b>${esc(r.short)}</b>${badge}<span class="st">${st === 'ok' ? Math.round(r.health) + '%' : st === 'signoff' ? `To reopen <em class="np">−${fmtMoney(L.hourly(S, r))}/h</em>` : STAT[st][0]}${on ? ' <em>crew</em>' : isStuck(j) ? ' <em class="np">no part</em>' : ''}</span><span class="bar c-${hc}"><span style="width:${Math.round(r.health)}%"></span></span></button>${soMine(r) ? `<button type="button" class="sgn" data-a="signopen" data-id="${r.id}" data-fk="sg-${r.id}">${S.seat === 'tech' ? (r.so.steps[r.so.i] === 'fit' ? 'Fit to run' : 'Padlock off') : r.so.steps[r.so.i] === 'review' ? 'Review' : 'Sign to reopen'}</button>` : ''}</div>`;
  }).join('');
}
function capHTML() {
  const f = S.rides.filter(r => r.job && r.job.type === 'fault'), un = f.filter(r => !S.crew.some(c => c.target === r.id)).length;
  return `Park board ${f.length ? `<span class="count">${f.length}</span><span class="capn">${un ? un + ' unassigned' : 'all assigned'}</span>` : '<span class="capn">all clear</span>'}`;
}
function logHTML() {
  const n = ui.log ? 30 : 3, rows = S.feed.slice(0, n).map(f => `<div data-key="lg-${f.id}" class="k-${f.k}"><time>${fmtClock(f.c)}</time><span>${esc(f.txt)}</span></div>`).join('');
  return `<button type="button" class="lbtn" data-a="logt" data-fk="logt" aria-expanded="${ui.log}">Log ${ui.log ? '▾' : '▴'}</button><div class="radio${ui.log ? ' open' : ''}">${rows || '<div><time></time><span>Nothing on the radio yet.</span></div>'}</div>`;
}
const shead = (av, name, sub, x) => `<div class="shead">${av}<div class="sh"><b>${name}</b><small>${sub}</small></div>${x ? '<button type="button" class="x" data-a="park" aria-label="Clear selection" data-fk="x">✕</button>' : ''}</div>`;
const SEATTIP = {
  sup: () => ui.touch ? 'Tap people on the right to select them, then tap a ride to send them or the ground to move them. Your crew\'s requests appear top left.' : 'Drag a box round people to select them. Right-click a ride to send them, or the ground to move them. Space jumps to the next alarm. Your crew\'s requests appear top left.',
  mgr: () => 'The supervisor runs the shift, and takes a few minutes to react. When a breakdown matters, select it and make it a rush job (R): everyone who can help goes now. Requests land top left: answer before the timer runs out.',
  dir: () => 'Set the priority and the budget here; managers work to them. On a bad day, bring in agency crew or make a breakdown a rush job (R). Disputes and big spends come to your inbox, top left.',
  ceo: () => 'The board, the press and anything nobody below you can decide come to your inbox, top left. When a big ride closes, goodwill vouchers stop it hurting the glow, and a rush job (R) gets it fixed first. Empty posts push more work up to you: fill them at the desk.',
};
function selPark() {
  const x = S.seat === 'tech' ? 'sup' : S.seat, R0 = ROLE[S.seat], day = S.phase === 'day', faults = S.rides.filter(r => r.job && r.job.type === 'fault').length, free = S.crew.filter(c => c.on && c.role === 'tech' && !c.target).length;
  const boss = S.seat === 'ceo' ? 'the board' : lc(L.holder(S, L.BOSS[S.seat]));
  const hd = shead(`<span class="av" style="--c:var(--lantern)" aria-hidden="true">${R0.short[0]}</span>`, `You: ${R0.title}`, `${R0.lvl} · answers to ${esc(boss)}`, false);
  let info = '', cm = '';
  const up = day && S.d.upT ? S.d.upW / S.d.upT : null, chip = (t, c) => `<span class="chip c-${c}">${t}</span>`;
  if (day) {
    const row = [];
    if (x === 'sup') { const sc = S.sc.sup, avg = sc.respN ? sc.resp / sc.respN : 0; row.push(chip(`${faults} open fault${faults === 1 ? '' : 's'}`, faults ? 'warn' : 'ok'), chip(`${free} free`, free ? 'ok' : 'dim'), chip(`Response ${sc.respN ? Math.round(avg) + ' min' : '·'}`, !sc.respN ? 'dim' : avg <= 10 ? 'ok' : avg <= 20 ? 'warn' : 'bad')); }
    if (x !== 'sup') row.push(chip(`Uptime ${up == null ? '·' : Math.round(up * 100) + '%'} / 85%`, up == null ? 'dim' : up >= .85 ? 'ok' : up >= .75 ? 'warn' : 'bad'), chip(L.FOCUS[S.focus], 'dim'));
    if (x === 'mgr') { const cm0 = S.crew.filter(c => !L.isMgr(c) && !c.temp), av = cm0.reduce((a, c) => a + c.morale, 0) / Math.max(1, cm0.length); row.push(chip(`Crew morale ${Math.round(av)}`, av >= 55 ? 'ok' : av >= 35 ? 'warn' : 'bad')); }
    if (S.seat === 'sup' || S.seat === 'mgr') { const al = 100 - Math.round(S.comp); row.push(chip(`Crew alertness ${al}`, al >= 55 ? 'ok' : al > 40 ? 'warn' : 'bad')); }
    if (S.seat === 'mgr') row.push(chip(L.polAligned(S) ? 'Rules match the priority' : 'Rules pull against the priority', L.polAligned(S) ? 'ok' : 'bad'));
    if (S.seat === 'dir') row.push(chip(S.focus === S.strategy ? 'On strategy' : 'Off strategy', S.focus === S.strategy ? 'ok' : 'bad'));
    if (x === 'dir' || x === 'ceo') row.push(chip(`Strategy: ${L.STRATEGY[S.strategy][0]}`, 'dim'));
    if (x === 'ceo') row.push(chip(`Board ${Math.round(S.conf)}`, S.conf >= 50 ? 'ok' : S.conf >= 30 ? 'warn' : 'bad'));
    info += `<div class="row">${row.join('')}</div>`;
    if (x === 'mgr' || x === 'dir') { const sp = L.maintSpend(S), b = S.budget; info += `<div class="meter c-${sp > b ? 'bad' : sp > b * .85 ? 'warn' : 'ok'}"><span>Spend</span><div class="bar"><span style="width:${Math.round(clamp(sp / b, 0, 1) * 100)}%"></span></div><b class="num">${fmtMoney(sp)} / ${fmtMoney(b)}</b></div>`; }
    if (S.freeze === S.day) info += '<div class="warnbox c-bad">Maintenance spending is on hold for the rest of today.</div>';
    if (S.hh > S.clock) info += `<div class="warnbox c-work">Happy hour until ${fmtClock(S.hh)}: 50% more guests, queues build fast.</div>`;
    if (S.talk) info += `<div class="warnbox c-warn">Toolbox talk on ${L.TOPIC[S.talk.topic || 'safety'][0].toLowerCase()} under way: ${S.crew.filter(c => c.talk).length} listening, back to work at ${fmtClock(S.talk.end)}. Pulling someone out means they miss it.</div>`;
    if (S.away > S.clock) info += `<div class="warnbox c-warn">You are away from your desk until ${fmtClock(S.away)}.</div>`;
    if (S.prio) { const pr = L.ride(S, S.prio); if (pr) info += `<div class="warnbox c-warn">Rush job: ${esc(pr.name)}. Everyone who can help goes there first.</div>`; }
  }
  info += `<p class="note">${SEATTIP[x]()}</p>`;
  if (day) {
    if (x === 'sup') cm += cmd('allfree', 'data-fk="c-af"', 'Select free crew <kbd>A</kbd>', `${free} standing by`, '', !free);
    if (x === 'sup' && S.seat === 'sup') { const nf = !S.crew.some(c => c.role === 'tech' && c.on && !c.temp && !c.agency && !c.target && !c.post && !c.brk), cd = S.cdTop || {};
      cm += Object.keys(L.TOPIC).map(k => { const wait = (cd[k] || 0) - S.clock; return cmd('walk', `data-v="${k}" data-fk="tk-${k}"`, `Talk: ${L.TOPIC[k][0].toLowerCase()}`, S.talk ? (S.talk.topic === k ? `Under way, back at ${fmtClock(S.talk.end)}` : 'Another talk is under way') : wait > 0 ? `Ready in ${wait} min` : nf ? 'Nobody is free to attend' : L.TOPIC[k][1], '', wait > 0 || nf || !!S.talk, S.talk && S.talk.topic === k); }).join(''); }
    else if (L.WALK[x] && x === S.seat) cm += cmd('walk', 'data-fk="c-walk"', L.WALK[x][0], S.clock < S.cdW ? `Ready in ${S.cdW - S.clock} min` : L.WALK[x][1].replace(/\.$/, ''), '', S.clock < S.cdW);
    if (may('happy')) cm += cmd('happy', 'data-fk="c-hh"', 'Happy hour', S.hh > S.clock ? `On until ${fmtClock(S.hh)}` : S.d.hh ? 'Used today' : '1 h: 50% more guests, 15% less each, glow +8. Best when the park is quiet', '', !!S.d.hh || S.clock >= L.LH - 60, S.hh > S.clock);
    if (may('brief')) cm += cmd('brief', 'data-fk="c-br"', 'Brief the chair', S.d.brief ? 'Done today' : S.clock < 660 ? 'From 11:00' : 'Good uptime raises confidence; a bad day lowers it', '', !!S.d.brief || S.clock < 660);
    if (may('agency')) cm += cmd('agency', 'data-fk="c-ag"', 'Agency crew', S.d.agency ? 'Already used today' : `${fmtMoney(L.AGENCY)}: a mechanic and an electrician for 3 h`, '', !!S.d.agency || S.clock >= L.LH - 60 || S.cash < L.AGENCY);
    if (may('focus')) cm += Object.keys(L.FOCUS).map(f => cmd('setfocus', `data-v="${f}" data-fk="f-${f}"`, L.FOCUS[f], { uptime: 'Approve what keeps rides open', cost: 'Wait for stock, fewer contractors', safety: 'No patches, more services' }[f], '', false, S.focus === f)).join('');
    if (may('budget')) cm += cmd('budget', 'data-v="-250" data-fk="b-dn"', 'Budget −$250', `Now ${fmtMoney(S.budget)} a day`) + cmd('budget', 'data-v="250" data-fk="b-up"', 'Budget +$250', `Now ${fmtMoney(S.budget)} a day`);
    if (may('crowd')) cm += cmd('crowd', 'data-fk="c-cp"', 'Crowd-pleaser <kbd>C</kbd>', S.clock < S.cdC ? `Ready in ${S.cdC - S.clock} min` : '$250: glow +10, queues clear', '', S.clock < S.cdC || S.cash < 250);
    if (x === 'mgr') { const P = S.pol, nx = (arr, v) => arr[(arr.indexOf(v) + 1) % arr.length];
      cm += cmd('pol', `data-k="nopart" data-v="${nx(['wait', 'patch', 'express'], P.nopart)}" data-fk="p-np"`, 'Rule: no part', { wait: 'Wait for stock', patch: 'Patch and move on', express: 'Order express' }[P.nopart])
        + cmd('pol', `data-k="pm" data-v="${nx([0, 40, 55, 70], +P.pm)}" data-fk="p-pm"`, 'Rule: services', +P.pm ? `Below ${P.pm}% health` : 'Off'); }
  }
  cm += cmd('role', `data-v="${S.seat}" data-fk="c-role"`, 'What this job is', 'In real life') + cmd('seats', 'data-fk="c-seat"', 'Change seat', 'Try another job', 'dupa');
  cm += `${cmd('desk', 'data-v="company" data-fk="c-co"', 'Company', `${L.headcount(S)} on the payroll`, 'dup')}${cmd('desk', 'data-v="team" data-fk="c-tm"', 'Team', 'Roster, shifts, policy', 'dup')}${cmd('desk', 'data-v="stores" data-fk="c-st"', 'Stores', 'Parts and orders', 'dup')}${cmd('mute', 'data-fk="c-mu"', 'Sound', snd.on ? 'On' : 'Off', '', false, snd.on)}${cmd('fit', 'data-fk="c-fit"', 'Whole park', 'Reset the view', 'dupa')}${cmd('help', 'data-fk="c-help"', 'How to play', 'Rules and map key', 'dupa')}`;
  return [hd, info, cm];
}
function taskHTML() { // the technician's own steps at a job, big and in the middle
  const c = S.seat === 'tech' && S.phase === 'day' && !ui.title && L.me(S);
  if (!c || !c.on || ui.desk) return '';
  const r = c.target && L.ride(S, c.target), j = r && r.job;
  if (c.state === 'hurt') return `<div class="task bad" role="group" aria-label="Injury"><h3>You are hurt</h3><p>First aid, and back to work in ${c.hurt - S.clock} min. The incident has been reported.</p></div>`;
  if (c.state === 'signoff' && r && r.so) { const o = r.so, fit = o.steps[o.i] === 'fit' && o.lead === c.id && !o.signedAt, pad = o.pads.includes(c.id);
    return `<h3>${esc(r.short)} is fixed</h3><p>${fit ? `A test run, then sign it <b>fit to run</b>: ${Math.max(0, o.at + L.SO_SIGN - S.clock)} min before the supervisor has to do it for you. ` : o.signedAt > S.clock ? 'Test run… ' : ''}${pad ? 'Then take <b>your own padlock</b> off: the ride cannot reopen with it on.' : ''}</p><div class="row">${fit ? `<button type="button" class="btn go" data-a="fit" data-v="test" data-fk="t-fit">Test run, then sign</button><button type="button" class="btn" data-a="fit" data-v="now" data-fk="t-fitnow">Sign now, no test</button>` : ''}${pad ? `<button type="button" class="btn${fit ? '' : ' go'}" data-a="padoff" data-fk="t-pad">Padlock off</button>` : ''}</div>`; }
  if (!c.target) { const list = L.myChecks(S); if (list.length || c.chkUntil) { // the morning round: your share of the daily checks
    const near = list.find(x => Math.hypot(c.x - x.x, c.y - x.y) < 70), doing = c.chkUntil && L.ride(S, c.chkRun);
    return `<h3>${doing ? `Checking ${esc(doing.short)}: ${Math.max(0, c.chkUntil - S.clock)} min` : 'Morning checks'}</h3><p>${list.length ? `Yours before the gates open at ${fmtClock(L.OPEN)}: <b>${list.map(x => esc(x.short)).join(', ')}</b>. A ride not checked stays shut.` : 'Last one.'}${S.gates && list.length ? ` <b>The gates are open: ${S.clock >= L.OPEN + 10 ? 'they have gone to the supervisor' : `in ${L.OPEN + 10 - S.clock} min they go to the supervisor`}.</b>` : ''}</p><div class="row">${!doing && near ? `<button type="button" class="btn go" data-a="dcheck" data-id="${near.id}" data-fk="dc-${near.id}">Check ${esc(near.short)}</button>` : ''}${doing ? '' : list.filter(x => x !== near).slice(0, near ? 2 : 3).map((x, i) => `<button type="button" class="btn${!near && i === 0 ? ' go' : ''}" data-a="chkgo" data-id="${x.id}" data-fk="cg-${x.id}">Go to ${esc(x.short)}</button>`).join('')}</div>`; } }
  if (!j) return '';
  if (c.state === 'prep') return `<h3>At ${esc(r.name)}: lock it out first</h3><p>Your own padlock on the isolator and a tag with your name, so nobody can start the ride while your hands are in it.${S.comp >= 50 ? ' <b>It has been a routine day, and you have done this a hundred times. That is when people get hurt.</b>' : ''}</p><div class="tgo">${cmd('lock', 'data-fk="t-lk"', 'Lock out and tag', '2 min, then find the cause', 'go')}${cmd('skiplock', 'data-fk="t-sk"', 'Skip the lockout', `Saves 2 min. ${Math.round(15 + S.comp / 4)}% chance of an injury`)}</div>`;
  if (c.state === 'lock') return `<h3>Locking out ${esc(r.short)}…</h3><p>Padlock on, tag on, test that it will not start.</p>`;
  if (c.state === 'diag' || c.state === 'check') { const chk = c.state === 'check', rd = j.rd > S.clock, gut = L.gutOk(S, c, j) && !j.out, ruled = i => (j.out || []).includes(i) || (j.ruled || []).includes(i);
    return `<h3>${rd ? `Reading the procedure: ${c.stall - S.clock} min` : chk ? `Not that one. Checking: ${c.stall - S.clock} min` : `What is wrong with ${esc(r.short)}?`}</h3><p><b>What you can see:</b> ${esc(j.sym)}${j.out ? '' : ' <span class="dim">Right first time and you work 25% faster on this job.</span>'}${!gut && !j.out && !j.proc ? ' <span class="dim">You have not seen enough of these to have a gut feeling yet.</span>' : ''}</p><div class="tgo">${j.opts.map((o, i) => cmd('dx', `data-i="${i}" data-fk="t-dx-${i}"`, esc(o), (j.ruled || []).includes(i) ? 'The procedure rules this out' : (j.out || []).includes(i) ? 'Ruled out' : gut && j.gut === i ? 'Your gut says this one' : '', gut && j.gut === i && !ruled(i) ? 'go' : '', chk || ruled(i))).join('')}${cmd('proc', 'data-fk="t-proc"', 'Check the procedure', j.proc ? 'Already checked' : '3 min: rules one cause out for certain', '', chk || !!j.proc)}</div>`; }
  return '';
}
function selOther(c) { // a colleague, seen from the technician's seat
  const info = `<div class="row"><span class="chip c-${!c.on ? 'dim' : c.state === 'work' ? 'work' : c.target ? 'warn' : 'ok'}">${esc(staffLine(c))}</span><span class="chip c-dim">${esc(shiftLine(c))}</span></div>${c.role === 'tech' ? `<div class="row sk">${skillsHTML(c)}</div>` : ''}<p class="note">${c.role === 'sup' ? 'Your supervisor. Work orders come from here.' : 'A colleague. Only the supervisor can send them anywhere.'}</p>`;
  return [shead(avHTML(c), esc(c.name), title(c), true), info, (c.on ? cmd('focus', `data-x="${Math.round(c.x)}" data-y="${Math.round(c.y)}" data-fk="loc"`, 'Locate', 'Centre the map') : '') + cmd('me', 'data-fk="me"', 'Back to you', 'Select yourself', 'go')];
}
function selMe(c) { // you, the technician
  const day = S.phase === 'day', r = c.target && L.ride(S, c.target), j = r && r.job, busy = ['prep', 'lock', 'diag', 'check', 'hurt'].includes(c.state);
  let info = `<div class="row"><span class="chip c-${!c.on ? 'dim' : c.state === 'work' ? 'work' : c.target ? 'warn' : 'ok'}">${esc(staffLine(c))}</span><span class="chip c-dim">${esc(shiftLine(c))}</span><span class="chip c-${c.morale >= 55 ? 'ok' : c.morale >= 30 ? 'warn' : 'bad'}">Morale ${Math.round(c.morale)}</span><span class="chip c-${S.comp < 45 ? 'ok' : S.comp < 60 ? 'warn' : 'bad'}">Alertness ${100 - Math.round(S.comp)}</span></div><div class="row sk">${skillsHTML(c)}</div>`, cm = '';
  if (!day) info += '<p class="note">Between days the managers plan. Look at the desk to see what they decided last night.</p>';
  else if (!c.on) info += `<div class="warnbox c-dim">${c.sick ? 'You are off sick today.' : S.clock < L.SHIFT[c.shift][0] ? `Your shift starts at ${fmtClock(L.SHIFT[c.shift][0])}. Watch, or speed up the clock.` : 'Your shift is over. Watch the park, speed up the clock, or take another seat for the evening.'}</div>`;
  else if (c.state === 'hurt') info += `<div class="warnbox c-bad"><b>Hurt.</b> First aid, back in ${c.hurt - S.clock} min.</div>`;
  else if (c.state === 'prep') info += `<div class="warnbox c-warn"><b>At ${esc(r.short)}.</b> Lock it out before you touch it: use the card above.</div>`;
  else if (c.state === 'lock') info += `<div class="warnbox c-work">Locking out ${esc(r.short)}…</div>`;
  else if (c.state === 'diag' || c.state === 'check') {
    info += `<div class="warnbox c-${c.state === 'check' ? 'bad' : 'warn'}">Finding the fault on ${esc(r.short)}: use the card above.</div>`;
  }
  if (day && c.on && j && !busy) {
    info += j.type === 'fault' ? `<div class="warnbox c-${isStuck(j) ? 'bad' : 'work'}"><b>${esc(r.short)}: ${esc(j.title)}</b><br>${esc(partLine(j))}${j.mode === 'patch' ? ' · patching' : ''}<div class="bar c-work" style="margin-top:5px"><span style="width:${Math.round(clamp(j.prog / L.need(j), 0, 1) * 100)}%"></span></div></div>` : `<div class="warnbox c-work"><b>Service on ${esc(r.short)}</b><br>${esc(partLine(j))}</div>`;
    if (j.type === 'fault' && c.state !== 'walk') {
      if (S.crew.filter(x => x.target === r.id).length < 2) cm += cmd('ask', `data-k="help" data-id="${r.id}" data-fk="a-help"`, 'Ask for help', `${askWho('sup')} decides`);
      if (j.mode === 'full' && !j.lock) cm += cmd('ask', `data-k="patch" data-id="${r.id}" data-fk="a-patch"`, 'Ask to patch it', 'Quicker, fails again sooner');
      if (isStuck(j) && !L.incoming(S, j.part)) { const p = L.price(S, j.part, 'exp'); cm += cmd('ask', `data-k="express" data-id="${r.id}" data-sku="${j.part}" data-fk="a-exp"`, 'Ask for an express part', `${fmtMoney(p)}: ${askWho('sup', p)} decides`); }
      if (isStuck(j) && !S.crew.some(x => x.temp && x.target === r.id)) cm += cmd('ask', `data-k="callout" data-id="${r.id}" data-fk="a-co"`, 'Ask for a contractor', `${askWho('mgr', L.calloutCost(S))} decides`);
    }
  }
  { const left = day && c.on && S.rides.find(x => x.so && x.so.pads.includes(c.id) && c.target !== x.id); // a padlock you left on a finished job
    if (left) { const near = Math.hypot(c.x - left.x, c.y - left.y) < 70; info += `<div class="warnbox c-warn"><b><span aria-hidden="true">🔒</span> Your padlock is still on ${esc(left.short)}.</b> It cannot reopen until you take it off.</div>`;
      cm += near ? cmd('padoff', 'data-fk="padoff-me"', 'Padlock off', esc(left.short), 'go') : cmd('padgo', `data-id="${left.id}" data-fk="padgo"`, `Back to ${esc(left.short)}`, 'Take your padlock off', 'go'); } }
  if (day && c.on && !c.target && !busy) {
    const jobs = S.rides.filter(x => x.job && x.job.type === 'fault' && (c.skills[x.job.trade] || x.job.rescue)).sort((a, b) => (b.job.rescue > 0) - (a.job.rescue > 0) || (S.crew.some(x => x.target === a.id)) - (S.crew.some(x => x.target === b.id)) || (b.job.sev === 'major') - (a.job.sev === 'major')).slice(0, 4);
    cm += jobs.map((x, i) => { const e = eta(c, x), n = S.crew.filter(y => y.target === x.id).length; return cmd('goride', `data-id="${x.id}" data-fk="j-${x.id}"`, `${x.job.rescue ? 'Rescue' : 'Take'}: ${esc(x.short)}`, `${e.walk} min walk${n ? ' · ' + n + ' there' : ''}`, i === 0 ? 'go' : ''); }).join('');
    if (!jobs.length) {
      const tired = S.rides.filter(x => !x.job && c.skills[L.primary(x)] && x.health < 70).sort((a, b) => a.health - b.health).slice(0, 2);
      cm += tired.map(x => cmd('goride', `data-id="${x.id}" data-fk="sv-${x.id}"`, `Service ${esc(x.short)}`, `${Math.round(x.health)}% health, uses a kit`, '', S.stock.kit < 1)).join('');
      info += `<p class="note">${tired.length ? 'Nothing in your trade is broken. Quiet spells are for servicing tired rides.' : 'Nothing in your trade needs doing. Stand somewhere central, or wait for a work order.'}</p>`;
    }
  }
  if (day && c.on && !busy) cm += abilHTML([c]) + (c.target || c.post ? cmd('stop', 'data-fk="stand"', 'Stop <kbd>S</kbd>', 'Drop what you are doing') : '');
  if (day && c.on && c.shift === 'early' && !c.once && S.clock >= 960 && S.clock < 1020) cm += cmd('ask', 'data-k="stay" data-fk="a-stay"', 'Ask to stay on', `${fmtMoney(L.otCost(c))} overtime: ${askWho('sup', L.otCost(c))} decides`);
  if (c.on) cm += cmd('focus', `data-x="${Math.round(c.x)}" data-y="${Math.round(c.y)}" data-fk="loc"`, 'Locate', 'Centre the map');
  cm += cmd('role', 'data-v="tech" data-fk="c-role"', 'What this job is', 'In real life') + cmd('seats', 'data-fk="c-seat"', 'Change seat', 'Try another job', 'dupa');
  return [shead(avHTML(c), `${esc(c.name)} ${gradeOf(c) ? pips(gradeOf(c), rk(c)) : ''}`, `You · ${title(c)}`, false), info, cm];
}
function selUnit(c) {
  if (S.seat === 'tech') return isMe(c) ? selMe(c) : selOther(c);
  const day = S.phase === 'day', tech = c.role === 'tech', mgr = L.isMgr(c);
  let info = `<div class="row"><span class="chip c-${!c.on ? 'dim' : c.state === 'work' ? 'work' : c.target ? 'warn' : 'ok'}">${esc(staffLine(c))}</span><span class="chip c-dim">${esc(shiftLine(c))}</span>${mgr ? '' : `<span class="chip c-${c.morale >= 55 ? 'ok' : c.morale >= 30 ? 'warn' : 'bad'}">Morale ${Math.round(c.morale)}</span>`}${enChip(c)}${c.tired ? '<span class="chip c-warn">Tired</span>' : ''}</div>`;
  let cm = '';
  if (tech && c.on && day) {
    const jobs = S.rides.filter(r => r.job && c.skills[r.job.trade] && c.target !== r.id).sort((a, b) => (a.job.type === 'service') - (b.job.type === 'service') || (b.job.sev === 'major') - (a.job.sev === 'major') || a.job.t0 - b.job.t0).slice(0, 5);
    cm += jobs.map((r, i) => { const e = eta(c, r), others = S.crew.filter(x => x.target === r.id).length; return cmd('send', `data-t="${c.id}" data-id="${r.id}" data-fk="j-${r.id}"`, `${r.job.type === 'service' ? 'Service' : 'Fix'} ${esc(r.short)}`, `${e.walk} min walk, ${e.work} min job${others ? ' · ' + others + ' there' : ''}`, i === 0 && !c.target ? 'go' : ''); }).join('');
    if (!jobs.length && !c.target) {
      const tired = S.rides.filter(r => !r.job && c.skills[L.primary(r)] && r.health < 75).sort((a, b) => a.health - b.health).slice(0, 3);
      cm += tired.map(r => cmd('send', `data-t="${c.id}" data-id="${r.id}" data-fk="j-${r.id}"`, `Service ${esc(r.short)}`, `${Math.round(r.health)}% health, uses a kit`, '', S.stock.kit < 1)).join('');
      info += `<p class="note">${tired.length ? 'Nothing in this trade is broken. A quiet spell is the time to service a tired ride.' : 'Nothing in this trade needs doing right now.'}</p>`;
    }
    cm += abilHTML([c]);
    if (c.target || c.post) cm += cmd('stop', 'data-fk="stand"', 'Stop <kbd>S</kbd>', 'Drop the current order');
  }
  if (tech) info += `<div class="row sk">${skillsHTML(c)}</div>`;
  if (c.role === 'store') {
    const parts = [...new Set(S.rides.filter(r => isStuck(r.job) && !L.incoming(S, r.job.part)).map(r => r.job.part))];
    cm += parts.slice(0, 3).map(k => { const p = L.price(S, k, 'exp'), rr = S.rides.find(r => isStuck(r.job) && r.job.part === k); return canSpend(p) ? cmd('order', `data-k="${k}" data-v="exp" data-fk="ex-${k}"`, `Express ${esc(L.SKU[k][0].toLowerCase())}`, `${fmtMoney(p)}, in by ${fmtClock(L.expressEta(S))}`, 'go', !day || S.cash < p) : cmd('ask', `data-k="express" data-id="${rr.id}" data-sku="${k}" data-fk="ex-${k}"`, `Ask for express ${esc(L.SKU[k][0].toLowerCase())}`, `${fmtMoney(p)}: ${askWho('sup', p)} decides`, '', !day); }).join('');
    cm += cmd('desk', 'data-v="stores" data-fk="c-st"', 'Open stores', 'Shelves, minimums, orders');
    info += `<p class="note">Runs parts out to the job and books deliveries in.${parts.length ? ' A job is waiting on a part that is not on the shelf.' : ''}</p>`;
  }
  if (c.role === 'mach') {
    const fabs = Object.keys(L.SKU).filter(k => L.SKU[k][3]).sort((a, b) => S.stock[a] - S.stock[b]).slice(0, 4);
    cm += fabs.map(k => cmd('order', `data-k="${k}" data-v="fab" data-fk="fb-${k}"`, `Make ${esc(L.SKU[k][0].toLowerCase())}`, `${fmtMoney(L.price(S, k, 'fab'))} · ${S.stock[k]} on shelf`, '', S.cash < L.price(S, k, 'fab'))).join('');
    info += `<p class="note">${S.fab.length ? 'Workshop queue: ' + S.fab.map(f => esc(L.SKU[f.sku][0].toLowerCase()) + ' ' + Math.round((1 - f.left / f.total) * 100) + '%').join(', ') + '.' : 'Makes some mechanical parts at about a third of list price.'}</p>`;
  }
  if (c.role === 'sup' && !may('policy')) info += '<p class="note">You are the supervisor. The dispatch rules belong to the manager and only steer the computer when it runs the shift.</p>';
  if (c.role === 'sup' && may('policy')) {
    const P = S.pol, nx = (arr, v) => arr[(arr.indexOf(v) + 1) % arr.length];
    cm += cmd('pol', `data-k="auto" data-v="${!P.auto}" data-fk="p-auto"`, 'Dispatch', P.auto ? 'Supervisor decides' : 'You decide', '', false, !!P.auto)
      + cmd('pol', `data-k="nopart" data-v="${nx(['wait', 'patch', 'express'], P.nopart)}" data-fk="p-np"`, 'No part in stores', { wait: 'Wait for stock', patch: 'Patch and move on', express: 'Order express' }[P.nopart])
      + cmd('pol', `data-k="pm" data-v="${nx([0, 40, 55, 70], +P.pm)}" data-fk="p-pm"`, 'Service rides', +P.pm ? `Below ${P.pm}% health` : 'Off');
    info += '<p class="note">Dispatches work orders to the policy you set here. Tap a policy to change it.</p>';
  }
  if (mgr) { cm += cmd('desk', 'data-v="company" data-fk="c-co"', 'Open Company', MGRDEPT[c.role]); info += `<p class="note">${MGRDOES[c.role]}</p>`; }
  if (!mgr && !c.temp && c.on && c.shift === 'early' && day) cm += cmd('hold', 'data-fk="hold"', 'Hold on overtime', `${fmtMoney(L.otCost(c))}, stays to 22:00`);
  if (day && may('callin') && !c.on && !c.temp && !c.agency && !mgr && !c.sick && !c.inAt && c.shift !== 'full' && (tech || c.role === 'store') && S.clock < L.LH - 30) cm += cmd('callin', 'data-fk="callin"', 'Call in now', `${fmtMoney(L.otCost(c))} overtime, on site in 20 min`, 'go');
  if (c.on) cm += cmd('focus', `data-x="${Math.round(c.x)}" data-y="${Math.round(c.y)}" data-fk="loc"`, 'Locate', 'Centre the map');
  if (!c.temp && !mgr) cm += cmd('desk', 'data-v="team" data-fk="c-tm"', 'Roster', 'Shifts and training');
  return [shead(avHTML(c), `${esc(c.name)} ${gradeOf(c) ? pips(gradeOf(c), rk(c)) : ''}`, title(c), true), info, cm];
}
const cdTxt = (cd, active, label) => active > S.clock ? `Active, ${active - S.clock} min left` : cd > S.clock ? `Ready in ${cd - S.clock} min` : label;
function abilHTML(us) {
  const sOk = us.some(c => S.clock >= c.cdS), pOk = us.some(c => !c.temp && S.clock >= c.cdP), c = us[0];
  return cmd('sprint', 'data-fk="ab-s"', 'Sprint <kbd>Q</kbd>', us.length > 1 ? 'Everyone who is ready' : cdTxt(c.cdS, c.sprint, 'Double speed for 25 min'), '', !sOk, us.some(x => x.sprint > S.clock))
    + cmd('push', 'data-fk="ab-p"', 'Push <kbd>W</kbd>', us.length > 1 ? 'Work 60% faster, costs morale' : cdTxt(c.cdP, c.push, 'Work 60% faster, 30 min, −2 morale'), '', !pOk, us.some(x => x.push > S.clock))
    + cmd('rest', 'data-fk="ab-r"', 'Break <kbd>B</kbd>', us.length > 1 ? 'Everyone who is tired' : c.brk ? `On a break, full in ${Math.ceil((100 - L.enOf(c)) / 2)} min` : `Energy ${Math.round(L.enOf(c))}: full in ${Math.ceil((100 - L.enOf(c)) / 2)} min`, '', !us.some(x => !x.brk && !x.temp && !x.agency && L.enOf(x) < 95), us.some(x => x.brk));
}
function selGroup(us) {
  const jobs = S.rides.filter(r => r.job && r.job.type === 'fault' && us.some(c => c.skills[r.job.trade] || r.job.rescue)).sort((a, b) => (b.job.rescue > 0) - (a.job.rescue > 0) || (b.job.sev === 'major') - (a.job.sev === 'major') || a.job.t0 - b.job.t0).slice(0, 4);
  const info = `<div class="row">${us.map(c => `<span class="chip t-${rk(c)}">${esc(c.name)}: ${esc(staffLine(c))}</span>`).join('')}</div>`;
  let cm = jobs.map((r, i) => cmd('gsend', `data-id="${r.id}" data-fk="g-${r.id}"`, `${r.job.rescue ? 'Rescue' : 'Fix'} ${esc(r.short)}`, `${us.filter(c => c.skills[r.job.trade]).length} of ${us.length} qualified`, i === 0 ? 'go' : '')).join('');
  cm += abilHTML(us) + cmd('stop', 'data-fk="stand"', 'Stop <kbd>S</kbd>', 'Drop current orders');
  return [shead(`<span class="av" style="--c:var(--sky)" aria-hidden="true">${us.length}</span>`, `${us.length} people selected`, 'Orders go to everyone who can do the job', true), info, cm];
}
/* a fixed ride waiting to be signed back into service: the steps, the job sheet, whose padlocks are on, and your buttons */
const SO_STEPN = { fit: 'Fit to run', sup: 'Supervisor countersigns', mgr: 'Manager countersigns', dir: 'Director countersigns', review: 'Incident review', ops: 'Operations run it empty', insp: 'Inspector clears the red tag', power: 'Power restored', go: 'Back in service' };
const CAUSE = { found: 'Cause found and written down', service: 'Planned service', reset: 'Reset; no cause needed', none: 'No cause written down', guess: 'Cause guessed, not checked' };
const sheetGaps = o => [o.wr.cause === 'none' ? 'no cause' : o.wr.cause === 'guess' ? 'cause only guessed' : '', o.wr.test === false ? 'no test run' : '', o.wr.patch && o.safe ? 'a patch on a safety-critical part' : ''].filter(Boolean);
function soHTML(r) {
  const o = r.so, st = o.steps[o.i], w = o.wr, t = L.staff(S, w.tid), bad = L.soBad(o), mine = soMine(r);
  const steps = o.steps.map((k, i) => `<li class="${i < o.i ? 'done' : i === o.i ? 'now' : ''}"><span aria-hidden="true">${i < o.i ? '✓' : i === o.i ? '▸' : '·'}</span> ${SO_STEPN[k]}${i < o.i && o.by[k] ? ` <small>${esc(o.by[k])}</small>` : ''}${i === o.i ? (o.esc ? ' <small class="hot">escalated</small>' : k === 'insp' && o.inspAt ? ` <small>${fmtClock(o.inspAt)}</small>` : '') : ''}</li>`).join('');
  const sheet = `<ul class="wr"><li class="${w.cause === 'none' || w.cause === 'guess' ? 'gap' : 'okk'}">${CAUSE[w.cause]}</li><li>${w.part ? 'Part: ' + esc(L.SKU[w.part][0].toLowerCase()) : w.patch ? 'No part: patched' : 'No parts needed'}</li><li class="${w.test === false ? 'gap' : 'okk'}">${w.test === false ? 'No test run' : w.test ? 'Test run done' : 'Test run still to do'}</li><li class="${w.patch && o.safe ? 'gap' : ''}">${w.patch ? `Patch${o.safe ? ' on a safety-critical part' : ''}` : 'Full repair'}</li><li>By ${esc(w.who)}${t && !t.temp ? `, ${esc(L.GRADE[w.grade] || '').toLowerCase()}` : ''}</li></ul>`;
  const pads = o.pads.length ? `<div class="warnbox c-warn"><b><span aria-hidden="true">🔒</span> Padlock${o.pads.length > 1 ? 's' : ''} still on:</b> ${o.pads.map(id => id === S.me && S.seat === 'tech' ? 'yours' : esc((L.staff(S, id) || {}).name || 'someone')).join(', ')}. It cannot reopen until each person takes their own off.</div>` : '';
  let h = `<div class="warnbox c-warn so"><b>Fixed, waiting to reopen</b> <span class="chip c-dim">${esc(L.SO_NAME[o.k])}</span><br><span class="dim">Losing about ${fmtMoney(L.hourly(S, r))} an hour while it waits.</span><ol class="sos">${steps}</ol></div>${pads}<div class="sheet"><small class="cap">Job sheet</small>${sheet}</div>`, cm = '';
  if (!mine) return [h, cm];
  const left = Math.max(0, o.at + L.SO_SIGN - S.clock);
  if (st === 'sup' || st === 'mgr' || st === 'dir') {
    h = `<div class="warnbox c-work"><b>Yours to countersign: ${left} min</b> before it goes up a seat. Read the job sheet first.</div>` + h;
    const gaps = sheetGaps(o);
    cm += cmd('csign', `data-id="${r.id}" data-v="sign" data-fk="cs-sign"`, 'Sign to reopen', gaps.length ? `Sheet: ${gaps.join(', ')}. You share the fault` : `Sheet complete: ${w.cause === 'found' ? 'cause found, ' : ''}test run${w.part ? ', part fitted' : ''}`, bad ? '' : 'go')
      + cmd('csign', `data-id="${r.id}" data-v="back" data-fk="cs-back"`, 'Send back', bad ? 'To the crew, to finish it properly' : 'Nothing wrong: costs time and goodwill', bad ? 'go' : '');
  } else if (st === 'review') {
    h = `<div class="warnbox c-bad"><b>Incident review: ${Math.max(0, o.at + L.SO_SIGN + 10 - S.clock)} min.</b> Someone was hurt on this job. Decide what changes, then countersign the reopening.</div>` + h;
    cm += Object.entries(L.REVIEW).map(([k, [b, sub]], i) => cmd('review', `data-id="${r.id}" data-v="${k}" data-fk="rv-${k}"`, b, sub, i === 0 ? 'go' : '')).join('');
  } else if (st === 'fit' && S.seat === 'tech') {
    h = `<div class="warnbox c-work"><b>Yours to sign: ${left} min.</b> A test run, then "fit to run".</div>` + h;
    cm += cmd('fit', 'data-v="test" data-fk="fit-test"', 'Test run, then sign', 'Two minutes: fit to run', 'go') + cmd('fit', 'data-v="now" data-fk="fit-now"', 'Sign now', 'No test run: a gap on the sheet');
  }
  if (S.seat === 'tech' && o.pads.includes(S.me)) cm += cmd('padoff', 'data-fk="padoff"', 'Padlock off', 'Your own, from the isolator', st === 'fit' ? '' : 'go');
  return [h, cm];
}
function selRide(r) {
  const st = L.status(S, r), [sl, scc] = STAT[st], j = r.job, hc = r.health >= 60 ? 'ok' : r.health >= 35 ? 'warn' : 'bad', day = S.phase === 'day', tr = j ? j.trade : L.primary(r), stuck = isStuck(j);
  const hd = shead(`<span class="av c-${scc}" aria-hidden="true">${esc(r.short[0])}</span>`, esc(r.name), `<span class="chip c-${scc}">${sl}</span>${r.patched ? ' <span class="chip c-warn">Patched</span>' : ''}${r.ovh ? ' <span class="chip c-ok">Overhauled</span>' : ''}`, true);
  let h = `<div class="meter c-${hc}"><span>Health</span><div class="bar"><span style="width:${Math.round(r.health)}%"></span></div><b>${Math.round(r.health)}%</b></div>`;
  if (r.sub) h += `<div class="kv"><div><small>Queue</small><b>${Math.round(r.q)}</b></div><div><small>Earning</small><b>${fmtMoney(r.rate * 60)}/h</b></div><div><small>Today</small><b>${fmtMoney(r.earn)}</b></div></div>`;
  else h += `<p class="note">Feeds ${S.rides.filter(x => x.sub === r.id).map(x => x.short).join(', ')}. If it fails, they all go dark.</p>`;
  if (day && S.clock > L.LH && r.sub) h += `<div class="meter c-warn"><span>Lantern</span><div class="bar"><span style="width:${Math.round(clamp(r.lh / L.LIT_MIN, 0, 1) * 100)}%"></span></div><b>${Math.floor(r.lh)}/${L.LIT_MIN}</b></div>`;
  let soCm = ''; if (r.so) { const [sh, sc2] = soHTML(r); h = sh + h; soCm = sc2; }
  if (st === 'unstaffed') h += '<div class="warnbox c-bad">Nobody to run it. Each ride operator keeps two rides open. Hire more under Company, Operations.</div>';
  if (st === 'nopower') h += `<div class="warnbox c-bad">No power. Fix ${esc(L.ride(S, r.sub).name)} to bring it back.</div>`;
  if (r.warnAt && !j) h += `<div class="warnbox c-warn">Monitoring says it fails around ${fmtClock(r.warnAt)}. A service now prevents it.</div>`;
  if (j && j.type === 'fault' && !j.first && day && S.clock - j.t0 <= L.FAST) h += `<div class="warnbox c-work"><b>⚡ ${L.FAST - (S.clock - j.t0)} min left for a fast response.</b> Send someone qualified now and the job shrinks by a fifth.</div>`;
  if (j && j.glitch) h += `<p class="note"><b>${L.GKIND[j.glitch][0]}.</b> ${{ reset: 'A few minutes\' work, but it gets worse 15 minutes after it starts.', std: 'About a quarter of an hour\'s work. It gets worse if nobody comes.', flicker: 'Leave it 20 minutes and it clears itself, but the ride takes a knock and fails properly within the hour unless it is serviced.' }[j.glitch]}</p>`;
  if (r.fl > S.clock) h += `<div class="warnbox c-warn">Fast lane on until ${fmtClock(r.fl)}: earning 40% more, queues jam sooner, and a breakdown now costs goodwill.</div>`;
  if (r.svcReq && !j) h += '<div class="warnbox c-work">Service ordered: the supervisor sends the next free qualified person.</div>';
  if (j && j.type === 'fault') h += `<div class="warnbox c-${stuck ? 'bad' : 'work'}"><b>${esc(j.title)}</b> <span class="chip t-${j.trade}">${L.TRADES[j.trade]}</span><br>${esc(partLine(j))}${stuck ? '. The crew can diagnose, then they wait.' : ''}<div class="bar c-work" style="margin-top:5px"><span style="width:${Math.round(clamp(j.prog / L.need(j), 0, 1) * 100)}%"></span></div></div>`;
  else if (j) h += `<div class="warnbox c-work"><b>Planned service</b><br>${j.started ? 'Closed while the crew work. Reopens at 100% health.' : 'Stays open until the crew and the kit are on site.'} ${esc(partLine(j))}<div class="bar c-work" style="margin-top:5px"><span style="width:${Math.round(clamp(j.prog / j.work, 0, 1) * 100)}%"></span></div></div>`;
  else if (L.has(S, 'eng')) { const p = 1 - Math.pow(1 - L.hazard(S, r), 60); h += `<p class="note">Engineering: <b style="color:var(--${p > .12 ? 'ember' : p > .05 ? 'lantern' : 'jade'})">${Math.round(p * 100)}%</b> chance of a failure in the next hour.</p>`; }
  let cm = '';
  if (day && S.seat === 'tech') {
    const c = L.me(S), mine = c && c.target === r.id, ok = c && c.on && (j ? j.rescue || c.skills[j.trade] : c.skills[tr]);
    if (j && j.rescue) h = `<div class="warnbox c-bad"><b>Guests are stuck on it.</b> Anyone can get them down: be there by ${fmtClock(j.rescue)}, ${j.rescue - S.clock} min.</div>` + h;
    if (mine) h += '<p class="note">You are on this job. Your steps are on your own card: tap yourself.</p>';
    else if (ok) { const e = eta(c, r); cm += cmd('goride', `data-id="${r.id}" data-fk="go"`, j ? (j.rescue ? 'Go and rescue' : c.target ? 'Switch to this job' : 'Take this job') : 'Service it yourself', c.target ? `Leaves ${esc(L.ride(S, c.target).short)}` : `${e.walk} min walk${j ? '' : ', uses a kit'}`, c.target ? '' : 'go', !j && S.stock.kit < 1); }
    else if (c && c.on && (j || !c.skills[tr])) h += `<p class="note">Not your trade: ${L.TRADES[tr].toLowerCase()} work.</p>`;
    if (!j && c && c.on && r.health < 70 && !mine) cm += cmd('ask', `data-k="service" data-id="${r.id}" data-fk="rep"`, 'Report it', `${askWho('sup')} books a service`);
    cm += cmd('me', 'data-fk="me"', 'Back to you', 'Your own card');
  }
  if (day && S.seat !== 'tech') {
    if (j && j.type === 'fault' && L.RANK[S.seat] >= 2 && L.onNow(S, 'sup') && S.pol.auto) h += `<p class="note" style="color:var(--lantern)">${esc(L.holder(S, 'sup'))} is running the shift. Sending people yourself goes over their head.</p>`;
    const rows = S.crew.filter(c => c.role === 'tech' && c.skills[tr]).map(c => { const e = eta(c, r); return { c, e, on: c.target === r.id, sum: (c.on ? 0 : 9999) + e.walk + e.work }; }).sort((a, b) => b.on - a.on || a.sum - b.sum);
    const first = rows.findIndex(x => !x.on && x.c.on && !x.c.target);
    if (r.so) rows.length = 0; // fixed and waiting to reopen: nobody to send
    else if (!rows.some(x => x.c.on)) h += `<div class="warnbox c-bad">Nobody qualified for ${L.TRADES[tr].toLowerCase()} work is on shift.</div>`;
    else if (!j) h += `<p class="note">A service uses one kit (${S.stock.kit} in stores), closes the ride for about 45 minutes and resets health to 100%.</p>`;
    if (j && j.rescue) h = `<div class="warnbox c-bad"><b>Guests are stuck on it.</b> Get anyone there by ${fmtClock(j.rescue)}: ${j.rescue - S.clock} min.</div>` + h;
    if (j && j.type === 'fault' && may('rush')) cm += cmd('rush', `data-id="${r.id}" data-fk="rush"`, S.prio === r.id ? 'Rush job: on' : 'Rush job <kbd>R</kbd>', S.prio === r.id ? 'Tap to call it off' : 'Everyone who can help, now, pushed', S.prio === r.id ? '' : 'go', false, S.prio === r.id);
    if (!j && may('svc')) cm += cmd('svc', `data-id="${r.id}" data-fk="svc"`, r.svcReq ? 'Service ordered' : 'Order a service', r.svcReq ? 'Next free qualified person' : `Closes it ~45 min, back at 100%. Uses a kit (${S.stock.kit} left)`, '', !!r.svcReq || S.stock.kit < 1 || st === 'nopower', !!r.svcReq);
    if (r.sub && may('fastlane')) cm += cmd('fastlane', `data-id="${r.id}" data-fk="fl"`, r.fl > S.clock ? 'Fast lane: on' : 'Fast lane', r.fl > S.clock ? `Until ${fmtClock(r.fl)}` : (S.d.fl || 0) >= 2 ? 'Used twice today' : st !== 'ok' ? 'Only on a ride running properly' : '+40% from this ride for 1 h. A breakdown costs goodwill', '', r.fl > S.clock || (S.d.fl || 0) >= 2 || st !== 'ok' || !!j || S.clock >= L.CLOSE - 60, r.fl > S.clock);
    if (j && j.type === 'fault' && r.sub && may('vouch')) cm += cmd('vouch', `data-id="${r.id}" data-fk="vouch"`, 'Goodwill vouchers', r.vouch > S.clock ? `Handed out, until ${fmtClock(r.vouch)}` : S.clock < S.cdV ? `Ready in ${S.cdV - S.clock} min` : `${fmtMoney(L.VOUCH)}: this queue forgives the wait for an hour`, '', r.vouch > S.clock || S.clock < S.cdV || S.cash < L.VOUCH, r.vouch > S.clock);
    if (j && j.type === 'fault') cm += cmd('nearest', `data-id="${r.id}" data-fk="nr"`, 'Send nearest <kbd>E</kbd>', j.rescue ? 'Any free hand, sprinting' : `Closest free ${L.TRADES[tr].toLowerCase()} hand`, first >= 0 ? 'go' : '');
    cm += rows.slice(0, 5).map(({ c, e, on }, i) => on ? cmd('recall', `data-t="${c.id}" data-fk="rc-${c.id}"`, `Recall ${esc(c.name)}`, esc(staffLine(c)), '', false, true)
      : cmd('send', `data-t="${c.id}" data-id="${r.id}" data-fk="sd-${c.id}"`, `${j ? 'Send' : 'Service:'} ${esc(c.name)}`, c.on ? `${e.walk} + ${e.work} min${c.target ? ' · busy' : ''}${c.tired ? ' · tired' : ''}` : esc(shiftLine(c)), i === first && !(j && j.type === 'fault') ? 'go' : '', !c.on)).join('');
    if (j && j.type === 'fault') {
      cm += cmd('mode', `data-id="${r.id}" data-v="full" data-fk="m-full"`, 'Full repair', j.part ? 'Needs ' + esc(L.SKU[j.part][0].toLowerCase()) : 'No part needed', '', false, j.mode === 'full')
        + cmd('mode', `data-id="${r.id}" data-v="patch" data-fk="m-patch"`, 'Patch it', j.lock ? 'Red-tagged: not allowed' : 'No part, quicker, fails again', '', !!j.lock, j.mode === 'patch');
      if (stuck) { const p = L.price(S, j.part, 'exp');
        cm += canSpend(p) ? cmd('order', `data-k="${j.part}" data-v="exp" data-fk="o-exp"`, 'Express the part', `${fmtMoney(p)}, in by ${fmtClock(L.expressEta(S))}`, '', S.cash < p) : cmd('ask', `data-k="express" data-id="${r.id}" data-sku="${j.part}" data-fk="o-exp"`, 'Ask for express', `${fmtMoney(p)}: ${askWho('sup', p)} decides`);
        if (L.SKU[j.part][3] && L.has(S, 'mach')) cm += cmd('order', `data-k="${j.part}" data-v="fab" data-fk="o-fab"`, 'Make in workshop', `${fmtMoney(L.price(S, j.part, 'fab'))}, about ${Math.round(L.SKU[j.part][3] / 60 * 10) / 10} h`);
      }
      const co = L.calloutCost(S), coming = S.crew.some(c => c.temp && c.target === r.id);
      cm += canSpend(co) ? cmd('callout', `data-id="${r.id}" data-fk="co"`, 'Contractor', `${fmtMoney(co)} plus parts, 45 min`, '', !(S.cash >= co && !coming)) : cmd('ask', `data-k="callout" data-id="${r.id}" data-fk="co"`, 'Ask for a contractor', `${fmtMoney(co)}: ${askWho('mgr', co)} decides`, '', coming);
    }
  }
  if (day && S.seat !== 'tech' && L.RANK[S.seat] >= 1 && ((j && j.type === 'service' && j.plan && !j.started) || (S.dplan || []).includes(r.id))) cm += cmd('postpone', `data-id="${r.id}" data-fk="pp"`, 'Postpone the service', 'To tomorrow: frees the crew for breakdowns');
  cm = soCm + cm;
  cm += cmd('focus', `data-x="${r.x}" data-y="${r.y}" data-fk="loc"`, 'Locate', 'Centre the map');
  return [hd, h, cm];
}
function selHTML() {
  const t = S.seat === 'tech', c = ui.tech && L.staff(S, ui.tech), r = ui.sel && L.ride(S, ui.sel), us = selUnits(), m = t && L.me(S);
  const [hd, det, cm] = !t && us.length > 1 && S.phase === 'day' ? selGroup(us) : c ? selUnit(c) : r ? selRide(r) : m ? selUnit(m) : selPark();
  const sk = !t && us.length > 1 && S.phase === 'day' ? 'group' : c ? 'u-' + c.id : r ? 'r-' + r.id : m ? 'me' : 'park'; // a new subject slides in; the same one updates in place
  return `<div class="selw" data-key="sel-${sk}"><div class="sinfo" data-sc="i">${hd}<div class="sdet">${det}</div></div><div class="cmds" data-sc="c">${cm}</div></div>`;
}


