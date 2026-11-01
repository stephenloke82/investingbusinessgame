// Buying and selling securities across the three account types.
// taxable: normal brokerage account, gains and dividends are taxed.
// k401:    workplace 401(k), funded from salary; only plan funds allowed.
// roth:    Roth IRA, funded from cash up to an annual limit; grows tax-free.

import type { Account, AccountId, GameState, Holding } from '../types';
import { ETF_BY_TICKER, isEtf, isStock, priceOf, SP500 } from './market';
import { RETIREMENT_LIMITS, TAX } from '../data/life';

export const ACCOUNT_LABELS: Record<AccountId, string> = {
  taxable: 'Brokerage (taxable)',
  k401: '401(k)',
  roth: 'Roth IRA',
};

export function emptyAccount(id: AccountId): Account {
  return { id, holdings: {}, cash: 0, contributedThisYear: 0 };
}

export function holdingShares(h: Holding | undefined): number {
  return h ? h.lots.reduce((s, l) => s + l.shares, 0) : 0;
}
export function holdingCost(h: Holding | undefined): number {
  return h ? h.lots.reduce((s, l) => s + l.cost, 0) : 0;
}

export function accountValue(state: GameState, id: AccountId): number {
  const a = state.accounts[id];
  let v = a.cash;
  for (const h of Object.values(a.holdings)) v += holdingShares(h) * priceOf(state.market, h.symbol);
  return v;
}

export function investmentsValue(state: GameState): number {
  return accountValue(state, 'taxable') + accountValue(state, 'k401') + accountValue(state, 'roth');
}

/** Value of individual stocks (not funds) across all accounts. */
export function stocksValue(state: GameState): number {
  let v = 0;
  for (const a of Object.values(state.accounts))
    for (const h of Object.values(a.holdings)) if (isStock(h.symbol)) v += holdingShares(h) * priceOf(state.market, h.symbol);
  return v;
}

/** All positions flattened, for display and analysis. */
export function positions(state: GameState): { account: AccountId; symbol: string; shares: number; value: number; cost: number }[] {
  const out: { account: AccountId; symbol: string; shares: number; value: number; cost: number }[] = [];
  for (const a of Object.values(state.accounts))
    for (const h of Object.values(a.holdings)) {
      const shares = holdingShares(h);
      if (shares <= 1e-9) continue;
      out.push({ account: a.id, symbol: h.symbol, shares, value: shares * priceOf(state.market, h.symbol), cost: holdingCost(h) });
    }
  return out;
}

export function canHoldIn(account: AccountId, symbol: string): boolean {
  if (account === 'k401') return isEtf(symbol) && !!ETF_BY_TICKER[symbol].in401k;
  return isEtf(symbol) || isStock(symbol);
}

/** Room left for new contributions this year (inflation-adjusted limit). */
export function contributionRoom(state: GameState, account: AccountId): number {
  if (account === 'taxable') return Infinity;
  const limit = (account === 'roth' ? RETIREMENT_LIMITS.roth : RETIREMENT_LIMITS.k401) * state.market.cpi;
  return Math.max(0, limit - state.accounts[account].contributedThisYear);
}

/** Record cash moving into (+) or out of (-) investments, for the "S&P 500 only" comparison. */
export function recordInvestFlow(state: GameState, dollars: number): void {
  const p = priceOf(state.market, SP500);
  if (p <= 0) return;
  state.shadowShares = Math.max(0, state.shadowShares + dollars / p);
  state.year.contributions += dollars;
}

export interface TradeResult {
  ok: boolean;
  message: string;
  shares?: number;
  dollars?: number;
  tax?: number;
}

/**
 * Buy `dollars` worth of `symbol` in `account`. Money comes from main cash for
 * taxable/roth (roth counts toward the limit) or from the account's own cash.
 */
export function buy(
  state: GameState,
  symbol: string,
  account: AccountId,
  dollars: number,
  opts: { fromAccountCash?: boolean; isContribution?: boolean; silent?: boolean } = {},
): TradeResult {
  dollars = Math.floor(dollars * 100) / 100;
  if (!(dollars > 0)) return { ok: false, message: 'Enter an amount greater than zero.' };
  if (!canHoldIn(account, symbol)) return { ok: false, message: `${symbol} is not available in your ${ACCOUNT_LABELS[account]}.` };
  const price = priceOf(state.market, symbol);
  if (price <= 0) return { ok: false, message: 'Unknown security.' };
  const acct = state.accounts[account];
  if (opts.fromAccountCash) {
    if (acct.cash + 1e-6 < dollars) return { ok: false, message: 'Not enough cash in that account.' };
    acct.cash -= dollars;
  } else {
    if (account === 'k401') return { ok: false, message: 'Your 401(k) is funded from your paycheck. Set your contribution % in Budget.' };
    if (state.cash + 1e-6 < dollars) return { ok: false, message: 'Not enough cash.' };
    if (account === 'roth') {
      const room = contributionRoom(state, 'roth');
      if (room + 1e-6 < dollars) return { ok: false, message: `Roth IRA limit: you can add ${Math.floor(room)} more this year.` };
      acct.contributedThisYear += dollars;
    }
    state.cash -= dollars;
    recordInvestFlow(state, dollars);
  }
  const shares = dollars / price;
  const h = (acct.holdings[symbol] ??= { symbol, lots: [] });
  h.lots.push({ shares, cost: dollars, month: state.month });
  if (!opts.silent) {
    if (isStock(symbol)) state.stats.stockTrades++;
    else state.stats.fundTrades++;
  }
  return { ok: true, message: `Bought ${shares.toFixed(3)} ${symbol}.`, shares, dollars };
}

/** Marginal ordinary income tax rate (federal + state) for the player's current income. */
export function marginalRate(state: GameState): number {
  const income = state.career.salary + state.family.spouseIncome + state.businesses.reduce((s, b) => s + b.ownerDraw * 12, 0);
  const mult = state.market.cpi * (state.family.married ? 2 : 1);
  const taxable = income - TAX.standardDeduction * mult;
  let rate = TAX.brackets[0][1];
  for (const [limit, r] of TAX.brackets) {
    rate = r;
    if (taxable <= limit * mult) break;
  }
  return rate + TAX.stateRate;
}

/**
 * Sell `dollars` worth (or all, if dollars >= value) of `symbol` in `account`.
 * Taxable sales pay capital gains tax (long-term rate after 12 months).
 * Proceeds go to main cash for taxable; to the account's own cash otherwise.
 */
export function sell(state: GameState, symbol: string, account: AccountId, dollars: number | 'all', opts: { silent?: boolean } = {}): TradeResult {
  const acct = state.accounts[account];
  const h = acct.holdings[symbol];
  const shares = holdingShares(h);
  if (!h || shares <= 1e-9) return { ok: false, message: `You do not own ${symbol} in that account.` };
  const price = priceOf(state.market, symbol);
  const value = shares * price;
  let toSell = dollars === 'all' || dollars >= value - 0.01 ? shares : dollars / price;
  if (!(toSell > 0)) return { ok: false, message: 'Enter an amount greater than zero.' };
  toSell = Math.min(toSell, shares);
  const proceeds = toSell * price;
  // FIFO lots
  let remaining = toSell;
  let shortGain = 0;
  let longGain = 0;
  while (remaining > 1e-12 && h.lots.length) {
    const lot = h.lots[0];
    const take = Math.min(remaining, lot.shares);
    const costPart = lot.cost * (take / lot.shares);
    const gain = take * price - costPart;
    if (state.month - lot.month >= 12) longGain += gain;
    else shortGain += gain;
    lot.shares -= take;
    lot.cost -= costPart;
    remaining -= take;
    if (lot.shares <= 1e-12) h.lots.shift();
  }
  if (h.lots.length === 0) delete acct.holdings[symbol];
  let tax = 0;
  if (account === 'taxable') {
    tax = Math.max(0, longGain) * TAX.longTermGainsRate + Math.max(0, shortGain) * marginalRate(state);
    // Losses offset gains (simplified: a loss reduces tax on this sale only, never below zero).
    const net = longGain + shortGain;
    if (net < 0) tax = 0;
    else tax = Math.min(tax, net * Math.max(TAX.longTermGainsRate, marginalRate(state)));
    state.cash += proceeds - tax;
    state.year.taxes += tax;
    recordInvestFlow(state, -proceeds);
  } else {
    acct.cash += proceeds;
  }
  if (!opts.silent) {
    if (isStock(symbol)) state.stats.stockTrades++;
    else state.stats.fundTrades++;
  }
  const gain = longGain + shortGain;
  return {
    ok: true,
    message: `Sold ${toSell.toFixed(3)} ${symbol} for $${Math.round(proceeds).toLocaleString()}${tax > 0 ? ` (tax $${Math.round(tax).toLocaleString()})` : ''}. ${gain >= 0 ? 'Gain' : 'Loss'}: $${Math.round(Math.abs(gain)).toLocaleString()}.`,
    shares: toSell,
    dollars: proceeds,
    tax,
  };
}

/**
 * Move cash out of a retirement account to main cash.
 * Before age 59.5, a 10% penalty applies; 401(k) withdrawals are also taxed as income.
 */
export function withdrawRetirement(state: GameState, account: 'k401' | 'roth', dollars: number, age: number): TradeResult {
  const acct = state.accounts[account];
  dollars = Math.min(dollars, acct.cash);
  if (!(dollars > 0)) return { ok: false, message: 'Sell investments in that account first; only its cash can be withdrawn.' };
  let cost = 0;
  if (age < 59.5) cost += dollars * TAX.earlyWithdrawalPenalty;
  if (account === 'k401') cost += dollars * marginalRate(state);
  acct.cash -= dollars;
  state.cash += dollars - cost;
  state.year.taxes += cost;
  recordInvestFlow(state, -dollars);
  return { ok: true, message: `Withdrew $${Math.round(dollars).toLocaleString()}. Taxes and penalties: $${Math.round(cost).toLocaleString()}.`, dollars, tax: cost };
}

/** Pay dividends for the month. Returns taxable dividend cash received. */
export function payDividends(state: GameState): { taxableCash: number; taxableTotal: number; total: number } {
  let taxableCash = 0;
  let taxableTotal = 0;
  let total = 0;
  for (const acct of Object.values(state.accounts)) {
    for (const h of Object.values(acct.holdings)) {
      const st = state.market.stocks[h.symbol];
      const y = st ? st.dividendYield : (ETF_BY_TICKER[h.symbol]?.dividendYield ?? 0) / 100;
      if (y <= 0) continue;
      const amount = (holdingShares(h) * priceOf(state.market, h.symbol) * y) / 12;
      if (amount <= 0) continue;
      total += amount;
      if (acct.id === 'taxable') taxableTotal += amount;
      const reinvest = acct.id !== 'taxable' || state.budget.drip;
      if (reinvest) {
        const price = priceOf(state.market, h.symbol);
        h.lots.push({ shares: amount / price, cost: amount, month: state.month });
      } else {
        taxableCash += amount;
      }
    }
  }
  return { taxableCash, taxableTotal, total };
}
