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

export interface Prediction {
  id: string;
  nodeId: string;
  nodeName: string;
  type: PredictionType;
  probability: number;
  hoursToEvent: number;
  confidence: number;
  reasoning: string;
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
