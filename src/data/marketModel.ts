import type { Regime, SectorId } from '../types';

// Assumptions behind the simulated stock market. Edit with care: the test suite
// (tests/market.test.ts) checks that long-run results stay realistic.
//
// The US market moves between regimes. Each month the market's log return is
// drawn from the current regime's mean and volatility (percent per month),
// then the regime may switch according to `transitions` (monthly probabilities).

export const REGIMES: Record<Regime, { label: string; mean: number; vol: number; inflation: number; economy: number }> = {
  bull: { label: 'Bull market', mean: 1.2, vol: 3.2, inflation: 3.0, economy: 0.6 },
  normal: { label: 'Steady market', mean: 0.7, vol: 3.9, inflation: 2.7, economy: 0.2 },
  bear: { label: 'Bear market', mean: -1.7, vol: 5.4, inflation: 2.4, economy: -0.5 },
  crash: { label: 'Market crash', mean: -6.5, vol: 6.5, inflation: 1.5, economy: -0.9 },
  recovery: { label: 'Recovery', mean: 2.3, vol: 4.8, inflation: 2.0, economy: -0.1 },
};

export const TRANSITIONS: Record<Regime, Partial<Record<Regime, number>>> = {
  bull: { normal: 0.035, bear: 0.01, crash: 0.005 },
  normal: { bull: 0.045, bear: 0.018, crash: 0.005 },
  bear: { recovery: 0.07, crash: 0.025, normal: 0.03 },
  crash: { recovery: 0.4, bear: 0.25 },
  recovery: { bull: 0.07, normal: 0.07, bear: 0.01 },
};

export const MARKET_MODEL = {
  startRegime: 'normal' as Regime,
  startInflation: 0.027,
  startCashRate: 0.035,
  mortgageSpread: 0.022,
  /** Annual volatility of the international factor (on top of US market), percent. */
  intlVol: 9,
  /** Monthly decay of a company's "excess" growth toward the long-run rate. */
  growthDecay: 0.055,
  /** Monthly noise in a company's growth rate (annual units). */
  growthNoise: 0.008,
  /** Scale applied to each stock's idioVol from stocks.ts. */
  idioScale: 0.8,
  /** Company-specific volatility that young, volatile companies settle toward as they mature. */
  matureIdioVol: 0.2,
  /** Share of not-yet-reflected price news that shows up in revenue each month. */
  fundamentalCatchUp: 0.03,
  /** Monthly pull of a stock's P/E toward its fair P/E. */
  valuationPull: 0.015,
  /** How hard prices react to earnings surprises (price % per 1% surprise). */
  surpriseSensitivity: 1.3,
  /** Typical size of an earnings surprise (fraction of EPS). */
  reportNoise: 0.035,
  /** Extra randomness in how the price reacts to a report (guidance, mood). */
  reactionNoise: 0.025,
  /** Companies usually beat estimates by a little: this is the typical beat. */
  typicalBeat: 0.02,
  /** Monthly chance of company-specific shocks. */
  scandalChance: 0.0018,
  breakthroughChance: 0.0018,
  shockSize: 0.25,
  /** Monthly chance of a sector news shock. */
  sectorNewsChance: 0.05,
};

/** Sector news headlines. {sector} is replaced by the sector name. */
export const SECTOR_NEWS: Record<SectorId, { good: string[]; bad: string[] }> = {
  tech: { good: ['AI spending boom lifts software makers', 'Cloud demand surges across the tech industry'], bad: ['Regulators target big tech with new antitrust rules', 'Businesses cut software budgets'] },
  semis: { good: ['Chip shortage sends semiconductor prices soaring', 'Data centres race to buy AI chips'], bad: ['Chip export restrictions hit semiconductor makers', 'A glut of memory chips crushes prices'] },
  comm: { good: ['Digital advertising rebounds strongly', 'Streaming subscriptions jump'], bad: ['Advertisers pull back spending', 'New privacy rules hit ad targeting'] },
  discretionary: { good: ['Consumers go on a spending spree', 'Holiday sales smash records'], bad: ['Shoppers tighten their belts', 'Tariffs raise costs for retailers and carmakers'] },
  staples: { good: ['Grocery giants report record volumes', 'Input costs fall for food and drink makers'], bad: ['Ingredient costs spike for food companies', 'Shoppers switch to cheap store brands'] },
  health: { good: ['Breakthrough treatments win approval', 'Aging population boosts health spending'], bad: ['Drug price controls proposed', 'Insurers face soaring claim costs'] },
  financials: { good: ['Banks profit from healthy lending', 'Deal-making and trading volumes boom'], bad: ['Loan losses rise at banks', 'A regional bank failure rattles lenders'] },
  energy: { good: ['Oil prices spike on supply worries', 'Energy demand hits a record high'], bad: ['Oil prices collapse as supply floods in', 'Mild weather sinks natural gas prices'] },
  industrials: { good: ['Infrastructure spending bill passes', 'Factory orders jump'], bad: ['Supply-chain snarls hit manufacturers', 'Freight volumes slump'] },
  utilities: { good: ['Data centres drive record power demand', 'Regulators approve rate increases'], bad: ['Rising interest rates weigh on utilities', 'Storm damage costs pile up for utilities'] },
  realestate: { good: ['Warehouse demand soars', 'Falling rates lift property values'], bad: ['Office vacancies hit record highs', 'Higher rates squeeze property owners'] },
  materials: { good: ['Metal prices surge on strong demand', 'Gold hits a record high'], bad: ['Commodity prices tumble', 'Mining strikes and costs hit producers'] },
};
