// Budget, taxes, debts and housing math.

import type { CashFlow, Debt, GameState } from '../types';
import {
  CAR_LOAN,
  CREDIT,
  EMPLOYER_HEALTH_PREMIUM,
  FAMILY_COSTS,
  HEALTH_DEPENDENT_EXTRA,
  HOME_OPTIONS,
  HOME_RULES,
  INSURANCE_OPTIONS,
  LIFESTYLE_OPTIONS,
  RENT_OPTIONS,
  TAX,
  TRANSPORT_OPTIONS,
} from '../data/life';
import { CAREER_BY_ID } from '../data/careers';

export const RENT_BY_ID = Object.fromEntries(RENT_OPTIONS.map((r) => [r.id, r]));
export const HOME_BY_ID = Object.fromEntries(HOME_OPTIONS.map((r) => [r.id, r]));
export const TRANSPORT_BY_ID = Object.fromEntries(TRANSPORT_OPTIONS.map((r) => [r.id, r]));
export const LIFESTYLE_BY_ID = Object.fromEntries(LIFESTYLE_OPTIONS.map((r) => [r.id, r]));

export function emptyFlow(): CashFlow {
  return {
    salary: 0, spouse: 0, business: 0, dividends: 0, interest: 0, otherIncome: 0, taxes: 0, k401: 0,
    housing: 0, transport: 0, food: 0, lifestyle: 0, family: 0, insurance: 0, utilities: 0,
    debtPayments: 0, education: 0, invested: 0, other: 0, leftover: 0,
  };
}

// ---------------------------------------------------------------------------
// Taxes (simplified US-style, see src/data/life.ts)
// ---------------------------------------------------------------------------

/** Federal + state income tax on an annual taxable income (before standard deduction). */
export function incomeTax(annualIncome: number, cpi: number, married: boolean): number {
  const mult = cpi * (married ? 2 : 1);
  const taxable = Math.max(0, annualIncome - TAX.standardDeduction * mult);
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of TAX.brackets) {
    const top = limit * mult;
    if (taxable > prev) tax += (Math.min(taxable, top) - prev) * rate;
    prev = top;
    if (taxable <= top) break;
  }
  return tax + taxable * TAX.stateRate;
}

export function payrollTax(annualWages: number, cpi: number): number {
  const cap = TAX.payrollWageCap * cpi;
  return Math.min(annualWages, cap) * 0.062 + annualWages * 0.0145;
}

// ---------------------------------------------------------------------------
// People & expenses
// ---------------------------------------------------------------------------

export function householdSize(state: GameState): number {
  return 1 + (state.family.married ? 1 : 0) + state.family.kids.filter((k) => k < 18 * 12).length;
}

export function hasEmployerHealth(state: GameState): boolean {
  return state.career.employed && CAREER_BY_ID[state.career.trackId]?.healthBenefits;
}

export function hasHealthInsurance(state: GameState): boolean {
  return hasEmployerHealth(state) || state.budget.insurance.health;
}

export interface MonthlyCosts {
  housing: number;
  transport: number;
  food: number;
  lifestyle: number;
  family: number;
  insurance: number;
  utilities: number;
}

/** Monthly living costs at today's prices (excluding debt payments other than the mortgage, which is a debt). */
export function livingCosts(state: GameState): MonthlyCosts {
  const cpi = state.market.cpi;
  const b = state.budget;
  let housing = 0;
  if (state.home) {
    const h = state.home;
    housing = (h.value * (h.propertyTaxRate + HOME_RULES.upkeepPct / 100)) / 12;
    const mort = state.debts.find((d) => d.id === h.mortgageId);
    if (mort && mort.balance > 0 && mort.balance > h.purchasePrice * 0.8) housing += (mort.balance * HOME_RULES.pmiRate) / 100 / 12;
  } else {
    housing = (RENT_BY_ID[b.housing]?.rent ?? 1500) * cpi;
  }
  const tr = TRANSPORT_BY_ID[b.transport] ?? TRANSPORT_OPTIONS[0];
  const transport = tr.running * cpi * (state.family.married ? 1.3 : 1);
  const ls = LIFESTYLE_BY_ID[b.lifestyle] ?? LIFESTYLE_OPTIONS[1];
  const adults = state.family.married ? 1 + FAMILY_COSTS.spouseShare : 1;
  const food = ls.food * cpi * adults;
  // Lifestyle spending has a fixed part plus a share of after-tax income (lifestyle creep).
  const lifestyle = ls.fun * cpi * adults + ls.incomeShare * afterTaxMonthly(state);
  let family = state.family.pets * FAMILY_COSTS.pet * cpi;
  for (const k of state.family.kids) {
    if (k < 5 * 12) family += FAMILY_COSTS.childUnder5 * cpi;
    else if (k < 18 * 12) family += FAMILY_COSTS.child5to17 * cpi;
  }
  const utilities = (FAMILY_COSTS.utilitiesBase + FAMILY_COSTS.utilitiesPerPerson * (householdSize(state) - 1) + FAMILY_COSTS.personalPerPerson * householdSize(state)) * cpi;
  let insurance = 0;
  const dependents = householdSize(state) - 1;
  if (hasEmployerHealth(state)) insurance += (EMPLOYER_HEALTH_PREMIUM + dependents * 120) * cpi;
  else if (b.insurance.health) insurance += (INSURANCE_OPTIONS[0].monthly + dependents * HEALTH_DEPENDENT_EXTRA) * cpi;
  for (const opt of INSURANCE_OPTIONS) {
    if (opt.id === 'health') continue;
    if (opt.id === 'renters' && state.home) continue;
    if (b.insurance[opt.id]) insurance += opt.monthly * cpi * (opt.id === 'life' ? 1 + state.family.kids.length * 0.5 : 1);
  }
  return { housing, transport, food, lifestyle, family, insurance, utilities };
}

/** Rough after-tax household income per month (used to scale lifestyle spending). */
export function afterTaxMonthly(state: GameState): number {
  const c = state.career;
  const salary = c.employed && !c.onLeave ? c.salary : 0;
  const gross = salary + state.family.spouseIncome + state.businesses.reduce((s, b) => s + b.ownerDraw * 12, 0);
  const tax = incomeTax(gross, state.market.cpi, state.family.married) + payrollTax(salary, state.market.cpi) + payrollTax(state.family.spouseIncome, state.market.cpi);
  return Math.max(0, gross - tax) / 12;
}

export function totalLiving(c: MonthlyCosts): number {
  return c.housing + c.transport + c.food + c.lifestyle + c.family + c.insurance + c.utilities;
}

/** Monthly essential spending, including minimum debt payments: the basis for the emergency fund. */
export function monthlyEssentials(state: GameState): number {
  const c = livingCosts(state);
  return totalLiving(c) - c.lifestyle * 0.6 + state.debts.reduce((s, d) => s + Math.min(d.balance, d.minPayment), 0);
}

// ---------------------------------------------------------------------------
// Debts
// ---------------------------------------------------------------------------

export function totalDebt(state: GameState): number {
  return state.debts.reduce((s, d) => s + d.balance, 0);
}
export function creditDebt(state: GameState): number {
  return state.debts.filter((d) => d.kind === 'credit').reduce((s, d) => s + d.balance, 0);
}

/** Standard amortizing payment. */
export function amortizedPayment(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

let debtCounter = 0;
export function newDebtId(state: GameState, kind: string): string {
  debtCounter++;
  return `${kind}-${state.month}-${debtCounter}-${Math.floor(Math.random() * 1e6)}`;
}

export function creditLimit(state: GameState): number {
  const limit = CREDIT.baseLimit * state.market.cpi + CREDIT.limitIncomeShare * (state.career.salary + state.family.spouseIncome);
  return state.flags.includes('bankrupt') ? limit * 0.4 : limit;
}

/** Add to (or create) the credit card balance. Overflow beyond the limit goes to a hardship loan. */
export function borrowOnCredit(state: GameState, amount: number): void {
  if (amount <= 0) return;
  let card = state.debts.find((d) => d.kind === 'credit');
  if (!card) {
    card = { id: newDebtId(state, 'credit'), kind: 'credit', label: 'Credit card', balance: 0, rate: CREDIT.rate, minPayment: 0 };
    state.debts.push(card);
  }
  const room = Math.max(0, creditLimit(state) - card.balance);
  const onCard = Math.min(room, amount);
  card.balance += onCard;
  const rest = amount - onCard;
  if (rest > 0) {
    let loan = state.debts.find((d) => d.kind === 'personal');
    if (!loan) {
      loan = { id: newDebtId(state, 'personal'), kind: 'personal', label: 'Hardship loan', balance: 0, rate: CREDIT.hardshipRate, minPayment: 0 };
      state.debts.push(loan);
    }
    loan.balance += rest;
    loan.minPayment = Math.max(loan.minPayment, amortizedPayment(loan.balance, loan.rate, 36));
  }
  card.minPayment = Math.max(CREDIT.minPaymentFloor, card.balance * CREDIT.minPaymentPct);
}

/**
 * Accrue interest and make payments. Pays minimums, then `extra` toward the
 * highest-rate debt (the "avalanche" method). Returns the total paid.
 */
export function serviceDebts(state: GameState, available: number, extra: number): { paid: number; interest: number } {
  let paid = 0;
  let interest = 0;
  for (const d of state.debts) {
    const i = (d.balance * d.rate) / 12;
    interest += i;
    d.balance += i;
    if (d.kind === 'credit') d.minPayment = Math.max(Math.min(d.balance, CREDIT.minPaymentFloor), d.balance * CREDIT.minPaymentPct + i);
    const pay = Math.min(d.balance, d.minPayment);
    d.balance -= pay;
    paid += pay;
  }
  let extraLeft = Math.max(0, Math.min(extra, available - paid));
  const sorted = [...state.debts].filter((d) => d.balance > 0).sort((a, b) => b.rate - a.rate);
  for (const d of sorted) {
    if (extraLeft <= 0) break;
    const pay = Math.min(d.balance, extraLeft);
    d.balance -= pay;
    extraLeft -= pay;
    paid += pay;
  }
  state.debts = state.debts.filter((d) => d.balance > 0.5);
  if (state.home && state.home.mortgageId && !state.debts.find((d) => d.id === state.home!.mortgageId)) state.home.mortgageId = undefined;
  return { paid, interest };
}

/** Pay a lump sum off one debt from cash. */
export function payDebt(state: GameState, debtId: string, amount: number): string {
  const d = state.debts.find((x) => x.id === debtId);
  if (!d) return 'Debt not found.';
  const pay = Math.min(amount, d.balance, state.cash);
  if (pay <= 0) return 'Not enough cash.';
  d.balance -= pay;
  state.cash -= pay;
  if (d.balance <= 0.5) {
    state.debts = state.debts.filter((x) => x.id !== d.id);
    if (state.home?.mortgageId === d.id) state.home.mortgageId = undefined;
    return `Paid off your ${d.label}! That frees up $${Math.round(d.minPayment).toLocaleString()} a month.`;
  }
  return `Paid $${Math.round(pay).toLocaleString()} toward your ${d.label}.`;
}

// ---------------------------------------------------------------------------
// Housing & cars
// ---------------------------------------------------------------------------

export function homeEquity(state: GameState): number {
  if (!state.home) return 0;
  const mort = state.debts.find((d) => d.id === state.home!.mortgageId);
  return state.home.value - (mort ? mort.balance : 0);
}

export interface BuyHomeQuote {
  price: number;
  down: number;
  closing: number;
  loan: number;
  payment: number;
  monthlyAllIn: number;
  rate: number;
}

export function quoteHome(state: GameState, optionId: string, downPct: number): BuyHomeQuote | null {
  const opt = HOME_BY_ID[optionId];
  if (!opt) return null;
  const price = opt.price * state.market.cpi * state.market.housingIndex;
  const down = (price * downPct) / 100;
  const closing = (price * HOME_RULES.closingCostPct) / 100;
  const loan = price - down;
  const rate = state.market.mortgageRate;
  const payment = amortizedPayment(loan, rate, HOME_RULES.mortgageYears * 12);
  const extras = (price * (HOME_RULES.propertyTaxPct + HOME_RULES.upkeepPct)) / 100 / 12 + (downPct < 20 ? (loan * HOME_RULES.pmiRate) / 100 / 12 : 0);
  return { price, down, closing, loan, payment, monthlyAllIn: payment + extras, rate };
}

export function buyHome(state: GameState, optionId: string, downPct: number): string {
  if (state.home) return 'You already own a home. Sell it first.';
  if (downPct < HOME_RULES.minDownPct) return `Minimum down payment is ${HOME_RULES.minDownPct}%.`;
  const q = quoteHome(state, optionId, downPct);
  if (!q) return 'Unknown home.';
  const needed = q.down + q.closing;
  if (state.cash < needed) return `You need $${Math.round(needed).toLocaleString()} in cash for the down payment and closing costs.`;
  const income = state.career.salary + state.family.spouseIncome + state.businesses.reduce((s, b) => s + b.ownerDraw * 12, 0);
  const otherDebt = state.debts.reduce((s, d) => s + d.minPayment, 0);
  if ((q.monthlyAllIn + otherDebt) > (income / 12) * 0.45) return 'The bank says no: your total debt payments would be more than 45% of your income.';
  state.cash -= needed;
  const id = newDebtId(state, 'mortgage');
  state.debts.push({ id, kind: 'mortgage', label: `Mortgage (${(q.rate * 100).toFixed(2)}%)`, balance: q.loan, rate: q.rate, minPayment: q.payment });
  const opt = HOME_BY_ID[optionId];
  state.home = { value: q.price, purchasePrice: q.price, mortgageId: id, propertyTaxRate: HOME_RULES.propertyTaxPct / 100, label: opt.label };
  state.budget.housing = optionId;
  state.budget.insurance.renters = false;
  return `Congratulations on your ${opt.label}! Monthly cost about $${Math.round(q.monthlyAllIn).toLocaleString()} including taxes and upkeep.`;
}

export function sellHome(state: GameState, rentId: string): string {
  if (!state.home) return 'You do not own a home.';
  const h = state.home;
  const sale = h.value * (1 - HOME_RULES.sellingCostPct / 100);
  const mort = state.debts.find((d) => d.id === h.mortgageId);
  const payoff = mort ? mort.balance : 0;
  state.cash += sale - payoff;
  if (mort) state.debts = state.debts.filter((d) => d.id !== mort.id);
  state.home = undefined;
  state.budget.housing = rentId;
  return `Sold your home for $${Math.round(h.value).toLocaleString()}. After selling costs and paying off the mortgage you received $${Math.round(sale - payoff).toLocaleString()}.`;
}

/** Monthly home value update. */
export function updateHome(state: GameState): void {
  if (!state.home) return;
  const m = state.market;
  state.home.value *= 1 + m.inflation / 12 + m.housingIndexChange;
}

export function changeTransport(state: GameState, id: string, financed: boolean): string {
  const opt = TRANSPORT_BY_ID[id];
  if (!opt) return 'Unknown option.';
  if (id === state.budget.transport) return 'You already have that.';
  const current = TRANSPORT_BY_ID[state.budget.transport];
  // Sell the current car for a share of its price (cars lose value fast).
  const resale = current?.isCar ? current.price * state.market.cpi * 0.45 : 0;
  // Remove existing car loan from the resale proceeds.
  const carLoan = state.debts.find((d) => d.kind === 'car');
  let cashIn = resale;
  if (carLoan) {
    cashIn -= carLoan.balance;
    state.debts = state.debts.filter((d) => d !== carLoan);
  }
  const price = opt.price * state.market.cpi;
  if (price > 0 && !financed && state.cash + cashIn < price) return `You need $${Math.round(price - cashIn).toLocaleString()} in cash, or choose a car loan.`;
  state.cash += cashIn;
  if (price > 0) {
    if (financed) {
      const loanAmt = Math.max(0, price - Math.max(0, Math.min(state.cash, price * 0.1)));
      state.cash -= price - loanAmt;
      const pay = amortizedPayment(loanAmt, CAR_LOAN.rate, CAR_LOAN.months);
      const d: Debt = { id: newDebtId(state, 'car'), kind: 'car', label: `Car loan (${opt.label})`, balance: loanAmt, rate: CAR_LOAN.rate, minPayment: pay };
      state.debts.push(d);
    } else {
      state.cash -= price;
    }
  }
  state.budget.transport = id;
  return `You now use: ${opt.label}.`;
}

/** Pretty helper for the budget page. */
export function flowTotalOut(f: CashFlow): number {
  return f.taxes + f.housing + f.transport + f.food + f.lifestyle + f.family + f.insurance + f.utilities + f.debtPayments + f.education + f.other;
}
export function flowTotalIn(f: CashFlow): number {
  return f.salary + f.spouse + f.business + f.dividends + f.interest + f.otherIncome;
}
