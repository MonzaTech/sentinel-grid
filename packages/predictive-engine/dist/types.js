"use strict";
/**
 * Sentinel Grid - Predictive Engine Types
 * Core interfaces for infrastructure monitoring and prediction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    seed: 12345,
    nodeCount: 200,
    regions: ['North', 'South', 'East', 'West', 'Central'],
    tickIntervalMs: 3000,
    predictionIntervalMs: 10000,
    criticalThreshold: 0.8,
    warningThreshold: 0.6,
    baseRiskDrift: 0.02,
    weatherImpactMultiplier: 1.5,
    cascadePropagationRate: 0.3,
    mitigationEffectiveness: 0.4,
    cyberAttackProbability: 0.01,
    networkLatencyBase: 50,
    packetLossBase: 0.01,
};
//# sourceMappingURL=types.js.map