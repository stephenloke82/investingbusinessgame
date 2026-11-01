// The game loop: creating a new game and advancing one month at a time.

import type { GameState, MonthSnapshot, YearAccumulator, YearSummary } from '../types';
import { BACKGROUND_BY_ID, BACKGROUNDS } from '../data/backgrounds';
import { CAREER_BY_ID } from '../data/careers';
import { ACHIEVEMENTS } from '../data/achievements';
import { GAME_CONFIG } from '../config';
import { TAX, LIFESTYLE_OPTIONS, TRANSPORT_OPTIONS } from '../data/life';
import { Rng, randomSeed } from './rng';
import { ETF_BY_TICKER, initMarket, SP500, spDrawdown, stepMarket } from './market';
import { buy, contributionRoom, emptyAccount, investmentsValue, payDividends, recordInvestFlow } from './portfolio';
import {
  amortizedPayment,
  borrowOnCredit,
  creditDebt,
  emptyFlow,
  householdSize,
  incomeTax,
  livingCosts,
  monthlyEssentials,
  newDebtId,
  payrollTax,
  serviceDebts,
  totalDebt,
  totalLiving,
  updateHome,
  RENT_BY_ID,
  HOME_BY_ID,
} from './finance';
import { careerMonth, DEGREE, monthlyPay, newCareer } from './career';
import { businessMonth, businessesValue } from './business';
import { autoChoice, drawEvent, resolveEvent } from './events';
import { age, calendar, emergencyMonths, fiProgress, netWorth, savingsRate, shadowValue, stockShare } from './metrics';
import { homeEquity } from './finance';

export const SAVE_VERSION = 1;

export interface NewGameOptions {
  name: string;
  backgroundId: string;
  trackId: string;
  seed?: number;
  retireAge?: number;
}

function emptyYear(state: Pick<GameState, 'market'> & { history?: MonthSnapshot[] }, nw: number, invest: number): YearAccumulator {
  const tr = state.market.spTotalReturn;
  return {
    grossIncome: 0, salaryIncome: 0, businessIncome: 0, investmentIncome: 0, taxes: 0, expenses: 0, saved: 0,
    netWorthStart: nw, investStart: invest, contributions: 0, spStart: tr[tr.length - 1], cpiStart: state.market.cpi,
    highlights: [], achievements: [],
  };
}

export function newGame(opts: NewGameOptions): GameState {
  const seed = opts.seed ?? randomSeed();
  const bg = BACKGROUND_BY_ID[opts.backgroundId] ?? BACKGROUNDS[1];
  const rng = new Rng(seed);
  let trackId = opts.trackId in CAREER_BY_ID ? opts.trackId : 'retail';
  if (CAREER_BY_ID[trackId].requiresDegree && !bg.hasDegree) trackId = 'retail';
  const market = initMarket(seed, GAME_CONFIG.startYear);
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngLife: (seed * 2654435761) >>> 0,
    rngMarket: (seed ^ 0x9e3779b9) >>> 0,
    month: 0,
    startYear: GAME_CONFIG.startYear,
    startAge: bg.startAge,
    retireAge: opts.retireAge ?? GAME_CONFIG.retireAge,
    name: opts.name.trim() || 'Player',
    backgroundId: bg.id,
    difficulty: bg.difficulty,
    cash: bg.cash,
    accounts: { taxable: emptyAccount('taxable'), k401: emptyAccount('k401'), roth: emptyAccount('roth') },
    debts: [],
    budget: {
      housing: bg.housing,
      transport: bg.transport,
      lifestyle: bg.lifestyle,
      insurance: { health: false, renters: false, disability: false, life: false, umbrella: false },
      k401Pct: 0,
      k401Fund: 'VOO',
      extraDebtPayment: 0,
      emergencyMonths: 3,
      autoInvest: [],
      sweepSymbol: '',
      sweepAccount: 'taxable',
      drip: true,
    },
    career: newCareer(trackId, bg.skill, bg.hasDegree, rng, bg.startLevel),
    businesses: [],
    family: { married: bg.married, spouseIncome: bg.spouseIncome, kids: bg.kids.map((y) => y * 12), pets: 0 },
    stress: 30,
    happiness: 60,
    health: 85,
    flags: bg.hasDegree ? ['degree'] : [],
    market,
    shadowShares: 0,
    history: [],
    years: [],
    year: emptyYear({ market }, 0, 0),
    log: [],
    eventHistory: {},
    achievements: {},
    lastFlow: emptyFlow(),
    settings: { voiceOn: false, voiceName: '', voiceRate: 1, pauseOnAllEvents: false, showTutorial: true },
    tutorialStep: 0,
    gameOver: false,
    retiredEarly: false,
    stats: {
      stockTrades: 0, fundTrades: 0, panicSells: 0, crashesHeld: 0, maxDrawdownSeen: 0, peakInvestments: 0,
      monthsWithCreditDebt: 0, promotions: 0, jobChanges: 0, businessesStarted: 0, businessesSold: 0,
      lastStockTrades: 0, crashPanicBaseline: -1, autoDecisions: 0,
    },
  };
  state.rngLife = rng.state;
  if (bg.studentLoan > 0)
    state.debts.push({ id: newDebtId(state, 'student'), kind: 'student', label: 'Student loan (6.0%)', balance: bg.studentLoan, rate: 0.06, minPayment: amortizedPayment(bg.studentLoan, 0.06, 120) });
  if (bg.creditCard > 0) borrowOnCredit(state, bg.creditCard);
  const nw = netWorth(state);
  state.year = emptyYear(state, nw, 0);
  state.log.push({ month: 0, text: `${state.name} starts out as a ${CAREER_BY_ID[trackId].levels[0].title} at ${state.career.employer}.`, kind: 'info' });
  return state;
}

export interface TurnResult {
  messages: string[];
  yearSummary?: YearSummary;
}

function clamp(x: number) {
  return Math.max(0, Math.min(100, x));
}

function log(state: GameState, text: string, kind: 'info' | 'good' | 'bad' | 'event' = 'info') {
  state.log.push({ month: state.month, text, kind });
  if (state.log.length > 400) state.log.splice(0, state.log.length - 400);
}

/** Advance the game by one month. Does nothing while an event is waiting for a decision. */
export function advanceMonth(state: GameState): TurnResult {
  if (state.gameOver || state.pendingEvent) return { messages: [] };
  const lifeRng = new Rng(state.rngLife);
  const mktRng = new Rng(state.rngMarket);
  const msgs: string[] = [];
  const investBefore = investmentsValue(state);
  const flowsBefore = state.year.contributions;

  state.month++;
  state.pendingYearSummary = undefined;
  const mres = stepMarket(state.market, mktRng, state.month, state.startYear);
  updateHome(state);
  // The S&P-only shadow portfolio reinvests its dividends.
  state.shadowShares *= 1 + (ETF_BY_TICKER[SP500].dividendYield / 100) / 12;

  // Family ages
  state.family.kids = state.family.kids.map((k) => k + 1);
  const grownUp = state.family.kids.filter((k) => k === 18 * 12).length;
  if (grownUp) msgs.push('A child turned 18 and is heading out into the world. Their costs leave your budget.');

  // Career & business
  msgs.push(...careerMonth(state, lifeRng));
  const biz = businessMonth(state, lifeRng);
  msgs.push(...biz.msgs);

  const cpi = state.market.cpi;
  const flow = emptyFlow();
  const pay = monthlyPay(state);
  flow.salary = pay.wages + pay.benefits;
  flow.spouse = state.family.spouseIncome / 12;
  flow.business = biz.draws;
  const div = payDividends(state);
  flow.dividends = div.taxableCash;
  if (div.taxableCash > 0) recordInvestFlow(state, -div.taxableCash);
  flow.interest = (Math.max(0, state.cash) * state.market.cashRate) / 12;
  // Spouse income grows with inflation
  state.family.spouseIncome *= 1 + state.market.inflation / 12;

  // 401(k): your contribution plus the employer match go straight into the plan fund.
  let k401 = 0;
  let match = 0;
  if (pay.wages > 0) {
    k401 = Math.min((pay.wages * state.budget.k401Pct) / 100, contributionRoom(state, 'k401'));
    const matchPct = Math.min(state.budget.k401Pct, CAREER_BY_ID[state.career.trackId].match401k);
    match = (pay.wages * matchPct) / 100;
    if (k401 + match > 0) {
      const acct = state.accounts.k401;
      acct.cash += k401 + match;
      acct.contributedThisYear += k401;
      recordInvestFlow(state, k401 + match);
      const fund = ETF_BY_TICKER[state.budget.k401Fund]?.in401k ? state.budget.k401Fund : 'VOO';
      buy(state, fund, 'k401', acct.cash, { fromAccountCash: true, silent: true });
    }
  }
  flow.k401 = k401;

  // Taxes (annualised each month)
  const ordinaryAnnual = (pay.wages - k401 + pay.benefits + flow.spouse + biz.draws + flow.interest) * 12;
  const incomeT = incomeTax(ordinaryAnnual, cpi, state.family.married) / 12;
  const payroll = (payrollTax(pay.wages * 12, cpi) + payrollTax(flow.spouse * 12, cpi)) / 12 + biz.draws * 0.141;
  const divTax = div.taxableTotal * TAX.qualifiedDividendRate;
  flow.taxes = incomeT + payroll + divTax;

  // Living costs
  const costs = livingCosts(state);
  Object.assign(flow, costs);
  if (state.career.degreeProgress) flow.education = DEGREE.monthlyCost * cpi;

  const income = flow.salary + flow.spouse + flow.business + flow.dividends + flow.interest;
  state.cash += income - flow.taxes - k401 - totalLiving(costs) - flow.education;

  // Debts: minimums plus any extra payment, highest interest first.
  const debtRes = serviceDebts(state, Math.max(0, state.cash) + 1e9, state.budget.extraDebtPayment * cpi > 0 ? Math.min(state.budget.extraDebtPayment * cpi, Math.max(0, state.cash - (monthlyEssentials(state) * 0.5))) : 0);
  flow.debtPayments = debtRes.paid;
  state.cash -= debtRes.paid;

  // Automatic investing (dollar-cost averaging)
  let autoInvested = 0;
  const floor = monthlyEssentials(state) * 0.5;
  for (const rule of state.budget.autoInvest) {
    let amt = rule.amount * cpi;
    if (rule.account === 'roth') amt = Math.min(amt, contributionRoom(state, 'roth'));
    if (amt < 1) continue;
    if (state.cash - amt < floor) {
      if (state.month % 6 === 0) msgs.push(`Auto-invest into ${rule.symbol} was skipped: not enough spare cash.`);
      continue;
    }
    const r = buy(state, rule.symbol, rule.account, amt, { silent: true });
    if (r.ok) autoInvested += amt;
  }
  // Sweep: invest cash above the emergency fund target
  if (state.budget.sweepSymbol) {
    const target = monthlyEssentials(state) * state.budget.emergencyMonths;
    let excess = state.cash - target;
    if (state.budget.sweepAccount === 'roth') excess = Math.min(excess, contributionRoom(state, 'roth'));
    if (excess > 50 * cpi && creditDebt(state) <= 0) {
      const r = buy(state, state.budget.sweepSymbol, state.budget.sweepAccount, excess, { silent: true });
      if (r.ok) autoInvested += excess;
    }
  }
  flow.invested = autoInvested + k401;

  if (state.cash < 0) {
    const short = -state.cash;
    state.cash = 0;
    borrowOnCredit(state, short);
    msgs.push(`You were $${Math.round(short).toLocaleString()} short this month, so it went on your credit card at ${Math.round(24)}% interest.`);
  }
  if (creditDebt(state) > 0) state.stats.monthsWithCreditDebt++;

  const spending = totalLiving(costs) + flow.education + debtRes.interest;
  const grossIncome = income + k401 + match;
  flow.leftover = income - flow.taxes - k401 - totalLiving(costs) - flow.education - debtRes.paid - autoInvested;
  state.lastFlow = flow;

  // Wellbeing
  updateWellbeing(state, lifeRng, investBefore, state.year.contributions - flowsBefore);

  // Year accumulators
  const y = state.year;
  y.grossIncome += grossIncome;
  y.salaryIncome += flow.salary;
  y.businessIncome += flow.business;
  y.investmentIncome += div.total + flow.interest;
  y.taxes += flow.taxes;
  y.expenses += spending;
  y.saved += grossIncome - flow.taxes - spending;

  // Crash bookkeeping (for the "held through a crash" lesson)
  const inv = investmentsValue(state);
  state.stats.peakInvestments = Math.max(state.stats.peakInvestments, inv);
  state.stats.maxDrawdownSeen = Math.max(state.stats.maxDrawdownSeen, spDrawdown(state.market));
  if (state.market.regime === 'crash' && state.stats.crashPanicBaseline < 0 && inv > 1000) state.stats.crashPanicBaseline = state.stats.panicSells;
  if (state.market.regime !== 'crash' && state.market.regime !== 'bear' && state.stats.crashPanicBaseline >= 0) {
    if (state.stats.panicSells === state.stats.crashPanicBaseline && investmentsValue(state) > 1000) {
      state.stats.crashesHeld++;
      msgs.push('You held on through the market crash. Investors who stay the course are the ones who collect the recovery.');
    }
    state.stats.crashPanicBaseline = -1;
  }
  state.stats.lastStockTrades = state.stats.stockTrades;

  // Snapshot
  const snap: MonthSnapshot = {
    month: state.month,
    netWorth: Math.round(netWorth(state)),
    cash: Math.round(state.cash),
    investments: Math.round(inv),
    shadowSp: Math.round(shadowValue(state)),
    homeEquity: Math.round(homeEquity(state)),
    businessValue: Math.round(businessesValue(state)),
    debt: Math.round(totalDebt(state)),
    grossIncome: Math.round(grossIncome),
    expenses: Math.round(spending),
    taxes: Math.round(flow.taxes),
    saved: Math.round(grossIncome - flow.taxes - spending),
    stress: Math.round(state.stress),
    happiness: Math.round(state.happiness),
    spIndex: state.market.spTotalReturn[state.market.spTotalReturn.length - 1],
  };
  state.history.push(snap);

  // Big market news worth mentioning
  if (mres.marketReturn < -0.08) msgs.push('Ouch: the stock market had a very bad month. Remember: you only lose money in a crash if you sell.');

  // Achievements
  const newAch = checkAchievements(state);
  for (const a of newAch) msgs.push(`Achievement unlocked: ${a}`);

  for (const m of msgs) log(state, m, /lost|short|laid off|plunge|skipped|could not/i.test(m) ? 'bad' : /Achievement|Promoted|first profitable|earned|graduated|Job found|held on/i.test(m) ? 'good' : 'info');

  // Year end
  let yearSummary: YearSummary | undefined;
  if (state.month % 12 === 0) {
    yearSummary = closeYear(state);
    state.pendingYearSummary = yearSummary;
  }

  // End of career?
  if (age(state) >= state.retireAge - 1e-9) {
    state.gameOver = true;
    log(state, `${state.name} retires at ${Math.floor(age(state))}. Time to see the report card!`, 'good');
  } else if (lifeRng.chance(GAME_CONFIG.eventsPerMonth)) {
    state.pendingEvent = drawEvent(state, lifeRng);
  }

  state.rngLife = lifeRng.state;
  state.rngMarket = mktRng.state;
  return { messages: msgs, yearSummary };
}

function updateWellbeing(state: GameState, rng: Rng, investBefore: number, netFlow: number) {
  const c = state.career;
  let stress = 22;
  if (c.employed && !c.onLeave) stress += { coast: -6, steady: 0, hustle: 14 }[c.effort];
  if (!c.employed && c.searching) stress += 14;
  for (const b of state.businesses) {
    if (b.involvement === 'hands-off') stress += 2;
    else if (b.involvement === 'part-time') stress += c.employed ? 10 : 5;
    else stress += c.employed ? 22 : 9;
    if (b.monthsLosing >= 3) stress += 5;
  }
  if (c.studying) stress += 5;
  if (c.degreeProgress) stress += 8;
  const em = emergencyMonths(state);
  stress += em < 1 ? 12 : em < 3 ? 5 : em >= 6 ? -4 : 0;
  const monthlyIncome = Math.max(1500 * state.market.cpi, (c.salary + state.family.spouseIncome) / 12);
  stress += Math.min(15, (creditDebt(state) / monthlyIncome) * 4);
  // Investing stress: big drops in concentrated, single-stock portfolios are the hardest to live with.
  const inv = investmentsValue(state);
  if (inv > 500) {
    const share = stockShare(state);
    const ret = investBefore > 0 ? (inv - netFlow - investBefore) / investBefore : 0;
    stress += share * 10;
    if (ret < 0) stress += -ret * 100 * (0.25 + share * 1.2);
    const trades = state.stats.stockTrades - state.stats.lastStockTrades;
    stress += Math.min(10, trades * 1.5);
  }
  stress += Math.min(9, state.family.kids.filter((k) => k < 18 * 12).length * 3);
  if (state.family.married) stress -= 4;
  if (state.family.pets) stress -= 2;
  if (state.health < 40) stress += 6;
  state.stress = clamp(state.stress + (stress - state.stress) * 0.25 + rng.normal() * 1.2);

  const ls = LIFESTYLE_OPTIONS.find((l) => l.id === state.budget.lifestyle);
  const housingHappy = state.home ? HOME_BY_ID[state.budget.housing]?.happiness ?? 5 : RENT_BY_ID[state.budget.housing]?.happiness ?? 0;
  const fits = state.home ? HOME_BY_ID[state.budget.housing]?.fits ?? 4 : RENT_BY_ID[state.budget.housing]?.fits ?? 2;
  const tr = TRANSPORT_OPTIONS.find((t) => t.id === state.budget.transport);
  let happy = 55 + (ls?.happiness ?? 0) + housingHappy + (tr?.happiness ?? 0);
  if (state.family.married) happy += 8;
  happy += Math.min(2, state.family.kids.length) * 4;
  if (state.family.pets) happy += 2;
  if (householdSize(state) > fits) happy -= 8;
  if (!c.employed && state.businesses.length === 0) happy -= 6;
  happy -= Math.max(0, state.stress - 45) * 0.5;
  if (fiProgress(state) >= 1) happy += 5;
  state.happiness = clamp(state.happiness + (happy - state.happiness) * 0.12);

  const a = age(state);
  const healthTarget = 88 - Math.max(0, a - 40) * 0.45 - Math.max(0, state.stress - 60) * 0.9;
  state.health = clamp(state.health + (healthTarget - state.health) * 0.05 + (c.onLeave ? 1.5 : 0));
}

function achievementCtx(state: GameState) {
  const cpi = state.market.cpi;
  return {
    netWorthReal: netWorth(state) / cpi,
    investmentsReal: investmentsValue(state) / cpi,
    emergencyMonths: emergencyMonths(state),
    fiProgress: fiProgress(state),
    savingsRate: savingsRate(state),
    totalDebt: totalDebt(state),
    creditDebt: creditDebt(state),
    stockShare: stockShare(state),
  };
}

export function checkAchievements(state: GameState): string[] {
  const ctx = achievementCtx(state);
  const out: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id] !== undefined) continue;
    if (a.check(state, ctx)) {
      state.achievements[a.id] = state.month;
      state.year.achievements.push(a.title);
      out.push(`${a.icon} ${a.title}`);
    }
  }
  return out;
}

function closeYear(state: GameState): YearSummary {
  const y = state.year;
  const cal = calendar(state);
  const inv = investmentsValue(state);
  const nw = netWorth(state);
  const denom = y.investStart + y.contributions / 2;
  const portfolioReturn = denom > 100 ? (inv - y.investStart - y.contributions) / denom : 0;
  const tr = state.market.spTotalReturn;
  const afterTax = y.grossIncome - y.taxes;
  const summary: YearSummary = {
    year: cal.year,
    age: Math.floor(age(state)),
    grossIncome: y.grossIncome,
    salaryIncome: y.salaryIncome,
    businessIncome: y.businessIncome,
    investmentIncome: y.investmentIncome,
    taxes: y.taxes,
    expenses: y.expenses,
    saved: y.saved,
    savingsRate: afterTax > 0 ? y.saved / afterTax : 0,
    netWorthStart: y.netWorthStart,
    netWorthEnd: nw,
    portfolioReturn,
    spReturn: tr[tr.length - 1] / y.spStart - 1,
    inflation: state.market.cpi / y.cpiStart - 1,
    achievements: [...y.achievements],
    highlights: [...y.highlights],
  };
  state.years.push(summary);
  state.year = emptyYear(state, nw, inv);
  for (const a of Object.values(state.accounts)) a.contributedThisYear = 0;
  return summary;
}

/** Resolve the current event with a given choice (wrapper that handles RNG state). */
export function chooseEvent(state: GameState, choiceIndex: number): string[] {
  const rng = new Rng(state.rngLife);
  const msgs = resolveEvent(state, rng, choiceIndex);
  state.rngLife = rng.state;
  checkAchievements(state);
  return msgs;
}

/** Run any engine action that needs randomness, keeping the saved RNG state in sync. */
export function withRng<T>(state: GameState, fn: (rng: Rng) => T): T {
  const rng = new Rng(state.rngLife);
  const out = fn(rng);
  state.rngLife = rng.state;
  return out;
}

export interface FastForwardResult {
  months: number;
  stoppedFor: 'done' | 'event' | 'gameOver' | 'yearEnd';
}

/**
 * Advance several months. Minor events are decided with their sensible default;
 * major events stop the fast-forward so the player decides (unless autoAll).
 */
export function fastForward(state: GameState, months: number, opts: { autoAll?: boolean; stopAtYearEnd?: boolean } = {}): FastForwardResult {
  let n = 0;
  while (n < months) {
    if (state.gameOver) return { months: n, stoppedFor: 'gameOver' };
    if (state.pendingEvent) {
      if ((state.pendingEvent.major || state.settings.pauseOnAllEvents) && !opts.autoAll) return { months: n, stoppedFor: 'event' };
      chooseEvent(state, autoChoice(state.pendingEvent));
      state.stats.autoDecisions++;
    }
    advanceMonth(state);
    n++;
    if (opts.stopAtYearEnd && state.pendingYearSummary && n < months) return { months: n, stoppedFor: 'yearEnd' };
  }
  if (state.pendingEvent && !opts.autoAll && (state.pendingEvent.major || state.settings.pauseOnAllEvents)) return { months: n, stoppedFor: 'event' };
  if (state.pendingEvent && !state.pendingEvent.major && !state.settings.pauseOnAllEvents && months > 1) {
    chooseEvent(state, autoChoice(state.pendingEvent));
    state.stats.autoDecisions++;
  }
  return { months: n, stoppedFor: state.gameOver ? 'gameOver' : 'done' };
}

export function canRetireEarly(state: GameState): boolean {
  return !state.gameOver && fiProgress(state) >= 1;
}

export function retireEarly(state: GameState): string {
  if (!canRetireEarly(state)) return 'You are not financially independent yet.';
  state.gameOver = true;
  state.retiredEarly = true;
  state.pendingEvent = undefined;
  log(state, `${state.name} retires early at ${Math.floor(age(state))}, financially independent!`, 'good');
  return 'Congratulations on retiring early!';
}

