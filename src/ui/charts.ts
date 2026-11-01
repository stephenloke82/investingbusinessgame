// Lightweight SVG charts with a hover crosshair + tooltip.
// Colors come from CSS custom properties (--series-1..4) defined in style.css,
// so light/dark themes are handled in one place.

import { esc } from './html';

export interface Series {
  name: string;
  values: (number | null)[];
  /** 1-4: categorical slot (fixed order, never cycled). */
  slot: 1 | 2 | 3 | 4;
  dashed?: boolean;
}

interface ChartData {
  kind: 'line' | 'bar';
  labels: string[];
  series: Series[];
  fmt: (v: number) => string;
  x0: number;
  plotW: number;
  n: number;
  W: number;
}

const registry = new Map<string, ChartData>();
let counter = 0;

export function resetCharts() {
  registry.clear();
}

/** Chart width in SVG units, close to the on-screen size so text renders at ~1:1. */
function chartWidth(span: 'full' | 'half'): number {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const content = Math.min(1200, vw - 40);
  const w = vw <= 760 ? vw - 68 : span === 'half' ? content / 2 - 46 : content - 38;
  return Math.max(300, Math.round(w));
}
const PAD_L = 62;
const PAD_R = 92;
const PAD_T = 14;
const PAD_B = 28;

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    max = min + 1;
  }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

/** Thin-out labels so at most ~7 show on the x axis. */
function labelEvery(n: number, W = 640) {
  return Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 90))));
}

export function lineChart(opts: { series: Series[]; labels: string[]; height?: number; fmt: (v: number) => string; title: string; zero?: boolean; span?: 'full' | 'half' }): string {
  const id = `c${++counter}`;
  const W = chartWidth(opts.span ?? 'half');
  const H = opts.height ?? 220;
  const n = opts.labels.length;
  const all = opts.series.flatMap((s) => s.values.filter((v): v is number => v !== null && Number.isFinite(v)));
  if (n < 2 || !all.length) return `<div class="chart-empty">Not enough history yet. Play a few months to see this chart.</div>`;
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (opts.zero !== false) min = Math.min(0, min);
  if (min === max) max = min + 1;
  const ticks = niceTicks(min, max);
  min = Math.min(min, ticks[0]);
  max = Math.max(max, ticks[ticks.length - 1]);
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (n === 1 ? 0 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_T + plotH - ((v - min) / (max - min)) * plotH;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="${esc(opts.title)}">`;
  for (const t of ticks) {
    svg += `<line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y(t)}" y2="${y(t)}" class="grid ${t === 0 ? 'zero' : ''}"/>`;
    svg += `<text x="${PAD_L - 8}" y="${y(t) + 4}" class="axis-label" text-anchor="end">${esc(opts.fmt(t))}</text>`;
  }
  const every = labelEvery(n, W);
  opts.labels.forEach((l, i) => {
    if (i % every === 0 || (i === n - 1 && (n - 1) % every >= every / 2)) svg += `<text x="${x(i)}" y="${H - 8}" class="axis-label" text-anchor="middle">${esc(l)}</text>`;
  });
  // Direct labels at line ends (only for <= 4 series), nudged apart to avoid collisions.
  const ends: { y: number; s: Series }[] = [];
  for (const s of opts.series) {
    let d = '';
    let started = false;
    s.values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        started = false;
        return;
      }
      d += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      started = true;
    });
    svg += `<path d="${d}" class="line s${s.slot} ${s.dashed ? 'dashed' : ''}"/>`;
    const lastIdx = [...s.values].map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0).pop();
    if (lastIdx !== undefined) ends.push({ y: y(s.values[lastIdx] as number), s });
  }
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  for (const e of ends) svg += `<text x="${W - PAD_R + 6}" y="${e.y + 4}" class="direct-label">${esc(e.s.name)}</text>`;
  svg += `<line class="crosshair" x1="0" x2="0" y1="${PAD_T}" y2="${PAD_T + plotH}" style="display:none"/>`;
  svg += `<rect class="hit" x="${PAD_L}" y="${PAD_T}" width="${plotW}" height="${plotH}" data-chart="${id}"/>`;
  svg += `</svg>`;
  registry.set(id, { kind: 'line', labels: opts.labels, series: opts.series, fmt: opts.fmt, x0: PAD_L, plotW, n, W });
  return wrap(id, svg, opts.series);
}

export function barChart(opts: { series: Series[]; labels: string[]; height?: number; fmt: (v: number) => string; title: string; span?: 'full' | 'half' }): string {
  const id = `c${++counter}`;
  const W = chartWidth(opts.span ?? 'half');
  const H = opts.height ?? 200;
  const n = opts.labels.length;
  const all = opts.series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (!n || !all.length) return `<div class="chart-empty">Complete a full year to see this chart.</div>`;
  let min = Math.min(0, ...all);
  let max = Math.max(0, ...all);
  if (min === max) max = 1;
  const ticks = niceTicks(min, max);
  min = Math.min(min, ticks[0]);
  max = Math.max(max, ticks[ticks.length - 1]);
  const plotW = W - PAD_L - 20;
  const plotH = H - PAD_T - PAD_B;
  const y = (v: number) => PAD_T + plotH - ((v - min) / (max - min)) * plotH;
  const groupW = plotW / n;
  const k = opts.series.length;
  const gap = 2;
  const barW = Math.max(2, (groupW * 0.8 - gap * (k - 1)) / k);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="${esc(opts.title)}">`;
  for (const t of ticks) {
    svg += `<line x1="${PAD_L}" x2="${W - 20}" y1="${y(t)}" y2="${y(t)}" class="grid ${t === 0 ? 'zero' : ''}"/>`;
    svg += `<text x="${PAD_L - 8}" y="${y(t) + 4}" class="axis-label" text-anchor="end">${esc(opts.fmt(t))}</text>`;
  }
  const every = labelEvery(n, W);
  opts.labels.forEach((l, i) => {
    const gx = PAD_L + i * groupW + groupW * 0.1;
    opts.series.forEach((s, j) => {
      const v = s.values[i];
      if (v === null || v === undefined) return;
      const top = Math.min(y(v), y(0));
      const h = Math.max(1, Math.abs(y(v) - y(0)));
      const bx = gx + j * (barW + gap);
      const r = Math.min(4, barW / 2, h / 2);
      // Rounded at the data end, square at the baseline.
      const d =
        v >= 0
          ? `M${bx},${top + h}V${top + r}Q${bx},${top} ${bx + r},${top}H${bx + barW - r}Q${bx + barW},${top} ${bx + barW},${top + r}V${top + h}Z`
          : `M${bx},${top}V${top + h - r}Q${bx},${top + h} ${bx + r},${top + h}H${bx + barW - r}Q${bx + barW},${top + h} ${bx + barW},${top + h - r}V${top}Z`;
      svg += `<path d="${d}" class="bar s${s.slot}"/>`;
    });
    if (i % every === 0 || (i === n - 1 && (n - 1) % every >= every / 2)) svg += `<text x="${gx + (groupW * 0.8) / 2}" y="${H - 8}" class="axis-label" text-anchor="middle">${esc(l)}</text>`;
  });
  svg += `<line class="crosshair" x1="0" x2="0" y1="${PAD_T}" y2="${PAD_T + plotH}" style="display:none"/>`;
  svg += `<rect class="hit" x="${PAD_L}" y="${PAD_T}" width="${plotW}" height="${plotH}" data-chart="${id}"/>`;
  svg += `</svg>`;
  registry.set(id, { kind: 'bar', labels: opts.labels, series: opts.series, fmt: opts.fmt, x0: PAD_L, plotW, n, W });
  return wrap(id, svg, opts.series);
}

function wrap(id: string, svg: string, series: Series[]): string {
  const legend =
    series.length >= 2
      ? `<div class="legend">${series.map((s) => `<span class="legend-item"><span class="swatch s${s.slot} ${s.dashed ? 'dashed' : ''}"></span>${esc(s.name)}</span>`).join('')}</div>`
      : '';
  return `<div class="chart" id="${id}">${legend}<div class="chart-plot">${svg}<div class="tooltip" hidden></div></div></div>`;
}

/** Sparkline for tables (no interaction). */
export function sparkline(values: number[], up: boolean): string {
  if (values.length < 2) return '';
  const w = 80;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" class="spark ${up ? 'up' : 'down'}" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}

/** Install the delegated hover handlers once. */
export function installChartHover(root: HTMLElement) {
  const move = (ev: PointerEvent) => {
    const target = ev.target as Element;
    if (!(target instanceof SVGRectElement) || !target.dataset.chart) return;
    const data = registry.get(target.dataset.chart);
    if (!data) return;
    const svg = target.ownerSVGElement!;
    const rect = svg.getBoundingClientRect();
    const W = data.W;
    const scale = W / rect.width;
    const px = (ev.clientX - rect.left) * scale;
    let i: number;
    let cx: number;
    if (data.kind === 'line') {
      i = Math.round(((px - data.x0) / data.plotW) * (data.n - 1));
      i = Math.max(0, Math.min(data.n - 1, i));
      cx = data.x0 + (i / Math.max(1, data.n - 1)) * data.plotW;
    } else {
      const gw = data.plotW / data.n;
      i = Math.max(0, Math.min(data.n - 1, Math.floor((px - data.x0) / gw)));
      cx = data.x0 + i * gw + gw / 2;
    }
    const cross = svg.querySelector('.crosshair') as SVGLineElement;
    cross.setAttribute('x1', String(cx));
    cross.setAttribute('x2', String(cx));
    cross.style.display = '';
    const tip = svg.parentElement!.querySelector('.tooltip') as HTMLElement;
    tip.hidden = false;
    tip.innerHTML =
      `<div class="tt-title">${esc(data.labels[i])}</div>` +
      data.series
        .map((s) => {
          const v = s.values[i];
          return `<div class="tt-row"><span class="swatch s${s.slot}"></span><span>${esc(s.name)}</span><b>${v === null || v === undefined ? '-' : esc(data.fmt(v))}</b></div>`;
        })
        .join('');
    const left = (cx / W) * rect.width;
    tip.style.left = `${Math.min(rect.width - 170, Math.max(0, left + 12))}px`;
    tip.style.top = `8px`;
  };
  const leave = (ev: PointerEvent) => {
    const target = ev.target as Element;
    if (!(target instanceof SVGRectElement) || !target.dataset.chart) return;
    const svg = target.ownerSVGElement!;
    (svg.querySelector('.crosshair') as SVGLineElement).style.display = 'none';
    (svg.parentElement!.querySelector('.tooltip') as HTMLElement).hidden = true;
  };
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerout', leave);
}
