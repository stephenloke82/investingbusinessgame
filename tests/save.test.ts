import { describe, expect, it } from 'vitest';
import { newGame, advanceMonth, fastForward } from '../src/engine/game';
import { serialize, deserialize, saveToStorage, loadFromStorage, clearStorage, SaveError, type StorageLike } from '../src/engine/save';
import { buy } from '../src/engine/portfolio';
import { netWorth } from '../src/engine/metrics';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

describe('save and load', () => {
  it('round-trips a game exactly and continues identically', () => {
    const a = newGame({ name: 'Saver', backgroundId: 'grad', trackId: 'software', seed: 77 });
    a.budget.k401Pct = 5;
    fastForward(a, 30, { autoAll: true });
    a.cash += 5000;
    buy(a, 'AAPL', 'taxable', 2000);
    const b = deserialize(serialize(a));
    expect(b).toEqual(JSON.parse(JSON.stringify(a)));
    // Same seed state => the future is identical after loading.
    fastForward(a, 24, { autoAll: true });
    fastForward(b, 24, { autoAll: true });
    expect(netWorth(b)).toBeCloseTo(netWorth(a), 6);
    expect(b.market.etfs.SPY.price).toBe(a.market.etfs.SPY.price);
  });

  it('autosaves to storage and loads back', () => {
    const store = new MemoryStorage();
    const g = newGame({ name: 'Auto', backgroundId: 'scholarship', trackId: 'teaching', seed: 5 });
    advanceMonth(g);
    expect(saveToStorage(g, store)).toBe(true);
    const back = loadFromStorage(store)!;
    expect(back.month).toBe(1);
    expect(back.name).toBe('Auto');
    clearStorage(store);
    expect(loadFromStorage(store)).toBeNull();
  });

  it('rejects garbage and foreign files with a friendly error', () => {
    expect(() => deserialize('not json')).toThrow(SaveError);
    expect(() => deserialize('{"hello":1}')).toThrow(SaveError);
    const g = newGame({ name: 'X', backgroundId: 'grad', trackId: 'software', seed: 1 });
    const future = JSON.parse(serialize(g));
    future.state.version = 999;
    expect(() => deserialize(JSON.stringify(future))).toThrow(/newer version/);
  });

  it('survives content edits: removed securities are cashed out, new ones appear', () => {
    const g = newGame({ name: 'Edit', backgroundId: 'scholarship', trackId: 'software', seed: 9 });
    g.cash = 10000;
    buy(g, 'VOO', 'taxable', 1000);
    const data = JSON.parse(serialize(g));
    // Simulate a stock that has since been removed from stocks.ts...
    data.state.accounts.taxable.holdings.GONE = { symbol: 'GONE', lots: [{ shares: 10, cost: 100, month: 0 }] };
    data.state.market.stocks.GONE = { ...data.state.market.stocks.AAPL, ticker: 'GONE', price: 5 };
    // ...and a stock that was added after the save was made.
    delete data.state.market.stocks.MSFT;
    const loaded = deserialize(JSON.stringify(data));
    expect(loaded.accounts.taxable.holdings.GONE).toBeUndefined();
    expect(loaded.accounts.taxable.cash).toBeCloseTo(50, 5);
    expect(loaded.market.stocks.MSFT).toBeDefined();
    advanceMonth(loaded);
    expect(loaded.month).toBe(1);
  });

  it('a whole-career save stays a reasonable size for localStorage', () => {
    const g = newGame({ name: 'Big', backgroundId: 'worker', trackId: 'trades', seed: 3 });
    while (!g.gameOver) fastForward(g, 120, { autoAll: true });
    expect(serialize(g).length).toBeLessThan(4_500_000);
  });
});
