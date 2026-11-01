// Game-wide settings and the (dormant) promotion hook.
// Everything here is safe to edit.

export const GAME_CONFIG = {
  title: 'Wealth Path',
  subtitle: 'Build a career, grow a business, invest the rest.',
  /** Calendar year the simulation starts in. Purely cosmetic: the market is simulated. */
  startYear: 2026,
  retireAge: 65,
  /** localStorage key for the autosave. Bump the suffix if the save format changes incompatibly. */
  saveKey: 'wealth-path-save-v1',
  settingsKey: 'wealth-path-settings-v1',
  /** Share of years with an event; 1 = an event every month. */
  eventsPerMonth: 1,
  disclaimer:
    'Wealth Path is an educational game. Companies are real but all prices, earnings and events are simulated from approximate starting data, and future results are made up by the simulation. Nothing here is financial advice or a recommendation to buy or sell any security.',
};

/**
 * Promotion slots ("Learn more" boxes) for the owner's future courses and ebooks.
 * Switched OFF by default. To turn on: set `enabled: true` and fill in real
 * titles, text and URLs. Each slot appears in the places listed in `placements`.
 * No product names or prices are invented here; these are placeholders.
 */
export interface PromoSlot {
  id: string;
  /** Where the slot may appear. */
  placements: ('guide' | 'year-end' | 'report-card' | 'topic')[];
  /** Only show next to these guide topic ids (empty = any). */
  topics?: string[];
  title: string;
  body: string;
  ctaLabel: string;
  url: string;
}

export const PROMO_CONFIG: { enabled: boolean; heading: string; slots: PromoSlot[] } = {
  enabled: false,
  heading: 'Learn more',
  slots: [
    {
      id: 'placeholder-course',
      placements: ['guide', 'report-card'],
      title: '[Course title placeholder]',
      body: '[Short description of the course goes here.]',
      ctaLabel: 'Learn more',
      url: '',
    },
    {
      id: 'placeholder-ebook',
      placements: ['year-end', 'topic'],
      topics: ['index-funds', 'compound'],
      title: '[Ebook title placeholder]',
      body: '[Short description of the ebook goes here.]',
      ctaLabel: 'Read more',
      url: '',
    },
  ],
};

/**
 * Optional AI guide endpoint. Leave null to use the built-in rule-based coach.
 * If you add an LLM later, point this at YOUR OWN server proxy that holds the API
 * key. Never put an API key in this file or anywhere in client code.
 */
export const LLM_GUIDE_ENDPOINT: string | null = null;
