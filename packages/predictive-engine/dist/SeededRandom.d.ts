/**
 * Sentinel Grid - Seeded Random Number Generator
 * Implements a Mulberry32 PRNG for deterministic, reproducible simulations
 */
export declare class SeededRandom {
    private state;
    private initialSeed;
    constructor(seed?: number);
    /**
     * Reset to initial seed state
     */
    reset(): void;
    /**
     * Set a new seed
     */
    setSeed(seed: number): void;
    /**
     * Get current seed
     */
    getSeed(): number;
    /**
     * Generate next random number [0, 1)
     * Uses Mulberry32 algorithm - fast and good statistical properties
     */
    next(): number;
    /**
     * Random integer in range [min, max] inclusive
     */
    nextInt(min: number, max: number): number;
    /**
     * Random float in range [min, max)
     */
    nextFloat(min: number, max: number): number;
    /**
     * Random boolean with given probability of true
     */
    nextBool(probability?: number): boolean;
    /**
     * Pick random element from array
     */
    pick<T>(array: T[]): T;
    /**
     * Pick n random elements from array (without replacement)
     */
    pickN<T>(array: T[], n: number): T[];
    /**
     * Shuffle array in place using Fisher-Yates
     */
    shuffle<T>(array: T[]): T[];
    /**
     * Normal distribution using Box-Muller transform
     */
    nextGaussian(mean?: number, stdDev?: number): number;
    /**
     * Exponential distribution
     */
    nextExponential(lambda?: number): number;
    /**
     * Weighted random selection
     */
    weightedPick<T>(items: T[], weights: number[]): T;
    /**
     * Generate UUID-like string (not cryptographically secure)
     */
    nextUUID(): string;
}
export declare function getSeededRandom(seed?: number): SeededRandom;
export declare function setGlobalSeed(seed: number): void;
//# sourceMappingURL=SeededRandom.d.ts.map