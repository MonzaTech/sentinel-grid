/**
 * Sentinel Grid - Seeded Random Number Generator
 * Implements a Mulberry32 PRNG for deterministic, reproducible simulations
 */

export class SeededRandom {
  private state: number;
  private initialSeed: number;

  constructor(seed: number = 12345) {
    this.initialSeed = seed;
    this.state = seed;
  }

  /**
   * Reset to initial seed state
   */
  reset(): void {
    this.state = this.initialSeed;
  }

  /**
   * Set a new seed
   */
  setSeed(seed: number): void {
    this.initialSeed = seed;
    this.state = seed;
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.initialSeed;
  }

  /**
   * Generate next random number [0, 1)
   * Uses Mulberry32 algorithm - fast and good statistical properties
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Random integer in range [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Random float in range [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Random boolean with given probability of true
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * Pick n random elements from array (without replacement)
   */
  pickN<T>(array: T[], n: number): T[] {
    const shuffled = this.shuffle([...array]);
    return shuffled.slice(0, Math.min(n, array.length));
  }

  /**
   * Shuffle array in place using Fisher-Yates
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Normal distribution using Box-Muller transform
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Exponential distribution
   */
  nextExponential(lambda: number = 1): number {
    return -Math.log(1 - this.next()) / lambda;
  }

  /**
   * Weighted random selection
   */
  weightedPick<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.next() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }

  /**
   * Generate UUID-like string (not cryptographically secure)
   */
  nextUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(this.next() * 16);
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Singleton instance for convenience
let defaultInstance: SeededRandom | null = null;

export function getSeededRandom(seed?: number): SeededRandom {
  if (!defaultInstance || seed !== undefined) {
    defaultInstance = new SeededRandom(seed);
  }
  return defaultInstance;
}

export function setGlobalSeed(seed: number): void {
  defaultInstance = new SeededRandom(seed);
}
