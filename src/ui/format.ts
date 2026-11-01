// Number formatting helpers for the UI.

export function money(x: number, opts: { cents?: boolean; compact?: boolean } = {}): string {
  if (!Number.isFinite(x)) return '$0';
  const sign = x < 0 ? '-' : '';
  const a = Math.abs(x);
  if (opts.compact) {
    if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
    if (a >= 1e5) return `${sign}$${Math.round(a / 1000)}K`;
    if (a >= 1e4) return `${sign}$${(a / 1000).toFixed(1)}K`;
  }
  return `${sign}$${a.toLocaleString('en-US', { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 })}`;
}

export const compact = (x: number) => money(x, { compact: true });

export function pct(x: number, digits = 1): string {
  if (!Number.isFinite(x)) return '-';
  return `${(x * 100).toFixed(digits)}%`;
}

export function signedPct(x: number, digits = 1): string {
  if (!Number.isFinite(x)) return '-';
  return `${x >= 0 ? '+' : ''}${(x * 100).toFixed(digits)}%`;
}

export function num(x: number, digits = 0): string {
  return x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function tone(x: number): string {
  return x > 0 ? 'up' : x < 0 ? 'down' : '';
}

export function billions(x: number): string {
  if (Math.abs(x) >= 1000) return `$${(x / 1000).toFixed(2)}T`;
  if (Math.abs(x) >= 1) return `$${x.toFixed(1)}B`;
  return `$${(x * 1000).toFixed(0)}M`;
}
