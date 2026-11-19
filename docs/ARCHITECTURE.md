# Lanternfield × SATURN: Architecture Proposal

Nov 19, 2026 · @ISAAC

## What Lanternfield already is

Lanternfield already covers about half of SATURN's core. It has a deterministic real-time simulation, a five-seat chain of command with spending limits, and a countersign workflow that stops anyone signing off their own work. What it lacks is paperwork as real objects, office staff as individual people, and full procurement, finance and save systems.

I read the whole engine (index.html lines 772 to 2886) and most of the interface. I only skimmed the coaching text, the input bindings and the CSS. The file is a build output ("Built by build.js from the files in src/"), so every change belongs in src/, not in index.html.

| SATURN asks for | Lanternfield today | Gap |
| --- | --- | --- |
| Play any position, switch without restarting | `setSeat()` with five seats: technician, supervisor, manager, director, chief executive. The computer plays the rest | Only five seats, all in the maintenance chain. No Finance, Procurement or HR seats |
| Switching never bypasses authority | `LIMIT` per seat ($0, $300, $1,500, $5,000, $20,000). `ask()` climbs to the lowest seat that can say yes, and empty posts pass work upward | Limits cover spending only, not who may approve which document |
| Countersignatures and segregation of duties | Ride reopening: `SO_STEPS` (fit to run, a countersign for safety-critical work, red tags and injuries, then Operations, the inspector or the power coming back). `soSigner()` skips whoever did the work. Send-back, and shared blame for weak job sheets | Hard-coded to this one flow |
| Documents with reference numbers, revisions and audit trail | Job sheet (`writeUp`), morning check sheet and requests exist only as temporary state, cleared each night | No document registry, statuses or history |
| Employees with ID, manager, salary, skills, morale | Crew (technicians, storeman, machinist, supervisors, three managers) are individuals with skills, grade, morale, energy and traits | About 90 office posts (`ORG`) are headcounts with % effects. They aren't individual people and have no reporting line |
| Departments that interact | 15 departments with an effectiveness score. Stores feed jobs. The director can freeze spending | No requests passing between departments as documents |
| Employee AI that makes mistakes | Supervisor dispatch (`supStep`), overnight manager decisions (`aiNight`), boss styles, crew traits, escalation | Maintenance only |
| Procurement and warehouse | 12 stock items, minimum levels, standard and express orders, workshop fabrication | One click buys a part. No requisition, quotes, purchase order, goods received note or invoice |
| Finance | Cash, a daily P&L ledger, a maintenance budget, an overdraft limit, the board's season review | No payables or receivables, no department budgets, no transactions linked to documents |
| Assets and maintenance | 12 rides and 2 substations with health, wear, overhauls, planned services and condition monitoring | Workshop equipment, vehicles and service history aren't tracked |
| QA and HSE | Padlock lockout, morning checks, inspector red tags, injuries, incident review, toolbox talks, the regulator | No permit to work, risk assessment, non-conformance report or audit documents |
| Pause, 1×, 2×, 4× | Pause, ½×, 1×, 2× at 2.5 park minutes a second. Seeded random numbers (`rnd(s)`) | No 4× |
| IndexedDB saves with slots | One localStorage slot, autosave every 5 s, save version 8 with `migrate()` | No slots, no IndexedDB |

## How SATURN fits in

The park, the real-time loop and the crew AI stay as they are. Every approval Lanternfield already has moves onto one document engine, and new departments plug into that same engine. The game you know keeps playing the same way. It just leaves a paper trail, and that trail becomes something you can play with.

| Today in the code | Becomes this document | Who signs (current rules kept) |
| --- | --- | --- |
| Morning check sheet (`REQ.sheet`) | Daily Inspection Checklist | Technicians prepare, the supervisor approves and the gates open |
| Job sheet and reopen sign-off (`r.so`) | Job Completion Report, then Return to Service certificate | Technician signs fit to run. The supervisor or manager countersigns safety-critical work and red tags. Operations accepts |
| Padlocks on a job (`j.pads`) | Permit to Work with an isolation record | Each worker signs on and off their own lock |
| Express part, contractor and overtime requests (`ASK`, `REQ`) | Purchase Requisition, Contractor Work Order, Overtime Authorisation | The amount sets the approver, as now |
| Inspector red tag | Non-Conformance Report | Manager countersigns, inspector closes it |
| Injury and incident review | Incident Report and Corrective Action Report | Director reviews |
| Big decisions (`BIG`) | Capital Expenditure Request | Chief executive up to $20,000, the board above |
| Night report (`rep`) | Daily Operations Report | Filed automatically at closing |

**Stays:** the map, rides, faults, glitches, squalls, Lantern Hour, glow, board confidence, scoring, sound, art and coaching.

**Changes:**

- The five seats become positions in a position tree.
- Office posts become named people.
- One-click part orders become a procurement flow. An emergency path is approved after the fact, so breakdowns still feel urgent.
- Saves move to IndexedDB.

**Added:** a Documents desk, plus Procurement, Finance, HSE and HR work that runs through the same engine.

One open question is the business itself. SATURN's 19-step repair job (customer enquiry through to invoice) has no customer in a theme park. Section 10 gives the options.

## Software architecture

The architecture Lanternfield already has stays. The engine is pure ("pure state in, pure state out; no DOM") and the interface patches its panels in place. New modules slot into the engine beside the existing ones. src/ is still built into one index.html that runs offline, with no framework added.

&#91;embedded content: proposed architecture · interface, engine, storage\]

The outlined boxes are code you already have. The highlighted ones are new, and each new module owns one slice of `S`.

**Rules every module follows:**

- The engine never touches the DOM. The interface never changes `S` directly. It calls an action, which returns true or a reason string, the way `assign()` and `order()` already do.
- One state object, stable IDs and a save version number. Any change to the shape of `S` bumps the version and teaches `migrate()` the step.
- Tuning lives in data files: document types, approval routes, the authority matrix, stock items. Changing a threshold never touches the logic.
- Every button calls a real action. If the action refuses, the button shows the reason, so nothing is decorative.

**Proposed file layout** (I'll match it to your real src/ in Phase 0):

| Layer | Files | Owns |
| --- | --- | --- |
| Engine, existing | `core.js`, `park.js`, `crew.js`, `chain.js`, `stores.js`, `scoring.js` | The step order, clock and `rnd`. Rides, faults, dispatch, limits and asks, stock, the season review |
| Engine, new | `org.js`, `docs.js`, `policies.js`, `approvals.js`, `tasks.js`, `procure.js`, `finance.js`, `assets.js`, `qhse.js`, `commercial.js`, `hr.js` | Positions and people, the document registry, routes, signatures, delegation, and one module per department |
| Interface | `map.js`, `hud.js`, `desk.js`, `seats.js`, `docs.js`, `forms.js` | Drawing, panels and input. Forms are built from each document type's field list |
| Storage | `persist.js` | IndexedDB slots, autosave, import of the old localStorage save |

## Data models

The existing state object `S` stays the single source of truth. New records go into it with stable IDs and plain JSON, so saving, loading and `migrate()` work exactly as they do now. Closed documents move out of `S` into IndexedDB so the live state stays small.

```js
// Position: a chair in the tree, filled or vacant. Today's five seats become five of these.
{ id: 'POS-ENG-SUP', title: 'Maintenance Supervisor', dept: 'eng', level: 's',
  reportsTo: 'POS-ENG-MGR', holder: 'EMP-0006' /* or null when vacant */,
  authority: { spend: { parts: 300, contract: 0, ot: 300 },        // today's LIMIT, split by category
               sign: { PR: 'approve', RTS: 'countersign', PTW: 'check' } } }

// Employee: every person, office staff included
{ id: 'EMP-0006', name: 'Grace', positionId: 'POS-ENG-SUP', dept: 'eng',
  salary: 340, quals: ['Electrical isolation'], skills: { mech: 2 }, grade: 2, xp: 0,
  workload: 0.4, shift: 'early', attendance: { sick: false, leaveUntil: 0 },
  morale: 70, energy: 100, perf: 0.8, traits: ['careful'],
  task: 'TSK-0045', status: 'active' /* or 'leave', 'left' */ }

// Document: one record per form, whatever its type
{ id: 'PR-0031', type: 'PR', rev: 0, dept: 'eng', status: 'under_review',
  at: { day: 3, clock: 612 }, fields: { sku: 'brake', qty: 1, amount: 880, reason: '...' },
  links: { job: 'WO-0102', asset: 'tide', supersedes: null }, attachments: ['QT-0007'],
  sigs: [ { role: 'prepared', emp: 'EMP-0003', pos: 'POS-ENG-TECH', at: 612, byPlayer: true } ],
  history: [ { at: 612, emp: 'EMP-0003', act: 'submit', from: 'draft', to: 'submitted' } ],
  locked: false }

// Approval policy: data, not code, one per document type
{ type: 'PR', steps: [ { role: 'prepared' },
                       { role: 'checked',  by: 'lineManager' },
                       { role: 'approved', by: 'spend.parts >= amount' } ],
  sod: [ ['prepared', 'checked'], ['prepared', 'approved'] ] }

// Task: delegated work
{ id: 'TSK-0045', kind: 'inspect', target: 'tide', assignee: 'EMP-0007', by: 'POS-ENG-SUP',
  due: 900, needs: { skill: 'mech', grade: 2, permit: true },
  state: 'queued' /* doing, blocked, done, failed */, output: 'IR-0019' }

// Ledger entry: every money movement points at its documents
{ id: 'TXN-0880', day: 3, clock: 640, acct: 'AP', amount: -880, dept: 'eng',
  doc: 'PV-0012', match: ['PO-0020', 'GRN-0015', 'INV-0009'] }

// Asset: the rides (already in S.rides) plus workshop equipment and vehicles
{ id: 'tide', kind: 'coaster', cost: 0, bought: 0, health: 74, wear: 3.2,
  pmEvery: 3 /* days */, lastPM: 1, history: ['WO-0102'], downtimeMin: 0 }

// Stock item: today's SKU table plus reservations and movements
{ sku: 'brake', qty: 0, min: 1, reserved: { 'WO-0102': 1 },
  moves: [ { at: 640, qty: 1, doc: 'GRN-0015' } ] }
```

Reference numbers are a type prefix plus a running count per type (`PR-0031`). The counts live in a new `S.refs` (the existing `S.seq` already numbers the radio log), so they survive saves and never repeat.

## Simulation engine

The current loop stays: one `step(S)` is one park minute, driven by an accumulator at 2.5 steps a real second times the speed. 4× is one more button (10 steps a second), and ½× stays.

- **Determinism.** All game randomness already goes through `rnd(s)` on `s.seed`, and traits and styles come from `hashOf()`. Every new module follows the same rule. Randomness that's only for show (guests, particles, sound) stays out of the state, as now.
- **Order inside a step.** The existing order stays, and the new work slots in where it belongs:
  1. Clock and shifts, events and squalls, deliveries, then supplier processing (new)
  2. Rides and faults, logistics, crew
  3. Delegated tasks (new)
  4. Morning checks, planned services, sign-offs
  5. Approval timers and escalation (new, replacing the sign-off timers)
  6. Dispatch, requests, inbox and asks
  7. Ledger postings (new)
- **Office hours.** Paperwork moves only while the office is open (09:00 to 17:30 park time) or while you sit in that position. A requisition raised at 16:00 can miss today, so the timing becomes a real decision.
- **Nights.** They stay the planning desk with the clock stopped. The departments you aren't playing clear their overnight batch, as `aiNight()` does now (payment runs, the reorder, rosters).
- **Speed at 4×.** The step must stay cheap at 10 a second on a phone. Open documents and tasks are indexed by status, each step only touches what's due, and closed records leave `S`.
- **Saving.** Every save carries a version number, bumped from 8 to 9. `migrate()` lifts old saves (today's localStorage save loads straight into slot 1). The game autosaves every 30 park minutes and at closing, and you can also save manually to named slots.

## Employee AI and delegation

This widens what the supervisor's dispatcher already does to every employee. Each person has a task queue. For any task you can do it yourself in their seat (direct control) or hand it to them (delegation).

**A delegated task**, for example "Daniel, inspect the Tidebreaker gearbox and submit an inspection report by 15:00":

1. **Check.** The engine runs the same kind of check `assign()` runs today, and returns either true or a reason: qualified, on shift, under 100% workload, permit in place, part reserved.
2. **Accept or push back.** An overloaded or unsure employee asks for clarification. That arrives in your inbox with a timer, like crew requests do now.
3. **Do it.** Progress per minute comes from grade, traits, energy and morale, using today's `rate()`.
4. **Produce the document.** Quality follows `writeUp()` today. A careful senior writes the cause down every time. A quick apprentice sometimes leaves gaps, which the checker can catch and send back.
5. **Submit.** The document goes into its approval route, and the task closes.

**People aren't perfect:**

- They miss deadlines when they're overloaded.
- They make errors in documents, which a careful checker catches.
- They report unsafe conditions, which raises an HSE document.
- They call in sick when morale is low, take leave, and quit below 10 morale (as now).

**Managers watch their people.** Every 30 park minutes each computer manager checks its direct reports. An overdue task gets a reminder first, then gets reassigned or escalated with today's `escalate()`. Bosses keep their seeded styles (cautious, firefighter, micromanager, by the book).

**Direct control** is today's technician seat, made general. Take any position and that person's queue becomes your inbox, and their computer side stops. Office tasks (enter an invoice, compare three quotes, fill a checklist) open as forms you fill in. The default values are pre-filled where the person would know them.

## Document and approval engine

One engine runs every document. A document's type names its approval route, and the engine checks every signature the same way. The route is data, so a threshold or an extra step is a table edit, not new code.

&#91;embedded content: document lifecycle · 8 statuses\]

A returned document comes back as a new revision for its preparer. A rejected one is closed with its reason, and an approved one can only change through a newer revision that supersedes it.

**At every signature the engine checks four things:**

1. **Authority.** The signer's position holds this right for this document type. For spending, its limit covers the amount (today's `LIMIT` and `band()`).
2. **Order.** Steps are signed in sequence, so a later signer can't jump ahead.
3. **Segregation of duties.** The route names which roles must be different people. The engine compares employees, and also whether you, the player, signed in another seat. If you did, the computer holder signs instead, just as `soSigner()` does today when the supervisor has been on the tools.
4. **Line of command.** A step marked "line manager" must be signed by whoever the preparer reports to. A vacant post passes the step up the chain (today's `handler()`).

Each step has a signing window, 10 park minutes as today. If it's missed, the step goes one seat up and counts against the seat that missed it (`soEsc()` and `escalate()` now). After the final approval the fields freeze. The history only ever grows: who signed, from which position, when, what changed, and the reason for any return or rejection.

**Proposed default routes** (all thresholds editable in one table):

| Document | Route: prepared → checked → approved → authorised |
| --- | --- |
| Purchase Requisition | Requester → line manager → approver by amount: supervisor to $300, manager to $1,500, director to $5,000, chief executive to $20,000, the board above |
| Purchase Order | Buyer → procurement manager → same amount bands → finance confirms the budget |
| Goods Received Note | Storeman → store supervisor |
| Payment Voucher | Accounts payable clerk → accountant (three-way match) → finance manager by amount → finance director over $5,000 |
| Return to Service | Technician → supervisor for safety-critical work → manager after a red tag, director after an injury → Operations accepts |
| Permit to Work | Technician → supervisor → HSE manager for high-risk work |
| Incident Report | Supervisor → HSE manager → director |

## Development phases

There are ten phases. Each is small enough to test in an evening, and each ends with the same handover:

- what changed
- the files touched
- how to build and run it
- a testing checklist

Then I wait for your go-ahead. Phase 2 comes before any new department on purpose: it rebuilds a flow that already works, so if the engine is wrong, it shows straight away.

| Phase | Delivers | Proves | Main files (proposed) |
| --- | --- | --- | --- |
| 0. Baseline | src/ in place, build and tests running, 4× speed, the architecture document and development log started | Nothing broke | `build.js`, `src/ui/hud.js`, `docs/ARCHITECTURE.md`, `docs/DEVLOG.md` |
| 1. Saves | IndexedDB with multiple slots, manual saves, autosaves and timestamps. Today's localStorage save is imported | A season survives a reload, and old saves still load | `src/persist.js`, `migrate()` |
| 2. Documents and approvals | Document registry, approval engine and the Documents desk. Ride reopening and the morning check sheet run through it under the same rules | The engine reproduces current behaviour exactly | `src/engine/docs.js`, `approvals.js`, `policies.js`, `src/ui/docs.js` |
| 3. Positions and people | Position tree, named office staff, the authority matrix, switching to any position, segregation of duties across seats | Switching seats never gets round authority | `src/engine/org.js`, `src/ui/seats.js` |
| 4. Procurement and warehouse | Requisition, quotes, comparison, purchase order, delivery, goods received note and invoice. Reservations for jobs, plus an emergency purchase path | A breakdown still gets its part fast, and leaves a full paper trail | `procure.js`, `stores.js` |
| 5. Finance | A ledger linked to documents, payables and receivables, department budgets, payment vouchers, three-way matching, configurable thresholds | Every dollar traces back to a document | `finance.js` |
| 6. Delegation and office AI | Task queues for every employee, work quality and errors, requests for clarification, managers monitoring their staff | Delegated work produces documents a checker can catch problems in | `tasks.js`, `src/engine/ai/` |
| 7. Assets and maintenance | An asset register including workshop equipment and vehicles. Preventive maintenance schedules, maintenance work orders, downtime | Skipping preventive maintenance leads to breakdowns | `assets.js` |
| 8. Quality and HSE | Permit to work (built on the padlocks), risk assessments, non-conformance and corrective action reports, audits, training records | You can't skip safety steps to save time | `qhse.js` |
| 9. Commercial and HR | Customer bookings and contracts, invoices to customers, leave, appraisals, recruitment paperwork | Customers and staff react to what actually happened | `commercial.js`, `hr.js` |

## Risks and dependencies

The biggest risk is that paperwork drowns out the real-time play that makes Lanternfield fun. The design guards against that by delegating by default and capping your inbox.

| Risk | Why it matters | How we handle it |
| --- | --- | --- |
| Paperwork slows the game to a crawl | A breakdown has an 8-minute fast-response window; a form you have to fill in breaks that | Only documents that need your seat reach you. The inbox cap of 3 stays. Computer staff fill the rest, and emergency paths are approved after the fact |
| I only have the built file | index.html is generated from src/ by build.js. Editing it directly would be overwritten | Phase 0 starts from your src/, build.js and tests |
| Speed at 4× on a phone | 10 steps a second over hundreds of open records | Records indexed by status, only due items touched per step, closed records moved out of `S`. Your existing perf test (`tests/browser/perf.js`) gets a 4× case |
| Save size | A season creates thousands of documents, and localStorage stops at about 5 MB | IndexedDB from Phase 1, with closed documents stored separately |
| Determinism slips | New AI that uses `Math.random()` would make seasons unrepeatable | All game randomness goes through `rnd(s)`. A test replays a seed twice and compares the results |
| Balance shifts | Difficulty, limits and costs are tuned to today's flows | Phase 2 must reproduce current outcomes exactly. Later phases log any tuning changes in the development log |
| The setting doesn't match | SATURN's scenario is a marine repair firm. Lanternfield is a theme park | Decided below |
| Same player, two seats | You could prepare a requisition as the technician, then approve it as the manager | Segregation of duties tracks the employee and whether you, the player, signed. In that case the computer holder of the approving seat signs instead |

## Decisions needed before coding

- [ ] **Source files.** Send the src/ folder, build.js and the tests (a zip is fine), or connect the folder through the Claude desktop app.
- [ ] **The business.** Choose one: (a) the park stays as it is, and the customer side is corporate bookings, group sales and sponsorship contracts, or (b) Lanternfield also runs an engineering services workshop that takes outside repair jobs. Option (b) brings in SATURN's 19-step repair workflow.
- [ ] **Season length.** Keep the 14-day season with a board review, or make it open-ended?
- [ ] **Which positions you can play.** All of them (about 90), or a key chair in each department (about 15) with the rest played by the computer? I recommend the key chairs.
- [ ] **Speeds.** Keep ½× alongside the new 4×?
- [ ] **Currency.** Keep $ or switch to S$?
- [ ] **How deep the forms go.** Every field fillable, or the key fields with the rest pre-filled? I recommend pre-filled defaults you can correct.
