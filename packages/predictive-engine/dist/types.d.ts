/**
 * Sentinel Grid - Predictive Engine Types
 * Core interfaces for infrastructure monitoring and prediction
 */
export interface Node {
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
export type NodeType = 'substation' | 'transformer' | 'generator' | 'datacenter' | 'telecom_tower' | 'water_pump' | 'control_center';
export type NodeStatus = 'online' | 'degraded' | 'critical' | 'offline';
export interface NodeMetricsHistory {
    timestamps: Date[];
    riskScores: number[];
    healthScores: number[];
    loadRatios: number[];
    temperatures: number[];
}
export interface WeatherData {
    temperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    stormProbability: number;
    heatIndex: number;
    condition: WeatherCondition;
}
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'storm' | 'extreme_heat' | 'extreme_cold';
export interface Threat {
    id: string;
    type: ThreatType;
    severity: number;
    target: string | null;
    region?: string;
    active: boolean;
    until: Date;
    duration?: number;
}
export type ThreatType = 'cyber_attack' | 'physical_intrusion' | 'equipment_failure' | 'overload' | 'weather_stress' | 'cascade_origin';
export interface Prediction {
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
export type PredictionType = 'cascade_failure' | 'equipment_failure' | 'overload' | 'thermal_stress' | 'cyber_vulnerability' | 'weather_impact' | 'capacity_breach';
export type PredictionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PredictionStatus = 'active' | 'mitigated' | 'expired' | 'occurred';
export interface ContributingFactor {
    factor: string;
    weight: number;
    currentValue: number;
    threshold: number;
    trend: 'increasing' | 'stable' | 'decreasing';
}
export interface SuggestedAction {
    action: string;
    priority: 'immediate' | 'high' | 'medium' | 'low';
    impact: 'critical' | 'high' | 'medium' | 'low';
    estimatedEffect: number;
    automated: boolean;
}
export interface Pattern {
    id: string;
    type: PatternType;
    description: string;
    affectedNodes: string[];
    confidence: number;
    detectedAt: Date;
    trend: 'escalating' | 'stable' | 'resolving';
}
export type PatternType = 'correlated_degradation' | 'load_imbalance' | 'thermal_cluster' | 'cascading_risk' | 'periodic_anomaly' | 'geographic_stress';
export interface CascadeEvent {
    id: string;
    originNode: string;
    affectedNodes: string[];
    impactScore: number;
    startTime: Date;
    endTime?: Date;
    propagationPath: CascadePath[];
    totalDamage: number;
}
export interface CascadePath {
    from: string;
    to: string;
    timestamp: Date;
    riskTransfer: number;
}
export interface SystemState {
    maxRisk: number;
    avgHealth: number;
    loadRatio: number;
    criticalNodes: string[];
    warningNodes: string[];
    totalNodes: number;
    onlineNodes: number;
    timestamp: Date;
}
export interface AccuracyMetrics {
    totalPredictions: number;
    accuratePredictions: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    avgLeadTime: number;
    byType: Record<PredictionType, TypeAccuracy>;
}
export interface TypeAccuracy {
    total: number;
    accurate: number;
    accuracy: number;
}
export interface Alert {
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
export type AlertType = 'prediction_triggered' | 'threshold_breach' | 'cascade_detected' | 'system_degradation' | 'maintenance_required';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'expired';
export interface AlertConfig {
    id: string;
    name: string;
    enabled: boolean;
    conditions: AlertCondition[];
    actions: AlertAction[];
    cooldownMinutes: number;
    lastTriggered?: Date;
}
export interface AlertCondition {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    duration?: number;
}
export interface AlertAction {
    type: 'webhook' | 'email' | 'slack' | 'log';
    target: string;
    template?: string;
}
export interface AuditEntry {
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
export type AuditEventType = 'system_start' | 'system_stop' | 'prediction_generated' | 'auto_mitigation' | 'manual_mitigation' | 'threat_deployment' | 'cascade_event' | 'proactive_action_executed' | 'alert_triggered' | 'config_changed';
export interface SimulationConfig {
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
export declare const DEFAULT_CONFIG: SimulationConfig;
//# sourceMappingURL=types.d.ts.map