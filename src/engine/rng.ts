// Small, fast, seedable random number generator (mulberry32).
// The state is a single 32-bit integer, so it can be stored in a save file
// and the game continues exactly where it left off.

export class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  /** Uniform float in [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Standard normal via Box-Muller. */
  normal(): number {
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
  /** Weighted pick; returns undefined for an empty list. */
  weighted<T>(items: readonly T[], weight: (t: T) => number): T | undefined {
    const total = items.reduce((s, t) => s + Math.max(0, weight(t)), 0);
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const t of items) {
      r -= Math.max(0, weight(t));
      if (r <= 0) return t;
    }
    return items[items.length - 1];
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31) + 1;
}
