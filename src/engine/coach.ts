// The in-game guide ("coach").
//
// The default guide is rule-based: it reads the game state and picks tips from
// src/data/guide.ts. No API key is needed. To plug in a real LLM later, implement
// GuideProvider with a class that calls YOUR OWN server proxy (which holds the
// key) and register it with setGuideProvider(). Never call an LLM API directly
// from the browser with a key in client code.

import type { GameState } from '../types';
import { GUIDE, TIPS, TOPICS, YEAR_END_LINES, type GuideCtx, type Topic } from '../data/guide';
import { LLM_GUIDE_ENDPOINT } from '../config';
import { CAREER_BY_ID } from '../data/careers';
import { age, emergencyMonths, fiProgress, largestPosition, netWorth, savingsRate, stockShare, vsIndex, yearsLeft } from './metrics';
import { creditDebt, hasHealthInsurance, monthlyEssentials, totalDebt } from './finance';
import { investmentsValue } from './portfolio';
import { promotionCheck } from './career';
import { spDrawdown } from './market';
import type { YearSummary } from '../types';

export interface GuideMessage {
  id: string;
  tone: 'warn' | 'tip' | 'praise' | 'lesson';
  text: string;
  action?: { label: string; view: string };
}

export interface GuideProvider {
  readonly name: string;
  /** Contextual advice for the current state, most important first. */
  advise(state: GameState): GuideMessage[];
  /** Answer a free-text question from the player. */
  answer(state: GameState, question: string): Promise<string>;
}

export function buildCtx(s: GameState): GuideCtx {
  const essentials = monthlyEssentials(s);
  const promo = promotionCheck(s);
  const losing = s.businesses.find((b) => b.monthsLosing >= 3 && s.month - b.foundedMonth > 8);
  const gaps: string[] = [];
  if (!hasHealthInsurance(s)) gaps.push('You have no health insurance; one hospital visit could cost thousands.');
  if (s.family.kids.length > 0 && !s.budget.insurance.life) gaps.push('With kids depending on you, term life insurance is cheap protection.');
  if (s.businesses.length > 0 && !s.budget.insurance.umbrella && s.businesses.some((b) => b.locations > 1)) gaps.push('A growing business is a lawsuit target; consider umbrella coverage.');
  const lf = s.lastFlow;
  const leftover = s.month === 0 ? 0 : lf.leftover + lf.invested - lf.k401;
  return {
    s,
    age: age(s),
    cash: s.cash,
    emergencyMonths: emergencyMonths(s),
    emergencyTarget: s.budget.emergencyMonths,
    essentials,
    creditDebt: creditDebt(s),
    totalDebt: totalDebt(s),
    investments: investmentsValue(s),
    stockShare: stockShare(s),
    largest: largestPosition(s),
    match: CAREER_BY_ID[s.career.trackId]?.match401k ?? 0,
    leftover,
    savingsRate: savingsRate(s),
    fiProgress: fiProgress(s),
    netWorth: netWorth(s),
    promoEligible: promo.eligible,
    promoMissing: promo.missing,
    regime: s.market.regime,
    drawdown: spDrawdown(s.market),
    vsIndex: vsIndex(s),
    hasAutoInvest: s.budget.autoInvest.length > 0 || !!s.budget.sweepSymbol,
    stress: s.stress,
    health: s.health,
    businessLosing: losing ? losing.name : null,
    idleCashMonths: essentials > 0 ? s.cash / essentials - s.budget.emergencyMonths : 0,
    insuranceGaps: gaps,
    yearsLeft: yearsLeft(s),
  };
}

/** Find the most relevant Learn topics for a question. */
export function searchTopics(question: string): Topic[] {
  const q = question.toLowerCase();
  const words = q.split(/[^a-z0-9%&()/]+/).filter((w) => w.length > 1);
  const scored = TOPICS.map((t) => {
    let score = 0;
    for (const k of t.keywords) if (q.includes(k)) score += k.length > 3 ? 3 : 2;
    for (const w of words) if (t.title.toLowerCase().includes(w)) score += 1;
    return { t, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((x) => x.t);
}

export class RuleBasedGuide implements GuideProvider {
  readonly name = 'Built-in coach';

  advise(state: GameState): GuideMessage[] {
    const ctx = buildCtx(state);
    return TIPS.filter((t) => {
      try {
        return t.when(ctx);
      } catch {
        return false;
      }
    })
      .sort((a, b) => b.priority - a.priority)
      .map((t) => ({ id: t.id, tone: t.tone, text: t.text(ctx), action: t.action }));
  }

  async answer(state: GameState, question: string): Promise<string> {
    const topics = searchTopics(question);
    if (!topics.length) {
      const top = this.advise(state)[0];
      return `I am a simple built-in coach, so I answer best about topics in the Learn library (index funds, debt, P/E ratios, crashes, 401(k), business...). Right now my top suggestion is: ${top.text}`;
    }
    return topics.map((t) => `${t.title}: ${t.body.join(' ')}`).join('\n\n');
  }
}

/**
 * Example provider for a future LLM. It sends a compact summary of the game
 * (no personal data, no keys) to your own server endpoint, which calls the LLM.
 * Falls back to the rule-based coach on any error.
 */
export class ProxyLlmGuide implements GuideProvider {
  readonly name = 'AI coach (server proxy)';
  private fallback = new RuleBasedGuide();
  constructor(private endpoint: string) {}

  advise(state: GameState): GuideMessage[] {
    return this.fallback.advise(state);
  }

  async answer(state: GameState, question: string): Promise<string> {
    try {
      const ctx = buildCtx(state);
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          coreMessage: GUIDE.coreMessage,
          summary: {
            age: Math.floor(ctx.age),
            netWorth: Math.round(ctx.netWorth),
            cash: Math.round(ctx.cash),
            investments: Math.round(ctx.investments),
            creditDebt: Math.round(ctx.creditDebt),
            emergencyMonths: Number(ctx.emergencyMonths.toFixed(1)),
            savingsRate: Number(ctx.savingsRate.toFixed(2)),
            stockShare: Number(ctx.stockShare.toFixed(2)),
            regime: ctx.regime,
          },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { answer?: string };
      return data.answer || (await this.fallback.answer(state, question));
    } catch {
      return this.fallback.answer(state, question);
    }
  }
}

let provider: GuideProvider = LLM_GUIDE_ENDPOINT ? new ProxyLlmGuide(LLM_GUIDE_ENDPOINT) : new RuleBasedGuide();

export function getGuide(): GuideProvider {
  return provider;
}
export function setGuideProvider(p: GuideProvider): void {
  provider = p;
}

/** The single most important next step, always shown at the top of the screen. */
export function nextStep(state: GameState): GuideMessage {
  return getGuide().advise(state)[0] ?? { id: 'default', tone: 'tip', text: 'Press Next Month to continue.' };
}

export function yearEndComment(state: GameState, y: YearSummary): string[] {
  const out: string[] = [];
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  if (y.savingsRate < 0) out.push(YEAR_END_LINES.negativeSaver);
  else if (y.savingsRate >= 0.2) out.push(YEAR_END_LINES.highSaver.replace('{rate}', pct(y.savingsRate)));
  else out.push(YEAR_END_LINES.lowSaver.replace('{rate}', pct(y.savingsRate)));
  if (investmentsValue(state) > 1000) {
    const diff = y.portfolioReturn - y.spReturn;
    if (stockShare(state) > 0.2) out.push(diff > 0.01 ? YEAR_END_LINES.beatMarketPicks : diff < -0.01 ? YEAR_END_LINES.lagMarketPicks : YEAR_END_LINES.matchedMarket);
    else out.push(YEAR_END_LINES.matchedMarket);
    if (y.spReturn < -0.05) out.push(YEAR_END_LINES.marketDown);
  }
  return out;
}
