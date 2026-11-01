// =============================================================================
// ETF / FUND DATA: approximate, simulated, not live
// =============================================================================
//
// Real fund tickers with APPROXIMATE starting prices, costs and yields. After
// the game starts every price is SIMULATED by src/engine/market.ts.
// 'TDF' is a generic, made-up blended target-date fund, not a real product.
//
// Return model used by the engine for each fund, every month:
//
//   log return = marketWeight × (US market return)
//              + Σ sectorWeights[s] × (sector-specific shock for sector s)
//              + intlWeight × (international shock)
//              + extraVol noise
//              + extraDrift / 12
//              − expenseRatio / 12
//
// Funds with model 'bond' or 'gold' use their own return models instead (so
// their marketWeight is small or zero). Dividends are paid at dividendYield.
//
// To ADD a fund: copy an entry, give it a unique ticker (also unique versus
// src/data/stocks.ts) and set the weights. `in401k: true` makes it available
// inside the workplace 401(k) plan menu.
//
// Field guide:
//   expenseRatio   annual fee, % of money invested (0.03 = 0.03% = $3 per $10k)
//   dividendYield  annual dividend / price, %
//   marketWeight   exposure to the overall US stock market (1 = same as S&P 500)
//   sectorWeights  extra exposure to sector-specific swings
//   intlWeight     exposure to international (non-US) stocks
//   extraVol       extra fund-specific volatility, annual %
//   extraDrift     extra annual return before costs, % (rarely needed)
//   holdings       approximate number of underlying holdings
// =============================================================================

import type { EtfDef } from '../types';

export const ETFS: EtfDef[] = [
  // ------------------------------------------------------------ Broad US market
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF', kind: 'broad', price: 620, expenseRatio: 0.0945, dividendYield: 1.2, marketWeight: 1, holdings: 503, in401k: true, blurb: 'The original S&P 500 fund: the 500 largest US companies in one purchase.' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', kind: 'broad', price: 570, expenseRatio: 0.03, dividendYield: 1.25, marketWeight: 1, holdings: 504, in401k: true, blurb: 'Same S&P 500 index as SPY, with an even lower annual fee.' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', kind: 'broad', price: 305, expenseRatio: 0.03, dividendYield: 1.25, marketWeight: 1.02, extraVol: 1, holdings: 3600, in401k: true, blurb: 'Nearly every US public company, large and small, for a tiny fee.' },

  // ------------------------------------------------------------- International
  { ticker: 'VXUS', name: 'Vanguard Total International Stock ETF', kind: 'international', price: 70, expenseRatio: 0.05, dividendYield: 2.9, marketWeight: 0.7, intlWeight: 1, holdings: 8600, in401k: true, blurb: 'Thousands of companies outside the US, in developed and emerging markets.' },
  { ticker: 'VT', name: 'Vanguard Total World Stock ETF', kind: 'international', price: 128, expenseRatio: 0.06, dividendYield: 1.8, marketWeight: 0.6, intlWeight: 0.4, holdings: 9800, in401k: true, blurb: 'The whole world\'s stock market in a single fund, about 60% US.' },

  // --------------------------------------------------------- Target-date blend
  { ticker: 'TDF', name: 'Target Retirement Fund (blend)', kind: 'broad', price: 50, expenseRatio: 0.08, dividendYield: 2.0, marketWeight: 0.55, intlWeight: 0.3, extraVol: 1, holdings: 25000, in401k: true, blurb: 'A generic all-in-one mix of US stocks, international stocks and bonds. (Simulated example fund.)' },

  // ------------------------------------------------------------ Bonds and gold
  { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', kind: 'bond', price: 73, expenseRatio: 0.03, dividendYield: 3.7, marketWeight: 0.05, model: 'bond', holdings: 11000, in401k: true, blurb: 'Thousands of US government and company bonds: lower return, much calmer ride.' },
  { ticker: 'GLD', name: 'SPDR Gold Shares', kind: 'gold', price: 305, expenseRatio: 0.4, dividendYield: 0, marketWeight: 0, model: 'gold', holdings: 1, blurb: 'Tracks the price of gold bars held in a vault. Pays no dividend.' },

  // ------------------------------------------------------------ Style funds
  { ticker: 'QQQ', name: 'Invesco QQQ (Nasdaq-100)', kind: 'growth', price: 550, expenseRatio: 0.2, dividendYield: 0.55, marketWeight: 1.15, sectorWeights: { tech: 0.4, semis: 0.2, comm: 0.15, discretionary: 0.15 }, holdings: 101, blurb: 'The 100 largest Nasdaq companies, heavy in big tech: higher growth, bigger swings.' },
  { ticker: 'SCHD', name: 'Schwab US Dividend Equity ETF', kind: 'dividend', price: 27, expenseRatio: 0.06, dividendYield: 3.9, marketWeight: 0.85, sectorWeights: { financials: 0.15, staples: 0.15, energy: 0.1, health: 0.15, industrials: 0.1 }, holdings: 100, blurb: '100 established US companies with strong records of paying dividends.' },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', kind: 'smallcap', price: 220, expenseRatio: 0.19, dividendYield: 1.1, marketWeight: 1.15, extraVol: 8, holdings: 1950, blurb: 'About 2,000 smaller US companies: more ups and downs than the big names.' },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', kind: 'thematic', price: 70, expenseRatio: 0.75, dividendYield: 0, marketWeight: 1.5, sectorWeights: { tech: 0.5, discretionary: 0.2, health: 0.15, comm: 0.15 }, extraVol: 25, holdings: 35, blurb: 'An actively picked basket of "disruptive" growth stocks. Very high risk and higher fees.' },

  // ------------------------------------------------------------- Sector funds
  { ticker: 'XLK', name: 'Technology Select Sector SPDR', kind: 'sector', price: 250, expenseRatio: 0.08, dividendYield: 0.6, marketWeight: 1.2, sectorWeights: { tech: 1 }, holdings: 70, blurb: 'Large US technology companies only.' },
  { ticker: 'SMH', name: 'VanEck Semiconductor ETF', kind: 'sector', price: 280, expenseRatio: 0.35, dividendYield: 0.4, marketWeight: 1.5, sectorWeights: { semis: 1 }, holdings: 26, blurb: 'The biggest chipmakers in one basket. Exciting, and very volatile.' },
  { ticker: 'XLF', name: 'Financial Select Sector SPDR', kind: 'sector', price: 52, expenseRatio: 0.08, dividendYield: 1.4, marketWeight: 1.1, sectorWeights: { financials: 1 }, holdings: 72, blurb: 'Banks, insurers and payment companies.' },
  { ticker: 'XLE', name: 'Energy Select Sector SPDR', kind: 'sector', price: 87, expenseRatio: 0.08, dividendYield: 3.3, marketWeight: 0.9, sectorWeights: { energy: 1 }, holdings: 22, blurb: 'Oil and gas companies; moves with energy prices.' },
  { ticker: 'XLV', name: 'Health Care Select Sector SPDR', kind: 'sector', price: 135, expenseRatio: 0.08, dividendYield: 1.7, marketWeight: 0.75, sectorWeights: { health: 1 }, holdings: 60, blurb: 'Drugmakers, insurers and medical device companies.' },
  { ticker: 'XLY', name: 'Consumer Discretionary Select Sector SPDR', kind: 'sector', price: 220, expenseRatio: 0.08, dividendYield: 0.8, marketWeight: 1.15, sectorWeights: { discretionary: 1 }, holdings: 50, blurb: 'Things people want but can delay: cars, restaurants, retail, travel.' },
  { ticker: 'XLP', name: 'Consumer Staples Select Sector SPDR', kind: 'sector', price: 82, expenseRatio: 0.08, dividendYield: 2.6, marketWeight: 0.6, sectorWeights: { staples: 1 }, holdings: 37, blurb: 'Groceries, drinks and household goods people buy in any economy.' },
  { ticker: 'XLU', name: 'Utilities Select Sector SPDR', kind: 'sector', price: 82, expenseRatio: 0.08, dividendYield: 2.8, marketWeight: 0.5, sectorWeights: { utilities: 1 }, holdings: 31, blurb: 'Electric and gas utilities: slow, steady and dividend-paying.' },
  { ticker: 'VNQ', name: 'Vanguard Real Estate ETF', kind: 'sector', price: 90, expenseRatio: 0.13, dividendYield: 3.9, marketWeight: 0.9, sectorWeights: { realestate: 1 }, holdings: 155, blurb: 'Real estate investment trusts (REITs) that own offices, warehouses, towers and apartments.' },
];
