/**
 * Sentinel Grid - Predictive Engine Types
 * Core interfaces for infrastructure monitoring and prediction
 */
export interface Node {
    id: string;
    name: string;
    type: NodeType;
    category?: NodeCategory;
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
    voltage?: number;
    frequency?: number;
    cyberHealth?: number;
    packetLoss?: number;
    latency?: number;
    tamperSignal?: number;
    lastAuthTime?: Date;
    failedAuthCount?: number;
    status: NodeStatus;
    cyberStatus?: CyberStatus;
    lastSeen: Date;
    connections: string[];
    dependencies?: string[];
    dependents?: string[];
    ratedCapacity?: number;
    currentLoad?: number;
    thermalLimit?: number;
    metrics?: NodeMetricsHistory;
}
export type NodeType = 'substation' | 'transformer' | 'generator' | 'datacenter' | 'telecom_tower' | 'water_pump' | 'control_center' | 'solar_farm' | 'wind_turbine' | 'battery_storage' | 'scada_server' | 'relay_switch';
export type NodeCategory = 'generation' | 'transmission' | 'distribution' | 'datacenter' | 'telecom' | 'control' | 'storage';
export type NodeStatus = 'online' | 'degraded' | 'critical' | 'offline' | 'isolated';
export type CyberStatus = 'secure' | 'warning' | 'compromised' | 'isolated';
export interface NodeMetricsHistory {
    timestamps: Date[];
    riskScores: number[];
    healthScores: number[];
    loadRatios: number[];
    temperatures: number[];
    cyberHealthScores?: number[];
    latencies?: number[];
}
export interface DependencyEdge {
    from: string;
    to: string;
    type: DependencyType;
    weight: number;
    latency: number;
    bandwidth: number;
    isActive: boolean;
}
export type DependencyType = 'power' | 'data' | 'control' | 'backup' | 'thermal';
export interface WeatherData {
    temperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    stormProbability: number;
    heatIndex: number;
    condition: WeatherCondition;
    solarIrradiance?: number;
    lightningRisk?: number;
}
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'storm' | 'extreme_heat' | 'extreme_cold';
export interface Threat {
    id: string;
    type: ThreatType;
    subtype?: ThreatSubtype;
    severity: number;
    target: string | null;
    region?: string;
    active: boolean;
    until: Date;
    duration?: number;
    propagationRate?: number;
    affectedNodes?: string[];
    metadata?: Record<string, unknown>;
}
export type ThreatType = 'cyber_attack' | 'physical_intrusion' | 'equipment_failure' | 'overload' | 'weather_stress' | 'cascade_origin' | 'sensor_spoofing' | 'telecom_outage' | 'supply_chain';
export type ThreatSubtype = 'ransomware' | 'dos_attack' | 'command_injection' | 'credential_theft' | 'man_in_middle' | 'false_data_injection' | 'gps_spoofing' | 'firmware_attack' | 'voltage_manipulation' | 'frequency_deviation';
export interface RiskScore {
    overall: number;
    probability: number;
    severity: number;
    timeToFailure: number;
    confidenceInterval: [number, number];
    trend: 'increasing' | 'stable' | 'decreasing';
    components: {
        physical: number;
        cyber: number;
        operational: number;
        environmental: number;
        cascading: number;
    };
    leadingFactors: LeadingFactor[];
}
export interface LeadingFactor {
    name: string;
    contribution: number;
    value: number;
    threshold: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    explanation: string;
}
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
    riskScore?: RiskScore;
    reasoning: string;
    structuredReasoning?: StructuredReasoning;
    contributingFactors: ContributingFactor[];
    suggestedActions: SuggestedAction[];
    cascadePath?: string[];
    createdAt: Date;
    status: PredictionStatus;
    resolvedAt?: Date;
    wasAccurate?: boolean;
    actualOutcome?: string;
}
export interface StructuredReasoning {
    rootCause: string;
    leadingSignals: string[];
    historicalPattern: string;
    riskShift: string;
    confidenceDriver: string;
    recommendedMitigation: string;
    patternMatch?: {
        patternId: string;
        similarity: number;
        historicalOutcome: string;
    };
}
export type PredictionType = 'cascade_failure' | 'equipment_failure' | 'overload' | 'thermal_stress' | 'cyber_vulnerability' | 'weather_impact' | 'capacity_breach' | 'communication_loss' | 'voltage_instability' | 'frequency_deviation';
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
    actionType?: MitigationActionType;
}
export type MitigationActionType = 'isolate' | 'load_shed' | 'reroute' | 'activate_backup' | 'dispatch_maintenance' | 'enable_cooling' | 'cyber_lockdown' | 'manual_override';
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
    cascadeType?: CascadeType;
    mitigated?: boolean;
    severity?: number;
}
export type CascadeType = 'electrical' | 'communication' | 'thermal' | 'cyber' | 'mixed';
export interface CascadePath {
    from: string;
    to: string;
    timestamp: Date;
    riskTransfer: number;
}
export interface MitigationRecommendation {
    id: string;
    nodeId: string;
    predictionId?: string;
    incidentId?: string;
    actionType: MitigationActionType;
    priority: 'immediate' | 'high' | 'medium' | 'low';
    description: string;
    expectedRiskReduction: number;
    estimatedTime: number;
    requiresApproval: boolean;
    automatable: boolean;
    dependencies: string[];
    status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed';
    createdAt: Date;
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
    cyberHealth?: number;
    avgLatency?: number;
    isolatedNodes?: number;
    activeThreats?: number;
    pendingMitigations?: number;
    systemLoad?: number;
    generationCapacity?: number;
    demandForecast?: number;
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
    rolling7Day?: {
        accuracy: number;
        truePositives: number;
        falsePositives: number;
        falseNegatives: number;
        trueNegatives: number;
    };
    dailyAccuracy?: Array<{
        date: string;
        accuracy: number;
        count: number;
    }>;
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
export type AlertType = 'prediction_triggered' | 'threshold_breach' | 'cascade_detected' | 'system_degradation' | 'maintenance_required' | 'cyber_alert' | 'communication_loss';
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
export type AuditEventType = 'system_start' | 'system_stop' | 'prediction_generated' | 'prediction_resolved' | 'auto_mitigation' | 'manual_mitigation' | 'threat_deployment' | 'cascade_event' | 'proactive_action_executed' | 'alert_triggered' | 'config_changed' | 'operator_action' | 'scenario_triggered' | 'incident_created' | 'incident_closed' | 'anchor_created';
export interface DemoStep {
    id: string;
    name: string;
    description: string;
    durationMs: number;
    action: DemoAction;
    expectedOutcome: string;
}
export interface DemoAction {
    type: 'normal' | 'anomaly' | 'prediction' | 'cascade' | 'mitigation' | 'recovery';
    params: Record<string, unknown>;
}
export interface DemoSequence {
    id: string;
    name: string;
    description: string;
    steps: DemoStep[];
    totalDurationMs: number;
}
export interface IncidentReport {
    id: string;
    period: {
        start: Date;
        end: Date;
    };
    totalIncidents: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    avgResolutionTime: number;
    topAffectedNodes: Array<{
        nodeId: string;
        count: number;
    }>;
    mitigationsSummary: {
        total: number;
        automated: number;
        manual: number;
        successRate: number;
    };
}
export interface OperatorLogReport {
    id: string;
    period: {
        start: Date;
        end: Date;
    };
    totalActions: number;
    byCategory: Record<string, number>;
    byOperator: Record<string, number>;
    timeline: Array<{
        timestamp: Date;
        action: string;
        operator?: string;
        details: string;
    }>;
}
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
    cyberAttackProbability: number;
    networkLatencyBase: number;
    packetLossBase: number;
}
export declare const DEFAULT_CONFIG: SimulationConfig;
//# sourceMappingURL=types.d.ts.map