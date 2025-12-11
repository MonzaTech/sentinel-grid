/**
 * Tests for SeededRandom - Deterministic random number generator
 */

import { SeededRandom, getSeededRandom, setGlobalSeed } from '../src/SeededRandom';

describe('SeededRandom', () => {
  describe('determinism', () => {
    it('should produce identical sequences with same seed', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);

      const seq1 = Array.from({ length: 100 }, () => rng1.next());
      const seq2 = Array.from({ length: 100 }, () => rng2.next());

      expect(seq1).toEqual(seq2);
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(54321);

      const seq1 = Array.from({ length: 10 }, () => rng1.next());
      const seq2 = Array.from({ length: 10 }, () => rng2.next());

      expect(seq1).not.toEqual(seq2);
    });

    it('should reset to initial state', () => {
      const rng = new SeededRandom(12345);
      const first = Array.from({ length: 10 }, () => rng.next());

      rng.reset();
      const second = Array.from({ length: 10 }, () => rng.next());

      expect(first).toEqual(second);
    });
  });

  describe('next()', () => {
    it('should return values in [0, 1)', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 1000; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('nextInt()', () => {
    it('should return integers within range inclusive', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const val = rng.nextInt(5, 10);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(10);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('should return only the value when min equals max', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 10; i++) {
        expect(rng.nextInt(5, 5)).toBe(5);
      }
    });
  });

  describe('nextFloat()', () => {
    it('should return floats within range', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const val = rng.nextFloat(2.5, 7.5);
        expect(val).toBeGreaterThanOrEqual(2.5);
        expect(val).toBeLessThan(7.5);
      }
    });
  });

  describe('nextBool()', () => {
    it('should return boolean values', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const val = rng.nextBool();
        expect(typeof val).toBe('boolean');
      }
    });

    it('should respect probability', () => {
      const rng = new SeededRandom(42);
      let trueCount = 0;
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        if (rng.nextBool(0.3)) trueCount++;
      }

      // Should be roughly 30% true (allow 5% margin)
      expect(trueCount / iterations).toBeGreaterThan(0.25);
      expect(trueCount / iterations).toBeLessThan(0.35);
    });
  });

  describe('pick()', () => {
    it('should return element from array', () => {
      const rng = new SeededRandom(42);
      const array = ['a', 'b', 'c', 'd', 'e'];

      for (let i = 0; i < 50; i++) {
        const val = rng.pick(array);
        expect(array).toContain(val);
      }
    });
  });

  describe('shuffle()', () => {
    it('should shuffle array deterministically', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      rng1.shuffle(arr1);
      rng2.shuffle(arr2);

      expect(arr1).toEqual(arr2);
    });

    it('should contain all original elements', () => {
      const rng = new SeededRandom(42);
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle([...original]);

      expect(shuffled.sort()).toEqual(original.sort());
    });
  });

  describe('nextGaussian()', () => {
    it('should produce values centered around mean', () => {
      const rng = new SeededRandom(42);
      const mean = 50;
      const stdDev = 10;
      const values: number[] = [];

      for (let i = 0; i < 10000; i++) {
        values.push(rng.nextGaussian(mean, stdDev));
      }

      const actualMean = values.reduce((a, b) => a + b, 0) / values.length;
      expect(actualMean).toBeGreaterThan(mean - 1);
      expect(actualMean).toBeLessThan(mean + 1);
    });
  });

  describe('weightedPick()', () => {
    it('should respect weights', () => {
      const rng = new SeededRandom(42);
      const items = ['rare', 'common'];
      const weights = [10, 90]; // 10% rare, 90% common
      const counts: Record<string, number> = { rare: 0, common: 0 };

      for (let i = 0; i < 10000; i++) {
        const picked = rng.weightedPick(items, weights);
        counts[picked]++;
      }

      // Common should be picked ~9x more often
      expect(counts.common).toBeGreaterThan(counts.rare * 5);
    });
  });

  describe('nextUUID()', () => {
    it('should generate valid UUID format', () => {
      const rng = new SeededRandom(42);
      const uuid = rng.nextUUID();

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate deterministic UUIDs', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      expect(rng1.nextUUID()).toBe(rng2.nextUUID());
    });
  });

  describe('global singleton', () => {
    it('should provide a global instance', () => {
      setGlobalSeed(99999);
      const rng1 = getSeededRandom();
      const val1 = rng1.next();

      setGlobalSeed(99999);
      const rng2 = getSeededRandom();
      const val2 = rng2.next();

      expect(val1).toBe(val2);
    });
  });
});
