// Everything the in-game guide says. Edit freely.
//
// - GUIDE: the guide's name and the core message.
// - TUTORIAL: first-time walkthrough steps (auto-advance when `done` is true).
// - TIPS: contextual advice. The highest-priority tip whose `when` is true
//   becomes "What to do next". Placeholders in {braces} come from GuideCtx.
// - TOPICS: the "Learn" library (short lessons the player can open any time).
//
// The guide teaches concepts. It never tells the player to buy a specific
// real-world security; examples always point to broad, low-cost index funds
// as a category.

import type { GameState } from '../types';

export const GUIDE = {
  name: 'Sage',
  role: 'your money coach',
  coreMessage:
    'Here is the whole secret in one sentence: do great work in your job or business to grow your income, spend less than you earn, and invest the difference steadily in low-cost index funds like an S&P 500 fund. Then be patient. It is simple, it is low-stress, and over decades it builds real wealth.',
  pillars: [
    { icon: '💼', title: 'Earn more', text: 'Skills, promotions, job changes and your own business raise your income. Income is the engine.' },
    { icon: '🐿️', title: 'Keep more', text: 'An emergency fund, no credit card debt, and spending below your means turn income into savings.' },
    { icon: '📈', title: 'Grow it', text: 'Invest monthly in broad, low-cost index funds and leave them alone. Compounding does the heavy lifting.' },
  ],
};

/** Values the guide can use in tips. Built by src/engine/coach.ts. */
export interface GuideCtx {
  s: GameState;
  age: number;
  cash: number;
  emergencyMonths: number;
  emergencyTarget: number;
  essentials: number;
  creditDebt: number;
  totalDebt: number;
  investments: number;
  stockShare: number;
  largest: { symbol: string; share: number } | null;
  match: number;
  leftover: number;
  savingsRate: number;
  fiProgress: number;
  netWorth: number;
  promoEligible: boolean;
  promoMissing: string[];
  regime: string;
  drawdown: number;
  vsIndex: number;
  hasAutoInvest: boolean;
  stress: number;
  health: number;
  businessLosing: string | null;
  idleCashMonths: number;
  insuranceGaps: string[];
  yearsLeft: number;
}

export interface TipDef {
  id: string;
  priority: number; // higher shows first
  tone: 'warn' | 'tip' | 'praise';
  when: (c: GuideCtx) => boolean;
  text: (c: GuideCtx) => string;
  action?: { label: string; view: string };
}

const $ = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

export const TIPS: TipDef[] = [
  {
    id: 'negative-flow',
    priority: 100,
    tone: 'warn',
    when: (c) => c.leftover < -50 && c.s.month > 0,
    text: (c) => `You spent ${$(-c.leftover)} more than you earned last month. That gap lands on your credit card at 24% interest. Trim housing, transport or lifestyle in Budget until you are positive.`,
    action: { label: 'Open Budget', view: 'budget' },
  },
  {
    id: 'credit-debt',
    priority: 95,
    tone: 'warn',
    when: (c) => c.creditDebt > 50,
    text: (c) => `You owe ${$(c.creditDebt)} on credit cards at 24%. Paying that off is a guaranteed 24% return, far better than the stock market's long-run average of about 10%. Use Budget > Extra debt payment, or pay it down from cash.`,
    action: { label: 'Pay down debt', view: 'budget' },
  },
  {
    id: 'match',
    priority: 90,
    tone: 'tip',
    when: (c) => c.s.career.employed && c.s.budget.k401Pct < c.match,
    text: (c) => `Your employer matches 401(k) contributions up to ${c.match}% of your salary. That is free money, an instant 100% return. Set your 401(k) contribution to at least ${c.match}% in Budget.`,
    action: { label: 'Set 401(k)', view: 'budget' },
  },
  {
    id: 'crash-calm',
    priority: 88,
    tone: 'tip',
    when: (c) => (c.regime === 'crash' || c.drawdown > 0.2) && c.investments > 1000,
    text: (c) => `The market is down ${pct(c.drawdown)} from its high. This is normal: big drops happen every few years and the market has always recovered over time. You only lock in a loss if you sell. If you can, keep investing; you are buying at a discount.`,
  },
  {
    id: 'emergency-start',
    priority: 85,
    tone: 'tip',
    when: (c) => c.emergencyMonths < 1 && c.creditDebt <= 50,
    text: (c) => `Build a starter emergency fund: one month of essentials (${$(c.essentials)}) in cash. Then aim for ${c.emergencyTarget} months. It stops surprise bills becoming debt, and lets you invest without worry.`,
    action: { label: 'See budget', view: 'budget' },
  },
  {
    id: 'insurance',
    priority: 80,
    tone: 'warn',
    when: (c) => c.insuranceGaps.length > 0,
    text: (c) => `Insurance gap: ${c.insuranceGaps.join(' ')} Insurance turns rare disasters into small, predictable bills.`,
    action: { label: 'Insurance settings', view: 'budget' },
  },
  {
    id: 'concentration',
    priority: 78,
    tone: 'warn',
    when: (c) => !!c.largest && c.largest.share > 0.3 && c.investments > 5000 && !['SPY', 'VOO', 'VTI', 'VT', 'TDF', 'VXUS', 'BND', 'SCHD', 'QQQ'].includes(c.largest.symbol),
    text: (c) => `${pct(c.largest!.share)} of your investments are in ${c.largest!.symbol}. One company's bad year could badly hurt you. Most single stocks lag the index over the long run. Consider spreading out with a broad index fund.`,
    action: { label: 'Open Portfolio', view: 'portfolio' },
  },
  {
    id: 'auto-invest',
    priority: 75,
    tone: 'tip',
    when: (c) => !c.hasAutoInvest && c.emergencyMonths >= 1 && c.creditDebt <= 50,
    text: () => 'Put investing on autopilot: in Portfolio, set up a monthly auto-invest or an "invest extra cash" sweep into a broad index fund such as an S&P 500 fund. Automatic beats willpower.',
    action: { label: 'Set up auto-invest', view: 'portfolio' },
  },
  {
    id: 'stress',
    priority: 72,
    tone: 'warn',
    when: (c) => c.stress > 70,
    text: (c) => `Your stress is ${Math.round(c.stress)}/100. High stress hurts your work performance and health. Ease off (work effort "Steady"), take a business off your plate, or simplify your investments. Wealth should give you peace, not take it.`,
    action: { label: 'Career settings', view: 'career' },
  },
  {
    id: 'business-losing',
    priority: 70,
    tone: 'warn',
    when: (c) => !!c.businessLosing,
    text: (c) => `${c.businessLosing} has been losing money. Check that staff matches demand (not too many, not too few), that pricing is sensible, and that marketing pays for itself. Closing a business that cannot turn around is not failure; it is good capital allocation.`,
    action: { label: 'Open Business', view: 'business' },
  },
  {
    id: 'promotion',
    priority: 65,
    tone: 'tip',
    when: (c) => c.promoEligible,
    text: () => 'You meet the requirements for a promotion! Go to Career and ask for it. Your chances are best when your performance rating is high.',
    action: { label: 'Ask for promotion', view: 'career' },
  },
  {
    id: 'idle-cash',
    priority: 60,
    tone: 'tip',
    when: (c) => c.idleCashMonths > 9 && c.creditDebt <= 50,
    text: (c) => `You have about ${Math.round(c.idleCashMonths)} months of expenses sitting in cash. Beyond your emergency fund, cash loses value to inflation. Consider investing the extra in a broad index fund.`,
    action: { label: 'Invest', view: 'portfolio' },
  },
  {
    id: 'roth',
    priority: 50,
    tone: 'tip',
    when: (c) => c.investments > 2000 && c.s.accounts.roth.contributedThisYear === 0 && c.emergencyMonths >= 3 && c.s.month % 12 >= 6,
    text: () => 'A Roth IRA lets your investments grow tax-free forever. You can add up to $7,000 a year (rising with inflation). When you invest, choose the Roth IRA account first.',
    action: { label: 'Open Portfolio', view: 'portfolio' },
  },
  {
    id: 'promo-path',
    priority: 40,
    tone: 'tip',
    when: (c) => c.s.career.employed && !c.promoEligible && c.promoMissing.length > 0 && !c.promoMissing[0].startsWith('You are at the top'),
    text: (c) => `Next promotion needs: ${c.promoMissing.join(', ')}. Higher income is the biggest lever you have: every raise you invest compounds for decades.`,
    action: { label: 'Open Career', view: 'career' },
  },
  {
    id: 'unemployed',
    priority: 92,
    tone: 'warn',
    when: (c) => !c.s.career.employed && c.s.businesses.length === 0,
    text: () => 'You are between jobs. Apply for roles in Career (you are also searching automatically each month). Keep costs low and lean on your emergency fund. Avoid selling investments in a panic.',
    action: { label: 'Find a job', view: 'career' },
  },
  {
    id: 'fi-reached',
    priority: 55,
    tone: 'praise',
    when: (c) => c.fiProgress >= 1,
    text: () => 'You are financially independent: your investments could cover your spending using the 4% rule. You can keep building, or retire early from the Dashboard.',
  },
  {
    id: 'good-saver',
    priority: 10,
    tone: 'praise',
    when: (c) => c.savingsRate > 0.2 && c.hasAutoInvest,
    text: (c) => `You are saving ${pct(c.savingsRate)} of your income and investing automatically. This is exactly how wealth is built. Keep growing your income, and use fast-forward to watch compounding work.`,
  },
  {
    id: 'default',
    priority: 0,
    tone: 'tip',
    when: () => true,
    text: () => 'Things look steady. Keep doing great work, keep your spending in check, and keep investing every month. Press Next Month, or fast-forward a year.',
  },
];

export interface TutorialStep {
  id: string;
  title: string;
  text: string;
  view: string;
  /** Step completes automatically when this is true (or when the player clicks Next). */
  done?: (s: GameState) => boolean;
}

export const TUTORIAL: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Wealth Path!',
    text: `I'm ${GUIDE.name}, ${GUIDE.role}. ${GUIDE.coreMessage} I will walk you through your first few moves.`,
    view: 'dashboard',
  },
  {
    id: 'dashboard',
    title: 'Your dashboard',
    text: 'Each turn is one month. Here you see your net worth, cash, investments and progress toward financial independence. My "What to do next" tip is always at the top.',
    view: 'dashboard',
  },
  {
    id: 'budget',
    title: 'Set up your budget',
    text: 'Open Budget. Your paycheck pays taxes, rent, transport, food and bills; what is left is yours to save. First, set your 401(k) contribution to at least your employer match. That is free money.',
    view: 'budget',
    done: (s) => s.budget.k401Pct > 0,
  },
  {
    id: 'emergency',
    title: 'Emergency fund first',
    text: 'Keep 3 to 6 months of essential expenses in cash. Surprise bills happen (you will see!). With a cushion they are an inconvenience, not a crisis. If you have credit card debt, pay it off before investing outside your 401(k).',
    view: 'budget',
  },
  {
    id: 'market',
    title: 'The market',
    text: 'Open Market to see the S&P 500 fund, other index funds, and 80+ real companies with simulated prices. Tap any company to see revenue, earnings, P/E and its quarterly beats and misses. Research is fun, but remember: most stock pickers lose to the index over time.',
    view: 'market',
  },
  {
    id: 'autoinvest',
    title: 'Invest on autopilot',
    text: 'In Portfolio, set an automatic monthly investment or an "invest extra cash" sweep into a broad index fund. This is dollar-cost averaging: you buy every month, in good markets and bad, without having to think about it.',
    view: 'portfolio',
    done: (s) => s.budget.autoInvest.length > 0 || !!s.budget.sweepSymbol,
  },
  {
    id: 'career',
    title: 'Grow your income',
    text: 'In Career, choose your work effort, study for certifications, ask for promotions, or find a better job. Later, start a business on the side. Higher income is your biggest lever.',
    view: 'career',
  },
  {
    id: 'events',
    title: 'Life happens',
    text: 'Every month brings a decision: a job offer, a hot stock tip, a car repair, a market crash. Choose carefully; I will add a lesson to each one.',
    view: 'dashboard',
  },
  {
    id: 'go',
    title: 'You are ready',
    text: 'Press Next Month to play month by month, or use Fast-forward to skip ahead a year (I will stop for big decisions). Check History to track your net worth against the S&P 500. Good luck!',
    view: 'dashboard',
  },
];

export interface Topic {
  id: string;
  title: string;
  keywords: string[];
  body: string[];
}

export const TOPICS: Topic[] = [
  {
    id: 'index-funds',
    title: 'What is an index fund?',
    keywords: ['index', 'etf', 's&p', 'spy', 'voo', 'fund', 'vti'],
    body: [
      'An index fund buys every company in a market index, for example the 500 large US companies in the S&P 500. One purchase gives you a slice of all of them.',
      'Because it owns everything, you do not need to guess winners. When one company stumbles, others carry the fund. Fees are tiny (often 0.03% a year), so more of the return stays with you.',
      'Historically the S&P 500 has returned roughly 10% a year on average before inflation, with painful drops along the way. In this game the market is simulated with similar long-run behaviour.',
    ],
  },
  {
    id: 'compound',
    title: 'Compound growth',
    keywords: ['compound', 'interest', 'growth', 'time'],
    body: [
      'Compounding means your returns earn returns. $500 a month at 8% a year grows to about $745,000 in 30 years, of which only $180,000 is money you put in.',
      'The two biggest factors are how much you invest and how long you leave it. Starting 10 years earlier can roughly double the result. Try the calculator in the Guide tab.',
    ],
  },
  {
    id: 'dca',
    title: 'Dollar-cost averaging',
    keywords: ['dca', 'dollar', 'average', 'monthly', 'automatic', 'auto'],
    body: [
      'Investing a fixed amount every month, no matter what the market is doing, is called dollar-cost averaging. When prices are low your money buys more shares; when high, fewer.',
      'Its real superpower is behavioural: it removes the temptation to time the market. Set it up once in Portfolio and let it run.',
    ],
  },
  {
    id: 'emergency-fund',
    title: 'Emergency fund',
    keywords: ['emergency', 'cushion', 'savings', 'cash'],
    body: [
      'An emergency fund is 3 to 6 months of essential expenses kept in a savings account. It protects you from job loss, car repairs and medical bills without going into debt or selling investments at a bad time.',
      'Business owners and people in cyclical jobs should lean toward 6 months or more.',
    ],
  },
  {
    id: 'debt',
    title: 'Good debt, bad debt',
    keywords: ['debt', 'credit', 'card', 'loan', 'interest', 'mortgage'],
    body: [
      'Credit card debt at 20-25% interest is an emergency: pay it off first. No investment reliably returns 24% a year.',
      'Low-rate debt like a mortgage or student loan can be paid on schedule while you invest. A common rule: pay off anything above about 7-8% before investing beyond your 401(k) match.',
      'The "avalanche" method (pay the highest interest rate first) saves the most money. The game uses it for your extra debt payments.',
    ],
  },
  {
    id: 'pe-ratio',
    title: 'Reading fundamentals: P/E, EPS and margins',
    keywords: ['pe', 'p/e', 'eps', 'earnings', 'margin', 'revenue', 'fundamental', 'valuation'],
    body: [
      'Revenue is everything a company sells. Net margin is the share of revenue left as profit. EPS (earnings per share) is profit divided by the number of shares.',
      'The P/E ratio is the share price divided by EPS: how many dollars investors pay for $1 of yearly profit. A high P/E means the market expects fast growth. If that growth disappoints, the price can fall even when the company is doing fine.',
      'Debt-to-equity shows how much the company relies on borrowing. High debt makes bad years more dangerous.',
    ],
  },
  {
    id: 'earnings',
    title: 'Earnings beats and misses',
    keywords: ['beat', 'miss', 'quarter', 'report', 'estimate'],
    body: [
      'Every quarter, companies report results. Analysts publish an estimate first. Beating it often lifts the price; missing it can sink it fast.',
      'Companies beat estimates most of the time because estimates are set a little low, so a small beat is "expected" and barely moves the stock. Predicting surprises consistently is extremely hard, even for professionals.',
    ],
  },
  {
    id: 'diversification',
    title: 'Diversification and stock picking',
    keywords: ['diversify', 'diversification', 'stock picking', 'concentrate', 'single stock', 'pick'],
    body: [
      'A single company can double, or fall 50% on one bad report. Holding many companies smooths the ride.',
      'Research on real markets shows that over the long run most individual stocks do worse than the overall index; a small number of huge winners drive the market\'s returns. An index fund guarantees you own those winners.',
      'In this game every stock has the same expected long-run return as the market, but far more risk. Watch how often your picks beat the S&P 500 in History.',
    ],
  },
  {
    id: 'fees',
    title: 'Fees matter',
    keywords: ['fee', 'expense', 'ratio', 'cost'],
    body: [
      'A 1% annual fee sounds small, but over 40 years it can eat nearly a third of your final wealth. Broad index funds often charge 0.03-0.10%.',
      'Compare the expense ratio in each fund\'s detail page. High-fee "thematic" funds also tend to be much more volatile.',
    ],
  },
  {
    id: 'accounts',
    title: '401(k), Roth IRA and taxable accounts',
    keywords: ['401k', '401(k)', 'roth', 'ira', 'tax', 'account', 'retirement'],
    body: [
      '401(k): contributions come out of your paycheck before income tax, and many employers match part of it. Withdrawals before 59½ have a 10% penalty plus tax.',
      'Roth IRA: you invest money that has already been taxed, and it then grows and comes out tax-free in retirement. The limit is about $7,000 a year.',
      'Taxable brokerage: no limits, but dividends and gains are taxed. Holding more than 12 months gets the lower long-term capital gains rate.',
      'A common order: 401(k) up to the match, then pay off high-interest debt, then Roth IRA, then more 401(k) or taxable investing. (Simplified for the game; real rules have more detail.)',
    ],
  },
  {
    id: 'rent-vs-buy',
    title: 'Rent or buy a home?',
    keywords: ['house', 'home', 'rent', 'buy', 'mortgage'],
    body: [
      'Buying builds equity, but costs more than the mortgage: property tax, insurance, maintenance (around 1-2% of the home\'s value a year), closing costs when you buy and roughly 6% when you sell.',
      'Renting is flexible and can be cheaper, especially if you invest the difference. Buy when you plan to stay 5+ years, have a 20% down payment (or accept mortgage insurance), and the total monthly cost fits comfortably in your budget.',
    ],
  },
  {
    id: 'insurance',
    title: 'Insurance basics',
    keywords: ['insurance', 'health', 'disability', 'life', 'renters', 'umbrella'],
    body: [
      'Insurance moves big, rare risks off your shoulders for a small monthly price. Health insurance is essential. Disability insurance protects your income, which is your biggest asset when you are young.',
      'Term life insurance matters once someone depends on your income (for example, kids). Renter\'s insurance is cheap. Business owners benefit from umbrella liability coverage.',
    ],
  },
  {
    id: 'inflation',
    title: 'Inflation',
    keywords: ['inflation', 'cpi', 'prices', 'real'],
    body: [
      'Prices rise over time, usually 2-3% a year. Cash under the mattress quietly loses buying power. Over 40 years, $1 can lose two-thirds of its value.',
      'That is why the game shows many numbers "in today\'s money", and why long-term savings belong in investments that grow faster than inflation.',
    ],
  },
  {
    id: 'crashes',
    title: 'Market crashes and bear markets',
    keywords: ['crash', 'bear', 'drop', 'panic', 'recession', 'sell'],
    body: [
      'A 10% drop happens most years; a 20%+ bear market every few years; a 40-50% crash a few times in a lifetime. Each one has felt like "this time is different".',
      'Investors who sell in a panic usually miss the recovery, which often comes fast. Those who keep investing buy cheap shares. An emergency fund means you never have to sell at the bottom.',
    ],
  },
  {
    id: 'career-growth',
    title: 'Growing your career income',
    keywords: ['career', 'promotion', 'raise', 'job', 'salary', 'skill', 'certification'],
    body: [
      'Your ability to earn is your biggest financial asset. Skills, certifications and strong performance lead to promotions. Changing employers often brings a 10-20% raise.',
      'Each raise is most powerful when you invest it rather than spend it all. Avoid "lifestyle creep": let your spending rise more slowly than your income.',
    ],
  },
  {
    id: 'business-basics',
    title: 'Running a business',
    keywords: ['business', 'profit', 'staff', 'location', 'marketing', 'entrepreneur'],
    body: [
      'Profit = revenue - costs. Match staff to demand: too few and customers leave unhappy; too many and wages eat your margin. Marketing has diminishing returns.',
      'Reputation grows with good service and fair prices. Expanding to new locations multiplies a working formula; it also multiplies mistakes. A profitable business can be sold for several times its annual profit.',
      'Keep a cash cushion in the business and pay yourself a sustainable owner\'s draw.',
    ],
  },
  {
    id: 'fi',
    title: 'Financial independence and the 4% rule',
    keywords: ['fi', 'fire', 'independence', 'retire', '4%', 'rule'],
    body: [
      'A common rule of thumb: if your investments equal 25 times your yearly spending, you can withdraw about 4% a year with a high chance of never running out.',
      'That makes the FI number depend on spending as much as income. Every $100 a month you spend less lowers your target by $30,000.',
    ],
  },
  {
    id: 'dividends',
    title: 'Dividends',
    keywords: ['dividend', 'yield', 'drip', 'income'],
    body: [
      'Some companies pay part of their profit to shareholders as dividends. The yield is the yearly dividend divided by the price.',
      'Reinvesting dividends (DRIP) buys more shares automatically and is a big part of long-run returns. High yield is not free money: a company paying a big dividend often grows its price more slowly.',
    ],
  },
  {
    id: 'bonds',
    title: 'Bonds and gold',
    keywords: ['bond', 'bnd', 'gold', 'gld', 'safe'],
    body: [
      'Bond funds lend money to governments and companies. They earn less than stocks over time but swing much less, and often hold up in crashes. Many people add more bonds as retirement gets close.',
      'Gold pays no income and has had long periods of going nowhere. It can be a small diversifier, not a core holding.',
    ],
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle creep and happiness',
    keywords: ['lifestyle', 'spend', 'happiness', 'luxury', 'car'],
    body: [
      'In the game, as in life, going from frugal to comfortable boosts happiness, but going from comfortable to lavish barely moves it while costing a fortune.',
      'Big recurring costs (housing and cars) matter most. A reliable used car instead of a luxury one can be worth hundreds of thousands of dollars over a career once invested.',
    ],
  },
];

/** Short lines the guide says at year end. Pick by situation. */
export const YEAR_END_LINES = {
  beatMarketPicks: 'Your portfolio beat the S&P 500 this year. Enjoy it, but one year proves little; check again in ten.',
  lagMarketPicks: 'Your portfolio lagged the S&P 500 this year. Individual picks often do. A broad index fund would have matched the market automatically.',
  matchedMarket: 'Your portfolio moved with the market, which is exactly what index investing is designed to do.',
  marketDown: 'The market fell this year. That is uncomfortable, and normal. Staying invested through down years is how you collect the up years.',
  highSaver: 'You saved {rate} of your income this year. Outstanding: that habit matters more than any stock pick.',
  lowSaver: 'You saved {rate} of your income this year. Try to push toward 15-20%: small budget changes add up to a fortune over decades.',
  negativeSaver: 'You spent more than you earned this year. Let us fix that first: housing, cars and lifestyle are the biggest levers.',
};
