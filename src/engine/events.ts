// Drawing and resolving the monthly decision events defined in src/data/events.ts.

import type { EventCondition, EventEffect, GameEventDef, GameState, PendingEvent } from '../types';
import { EVENTS } from '../data/events';
import { STOCKS } from '../data/stocks';
import { BACKGROUND_BY_ID } from '../data/backgrounds';
import { INSURED_MEDICAL_SHARE } from '../data/life';
import { Rng } from './rng';
import { buy, investmentsValue, positions, sell } from './portfolio';
import { isStock, securityName } from './market';
import { amortizedPayment, borrowOnCredit, changeTransport, creditDebt, hasHealthInsurance, householdSize, newDebtId, totalDebt } from './finance';
import { RENT_OPTIONS } from '../data/life';
import { CAREER_BY_ID } from '../data/careers';
import { bandTop, loseJob, promote, startDegree, takeJob, levelSalary } from './career';
import { openLocation, sellBusiness } from './business';
import { age, netWorth, monthlyGrossIncome } from './metrics';

export const EVENT_BY_ID: Record<string, GameEventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

const SPOUSE_NAMES = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jamie', 'Avery', 'Quinn'];

function heldStocks(state: GameState): string[] {
  return [...new Set(positions(state).filter((p) => isStock(p.symbol) && p.account !== 'k401').map((p) => p.symbol))];
}

export function conditionsMet(state: GameState, c: EventCondition | undefined): boolean {
  if (!c) return true;
  const a = age(state);
  const has = (v: boolean | undefined, actual: boolean) => v === undefined || v === actual;
  if (c.minAge !== undefined && a < c.minAge) return false;
  if (c.maxAge !== undefined && a > c.maxAge) return false;
  if (!has(c.employed, state.career.employed)) return false;
  if (!has(c.hasBusiness, state.businesses.length > 0)) return false;
  if (!has(c.hasCar, state.budget.transport !== 'transit')) return false;
  if (!has(c.ownsHome, !!state.home)) return false;
  if (!has(c.married, state.family.married)) return false;
  if (!has(c.hasKids, state.family.kids.length > 0)) return false;
  if (!has(c.hasPet, state.family.pets > 0)) return false;
  if (!has(c.hasStocks, heldStocks(state).length > 0)) return false;
  if (!has(c.hasInvestments, investmentsValue(state) > 100)) return false;
  if (!has(c.hasDebt, totalDebt(state) > 0)) return false;
  if (!has(c.hasCreditDebt, creditDebt(state) > 0)) return false;
  if (c.regime && !c.regime.includes(state.market.regime)) return false;
  const cpi = state.market.cpi;
  if (c.minCash !== undefined && state.cash < c.minCash * cpi) return false;
  if (c.minNetWorth !== undefined && netWorth(state) < c.minNetWorth * cpi) return false;
  if (c.maxNetWorth !== undefined && netWorth(state) > c.maxNetWorth * cpi) return false;
  if (c.minSkill !== undefined && state.career.skill < c.minSkill) return false;
  if (c.minPerformance !== undefined && state.career.performance < c.minPerformance) return false;
  if (c.minStress !== undefined && state.stress < c.minStress) return false;
  if (c.maxStress !== undefined && state.stress > c.maxStress) return false;
  if (c.flag && !state.flags.includes(c.flag)) return false;
  if (c.notFlag && state.flags.includes(c.notFlag)) return false;
  if (c.minMonth !== undefined && state.month < c.minMonth) return false;
  if (c.debtCrisis !== undefined && c.debtCrisis !== inDebtCrisis(state)) return false;
  return true;
}

/** Consumer debt (cards + hardship loans) that has clearly spiralled. */
export function inDebtCrisis(state: GameState): boolean {
  const consumer = state.debts.filter((d) => d.kind === 'credit' || (d.kind === 'personal' && d.label !== 'Debt management plan')).reduce((s, d) => s + d.balance, 0);
  const income = Math.max(20000 * state.market.cpi, state.career.salary + state.family.spouseIncome + state.businesses.reduce((s, b) => s + b.ownerDraw * 12, 0));
  return consumer > Math.max(15000 * state.market.cpi, income * 0.6);
}

function eligible(state: GameState, def: GameEventDef): boolean {
  const last = state.eventHistory[def.id];
  if (last !== undefined) {
    if (def.once) return false;
    if (state.month - last < (def.cooldown ?? 18)) return false;
  }
  if (def.id === 'career_night_school' && state.career.hasDegree) return false;
  if (def.needsTicker === 'held' && heldStocks(state).length === 0) return false;
  return conditionsMet(state, def.conditions);
}

function fill(text: string, state: GameState, ticker?: string, amount?: number): string {
  const biz = [...state.businesses].sort((a, b) => b.last.revenue - a.last.revenue)[0];
  return text
    .replace(/\{name\}/g, state.name)
    .replace(/\{employer\}/g, state.career.employer || 'your company')
    .replace(/\{ticker\}/g, ticker ?? 'SPY')
    .replace(/\{company\}/g, ticker ? securityName(ticker) : 'the company')
    .replace(/\{business\}/g, biz ? biz.name : 'your business')
    .replace(/\{spouse\}/g, state.family.spouseName ?? 'your partner')
    .replace(/\{amount\}/g, amount !== undefined ? `$${Math.round(amount).toLocaleString()}` : 'some money');
}

function eventAmount(state: GameState, def: GameEventDef): number | undefined {
  for (const ch of def.choices) {
    if (ch.effect.action === 'jobOffer' && ch.effect.salaryPct) return (state.career.salary || state.career.lastSalary) * (ch.effect.salaryPct / 100);
    if (ch.effect.cash) return Math.abs(ch.effect.cash) * state.market.cpi;
  }
  return undefined;
}

/** Pick this month's event (or undefined if none is eligible). */
export function drawEvent(state: GameState, rng: Rng): PendingEvent | undefined {
  const crisis = EVENT_BY_ID['money_debt_crisis'];
  const forced = crisis && eligible(state, crisis) ? crisis : undefined;
  const pool = forced ? [forced] : EVENTS.filter((e) => (e.weight ?? 1) > 0 && eligible(state, e));
  const badLuck = BACKGROUND_BY_ID[state.backgroundId]?.badLuck ?? 1;
  const def = forced ?? rng.weighted(pool, (e) => {
    let w = e.weight ?? 1;
    if (e.category === 'health' || e.id.includes('layoff')) w *= badLuck;
    return w;
  });
  if (!def) return undefined;
  let ticker: string | undefined;
  if (def.needsTicker === 'held') ticker = rng.pick(heldStocks(state));
  else if (def.needsTicker === 'any') ticker = rng.weighted(STOCKS, (s) => Math.sqrt(s.marketCapB))!.ticker;
  const amount = eventAmount(state, def);
  state.eventHistory[def.id] = state.month;
  return {
    defId: def.id,
    title: fill(def.title, state, ticker, amount),
    text: fill(def.text, state, ticker, amount),
    ticker,
    choices: def.choices.map((c) => ({
      label: fill(c.label, state, ticker, amount),
      hint: c.hint ? fill(c.hint, state, ticker, amount) : undefined,
      disabled: c.requiresCash !== undefined && state.cash < c.requiresCash * state.market.cpi,
    })),
    lesson: def.lesson ? fill(def.lesson, state, ticker, amount) : undefined,
    major: !!def.major,
  };
}

/** Index of the default choice used by fast-forward/autopilot. */
export function autoChoice(ev: PendingEvent): number {
  const def = EVENT_BY_ID[ev.defId];
  const idx = def ? def.choices.findIndex((c) => c.auto) : -1;
  if (idx >= 0 && !ev.choices[idx].disabled) return idx;
  const firstOk = ev.choices.findIndex((c) => !c.disabled);
  return firstOk >= 0 ? firstOk : 0;
}

function largestBusiness(state: GameState) {
  return [...state.businesses].sort((a, b) => b.last.revenue - a.last.revenue)[0];
}

function clamp(x: number) {
  return Math.max(0, Math.min(100, x));
}

/** Apply an effect; returns result messages. */
export function applyEffect(state: GameState, rng: Rng, e: EventEffect, ctx: { ticker?: string; category?: string }): string[] {
  const msgs: string[] = [];
  const cpi = state.market.cpi;
  const medical = ctx.category === 'health' && hasHealthInsurance(state);
  let cashDelta = 0;
  if (e.cash) cashDelta += e.cash * cpi;
  if (e.cashIncomeMonths) cashDelta += e.cashIncomeMonths * Math.max(2000 * cpi, monthlyGrossIncome(state));
  if (cashDelta < 0 && medical) {
    const saved = -cashDelta * (1 - INSURED_MEDICAL_SHARE);
    cashDelta *= INSURED_MEDICAL_SHARE;
    msgs.push(`Health insurance covered $${Math.round(saved).toLocaleString()} of the bill.`);
  }
  if (cashDelta !== 0) {
    state.cash += cashDelta;
    if (cashDelta < 0) state.year.expenses += -cashDelta;
    else state.year.grossIncome += cashDelta;
  }
  if (e.stress) state.stress = clamp(state.stress + e.stress);
  if (e.happiness) state.happiness = clamp(state.happiness + e.happiness);
  if (e.health) state.health = clamp(state.health + e.health);
  if (e.skill) {
    // Skill gains shrink as you approach mastery (same curve as on-the-job learning).
    const headroom = Math.max(0.1, Math.pow((100 - state.career.skill) / 100, 1.5));
    state.career.skill = clamp(state.career.skill + (e.skill > 0 ? e.skill * headroom * 0.6 : e.skill));
  }
  if (e.performance) state.career.performance = clamp(state.career.performance + e.performance);
  if (e.reputation) state.career.reputation = clamp(state.career.reputation + e.reputation);
  if (e.salaryPct && state.career.employed && e.action !== 'jobOffer') {
    const c = state.career;
    // Raises cannot push you far above your role's pay band; promotions are the way up.
    const cap = bandTop(c.trackId, c.level, cpi) * 1.05;
    c.salary = e.salaryPct > 0 ? Math.max(c.salary, Math.min(c.salary * (1 + e.salaryPct / 100), cap)) : c.salary * (1 + e.salaryPct / 100);
    state.career.raisesHistory.push({ month: state.month, salary: state.career.salary, reason: `Raise (${e.salaryPct}%)` });
  }
  if (e.creditDebt) borrowOnCredit(state, e.creditDebt * cpi);
  const biz = largestBusiness(state);
  if (biz) {
    if (e.bizReputation) biz.reputation = clamp(biz.reputation + e.bizReputation);
    if (e.bizCash) biz.cash += e.bizCash * cpi;
    if (e.bizBoost) biz.boosts.push({ mult: e.bizBoost.mult, months: e.bizBoost.months, reason: 'event' });
  }
  if (e.setFlag && !state.flags.includes(e.setFlag)) state.flags.push(e.setFlag);
  if (e.clearFlag) state.flags = state.flags.filter((f) => f !== e.clearFlag);

  const symbol = e.symbol === '$event' ? ctx.ticker : e.symbol;
  const panicking = state.market.regime === 'bear' || state.market.regime === 'crash';
  switch (e.action) {
    case 'sellAllStocks': {
      let n = 0;
      for (const p of positions(state)) if (isStock(p.symbol) && p.account !== 'k401') { sell(state, p.symbol, p.account, 'all'); n++; }
      if (panicking && n) state.stats.panicSells++;
      msgs.push(n ? `Sold ${n} stock position${n > 1 ? 's' : ''}.` : 'You had no individual stocks to sell.');
      break;
    }
    case 'sellAllInvestments': {
      const before = investmentsValue(state);
      for (const p of positions(state)) sell(state, p.symbol, p.account, 'all');
      if (panicking && before > 100) state.stats.panicSells++;
      msgs.push(before > 100 ? 'You sold everything. Money in your 401(k) and Roth now sits as uninvested cash in those accounts.' : 'You had nothing to sell.');
      break;
    }
    case 'buySymbol': {
      if (!symbol) break;
      const dollars = (Math.max(0, state.cash) * (e.pct ?? 10)) / 100;
      if (dollars >= 10) {
        const r = buy(state, symbol, 'taxable', dollars);
        msgs.push(r.ok ? `Invested $${Math.round(dollars).toLocaleString()} in ${symbol}.` : r.message);
      } else msgs.push('You did not have spare cash to invest.');
      break;
    }
    case 'sellSymbol': {
      if (!symbol) break;
      let sold = 0;
      for (const p of positions(state)) {
        if (p.symbol !== symbol || p.account === 'k401') continue;
        const r = sell(state, symbol, p.account, (p.value * (e.pct ?? 100)) / 100);
        if (r.ok) sold += r.dollars ?? 0;
      }
      if (panicking && sold > 0) state.stats.panicSells++;
      msgs.push(sold > 0 ? `Sold $${Math.round(sold).toLocaleString()} of ${symbol}.` : `You had no ${symbol} to sell.`);
      break;
    }
    case 'promote': {
      const c = state.career;
      if (!c.employed) break;
      const next = CAREER_BY_ID[c.trackId].levels[c.level + 1];
      const qualified = next && c.skill >= next.minSkill && (next.certs ?? []).every((x) => c.certs.includes(x));
      if (qualified) msgs.push(promote(state, 'Promotion offer'));
      else {
        const before = c.salary;
        c.salary = Math.max(c.salary, Math.min(c.salary * 1.05, bandTop(c.trackId, c.level, cpi) * 1.05));
        msgs.push(`${next ? `You are not yet qualified for ${next.title}` : 'There is no higher role here'}, so your boss gave you a ${(((c.salary / before) - 1) * 100).toFixed(1)}% raise instead.`);
      }
      break;
    }
    case 'layoff':
      if (state.career.employed) msgs.push(loseJob(state, true));
      break;
    case 'quitJob':
      if (state.career.employed) msgs.push(loseJob(state, false));
      break;
    case 'jobOffer': {
      const c = state.career;
      const pct = e.salaryPct ?? 0;
      const base = c.employed ? c.salary : Math.max(levelSalary(c.trackId, c.level, cpi), c.lastSalary);
      msgs.push(takeJob(state, rng, c.trackId, c.level, base * (1 + pct / 100)));
      break;
    }
    case 'marry': {
      if (!state.family.married) {
        state.family.married = true;
        state.family.spouseName = rng.pick(SPOUSE_NAMES);
        state.family.spouseIncome = rng.chance(0.85) ? rng.range(35000, 85000) * cpi : 0;
        state.flags = state.flags.filter((f) => f !== 'dating');
        msgs.push(`You married ${state.family.spouseName}!${state.family.spouseIncome ? ` Their income of $${Math.round(state.family.spouseIncome).toLocaleString()} a year joins the household budget.` : ''}`);
      }
      break;
    }
    case 'haveChild':
      state.family.kids.push(0);
      msgs.push('A baby joined the family! Childcare costs are now in your budget. Consider term life insurance.');
      break;
    case 'adoptPet':
      state.family.pets++;
      break;
    case 'startDegree':
      msgs.push(startDegree(state));
      break;
    case 'carBreakdown':
      if (state.budget.transport !== 'transit') msgs.push(changeTransport(state, 'transit', false));
      break;
    case 'bizExpand':
      if (biz) msgs.push(openLocation(state, biz, 0.3));
      break;
    case 'bizLawsuit':
      if (biz) {
        if (rng.chance(0.55)) {
          biz.cash -= 6000 * cpi;
          msgs.push('You won the case. Legal fees: $' + Math.round(6000 * cpi).toLocaleString() + '.');
        } else {
          biz.cash -= 30000 * cpi;
          biz.reputation = clamp(biz.reputation - 10);
          msgs.push('You lost the case and paid a $' + Math.round(30000 * cpi).toLocaleString() + ' settlement. Business insurance and an umbrella policy exist for days like this.');
        }
      }
      break;
    case 'sellBusiness':
      if (biz) msgs.push(sellBusiness(state, biz.id, 1.3));
      break;
    case 'debtPlan': {
      const bad = state.debts.filter((d) => d.kind === 'credit' || d.kind === 'personal');
      const total = bad.reduce((s, d) => s + d.balance, 0);
      state.debts = state.debts.filter((d) => !bad.includes(d));
      if (total > 0) state.debts.push({ id: newDebtId(state, 'plan'), kind: 'personal', label: 'Debt management plan', balance: total, rate: 0.08, minPayment: amortizedPayment(total, 0.08, 60) });
      state.budget.lifestyle = 'frugal';
      state.budget.autoInvest = [];
      state.budget.sweepSymbol = '';
      if (!state.home) {
        const size = householdSize(state);
        const cheapest = [...RENT_OPTIONS].filter((r) => r.fits >= size).sort((a, b) => a.rent - b.rent)[0];
        if (cheapest && (RENT_OPTIONS.find((r) => r.id === state.budget.housing)?.rent ?? 0) > cheapest.rent) state.budget.housing = cheapest.id;
      }
      if (state.budget.transport === 'new-car' || state.budget.transport === 'luxury-car') changeTransport(state, 'used-car', true);
      msgs.push(`$${Math.round(total).toLocaleString()} of card debt is now a 5-year loan at 8%. Lifestyle set to frugal and automatic investing paused until you are back on your feet.`);
      break;
    }
    case 'bankruptcy': {
      const wiped = state.debts.filter((d) => d.kind === 'credit' || d.kind === 'personal' || d.kind === 'car');
      const total = wiped.reduce((s, d) => s + d.balance, 0);
      state.debts = state.debts.filter((d) => !wiped.includes(d));
      if (wiped.some((d) => d.kind === 'car')) state.budget.transport = 'transit';
      const keep = 25000 * cpi;
      const taxable = state.accounts.taxable;
      let lost = 0;
      for (const p of positions(state)) if (p.account === 'taxable') lost += p.value;
      if (lost > keep) {
        taxable.holdings = {};
        lost -= keep;
        state.cash += keep;
      } else lost = 0;
      if (state.cash > 5000 * cpi) {
        lost += state.cash - 5000 * cpi;
        state.cash = 5000 * cpi;
      }
      if (!state.flags.includes('bankrupt')) state.flags.push('bankrupt');
      state.budget.lifestyle = 'frugal';
      msgs.push(`$${Math.round(total).toLocaleString()} of debt was discharged.${lost > 0 ? ` You gave up $${Math.round(lost).toLocaleString()} of savings to creditors.` : ''} Retirement accounts were protected.`);
      break;
    }
    case 'inheritance': {
      const amt = rng.range(8000, 60000) * cpi;
      state.cash += amt;
      msgs.push(`You received $${Math.round(amt).toLocaleString()}.`);
      break;
    }
    default:
      break;
  }

  if (e.chance) {
    const ok = rng.chance(e.chance.p);
    msgs.push(fillResult(ok ? e.chance.successText : e.chance.failText, state, ctx.ticker));
    msgs.push(...applyEffect(state, rng, ok ? e.chance.success : e.chance.fail, ctx));
  }
  if (e.result) msgs.unshift(fillResult(e.result, state, ctx.ticker));
  if (state.cash < 0) {
    borrowOnCredit(state, -state.cash);
    state.cash = 0;
    msgs.push('You did not have enough cash, so the rest went on your credit card.');
  }
  return msgs;
}

function fillResult(t: string, state: GameState, ticker?: string) {
  return fill(t, state, ticker);
}

export function resolveEvent(state: GameState, rng: Rng, choiceIndex: number): string[] {
  const ev = state.pendingEvent;
  if (!ev) return [];
  const def = EVENT_BY_ID[ev.defId];
  state.pendingEvent = undefined;
  if (!def) return [];
  let idx = Math.max(0, Math.min(def.choices.length - 1, choiceIndex));
  if (ev.choices[idx]?.disabled) idx = autoChoice(ev);
  const choice = def.choices[idx];
  const msgs = applyEffect(state, rng, choice.effect, { ticker: ev.ticker, category: def.category });
  state.log.push({ month: state.month, text: `${ev.title}: ${choice.label}. ${msgs.join(' ')}`.trim(), kind: 'event' });
  return msgs;
}
