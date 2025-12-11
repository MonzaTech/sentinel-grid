/**
 * Sentinel Grid - Predictive Engine Types
 * Core interfaces for infrastructure monitoring and prediction
 */
interface Node {
    id: string;
    name: string;
    type: NodeType;
    region: string;
    coordinates: {
        x: number;
        y: number;
    };
    riskScore: number;
    health: number;
    loadRatio: number;
    temperature: number;
    powerDraw: number;
    status: NodeStatus;
    lastSeen: Date;
    connections: string[];
    metrics?: NodeMetricsHistory;
}
type NodeType = 'substation' | 'transformer' | 'generator' | 'datacenter' | 'telecom_tower' | 'water_pump' | 'control_center';
type NodeStatus = 'online' | 'degraded' | 'critical' | 'offline';
interface NodeMetricsHistory {
    timestamps: Date[];
    riskScores: number[];
    healthScores: number[];
    loadRatios: number[];
    temperatures: number[];
}
interface WeatherData {
    temperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    stormProbability: number;
    heatIndex: number;
    condition: WeatherCondition;
}
type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'storm' | 'extreme_heat' | 'extreme_cold';
interface Threat {
    id: string;
    type: ThreatType;
    severity: number;
    target: string | null;
    region?: string;
    active: boolean;
    until: Date;
    duration?: number;
}
type ThreatType = 'cyber_attack' | 'physical_intrusion' | 'equipment_failure' | 'overload' | 'weather_stress' | 'cascade_origin';
interface Prediction {
    id: string;
    nodeId: string;
    nodeName: string;
    type: PredictionType;
    probability: number;
    confidence: number;
    hoursToEvent: number;
    predictedTime: Date;
    severity: PredictionSeverity;
    reasoning: string;
    contributingFactors: ContributingFactor[];
    suggestedActions: SuggestedAction[];
    createdAt: Date;
    status: PredictionStatus;
    resolvedAt?: Date;
    wasAccurate?: boolean;
}
type PredictionType = 'cascade_failure' | 'equipment_failure' | 'overload' | 'thermal_stress' | 'cyber_vulnerability' | 'weather_impact' | 'capacity_breach';
type PredictionSeverity = 'low' | 'medium' | 'high' | 'critical';
type PredictionStatus = 'active' | 'mitigated' | 'expired' | 'occurred';
interface ContributingFactor {
    factor: string;
    weight: number;
    currentValue: number;
    threshold: number;
    trend: 'increasing' | 'stable' | 'decreasing';
}
interface SuggestedAction {
    action: string;
    priority: 'immediate' | 'high' | 'medium' | 'low';
    impact: 'critical' | 'high' | 'medium' | 'low';
    estimatedEffect: number;
    automated: boolean;
}
interface Pattern {
    id: string;
    type: PatternType;
    description: string;
    affectedNodes: string[];
    confidence: number;
    detectedAt: Date;
    trend: 'escalating' | 'stable' | 'resolving';
}
type PatternType = 'correlated_degradation' | 'load_imbalance' | 'thermal_cluster' | 'cascading_risk' | 'periodic_anomaly' | 'geographic_stress';
interface CascadeEvent {
    id: string;
    originNode: string;
    affectedNodes: string[];
    impactScore: number;
    startTime: Date;
    endTime?: Date;
    propagationPath: CascadePath[];
    totalDamage: number;
}
interface CascadePath {
    from: string;
    to: string;
    timestamp: Date;
    riskTransfer: number;
}
interface SystemState {
    maxRisk: number;
    avgHealth: number;
    loadRatio: number;
    criticalNodes: string[];
    warningNodes: string[];
    totalNodes: number;
    onlineNodes: number;
    timestamp: Date;
}
interface AccuracyMetrics {
    totalPredictions: number;
    accuratePredictions: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    avgLeadTime: number;
    byType: Record<PredictionType, TypeAccuracy>;
}
interface TypeAccuracy {
    total: number;
    accurate: number;
    accuracy: number;
}
interface Alert {
    id: string;
    predictionId?: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    nodeIds: string[];
    status: AlertStatus;
    createdAt: Date;
    acknowledgedAt?: Date;
    resolvedAt?: Date;
    acknowledgedBy?: string;
}
type AlertType = 'prediction_triggered' | 'threshold_breach' | 'cascade_detected' | 'system_degradation' | 'maintenance_required';
type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'expired';
interface AlertConfig {
    id: string;
    name: string;
    enabled: boolean;
    conditions: AlertCondition[];
    actions: AlertAction[];
    cooldownMinutes: number;
    lastTriggered?: Date;
}
interface AlertCondition {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    duration?: number;
}
interface AlertAction {
    type: 'webhook' | 'email' | 'slack' | 'log';
    target: string;
    template?: string;
}
interface AuditEntry {
    id: string;
    timestamp: Date;
    type: AuditEventType;
    hash: string;
    actor?: string;
    dataSummary: {
        affectedNodes?: number;
        severity?: string;
        autoMitigated?: boolean;
        [key: string]: unknown;
    };
}
type AuditEventType = 'system_start' | 'system_stop' | 'prediction_generated' | 'auto_mitigation' | 'manual_mitigation' | 'threat_deployment' | 'cascade_event' | 'proactive_action_executed' | 'alert_triggered' | 'config_changed';
interface SimulationConfig {
    seed: number;
    nodeCount: number;
    regions: string[];
    tickIntervalMs: number;
    predictionIntervalMs: number;
    criticalThreshold: number;
    warningThreshold: number;
    baseRiskDrift: number;
    weatherImpactMultiplier: number;
    cascadePropagationRate: number;
    mitigationEffectiveness: number;
}
declare const DEFAULT_CONFIG: SimulationConfig;

/**
 * Sentinel Grid - Seeded Random Number Generator
 * Implements a Mulberry32 PRNG for deterministic, reproducible simulations
 */
declare class SeededRandom {
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
declare function getSeededRandom(seed?: number): SeededRandom;
declare function setGlobalSeed(seed: number): void;

/**
 * Sentinel Grid - Simulation Engine
 * Deterministic infrastructure simulation with weather, threats, and cascades
 */

declare const CRITICAL_THRESHOLD = 0.8;
declare const WARNING_THRESHOLD = 0.6;
declare function initializeNodes(config?: Partial<SimulationConfig>): Record<string, Node>;
declare function fetchWeatherData(rng?: SeededRandom): WeatherData;
declare function updateNodeState(nodes: Record<string, Node>, threat: Threat | null, weather: WeatherData, config?: Partial<SimulationConfig>): Record<string, Node>;
declare function simulateCascade(nodes: Record<string, Node>, originId: string, severity?: number, config?: Partial<SimulationConfig>): {
    nodes: Record<string, Node>;
    event: CascadeEvent;
};
interface MitigationResult {
    success: boolean;
    node: string;
    updatedNode: Node;
    actions: string[];
    riskReduction: number;
}
declare function autoMitigate(nodes: Record<string, Node>, nodeId: string, config?: Partial<SimulationConfig>): MitigationResult;
declare function getSystemState(nodes: Record<string, Node>): SystemState;
declare function createAuditHash(data: Record<string, unknown>): string;
declare function createSignedHash(data: Record<string, unknown>, hmacKey: string): {
    sha256: string;
    signature: string;
};

/**
 * Sentinel Grid - Predictive Engine
 * Physics-informed heuristics + moving-average + event rules for credible predictions
 * Designed to be swappable with a Python ML model via REST microservice
 */

interface PredictiveConfig {
    seed: number;
    historyWindowSize: number;
    predictionHorizonHours: number;
    minConfidenceThreshold: number;
    patternDetectionWindow: number;
}
declare class PredictiveEngine {
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

/**
 * Sentinel Grid - Alert Manager
 * Handles alert configuration, triggering, and notifications
 */

declare class AlertManager {
    private configs;
    private alerts;
    private cooldowns;
    private rng;
    constructor(seed?: number);
    /**
     * Load configurations (from storage or defaults)
     */
    loadConfigurations(): Promise<void>;
    /**
     * Get all configurations
     */
    getConfigurations(): AlertConfig[];
    /**
     * Get a specific configuration
     */
    getConfiguration(id: string): AlertConfig | undefined;
    /**
     * Add or update a configuration
     */
    setConfiguration(config: AlertConfig): void;
    /**
     * Remove a configuration
     */
    removeConfiguration(id: string): boolean;
    /**
     * Enable/disable a configuration
     */
    toggleConfiguration(id: string, enabled: boolean): boolean;
    /**
     * Check predictions against alert configurations
     */
    checkPredictionsForAlerts(predictions: Prediction[]): Promise<Alert[]>;
    /**
     * Check system state against alert configurations
     */
    checkSystemStateForAlerts(state: SystemState, nodes: Record<string, Node>): Promise<Alert[]>;
    /**
     * Get all alerts
     */
    getAlerts(status?: AlertStatus): Alert[];
    /**
     * Get alert by ID
     */
    getAlert(id: string): Alert | undefined;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(id: string, acknowledgedBy?: string): boolean;
    /**
     * Resolve an alert
     */
    resolveAlert(id: string): boolean;
    /**
     * Clear old/resolved alerts
     */
    clearOldAlerts(maxAgeHours?: number): number;
    private evaluateConditions;
    private evaluateSystemConditions;
    private evaluateNodeConditions;
    private getPredictionMetricValue;
    private getSystemMetricValue;
    private getNodeMetricValue;
    private compareValues;
    private createAlertFromPrediction;
    private createAlertFromSystemState;
    private createAlertFromNode;
    private executeActions;
}

declare const VERSION = "1.0.0";

declare function createDemoSimulation(seed?: number): {
    nodes: Record<string, Node>;
    predictiveEngine: PredictiveEngine;
    alertManager: AlertManager;
    tick: (threat?: any) => {
        nodes: Record<string, Node>;
        state: SystemState;
        weather: WeatherData;
    };
    predict: () => {
        patterns: Pattern[];
        predictions: Prediction[];
    };
    getState: () => SystemState;
};

export { type AccuracyMetrics, type Alert, type AlertAction, type AlertCondition, type AlertConfig, AlertManager, AlertManager as AlertManagerClass, type AlertSeverity, type AlertStatus, type AlertType, type AuditEntry, type AuditEventType, CRITICAL_THRESHOLD, type CascadeEvent, type CascadePath, type ContributingFactor, DEFAULT_CONFIG, type MitigationResult, type Node, type NodeMetricsHistory, type NodeStatus, type NodeType, type Pattern, type PatternType, type Prediction, type PredictionSeverity, type PredictionStatus, type PredictionType, PredictiveEngine, PredictiveEngine as PredictiveEngineClass, SeededRandom, type SimulationConfig, type SuggestedAction, type SystemState, type Threat, type ThreatType, type TypeAccuracy, VERSION, WARNING_THRESHOLD, type WeatherCondition, type WeatherData, autoMitigate, createAuditHash, createDemoSimulation, createSignedHash, fetchWeatherData, getSeededRandom, getSystemState, initializeNodes, setGlobalSeed, simulateCascade, updateNodeState };
