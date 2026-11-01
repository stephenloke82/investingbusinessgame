import { describe, expect, it } from 'vitest';
import { EVENTS } from '../src/data/events';
import { TIPS, TOPICS, TUTORIAL } from '../src/data/guide';
import { newGame, fastForward } from '../src/engine/game';
import { applyEffect, conditionsMet, drawEvent, autoChoice } from '../src/engine/events';
import { buildCtx, getGuide, nextStep, searchTopics } from '../src/engine/coach';
import { Rng } from '../src/engine/rng';
import { buy } from '../src/engine/portfolio';
import { startBusiness } from '../src/engine/business';
import { PROMO_CONFIG } from '../src/config';

describe('event data', () => {
  it('has many events with unique ids, one auto choice and an always-available choice', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (const e of EVENTS) {
      expect(e.choices.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.choices.filter((c) => c.auto).length, e.id).toBe(1);
      expect(e.choices.some((c) => c.requiresCash === undefined), e.id).toBe(true);
    }
  });

  it('every choice of every event can be applied without errors', () => {
    for (const e of EVENTS) {
      e.choices.forEach((c, i) => {
        const s = newGame({ name: 'E', backgroundId: 'scholarship', trackId: 'software', seed: 11 });
        s.cash = 100000;
        buy(s, 'AAPL', 'taxable', 5000);
        buy(s, 'VOO', 'taxable', 5000);
        startBusiness(s, new Rng(1), 'online', false);
        const rng = new Rng(i + 1);
        expect(() => applyEffect(s, rng, c.effect, { ticker: 'AAPL', category: e.category }), `${e.id}#${i}`).not.toThrow();
        expect(Number.isFinite(s.cash), `${e.id}#${i}`).toBe(true);
        expect(s.cash, `${e.id}#${i}`).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('respects negative conditions (married: false etc.)', () => {
    const s = newGame({ name: 'C', backgroundId: 'grad', trackId: 'software', seed: 2 });
    expect(conditionsMet(s, { married: false })).toBe(true);
    s.family.married = true;
    expect(conditionsMet(s, { married: false })).toBe(false);
    expect(conditionsMet(s, { regime: ['crash'] })).toBe(false);
  });

  it('draws an event every month with placeholders filled in', () => {
    const s = newGame({ name: 'Drawer', backgroundId: 'grad', trackId: 'software', seed: 4 });
    const rng = new Rng(9);
    for (let i = 0; i < 50; i++) {
      const ev = drawEvent(s, rng);
      expect(ev).toBeDefined();
      expect(ev!.text).not.toMatch(/\{(name|ticker|company|employer|business|spouse|amount)\}/);
      expect(autoChoice(ev!)).toBeGreaterThanOrEqual(0);
      s.month++;
    }
  });

  it('forces the debt crisis rescue when card debt spirals', () => {
    const s = newGame({ name: 'Debt', backgroundId: 'grad', trackId: 'retail', seed: 4 });
    s.debts.find((d) => d.kind === 'credit')!.balance = 60000;
    const ev = drawEvent(s, new Rng(3));
    expect(ev?.defId).toBe('money_debt_crisis');
  });
});

describe('guide', () => {
  it('always has a next step and the content is complete', () => {
    expect(TUTORIAL.length).toBeGreaterThanOrEqual(6);
    expect(TOPICS.length).toBeGreaterThanOrEqual(12);
    expect(TIPS.some((t) => t.id === 'default')).toBe(true);
    const s = newGame({ name: 'G', backgroundId: 'grad', trackId: 'software', seed: 1 });
    const tip = nextStep(s);
    expect(tip.text.length).toBeGreaterThan(20);
    // Starting with card debt, the guide's first priority is that debt.
    expect(tip.id).toBe('credit-debt');
  });

  it('warns about concentration in a single stock', () => {
    const s = newGame({ name: 'G', backgroundId: 'scholarship', trackId: 'software', seed: 1 });
    s.cash = 20000;
    buy(s, 'TSLA', 'taxable', 15000);
    const ids = getGuide().advise(s).map((t) => t.id);
    expect(ids).toContain('concentration');
    expect(buildCtx(s).largest?.symbol).toBe('TSLA');
  });

  it('answers questions from the Learn library', async () => {
    expect(searchTopics('what is a P/E ratio?')[0].id).toBe('pe-ratio');
    const s = newGame({ name: 'G', backgroundId: 'grad', trackId: 'software', seed: 1 });
    const a = await getGuide().answer(s, 'should I panic sell in a crash');
    expect(a).toMatch(/crash/i);
    const fallback = await getGuide().answer(s, 'zzzz');
    expect(fallback).toMatch(/suggestion/);
  });

  it('every tip evaluates without errors through a full game', () => {
    const s = newGame({ name: 'G', backgroundId: 'late', trackId: 'retail', seed: 8 });
    while (!s.gameOver) {
      fastForward(s, 24, { autoAll: true });
      const tips = getGuide().advise(s);
      expect(tips.length).toBeGreaterThan(0);
      for (const t of tips) expect(t.text).not.toMatch(/undefined|NaN/);
    }
  });

  it('the promotion hook is off by default and has no invented products', () => {
    expect(PROMO_CONFIG.enabled).toBe(false);
    for (const s of PROMO_CONFIG.slots) {
      expect(s.url).toBe('');
      expect(s.title).toMatch(/placeholder/i);
    }
  });
});
