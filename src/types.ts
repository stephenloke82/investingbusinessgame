// Shared types for the whole game. Data files in src/data/ are typed against
// these interfaces, so editing content stays safe: the compiler will flag typos.

// ---------------------------------------------------------------------------
// Market data (static, editable in src/data/stocks.ts and src/data/etfs.ts)
// ---------------------------------------------------------------------------

export type SectorId =
  | 'tech'
  | 'semis'
  | 'comm'
  | 'discretionary'
  | 'staples'
  | 'health'
  | 'financials'
  | 'energy'
  | 'industrials'
  | 'utilities'
  | 'realestate'
  | 'materials';

export interface SectorDef {
  id: SectorId;
  name: string;
  /** Sensitivity of the whole sector to the overall market (1 = moves with market). */
  beta: number;
  /** Annualised volatility of the sector-specific shock (not explained by the market). */
  vol: number;
  /** Typical "fair" price/earnings multiple for a company growing at the long-run rate. */
  basePE: number;
  /** How much the sector's revenue swings with the economy (0 = defensive, 1.5 = very cyclical). */
  cyclicality: number;
}

/** Approximate starting fundamentals for one real company. All money in USD. */
export interface StockDef {
  ticker: string;
  name: string;
  sector: SectorId;
  /** Starting share price (approximate). */
  price: number;
  /** Market capitalisation in billions (approximate). */
  marketCapB: number;
  /** Trailing twelve-month revenue in billions (approximate). */
  revenueB: number;
  /** Year-over-year revenue growth, percent (e.g. 12 = 12%). */
  revenueGrowth: number;
  /** Net profit margin, percent. Can be negative. */
  netMargin: number;
  /** Dividend yield, percent. 0 if none. */
  dividendYield: number;
  /** Total debt divided by shareholder equity (approximate). */
  debtToEquity: number;
  /** Market beta (1 = moves with the market). */
  beta: number;
  /** Annualised company-specific volatility, percent (typically 15-50). */
  idioVol: number;
  /** One-line plain-English description shown to the player. */
  blurb: string;
}

export type EtfKind = 'broad' | 'international' | 'sector' | 'dividend' | 'growth' | 'bond' | 'gold' | 'smallcap' | 'thematic';

export interface EtfDef {
  ticker: string;
  name: string;
  kind: EtfKind;
  price: number;
  /** Annual expense ratio, percent (e.g. 0.03). */
  expenseRatio: number;
  dividendYield: number;
  /** How much of the US market factor the fund carries. */
  marketWeight: number;
  /** Sector exposures (weights on sector-specific shocks). */
  sectorWeights?: Partial<Record<SectorId, number>>;
  /** Exposure to the international factor (0-1). */
  intlWeight?: number;
  /** Extra fund-specific volatility, annualised percent. */
  extraVol?: number;
  /** Annual extra drift, percent, before costs (used for bonds/gold that do not follow stocks). */
  extraDrift?: number;
  /** Special return models. */
  model?: 'bond' | 'gold';
  /** Number of holdings shown to the player (for teaching diversification). */
  holdings: number;
  /** Allowed inside a workplace 401(k) plan menu. */
  in401k?: boolean;
  blurb: string;
}

// ---------------------------------------------------------------------------
// Market state (dynamic, saved)
// ---------------------------------------------------------------------------

export type Regime = 'bull' | 'normal' | 'bear' | 'crash' | 'recovery';

export interface EarningsReport {
  /** Absolute month index of the report. */
  month: number;
  label: string; // e.g. "Q2 2027"
  revenueB: number;
  eps: number;
  epsEstimate: number;
  revenueEstimateB: number;
  /** Price reaction in percent on the report. */
  reaction: number;
}

export interface StockState {
  ticker: string;
  price: number;
  /** Monthly closing prices, one per elapsed month (index 0 = game start). */
  history: number[];
  sharesB: number;
  /** TTM revenue, billions. */
  revenueB: number;
  /** Current annual revenue growth rate as a fraction (0.12 = 12%). */
  growth: number;
  /** Net margin as a fraction. */
  margin: number;
  /** Long-run margin the company drifts toward. */
  targetMargin: number;
  dividendYield: number;
  debtToEquity: number;
  beta: number;
  idioVol: number;
  /** Month offset (0, 1 or 2) inside each quarter when this company reports. */
  reportPhase: number;
  earnings: EarningsReport[];
  /** Temporary shock injected by news (decays). */
  newsShock: number;
  /** Price news not yet reflected in revenue (log). Revenue catches up over time. */
  intrinsic: number;
}

export interface EtfState {
  ticker: string;
  price: number;
  history: number[];
}

export interface MarketState {
  regime: Regime;
  regimeMonths: number;
  /** Consumer price index, 1.0 at game start. */
  cpi: number;
  /** Current annual inflation rate (fraction). */
  inflation: number;
  /** Savings / cash interest rate, annual fraction. */
  cashRate: number;
  /** Mortgage rate, annual fraction. */
  mortgageRate: number;
  /** Real (after-inflation) home price index, 1.0 at start. */
  housingIndex: number;
  /** Last month's real change in home prices (fraction). */
  housingIndexChange: number;
  /** Economy strength -1 (deep recession) .. +1 (boom). */
  economy: number;
  stocks: Record<string, StockState>;
  etfs: Record<string, EtfState>;
  /** S&P-style total-return index (dividends reinvested), 100 at start, monthly history. */
  spTotalReturn: number[];
  /** Monthly market (price) returns, for reference. */
  marketReturns: number[];
  /** Cumulative log deviation of the market from its long-run trend (scales fair P/E ratios). */
  valuation: number;
  /** Persistent sector shocks from news events. */
  sectorNews: Partial<Record<SectorId, number>>;
  /** Most recent month's sector shock returns (used by ETFs). */
  lastSectorShock: Partial<Record<SectorId, number>>;
  lastIntlShock: number;
  news: NewsItem[];
}

export interface NewsItem {
  month: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  ticker?: string;
}

// ---------------------------------------------------------------------------
// Player finances
// ---------------------------------------------------------------------------

export type AccountId = 'taxable' | 'k401' | 'roth';

export interface Lot {
  shares: number;
  /** Total cost basis for the lot. */
  cost: number;
  month: number;
}

export interface Holding {
  symbol: string;
  lots: Lot[];
}

export interface Account {
  id: AccountId;
  holdings: Record<string, Holding>;
  /** Uninvested cash sitting in the account. */
  cash: number;
  /** Contributions made this calendar year (for limits). */
  contributedThisYear: number;
}

export type DebtKind = 'credit' | 'student' | 'car' | 'mortgage' | 'business' | 'personal';

export interface Debt {
  id: string;
  kind: DebtKind;
  label: string;
  balance: number;
  /** Annual interest rate as a fraction. */
  rate: number;
  /** Required monthly payment (credit cards recompute this from balance). */
  minPayment: number;
}

export type HousingId = string;
export type LifestyleId = 'frugal' | 'moderate' | 'comfortable' | 'lavish';
export type TransportId = string;

export interface Home {
  value: number;
  purchasePrice: number;
  mortgageId?: string;
  propertyTaxRate: number;
  label: string;
}

export interface AutoInvestRule {
  id: string;
  symbol: string;
  account: AccountId;
  /** Monthly amount in today's dollars. */
  amount: number;
}

export interface BudgetSettings {
  housing: HousingId;
  transport: TransportId;
  lifestyle: LifestyleId;
  /** Insurance toggles. */
  insurance: { health: boolean; renters: boolean; disability: boolean; life: boolean; umbrella: boolean };
  /** Percent of salary contributed to 401(k) (0-50). */
  k401Pct: number;
  /** Fund the 401(k) contributions buy. */
  k401Fund: string;
  /** Extra monthly payment toward the highest-interest debt. */
  extraDebtPayment: number;
  /** Emergency fund target in months of expenses. */
  emergencyMonths: number;
  /** Automatic monthly investing rules (dollar-cost averaging). */
  autoInvest: AutoInvestRule[];
  /** Sweep: invest any cash above the emergency fund target into this symbol (or '' for off). */
  sweepSymbol: string;
  sweepAccount: AccountId;
  /** Reinvest dividends automatically (DRIP). */
  drip: boolean;
}

// ---------------------------------------------------------------------------
// Career
// ---------------------------------------------------------------------------

export interface CareerLevel {
  title: string;
  /** Annual salary in start-year dollars. */
  salary: number;
  /** Minimum skill (0-100) to be promoted into this level. */
  minSkill: number;
  /** Minimum months in the previous level. */
  minMonths: number;
  /** Certification ids required to reach this level. */
  certs?: string[];
}

export interface CareerTrack {
  id: string;
  name: string;
  requiresDegree: boolean;
  blurb: string;
  levels: CareerLevel[];
  /** 401(k) employer match as percent of salary (e.g. 4 = matches up to 4%). */
  match401k: number;
  /** Does the employer provide health insurance? */
  healthBenefits: boolean;
  /** Layoff risk multiplier in recessions. */
  layoffRisk: number;
}

export interface CertDef {
  id: string;
  name: string;
  track: string | '*';
  cost: number;
  /** Months of study needed. */
  months: number;
  minSkill: number;
  /** Skill boost on completion. */
  skillBoost: number;
  blurb: string;
}

export type WorkEffort = 'coast' | 'steady' | 'hustle';

export interface CareerState {
  trackId: string;
  level: number;
  employed: boolean;
  /** Salary actually paid now (annual, nominal). */
  salary: number;
  employer: string;
  monthsInLevel: number;
  monthsEmployed: number;
  totalExperience: number;
  /** 0-100 */
  skill: number;
  /** 0-100, current performance rating. */
  performance: number;
  /** 0-100, professional network/reputation. */
  reputation: number;
  effort: WorkEffort;
  certs: string[];
  studying?: { certId: string; monthsLeft: number };
  hasDegree: boolean;
  degreeProgress?: { monthsLeft: number; trackId: string };
  monthsUnemployed: number;
  /** Looking for a job while unemployed (off = focusing on your business or a break). */
  searching: boolean;
  /** Months of unemployment benefits left (after a layoff). */
  benefitsMonths: number;
  /** Salary before losing the job (for benefits and job search). */
  lastSalary: number;
  /** On medical leave because of poor health. */
  onLeave: boolean;
  /** Months until the player can ask for another promotion after a "no". */
  promoCooldown: number;
  raisesHistory: { month: number; salary: number; reason: string }[];
}

// ---------------------------------------------------------------------------
// Business
// ---------------------------------------------------------------------------

export interface BusinessType {
  id: string;
  name: string;
  blurb: string;
  startupCost: number;
  /** Cost to open each additional location. */
  locationCost: number;
  /** Rent and fixed overhead per location per month. */
  rentPerLocation: number;
  /** Customers (demand) per location per month at reputation 50 with modest marketing. */
  baseDemand: number;
  /** Average revenue per customer. */
  ticket: number;
  /** Cost of goods as a fraction of revenue. */
  cogs: number;
  /** Customers one staff member can serve per month. */
  capacityPerStaff: number;
  /** Monthly wage per staff member. */
  wage: number;
  /** How much revenue swings with the economy. */
  cyclicality: number;
  /** Month-to-month randomness of demand (fraction). */
  volatility: number;
  maxLocations: number;
  /** Can it be run part-time alongside a job? */
  sideHustleFriendly: boolean;
}

export interface BusinessState {
  id: string;
  typeId: string;
  name: string;
  foundedMonth: number;
  locations: number;
  staff: number;
  /** Monthly marketing spend. */
  marketing: number;
  /** 0-100 brand reputation / quality. */
  reputation: number;
  /** Price positioning multiplier 0.8-1.3. */
  pricing: number;
  /** Owner involvement: 'hands-off' | 'part-time' | 'full-time'. */
  involvement: 'hands-off' | 'part-time' | 'full-time';
  /** Business bank balance (profits accumulate here until drawn). */
  cash: number;
  /** Monthly owner's draw paid to the player. */
  ownerDraw: number;
  /** Last month's figures. */
  last: { revenue: number; costs: number; profit: number; customers: number; capacity: number };
  history: { month: number; revenue: number; profit: number }[];
  /** Temporary multiplier on demand from events, with months remaining. */
  boosts: { mult: number; months: number; reason: string }[];
  /** Money the player invested in the business in total. */
  invested: number;
  monthsLosing: number;
  /** Has the business had a profitable month yet? */
  everProfitable: boolean;
}

// ---------------------------------------------------------------------------
// Events (editable in src/data/events.ts)
// ---------------------------------------------------------------------------

/** Conditions an event needs before it can be drawn. All listed conditions must hold. */
export interface EventCondition {
  minAge?: number;
  maxAge?: number;
  employed?: boolean;
  hasBusiness?: boolean;
  hasCar?: boolean;
  ownsHome?: boolean;
  married?: boolean;
  hasKids?: boolean;
  hasPet?: boolean;
  hasStocks?: boolean; // holds at least one individual stock
  hasInvestments?: boolean; // holds anything
  hasDebt?: boolean;
  hasCreditDebt?: boolean;
  regime?: Regime[];
  minCash?: number;
  minNetWorth?: number;
  maxNetWorth?: number;
  minSkill?: number;
  minPerformance?: number;
  minStress?: number;
  maxStress?: number;
  /** Player must not have this flag. */
  notFlag?: string;
  /** Player must have this flag. */
  flag?: string;
  /** Minimum months since game start. */
  minMonth?: number;
  /** Only when consumer debt is out of control (the engine also forces this event). */
  debtCrisis?: boolean;
}

/**
 * What a choice does. Money amounts are in start-year dollars and are scaled by
 * inflation automatically. Stat changes are added to 0-100 stats and clamped.
 */
export interface EventEffect {
  cash?: number;
  /** Cash change as a multiple of the player's current monthly gross income. */
  cashIncomeMonths?: number;
  stress?: number;
  happiness?: number;
  health?: number;
  skill?: number;
  performance?: number;
  reputation?: number;
  /** Permanent salary change, percent. */
  salaryPct?: number;
  /** Add credit card debt (start-year dollars). */
  creditDebt?: number;
  /** Business effects apply to the player's largest business. */
  bizReputation?: number;
  bizCash?: number;
  /** Temporary demand multiplier for the business. */
  bizBoost?: { mult: number; months: number };
  /** Set or clear a flag on the player (used for event chains). */
  setFlag?: string;
  clearFlag?: string;
  /** Special actions handled by the engine. */
  action?: EventAction;
  /** Symbol used by trade actions; '$event' = the ticker picked for this event. */
  symbol?: string;
  /** Percent of net cash or of a position used by trade actions. */
  pct?: number;
  /** Random outcome: with probability p use `success`, otherwise `fail`. */
  chance?: { p: number; success: EventEffect; fail: EventEffect; successText: string; failText: string };
  /** Text shown after choosing. */
  result?: string;
}

export type EventAction =
  | 'sellAllStocks' // sell every individual stock in taxable + roth
  | 'sellAllInvestments' // panic sell everything
  | 'buySymbol' // buy `symbol` with `pct` percent of cash
  | 'sellSymbol' // sell `pct` percent of the position in `symbol`
  | 'promote'
  | 'layoff'
  | 'quitJob'
  | 'jobOffer' // move to a new employer with salaryPct raise
  | 'marry'
  | 'haveChild'
  | 'adoptPet'
  | 'startDegree'
  | 'carBreakdown' // forces transport downgrade if unpaid
  | 'bizExpand' // opens a location at a discount
  | 'bizLawsuit'
  | 'sellBusiness'
  | 'inheritance'
  | 'debtPlan' // consolidate card debt into a cheaper fixed loan and cut costs
  | 'bankruptcy' // last resort: most consumer debt erased, savings above a floor lost
  | 'none';

export interface EventChoice {
  label: string;
  /** Short hint shown under the button. */
  hint?: string;
  effect: EventEffect;
  /** Choice only shown if the player can afford it (start-year dollars). */
  requiresCash?: number;
  /** Mark the default used in fast-forward / autopilot. */
  auto?: boolean;
}

export type EventCategory = 'life' | 'family' | 'career' | 'business' | 'market' | 'money' | 'health';

export interface GameEventDef {
  id: string;
  category: EventCategory;
  title: string;
  /** Body text. Placeholders: {name} {employer} {ticker} {company} {business} {spouse} {amount} */
  text: string;
  conditions?: EventCondition;
  /** Relative chance of being drawn (default 1). */
  weight?: number;
  /** Major events pause fast-forward. */
  major?: boolean;
  /** Can only happen once per game. */
  once?: boolean;
  /** Minimum months before the same event can repeat. */
  cooldown?: number;
  /** If set, the event needs a ticker: 'held' (a stock the player holds) or 'any'. */
  needsTicker?: 'held' | 'any';
  choices: EventChoice[];
  /** Guide's teaching note shown with the event. */
  lesson?: string;
}

export interface PendingEvent {
  defId: string;
  title: string;
  text: string;
  ticker?: string;
  choices: { label: string; hint?: string; disabled?: boolean }[];
  lesson?: string;
  major: boolean;
}

// ---------------------------------------------------------------------------
// Player & game state
// ---------------------------------------------------------------------------

export interface FamilyState {
  married: boolean;
  spouseName?: string;
  /** Spouse's annual income (nominal). */
  spouseIncome: number;
  /** Ages of children in months. */
  kids: number[];
  pets: number;
}

export interface MonthSnapshot {
  month: number;
  netWorth: number;
  cash: number;
  investments: number;
  /** Value of a hypothetical portfolio that put every invested dollar into the S&P 500 fund instead. */
  shadowSp: number;
  homeEquity: number;
  businessValue: number;
  debt: number;
  grossIncome: number;
  expenses: number;
  taxes: number;
  saved: number;
  stress: number;
  happiness: number;
  /** S&P 500 total return index level. */
  spIndex: number;
}

export interface YearSummary {
  year: number;
  age: number;
  grossIncome: number;
  salaryIncome: number;
  businessIncome: number;
  investmentIncome: number;
  taxes: number;
  expenses: number;
  saved: number;
  savingsRate: number;
  netWorthStart: number;
  netWorthEnd: number;
  portfolioReturn: number;
  spReturn: number;
  inflation: number;
  achievements: string[];
  highlights: string[];
}

export interface Settings {
  voiceOn: boolean;
  voiceName: string;
  voiceRate: number;
  pauseOnAllEvents: boolean;
  showTutorial: boolean;
}

export interface YearAccumulator {
  grossIncome: number;
  salaryIncome: number;
  businessIncome: number;
  investmentIncome: number;
  taxes: number;
  expenses: number;
  saved: number;
  netWorthStart: number;
  investStart: number;
  contributions: number;
  spStart: number;
  cpiStart: number;
  highlights: string[];
  achievements: string[];
}

export interface GameState {
  version: number;
  seed: number;
  /** Random number generator state for life events (market has its own). */
  rngLife: number;
  rngMarket: number;
  /** Months elapsed since start (0 = first month, before any turn). */
  month: number;
  startYear: number;
  startAge: number;
  retireAge: number;
  name: string;
  backgroundId: string;
  difficulty: 'easy' | 'normal' | 'hard';
  cash: number;
  accounts: Record<AccountId, Account>;
  debts: Debt[];
  home?: Home;
  budget: BudgetSettings;
  career: CareerState;
  businesses: BusinessState[];
  family: FamilyState;
  /** 0-100 */
  stress: number;
  happiness: number;
  health: number;
  flags: string[];
  market: MarketState;
  /** Value of the "S&P 500 only" shadow portfolio, in SPY shares. */
  shadowShares: number;
  history: MonthSnapshot[];
  years: YearSummary[];
  year: YearAccumulator;
  log: { month: number; text: string; kind: 'info' | 'good' | 'bad' | 'event' }[];
  eventHistory: Record<string, number>;
  achievements: Record<string, number>;
  pendingEvent?: PendingEvent;
  pendingYearSummary?: YearSummary;
  /** Last month's detailed cash flow, for the budget view. */
  lastFlow: CashFlow;
  settings: Settings;
  tutorialStep: number;
  gameOver: boolean;
  retiredEarly: boolean;
  /** Counters used for teaching (trades, panic sells, crashes held through, ...). */
  stats: {
    stockTrades: number;
    fundTrades: number;
    panicSells: number;
    crashesHeld: number;
    maxDrawdownSeen: number;
    peakInvestments: number;
    monthsWithCreditDebt: number;
    promotions: number;
    jobChanges: number;
    businessesStarted: number;
    businessesSold: number;
    /** Stock trades counted at the end of last turn (to measure trading activity). */
    lastStockTrades: number;
    /** Panic-sell count when the current crash began (-1 = not in a crash). */
    crashPanicBaseline: number;
    /** Months the game has run on fast-forward autopilot decisions. */
    autoDecisions: number;
  };
}

export interface CashFlow {
  salary: number;
  spouse: number;
  business: number;
  dividends: number;
  interest: number;
  otherIncome: number;
  taxes: number;
  k401: number;
  housing: number;
  transport: number;
  food: number;
  lifestyle: number;
  family: number;
  insurance: number;
  utilities: number;
  debtPayments: number;
  education: number;
  invested: number;
  other: number;
  /** Money left over after all of the above (positive = saved to cash). */
  leftover: number;
}
