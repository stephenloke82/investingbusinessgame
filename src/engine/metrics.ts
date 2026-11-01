// Derived numbers used by the UI, the guide, achievements and the report card.

import type { GameState } from '../types';
import { investmentsValue, stocksValue, accountValue } from './portfolio';
import { creditDebt, homeEquity, livingCosts, monthlyEssentials, totalDebt, totalLiving } from './finance';
import { businessesValue } from './business';
import { priceOf, SP500 } from './market';

export function age(state: GameState): number {
  return state.startAge + state.month / 12;
}

export function calendar(state: GameState): { year: number; monthName: string; monthIndex: number } {
  const m0 = Math.max(0, state.month - 1);
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (state.month === 0) return { year: state.startYear, monthName: 'January', monthIndex: 0 };
  return { year: state.startYear + Math.floor(m0 / 12), monthName: names[m0 % 12], monthIndex: m0 % 12 };
}

export function dateLabel(state: GameState): string {
  const c = calendar(state);
  return `${c.monthName} ${c.year}`;
}

export function netWorth(state: GameState): number {
  return state.cash + investmentsValue(state) + homeEquity(state) + businessesValue(state) - (totalDebt(state) - mortgageBalance(state));
}

export function mortgageBalance(state: GameState): number {
  return state.debts.filter((d) => d.kind === 'mortgage').reduce((s, d) => s + d.balance, 0);
}

/** Money that could fund retirement: cash + investments (not your home or business). */
export function investableAssets(state: GameState): number {
  return state.cash + investmentsValue(state);
}

export function monthlyGrossIncome(state: GameState): number {
  const salary = state.career.employed ? state.career.salary / 12 : 0;
  const draws = state.businesses.reduce((s, b) => s + b.ownerDraw, 0);
  return salary + draws + state.family.spouseIncome / 12;
}

/** Average monthly spending over the last 12 months (falls back to the current budget). */
export function avgMonthlySpending(state: GameState): number {
  const recent = state.history.slice(-12);
  if (recent.length >= 3) return recent.reduce((s, h) => s + h.expenses, 0) / recent.length;
  return totalLiving(livingCosts(state)) + state.debts.reduce((s, d) => s + d.minPayment, 0);
}

/** Financial independence target: 25x annual spending (the "4% rule"). */
export function fiNumber(state: GameState): number {
  const spend = totalLiving(livingCosts(state));
  return spend * 12 * 25;
}

export function fiProgress(state: GameState): number {
  const n = fiNumber(state);
  if (n <= 0) return 0;
  const passiveBusiness = state.businesses.filter((b) => b.involvement === 'hands-off').reduce((s, b) => s + Math.max(0, b.ownerDraw) * 12 * 25, 0);
  return Math.max(0, (investableAssets(state) - creditDebt(state) + passiveBusiness) / n);
}

export function emergencyMonths(state: GameState): number {
  const ess = monthlyEssentials(state);
  return ess > 0 ? state.cash / ess : 99;
}

/** Savings rate over the last 12 months: share of after-tax income not spent. */
export function savingsRate(state: GameState): number {
  const recent = state.history.slice(-12);
  if (!recent.length) return 0;
  const income = recent.reduce((s, h) => s + h.grossIncome - h.taxes, 0);
  const saved = recent.reduce((s, h) => s + h.saved, 0);
  return income > 0 ? saved / income : 0;
}

export function stockShare(state: GameState): number {
  const inv = investmentsValue(state);
  return inv > 0 ? stocksValue(state) / inv : 0;
}

/** The single largest position as a share of investments. */
export function largestPosition(state: GameState): { symbol: string; share: number } | null {
  const inv = investmentsValue(state);
  if (inv <= 0) return null;
  const bySymbol: Record<string, number> = {};
  for (const a of Object.values(state.accounts))
    for (const h of Object.values(a.holdings)) bySymbol[h.symbol] = (bySymbol[h.symbol] ?? 0) + h.lots.reduce((s, l) => s + l.shares, 0) * priceOf(state.market, h.symbol);
  const top = Object.entries(bySymbol).sort((a, b) => b[1] - a[1])[0];
  return top ? { symbol: top[0], share: top[1] / inv } : null;
}

export function shadowValue(state: GameState): number {
  return state.shadowShares * priceOf(state.market, SP500);
}

export function retirementValue(state: GameState): number {
  return accountValue(state, 'k401') + accountValue(state, 'roth');
}

/** Investments minus a hypothetical S&P-only portfolio with the same deposits and withdrawals. */
export function vsIndex(state: GameState): number {
  return investmentsValue(state) - shadowValue(state);
}

export function yearsLeft(state: GameState): number {
  return Math.max(0, state.retireAge - age(state));
}

/** Future value of steady monthly investing. Used by the compound interest calculator. */
export function compound(start: number, monthly: number, annualRate: number, years: number): { total: number; contributed: number; series: number[] } {
  let v = start;
  let contributed = start;
  const series = [v];
  const r = annualRate / 12;
  for (let m = 1; m <= Math.round(years * 12); m++) {
    v = v * (1 + r) + monthly;
    contributed += monthly;
    if (m % 12 === 0) series.push(v);
  }
  return { total: v, contributed, series };
}
