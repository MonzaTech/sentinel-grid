// ============================================================================
// Node Types
// ============================================================================

export type NodeType =
  | 'substation'
  | 'transformer'
  | 'generator'
  | 'datacenter'
  | 'telecom_tower'
  | 'water_treatment'
  | 'control_center';

export type NodeStatus = 'healthy' | 'warning' | 'critical' | 'failed' | 'offline';

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  region: string;
  coordinates: { x: number; y: number };
  riskScore: number;
  health: number;
  loadRatio: number;
  temperature: number;
  status: NodeStatus;
  connections: string[];
  lastUpdate: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Prediction Types
// ============================================================================

export type PredictionType =
  | 'cascade_failure'
  | 'thermal_overload'
  | 'equipment_degradation'
  | 'cyber_intrusion'
  | 'load_imbalance';

export interface SuggestedAction {
  action: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  estimatedImpact: number;
}

export interface PredictionReasoning {
  rootCause: string;
  leadingSignals: string[];
  historicalPattern: string;
  riskShift: string;
  confidenceDriver: string;
  recommendedMitigation: string;
}

export interface Prediction {
  id: string;
  nodeId: string;
  nodeName: string;
  type: PredictionType;
  probability: number;
  hoursToEvent: number;
  confidence: number;
  reasoning: string | PredictionReasoning;
  contributingFactors: string[];
  suggestedActions: SuggestedAction[];
  createdAt: string;
  resolved?: boolean;
  resolvedAt?: string;
  outcome?: 'true_positive' | 'false_positive' | 'prevented';
}

// ============================================================================
// Pattern Types
// ============================================================================

export type PatternType =
  | 'correlated_degradation'
  | 'load_imbalance'
  | 'thermal_cluster'
  | 'cascading_risk'
  | 'geographic_stress';

export interface Pattern {
  id: string;
  type: PatternType;
  severity: number;
  affectedNodes: string[];
  description: string;
  detectedAt: string;
  confidence: number;
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  nodeId?: string;
  nodeIds: string[];
  predictionId?: string;
  timestamp: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  source?: 'ai' | 'manual' | 'external';
  incidentId?: string;
}

// ============================================================================
// System Types
// ============================================================================

export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'extreme_heat'
  | 'extreme_cold';

export interface WeatherData {
  condition: WeatherCondition;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  stressMultiplier: number;
}

export interface SystemState {
  totalNodes: number;
  healthyNodes: number;
  warningNodes: number;
  criticalNodes: number;
  failedNodes: number;
  averageRiskScore: number;
  averageHealth: number;
  averageLoad: number;
  timestamp: string;
}

export interface AccuracyMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalPredictions: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

// ============================================================================
// Simulation Types
// ============================================================================

export type ThreatType =
  | 'cyber_attack'
  | 'physical_intrusion'
  | 'equipment_failure'
  | 'overload'
  | 'weather_stress'
  | 'cascade_origin';

export interface Threat {
  type: ThreatType;
  severity: number;
  target?: string;
  startedAt?: string;
}

export interface CascadeEvent {
  id: string;
  originNode: string;
  severity: number;
  affectedNodes: string[];
  propagationPath: Array<{
    from: string;
    to: string;
    riskTransfer: number;
    timestamp: string;
  }>;
  impactScore: number;
  totalDamage?: number;
  mitigated: boolean;
  startedAt: string;
  endedAt?: string;
  // Aliases for compatibility
  startTime: string;
  endTime?: string;
}

export interface MitigationResult {
  success: boolean;
  nodeId: string;
  actions: string[];
  riskReduction: number;
  message: string;
  newRiskScore?: number;
  newHealth?: number;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WSMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

export interface TickData {
  systemState: SystemState;
  weather: WeatherData;
  isRunning: boolean;
  tickCount: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  count: number;
  total?: number;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Wallet Types
// ============================================================================

export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
}

// ============================================================================
// Incident Types
// ============================================================================

export type IncidentStatus = 'open' | 'mitigated' | 'closed';
export type SeverityLevel = 'low' | 'medium' | 'high';

export interface MitigationAction {
  at: string;
  actionType: string;
  details: string;
}

export interface OnChainAnchor {
  anchored: boolean;
  chain?: 'optimism' | 'base';
  txHash?: string;
  payloadHash?: string;
  ipfsCid?: string;
}

export interface Incident {
  id: string;
  startedAt: string;
  endedAt?: string;
  scenarioTemplateId?: string;
  severity: SeverityLevel;
  affectedNodes: string[];
  summary: string;
  rootCause: string;
  mitigationActions: MitigationAction[];
  status: IncidentStatus;
  cascadeEventId?: string;
  onChain: OnChainAnchor | null;
}

// ============================================================================
// Scenario Types
// ============================================================================

export type ScenarioType = 'storm' | 'line_outage' | 'generator_loss' | 'cascade_stress';

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  defaultSeverity: SeverityLevel;
  defaultHorizonHours: number;
  targetRegions: string[];
}

// ============================================================================
// Log Types
// ============================================================================

export type LogSource = 'system' | 'operator' | 'simulation';
export type LogCategory = 'prediction' | 'alert' | 'incident' | 'mitigation' | 'config' | 'scenario' | 'anchor';

export interface LogEntry {
  id: string;
  timestamp: string;
  user?: string;
  source: LogSource;
  category: LogCategory;
  message: string;
  metadata?: Record<string, unknown>;
}
