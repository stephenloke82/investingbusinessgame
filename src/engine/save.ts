// Saving and loading games (localStorage autosave + export/import as a file).

import type { GameState } from '../types';
import { GAME_CONFIG } from '../config';
import { SAVE_VERSION } from './game';
import { STOCKS } from '../data/stocks';
import { ETFS } from '../data/etfs';
import { initMarket } from './market';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* storage blocked */
  }
  return null;
}

export function serialize(state: GameState): string {
  return JSON.stringify({ app: 'wealth-path', version: SAVE_VERSION, savedAt: new Date().toISOString(), state });
}

export class SaveError extends Error {}

/** Parse and validate a save file. Throws SaveError with a friendly message if it is not usable. */
export function deserialize(text: string): GameState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SaveError('That file is not a valid save (could not read JSON).');
  }
  const wrap = data as { app?: string; version?: number; state?: GameState };
  const state = (wrap && wrap.state) || (data as GameState);
  if (!state || typeof state !== 'object' || typeof state.month !== 'number' || !state.market || !state.accounts || !state.career) {
    throw new SaveError('That file does not look like a Wealth Path save.');
  }
  if ((state.version ?? 0) > SAVE_VERSION) throw new SaveError('That save was made by a newer version of the game.');
  return migrate(state);
}

/**
 * Bring older saves up to date and repair anything missing, so content edits
 * (adding or removing stocks/ETFs) never break an existing save.
 */
export function migrate(state: GameState): GameState {
  const fresh = initMarket(state.seed ?? 1);
  // Add securities that were added to the data files since the save was made.
  for (const s of STOCKS) {
    if (!state.market.stocks[s.ticker]) {
      const st = fresh.stocks[s.ticker];
      st.history = new Array(Math.max(1, state.month + 1)).fill(st.price);
      state.market.stocks[s.ticker] = st;
    }
    state.market.stocks[s.ticker].intrinsic ??= 0;
  }
  for (const e of ETFS) {
    if (!state.market.etfs[e.ticker]) {
      const et = fresh.etfs[e.ticker];
      et.history = new Array(Math.max(1, state.month + 1)).fill(et.price);
      state.market.etfs[e.ticker] = et;
    }
  }
  // Remove holdings of securities that no longer exist (sold at their last price into account cash).
  for (const acct of Object.values(state.accounts)) {
    for (const [sym, h] of Object.entries(acct.holdings)) {
      const known = STOCKS.some((s) => s.ticker === sym) || ETFS.some((e) => e.ticker === sym);
      if (!known) {
        const last = state.market.stocks[sym]?.price ?? state.market.etfs[sym]?.price ?? 0;
        acct.cash += h.lots.reduce((s, l) => s + l.shares, 0) * last;
        delete acct.holdings[sym];
      }
    }
  }
  state.market.valuation ??= 0;
  state.market.housingIndex ??= 1;
  state.market.housingIndexChange ??= 0;
  state.stats.lastStockTrades ??= state.stats.stockTrades ?? 0;
  state.stats.crashPanicBaseline ??= -1;
  state.stats.autoDecisions ??= 0;
  state.career.searching ??= !state.career.employed;
  state.career.benefitsMonths ??= 0;
  state.career.lastSalary ??= state.career.salary;
  state.career.onLeave ??= false;
  state.flags ??= [];
  state.version = SAVE_VERSION;
  return state;
}

export function saveToStorage(state: GameState, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(GAME_CONFIG.saveKey, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadFromStorage(storage: StorageLike | null = defaultStorage()): GameState | null {
  if (!storage) return null;
  try {
    const text = storage.getItem(GAME_CONFIG.saveKey);
    if (!text) return null;
    return deserialize(text);
  } catch {
    return null;
  }
}

export function clearStorage(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(GAME_CONFIG.saveKey);
  } catch {
    /* ignore */
  }
}

export function saveFileName(state: GameState): string {
  const safe = state.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'player';
  return `wealth-path-${safe}-month-${state.month}.json`;
}
