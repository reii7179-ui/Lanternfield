/* ---------- the seats: what each job is in this game and in real life ---------- */
const ROLE = {
  tech: { lvl: 'Individual contributor', title: 'Technician', short: 'Technician',
    line: 'Do the hands-on work: get to the fault, lock it out, find the cause and fix it.',
    game: 'You control one person. The supervisor sends you work orders with a timer. At the ride you lock it out and pick the cause from what you can see. You cannot send anyone else, buy parts or call a contractor: you ask.',
    life: 'Starts the shift with a toolbox talk and the daily checks on every ride before the gates open. Work orders come through the maintenance system or over the radio. Finds the cause, fixes it properly, and writes up what was found and which parts were used. Every person puts their own padlock on the isolator before touching a machine.',
    reports: 'Maintenance Supervisor', manages: 'Nobody',
    alone: ['How to find the cause and carry out the repair', 'Locking out and tagging a ride before touching it', 'Stopping any job that is not safe'],
    recommends: ['Patch or full repair', 'Which parts are needed', 'When a ride needs a service', 'When they need a second pair of hands'],
    approves: 'Nothing that costs money. Draws parts from stores.', hiring: 'None. Sometimes shows a candidate round the workshop.',
    judged: ['First-time fix rate', 'Working safely, every time', 'Answering work orders quickly', 'Repairs that stay fixed'],
    mistakes: 'Skipping the lockout to save two minutes. Guessing at the cause instead of checking. Going quiet instead of asking for help.' },
  sup: { lvl: 'First-line manager', title: 'Maintenance Supervisor', short: 'Supervisor',
    line: 'Run the shift: turn faults into jobs and put the right person on each one.',
    game: 'You command the whole crew in real time. The crew ask you for help, parts and overtime, each with a timer. Anything over $300, like a contractor, has to go up to the manager.',
    life: 'Spends the shift on the floor and on the radio: assigning work orders, chasing parts, checking jobs are done safely and properly, covering absences and handing over to the next shift. Usually promoted from the best technician, and the hardest part is to stop doing the repairs yourself.',
    reports: 'Engineering Manager', manages: 'The technicians, storeman and machinist on the shift',
    alone: ['Who does which job, and in what order', 'Patch or full repair, within the manager\'s rules', 'Holding someone on overtime today', 'Small express parts, up to $300'],
    recommends: ['Hiring and training', 'Discipline', 'Contractors and anything over $300'],
    approves: 'Overtime on the day, shift swaps, spending up to $300.', hiring: 'Interviews and recommends. The manager decides.',
    judged: ['Response time to faults', 'Uptime on the shift', 'Jobs finished quickly', 'Overtime spend and crew safety'],
    mistakes: 'Picking up a spanner and leaving nobody running the shift. Sending the nearest person instead of the right one. Saying yes to every overtime request.' },
  mgr: { lvl: 'Middle manager', title: 'Engineering Manager', short: 'Manager',
    line: 'Run the department: people, budget, rosters, parts and the rules the supervisor works to.',
    game: 'The supervisor dispatches the crew. You approve contractors and express parts up to $1,500, keep the day on budget, talk to people whose morale is slipping and set the dispatch rules. After 17:00, with no late supervisor, the crew come straight to you. At the desk you set the roster, hire crew and stock the stores.',
    life: 'Works through other people: one-to-ones, budget reviews, planning next week\'s services, approving spending and recruiting. Decides how much work is planned prevention and how much is waiting for breakdowns. If the manager is out fixing rides, nobody is managing.',
    reports: 'Operations Director', manages: 'Supervisors, and through them the crew. Dotted line to stores.',
    alone: ['Rosters and shifts', 'Hiring and training technicians and supervisors', 'Stock levels and the parts policy', 'Contractors and express parts up to $1,500'],
    recommends: ['Projects and overhauls', 'A bigger budget', 'New posts in the department'],
    approves: 'Supervisor requests up to $1,500, overtime and training.', hiring: 'Decides for technicians and supervisors.',
    judged: ['Uptime', 'Staying on budget', 'Crew morale and staff turnover', 'Safety record'],
    mistakes: 'Doing the supervisor\'s job and going over their head. Ignoring the budget until the month is gone. Letting one person carry a whole trade.' },
  dir: { lvl: 'Senior manager', title: 'Operations Director', short: 'Director',
    line: 'Own the whole function that keeps the park running, across departments.',
    game: 'You set the day\'s priority and the maintenance budget, settle disputes between Operations and Engineering, and approve spending up to $5,000. At the desk you approve projects and overhauls and hire managers for operations, engineering and stores.',
    life: 'Lives in meetings, reports and decisions between good options that compete: keep the ride open for the VIP, or close it for a service. Sets targets and budgets for managers, then holds them to account. Spots problems early in the numbers rather than by walking the floor.',
    reports: 'Chief Executive', manages: 'The Engineering, Operations and Stores managers',
    alone: ['Department budgets and targets', 'The priority: uptime, cost or safety', 'Projects and overhauls up to $5,000', 'Hiring managers in operations, engineering and stores'],
    recommends: ['Big investments', 'New departments', 'Executive hires'],
    approves: 'Manager requests up to $5,000, and overspends.', hiring: 'Decides for managers in the function.',
    judged: ['Uptime against target', 'Cost against budget', 'Departments working together', 'Decisions made on time'],
    mistakes: 'Changing the priority every hour. Approving every overspend. Settling a dispute so slowly that the VIP arrives first.' },
  ceo: { lvl: 'Executive', title: 'Chief Executive', short: 'CEO',
    line: 'Own the result of the whole company: strategy, money, the board and the top team.',
    game: 'You handle the board, the press, sponsors and anything nobody below you can decide, which is a lot while posts are empty. At the desk you hire across all fifteen departments, approve any project and deal with the shareholders.',
    life: 'Mostly talks: to the board, investors, the press, big customers and the executive team. Decides what the company is for this year and who runs each part of it. Rarely touches day-to-day operations, and when they do, it undercuts the managers whose job it is.',
    reports: 'The board (Rosalind Teo, chair)', manages: 'Directors and executives',
    alone: ['Strategy and the shape of the organisation', 'Any spend, though very large ones go to the board', 'Hiring executives and directors'],
    recommends: ['Loans and big investments, to the board', 'The yearly plan'],
    approves: 'Anything the directors cannot.', hiring: 'Decides for executives and directors.',
    judged: ['Profit', 'Reputation with guests', 'The board\'s confidence'],
    mistakes: 'Telling the board what it wants to hear. Leaving key posts empty so everything lands on your desk. Running the shift from the boardroom.' },
};
const KIND = { op: ['Operational', 'A daily call. Follow the procedure, use what experience tells you, stay alert.'], tac: ['Tactical', 'Turns the direction into action. Check it against the priority.'], str: ['Strategic', 'Long-term and hard to undo. It touches staff, guests, suppliers and neighbours.'] };
const DEC = {
  tech: ['op', 'This job, this shift', 'Small for the company, real for your own hands. Routine is the danger: the hundredth lockout is the one people skip.', 'The procedure gets you to the cause reliably. Experience gets you there faster, by noticing things the procedure never mentions.', 'At a fault you can check the procedure (3 minutes, rules one cause out) or go with your gut. Senior people get a gut feeling that is right about 85% of the time; apprentices earn one by finding causes first time. The more routine the day, the riskier a skipped lockout.'],
  sup: ['op', 'This shift', 'Each call is small, but there are dozens a day and they add up. A crew on autopilot gets hurt.', 'Decide fast inside the rules the manager set, and keep people awake to the job in front of them.', 'Crew alertness drops with every routine job. Stop them for a toolbox talk before it gets low, or someone gets hurt. Your calls on missing parts are checked against the day\'s priority.'],
  mgr: ['tac', 'This week', 'Medium. The risk is effort spent on things the company is not trying to do.', 'Take the director\'s priority and turn it into rules and approvals the supervisor can act on without asking.', 'Each approval is checked against today\'s priority, and so are your rules for the supervisor. Three calls against the priority in a day and the board notices.'],
  dir: ['tac', 'This month and this season', 'High. Your priority steers every manager below you.', 'Translate the company strategy into a priority and a budget, and hold to it unless the facts change.', 'Set a priority that differs from the chief executive\'s strategy and the board marks it down each day. Your approvals are checked against the priority you set yourself.'],
  ceo: ['str', 'The season and beyond', 'Very high, and slow to show. Results arrive days after the decision.', 'Gather the figures when there is time, decide on judgement when there is not, and look at how staff, guests, suppliers and neighbours affect each other.', 'You choose the company strategy. Strategic questions arrive through the season: a supplier deal, a neighbours\' complaint, a pay claim, ticket prices. You can ask for the figures, which costs time. Some consequences only arrive days later.'],
};
const OWN = { roster: 'mgr', policy: 'mgr', stock: 'mgr', perk: 'dir', ovh: 'dir', focus: 'dir', budget: 'dir', crowd: 'dir', org: 'ceo', board: 'ceo', callin: 'sup', rush: 'mgr', agency: 'dir', vouch: 'ceo', svc: 'dir', fastlane: 'dir', happy: 'ceo', brief: 'ceo' };
const may = k => L.RANK[S.seat] >= L.RANK[OWN[k]];
const canSpend = c => c <= L.LIMIT[S.seat];
const lc = t => t.replace(/^The /, 'the ');
const askWho = (min, cost) => lc(L.holder(S, L.decider(S, min, cost || 0).x));
const isMe = c => S.seat === 'tech' && c && c.id === S.me;
const seatTitle = x => x === 'tech' && L.staff(S, S.me) ? L.staff(S, S.me).name : ROLE[x].short;
const ASKTXT = { help: o => `a second pair of hands on ${L.ride(S, o.rid).short}`, patch: o => `permission to patch ${L.ride(S, o.rid).short}`, express: o => `an express ${L.SKU[o.sku][0].toLowerCase()}`, callout: o => `a contractor for ${L.ride(S, o.rid).short}`, stay: () => 'staying on overtime', service: o => `a service on ${L.ride(S, o.rid).short}`, crowd: () => 'buskers and ice cream', hire: o => `a new ${(L.JOBTITLE[o.tr] || o.tr).toLowerCase()}`, perk: o => L.PERKS[o.k][0].toLowerCase(), ovh: o => `an overhaul of ${L.ride(S, o.rid).short}`, org: o => `a ${L.ORGX[o.id][1]}`, ot: o => `overtime for ${o.tids.length > 1 ? o.tids.length + ' people' : 'one person'} (${fmtMoney(o.cost)})` };

