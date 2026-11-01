// A simple "sensible player" policy. Used by the automated full-career
// playthrough tests, and available as an optional helper in the game.
// It follows the guide's own advice: get the 401(k) match, kill card debt,
// build an emergency fund, invest the rest in an S&P 500 index fund, and
// ask for promotions when eligible.

import type { GameState } from '../types';
import { CAREER_BY_ID } from '../data/careers';
import { creditDebt, householdSize } from './finance';
import { savingsRate } from './metrics';
import { RENT_OPTIONS } from '../data/life';
import { promotionCheck, askForPromotion, startCert, applyForJob, jobOptions } from './career';
import { CERT_BY_ID } from '../data/careers';
import { withRng } from './game';

export function applySensiblePolicy(state: GameState): string[] {
  const msgs: string[] = [];
  const b = state.budget;
  const match = CAREER_BY_ID[state.career.trackId]?.match401k ?? 0;
  if (state.career.employed && b.k401Pct < match) b.k401Pct = Math.max(match, 6);
  if (!b.sweepSymbol) {
    b.sweepSymbol = 'VOO';
    b.sweepAccount = 'taxable';
  }
  if (b.emergencyMonths < 3) b.emergencyMonths = 3;
  b.extraDebtPayment = creditDebt(state) > 0 ? 1000 : 0;
  // A balanced person enjoys some of their raises: upgrade lifestyle when saving a lot.
  const sr = savingsRate(state);
  if (state.month > 24 && state.month % 12 === 0 && sr > 0.35 && creditDebt(state) === 0) {
    if (b.lifestyle === 'frugal') b.lifestyle = 'moderate';
    else if (b.lifestyle === 'moderate') b.lifestyle = 'comfortable';
  }
  // Move somewhere big enough for the household once the rent is affordable.
  if (!state.home && state.month % 12 === 0) {
    const size = householdSize(state);
    const income = (state.career.salary + state.family.spouseIncome) / 12;
    const options = RENT_OPTIONS.filter((r) => r.fits >= size && r.rent * state.market.cpi <= income * 0.28 && r.id !== 'luxury-apartment').sort((a, c) => c.happiness - a.happiness);
    if (options[0] && options[0].id !== b.housing && (RENT_OPTIONS.find((r) => r.id === b.housing)?.happiness ?? 0) < options[0].happiness) b.housing = options[0].id;
  }
  if (state.lastFlow.leftover < 0 && state.month > 0) {
    if (b.lifestyle === 'lavish') b.lifestyle = 'comfortable';
    else if (b.lifestyle === 'comfortable') b.lifestyle = 'moderate';
    else if (b.lifestyle === 'moderate') b.lifestyle = 'frugal';
  }
  if (state.stress > 75 && state.career.effort === 'hustle') state.career.effort = 'steady';
  else if (state.stress < 45 && state.career.effort === 'steady') state.career.effort = 'hustle';
  // Career growth
  const promo = promotionCheck(state);
  if (promo.eligible) msgs.push(withRng(state, (rng) => askForPromotion(state, rng)).message);
  if (!state.career.studying && state.career.employed) {
    const next = CAREER_BY_ID[state.career.trackId].levels[state.career.level + 1];
    const need = next?.certs?.find((c) => !state.career.certs.includes(c));
    if (need && CERT_BY_ID[need] && state.cash > CERT_BY_ID[need].cost * state.market.cpi * 2) msgs.push(startCert(state, need));
  }
  if (!state.career.employed && state.career.monthsUnemployed > 2) {
    const opt = jobOptions(state).filter((o) => o.trackId === state.career.trackId).sort((a, b) => b.chance - a.chance)[0];
    if (opt) msgs.push(withRng(state, (rng) => applyForJob(state, rng, opt)).message);
  }
  return msgs;
}
