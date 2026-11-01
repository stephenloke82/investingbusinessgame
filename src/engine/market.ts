// Seeded stock-market simulation.
//
// Each month:
//  1. The US market's log return `m` is drawn from the current regime.
//  2. Each sector gets its own shock; international stocks get a shock.
//  3. Each stock's log return =
//        drift + beta*(m - drift) + sector shock + company noise
//        + pull of P/E toward a fair P/E (based on its growth)
//        + earnings-report reaction (in report months) + rare big news
//  4. Company fundamentals (revenue, growth, margins) evolve with the economy.
//
// Every stock has the same long-run expected drift as the market. Nothing is
// rigged for or against stock picking: single stocks simply carry much more
// company-specific risk, so a few win big and many lag.

import type { EarningsReport, EtfDef, MarketState, Regime, SectorId, StockDef, StockState } from '../types';
import { STOCKS } from '../data/stocks';
import { ETFS } from '../data/etfs';
import { SECTORS, SECTOR_BY_ID } from '../data/sectors';
import { MARKET_MODEL, REGIMES, SECTOR_NEWS, TRANSITIONS } from '../data/marketModel';
import { Rng } from './rng';
import { HOME_RULES } from '../data/life';

export const STOCK_BY_TICKER: Record<string, StockDef> = Object.fromEntries(STOCKS.map((s) => [s.ticker, s]));
export const ETF_BY_TICKER: Record<string, EtfDef> = Object.fromEntries(ETFS.map((e) => [e.ticker, e]));
export const SP500 = 'SPY';

export function isEtf(symbol: string): boolean {
  return symbol in ETF_BY_TICKER;
}
export function isStock(symbol: string): boolean {
  return symbol in STOCK_BY_TICKER;
}
export function securityName(symbol: string): string {
  return STOCK_BY_TICKER[symbol]?.name ?? ETF_BY_TICKER[symbol]?.name ?? symbol;
}

/** Stationary distribution of the regime chain, used to get the long-run expected market return. */
function stationary(): Record<Regime, number> {
  const regimes = Object.keys(REGIMES) as Regime[];
  let p: Record<Regime, number> = Object.fromEntries(regimes.map((r) => [r, 1 / regimes.length])) as Record<Regime, number>;
  for (let i = 0; i < 2000; i++) {
    const next = Object.fromEntries(regimes.map((r) => [r, 0])) as Record<Regime, number>;
    for (const r of regimes) {
      const t = TRANSITIONS[r];
      let stay = 1;
      for (const [to, q] of Object.entries(t) as [Regime, number][]) {
        next[to] += p[r] * q;
        stay -= q;
      }
      next[r] += p[r] * stay;
    }
    p = next;
  }
  return p;
}

const STATIONARY = stationary();
const REGIME_IDS = Object.keys(REGIMES) as Regime[];
/** Long-run expected monthly LOG return of the US market (fraction). */
export const MARKET_DRIFT = REGIME_IDS.reduce((s, r) => s + STATIONARY[r] * REGIMES[r].mean, 0) / 100;
/** Monthly variance of the market's log return (including regime swings). */
export const MARKET_VAR =
  REGIME_IDS.reduce((s, r) => s + STATIONARY[r] * ((REGIMES[r].vol / 100) ** 2 + (REGIMES[r].mean / 100) ** 2), 0) - MARKET_DRIFT ** 2;
const SP_YIELD_MONTHLY = (ETFS.find((e) => e.ticker === 'SPY')?.dividendYield ?? 1.2) / 1200;
/**
 * Expected monthly ARITHMETIC total return (price + dividends) of the market.
 * Every stock and equity fund is given this same expected total return, so on
 * average a dollar in any of them is expected to end up worth the same as a
 * dollar in the index. Riskier holdings have a wider range of outcomes and a
 * lower typical (median) outcome. That is "volatility drag", not a rigged game.
 */
export const EXPECTED_TOTAL_MONTHLY = MARKET_DRIFT + 0.5 * MARKET_VAR + SP_YIELD_MONTHLY;
/** Long-run growth rate a typical company's earnings drift toward (annual fraction). */
export const LONG_RUN_GROWTH = Math.exp(MARKET_DRIFT * 12) - 1;
/** Continuous annual decay rate of excess growth (used to price growth). */
const KAPPA = -12 * Math.log(1 - MARKET_MODEL.growthDecay);
/** Variance per month from rare scandals and breakthroughs. */
const JUMP_VAR = (MARKET_MODEL.scandalChance + MARKET_MODEL.breakthroughChance) * MARKET_MODEL.shockSize ** 2 * 1.08;
/** Variance per month added by earnings-report reactions (about 4 reports a year). */
const REPORT_VAR = ((MARKET_MODEL.surpriseSensitivity * MARKET_MODEL.reportNoise) ** 2 + MARKET_MODEL.reactionNoise ** 2) / 3;

/** Monthly log-price drift of a stock so its expected total return matches the market. */
export function stockLogDrift(st: StockState, sector: SectorId): number {
  const sec = SECTOR_BY_ID[sector];
  // Variance of permanent price changes. This is what causes long-run "volatility drag".
  const v = st.beta ** 2 * MARKET_VAR + (sec.vol / 100) ** 2 / 12 + st.idioVol ** 2 / 12 + JUMP_VAR + REPORT_VAR;
  return EXPECTED_TOTAL_MONTHLY - st.dividendYield / 12 - 0.5 * v;
}

/** Long-run earnings growth (annual) consistent with the stock's price drift. */
function stockLongRunGrowth(st: StockState, sector: SectorId): number {
  return Math.exp(12 * stockLogDrift(st, sector)) - 1;
}

/** Monthly log-price drift of an equity fund, same logic as stocks. */
function etfLogDrift(def: EtfDef): number {
  let v = def.marketWeight ** 2 * MARKET_VAR + ((def.extraVol ?? 0) / 100) ** 2 / 12 + ((def.intlWeight ?? 0) * (MARKET_MODEL.intlVol / 100)) ** 2 / 12;
  let sectorSum = 0;
  for (const [s, w] of Object.entries(def.sectorWeights ?? {}) as [SectorId, number][]) {
    v += (w * (SECTOR_BY_ID[s].vol / 100)) ** 2 / 12;
    sectorSum += w;
  }
  // Funds that are only partly in stocks (e.g. target-date blends) get proportionally less of the equity return.
  const equityShare = Math.min(1, def.marketWeight + (def.intlWeight ?? 0) + sectorSum);
  const bondPart = (1 - equityShare) * 0.04 / 12;
  return equityShare * EXPECTED_TOTAL_MONTHLY + bondPart - def.dividendYield / 1200 - 0.5 * v + (def.extraDrift ?? 0) / 1200;
}

/** Fair P/E before market-wide scaling: higher expected growth deserves a higher multiple. */
function rawFairPE(sector: SectorId, growth: number): number {
  const base = SECTOR_BY_ID[sector].basePE;
  const excess = Math.max(-0.25, Math.min(0.9, growth - LONG_RUN_GROWTH));
  return base * Math.exp(excess / KAPPA);
}

/**
 * Market-wide scale so that, at the start, the median stock is fairly valued.
 * This means only RELATIVE valuations matter; the game does not assume the
 * whole market is over- or under-priced on day one.
 */
const PE_SCALE: number = (() => {
  const ratios = STOCKS.filter((s) => s.netMargin > 0)
    .map((s) => {
      const pe = s.marketCapB / ((s.revenueB * s.netMargin) / 100);
      return pe / rawFairPE(s.sector, s.revenueGrowth / 100);
    })
    .sort((a, b) => a - b);
  return ratios.length ? ratios[Math.floor(ratios.length / 2)] : 1;
})();

/** Average "economy" reading over the long run, so growth is not biased up or down. */
const ECONOMY_MEAN = REGIME_IDS.reduce((s, r) => s + STATIONARY[r] * REGIMES[r].economy, 0);

/**
 * Fair P/E for a stock. Stocks are valued RELATIVE to the market: when the whole
 * market rallies beyond its normal trend, every fair multiple rises with it
 * (market.valuation tracks that), so individual stocks share in market moves.
 */
export function fairPE(st: StockState, def: StockDef, market?: MarketState): number {
  return rawFairPE(def.sector, st.growth) * PE_SCALE * Math.exp(market?.valuation ?? 0);
}

export function eps(st: StockState): number {
  return (st.revenueB * st.margin) / st.sharesB;
}
export function peRatio(st: StockState): number | null {
  const e = eps(st);
  return e > 0 ? st.price / e : null;
}

const round = (x: number, d = 4) => {
  const f = 10 ** d;
  return Math.round(x * f) / f;
};

function quarterLabel(startYear: number, month: number): string {
  // month is the absolute month index; month 1 = January of startYear (may be <= 0 for history).
  const m0 = month - 1;
  const year = startYear + Math.floor(m0 / 12);
  const q = Math.floor((((m0 % 12) + 12) % 12) / 3) + 1;
  return `Q${q} ${year}`;
}

export function initMarket(seed: number, startYear = 2026): MarketState {
  const rng = new Rng(seed ^ 0x5eed);
  const stocks: Record<string, StockState> = {};
  STOCKS.forEach((d, i) => {
    const sharesB = d.marketCapB / d.price;
    const margin = d.netMargin / 100;
    const st: StockState = {
      ticker: d.ticker,
      price: d.price,
      history: [d.price],
      sharesB,
      revenueB: d.revenueB,
      growth: d.revenueGrowth / 100,
      margin,
      targetMargin: margin > 0.02 ? margin : 0.07,
      dividendYield: d.dividendYield / 100,
      debtToEquity: d.debtToEquity,
      beta: d.beta,
      idioVol: (d.idioVol / 100) * MARKET_MODEL.idioScale,
      reportPhase: i % 3,
      earnings: [],
      newsShock: 0,
      intrinsic: 0,
    };
    // Back-fill four quarters of "history" so the player can research from day one.
    const qEps = eps(st) / 4;
    const qRev = d.revenueB / 4;
    for (let q = 4; q >= 1; q--) {
      const back = Math.pow(1 + st.growth, -q / 4 + 0.25);
      const est = qEps * back * (1 - 0.02 + rng.normal() * 0.01);
      const actual = qEps * back * (1 + rng.normal() * 0.04);
      st.earnings.push({
        month: -3 * q + 1 + st.reportPhase,
        label: quarterLabel(startYear, -3 * q + 1 + st.reportPhase),
        revenueB: round(qRev * back, 3),
        eps: round(actual, 3),
        epsEstimate: round(est, 3),
        revenueEstimateB: round(qRev * back * (1 - 0.005), 3),
        reaction: round((actual / est - 1 - MARKET_MODEL.typicalBeat) * MARKET_MODEL.surpriseSensitivity * 100, 1),
      });
    }
    stocks[d.ticker] = st;
  });
  const etfs: MarketState['etfs'] = {};
  for (const e of ETFS) etfs[e.ticker] = { ticker: e.ticker, price: e.price, history: [e.price] };
  return {
    regime: MARKET_MODEL.startRegime,
    regimeMonths: 0,
    cpi: 1,
    inflation: MARKET_MODEL.startInflation,
    cashRate: MARKET_MODEL.startCashRate,
    mortgageRate: MARKET_MODEL.startCashRate + MARKET_MODEL.mortgageSpread + 0.01,
    economy: REGIMES[MARKET_MODEL.startRegime].economy,
    stocks,
    etfs,
    spTotalReturn: [100],
    marketReturns: [],
    valuation: 0,
    housingIndex: 1,
    housingIndexChange: 0,
    sectorNews: {},
    lastSectorShock: {},
    lastIntlShock: 0,
    news: [],
  };
}

export function priceOf(market: MarketState, symbol: string): number {
  return market.stocks[symbol]?.price ?? market.etfs[symbol]?.price ?? 0;
}

/** Annual dividend yield (fraction) of any security right now. */
export function yieldOf(market: MarketState, symbol: string): number {
  if (market.stocks[symbol]) return market.stocks[symbol].dividendYield;
  const e = ETF_BY_TICKER[symbol];
  return e ? e.dividendYield / 100 : 0;
}

function nextRegime(rng: Rng, regime: Regime, drawdown: number): Regime {
  const r = rng.next();
  let acc = 0;
  for (const [to, p0] of Object.entries(TRANSITIONS[regime]) as [Regime, number][]) {
    let p = p0;
    // Deep in a slump, cheap prices make a recovery more likely and further crashes less likely.
    if (drawdown > 0.3) {
      if (to === 'recovery') p *= 1 + (drawdown - 0.3) * 8;
      if (to === 'crash' || to === 'bear') p *= Math.max(0.2, 1 - (drawdown - 0.3) * 3);
    }
    acc += p;
    if (r < acc) return to;
  }
  return regime;
}

export interface MarketStepResult {
  marketReturn: number;
  spTotalReturnMonth: number;
  regimeChanged: boolean;
  reports: { ticker: string; report: EarningsReport }[];
}

/**
 * Advance the market by one month. `month` is the new absolute month index
 * (1 = first January). Mutates `market`.
 */
export function stepMarket(market: MarketState, rng: Rng, month: number, startYear: number): MarketStepResult {
  const M = MARKET_MODEL;
  const reg = REGIMES[market.regime];
  const m = (reg.mean + reg.vol * rng.normal()) / 100;
  market.marketReturns.push(round(m, 5));
  market.valuation += m - MARKET_DRIFT;
  const sqrt12 = Math.sqrt(12);

  // Macro: economy, inflation, rates
  market.economy += (reg.economy - market.economy) * 0.2 + rng.normal() * 0.03;
  market.economy = Math.max(-1, Math.min(1, market.economy));
  market.inflation = 0.88 * market.inflation + 0.12 * (reg.inflation / 100) + rng.normal() * 0.0015;
  market.inflation = Math.max(-0.01, Math.min(0.09, market.inflation));
  market.cpi *= 1 + market.inflation / 12;
  const prevRate = market.cashRate;
  const targetRate = Math.max(0.002, Math.min(0.07, market.inflation + 0.008 + (market.regime === 'crash' || market.regime === 'bear' ? -0.012 : 0)));
  market.cashRate += (targetRate - market.cashRate) * 0.08;
  market.mortgageRate = market.cashRate + M.mortgageSpread + 0.01;
  const rateChange = market.cashRate - prevRate;

  // Home prices: slow real growth, dips in bad markets.
  const housingShock = market.regime === 'crash' ? -0.012 : market.regime === 'bear' ? -0.004 : market.regime === 'recovery' ? 0.002 : 0.0005;
  market.housingIndexChange = HOME_RULES.realGrowthPct / 1200 + housingShock + rng.normal() * 0.004 - rateChange * 0.5;
  market.housingIndex *= 1 + market.housingIndexChange;

  // Sector & international shocks
  const sectorShock: Partial<Record<SectorId, number>> = {};
  for (const s of SECTORS) {
    const news = market.sectorNews[s.id] ?? 0;
    sectorShock[s.id] = ((s.vol / 100) / sqrt12) * rng.normal() + news;
    market.sectorNews[s.id] = news * 0.55;
    if (Math.abs(market.sectorNews[s.id]!) < 0.001) delete market.sectorNews[s.id];
  }
  if (rng.chance(M.sectorNewsChance)) {
    const s = rng.pick(SECTORS);
    const good = rng.chance(0.5);
    const size = rng.range(0.03, 0.08) * (good ? 1 : -1);
    market.sectorNews[s.id] = (market.sectorNews[s.id] ?? 0) + size;
    const headline = rng.pick(SECTOR_NEWS[s.id][good ? 'good' : 'bad']);
    market.news.push({ month, text: `${headline} (${s.name})`, tone: good ? 'good' : 'bad' });
  }
  const intlShock = ((M.intlVol / 100) / sqrt12) * rng.normal();
  market.lastSectorShock = sectorShock;
  market.lastIntlShock = intlShock;

  // Stocks
  const reports: MarketStepResult['reports'] = [];
  const reportMonthInQuarter = (month - 1) % 3;
  for (const def of STOCKS) {
    const st = market.stocks[def.ticker];
    if (!st) continue;
    const sector = SECTOR_BY_ID[def.sector];
    // Fundamentals
    const excessDecay = (st.growth - stockLongRunGrowth(st, def.sector)) * M.growthDecay;
    st.growth = st.growth - excessDecay + rng.normal() * M.growthNoise;
    st.growth = Math.max(-0.3, Math.min(1.2, st.growth));
    const cyc = sector.cyclicality;
    const effGrowth = Math.max(-0.6, st.growth + cyc * (market.economy - ECONOMY_MEAN) * 0.08);
    st.revenueB *= Math.exp(Math.log(1 + effGrowth) / 12 + rng.normal() * 0.008);
    st.margin += (st.targetMargin - st.margin) * 0.03 + rng.normal() * 0.0015 + (market.economy < 0 ? cyc * market.economy * 0.0015 : 0);
    st.margin = Math.max(-0.6, Math.min(0.65, st.margin));

    // Company-specific risk fades slowly as companies mature.
    st.idioVol += (Math.min((def.idioVol / 100) * M.idioScale, M.matureIdioVol) - st.idioVol) * 0.008;

    // Price news that changes what the company is worth (permanent): sector and company shocks.
    let permanent = (sectorShock[def.sector] ?? 0) + (st.idioVol / sqrt12) * rng.normal();
    if (rng.chance(M.scandalChance)) {
      permanent -= M.shockSize * rng.range(0.7, 1.4);
      market.news.push({ month, text: `${def.name} (${def.ticker}) plunges on a scandal and lawsuits`, tone: 'bad', ticker: def.ticker });
    } else if (rng.chance(M.breakthroughChance)) {
      permanent += M.shockSize * rng.range(0.7, 1.4);
      market.news.push({ month, text: `${def.name} (${def.ticker}) soars on a major breakthrough`, tone: 'good', ticker: def.ticker });
    }
    // High-beta stocks amplify market moves for good (the market-wide part lives in market.valuation).
    permanent += (st.beta - 1) * (m - MARKET_DRIFT);
    // Investors price news in immediately; revenue and profits catch up over the next few years.
    st.intrinsic += permanent;
    const catchUp = st.intrinsic * M.fundamentalCatchUp;
    st.intrinsic -= catchUp;
    st.revenueB *= Math.exp(catchUp);

    let r = stockLogDrift(st, def.sector) + (m - MARKET_DRIFT) + permanent;
    // Temporary mispricing (from beta swings, earnings reactions, hype) fades toward fair value.
    const e = eps(st);
    let gap: number;
    if (e > 0) {
      gap = Math.log(st.price / (e * fairPE(st, def, market) * Math.exp(st.intrinsic)));
    } else {
      // Loss-makers are valued on sales against a sector-typical price/sales ratio.
      const ps = (st.price * st.sharesB) / st.revenueB;
      gap = Math.log(ps / (fairPE(st, def, market) * st.targetMargin * 0.6 * Math.exp(st.intrinsic)));
    }
    r += Math.max(-0.03, Math.min(0.03, -M.valuationPull * gap));
    r += st.newsShock;
    st.newsShock *= 0.5;
    if (Math.abs(st.newsShock) < 0.001) st.newsShock = 0;

    // Quarterly earnings report
    if (reportMonthInQuarter === st.reportPhase) {
      // Analysts forecast from the company's underlying trend (and usually aim a little low).
      const trendEps = eps(st) / 4;
      const analystError = rng.normal() * 0.01;
      const estimate = trendEps * (1 - M.typicalBeat) * (1 + analystError);
      const noise = rng.normal() * M.reportNoise;
      const actual = trendEps * (1 + noise);
      const quarterRevenue = (st.revenueB / 4) * (1 + noise * 0.4);
      const revEst = (st.revenueB / 4) * (1 - 0.005) * (1 + analystError);
      const surprise = estimate !== 0 ? (actual - estimate) / Math.abs(estimate) : 0;
      let reaction = (Math.max(-0.5, Math.min(0.5, surprise)) - M.typicalBeat) * M.surpriseSensitivity + rng.normal() * M.reactionNoise;
      reaction = Math.max(-0.25, Math.min(0.25, reaction));
      // Earnings news is news about the company's value, so it is permanent too.
      r += Math.log(1 + reaction);
      st.intrinsic += Math.log(1 + reaction);
      const report: EarningsReport = {
        month,
        label: quarterLabel(startYear, month),
        revenueB: round(quarterRevenue, 3),
        eps: round(actual, 3),
        epsEstimate: round(estimate, 3),
        revenueEstimateB: round(revEst, 3),
        reaction: round(reaction * 100, 1),
      };
      st.earnings.push(report);
      if (st.earnings.length > 12) st.earnings.shift();
      reports.push({ ticker: def.ticker, report });
      // Dividend policy follows profits.
      if (st.margin < 0 && st.dividendYield > 0) {
        st.dividendYield = 0;
        market.news.push({ month, text: `${def.name} suspends its dividend after losses`, tone: 'bad', ticker: def.ticker });
      } else if (st.margin > 0.05 && st.dividendYield === 0 && def.dividendYield > 0) {
        st.dividendYield = def.dividendYield / 100;
        market.news.push({ month, text: `${def.name} restores its dividend`, tone: 'good', ticker: def.ticker });
      }
    }

    r = Math.max(-0.75, Math.min(1.0, r));
    st.price = Math.max(0.5, st.price * Math.exp(r));
    st.history.push(round(st.price, 2));
  }

  // ETFs and funds
  for (const def of ETFS) {
    const et = market.etfs[def.ticker];
    if (!et) continue;
    let r: number;
    if (def.model === 'bond') {
      r = -6 * rateChange + rng.normal() * (3.5 / 100 / sqrt12) + (market.regime === 'crash' ? 0.008 : 0) + 0.0002;
    } else if (def.model === 'gold') {
      r = 0.0045 + rng.normal() * (14 / 100 / sqrt12) - 0.1 * m + (market.regime === 'crash' ? 0.012 : 0);
    } else {
      let sectorPart = 0;
      for (const [s, w] of Object.entries(def.sectorWeights ?? {}) as [SectorId, number][]) {
        sectorPart += w * (sectorShock[s] ?? 0);
      }
      const intlW = def.intlWeight ?? 0;
      r = etfLogDrift(def) + def.marketWeight * (m - MARKET_DRIFT) + sectorPart + intlW * intlShock + ((def.extraVol ?? 0) / 100 / sqrt12) * rng.normal();
    }
    r -= def.expenseRatio / 1200;
    et.price = Math.max(0.5, et.price * Math.exp(r));
    et.history.push(round(et.price, 2));
  }

  // S&P total return index (price + dividends)
  const spDef = ETF_BY_TICKER[SP500];
  const spHist = market.etfs[SP500].history;
  const spPriceRet = spHist[spHist.length - 1] / spHist[spHist.length - 2] - 1;
  const spTR = spPriceRet + (spDef.dividendYield / 100) / 12;
  const lastTR = market.spTotalReturn[market.spTotalReturn.length - 1];
  market.spTotalReturn.push(round(lastTR * (1 + spTR), 4));

  // Market headlines
  if (m < -0.07) market.news.push({ month, text: `Stocks plunge: the S&P 500 fell ${(spPriceRet * -100).toFixed(1)}% this month`, tone: 'bad' });
  else if (m > 0.06) market.news.push({ month, text: `Stocks rally: the S&P 500 rose ${(spPriceRet * 100).toFixed(1)}% this month`, tone: 'good' });

  // Regime change
  const newRegime = nextRegime(rng, market.regime, spDrawdown(market));
  const regimeChanged = newRegime !== market.regime;
  if (regimeChanged) {
    market.regime = newRegime;
    market.regimeMonths = 0;
    const tone = newRegime === 'bear' || newRegime === 'crash' ? 'bad' : newRegime === 'normal' ? 'neutral' : 'good';
    market.news.push({ month, text: `Market mood shifts: ${REGIMES[newRegime].label.toLowerCase()}`, tone });
  } else {
    market.regimeMonths++;
  }
  if (market.news.length > 80) market.news.splice(0, market.news.length - 80);
  return { marketReturn: m, spTotalReturnMonth: spTR, regimeChanged, reports };
}

/** Drawdown of the S&P 500 fund from its all-time high, as a positive fraction. */
export function spDrawdown(market: MarketState): number {
  const h = market.etfs[SP500].history;
  const peak = Math.max(...h);
  return 1 - h[h.length - 1] / peak;
}
