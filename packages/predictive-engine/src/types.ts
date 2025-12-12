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
  category?: NodeCategory;  // Optional for backward compatibility
  region: string;
  coordinates: { x: number; y: number };
  
  // Physical Metrics
  riskScore: number;      // 0-1, higher = more risk
  health: number;         // 0-1, higher = healthier
  loadRatio: number;      // 0-1, current load / capacity
  temperature: number;    // Celsius
  powerDraw: number;      // MW
  voltage?: number;        // kV (for electrical nodes)
  frequency?: number;      // Hz (for electrical nodes)
  
  // Cyber Metrics (all optional for backward compatibility)
  cyberHealth?: number;    // 0-1, cyber security health
  packetLoss?: number;     // 0-1, network packet loss ratio
  latency?: number;        // ms, communication latency
  tamperSignal?: number;   // 0-1, detected tampering probability
  lastAuthTime?: Date;     // Last authentication timestamp
  failedAuthCount?: number; // Recent failed auth attempts
  
  // Status
  status: NodeStatus;
  cyberStatus?: CyberStatus;
  lastSeen: Date;
  connections: string[];  // Connected node IDs
  dependencies?: string[]; // Nodes this one depends on
  dependents?: string[];   // Nodes that depend on this one
  
  // Capacity & Rating (optional)
  ratedCapacity?: number;  // MW or equivalent
  currentLoad?: number;    // MW or equivalent
  thermalLimit?: number;   // Max safe temperature
  
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
  | 'control_center'
  | 'solar_farm'
  | 'wind_turbine'
  | 'battery_storage'
  | 'scada_server'
  | 'relay_switch';

export type NodeCategory = 
  | 'generation'      // Power generation assets
  | 'transmission'    // High-voltage transmission
  | 'distribution'    // Distribution network
  | 'datacenter'      // Computing infrastructure
  | 'telecom'         // Communication infrastructure
  | 'control'         // SCADA/control systems
  | 'storage';        // Energy storage

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

// ============================================================================
// Dependency Graph
// ============================================================================

export interface DependencyEdge {
  from: string;
  to: string;
  type: DependencyType;
  weight: number;        // 0-1, importance of connection
  latency: number;       // ms, communication delay
  bandwidth: number;     // Mbps
  isActive: boolean;
}

export type DependencyType = 
  | 'power'           // Electrical power flow
  | 'data'            // Data/communication
  | 'control'         // Control signal dependency
  | 'backup'          // Backup/redundancy
  | 'thermal';        // Cooling/thermal dependency

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
  solarIrradiance?: number;  // W/m² (optional)
  lightningRisk?: number;    // 0-1 (optional)
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
  subtype?: ThreatSubtype;
  severity: number;       // 0-1
  target: string | null;  // Node ID or null for regional
  region?: string;
  active: boolean;
  until: Date;
  duration?: number;      // seconds
  propagationRate?: number; // How fast it spreads (optional)
  affectedNodes?: string[]; // (optional)
  metadata?: Record<string, unknown>;
}

export type ThreatType = 
  | 'cyber_attack'
  | 'physical_intrusion'
  | 'equipment_failure'
  | 'overload'
  | 'weather_stress'
  | 'cascade_origin'
  | 'sensor_spoofing'
  | 'telecom_outage'
  | 'supply_chain';

export type ThreatSubtype =
  | 'ransomware'
  | 'dos_attack'
  | 'command_injection'
  | 'credential_theft'
  | 'man_in_middle'
  | 'false_data_injection'
  | 'gps_spoofing'
  | 'firmware_attack'
  | 'voltage_manipulation'
  | 'frequency_deviation';

// ============================================================================
// Risk Scoring Model
// ============================================================================

export interface RiskScore {
  overall: number;           // 0-1, combined risk
  probability: number;       // 0-1, likelihood of event
  severity: number;          // 0-1, impact if event occurs
  timeToFailure: number;     // Hours until predicted failure
  confidenceInterval: [number, number]; // 95% CI
  trend: 'increasing' | 'stable' | 'decreasing';
  
  components: {
    physical: number;        // Physical equipment risk
    cyber: number;           // Cyber security risk
    operational: number;     // Operational/load risk
    environmental: number;   // Weather/external risk
    cascading: number;       // Risk from connected nodes
  };
  
  leadingFactors: LeadingFactor[];
}

export interface LeadingFactor {
  name: string;
  contribution: number;     // 0-1, how much it contributes to risk
  value: number;            // Current value
  threshold: number;        // Danger threshold
  trend: 'increasing' | 'stable' | 'decreasing';
  explanation: string;
}

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
  
  // Risk model (optional for backward compatibility)
  riskScore?: RiskScore;
  
  // Explainability
  reasoning: string;
  structuredReasoning?: StructuredReasoning;  // Optional
  contributingFactors: ContributingFactor[];
  suggestedActions: SuggestedAction[];
  cascadePath?: string[];  // Predicted cascade path
  
  // Tracking
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

export type PredictionType = 
  | 'cascade_failure'
  | 'equipment_failure'
  | 'overload'
  | 'thermal_stress'
  | 'cyber_vulnerability'
  | 'weather_impact'
  | 'capacity_breach'
  | 'communication_loss'
  | 'voltage_instability'
  | 'frequency_deviation';

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
  actionType?: MitigationActionType;  // Optional for backward compatibility
}

export type MitigationActionType = 
  | 'isolate'
  | 'load_shed'
  | 'reroute'
  | 'activate_backup'
  | 'dispatch_maintenance'
  | 'enable_cooling'
  | 'cyber_lockdown'
  | 'manual_override';

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
  cascadeType?: CascadeType;  // Optional for backward compatibility
  mitigated?: boolean;        // Optional for backward compatibility
  severity?: number;          // Optional for backward compatibility
}

export type CascadeType = 
  | 'electrical'
  | 'communication'
  | 'thermal'
  | 'cyber'
  | 'mixed';

export interface CascadePath {
  from: string;
  to: string;
  timestamp: Date;
  riskTransfer: number;
}

// ============================================================================
// Mitigation Recommendations
// ============================================================================

export interface MitigationRecommendation {
  id: string;
  nodeId: string;
  predictionId?: string;
  incidentId?: string;
  actionType: MitigationActionType;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  description: string;
  expectedRiskReduction: number;
  estimatedTime: number;     // Minutes to implement
  requiresApproval: boolean;
  automatable: boolean;
  dependencies: string[];    // Other actions that should happen first
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
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
  
  // Extended metrics (all optional for backward compatibility)
  cyberHealth?: number;
  avgLatency?: number;
  isolatedNodes?: number;
  activeThreats?: number;
  pendingMitigations?: number;
  systemLoad?: number;       // Overall grid load
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
  avgLeadTime: number;    // Hours before event
  byType: Record<PredictionType, TypeAccuracy>;
  
  // Rolling metrics (optional for backward compatibility)
  rolling7Day?: {
    accuracy: number;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    trueNegatives: number;
  };
  
  // Time-series (optional)
  dailyAccuracy?: Array<{ date: string; accuracy: number; count: number }>;
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
  | 'maintenance_required'
  | 'cyber_alert'
  | 'communication_loss';

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
  | 'prediction_resolved'
  | 'auto_mitigation'
  | 'manual_mitigation'
  | 'threat_deployment'
  | 'cascade_event'
  | 'proactive_action_executed'
  | 'alert_triggered'
  | 'config_changed'
  | 'operator_action'
  | 'scenario_triggered'
  | 'incident_created'
  | 'incident_closed'
  | 'anchor_created';

// ============================================================================
// Demo & Storyline
// ============================================================================

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

// ============================================================================
// Reporting
// ============================================================================

export interface IncidentReport {
  id: string;
  period: { start: Date; end: Date };
  totalIncidents: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  avgResolutionTime: number;  // Minutes
  topAffectedNodes: Array<{ nodeId: string; count: number }>;
  mitigationsSummary: {
    total: number;
    automated: number;
    manual: number;
    successRate: number;
  };
}

export interface OperatorLogReport {
  id: string;
  period: { start: Date; end: Date };
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
  
  // Cyber simulation
  cyberAttackProbability: number;
  networkLatencyBase: number;
  packetLossBase: number;
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
  cyberAttackProbability: 0.01,
  networkLatencyBase: 50,
  packetLossBase: 0.01,
};
