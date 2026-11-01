import { describe, expect, it } from 'vitest';
import { initMarket, stepMarket, eps, peRatio, MARKET_DRIFT } from '../src/engine/market';
import { Rng } from '../src/engine/rng';
import { STOCKS } from '../src/data/stocks';
import { ETFS } from '../src/data/etfs';
import { SECTORS } from '../src/data/sectors';

function simulate(seed: number, months: number) {
  const mk = initMarket(seed);
  const rng = new Rng(seed * 7919 + 1);
  for (let m = 1; m <= months; m++) stepMarket(mk, rng, m, 2026);
  return mk;
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('market data', () => {
  it('has at least 60 stocks and 12 funds with unique tickers', () => {
    expect(STOCKS.length).toBeGreaterThanOrEqual(60);
    expect(ETFS.length).toBeGreaterThanOrEqual(12);
    const all = [...STOCKS.map((s) => s.ticker), ...ETFS.map((e) => e.ticker)];
    expect(new Set(all).size).toBe(all.length);
  });
  it('includes the most popular names and core index funds', () => {
    for (const t of ['AAPL', 'GOOGL', 'NVDA', 'MSFT', 'AMZN', 'META', 'TSLA', 'BRK.B', 'JPM', 'V', 'WMT', 'COST', 'KO', 'DIS', 'NFLX']) expect(STOCKS.some((s) => s.ticker === t)).toBe(true);
    for (const t of ['SPY', 'VOO', 'VTI', 'QQQ', 'VT', 'VXUS', 'SCHD', 'BND', 'GLD']) expect(ETFS.some((e) => e.ticker === t)).toBe(true);
  });
  it('covers every sector with at least 3 stocks', () => {
    for (const s of SECTORS) expect(STOCKS.filter((x) => x.sector === s.id).length).toBeGreaterThanOrEqual(3);
  });
  it('starting P/E ratios are derived consistently', () => {
    const mk = initMarket(1);
    const aapl = mk.stocks.AAPL;
    expect(peRatio(aapl)).toBeGreaterThan(10);
    expect(peRatio(aapl)).toBeLessThan(80);
    expect(eps(aapl)).toBeGreaterThan(0);
    // Loss-making companies report no P/E instead of a negative one.
    const loss = STOCKS.find((s) => s.netMargin < 0);
    if (loss) expect(peRatio(mk.stocks[loss.ticker])).toBeNull();
  });
});

describe('market simulation', () => {
  it('is deterministic for a given seed', () => {
    const a = simulate(42, 60);
    const b = simulate(42, 60);
    expect(a.etfs.SPY.history).toEqual(b.etfs.SPY.history);
    expect(a.stocks.NVDA.history).toEqual(b.stocks.NVDA.history);
    const c = simulate(43, 60);
    expect(c.etfs.SPY.history).not.toEqual(a.etfs.SPY.history);
  });

  it('produces quarterly earnings with beats and misses', () => {
    const mk = simulate(7, 24);
    const reports = mk.stocks.MSFT.earnings;
    expect(reports.length).toBeGreaterThanOrEqual(8);
    const all = STOCKS.flatMap((s) => mk.stocks[s.ticker].earnings.slice(-8));
    const beats = all.filter((r) => r.eps >= r.epsEstimate).length / all.length;
    expect(beats).toBeGreaterThan(0.5);
    expect(beats).toBeLessThan(0.95);
  });

  it('never produces NaN or non-positive prices over a long run', () => {
    const mk = simulate(99, 600);
    for (const s of Object.values(mk.stocks)) for (const p of s.history) expect(Number.isFinite(p) && p > 0).toBe(true);
    for (const e of Object.values(mk.etfs)) for (const p of e.history) expect(Number.isFinite(p) && p > 0).toBe(true);
    expect(mk.cpi).toBeGreaterThan(1.5);
  });

  it('S&P 500 long-run returns, volatility and crashes look realistic', () => {
    const years = 30;
    const ann: number[] = [];
    const dds: number[] = [];
    const vols: number[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const mk = simulate(seed, years * 12);
      const tr = mk.spTotalReturn;
      ann.push(Math.pow(tr[tr.length - 1] / 100, 1 / years) - 1);
      let peak = 0;
      let dd = 0;
      for (const v of mk.etfs.SPY.history) {
        peak = Math.max(peak, v);
        dd = Math.max(dd, 1 - v / peak);
      }
      dds.push(dd);
      const yr = Array.from({ length: years }, (_, y) => tr[(y + 1) * 12] / tr[y * 12] - 1);
      const m = avg(yr);
      vols.push(Math.sqrt(avg(yr.map((r) => (r - m) ** 2))));
    }
    expect(avg(ann)).toBeGreaterThan(0.07);
    expect(avg(ann)).toBeLessThan(0.13);
    expect(avg(vols)).toBeGreaterThan(0.12);
    expect(avg(vols)).toBeLessThan(0.24);
    expect(avg(dds)).toBeGreaterThan(0.25); // real crashes happen
    expect(Math.max(...dds)).toBeLessThan(0.85); // but not total wipe-outs
    // Over 30 years the index almost always grows (the low-stress path works).
    expect(ann.filter((a) => a > 0).length / ann.length).toBeGreaterThanOrEqual(0.95);
    expect(MARKET_DRIFT).toBeGreaterThan(0);
  });

  it('is not rigged: an equal-weight basket of all stocks roughly matches the index', () => {
    const diffs: number[] = [];
    let beat = 0;
    let total = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const mk = initMarket(seed);
      const rng = new Rng(seed * 31);
      let w = 1;
      const prev: Record<string, number> = Object.fromEntries(STOCKS.map((d) => [d.ticker, mk.stocks[d.ticker].price]));
      for (let m = 1; m <= 360; m++) {
        const yields = Object.fromEntries(STOCKS.map((d) => [d.ticker, mk.stocks[d.ticker].dividendYield / 12]));
        stepMarket(mk, rng, m, 2026);
        let r = 0;
        for (const d of STOCKS) {
          const p = mk.stocks[d.ticker].price;
          r += p / prev[d.ticker] - 1 + yields[d.ticker];
          prev[d.ticker] = p;
        }
        w *= 1 + r / STOCKS.length;
      }
      const sp = Math.pow(mk.spTotalReturn[360] / 100, 1 / 30) - 1;
      diffs.push(Math.pow(w, 1 / 30) - 1 - sp);
      for (const d of STOCKS) {
        const h = mk.stocks[d.ticker].history;
        const stockAnn = Math.pow(h[h.length - 1] / h[0], 1 / 30) - 1 + d.dividendYield / 100;
        total++;
        if (stockAnn > sp) beat++;
      }
    }
    // Diversified stock picking ~= index on average (within 1.5%/yr)...
    expect(Math.abs(avg(diffs))).toBeLessThan(0.015);
    // ...but most single stocks lag the index over 30 years, and some beat it.
    expect(beat / total).toBeGreaterThan(0.1);
    expect(beat / total).toBeLessThan(0.5);
  });
});
