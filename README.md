# Wealth Path

An educational life-simulation game that runs in the browser. Live a whole career one month at a time:

- budget for real life,
- climb a career ladder,
- build a business empire,
- invest what is left in index funds and individual stocks.

A built-in coach ("Sage") explains everything and can read its advice aloud.

The lesson the game is built around: **do well in your job and business, spend less than you earn, and invest steadily in low-cost index funds like an S&P 500 fund. That builds substantial wealth with little stress.**

> Wealth Path is an educational game. Companies are real, but every price, earnings report and event is simulated from approximate starting data. Nothing in it is financial advice.

## Playing

- **One turn = one month.** Press **Next month**, or use **Fast-forward** (3 months, 1 year, 5 years, or to retirement).
  - During fast-forward, minor events are decided with a sensible default.
  - Fast-forward always stops for big decisions. Settings can make it stop for every event.
- **Every month brings a decision**: job offers, hot stock tips, car repairs, crashes, family events, business problems. Most come with a short lesson.
- **Views**:

  | View | What it holds |
  |---|---|
  | Home | Dashboard |
  | Budget | Cash flow, housing (rent or buy), cars, lifestyle, insurance, 401(k), debts |
  | Market | 82 stocks and 21 funds |
  | Company detail | Fundamentals, earnings beats and misses, price chart vs the S&P 500 |
  | Portfolio | Holdings, automatic investing, Roth IRA and 401(k) |
  | Career | Effort, promotions, certifications, degree, job market |
  | Business | 8 business types, staff, pricing, marketing, locations, selling |
  | History | Charts, year-by-year table, achievements, life log |
  | Guide | Advice, Q&A, Learn library, compound interest calculator, voice settings |

- **The game ends at 65**, or earlier if you reach financial independence and choose to retire. It finishes with a report card.
- **Saving**: the game autosaves to your browser (localStorage). Use the ☰ menu to export a save file or import one.
- **Keyboard**: `N` plays the next month.

## Running it locally

You need Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the automated tests (simulation, finances, events, guide, save/load, full-career playthroughs) |
| `npm run build` | Type-checks and builds the static site into `dist/` |
| `npm run preview` | Serves the built site locally |
| `npm run e2e` | Plays a full game through the real UI in headless Chromium, on desktop and phone sizes. Run `npm run build` first. Needs Playwright with Chromium installed (`npm i -D playwright && npx playwright install chromium`). |

## Deploying to GitHub Pages (free)

The workflow in `.github/workflows/deploy.yml` tests, builds and deploys the game every time `main` changes.

**One manual step:** in the GitHub repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

After the next push to `main` (or a manual run from the Actions tab), the game is live at:

`https://<your-user>.github.io/<repo-name>/` (for this repo: https://stephenloke82.github.io/investingbusinessgame/)

The build uses relative paths, so it also works on any static host (Netlify, Cloudflare Pages, or a plain folder).

## Where to edit content

All content lives in plain TypeScript data files in `src/data/` and `src/config.ts`. The compiler catches typos: run `npm test` after editing.

| What | File | Notes |
|---|---|---|
| Stocks | `src/data/stocks.ts` | Real tickers with approximate starting fundamentals (`STOCK_DATA_AS_OF` gives the date). Copy an entry to add a company. Keep `marketCapB`, `revenueB` and `netMargin` consistent, because P/E is derived from them. |
| ETFs and funds | `src/data/etfs.ts` | Fees, yields, market and sector exposure, and whether the fund appears in the 401(k) menu. |
| Monthly events | `src/data/events.ts` | Title, text, conditions, 2–4 choices with effects, and a lesson. Exactly one choice must be `auto: true` (the fast-forward default). Money is in start-year dollars; the game adds inflation. |
| Guide text | `src/data/guide.ts` | Guide name and core message, tutorial steps, contextual tips (priority and condition), the Learn library, and year-end comments. |
| Careers and certifications | `src/data/careers.ts` | Levels, salaries, requirements, 401(k) match. |
| Businesses | `src/data/businesses.ts` | Startup cost, demand, ticket size, staff capacity, wages, rent. |
| Budget, taxes, insurance | `src/data/life.ts` | Rents, home prices, cars, lifestyle levels, insurance prices, simplified tax brackets, account limits. |
| Starting backgrounds (difficulty) | `src/data/backgrounds.ts` | |
| Achievements | `src/data/achievements.ts` | |
| Market behaviour | `src/data/marketModel.ts`, `src/data/sectors.ts` | Bull/bear/crash regimes, volatility, earnings reactions. `tests/market.test.ts` checks that long-run results stay realistic after edits. |
| Title, start year, retirement age, disclaimer | `src/config.ts` | |

Saves stay compatible when you add or remove stocks and funds. New securities appear in old saves, and holdings of removed ones are converted to cash.

## Promotion slots for courses and ebooks (switched off)

`src/config.ts` has a `PROMO_CONFIG` with `enabled: false` and placeholder slots. To use it:

1. Set `enabled: true`.
2. Fill in real titles, descriptions and URLs.
3. Choose where each slot appears with `placements`:
   - `'guide'`: the Guide view
   - `'year-end'`: the year-end summary
   - `'report-card'`: the final report card
   - `'topic'`: inside Learn topics, optionally filtered by topic id with `topics`

Nothing is shown while it is disabled.

## Plugging in a real AI guide later

The guide is rule-based (`src/engine/coach.ts`) and works offline with no API key.

To use an LLM:

1. Write a small server endpoint (your own proxy that holds the API key).
2. Set `LLM_GUIDE_ENDPOINT` in `src/config.ts` to that endpoint's URL.

`ProxyLlmGuide` then POSTs `{ question, coreMessage, summary }` and expects `{ answer }`. It falls back to the built-in coach on any error.

**Never put an API key in client code.**

## How the simulation works (short version)

- **Market**: a seeded simulation, not live data.
  - The US market switches between bull, steady, bear, crash and recovery regimes.
  - Each sector gets its own shocks.
  - Each company has revenue, growth, margins and a valuation that drifts toward a fair P/E.
  - Companies report quarterly earnings against estimates, and prices react.
- **No rigging**: every stock and fund is given the same expected long-run total return as the market. Single stocks simply carry far more company-specific risk.
  - Over 30 years an equal-weight basket of all the stocks roughly matches the index.
  - Most individual stocks lag it; a few beat it by a lot.
  - The tests check this, so the "buy the index" lesson comes out of the maths rather than being hard-coded.
- **S&P-only comparison**: every dollar you invest or withdraw is mirrored into a hypothetical S&P 500 fund. You can always see how your choices compare with simply buying the index.
- **Finances**: simplified US-style rules.
  - Progressive income tax, payroll tax, capital gains and dividend tax.
  - 401(k) with employer match, Roth IRA limits, early-withdrawal penalties.
  - Credit cards at 24%, mortgages, car loans, inflation, home prices.
  - If debt spirals out of control, the game offers a debt management plan or bankruptcy, so there are no dead ends.

## Project layout

```
src/
  config.ts        game settings, disclaimer, promo slots, LLM endpoint
  types.ts         shared types
  data/            all editable content (see table above)
  engine/          simulation: market, finance, portfolio, career, business, events, coach, save, report
  ui/              views, charts (SVG), speech, app controller
tests/             vitest suites incl. full-career playthroughs
scripts/e2e.mjs    browser playthrough with Playwright
```
