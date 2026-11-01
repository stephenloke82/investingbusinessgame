// Running your own businesses.
// The player can own several businesses. Each month every business:
//   demand  = baseDemand x locations x reputation x marketing x economy x pricing x boosts x ramp-up x noise
//   served  = min(demand, capacity)   capacity = (staff + owner) x capacityPerStaff
//   revenue = served x ticket x pricing
//   profit  = revenue - wages - rent - cost of goods - marketing
// Profit stays in the business bank account; the owner's draw moves money to the player.

import type { BusinessState, GameState } from '../types';
import { BUSINESS_BY_ID, OWNER_CAPACITY } from '../data/businesses';
import { Rng } from './rng';
import { borrowOnCredit, newDebtId, amortizedPayment } from './finance';

export const MAX_BUSINESSES = 4;

const BUSINESS_NAMES: Record<string, string[]> = {
  online: ['Northstar Goods', 'Cozy Corner Shop', 'Maple & Co.', 'Brightside Supply'],
  lawn: ['GreenEdge Lawns', 'Fresh Cut Landscaping', 'Yardworks', 'Evergreen Grounds'],
  consulting: ['Clearpath Consulting', 'Summit Advisors', 'Keystone Strategy', 'Bridge Partners'],
  coffee: ['Morning Ritual Coffee', 'The Daily Grind', 'Bean There', 'Copper Kettle Cafe'],
  foodtruck: ['Rolling Tacos', 'Street Smart Eats', 'The Wandering Fork', 'Curbside Kitchen'],
  gym: ['Iron Will Fitness', 'Peak Performance Gym', 'FitHub', 'Forge Strength Club'],
  saas: ['Taskly', 'Ledgerly', 'Bookwise', 'Shiftboard'],
  electrical: ['Bright Spark Electric', 'Live Wire Contracting', 'Circuit Pros', 'Hometown Electric'],
};

export function businessType(b: BusinessState) {
  return BUSINESS_BY_ID[b.typeId];
}

export function startBusiness(state: GameState, rng: Rng, typeId: string, financeWithLoan: boolean, customName?: string): string {
  const t = BUSINESS_BY_ID[typeId];
  if (!t) return 'Unknown business type.';
  if (state.businesses.length >= MAX_BUSINESSES) return `You can run at most ${MAX_BUSINESSES} businesses at once.`;
  const cost = t.startupCost * state.market.cpi;
  const cashNeeded = financeWithLoan ? cost * 0.25 : cost;
  if (state.cash < cashNeeded) {
    return financeWithLoan
      ? `A small-business loan still needs 25% down: $${Math.round(cashNeeded).toLocaleString()}.`
      : `You need $${Math.round(cost).toLocaleString()} to start. You could use a small-business loan for 75% of it.`;
  }
  state.cash -= cashNeeded;
  if (financeWithLoan) {
    const loan = cost - cashNeeded;
    state.debts.push({ id: newDebtId(state, 'business'), kind: 'business', label: `Business loan (${t.name})`, balance: loan, rate: 0.095, minPayment: amortizedPayment(loan, 0.095, 84) });
  }
  const employed = state.career.employed;
  const names = BUSINESS_NAMES[typeId] ?? ['My Business'];
  const used = new Set(state.businesses.map((b) => b.name));
  const name = customName?.trim() || names.find((n) => !used.has(n)) || `${t.name} #${state.businesses.length + 1}`;
  const b: BusinessState = {
    id: `${typeId}-${state.month}-${Math.floor(rng.next() * 1e6)}`,
    typeId,
    name,
    foundedMonth: state.month,
    locations: 1,
    staff: t.sideHustleFriendly ? 0 : Math.max(1, Math.round(t.baseDemand / t.capacityPerStaff) - 1),
    marketing: Math.round(t.baseDemand * t.ticket * 0.04),
    reputation: 40,
    pricing: 1,
    involvement: employed ? 'part-time' : 'full-time',
    cash: cost * 0.1,
    ownerDraw: 0,
    last: { revenue: 0, costs: 0, profit: 0, customers: 0, capacity: 0 },
    history: [],
    boosts: [],
    invested: cost,
    monthsLosing: 0,
    everProfitable: false,
  };
  // 10% of the startup cost is kept as the business's opening cash cushion.
  state.businesses.push(b);
  state.stats.businessesStarted++;
  return `You opened ${name}! It will take several months to build up customers. Set your owner's draw once it is profitable.`;
}

export function demandOf(state: GameState, b: BusinessState, rng?: Rng): number {
  const t = businessType(b);
  const cpi = state.market.cpi;
  const repF = 0.5 + b.reputation / 100;
  const ref = t.baseDemand * t.ticket * 0.05 * b.locations * cpi;
  const mktF = 0.85 + 0.5 * (1 - Math.exp(-b.marketing / Math.max(1, ref)));
  const econF = 1 + t.cyclicality * state.market.economy * 0.15;
  const priceF = Math.pow(b.pricing, -1.6);
  const ageMonths = state.month - b.foundedMonth;
  const ramp = Math.min(1, 0.35 + ageMonths / 18);
  const boost = b.boosts.reduce((m, x) => m * x.mult, 1);
  const noise = rng ? Math.max(0.3, 1 + rng.normal() * t.volatility) : 1;
  return t.baseDemand * b.locations * repF * mktF * econF * priceF * ramp * boost * noise;
}

export function capacityOf(b: BusinessState): number {
  const t = businessType(b);
  return (b.staff + OWNER_CAPACITY[b.involvement]) * t.capacityPerStaff;
}

/** Estimated sale value: a multiple of trailing-year profit plus cash, or asset value if unprofitable. */
export function businessValue(b: BusinessState): number {
  const recent = b.history.slice(-12);
  const annualProfit = recent.length ? (recent.reduce((s, h) => s + h.profit, 0) / recent.length) * 12 : 0;
  const ownerDependence = b.involvement === 'full-time' ? 0.75 : 1;
  const multiple = 3 * ownerDependence;
  const assetValue = b.invested * 0.25;
  return Math.max(0, b.cash) + Math.max(assetValue, annualProfit * multiple);
}

export function businessesValue(state: GameState): number {
  return state.businesses.reduce((s, b) => s + businessValue(b), 0);
}

/** Monthly business update. Returns owner's draw paid to the player and log messages. */
export function businessMonth(state: GameState, rng: Rng): { draws: number; injections: number; msgs: string[] } {
  const msgs: string[] = [];
  let draws = 0;
  let injections = 0;
  const cpi = state.market.cpi;
  for (const b of state.businesses) {
    const t = businessType(b);
    if (!state.career.employed && b.involvement === 'part-time' && !t.sideHustleFriendly) b.involvement = 'full-time';
    const demand = demandOf(state, b, rng);
    const capacity = capacityOf(b);
    const customers = Math.min(demand, capacity);
    const revenue = customers * t.ticket * b.pricing * cpi;
    const wages = b.staff * t.wage * cpi;
    const rent = t.rentPerLocation * b.locations * cpi;
    const cogs = revenue * t.cogs;
    const costs = wages + rent + cogs + b.marketing;
    const profit = revenue - costs;
    b.last = { revenue, costs, profit, customers, capacity };
    b.history.push({ month: state.month, revenue: Math.round(revenue), profit: Math.round(profit) });
    if (b.history.length > 600) b.history.shift();
    b.cash += profit;
    if (profit > 0) {
      b.monthsLosing = 0;
      if (!b.everProfitable) {
        b.everProfitable = true;
        msgs.push(`${b.name} made its first profitable month!`);
      }
    } else b.monthsLosing++;

    // Reputation drifts toward a target set by service quality.
    const served = demand > 0 ? customers / demand : 1;
    let target = 45 + (served >= 0.95 ? 12 : served >= 0.8 ? 4 : -10);
    target += { 'hands-off': -8, 'part-time': 2, 'full-time': 10 }[b.involvement];
    target += (1 - b.pricing) * 30;
    if (b.staff >= 4 && b.involvement === 'hands-off') target += 6; // a team that runs itself
    b.reputation += (Math.max(5, Math.min(95, target)) - b.reputation) * 0.05 + rng.normal() * 0.8;
    b.reputation = Math.max(0, Math.min(100, b.reputation));
    b.boosts = b.boosts.map((x) => ({ ...x, months: x.months - 1 })).filter((x) => x.months > 0);

    // Owner's draw
    if (b.ownerDraw > 0) {
      const pay = Math.min(b.ownerDraw, Math.max(0, b.cash));
      b.cash -= pay;
      draws += pay;
      if (pay < b.ownerDraw - 1) msgs.push(`${b.name} could not afford your full draw this month.`);
    }
    // Cash shortfall: the owner must cover it.
    if (b.cash < 0) {
      const need = -b.cash;
      b.cash = 0;
      injections += need;
      if (b.monthsLosing === 3) msgs.push(`${b.name} has lost money 3 months in a row. Check staffing, pricing and marketing.`);
    }
  }
  if (injections > 0) {
    if (state.cash >= injections) state.cash -= injections;
    else {
      const short = injections - Math.max(0, state.cash);
      state.cash = Math.min(state.cash, 0);
      borrowOnCredit(state, short);
      msgs.push('You had to put money into your business on your credit card.');
    }
  }
  return { draws, injections, msgs };
}

export function openLocation(state: GameState, b: BusinessState, discount = 0): string {
  const t = businessType(b);
  if (b.locations >= t.maxLocations) return 'This business is at its maximum size.';
  const cost = t.locationCost * state.market.cpi * (1 - discount);
  const fromBiz = Math.min(Math.max(0, b.cash), cost);
  const fromPersonal = cost - fromBiz;
  if (fromPersonal > state.cash) return `Opening another location costs $${Math.round(cost).toLocaleString()}. The business has $${Math.round(Math.max(0, b.cash)).toLocaleString()}; you would need the rest.`;
  b.cash -= fromBiz;
  state.cash -= fromPersonal;
  b.locations++;
  b.invested += cost;
  b.staff += Math.max(1, Math.round((t.baseDemand / t.capacityPerStaff) * 0.8));
  b.marketing = Math.round(b.marketing * (b.locations / (b.locations - 1)));
  return `${b.name} now has ${b.locations} ${b.typeId === 'online' || b.typeId === 'saas' ? 'product lines' : 'locations'}. New staff hired.`;
}

export function investInQuality(state: GameState, b: BusinessState): string {
  const cost = businessType(b).locationCost * 0.1 * state.market.cpi;
  const fromBiz = Math.min(Math.max(0, b.cash), cost);
  if (cost - fromBiz > state.cash) return `Upgrades cost $${Math.round(cost).toLocaleString()}.`;
  b.cash -= fromBiz;
  state.cash -= cost - fromBiz;
  b.invested += cost * 0.5;
  b.reputation = Math.min(100, b.reputation + 8);
  return `Upgraded equipment and training at ${b.name}. Reputation +8.`;
}

export function sellBusiness(state: GameState, id: string, priceMult = 1): string {
  const b = state.businesses.find((x) => x.id === id);
  if (!b) return 'Not found.';
  const value = businessValue(b) * priceMult;
  state.cash += value;
  state.businesses = state.businesses.filter((x) => x.id !== id);
  state.stats.businessesSold++;
  return `You sold ${b.name} for $${Math.round(value).toLocaleString()}.`;
}

export function closeBusiness(state: GameState, id: string): string {
  const b = state.businesses.find((x) => x.id === id);
  if (!b) return 'Not found.';
  const salvage = Math.max(0, b.cash) + b.invested * 0.1;
  state.cash += salvage;
  state.businesses = state.businesses.filter((x) => x.id !== id);
  return `You closed ${b.name} and recovered $${Math.round(salvage).toLocaleString()}.`;
}

/** Suggested staff level for current demand. */
export function suggestedStaff(state: GameState, b: BusinessState): number {
  const t = businessType(b);
  const need = demandOf(state, b) / t.capacityPerStaff - OWNER_CAPACITY[b.involvement];
  return Math.max(0, Math.ceil(need));
}
