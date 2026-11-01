// End-of-game report card.

import type { GameState } from '../types';
import { netWorth, shadowValue, savingsRate, fiProgress, age } from './metrics';
import { investmentsValue, stocksValue } from './portfolio';
import { totalDebt, creditDebt } from './finance';
import { businessesValue } from './business';
import { CAREER_BY_ID } from '../data/careers';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F' | '-';

export interface ReportLine {
  area: string;
  grade: Grade;
  detail: string;
}

export interface ReportCard {
  overall: Grade;
  lines: ReportLine[];
  netWorthReal: number;
  investmentsReal: number;
  shadowReal: number;
  lifetimeIncomeReal: number;
  avgStress: number;
  summary: string[];
}

function grade(value: number, a: number, b: number, c: number, d: number): Grade {
  if (value >= a) return 'A';
  if (value >= b) return 'B';
  if (value >= c) return 'C';
  if (value >= d) return 'D';
  return 'F';
}

const GPA: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0, '-': -1 };

export function reportCard(state: GameState): ReportCard {
  const cpi = state.market.cpi;
  const nwReal = netWorth(state) / cpi;
  const inv = investmentsValue(state);
  const shadow = shadowValue(state);
  // Lifetime income in today's money, deflating each year by the average inflation rate.
  const years = state.years;
  const n = years.length || 1;
  const annualInfl = Math.pow(cpi, 1 / n) - 1;
  const lifetimeIncomeReal = years.reduce((s, y, i) => s + y.grossIncome / Math.pow(1 + annualInfl, i + 0.5), 0);
  const avgIncomeReal = lifetimeIncomeReal / n;
  const avgStress = state.history.length ? state.history.reduce((s, h) => s + h.stress, 0) / state.history.length : state.stress;
  const lifetimeSR = (() => {
    const inc = years.reduce((s, y) => s + y.grossIncome - y.taxes, 0);
    const saved = years.reduce((s, y) => s + y.saved, 0);
    return inc > 0 ? saved / inc : savingsRate(state);
  })();

  const lines: ReportLine[] = [];
  const wealthMultiple = avgIncomeReal > 0 ? nwReal / avgIncomeReal : 0;
  lines.push({
    area: 'Wealth built',
    grade: grade(wealthMultiple, 10, 6, 3, 1),
    detail: `Net worth of ${money(nwReal)} in today's money: ${wealthMultiple.toFixed(1)}x your average yearly income.`,
  });
  lines.push({
    area: 'Saving',
    grade: grade(lifetimeSR, 0.25, 0.15, 0.1, 0.03),
    detail: `You kept ${(lifetimeSR * 100).toFixed(0)}% of your after-tax income over your career.`,
  });
  const invested = state.history.some((h) => h.investments > 1000);
  const ratio = shadow > 1000 ? inv / shadow : invested ? 1 : 0;
  lines.push({
    area: 'Investing',
    grade: !invested ? 'F' : grade(ratio, 0.97, 0.88, 0.75, 0.6),
    detail: invested
      ? `Your investments ended at ${money(inv / cpi)} vs ${money(shadow / cpi)} if every dollar had gone into an S&P 500 fund (${ratio >= 1 ? 'ahead by' : 'behind by'} ${Math.abs((ratio - 1) * 100).toFixed(0)}%).`
      : 'You never really invested. Even small monthly amounts in an index fund grow into a fortune over decades.',
  });
  const t = CAREER_BY_ID[state.career.trackId];
  const startSalary = state.career.raisesHistory[0]?.salary ?? 1;
  const finalSalaryReal = (state.career.employed ? state.career.salary : state.career.lastSalary) / cpi;
  const growth = finalSalaryReal / startSalary;
  lines.push({
    area: 'Career',
    grade: grade(growth, 2.6, 1.9, 1.4, 1.1),
    detail: `${state.stats.promotions} promotions, ${state.stats.jobChanges} job changes. Final pay ${money(finalSalaryReal)} (today's money) as ${t.levels[state.career.level].title}: ${growth.toFixed(1)}x your starting salary.`,
  });
  if (state.stats.businessesStarted > 0) {
    const bv = businessesValue(state) / cpi;
    lines.push({
      area: 'Business',
      grade: state.stats.businessesSold > 0 || bv > 1_000_000 ? 'A' : bv > 300_000 ? 'B' : bv > 50_000 ? 'C' : bv > 0 ? 'D' : 'F',
      detail: `Started ${state.stats.businessesStarted}, sold ${state.stats.businessesSold}. Businesses now worth ${money(bv)}.`,
    });
  } else {
    lines.push({ area: 'Business', grade: '-', detail: 'You did not start a business. That is fine: a strong career plus index investing is enough.' });
  }
  const debtMonthsShare = state.stats.monthsWithCreditDebt / Math.max(1, state.month);
  lines.push({
    area: 'Debt',
    grade: creditDebt(state) > 0 ? 'D' : grade(1 - debtMonthsShare, 0.95, 0.85, 0.7, 0.5),
    detail: `Credit card debt in ${(debtMonthsShare * 100).toFixed(0)}% of months. Debt at the end: ${money(totalDebt(state) / cpi)}.`,
  });
  lines.push({
    area: 'Peace of mind',
    grade: avgStress < 32 ? 'A' : avgStress < 42 ? 'B' : avgStress < 52 ? 'C' : avgStress < 62 ? 'D' : 'F',
    detail: `Average stress ${avgStress.toFixed(0)}/100. ${state.stats.panicSells} panic sells, ${state.stats.crashesHeld} crashes held through, ${state.stats.stockTrades} individual stock trades.`,
  });

  const graded = lines.filter((l) => l.grade !== '-');
  const gpa = graded.reduce((s, l) => s + GPA[l.grade], 0) / graded.length;
  const overall: Grade = gpa >= 3.5 ? 'A' : gpa >= 2.7 ? 'B' : gpa >= 1.8 ? 'C' : gpa >= 1 ? 'D' : 'F';

  const summary: string[] = [];
  summary.push(`${state.name} ${state.retiredEarly ? 'retired early' : 'retired'} at age ${Math.floor(age(state))} with a net worth of ${money(nwReal)} in today's money.`);
  if (fiProgress(state) >= 1) summary.push('You reached financial independence: your investments can support your lifestyle for good.');
  if (shadow > 1000) {
    if (inv >= shadow * 1.02) summary.push(`Your picks beat a plain S&P 500 fund by ${money((inv - shadow) / cpi)}. Well done, but remember most professional investors fail to do this over long periods, and luck plays a big part.`);
    else if (inv < shadow * 0.98) summary.push(`If every dollar you invested had simply gone into an S&P 500 fund, you would have ${money((shadow - inv) / cpi)} more.`);
    else summary.push('Your investments tracked the S&P 500 almost exactly. Low cost, low stress, and it worked.');
  }
  const stockShare = inv > 0 ? stocksValue(state) / inv : 0;
  if (stockShare > 0.5) summary.push('Most of your money was in individual stocks. That adds risk and stress; a few stocks win big but most lag the index.');
  summary.push('The recipe that works in this game and in real life: grow your income, spend less than you earn, avoid high-interest debt, and invest the difference in low-cost broad index funds. Then let time do the work.');
  return { overall, lines, netWorthReal: nwReal, investmentsReal: inv / cpi, shadowReal: shadow / cpi, lifetimeIncomeReal, avgStress, summary };
}

export function money(x: number): string {
  const sign = x < 0 ? '-' : '';
  const a = Math.abs(x);
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${sign}$${Math.round(a / 1000)}K`;
  return `${sign}$${Math.round(a).toLocaleString('en-US')}`;
}
