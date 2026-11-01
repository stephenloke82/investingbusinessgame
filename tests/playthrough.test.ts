// Automated full-career playthroughs of the engine: every background x every
// career, with a sensible player and with a careless player. Checks that the
// game always reaches retirement with no stuck or broken state.
import { describe, expect, it } from 'vitest';
import { newGame, fastForward, advanceMonth, chooseEvent } from '../src/engine/game';
import { applySensiblePolicy } from '../src/engine/autopilot';
import { BACKGROUNDS } from '../src/data/backgrounds';
import { CAREERS } from '../src/data/careers';
import { netWorth, shadowValue } from '../src/engine/metrics';
import { investmentsValue, buy } from '../src/engine/portfolio';
import { reportCard } from '../src/engine/report';
import { autoChoice } from '../src/engine/events';
import type { GameState } from '../src/types';

function checkInvariants(s: GameState) {
  expect(Number.isFinite(s.cash)).toBe(true);
  expect(s.cash).toBeGreaterThanOrEqual(-0.01);
  expect(Number.isFinite(netWorth(s))).toBe(true);
  for (const d of s.debts) expect(Number.isFinite(d.balance) && d.balance >= 0).toBe(true);
  for (const k of ['stress', 'happiness', 'health'] as const) expect(s[k]).toBeGreaterThanOrEqual(0), expect(s[k]).toBeLessThanOrEqual(100);
  for (const b of s.businesses) expect(Number.isFinite(b.cash)).toBe(true);
}

function playSensible(s: GameState) {
  let guard = 0;
  while (!s.gameOver && guard++ < 3000) {
    applySensiblePolicy(s);
    if (s.pendingEvent) chooseEvent(s, autoChoice(s.pendingEvent));
    else advanceMonth(s);
    if (s.month % 12 === 0) checkInvariants(s);
  }
  return guard;
}

describe('full-career playthroughs', () => {
  for (const bg of BACKGROUNDS) {
    for (const tr of CAREERS) {
      it(`sensible player: ${bg.id} + ${tr.id} reaches retirement`, () => {
        const s = newGame({ name: 'Sim', backgroundId: bg.id, trackId: tr.id, seed: 1000 + bg.id.length * 31 + tr.id.length });
        const steps = playSensible(s);
        expect(steps).toBeLessThan(3000);
        expect(s.gameOver).toBe(true);
        expect(s.history.length).toBe((s.retireAge - s.startAge) * 12);
        expect(s.years.length).toBe(s.retireAge - s.startAge);
        checkInvariants(s);
        // The guide's recipe builds real wealth.
        expect(netWorth(s) / s.market.cpi).toBeGreaterThan(250000);
        const r = reportCard(s);
        expect(r.lines.length).toBeGreaterThan(5);
      });
    }
  }

  it('careless player (lavish spending, no investing) still never gets stuck', () => {
    for (const bg of BACKGROUNDS) {
      const s = newGame({ name: 'YOLO', backgroundId: bg.id, trackId: 'retail', seed: 55 });
      s.budget.lifestyle = 'lavish';
      s.budget.housing = 'luxury-apartment';
      let guard = 0;
      while (!s.gameOver && guard++ < 100) {
        fastForward(s, 60, { autoAll: true });
        checkInvariants(s);
      }
      expect(s.gameOver).toBe(true);
      expect(s.pendingEvent).toBeUndefined();
    }
  });

  it('stock picker vs index investor: same deposits, compared fairly', () => {
    const results: { picker: number; shadow: number }[] = [];
    for (let seed = 1; seed <= 6; seed++) {
      const s = newGame({ name: 'Picker', backgroundId: 'scholarship', trackId: 'software', seed });
      const picks = ['NVDA', 'TSLA', 'AAPL', 'KO', 'JPM'];
      while (!s.gameOver) {
        if (s.cash > 3000 && s.month % 3 === 0) buy(s, picks[(s.month / 3) % picks.length], 'taxable', s.cash - 2000);
        fastForward(s, 3, { autoAll: true });
      }
      results.push({ picker: investmentsValue(s), shadow: shadowValue(s) });
    }
    // Both build wealth; the comparison exists and is finite.
    for (const r of results) {
      expect(r.picker).toBeGreaterThan(0);
      expect(r.shadow).toBeGreaterThan(0);
    }
  });

  it('fast-forward stops for major events unless autopilot is on', () => {
    const s = newGame({ name: 'FF', backgroundId: 'grad', trackId: 'software', seed: 21 });
    let stoppedForEvent = false;
    while (!s.gameOver) {
      const r = fastForward(s, 120);
      if (r.stoppedFor === 'event') {
        stoppedForEvent = true;
        expect(s.pendingEvent?.major).toBe(true);
        chooseEvent(s, autoChoice(s.pendingEvent!));
      }
    }
    expect(stoppedForEvent).toBe(true);
  });
});
