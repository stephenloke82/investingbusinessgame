import { describe, expect, it } from 'vitest';
import { newGame, advanceMonth, withRng } from '../src/engine/game';
import { incomeTax, payrollTax, amortizedPayment, borrowOnCredit, serviceDebts, creditDebt, buyHome, sellHome, changeTransport, payDebt, livingCosts, totalLiving, quoteHome, hasHealthInsurance } from '../src/engine/finance';
import { buy, sell, contributionRoom, investmentsValue, payDividends, withdrawRetirement, holdingShares } from '../src/engine/portfolio';
import { askForPromotion, promotionCheck, startCert, loseJob, jobOptions } from '../src/engine/career';
import { startBusiness, businessMonth, openLocation, sellBusiness } from '../src/engine/business';
import { netWorth, shadowValue, compound, fiNumber } from '../src/engine/metrics';
import { Rng } from '../src/engine/rng';
import { priceOf } from '../src/engine/market';

const game = (bg = 'grad', track = 'software') => newGame({ name: 'Test', backgroundId: bg, trackId: track, seed: 123 });

describe('taxes', () => {
  it('income tax is progressive and zero below the standard deduction', () => {
    expect(incomeTax(10000, 1, false)).toBe(0);
    const t50 = incomeTax(50000, 1, false);
    const t100 = incomeTax(100000, 1, false);
    expect(t50).toBeGreaterThan(0);
    expect(t100 / 100000).toBeGreaterThan(t50 / 50000);
    // Married couples get double brackets, so the same income is taxed less.
    expect(incomeTax(100000, 1, true)).toBeLessThan(t100);
    // Brackets scale with inflation.
    expect(incomeTax(100000, 1.5, false)).toBeLessThan(t100);
  });
  it('payroll tax caps Social Security', () => {
    expect(payrollTax(100000, 1)).toBeCloseTo(7650, 0);
    expect(payrollTax(1000000, 1)).toBeLessThan(1000000 * 0.0765);
  });
});

describe('debts', () => {
  it('amortized payment pays off the loan', () => {
    const p = amortizedPayment(100000, 0.06, 360);
    expect(p).toBeCloseTo(599.55, 1);
    let bal = 100000;
    for (let i = 0; i < 360; i++) bal = bal * (1 + 0.06 / 12) - p;
    expect(Math.abs(bal)).toBeLessThan(1);
  });
  it('credit card accrues 24% interest and overflow goes to a hardship loan', () => {
    const s = game('scholarship');
    borrowOnCredit(s, 1000000);
    expect(creditDebt(s)).toBeGreaterThan(0);
    expect(s.debts.some((d) => d.kind === 'personal')).toBe(true);
  });
  it('extra payments go to the highest rate first', () => {
    const s = game('grad');
    const card = s.debts.find((d) => d.kind === 'credit')!;
    const student = s.debts.find((d) => d.kind === 'student')!;
    const cardBefore = card.balance;
    const studentBefore = student.balance;
    serviceDebts(s, 1e9, 500);
    expect(cardBefore - (s.debts.find((d) => d.kind === 'credit')?.balance ?? 0)).toBeGreaterThan(400);
    expect(studentBefore - student.balance).toBeLessThan(400);
  });
  it('paying a debt from cash reduces both', () => {
    const s = game('grad');
    s.cash = 5000;
    const card = s.debts.find((d) => d.kind === 'credit')!;
    payDebt(s, card.id, 5000);
    expect(creditDebt(s)).toBe(0);
    expect(s.cash).toBeCloseTo(5000 - 1500, 0);
  });
});

describe('investing', () => {
  it('buying and selling moves cash, tracks cost basis and taxes gains', () => {
    const s = game('scholarship');
    s.cash = 10000;
    const r = buy(s, 'VOO', 'taxable', 5000);
    expect(r.ok).toBe(true);
    expect(s.cash).toBeCloseTo(5000, 2);
    expect(investmentsValue(s)).toBeCloseTo(5000, 0);
    // Pretend the price doubled over 2 years: long-term gain taxed at 15%
    s.market.etfs.VOO.price *= 2;
    s.month = 24;
    const sold = sell(s, 'VOO', 'taxable', 'all');
    expect(sold.ok).toBe(true);
    expect(sold.tax).toBeCloseTo(5000 * 0.15, 0);
    expect(s.cash).toBeCloseTo(5000 + 10000 - 750, 0);
  });
  it('rejects buying without cash, unknown symbols and stocks in a 401(k)', () => {
    const s = game('grad');
    s.cash = 100;
    expect(buy(s, 'VOO', 'taxable', 1000).ok).toBe(false);
    expect(buy(s, 'NOPE', 'taxable', 10).ok).toBe(false);
    expect(buy(s, 'AAPL', 'k401', 10, { fromAccountCash: true }).ok).toBe(false);
  });
  it('enforces the Roth IRA contribution limit', () => {
    const s = game('scholarship');
    s.cash = 50000;
    expect(buy(s, 'VTI', 'roth', 7000).ok).toBe(true);
    expect(contributionRoom(s, 'roth')).toBeCloseTo(0, 2);
    expect(buy(s, 'VTI', 'roth', 100).ok).toBe(false);
  });
  it('the S&P-only shadow mirrors deposits', () => {
    const s = game('scholarship');
    s.cash = 10000;
    buy(s, 'AAPL', 'taxable', 3000);
    expect(shadowValue(s)).toBeCloseTo(3000, 0);
  });
  it('pays dividends (reinvested with DRIP, cash otherwise)', () => {
    const s = game('scholarship');
    s.cash = 20000;
    buy(s, 'SCHD', 'taxable', 10000);
    const sharesBefore = holdingShares(s.accounts.taxable.holdings.SCHD);
    s.budget.drip = true;
    const d1 = payDividends(s);
    expect(d1.total).toBeGreaterThan(0);
    expect(holdingShares(s.accounts.taxable.holdings.SCHD)).toBeGreaterThan(sharesBefore);
    s.budget.drip = false;
    const d2 = payDividends(s);
    expect(d2.taxableCash).toBeGreaterThan(0);
  });
  it('early retirement withdrawals pay a penalty', () => {
    const s = game('scholarship');
    s.accounts.roth.cash = 1000;
    const r = withdrawRetirement(s, 'roth', 1000, 30);
    expect(r.tax).toBeCloseTo(100, 0);
  });
  it('compound calculator matches the textbook formula', () => {
    const r = compound(0, 500, 0.08, 30);
    expect(r.total).toBeGreaterThan(740000);
    expect(r.total).toBeLessThan(750000);
    expect(r.contributed).toBe(180000);
  });
});

describe('monthly budget', () => {
  it('a month of play pays salary, taxes, bills and 401(k) with match', () => {
    const s = game('scholarship', 'software');
    s.budget.k401Pct = 6;
    const cash0 = s.cash;
    advanceMonth(s);
    const f = s.lastFlow;
    expect(f.salary).toBeCloseTo(78000 / 12, -1);
    expect(f.taxes).toBeGreaterThan(800);
    expect(f.k401).toBeCloseTo((78000 / 12) * 0.06, -1);
    // match (4%) + own 6% land in the 401(k)
    expect(investmentsValue(s)).toBeGreaterThan(f.k401 * 1.5);
    expect(s.cash).toBeGreaterThan(cash0);
    expect(s.history.length).toBe(1);
  });
  it('living costs respond to lifestyle and family', () => {
    const s = game('grad');
    const base = totalLiving(livingCosts(s));
    s.budget.lifestyle = 'lavish';
    expect(totalLiving(livingCosts(s))).toBeGreaterThan(base + 2000);
    s.family.kids.push(0);
    expect(livingCosts(s).family).toBeGreaterThan(1000);
  });
  it('shortfalls go on the credit card instead of negative cash', () => {
    const s = game('grad');
    s.cash = 0;
    s.budget.lifestyle = 'lavish';
    s.budget.housing = 'luxury-apartment';
    advanceMonth(s);
    expect(s.cash).toBeGreaterThanOrEqual(0);
    expect(creditDebt(s)).toBeGreaterThan(1500);
  });
  it('employer health insurance covers you; unemployment removes it', () => {
    const s = game('grad');
    expect(hasHealthInsurance(s)).toBe(true);
    loseJob(s, true);
    expect(hasHealthInsurance(s)).toBe(false);
    s.budget.insurance.health = true;
    expect(hasHealthInsurance(s)).toBe(true);
  });
});

describe('housing and transport', () => {
  it('can buy and sell a home', () => {
    const s = game('scholarship', 'software');
    s.cash = 200000;
    s.career.salary = 150000;
    const q = quoteHome(s, 'starter-home', 20)!;
    expect(q.payment).toBeGreaterThan(1000);
    const msg = buyHome(s, 'starter-home', 20);
    expect(s.home).toBeDefined();
    expect(msg).toContain('Congratulations');
    expect(s.debts.some((d) => d.kind === 'mortgage')).toBe(true);
    sellHome(s, 'apartment');
    expect(s.home).toBeUndefined();
    expect(s.debts.some((d) => d.kind === 'mortgage')).toBe(false);
  });
  it('the bank refuses unaffordable homes', () => {
    const s = game('grad');
    s.cash = 300000;
    expect(buyHome(s, 'luxury-home', 20)).toContain('bank says no');
  });
  it('switching to a financed new car creates a car loan', () => {
    const s = game('scholarship');
    changeTransport(s, 'new-car', true);
    expect(s.budget.transport).toBe('new-car');
    expect(s.debts.some((d) => d.kind === 'car')).toBe(true);
  });
});

describe('career and business', () => {
  it('promotion requires skill, time and certifications', () => {
    const s = game('grad', 'software');
    expect(promotionCheck(s).eligible).toBe(false);
    s.career.skill = 40;
    s.career.monthsInLevel = 24;
    const p = promotionCheck(s);
    expect(p.eligible).toBe(true);
    s.career.performance = 100;
    let promoted = false;
    for (let i = 0; i < 20 && !promoted; i++) {
      s.career.promoCooldown = 0;
      promoted = withRng(s, (rng) => askForPromotion(s, rng)).ok;
    }
    expect(promoted).toBe(true);
    expect(s.career.level).toBe(1);
    expect(s.career.salary).toBeGreaterThanOrEqual(98000);
  });
  it('certifications cost money and complete over time', () => {
    const s = game('grad', 'software');
    s.cash = 10000;
    s.career.skill = 50;
    expect(startCert(s, 'cloud')).toContain('Enrolled');
    for (let i = 0; i < 4; i++) advanceMonth(s), (s.pendingEvent = undefined);
    expect(s.career.certs).toContain('cloud');
  });
  it('job options exist and degree careers are locked without a degree', () => {
    const s = game('worker', 'trades');
    const opts = jobOptions(s);
    expect(opts.length).toBeGreaterThan(1);
    expect(opts.some((o) => o.trackId === 'software')).toBe(false);
  });
  it('a business makes revenue, can expand and be sold', () => {
    const s = game('scholarship', 'software');
    s.cash = 500000;
    const rng = new Rng(5);
    startBusiness(s, rng, 'coffee', false);
    const b = s.businesses[0];
    b.involvement = 'full-time';
    for (let i = 0; i < 24; i++) {
      s.month++;
      businessMonth(s, rng);
    }
    expect(b.last.revenue).toBeGreaterThan(10000);
    expect(openLocation(s, b)).toContain('locations');
    const nw = netWorth(s);
    sellBusiness(s, b.id);
    expect(s.businesses.length).toBe(0);
    expect(netWorth(s)).toBeGreaterThan(nw * 0.5);
  });
  it('fiNumber is 25x yearly spending', () => {
    const s = game('grad');
    expect(fiNumber(s)).toBeCloseTo(totalLiving(livingCosts(s)) * 12 * 25, 0);
    expect(priceOf(s.market, 'SPY')).toBeGreaterThan(0);
  });
});
