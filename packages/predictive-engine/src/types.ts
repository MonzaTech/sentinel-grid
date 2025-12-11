/**
 * Sentinel Grid - Predictive Engine Types
 * Core interfaces for infrastructure monitoring and prediction
 */

// ============================================================================
// Node & Infrastructure Types
// ============================================================================

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  region: string;
  coordinates: { x: number; y: number };
  
  // Metrics
  riskScore: number;      // 0-1, higher = more risk
  health: number;         // 0-1, higher = healthier
  loadRatio: number;      // 0-1, current load / capacity
  temperature: number;    // Celsius
  powerDraw: number;      // MW
  
  // Status
  status: NodeStatus;
  lastSeen: Date;
  connections: string[];  // Connected node IDs
  
  // Historical for predictions
  metrics?: NodeMetricsHistory;
}

export type NodeType = 
  | 'substation'
  | 'transformer'
  | 'generator'
  | 'datacenter'
  | 'telecom_tower'
  | 'water_pump'
  | 'control_center';

export type NodeStatus = 'online' | 'degraded' | 'critical' | 'offline';

export interface NodeMetricsHistory {
  timestamps: Date[];
  riskScores: number[];
  healthScores: number[];
  loadRatios: number[];
  temperatures: number[];
}

// ============================================================================
// Environment & Threats
// ============================================================================

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  stormProbability: number;
  heatIndex: number;
  condition: WeatherCondition;
}

export type WeatherCondition = 
  | 'clear'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'extreme_heat'
  | 'extreme_cold';

export interface Threat {
  id: string;
  type: ThreatType;
  severity: number;       // 0-1
  target: string | null;  // Node ID or null for regional
  region?: string;
  active: boolean;
  until: Date;
  duration?: number;      // seconds
}

export type ThreatType = 
  | 'cyber_attack'
  | 'physical_intrusion'
  | 'equipment_failure'
  | 'overload'
  | 'weather_stress'
  | 'cascade_origin';

// ============================================================================
// Predictions & Patterns
// ============================================================================

export interface Prediction {
  id: string;
  nodeId: string;
  nodeName: string;
  type: PredictionType;
  probability: number;    // 0-1
  confidence: number;     // 0-1
  hoursToEvent: number;
  predictedTime: Date;
  severity: PredictionSeverity;
  
  // Explainability
  reasoning: string;
  contributingFactors: ContributingFactor[];
  suggestedActions: SuggestedAction[];
  
  // Tracking
  createdAt: Date;
  status: PredictionStatus;
  resolvedAt?: Date;
  wasAccurate?: boolean;
}

export type PredictionType = 
  | 'cascade_failure'
  | 'equipment_failure'
  | 'overload'
  | 'thermal_stress'
  | 'cyber_vulnerability'
  | 'weather_impact'
  | 'capacity_breach';

export type PredictionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PredictionStatus = 'active' | 'mitigated' | 'expired' | 'occurred';

export interface ContributingFactor {
  factor: string;
  weight: number;         // 0-1
  currentValue: number;
  threshold: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface SuggestedAction {
  action: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  impact: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffect: number;  // Expected risk reduction 0-1
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

export type PatternType = 
  | 'correlated_degradation'
  | 'load_imbalance'
  | 'thermal_cluster'
  | 'cascading_risk'
  | 'periodic_anomaly'
  | 'geographic_stress';

// ============================================================================
// Cascade Events
// ============================================================================

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

// ============================================================================
// System State & Metrics
// ============================================================================

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
  avgLeadTime: number;    // Hours before event
  byType: Record<PredictionType, TypeAccuracy>;
}

export interface TypeAccuracy {
  total: number;
  accurate: number;
  accuracy: number;
}

// ============================================================================
// Alerts & Notifications
// ============================================================================

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

export type AlertType = 
  | 'prediction_triggered'
  | 'threshold_breach'
  | 'cascade_detected'
  | 'system_degradation'
  | 'maintenance_required';

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
  duration?: number;      // How long condition must persist (seconds)
}

export interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'log';
  target: string;
  template?: string;
}

// ============================================================================
// Audit & Logging
// ============================================================================

export interface AuditEntry {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  hash: string;           // SHA-256 for integrity
  actor?: string;
  dataSummary: {
    affectedNodes?: number;
    severity?: string;
    autoMitigated?: boolean;
    [key: string]: unknown;
  };
}

export type AuditEventType = 
  | 'system_start'
  | 'system_stop'
  | 'prediction_generated'
  | 'auto_mitigation'
  | 'manual_mitigation'
  | 'threat_deployment'
  | 'cascade_event'
  | 'proactive_action_executed'
  | 'alert_triggered'
  | 'config_changed';

// ============================================================================
// Simulation Configuration
// ============================================================================

export interface SimulationConfig {
  seed: number;
  nodeCount: number;
  regions: string[];
  tickIntervalMs: number;
  predictionIntervalMs: number;
  
  // Thresholds
  criticalThreshold: number;
  warningThreshold: number;
  
  // Behavior tuning
  baseRiskDrift: number;
  weatherImpactMultiplier: number;
  cascadePropagationRate: number;
  mitigationEffectiveness: number;
}

export const DEFAULT_CONFIG: SimulationConfig = {
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
};
