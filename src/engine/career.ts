// Jobs, skills, promotions, certifications and job changes.

import type { CareerState, GameState } from '../types';
import { CAREER_BY_ID, CERT_BY_ID, EMPLOYERS } from '../data/careers';
import { Rng } from './rng';

export const DEGREE = { months: 36, monthlyCost: 650 };

export function track(state: GameState) {
  return CAREER_BY_ID[state.career.trackId];
}

export function levelSalary(trackId: string, level: number, cpi: number): number {
  const t = CAREER_BY_ID[trackId];
  return t.levels[Math.min(level, t.levels.length - 1)].salary * cpi;
}

/** Top of the pay band for a level: you need a promotion to earn more than this. */
export const BAND_TOP = 1.15;
export function bandTop(trackId: string, level: number, cpi: number): number {
  return levelSalary(trackId, level, cpi) * BAND_TOP;
}

export function currentTitle(state: GameState): string {
  const c = state.career;
  if (!c.employed) return c.onLeave ? 'On medical leave' : 'Not employed';
  return track(state).levels[c.level].title;
}

export function newCareer(trackId: string, skill: number, hasDegree: boolean, rng: Rng, level = 0): CareerState {
  level = Math.min(level, CAREER_BY_ID[trackId].levels.length - 1);
  const salary = levelSalary(trackId, level, 1);
  return {
    trackId,
    level,
    employed: true,
    salary,
    employer: rng.pick(EMPLOYERS[trackId] ?? ['Acme Corp']),
    monthsInLevel: 0,
    monthsEmployed: 0,
    totalExperience: 0,
    skill,
    performance: 55,
    reputation: 20,
    effort: 'steady',
    certs: [],
    hasDegree,
    monthsUnemployed: 0,
    searching: false,
    benefitsMonths: 0,
    lastSalary: salary,
    onLeave: false,
    promoCooldown: 0,
    raisesHistory: [{ month: 0, salary, reason: 'Starting salary' }],
  };
}

export interface PromotionCheck {
  eligible: boolean;
  nextTitle?: string;
  nextSalary?: number;
  missing: string[];
  chance: number;
}

export function promotionCheck(state: GameState): PromotionCheck {
  const c = state.career;
  const t = track(state);
  const next = t.levels[c.level + 1];
  if (!c.employed) return { eligible: false, missing: ['You need a job first.'], chance: 0 };
  if (!next) return { eligible: false, missing: ['You are at the top of this career ladder. Consider a business, or switching tracks.'], chance: 0 };
  const missing: string[] = [];
  if (c.skill < next.minSkill) missing.push(`Skill ${Math.floor(c.skill)}/${next.minSkill}`);
  if (c.monthsInLevel < next.minMonths) missing.push(`${next.minMonths - c.monthsInLevel} more months in your current role`);
  for (const cert of next.certs ?? []) if (!c.certs.includes(cert)) missing.push(`Certification: ${CERT_BY_ID[cert]?.name ?? cert}`);
  if (c.promoCooldown > 0) missing.push(`Wait ${c.promoCooldown} months before asking again`);
  // Senior roles are scarce: the higher you climb, the harder the next step.
  const scarcity = Math.max(0.15, 1 - 0.14 * c.level);
  const chance = Math.max(0.05, Math.min(0.92, (0.3 + (c.performance - 50) / 70 + c.reputation / 400) * scarcity));
  return { eligible: missing.length === 0, nextTitle: next.title, nextSalary: Math.max(levelSalary(c.trackId, c.level + 1, state.market.cpi), c.salary * 1.08), missing, chance };
}

export function promote(state: GameState, reason = 'Promotion'): string {
  const c = state.career;
  const t = track(state);
  if (c.level + 1 >= t.levels.length) {
    c.salary *= 1.06;
    return 'You are already at the top level, so you got a 6% raise instead.';
  }
  c.level++;
  c.salary = Math.max(levelSalary(c.trackId, c.level, state.market.cpi), c.salary * 1.08);
  c.monthsInLevel = 0;
  c.performance = Math.max(50, c.performance - 10);
  state.stats.promotions++;
  c.raisesHistory.push({ month: state.month, salary: c.salary, reason });
  c.salary = Math.min(c.salary, Math.max(bandTop(c.trackId, c.level, state.market.cpi), levelSalary(c.trackId, c.level, state.market.cpi)));
  return `Promoted to ${t.levels[c.level].title}! New salary: $${Math.round(c.salary).toLocaleString()}.`;
}

export function askForPromotion(state: GameState, rng: Rng): { ok: boolean; message: string } {
  const check = promotionCheck(state);
  if (!check.eligible) return { ok: false, message: `Not yet: ${check.missing.join('; ')}.` };
  if (rng.chance(check.chance)) return { ok: true, message: promote(state) };
  state.career.promoCooldown = 12;
  state.stress = Math.min(100, state.stress + 4);
  return { ok: false, message: 'Your manager says "not yet". Keep your performance high and try again in a year.' };
}

export function startCert(state: GameState, certId: string): string {
  const c = state.career;
  const cert = CERT_BY_ID[certId];
  if (!cert) return 'Unknown certification.';
  if (c.certs.includes(certId)) return 'You already have it.';
  if (c.studying) return 'Finish your current course first.';
  if (cert.track !== '*' && cert.track !== c.trackId) return 'That certification is for a different career.';
  if (c.skill < cert.minSkill) return `You need skill ${cert.minSkill} to enrol.`;
  const cost = cert.cost * state.market.cpi;
  if (state.cash < cost) return `It costs $${Math.round(cost).toLocaleString()}. Save up first.`;
  state.cash -= cost;
  state.year.expenses += cost;
  state.lastFlow.education += cost;
  c.studying = { certId, monthsLeft: cert.months };
  return `Enrolled in ${cert.name}. ${cert.months} months of study ahead.`;
}

export function startDegree(state: GameState): string {
  const c = state.career;
  if (c.hasDegree) return 'You already have a degree.';
  if (c.degreeProgress) return 'You are already studying.';
  c.degreeProgress = { monthsLeft: DEGREE.months, trackId: c.trackId };
  return `Night school started: ${DEGREE.months} months at about $${Math.round(DEGREE.monthlyCost * state.market.cpi)} a month. It will be tiring, but it opens new careers.`;
}

/** Chance that a job application succeeds. */
export function applyChance(state: GameState, targetTrack: string, level: number): number {
  const c = state.career;
  const t = CAREER_BY_ID[targetTrack];
  const lvl = t.levels[level];
  const skill = targetTrack === c.trackId ? c.skill : c.skill * 0.6;
  let p = 0.35 + (skill - lvl.minSkill) / 60 + c.reputation / 300;
  if (state.market.regime === 'bear' || state.market.regime === 'crash') p -= 0.15;
  for (const cert of lvl.certs ?? []) if (!c.certs.includes(cert)) p -= 0.5;
  return Math.max(0.03, Math.min(0.9, p));
}

export interface JobOption {
  trackId: string;
  level: number;
  title: string;
  salary: number;
  chance: number;
  note: string;
}

/** Jobs the player could apply for right now. */
export function jobOptions(state: GameState): JobOption[] {
  const c = state.career;
  const out: JobOption[] = [];
  const cpi = state.market.cpi;
  for (const t of Object.values(CAREER_BY_ID)) {
    if (t.requiresDegree && !c.hasDegree) continue;
    if (t.id === c.trackId) {
      const base = c.employed ? c.level : Math.max(0, c.level);
      const lvl = t.levels[base];
      const salary = Math.max(levelSalary(t.id, base, cpi), (c.employed ? c.salary : c.lastSalary) * 1.12);
      out.push({ trackId: t.id, level: base, title: lvl.title, salary, chance: applyChance(state, t.id, base) * (c.employed ? 0.8 : 1), note: c.employed ? 'Same role at a new company, usually for 10-15% more pay.' : 'Your previous role.' });
      if (t.levels[base + 1]) {
        const lvl2 = t.levels[base + 1];
        out.push({ trackId: t.id, level: base + 1, title: lvl2.title, salary: Math.max(levelSalary(t.id, base + 1, cpi), salary * 1.05), chance: applyChance(state, t.id, base + 1) * 0.6, note: 'A step up at another company. Harder to land.' });
      }
    } else {
      const lvl = t.levels[0];
      out.push({ trackId: t.id, level: 0, title: lvl.title, salary: levelSalary(t.id, 0, cpi), chance: applyChance(state, t.id, 0), note: 'Switch careers. You keep part of your skill.' });
    }
  }
  return out;
}

export function takeJob(state: GameState, rng: Rng, trackId: string, level: number, salary: number): string {
  const c = state.career;
  const switching = trackId !== c.trackId;
  if (switching) {
    c.skill = c.skill * 0.6;
    c.certs = c.certs.filter((id) => CERT_BY_ID[id]?.track === '*');
  }
  c.trackId = trackId;
  c.level = level;
  c.salary = Math.min(salary, bandTop(trackId, level, state.market.cpi));
  c.employed = true;
  c.searching = false;
  c.employer = rng.pick((EMPLOYERS[trackId] ?? ['Acme Corp']).filter((e) => e !== c.employer));
  c.monthsInLevel = switching ? 0 : Math.floor(c.monthsInLevel / 2);
  c.monthsEmployed = 0;
  c.monthsUnemployed = 0;
  c.benefitsMonths = 0;
  c.performance = 55;
  c.lastSalary = salary;
  state.stats.jobChanges++;
  c.raisesHistory.push({ month: state.month, salary, reason: switching ? 'Career change' : 'New job' });
  return `You start as ${CAREER_BY_ID[trackId].levels[level].title} at ${c.employer}, earning $${Math.round(salary).toLocaleString()} a year.`;
}

export function applyForJob(state: GameState, rng: Rng, opt: JobOption): { ok: boolean; message: string } {
  state.stress = Math.min(100, state.stress + 2);
  if (rng.chance(opt.chance)) return { ok: true, message: takeJob(state, rng, opt.trackId, opt.level, opt.salary) };
  return { ok: false, message: `${opt.title}: they went with another candidate. Building skill and reputation improves your odds.` };
}

export function loseJob(state: GameState, laidOff: boolean): string {
  const c = state.career;
  if (!c.employed) return 'You are not employed.';
  c.lastSalary = c.salary;
  c.employed = false;
  c.salary = 0;
  c.searching = true;
  c.monthsUnemployed = 0;
  c.benefitsMonths = laidOff ? 6 : 0;
  state.stress = Math.min(100, state.stress + (laidOff ? 15 : 3));
  return laidOff
    ? 'You were laid off. You will get unemployment benefits for up to 6 months while you search. This is exactly what an emergency fund is for.'
    : 'You left your job.';
}

/** Monthly career update. Returns log messages. */
export function careerMonth(state: GameState, rng: Rng): string[] {
  const c = state.career;
  const msgs: string[] = [];
  const cpi = state.market.cpi;
  if (c.promoCooldown > 0) c.promoCooldown--;

  // Medical leave
  if (state.health < 20 && c.employed && !c.onLeave) {
    c.onLeave = true;
    msgs.push(`Your health forced you onto medical leave. ${state.budget.insurance.disability ? 'Disability insurance pays 60% of your salary.' : 'Without disability insurance, your pay stops.'}`);
  } else if (c.onLeave && state.health >= 35) {
    c.onLeave = false;
    msgs.push('You are healthy enough to return to work.');
  }

  if (c.employed && !c.onLeave) {
    c.monthsInLevel++;
    c.monthsEmployed++;
    c.totalExperience++;
    const learn = { coast: 0.15, steady: 0.35, hustle: 0.6 }[c.effort];
    // Learning slows as you approach mastery.
    const headroom = Math.max(0.05, Math.pow((100 - c.skill) / 100, 1.5));
    c.skill = Math.min(100, c.skill + learn * headroom * 0.7);
    const effortTarget = { coast: 38, steady: 60, hustle: 82 }[c.effort];
    const target = effortTarget - Math.max(0, state.stress - 65) * 0.8 - Math.max(0, 40 - state.health) * 0.5 + (c.skill > 60 ? 5 : 0);
    c.performance += (target - c.performance) * 0.15 + rng.normal() * 2;
    c.performance = Math.max(0, Math.min(100, c.performance));
    c.reputation = Math.min(100, c.reputation + (c.performance > 70 ? 0.25 : 0.08));
    // Annual review each January
    if (state.month % 12 === 1 && state.month > 1) {
      const merit = c.performance > 80 ? 0.035 : c.performance > 60 ? 0.02 : c.performance > 40 ? 0.008 : 0;
      const infl = state.market.inflation;
      const top = bandTop(c.trackId, c.level, cpi);
      const raise = c.salary < top ? merit + infl : infl * 0.5;
      c.salary = Math.min(c.salary * (1 + raise), Math.max(top, c.salary));
      c.raisesHistory.push({ month: state.month, salary: c.salary, reason: `Annual review (${(raise * 100).toFixed(1)}%)` });
      msgs.push(`Annual review: ${raise > infl ? 'a merit raise' : 'a cost-of-living raise'} of ${(raise * 100).toFixed(1)}%. Salary now $${Math.round(c.salary).toLocaleString()}.${c.salary >= top * 0.999 ? ' You are at the top of the pay band; a promotion or new job is the way up.' : ''}`);
    }
  } else if (!c.employed) {
    c.monthsUnemployed++;
    if (c.benefitsMonths > 0) c.benefitsMonths--;
    if (c.searching) {
      let p = 0.22 + c.skill / 400 + c.reputation / 400;
      if (state.market.regime === 'bear' || state.market.regime === 'crash') p *= 0.6;
      if (rng.chance(p)) {
        const t = CAREER_BY_ID[c.trackId];
        const lvl = Math.max(0, Math.min(c.level, t.levels.length - 1));
        const salary = Math.max(levelSalary(c.trackId, lvl, cpi), c.lastSalary * rng.range(0.92, 1.08));
        msgs.push('Job found! ' + takeJob(state, rng, c.trackId, lvl, salary));
      }
    }
  }

  // Studying
  if (c.studying) {
    c.studying.monthsLeft--;
    if (c.studying.monthsLeft <= 0) {
      const cert = CERT_BY_ID[c.studying.certId];
      c.certs.push(cert.id);
      c.skill = Math.min(100, c.skill + cert.skillBoost);
      if (cert.id === 'public-speaking') c.reputation = Math.min(100, c.reputation + 8);
      msgs.push(`You earned the ${cert.name}! Skill +${cert.skillBoost}.`);
      c.studying = undefined;
    }
  }
  if (c.degreeProgress) {
    c.degreeProgress.monthsLeft--;
    if (c.degreeProgress.monthsLeft <= 0) {
      c.hasDegree = true;
      c.degreeProgress = undefined;
      c.skill = Math.min(100, c.skill + 8);
      if (!state.flags.includes('degree')) state.flags.push('degree');
      msgs.push('You graduated! Careers that need a degree are now open to you (see Career > Find a job).');
    }
  }
  return msgs;
}

/** Monthly gross pay from the job (including disability/unemployment benefits). */
export function monthlyPay(state: GameState): { wages: number; benefits: number } {
  const c = state.career;
  if (c.employed && !c.onLeave) return { wages: c.salary / 12, benefits: 0 };
  if (c.employed && c.onLeave) return { wages: 0, benefits: state.budget.insurance.disability ? (c.salary * 0.6) / 12 : 0 };
  if (c.benefitsMonths > 0) return { wages: 0, benefits: Math.min((c.lastSalary * 0.45) / 12, 2400 * state.market.cpi) };
  return { wages: 0, benefits: 0 };
}
