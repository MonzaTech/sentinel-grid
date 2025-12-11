/**
 * Sentinel Grid - Predictive Engine
 * Physics-informed heuristics + moving-average + event rules for credible predictions
 * Designed to be swappable with a Python ML model via REST microservice
 */
import { Node, SystemState, Prediction, Pattern, AccuracyMetrics, NodeMetricsHistory } from './types';
interface PredictiveConfig {
    seed: number;
    historyWindowSize: number;
    predictionHorizonHours: number;
    minConfidenceThreshold: number;
    patternDetectionWindow: number;
}
export declare class PredictiveEngine {
    private config;
    private rng;
    nodeHistories: Map<string, NodeMetricsHistory>;
    private systemHistory;
    private predictions;
    private resolvedPredictions;
    private detectedPatterns;
    constructor(config?: Partial<PredictiveConfig>);
    /**
     * Update histories with new data point
     */
    updateHistories(systemStates: SystemState[], nodes: Record<string, Node>): void;
    /**
     * Analyze current state for patterns
     */
    analyzePatterns(nodes: Record<string, Node>): Pattern[];
    /**
     * Generate predictions based on current state and patterns
     */
    generatePredictions(nodes: Record<string, Node>): Prediction[];
    /**
     * Get system health score based on predictions and patterns
     */
    getSystemHealthScore(nodes: Record<string, Node>): number;
    /**
     * Get accuracy metrics for the predictive engine
     */
    getAccuracyMetrics(): AccuracyMetrics;
    /**
     * Mark a prediction as resolved (for accuracy tracking)
     */
    resolvePrediction(predictionId: string, wasAccurate: boolean): void;
    private calculateTrend;
    private calculateVelocity;
    private calculateConfidence;
    private getSeverity;
    private generateReasoning;
    private generateActions;
    private groupByRegion;
    private findSpatialClusters;
    private determineTrend;
    private calculateRegionRisks;
}
export default PredictiveEngine;
//# sourceMappingURL=PredictiveEngine.d.ts.map