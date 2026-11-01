// History, guide, new game, report card, modals and tutorial.
import type { GameState, YearSummary } from '../types';
import type { UiState } from './state';
import { html, raw, type Raw } from './html';
import { compact, money, pct, signedPct, tone } from './format';
import { barChart, lineChart } from './charts';
import { GAME_CONFIG, PROMO_CONFIG } from '../config';
import { GUIDE, TOPICS, TUTORIAL } from '../data/guide';
import { BACKGROUNDS } from '../data/backgrounds';
import { CAREERS } from '../data/careers';
import { ACHIEVEMENTS } from '../data/achievements';
import { getGuide, yearEndComment } from '../engine/coach';
import { compound } from '../engine/metrics';
import { reportCard } from '../engine/report';
import { monthLabel } from './views-main';
import { speechSupported, voices } from './speech';
import { STOCKS } from '../data/stocks';
import { ETFS } from '../data/etfs';

export function promoSlots(placement: 'guide' | 'year-end' | 'report-card' | 'topic', topic?: string): Raw {
  if (!PROMO_CONFIG.enabled) return html``;
  const slots = PROMO_CONFIG.slots.filter((p) => p.placements.includes(placement) && (!topic || !p.topics?.length || p.topics.includes(topic)));
  if (!slots.length) return html``;
  return html`<aside class="promo"><div class="promo-head">${PROMO_CONFIG.heading}</div>${slots.map((p) => html`<div class="promo-item"><b>${p.title}</b><p class="small">${p.body}</p>${p.url ? html`<a class="btn small" href="${p.url}" target="_blank" rel="noopener">${p.ctaLabel}</a>` : ''}</div>`)}</aside>`;
}

export function history(s: GameState, ui: UiState): Raw {
  const months = ui.historyRange === 'y5' ? 60 : ui.historyRange === 'y10' ? 120 : Infinity;
  const hist = s.history.slice(-Math.min(months, s.history.length));
  const step = Math.max(1, Math.floor(hist.length / 240));
  const sample = hist.filter((_, i) => i % step === 0 || i === hist.length - 1);
  const labels = sample.map((h) => monthLabel(s, h.month));
  const years = s.years;
  const ylabels = years.map((y) => String(y.year));
  const cpiNow = s.market.cpi;
  const unlocked = ACHIEVEMENTS.filter((a) => s.achievements[a.id] !== undefined);
  return html`
  <div class="seg">${(['y5', 'y10', 'max'] as const).map((r) => html`<button class="${ui.historyRange === r ? 'active' : ''}" data-action="history-range" data-range="${r}">${r === 'y5' ? '5 years' : r === 'y10' ? '10 years' : 'All'}</button>`)}</div>
  <div class="grid two">
    <section class="card"><div class="card-head"><h2>Net worth</h2></div>
      ${raw(lineChart({ title: 'Net worth, investments and home equity', labels, fmt: compact, series: [
        { name: 'Net worth', slot: 1, values: sample.map((h) => h.netWorth) },
        { name: 'Investments', slot: 3, values: sample.map((h) => h.investments) },
        { name: 'Home equity', slot: 4, values: sample.map((h) => h.homeEquity) },
      ] }))}
    </section>
    <section class="card"><div class="card-head"><h2>Portfolio vs S&amp;P 500 only</h2></div>
      ${raw(lineChart({ title: 'Your investments vs S&P 500 only', labels, fmt: compact, series: [
        { name: 'Yours', slot: 1, values: sample.map((h) => h.investments) },
        { name: 'S&P only', slot: 2, dashed: true, values: sample.map((h) => h.shadowSp) },
      ] }))}
      <p class="muted small">Same deposits and withdrawals, on the same dates, but all in an S&amp;P 500 fund. Taxes and the 401(k) fund choice are ignored for the comparison.</p>
    </section>
    <section class="card"><div class="card-head"><h2>Income vs spending (yearly)</h2></div>
      ${raw(barChart({ title: 'Yearly income and spending', labels: ylabels, fmt: compact, series: [
        { name: 'Gross income', slot: 1, values: years.map((y) => y.grossIncome) },
        { name: 'Spending', slot: 2, values: years.map((y) => y.expenses) },
      ] }))}
    </section>
    <section class="card"><div class="card-head"><h2>Savings rate (yearly)</h2></div>
      ${raw(barChart({ title: 'Yearly savings rate', labels: ylabels, fmt: (v) => `${Math.round(v)}%`, series: [{ name: 'Savings rate', slot: 1, values: years.map((y) => Math.max(-100, y.savingsRate * 100)) }] }))}
    </section>
    <section class="card"><div class="card-head"><h2>Stress &amp; happiness</h2></div>
      ${raw(lineChart({ title: 'Stress and happiness', labels, fmt: (v) => v.toFixed(0), series: [
        { name: 'Happiness', slot: 1, values: sample.map((h) => h.happiness) },
        { name: 'Stress', slot: 2, values: sample.map((h) => h.stress) },
      ] }))}
    </section>
    <section class="card"><div class="card-head"><h2>Achievements</h2><span class="muted">${unlocked.length}/${ACHIEVEMENTS.length}</span></div>
      <div class="achievements">${ACHIEVEMENTS.map((a) => html`<div class="ach ${s.achievements[a.id] !== undefined ? 'got' : ''}" title="${a.description}"><span class="ach-icon">${s.achievements[a.id] !== undefined ? a.icon : '🔒'}</span><span><b>${a.title}</b><span class="muted small">${a.description}</span></span></div>`)}</div>
    </section>
  </div>
  <section class="card"><div class="card-head"><h2>Year by year</h2><span class="muted">Nominal dollars. Inflation since start: ${pct(cpiNow - 1, 0)}</span></div>
    ${years.length
      ? html`<div class="table-wrap"><table class="data"><thead><tr><th>Year</th><th>Age</th><th class="num">Income</th><th class="num">Taxes</th><th class="num">Spending</th><th class="num">Saved</th><th class="num">Rate</th><th class="num">Your return</th><th class="num">S&amp;P 500</th><th class="num">Net worth</th></tr></thead><tbody>
        ${[...years].reverse().map((y) => html`<tr><td>${y.year}</td><td>${y.age}</td><td class="num">${compact(y.grossIncome)}</td><td class="num">${compact(y.taxes)}</td><td class="num">${compact(y.expenses)}</td><td class="num ${tone(y.saved)}">${compact(y.saved)}</td><td class="num">${pct(y.savingsRate, 0)}</td><td class="num ${tone(y.portfolioReturn)}">${y.portfolioReturn ? signedPct(y.portfolioReturn) : '-'}</td><td class="num ${tone(y.spReturn)}">${signedPct(y.spReturn)}</td><td class="num">${compact(y.netWorthEnd)}</td></tr>`)}
      </tbody></table></div>`
      : html`<p class="muted">Finish your first year to see the yearly table.</p>`}
  </section>
  <section class="card"><div class="card-head"><h2>Life log</h2></div>
    <ul class="feed long">${[...s.log].reverse().slice(0, 150).map((l) => html`<li class="${l.kind}"><span class="muted">${monthLabel(s, l.month)}</span> ${l.text}</li>`)}</ul>
  </section>`;
}

export function guide(s: GameState, ui: UiState): Raw {
  const tips = getGuide().advise(s).filter((t) => t.id !== 'default');
  const c = ui.calc;
  const res = compound(c.start, c.monthly, c.rate / 100, c.years);
  const vs = voices();
  return html`
  <section class="card guide-hero">
    <div class="avatar big" aria-hidden="true">🦉</div>
    <div>
      <h1>${GUIDE.name}, ${GUIDE.role}</h1>
      <p>${GUIDE.coreMessage}</p>
      <button class="btn small" data-action="speak" data-text="${GUIDE.coreMessage}">🔊 Listen</button>
    </div>
  </section>
  <div class="grid three">${GUIDE.pillars.map((p) => html`<section class="card pillar"><div class="pillar-icon" aria-hidden="true">${p.icon}</div><h3>${p.title}</h3><p class="small">${p.text}</p></section>`)}</div>
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>My advice right now</h2></div>
      ${tips.length ? html`<ul class="advice">${tips.map((t) => html`<li class="tone-${t.tone}"><p>${t.text}</p><span class="inline">${t.action ? html`<button class="btn small" data-action="nav" data-view="${t.action.view}">${t.action.label}</button>` : ''}<button class="btn small ghost" data-action="speak" data-text="${t.text}" aria-label="Read aloud">🔊</button></span></li>`)}</ul>` : html`<p>Everything looks on track. Keep going!</p>`}
      <h3>Ask ${GUIDE.name}</h3>
      <div class="inline"><input type="text" id="ask-input" placeholder="e.g. What is a P/E ratio?" aria-label="Question"><button class="btn" data-action="ask">Ask</button></div>
      ${ui.askAnswer ? html`<div class="answer">${ui.askAnswer.split('\n\n').map((p) => html`<p>${p}</p>`)}<button class="btn small ghost" data-action="speak" data-text="${ui.askAnswer}">🔊</button></div>` : ''}
      <p class="muted small">The built-in coach is rule-based and works offline. It teaches concepts and never recommends specific real-world investments.</p>
    </section>
    <section class="card">
      <div class="card-head"><h2>Compound growth calculator</h2></div>
      <div class="calc">
        <label>Start with $<input type="number" min="0" step="100" value="${c.start}" data-calc="start"></label>
        <label>Add each month $<input type="number" min="0" step="50" value="${c.monthly}" data-calc="monthly"></label>
        <label>Yearly return %<input type="number" min="0" max="20" step="0.5" value="${c.rate}" data-calc="rate"></label>
        <label>Years<input type="number" min="1" max="60" step="1" value="${c.years}" data-calc="years"></label>
      </div>
      <p class="big-result">${money(res.total)}</p>
      <p class="muted small">You put in ${money(res.contributed)}. Growth added ${money(res.total - res.contributed)}. (Not adjusted for inflation; the S&amp;P 500's long-run average has been roughly 10% before inflation, about 7% after.)</p>
      ${raw(barChart({ title: 'Growth over time', labels: res.series.map((_, i) => `Y${i}`), fmt: compact, height: 160, series: [{ name: 'Balance', slot: 1, values: res.series }] }))}
    </section>
  </div>
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>Learn</h2></div>
      <div class="topics">${TOPICS.map((t) => html`<details ${ui.openTopic === t.id ? 'open' : ''}><summary data-action="open-topic" data-id="${t.id}">${t.title}</summary>${t.body.map((p) => html`<p>${p}</p>`)}<button class="btn small ghost" data-action="speak" data-text="${t.title}. ${t.body.join(' ')}">🔊 Listen</button>${promoSlots('topic', t.id)}</details>`)}</div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Voice &amp; settings</h2></div>
      ${speechSupported()
        ? html`<label class="check"><input type="checkbox" data-pref="voiceOn" data-type="bool" ${ui.prefs.voiceOn ? 'checked' : ''}> ${GUIDE.name} reads tips and lessons aloud</label>
          <label class="field">Voice <select data-pref="voiceName"><option value="">Default</option>${vs.map((v) => html`<option value="${v.name}" ${ui.prefs.voiceName === v.name ? 'selected' : ''}>${v.name}</option>`)}</select></label>
          <label class="field">Speed: <b>${ui.prefs.voiceRate.toFixed(1)}×</b><input type="range" min="0.6" max="1.6" step="0.1" value="${ui.prefs.voiceRate}" data-pref="voiceRate" data-type="number"></label>
          <button class="btn small" data-action="speak" data-text="Hi, I'm ${GUIDE.name}. Grow your income, spend less than you earn, and invest the rest in low cost index funds.">Test voice</button>`
        : html`<p class="muted">Your browser does not support speech. All guidance is shown as text.</p>`}
      <hr>
      <label class="check"><input type="checkbox" data-pref="pauseOnAllEvents" data-type="bool" ${ui.prefs.pauseOnAllEvents ? 'checked' : ''}> Fast-forward stops for every event (not just big ones)</label>
      <label class="field">Theme <select data-pref="theme">${(['auto', 'light', 'dark'] as const).map((t) => html`<option value="${t}" ${ui.prefs.theme === t ? 'selected' : ''}>${t}</option>`)}</select></label>
      <div class="inline"><button class="btn small" data-action="restart-tutorial">Restart tutorial</button><button class="btn small" data-action="export">Export save</button></div>
      ${promoSlots('guide')}
    </section>
  </div>
  <section class="card disclaimer"><p class="small">${GAME_CONFIG.disclaimer}</p><p class="muted small">Game data: ${STOCKS.length} stocks and ${ETFS.length} funds. Taxes, accounts and insurance rules are simplified US-style approximations for teaching.</p></section>`;
}

export function newGameScreen(hasSave: boolean): Raw {
  return html`
  <div class="newgame">
    <section class="card hero">
      <div class="logo big" aria-hidden="true">◆</div>
      <h1>${GAME_CONFIG.title}</h1>
      <p class="lead">${GAME_CONFIG.subtitle}</p>
      <p>Live a whole career, month by month. Budget for real life, climb the career ladder, build a business empire and invest what is left. Guided by ${GUIDE.name}, your money coach.</p>
      ${hasSave ? html`<button class="btn primary" data-action="continue">Continue saved game</button>` : ''}
      <label class="menu-file btn small">Import a save file<input type="file" accept="application/json,.json" data-action-change="import" hidden></label>
    </section>
    <section class="card">
      <h2>New game</h2>
      <label class="field">Your name <input type="text" id="ng-name" maxlength="24" value="Alex" autocomplete="off"></label>
      <h3>Starting point (difficulty)</h3>
      <div class="choice-grid">${BACKGROUNDS.map((b, i) => html`<label class="choice radio"><input type="radio" name="ng-bg" value="${b.id}" ${i === 1 ? 'checked' : ''}><b>${b.name}</b> <span class="pill diff-${b.difficulty}">${b.difficulty}</span><small>${b.blurb}</small></label>`)}</div>
      <h3>Career</h3>
      <div class="choice-grid">${CAREERS.map((c, i) => html`<label class="choice radio"><input type="radio" name="ng-career" value="${c.id}" ${i === 0 ? 'checked' : ''}><b>${c.name}</b>${c.requiresDegree ? html` <span class="tag">degree</span>` : ''}<small>${c.blurb} Starts at ${money(c.levels[0].salary)}.</small></label>`)}</div>
      <p class="muted small">Careers marked "degree" need a college degree. Without one you start in a non-degree career (you can study for a degree later).</p>
      <details><summary>Advanced</summary>
        <label class="field">Random seed (same seed = same market) <input type="number" id="ng-seed" placeholder="random"></label>
      </details>
      <button class="btn primary big" data-action="start-game">Start my life ▶</button>
      <p class="muted small">${GAME_CONFIG.disclaimer}</p>
    </section>
  </div>`;
}

export function reportView(s: GameState): Raw {
  const r = reportCard(s);
  return html`
  <section class="card report">
    <div class="report-head">
      <div class="grade big grade-${r.overall}">${r.overall}</div>
      <div><h1>Report card</h1>${r.summary.map((p) => html`<p>${p}</p>`)}</div>
    </div>
    <table class="data"><tbody>${r.lines.map((l) => html`<tr><td><b>${l.area}</b></td><td><span class="grade grade-${l.grade}">${l.grade}</span></td><td>${l.detail}</td></tr>`)}</tbody></table>
    <div class="grid kpis compact">
      <div class="kpi"><div class="kpi-label">Net worth (today's $)</div><div class="kpi-value">${compact(r.netWorthReal)}</div></div>
      <div class="kpi"><div class="kpi-label">Your investments</div><div class="kpi-value">${compact(r.investmentsReal)}</div></div>
      <div class="kpi"><div class="kpi-label">If all in S&amp;P 500</div><div class="kpi-value">${compact(r.shadowReal)}</div></div>
      <div class="kpi"><div class="kpi-label">Lifetime income</div><div class="kpi-value">${compact(r.lifetimeIncomeReal)}</div></div>
    </div>
    <div class="inline"><button class="btn small" data-action="speak" data-text="${r.summary.join(' ')}">🔊 Listen</button><button class="btn primary" data-action="new-game">Play again</button><button class="btn" data-action="nav" data-view="history">See history</button><button class="btn" data-action="export">Export save</button></div>
    ${promoSlots('report-card')}
  </section>`;
}

export function eventModal(s: GameState): Raw {
  const ev = s.pendingEvent!;
  return html`
  <div class="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      <div class="modal-kicker">${monthLabel(s, s.month)} · ${ev.major ? 'Big decision' : 'This month'}</div>
      <h2 id="ev-title">${ev.title}</h2>
      <p>${ev.text}</p>
      ${ev.ticker ? html`<p><button class="link" data-action="peek-security" data-symbol="${ev.ticker}">Research ${ev.ticker} first →</button></p>` : ''}
      <div class="choices">
        ${ev.choices.map((c, i) => html`<button class="choice-btn" data-action="choose" data-index="${i}" ${c.disabled ? 'disabled' : ''}><b>${c.label}</b>${c.hint ? html`<small>${c.hint}</small>` : ''}${c.disabled ? html`<small class="down">Not enough cash</small>` : ''}</button>`)}
      </div>
      ${ev.lesson ? html`<div class="lesson"><span aria-hidden="true">🦉</span> <span>${ev.lesson}</span> <button class="btn small ghost" data-action="speak" data-text="${ev.lesson}" aria-label="Read aloud">🔊</button></div>` : ''}
    </div>
  </div>`;
}

export function eventResultModal(ui: UiState): Raw {
  const r = ui.eventResult!;
  return html`
  <div class="modal-backdrop">
    <div class="modal small" role="dialog" aria-modal="true">
      <h2>${r.title}</h2>
      ${r.lines.filter(Boolean).map((l) => html`<p>${l}</p>`)}
      <button class="btn primary" data-action="close-result" autofocus>Continue</button>
    </div>
  </div>`;
}

export function yearModal(s: GameState, y: YearSummary): Raw {
  const comments = yearEndComment(s, y);
  const nwChange = y.netWorthEnd - y.netWorthStart;
  return html`
  <div class="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="yr-title">
      <div class="modal-kicker">Year in review · age ${y.age}</div>
      <h2 id="yr-title">${y.year} summary</h2>
      <div class="grid kpis compact">
        <div class="kpi"><div class="kpi-label">Income</div><div class="kpi-value">${compact(y.grossIncome)}</div></div>
        <div class="kpi"><div class="kpi-label">Taxes</div><div class="kpi-value">${compact(y.taxes)}</div></div>
        <div class="kpi"><div class="kpi-label">Spending</div><div class="kpi-value">${compact(y.expenses)}</div></div>
        <div class="kpi"><div class="kpi-label">Savings rate</div><div class="kpi-value ${tone(y.savingsRate)}">${pct(y.savingsRate, 0)}</div></div>
        <div class="kpi"><div class="kpi-label">Net worth</div><div class="kpi-value">${compact(y.netWorthEnd)}</div><div class="kpi-sub ${tone(nwChange)}">${nwChange >= 0 ? '+' : '-'}${compact(Math.abs(nwChange))}</div></div>
        <div class="kpi"><div class="kpi-label">Your return / S&amp;P</div><div class="kpi-value">${y.portfolioReturn ? signedPct(y.portfolioReturn) : '-'}</div><div class="kpi-sub">S&amp;P 500: ${signedPct(y.spReturn)}</div></div>
      </div>
      ${y.achievements.length ? html`<p><b>Achievements:</b> ${y.achievements.join(', ')}</p>` : ''}
      <div class="lesson"><span aria-hidden="true">🦉</span> <span>${comments.join(' ')}</span> <button class="btn small ghost" data-action="speak" data-text="${comments.join(' ')}" aria-label="Read aloud">🔊</button></div>
      ${promoSlots('year-end')}
      <button class="btn primary" data-action="close-year" autofocus>Continue</button>
    </div>
  </div>`;
}

export function confirmNewModal(): Raw {
  return html`
  <div class="modal-backdrop">
    <div class="modal small" role="dialog" aria-modal="true">
      <h2>Start a new game?</h2>
      <p>Your current game will be replaced. Export a save first if you want to keep it.</p>
      <div class="inline"><button class="btn" data-action="export">Export save</button><button class="btn primary" data-action="confirm-new">Start over</button><button class="btn ghost" data-action="cancel-new">Cancel</button></div>
    </div>
  </div>`;
}

export function tutorialCard(s: GameState, ui: UiState): Raw {
  const step = TUTORIAL[s.tutorialStep];
  if (!step || ui.prefs.tutorialDone) return html``;
  return html`
  <aside class="tutorial" aria-live="polite">
    <div class="tutorial-head"><span aria-hidden="true">🦉</span> <b>${step.title}</b> <span class="muted small">${s.tutorialStep + 1}/${TUTORIAL.length}</span></div>
    <p>${step.text}</p>
    <div class="inline">
      ${ui.view !== step.view ? html`<button class="btn small" data-action="nav" data-view="${step.view}">Show me</button>` : ''}
      <button class="btn small primary" data-action="tutorial-next">${s.tutorialStep === TUTORIAL.length - 1 ? 'Finish' : 'Next'}</button>
      <button class="btn small ghost" data-action="speak" data-text="${step.text}" aria-label="Read aloud">🔊</button>
      <button class="btn small ghost" data-action="tutorial-skip">Skip tutorial</button>
    </div>
  </aside>`;
}

export function footer(): Raw {
  return html`<footer class="footer"><p>${GAME_CONFIG.disclaimer}</p></footer>`;
}
