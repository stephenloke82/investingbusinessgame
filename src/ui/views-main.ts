// Layout, dashboard, budget and portfolio views.
import type { GameState } from '../types';
import type { UiState, View } from './state';
import { html, raw, type Raw } from './html';
import { compact, money, pct, signedPct, tone } from './format';
import { lineChart } from './charts';
import { GAME_CONFIG } from '../config';
import { GUIDE } from '../data/guide';
import { HOME_OPTIONS, HOME_RULES, INSURANCE_OPTIONS, LIFESTYLE_OPTIONS, RENT_OPTIONS, TRANSPORT_OPTIONS } from '../data/life';
import { CAREER_BY_ID } from '../data/careers';
import { ETFS } from '../data/etfs';
import { STOCKS } from '../data/stocks';
import { nextStep } from '../engine/coach';
import { monthlyGrossIncome, age, dateLabel, emergencyMonths, fiNumber, fiProgress, investableAssets, netWorth, savingsRate, shadowValue, retirementValue } from '../engine/metrics';
import { accountValue, ACCOUNT_LABELS, contributionRoom, investmentsValue, positions } from '../engine/portfolio';
import { creditDebt, flowTotalIn, hasEmployerHealth, homeEquity, monthlyEssentials, quoteHome, totalDebt, TRANSPORT_BY_ID } from '../engine/finance';
import { currentTitle } from '../engine/career';
import { businessesValue } from '../engine/business';
import { isStock, securityName, priceOf, spDrawdown } from '../engine/market';
import { REGIMES } from '../data/marketModel';
import { canRetireEarly } from '../engine/game';
import { ACHIEVEMENTS } from '../data/achievements';

const NAV: { view: View; label: string; icon: string }[] = [
  { view: 'dashboard', label: 'Home', icon: '🏠' },
  { view: 'budget', label: 'Budget', icon: '🧾' },
  { view: 'market', label: 'Market', icon: '📊' },
  { view: 'portfolio', label: 'Portfolio', icon: '💼' },
  { view: 'career', label: 'Career', icon: '🎓' },
  { view: 'business', label: 'Business', icon: '🏪' },
  { view: 'history', label: 'History', icon: '📈' },
  { view: 'guide', label: 'Guide', icon: '🧭' },
];

export function header(s: GameState, ui: UiState): Raw {
  const nw = netWorth(s);
  return html`<div class="chrome">
  <header class="topbar">
    <div class="brand"><span class="logo" aria-hidden="true">◆</span><span class="brand-name">${GAME_CONFIG.title}</span></div>
    <div class="top-stats">
      <div class="top-stat"><span class="label">Date</span><span class="value">${dateLabel(s)}</span></div>
      <div class="top-stat"><span class="label">Age</span><span class="value">${Math.floor(age(s))}</span></div>
      <div class="top-stat"><span class="label">Cash</span><span class="value">${compact(s.cash)}</span></div>
      <div class="top-stat"><span class="label">Net worth</span><span class="value ${tone(nw)}">${compact(nw)}</span></div>
    </div>
    <div class="top-actions">
      ${s.gameOver
        ? html`<button class="btn primary" data-action="nav" data-view="report">Report card</button>`
        : html`<button class="btn primary" data-action="next-month" title="Play one month (shortcut: N)">Next month ▶</button>
      <div class="ff">
        <button class="btn" data-action="toggle-ff" aria-expanded="${ui.ffOpen}">Fast-forward ▾</button>
        ${ui.ffOpen
          ? html`<div class="menu">
          <button data-action="ff" data-months="3">3 months</button>
          <button data-action="ff" data-months="12">1 year</button>
          <button data-action="ff" data-months="60">5 years</button>
          <button data-action="ff" data-months="9999">To retirement</button>
          <p class="menu-note">Minor events use sensible defaults. I stop for big decisions${ui.prefs.pauseOnAllEvents ? ' and every event (setting)' : ''}.</p>
        </div>`
          : ''}
      </div>`}
      <div class="ff">
        <button class="btn icon" data-action="toggle-menu" aria-label="Menu" aria-expanded="${ui.menuOpen}">☰</button>
        ${ui.menuOpen
          ? html`<div class="menu right">
          <button data-action="export">Export save file</button>
          <label class="menu-file">Import save file<input type="file" accept="application/json,.json" data-action-change="import" hidden></label>
          <button data-action="nav" data-view="guide">Voice &amp; settings</button>
          <button data-action="restart-tutorial">Restart tutorial</button>
          <button data-action="new-game" class="danger-text">New game…</button>
        </div>`
          : ''}
      </div>
    </div>
  </header>
  <nav class="tabs" aria-label="Sections">
    ${NAV.map((n) => html`<button class="tab ${ui.view === n.view || (ui.view === 'security' && n.view === 'market') ? 'active' : ''}" data-action="nav" data-view="${n.view}"><span class="tab-icon" aria-hidden="true">${n.icon}</span><span>${n.label}</span></button>`)}
  </nav></div>`;
}

export function coachBar(s: GameState): Raw {
  const tip = nextStep(s);
  return html`
  <section class="coach coach-${tip.tone}" aria-live="polite">
    <div class="avatar" aria-hidden="true">🦉</div>
    <div class="coach-body">
      <div class="coach-title">${GUIDE.name} · What to do next</div>
      <p>${tip.text}</p>
    </div>
    <div class="coach-actions">
      ${tip.action ? html`<button class="btn small primary" data-action="nav" data-view="${tip.action.view}">${tip.action.label}</button>` : ''}
      <button class="btn small ghost" data-action="speak" data-text="${tip.text}" aria-label="Read aloud">🔊</button>
    </div>
  </section>`;
}

function kpi(label: string, value: string, sub: string | Raw, cls = ''): Raw {
  return html`<div class="kpi ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-sub">${sub}</div></div>`;
}

function meter(label: string, value: number, invert = false): Raw {
  const v = Math.round(value);
  const level = invert ? (v > 70 ? 'bad' : v > 50 ? 'warn' : 'good') : v < 30 ? 'bad' : v < 50 ? 'warn' : 'good';
  return html`<div class="meter"><div class="meter-head"><span>${label}</span><b>${v}/100</b></div><div class="meter-track"><div class="meter-fill ${level}" style="width:${Math.max(2, v)}%"></div></div></div>`;
}

export function yearLabels(s: GameState, from: number): string[] {
  return s.history.slice(from).map((h) => `${s.startYear + Math.floor((h.month - 1) / 12)}`);
}

export function dashboard(s: GameState): Raw {
  const nw = netWorth(s);
  const inv = investmentsValue(s);
  const shadow = shadowValue(s);
  const em = emergencyMonths(s);
  const fi = fiProgress(s);
  const lastYear = s.years[s.years.length - 1];
  const yStartNW = s.year.netWorthStart;
  const income = s.month === 0 ? monthlyGrossIncome(s) : flowTotalIn(s.lastFlow);
  const sr = savingsRate(s);
  const hist = s.history;
  const step = Math.max(1, Math.floor(hist.length / 240));
  const sample = hist.filter((_, i) => i % step === 0 || i === hist.length - 1);
  const labels = sample.map((h) => `${s.startYear + Math.floor((h.month - 1) / 12)}`);
  const regime = REGIMES[s.market.regime];
  const dd = spDrawdown(s.market);
  const c = s.career;
  const achCount = Object.keys(s.achievements).length;
  const news = [...s.market.news].reverse().slice(0, 5);
  const logs = [...s.log].reverse().slice(0, 6);
  return html`
  <div class="grid kpis">
    ${kpi('Net worth', money(nw), html`<span class="${tone(nw - yStartNW)}">${signedDelta(nw - yStartNW)} this year</span>`)}
    ${kpi('Cash', money(s.cash), html`${em >= 99 ? 'No essentials' : `${em.toFixed(1)} months of essentials`} · target ${s.budget.emergencyMonths}`, em < 1 ? 'warn' : '')}
    ${kpi('Investments', money(inv), shadow > 100 ? html`<span class="${tone(inv - shadow)}">${signedDelta(inv - shadow)}</span> vs S&amp;P 500 only` : 'Nothing invested yet')}
    ${kpi('Debt', money(totalDebt(s)), creditDebt(s) > 0 ? html`<span class="down">Card: ${money(creditDebt(s))} at 24%</span>` : 'No credit card debt', creditDebt(s) > 0 ? 'warn' : '')}
    ${kpi('Monthly income', money(income), s.month === 0 ? 'Before tax' : 'Last month, before tax')}
    ${kpi('Savings rate', pct(sr, 0), lastYear ? `Last full year: ${pct(lastYear.savingsRate, 0)}` : 'Last 12 months')}
  </div>
  <section class="card">
    <div class="card-head"><h2>Financial independence</h2><span class="muted">FI number = 25 × yearly spending = ${money(fiNumber(s))}</span></div>
    <div class="fi-bar" role="progressbar" aria-valuenow="${Math.round(fi * 100)}" aria-valuemin="0" aria-valuemax="100"><div class="fi-fill" style="width:${Math.min(100, fi * 100)}%"></div><span>${pct(fi, 0)}</span></div>
    <p class="muted small">When cash and investments reach your FI number, a 4% yearly withdrawal could pay your bills for life. Investable now: ${money(investableAssets(s))}.</p>
    ${canRetireEarly(s) ? html`<button class="btn primary" data-action="retire-early">Retire early 🏝️</button>` : ''}
  </section>
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>Net worth</h2></div>
      ${raw(lineChart({ title: 'Net worth over time', labels, fmt: compact, series: [{ name: 'Net worth', slot: 1, values: sample.map((h) => h.netWorth) }] }))}
    </section>
    <section class="card">
      <div class="card-head"><h2>Your investments vs S&amp;P 500 only</h2></div>
      ${raw(lineChart({ title: 'Investments versus an S&P 500-only portfolio', labels, fmt: compact, series: [
        { name: 'Yours', slot: 1, values: sample.map((h) => h.investments) },
        { name: 'S&P only', slot: 2, dashed: true, values: sample.map((h) => h.shadowSp) },
      ] }))}
      <p class="muted small">"S&amp;P only" puts every dollar you invested (and takes out every dollar you withdrew) into an S&amp;P 500 fund instead, on the same dates.</p>
    </section>
  </div>
  <div class="grid three">
    <section class="card">
      <div class="card-head"><h2>Life</h2></div>
      <dl class="facts">
        <dt>Job</dt><dd>${currentTitle(s)}${c.employed ? html` at ${c.employer}` : ''}</dd>
        <dt>Salary</dt><dd>${c.employed ? money(c.salary) + ' / year' : '-'}</dd>
        <dt>Businesses</dt><dd>${s.businesses.length ? `${s.businesses.length} (worth ${compact(businessesValue(s))})` : 'None yet'}</dd>
        <dt>Home</dt><dd>${s.home ? `${s.home.label} (equity ${compact(homeEquity(s))})` : RENT_OPTIONS.find((r) => r.id === s.budget.housing)?.label ?? 'Renting'}</dd>
        <dt>Family</dt><dd>${s.family.married ? `Married to ${s.family.spouseName}` : 'Single'}${s.family.kids.length ? `, ${s.family.kids.length} kid${s.family.kids.length > 1 ? 's' : ''}` : ''}${s.family.pets ? `, ${s.family.pets} pet${s.family.pets > 1 ? 's' : ''}` : ''}</dd>
        <dt>Achievements</dt><dd><button class="link" data-action="nav" data-view="history">${achCount} / ${ACHIEVEMENTS.length}</button></dd>
      </dl>
    </section>
    <section class="card">
      <div class="card-head"><h2>Wellbeing</h2></div>
      ${meter('Stress', s.stress, true)}
      ${meter('Happiness', s.happiness)}
      ${meter('Health', s.health)}
      <p class="muted small">Stress rises with debt, no savings cushion, hustle, side businesses and wild single-stock swings. Index investing is the calm option.</p>
    </section>
    <section class="card">
      <div class="card-head"><h2>Market</h2><span class="pill regime-${s.market.regime}">${regime.label}</span></div>
      <dl class="facts">
        <dt>S&amp;P 500 fund</dt><dd>${money(priceOf(s.market, 'SPY'), { cents: true })} ${dd > 0.05 ? html`<span class="down">(${pct(dd, 0)} below peak)</span>` : ''}</dd>
        <dt>Inflation</dt><dd>${pct(s.market.inflation)} / year</dd>
        <dt>Savings rate</dt><dd>${pct(s.market.cashRate)} on cash</dd>
        <dt>Mortgage rate</dt><dd>${pct(s.market.mortgageRate, 2)}</dd>
      </dl>
    </section>
  </div>
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>News</h2></div>
      ${news.length ? html`<ul class="feed">${news.map((n) => html`<li class="${n.tone}">${n.ticker ? html`<button class="link" data-action="open-security" data-symbol="${n.ticker}">${n.text}</button>` : n.text}</li>`)}</ul>` : html`<p class="muted">Market news will appear here.</p>`}
    </section>
    <section class="card">
      <div class="card-head"><h2>Recent activity</h2></div>
      ${logs.length ? html`<ul class="feed">${logs.map((l) => html`<li class="${l.kind}"><span class="muted">${monthLabel(s, l.month)}</span> ${l.text}</li>`)}</ul>` : html`<p class="muted">Your story starts now.</p>`}
    </section>
  </div>`;
}

export function monthLabel(s: GameState, month: number): string {
  if (month <= 0) return `Jan ${s.startYear}`;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[(month - 1) % 12]} ${s.startYear + Math.floor((month - 1) / 12)}`;
}

function signedDelta(x: number): string {
  return `${x >= 0 ? '+' : '-'}${compact(Math.abs(x))}`;
}

function row(label: string, value: number, cls = '', note = ''): Raw {
  return html`<tr class="${cls}"><td>${label}${note ? html` <span class="muted small">${note}</span>` : ''}</td><td class="num">${money(value)}</td></tr>`;
}

export function budget(s: GameState): Raw {
  const f = s.lastFlow;
  const cpi = s.market.cpi;
  const b = s.budget;
  const match = CAREER_BY_ID[s.career.trackId]?.match401k ?? 0;
  const out = f.taxes + f.k401 + f.housing + f.transport + f.food + f.lifestyle + f.family + f.insurance + f.utilities + f.debtPayments + f.education;
  const ess = monthlyEssentials(s);
  const homeQuotes = HOME_OPTIONS.map((h) => ({ h, q: quoteHome(s, h.id, 20)! }));
  const tr = TRANSPORT_BY_ID[b.transport];
  return html`
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>Last month's cash flow</h2>${s.month === 0 ? html`<span class="muted">Play a month to fill this in</span>` : ''}</div>
      <table class="flow">
        <tbody>
          <tr class="section"><td colspan="2">Money in</td></tr>
          ${row('Salary', f.salary, '', s.career.onLeave ? '(medical leave)' : !s.career.employed && f.salary > 0 ? '(benefits)' : '')}
          ${f.spouse ? row('Spouse income', f.spouse) : ''}
          ${f.business ? row("Business owner's draw", f.business) : ''}
          ${f.dividends ? row('Dividends (cash)', f.dividends) : ''}
          ${row('Interest on savings', f.interest)}
          <tr class="section"><td colspan="2">Money out</td></tr>
          ${row('Taxes', f.taxes, '', '(income, payroll, dividends)')}
          ${row('401(k) contribution', f.k401, 'saving')}
          ${row('Housing', f.housing)}
          ${row('Transport', f.transport)}
          ${row('Food', f.food)}
          ${row('Fun & lifestyle', f.lifestyle)}
          ${f.family ? row('Kids & pets', f.family) : ''}
          ${row('Insurance', f.insurance)}
          ${row('Utilities, phone & personal', f.utilities)}
          ${row('Debt payments', f.debtPayments)}
          ${f.education ? row('Education', f.education) : ''}
          <tr class="total"><td>Left over</td><td class="num ${tone(flowTotalIn(f) - out)}">${money(flowTotalIn(f) - out)}</td></tr>
          ${f.invested - f.k401 > 0 ? row('…of which auto-invested', f.invested - f.k401, 'saving') : ''}
        </tbody>
      </table>
      <p class="muted small">Emergency fund target: ${b.emergencyMonths} months × ${money(ess)} essentials = ${money(ess * b.emergencyMonths)}. You have ${money(s.cash)}.</p>
    </section>
    <section class="card">
      <div class="card-head"><h2>Retirement saving</h2></div>
      <label class="field">401(k) contribution: <b>${b.k401Pct}%</b> of salary
        <input type="range" min="0" max="40" step="1" value="${b.k401Pct}" data-bind="budget.k401Pct" data-type="number">
      </label>
      <p class="small ${b.k401Pct >= match ? 'up' : 'down'}">${s.career.employed ? (b.k401Pct >= match ? `✓ You get the full ${match}% employer match.` : `Your employer matches up to ${match}%. You are leaving free money on the table.`) : 'No employer plan while you are not employed.'}</p>
      <label class="field">401(k) fund
        <select data-bind="budget.k401Fund">
          ${ETFS.filter((e) => e.in401k).map((e) => html`<option value="${e.ticker}" ${b.k401Fund === e.ticker ? 'selected' : ''}>${e.ticker} · ${e.name} (fee ${e.expenseRatio}%)</option>`)}
        </select>
      </label>
      <p class="muted small">Contributed this year: ${money(s.accounts.k401.contributedThisYear)} of ${money(23500 * cpi)} limit.</p>
      <label class="field">Emergency fund target (months)
        <select data-bind="budget.emergencyMonths" data-type="number">${[1, 2, 3, 4, 6, 9, 12].map((m) => html`<option value="${m}" ${b.emergencyMonths === m ? 'selected' : ''}>${m}</option>`)}</select>
      </label>
      <label class="check"><input type="checkbox" data-bind="budget.drip" data-type="bool" ${b.drip ? 'checked' : ''}> Reinvest dividends automatically (DRIP)</label>
    </section>
  </div>
  <section class="card">
    <div class="card-head"><h2>Lifestyle</h2><span class="muted">The biggest levers are housing, cars and lifestyle</span></div>
    <div class="choice-row">
      ${LIFESTYLE_OPTIONS.map((l) => html`<button class="choice ${b.lifestyle === l.id ? 'selected' : ''}" data-action="set-lifestyle" data-id="${l.id}"><b>${l.label}</b><span>${money((l.food + l.fun) * cpi)}/mo + ${Math.round(l.incomeShare * 100)}% of pay</span><small>${l.blurb}</small></button>`)}
    </div>
  </section>
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>Housing</h2></div>
      ${s.home
        ? html`<p>You own a <b>${s.home.label}</b> worth ${money(s.home.value)} (equity ${money(homeEquity(s))}).</p>
          <p class="muted small">Selling costs about ${HOME_RULES.sellingCostPct}% of the price.</p>
          <div class="inline">
            <select id="sell-rent">${RENT_OPTIONS.map((r) => html`<option value="${r.id}">${r.label} (${money(r.rent * cpi)}/mo)</option>`)}</select>
            <button class="btn" data-action="sell-home">Sell and rent</button>
          </div>`
        : html`<label class="field">Rent
          <select data-bind="budget.housing">${RENT_OPTIONS.map((r) => html`<option value="${r.id}" ${b.housing === r.id ? 'selected' : ''}>${r.label} · ${money(r.rent * cpi)}/mo · fits ${r.fits}</option>`)}</select>
        </label>
        <p class="muted small">${RENT_OPTIONS.find((r) => r.id === b.housing)?.blurb ?? ''}</p>
        <details class="buy-home">
          <summary>Buy a home</summary>
          <p class="muted small">Mortgage rate now ${pct(s.market.mortgageRate, 2)}. Down payment + ${HOME_RULES.closingCostPct}% closing costs needed in cash. Below 20% down you pay mortgage insurance.</p>
          <table class="mini"><thead><tr><th>Home</th><th class="num">Price</th><th class="num">20% down</th><th class="num">Monthly (all-in)</th></tr></thead>
          <tbody>${homeQuotes.map(({ h, q }) => html`<tr><td>${h.label}</td><td class="num">${compact(q.price)}</td><td class="num">${compact(q.down + q.closing)}</td><td class="num">${money(q.monthlyAllIn)}</td></tr>`)}</tbody></table>
          <div class="inline">
            <select id="home-option">${HOME_OPTIONS.map((h) => html`<option value="${h.id}">${h.label}</option>`)}</select>
            <select id="home-down">${[5, 10, 20, 30, 50].map((d) => html`<option value="${d}" ${d === 20 ? 'selected' : ''}>${d}% down</option>`)}</select>
            <button class="btn" data-action="buy-home">Buy</button>
          </div>
        </details>`}
    </section>
    <section class="card">
      <div class="card-head"><h2>Transport</h2></div>
      <p>Now: <b>${tr?.label ?? b.transport}</b> · running costs ${money((tr?.running ?? 0) * cpi)}/mo</p>
      <div class="inline">
        <select id="transport-select">${TRANSPORT_OPTIONS.map((t) => html`<option value="${t.id}" ${t.id === b.transport ? 'selected' : ''}>${t.label}${t.price ? ` · ${compact(t.price * cpi)}` : ''}</option>`)}</select>
        <label class="check"><input type="checkbox" id="transport-finance"> Car loan (7.5%)</label>
        <button class="btn" data-action="change-transport">Switch</button>
      </div>
      <p class="muted small">Your old car is sold for about 45% of its original price. Cars are spending, not investments.</p>
    </section>
  </div>
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>Insurance</h2></div>
      ${INSURANCE_OPTIONS.map((o) =>
        o.id === 'health' && hasEmployerHealth(s)
          ? html`<p class="check-static">✓ <b>Health insurance</b> through your employer (${money(150 * cpi)}/mo)</p>`
          : html`<label class="check"><input type="checkbox" data-bind="budget.insurance.${o.id}" data-type="bool" ${b.insurance[o.id] ? 'checked' : ''}> <b>${o.label}</b> · ${money(o.monthly * cpi)}/mo <span class="muted small">${o.blurb}</span></label>`,
      )}
    </section>
    <section class="card">
      <div class="card-head"><h2>Debts</h2><span class="muted">${money(totalDebt(s))} total</span></div>
      ${s.debts.length
        ? html`<table class="mini"><thead><tr><th>Debt</th><th class="num">Balance</th><th class="num">Rate</th><th class="num">Min/mo</th><th></th></tr></thead><tbody>
          ${[...s.debts].sort((a, b) => b.rate - a.rate).map((d) => html`<tr><td>${d.label}</td><td class="num">${money(d.balance)}</td><td class="num ${d.rate > 0.1 ? 'down' : ''}">${pct(d.rate)}</td><td class="num">${money(d.minPayment)}</td>
            <td class="num"><button class="btn small" data-action="pay-debt" data-id="${d.id}" ${s.cash < 1 ? 'disabled' : ''}>Pay ${compact(Math.min(d.balance, s.cash))}</button></td></tr>`)}
          </tbody></table>`
        : html`<p class="up">Debt free! 🎉</p>`}
      <label class="field">Extra monthly payment (highest rate first): <b>${money(b.extraDebtPayment)}</b> in today's money
        <input type="range" min="0" max="5000" step="50" value="${b.extraDebtPayment}" data-bind="budget.extraDebtPayment" data-type="number">
      </label>
    </section>
  </div>`;
}

export function portfolio(s: GameState, ui: UiState): Raw {
  const pos = positions(s).sort((a, b) => b.value - a.value);
  const inv = investmentsValue(s);
  const shadow = shadowValue(s);
  const cpi = s.market.cpi;
  const symbols = [...ETFS.map((e) => e.ticker), ...STOCKS.map((x) => x.ticker)];
  const stocksVal = pos.filter((p) => isStock(p.symbol)).reduce((a, p) => a + p.value, 0);
  const fundsVal = inv - stocksVal - Object.values(s.accounts).reduce((a, x) => a + x.cash, 0);
  const cashInAccts = inv - stocksVal - fundsVal;
  const total = inv + s.cash || 1;
  void ui;
  return html`
  <div class="grid kpis">
    ${(['taxable', 'k401', 'roth'] as const).map((a) => kpi(ACCOUNT_LABELS[a], money(accountValue(s, a)), a === 'taxable' ? 'No limits; gains taxed' : `Room this year: ${money(contributionRoom(s, a))}`))}
    ${kpi('All investments', money(inv), shadow > 100 ? html`S&amp;P-only would be ${money(shadow)}` : 'Start with an index fund')}
  </div>
  <section class="card">
    <div class="card-head"><h2>Allocation</h2></div>
    <div class="alloc">
      <div class="alloc-seg s1" style="flex:${fundsVal / total}" title="Funds"></div>
      <div class="alloc-seg s2" style="flex:${stocksVal / total}" title="Individual stocks"></div>
      <div class="alloc-seg s3" style="flex:${(s.cash + cashInAccts) / total}" title="Cash"></div>
    </div>
    <div class="legend"><span class="legend-item"><span class="swatch s1"></span>Funds ${pct(fundsVal / total, 0)}</span><span class="legend-item"><span class="swatch s2"></span>Individual stocks ${pct(stocksVal / total, 0)}</span><span class="legend-item"><span class="swatch s3"></span>Cash ${pct((s.cash + cashInAccts) / total, 0)}</span></div>
  </section>
  <section class="card">
    <div class="card-head"><h2>Holdings</h2><button class="btn small" data-action="nav" data-view="market">Browse market</button></div>
    ${pos.length
      ? html`<div class="table-wrap"><table class="data"><thead><tr><th>Symbol</th><th>Account</th><th class="num">Shares</th><th class="num">Value</th><th class="num">Gain</th><th class="num">Weight</th><th></th></tr></thead><tbody>
        ${pos.map((p) => html`<tr><td><button class="link" data-action="open-security" data-symbol="${p.symbol}"><b>${p.symbol}</b></button> <span class="muted small">${securityName(p.symbol)}</span></td><td>${ACCOUNT_LABELS[p.account]}</td><td class="num">${p.shares.toFixed(3)}</td><td class="num">${money(p.value)}</td><td class="num ${tone(p.value - p.cost)}">${signedPct(p.cost > 0 ? p.value / p.cost - 1 : 0)}</td><td class="num">${pct(p.value / (inv || 1), 0)}</td>
          <td class="num">${p.account === 'k401' ? '' : html`<button class="btn small" data-action="sell-all" data-symbol="${p.symbol}" data-account="${p.account}">Sell</button>`}</td></tr>`)}
      </tbody></table></div>`
      : html`<p class="muted">You do not own any investments yet. Most people start with a broad index fund like an S&amp;P 500 fund (SPY or VOO) or a total market fund (VTI).</p>`}
    ${(['k401', 'roth'] as const).some((a) => s.accounts[a].cash > 1)
      ? html`<p class="muted small">Uninvested cash: ${(['k401', 'roth'] as const).filter((a) => s.accounts[a].cash > 1).map((a) => `${ACCOUNT_LABELS[a]} ${money(s.accounts[a].cash)}`).join(', ')}.</p>
        <div class="inline">
          ${(['k401', 'roth'] as const).filter((a) => s.accounts[a].cash > 1).map((a) => html`<button class="btn small" data-action="reinvest" data-account="${a}">Reinvest ${ACCOUNT_LABELS[a]} cash in ${a === 'k401' ? s.budget.k401Fund : 'VOO'}</button><button class="btn small ghost" data-action="withdraw" data-account="${a}">Withdraw (penalty before 59½)</button>`)}
        </div>`
      : ''}
  </section>
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>Automatic investing</h2></div>
      <p class="muted small">Dollar-cost averaging: buy a fixed amount every month, in good markets and bad. Amounts are in today's money and rise with inflation.</p>
      ${s.budget.autoInvest.length
        ? html`<ul class="rules">${s.budget.autoInvest.map((r) => html`<li><b>${money(r.amount * cpi)}</b>/mo → ${r.symbol} in ${ACCOUNT_LABELS[r.account]} <button class="btn small ghost" data-action="remove-auto" data-id="${r.id}">Remove</button></li>`)}</ul>`
        : ''}
      <div class="inline">
        <select id="auto-symbol">${symbols.map((t) => html`<option value="${t}" ${t === 'VOO' ? 'selected' : ''}>${t}</option>`)}</select>
        <select id="auto-account"><option value="roth">Roth IRA</option><option value="taxable" selected>Brokerage</option></select>
        <input type="number" id="auto-amount" min="10" step="10" value="200" aria-label="Monthly amount">
        <button class="btn" data-action="add-auto">Add</button>
      </div>
      <hr>
      <label class="field">Invest extra cash above my emergency fund each month into
        <select data-bind="budget.sweepSymbol">
          <option value="" ${!s.budget.sweepSymbol ? 'selected' : ''}>Off</option>
          ${ETFS.map((e) => html`<option value="${e.ticker}" ${s.budget.sweepSymbol === e.ticker ? 'selected' : ''}>${e.ticker} · ${e.name}</option>`)}
        </select>
      </label>
      <label class="field">…using account
        <select data-bind="budget.sweepAccount"><option value="taxable" ${s.budget.sweepAccount === 'taxable' ? 'selected' : ''}>Brokerage</option><option value="roth" ${s.budget.sweepAccount === 'roth' ? 'selected' : ''}>Roth IRA first (up to the limit)</option></select>
      </label>
      <p class="muted small">The sweep waits until your credit cards are paid off.</p>
    </section>
    <section class="card">
      <div class="card-head"><h2>Retirement accounts</h2></div>
      <p>401(k) + Roth IRA: <b>${money(retirementValue(s))}</b></p>
      <p class="muted small">401(k) money comes from your paycheck (set the % in Budget). Roth IRA: buy into it from Market or auto-invest, up to ${money(7000 * cpi)} a year. Both grow without yearly taxes.</p>
      <p class="muted small">Total invested and withdrawn dollars are mirrored into an "S&amp;P 500 only" twin so you can see whether your choices beat simply buying the index.</p>
    </section>
  </div>`;
}
