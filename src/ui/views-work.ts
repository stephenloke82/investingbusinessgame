// Career and business views.
import type { GameState } from '../types';
import { html, raw, type Raw } from './html';
import { compact, money, pct, tone } from './format';
import { lineChart } from './charts';
import { CAREER_BY_ID, CERTS } from '../data/careers';
import { BUSINESS_TYPES } from '../data/businesses';
import { currentTitle, DEGREE, jobOptions, promotionCheck, track } from '../engine/career';
import { businessType, businessValue, capacityOf, demandOf, MAX_BUSINESSES, suggestedStaff } from '../engine/business';
import { monthLabel } from './views-main';

function meterBar(label: string, v: number, hint: string): Raw {
  return html`<div class="meter"><div class="meter-head"><span>${label}</span><b>${Math.round(v)}/100</b></div><div class="meter-track"><div class="meter-fill ${v < 30 ? 'bad' : v < 55 ? 'warn' : 'good'}" style="width:${Math.max(2, v)}%"></div></div><div class="muted small">${hint}</div></div>`;
}

export function career(s: GameState): Raw {
  const c = s.career;
  const t = track(s);
  const promo = promotionCheck(s);
  const cpi = s.market.cpi;
  const jobs = jobOptions(s);
  const certs = CERTS.filter((x) => x.track === '*' || x.track === c.trackId);
  const raises = c.raisesHistory;
  return html`
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>${currentTitle(s)}</h2><span class="muted">${t.name}</span></div>
      ${c.employed
        ? html`<p><b>${c.employer}</b> · ${money(c.salary)} a year · ${Math.floor(c.monthsInLevel / 12)}y ${c.monthsInLevel % 12}m in this role</p>`
        : html`<p class="down">${c.onLeave ? 'On medical leave.' : 'You are not employed.'} ${c.benefitsMonths > 0 ? `Unemployment benefits: ${c.benefitsMonths} months left.` : ''}</p>
          <label class="check"><input type="checkbox" data-bind="career.searching" data-type="bool" ${c.searching ? 'checked' : ''}> Search for jobs every month</label>`}
      ${meterBar('Skill', c.skill, 'Grows with experience, effort and certifications.')}
      ${meterBar('Performance', c.performance, 'Your recent rating. Drives raises and promotions. Hurt by high stress.')}
      ${meterBar('Reputation', c.reputation, 'Your professional network. Helps job hunting and promotions.')}
      ${c.employed
        ? html`<h3>Work effort</h3>
      <div class="choice-row">
        ${([
          ['coast', 'Coast', 'Low stress, slow growth, weak reviews.'],
          ['steady', 'Steady', 'Solid work, sustainable.'],
          ['hustle', 'Hustle', 'Fast growth and promotions, but stressful.'],
        ] as const).map(([id, l, d]) => html`<button class="choice ${c.effort === id ? 'selected' : ''}" data-action="set-effort" data-id="${id}"><b>${l}</b><small>${d}</small></button>`)}
      </div>`
        : ''}
    </section>
    <section class="card">
      <div class="card-head"><h2>Promotion</h2></div>
      ${promo.nextTitle
        ? html`<p>Next: <b>${promo.nextTitle}</b> · about ${money(promo.nextSalary ?? 0)}</p>
          ${promo.eligible
            ? html`<p class="up">✓ You meet the requirements. Chance of a yes: ${pct(promo.chance, 0)}.</p>
              <button class="btn primary" data-action="ask-promo">Ask for a promotion</button>`
            : html`<ul class="reqs">${promo.missing.map((m) => html`<li>${m}</li>`)}</ul>`}`
        : html`<p class="muted">${promo.missing[0] ?? ''}</p>`}
      <h3>Career ladder</h3>
      <ol class="ladder">
        ${t.levels.map((l, i) => html`<li class="${i === c.level ? 'current' : i < c.level ? 'done' : ''}"><span>${l.title}</span><span class="muted small">${compact(l.salary * cpi)}${l.certs?.length ? ` · needs ${l.certs.map((x) => CERTS.find((y) => y.id === x)?.name ?? x).join(', ')}` : ''}${l.minSkill ? ` · skill ${l.minSkill}` : ''}</span></li>`)}
      </ol>
    </section>
  </div>
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>Certifications &amp; education</h2></div>
      ${c.studying ? html`<p class="pill">Studying: ${CERTS.find((x) => x.id === c.studying!.certId)?.name} · ${c.studying.monthsLeft} months left</p>` : ''}
      <ul class="list">
        ${certs.map((x) => {
          const have = c.certs.includes(x.id);
          return html`<li><div><b>${x.name}</b> ${have ? html`<span class="up">✓ Earned</span>` : ''}<div class="muted small">${x.blurb} ${money(x.cost * cpi)} · ${x.months} months · needs skill ${x.minSkill} · +${x.skillBoost} skill</div></div>
            ${have ? '' : html`<button class="btn small" data-action="start-cert" data-id="${x.id}" ${c.studying || c.skill < x.minSkill || s.cash < x.cost * cpi ? 'disabled' : ''}>Enrol</button>`}</li>`;
        })}
      </ul>
      ${!c.hasDegree
        ? html`<hr><p><b>College degree (night school)</b> <span class="muted small">${DEGREE.months} months, about ${money(DEGREE.monthlyCost * cpi)}/month. Opens careers that require a degree.</span></p>
          ${c.degreeProgress ? html`<p class="pill">Degree in progress: ${c.degreeProgress.monthsLeft} months left</p>` : html`<button class="btn small" data-action="start-degree">Start a degree</button>`}`
        : ''}
    </section>
    <section class="card">
      <div class="card-head"><h2>Job market</h2></div>
      <p class="muted small">Changing employers is often the fastest way to a raise. Switching careers resets you to entry level but keeps part of your skill.</p>
      <ul class="list">
        ${jobs.map((j, i) => html`<li><div><b>${j.title}</b> <span class="muted">${CAREER_BY_ID[j.trackId].name}</span><div class="muted small">${money(j.salary)} · ${j.note} · chance ${pct(j.chance, 0)}</div></div>
          <button class="btn small" data-action="apply-job" data-index="${i}">Apply</button></li>`)}
      </ul>
      ${c.employed ? html`<button class="btn small ghost danger-text" data-action="quit-job">Quit my job</button>` : ''}
    </section>
  </div>
  <section class="card">
    <div class="card-head"><h2>Salary history</h2></div>
    ${raw(lineChart({ title: 'Salary over time', labels: raises.map((r) => monthLabel(s, r.month)), fmt: compact, series: [{ name: 'Salary', slot: 1, values: raises.map((r) => r.salary) }], span: 'full' }))}
  </section>`;
}

export function business(s: GameState): Raw {
  const cpi = s.market.cpi;
  const canStart = s.businesses.length < MAX_BUSINESSES;
  return html`
  ${s.businesses.map((b) => {
    const t = businessType(b);
    const demand = demandOf(s, b);
    const cap = capacityOf(b);
    const sugg = suggestedStaff(s, b);
    const hist = b.history.slice(-36);
    const unit = b.typeId === 'online' || b.typeId === 'saas' ? 'product line' : b.typeId === 'lawn' || b.typeId === 'electrical' ? 'crew' : 'location';
    return html`<section class="card biz">
      <div class="card-head"><h2>${b.name}</h2><span class="muted">${t.name} · ${b.locations} ${unit}${b.locations > 1 ? 's' : ''} · founded ${monthLabel(s, b.foundedMonth)}</span></div>
      <div class="grid kpis compact">
        <div class="kpi"><div class="kpi-label">Revenue / mo</div><div class="kpi-value">${money(b.last.revenue)}</div></div>
        <div class="kpi"><div class="kpi-label">Profit / mo</div><div class="kpi-value ${tone(b.last.profit)}">${money(b.last.profit)}</div></div>
        <div class="kpi"><div class="kpi-label">Customers</div><div class="kpi-value">${Math.round(b.last.customers)}</div><div class="kpi-sub">demand ~${Math.round(demand)} · capacity ${Math.round(cap)}</div></div>
        <div class="kpi"><div class="kpi-label">Reputation</div><div class="kpi-value">${Math.round(b.reputation)}</div></div>
        <div class="kpi"><div class="kpi-label">Business cash</div><div class="kpi-value">${money(b.cash)}</div></div>
        <div class="kpi"><div class="kpi-label">Est. value</div><div class="kpi-value">${compact(businessValue(b))}</div></div>
      </div>
      ${raw(lineChart({ title: `${b.name} revenue and profit`, labels: hist.map((h) => monthLabel(s, h.month)), fmt: compact, series: [{ name: 'Revenue', slot: 1, values: hist.map((h) => h.revenue) }, { name: 'Profit', slot: 2, values: hist.map((h) => h.profit) }], height: 180, span: 'full' }))}
      <div class="controls">
        <div class="control"><span>Staff: <b>${b.staff}</b> <span class="muted small">(${money(t.wage * cpi)}/mo each · suggested ${sugg})</span></span>
          <span class="inline"><button class="btn small" data-action="biz-staff" data-id="${b.id}" data-delta="-1" ${b.staff <= 0 ? 'disabled' : ''}>−</button><button class="btn small" data-action="biz-staff" data-id="${b.id}" data-delta="1">+</button></span></div>
        <label class="control">Marketing / month <input type="number" min="0" step="50" value="${Math.round(b.marketing)}" data-biz="${b.id}" data-field="marketing"></label>
        <label class="control">Pricing <select data-biz="${b.id}" data-field="pricing">${[[0.85, 'Budget'], [1, 'Standard'], [1.15, 'Premium'], [1.3, 'Luxury']].map(([v, l]) => html`<option value="${v}" ${Math.abs(b.pricing - (v as number)) < 0.01 ? 'selected' : ''}>${l}</option>`)}</select></label>
        <label class="control">Your involvement <select data-biz="${b.id}" data-field="involvement">${(['hands-off', 'part-time', 'full-time'] as const).map((v) => html`<option value="${v}" ${b.involvement === v ? 'selected' : ''} ${v === 'full-time' && s.career.employed && !t.sideHustleFriendly ? '' : ''}>${v}</option>`)}</select></label>
        <label class="control">Owner's draw / month <input type="number" min="0" step="100" value="${Math.round(b.ownerDraw)}" data-biz="${b.id}" data-field="ownerDraw"></label>
      </div>
      <p class="muted small">${b.involvement === 'full-time' && s.career.employed ? 'Running a business full-time on top of a job is very stressful. ' : ''}Hands-off works best with 4+ staff. Draws are paid from business cash and taxed as income.</p>
      <div class="inline">
        <button class="btn" data-action="biz-location" data-id="${b.id}" ${b.locations >= t.maxLocations ? 'disabled' : ''}>Open a new ${unit} (${compact(t.locationCost * cpi)})</button>
        <button class="btn" data-action="biz-quality" data-id="${b.id}">Upgrade quality (${compact(t.locationCost * 0.1 * cpi)})</button>
        <button class="btn ghost" data-action="biz-sell" data-id="${b.id}">Sell (~${compact(businessValue(b))})</button>
        <button class="btn ghost danger-text" data-action="biz-close" data-id="${b.id}">Close</button>
      </div>
    </section>`;
  })}
  <section class="card">
    <div class="card-head"><h2>${s.businesses.length ? 'Start another business' : 'Start a business'}</h2><span class="muted">${s.businesses.length}/${MAX_BUSINESSES}</span></div>
    <p class="muted small">A business can multiply your income, and a profitable one can be sold for several times its yearly profit. It also adds risk and stress. Side-hustle friendly types can be run part-time alongside your job. Small-business loans cover 75% at 9.5%.</p>
    <div class="biz-types">
      ${BUSINESS_TYPES.map((t) => html`<div class="biz-type">
        <h3>${t.name}</h3>
        <p class="small">${t.blurb}</p>
        <p class="muted small">Startup ${money(t.startupCost * cpi)}${t.sideHustleFriendly ? ' · side-hustle friendly' : ' · needs you full-time or a team'}</p>
        <div class="inline">
          <button class="btn small primary" data-action="biz-start" data-type="${t.id}" data-loan="0" ${!canStart || s.cash < t.startupCost * cpi ? 'disabled' : ''}>Start with cash</button>
          <button class="btn small" data-action="biz-start" data-type="${t.id}" data-loan="1" ${!canStart || s.cash < t.startupCost * cpi * 0.25 ? 'disabled' : ''}>With a loan</button>
        </div>
      </div>`)}
    </div>
  </section>`;
}
