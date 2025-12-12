/**
 * Risk Scoring Service
 * Advanced risk calculation with probability, severity, and contributing factors
 */
import type { RiskScore, DigitalTwinNode, EnhancedPrediction } from '../types/index.js';
export declare function calculateRiskScore(node: DigitalTwinNode): RiskScore;
export declare function predictCascadePath(originNodeId: string): string[];
export declare function generatePrediction(node: DigitalTwinNode): EnhancedPrediction | null;
export declare function generateAllPredictions(): EnhancedPrediction[];
export declare function recordPredictionOutcome(predictionId: string, wasAccurate: boolean, type: string): void;
export declare function getAccuracyStats(): {
    total: number;
    accurate: number;
    accuracy: number;
    byType: Record<string, {
        total: number;
        accurate: number;
        accuracy: number;
    }>;
};
export declare function clearAccuracyStats(): void;
