// Achievements and milestones. Each `check` gets the game state plus some helpers.
// Money thresholds are in start-year dollars and compared after removing inflation,
// so "$1M" means a real million in today's money.

import type { GameState } from '../types';

export interface AchievementCtx {
  netWorthReal: number;
  investmentsReal: number;
  emergencyMonths: number;
  fiProgress: number;
  savingsRate: number;
  totalDebt: number;
  creditDebt: number;
  stockShare: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  check: (s: GameState, c: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-invest', title: 'First Investment', icon: '🌱', description: 'Bought your first investment.', check: (_s, c) => c.investmentsReal > 0 },
  { id: 'index-investor', title: 'Index Investor', icon: '📈', description: 'Own a broad index fund such as an S&P 500 fund.', check: (s) => ['SPY', 'VOO', 'VTI', 'VT', 'TDF'].some((t) => Object.values(s.accounts).some((a) => a.holdings[t])) },
  { id: 'auto-invest', title: 'On Autopilot', icon: '🤖', description: 'Set up automatic monthly investing.', check: (s) => s.budget.autoInvest.length > 0 || !!s.budget.sweepSymbol },
  { id: 'match', title: 'Free Money', icon: '🎁', description: 'Contribute enough to your 401(k) to get the full employer match.', check: (s) => s.budget.k401Pct >= 4 && s.career.employed },
  { id: 'ef-1', title: 'Safety Net', icon: '🛟', description: 'One month of essential expenses saved in cash.', check: (_s, c) => c.emergencyMonths >= 1 },
  { id: 'ef-6', title: 'Fully Cushioned', icon: '🏦', description: 'Six months of expenses in your emergency fund.', check: (_s, c) => c.emergencyMonths >= 6 },
  { id: 'cc-free', title: 'Card Cleared', icon: '💳', description: 'Paid off all credit card debt.', check: (s, c) => c.creditDebt <= 0 && s.stats.monthsWithCreditDebt > 0 },
  { id: 'debt-free', title: 'Debt Free', icon: '🕊️', description: 'No debts at all (including mortgage).', check: (s, c) => c.totalDebt <= 0 && s.month > 12 },
  { id: 'nw-10k', title: '$10K Club', icon: '🥉', description: 'Net worth of $10,000 (in today\'s money).', check: (_s, c) => c.netWorthReal >= 10000 },
  { id: 'nw-100k', title: 'Six Figures', icon: '🥈', description: 'Net worth of $100,000.', check: (_s, c) => c.netWorthReal >= 100000 },
  { id: 'nw-500k', title: 'Half a Million', icon: '🥇', description: 'Net worth of $500,000.', check: (_s, c) => c.netWorthReal >= 500000 },
  { id: 'nw-1m', title: 'Millionaire', icon: '💎', description: 'Net worth of $1,000,000 in today\'s money.', check: (_s, c) => c.netWorthReal >= 1000000 },
  { id: 'nw-5m', title: 'Multi-Millionaire', icon: '👑', description: 'Net worth of $5,000,000 in today\'s money.', check: (_s, c) => c.netWorthReal >= 5000000 },
  { id: 'saver-20', title: 'Super Saver', icon: '🐿️', description: 'Savings rate of 20% or more over a year.', check: (s, c) => c.savingsRate >= 0.2 && s.history.length >= 12 },
  { id: 'saver-40', title: 'Savings Machine', icon: '🚀', description: 'Savings rate of 40% or more over a year.', check: (s, c) => c.savingsRate >= 0.4 && s.history.length >= 12 },
  { id: 'crash-hold', title: 'Diamond Hands', icon: '🧘', description: 'Held your investments through a market crash without panic-selling.', check: (s) => s.stats.crashesHeld > 0 },
  { id: 'promo-1', title: 'Moving Up', icon: '⬆️', description: 'Earned your first promotion.', check: (s) => s.stats.promotions >= 1 },
  { id: 'promo-3', title: 'Rising Star', icon: '⭐', description: 'Three promotions.', check: (s) => s.stats.promotions >= 3 },
  { id: 'certified', title: 'Lifelong Learner', icon: '🎓', description: 'Completed a certification.', check: (s) => s.career.certs.length > 0 },
  { id: 'six-figure-salary', title: 'Six-Figure Salary', icon: '💼', description: 'A salary of $100,000 (today\'s money).', check: (s) => s.career.salary / s.market.cpi >= 100000 },
  { id: 'founder', title: 'Founder', icon: '🏪', description: 'Started your first business.', check: (s) => s.stats.businessesStarted > 0 },
  { id: 'profitable', title: 'In the Black', icon: '💰', description: 'A business had a profitable month.', check: (s) => s.businesses.some((b) => b.everProfitable) },
  { id: 'empire', title: 'Empire Builder', icon: '🏙️', description: 'Five or more locations across your businesses.', check: (s) => s.businesses.reduce((n, b) => n + b.locations, 0) >= 5 },
  { id: 'exit', title: 'Successful Exit', icon: '🤝', description: 'Sold a business.', check: (s) => s.stats.businessesSold > 0 },
  { id: 'homeowner', title: 'Homeowner', icon: '🏡', description: 'Bought a home.', check: (s) => !!s.home },
  { id: 'fi-25', title: 'A Quarter of the Way', icon: '🧭', description: '25% of the way to financial independence.', check: (_s, c) => c.fiProgress >= 0.25 },
  { id: 'fi-50', title: 'Halfway Free', icon: '🌄', description: '50% of the way to financial independence.', check: (_s, c) => c.fiProgress >= 0.5 },
  { id: 'fi-100', title: 'Financially Independent', icon: '🏝️', description: 'Your investments could cover your spending forever (25x annual spending).', check: (_s, c) => c.fiProgress >= 1 },
  { id: 'calm', title: 'Calm Investor', icon: '😌', description: 'Five years in with low stress and a mostly index-fund portfolio.', check: (s, c) => s.month >= 60 && s.stress < 40 && c.investmentsReal > 10000 && c.stockShare < 0.25 },
];
