// UI-only state (not saved with the game).
import type { GameState } from '../types';
import { GAME_CONFIG } from '../config';

export type View = 'dashboard' | 'budget' | 'market' | 'security' | 'portfolio' | 'career' | 'business' | 'history' | 'guide' | 'report';

export interface Prefs {
  voiceOn: boolean;
  voiceName: string;
  voiceRate: number;
  pauseOnAllEvents: boolean;
  theme: 'auto' | 'light' | 'dark';
  tutorialDone: boolean;
}

export interface UiState {
  game: GameState | null;
  view: View;
  prevView: View;
  symbol: string;
  marketFilter: string;
  marketSort: string;
  marketSearch: string;
  chartRange: 'y1' | 'y5' | 'max';
  historyRange: 'y5' | 'y10' | 'max';
  tradeAccount: 'taxable' | 'roth' | 'k401';
  toast: { text: string; kind: 'good' | 'bad' | 'info' } | null;
  eventResult: { title: string; lines: string[]; lesson?: string } | null;
  showYear: boolean;
  menuOpen: boolean;
  ffOpen: boolean;
  confirmNew: boolean;
  askAnswer: string;
  calc: { start: number; monthly: number; rate: number; years: number };
  openTopic: string;
  prefs: Prefs;
  lastSpoken: string;
  newGameStep: number;
}

const DEFAULT_PREFS: Prefs = { voiceOn: false, voiceName: '', voiceRate: 1, pauseOnAllEvents: false, theme: 'auto', tutorialDone: false };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(GAME_CONFIG.settingsKey);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PREFS };
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(GAME_CONFIG.settingsKey, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function initialUi(): UiState {
  return {
    game: null,
    view: 'dashboard',
    prevView: 'dashboard',
    symbol: 'SPY',
    marketFilter: 'all',
    marketSort: 'cap',
    marketSearch: '',
    chartRange: 'y5',
    historyRange: 'max',
    tradeAccount: 'taxable',
    toast: null,
    eventResult: null,
    showYear: false,
    menuOpen: false,
    ffOpen: false,
    confirmNew: false,
    askAnswer: '',
    calc: { start: 1000, monthly: 500, rate: 8, years: 30 },
    openTopic: '',
    prefs: loadPrefs(),
    lastSpoken: '',
    newGameStep: 0,
  };
}
