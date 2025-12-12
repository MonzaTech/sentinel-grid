/**
 * Sentinel Grid Backend - Type Definitions
 * Extended for Digital Twin, Risk Scoring, Threats, Mitigation, Reporting
 */

// ============================================================================
// Scenario Types
// ============================================================================

export type ScenarioType = 'storm' | 'line_outage' | 'generator_loss' | 'cascade_stress' | 'cyber_attack' | 'telecom_outage' | 'sensor_spoof';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  defaultSeverity: SeverityLevel;
  defaultHorizonHours: number;
  targetRegions: string[];
  category?: 'physical' | 'cyber' | 'environmental';
}

export interface RunScenarioRequest {
  templateId: string;
  severity?: SeverityLevel;
  horizonHours?: number;
}

// ============================================================================
// Node & Digital Twin Types
// ============================================================================

export type NodeCategory = 'generation' | 'transmission' | 'distribution' | 'datacenter' | 'telecom' | 'control' | 'storage';
export type NodeType = 'substation' | 'transformer' | 'generator' | 'datacenter' | 'telecom_tower' | 'water_pump' | 'control_center' | 'solar_farm' | 'wind_turbine' | 'battery_storage' | 'scada_server' | 'relay_switch';
export type NodeStatus = 'online' | 'degraded' | 'critical' | 'offline' | 'isolated';
export type CyberStatus = 'secure' | 'warning' | 'compromised' | 'isolated';

export interface DigitalTwinNode {
  id: string;
  name: string;
  type: NodeType;
  category: NodeCategory;
  region: string;
  coordinates: { x: number; y: number };
  
  // Physical Metrics
  riskScore: number;
  health: number;
  loadRatio: number;
  temperature: number;
  powerDraw: number;
  voltage: number;
  frequency: number;
  
  // Cyber Metrics
  cyberHealth: number;
  packetLoss: number;
  latency: number;
  tamperSignal: number;
  lastAuthTime: string;
  failedAuthCount: number;
  
  // Status
  status: NodeStatus;
  cyberStatus: CyberStatus;
  lastSeen: string;
  
  // Topology
  connections: string[];
  dependencies: string[];
  dependents: string[];
  
  // Capacity
  ratedCapacity: number;
  currentLoad: number;
  thermalLimit: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'power' | 'data' | 'control' | 'backup' | 'thermal';
  weight: number;
  latency: number;
  bandwidth: number;
  isActive: boolean;
}

// ============================================================================
// Risk Scoring Types
// ============================================================================

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

// ============================================================================
// Incident Types
// ============================================================================

export type IncidentStatus = 'open' | 'mitigated' | 'closed';

export interface MitigationAction {
  at: string;
  actionType: string;
  details: string;
  automated: boolean;
  operator?: string;
  riskReduction?: number;
}

export interface OnChainAnchor {
  anchored: boolean;
  chain?: 'optimism' | 'base';
  txHash?: string;
  payloadHash?: string;
  ipfsCid?: string;
  timestamp?: string;
  blockNumber?: number;
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
  threatType?: ThreatType;
  economicImpact?: number;
  customersAffected?: number;
}

// ============================================================================
// Threat Types
// ============================================================================

export type ThreatType = 'cyber_attack' | 'physical_intrusion' | 'equipment_failure' | 'overload' | 'weather_stress' | 'cascade_origin' | 'sensor_spoofing' | 'telecom_outage' | 'supply_chain';
export type ThreatSubtype = 'ransomware' | 'dos_attack' | 'command_injection' | 'credential_theft' | 'man_in_middle' | 'false_data_injection' | 'gps_spoofing' | 'firmware_attack' | 'voltage_manipulation' | 'frequency_deviation';

export interface ThreatSimulation {
  id: string;
  type: ThreatType;
  subtype?: ThreatSubtype;
  severity: number;
  target: string | null;
  region?: string;
  active: boolean;
  startedAt: string;
  endsAt: string;
  propagationRate: number;
  affectedNodes: string[];
  metadata?: Record<string, unknown>;
}

export interface ThreatRequest {
  type: ThreatType;
  subtype?: ThreatSubtype;
  severity?: number;
  target?: string;
  region?: string;
  durationSeconds?: number;
}

// ============================================================================
// Mitigation Types
// ============================================================================

export type MitigationActionType = 'isolate' | 'load_shed' | 'reroute' | 'activate_backup' | 'dispatch_maintenance' | 'enable_cooling' | 'cyber_lockdown' | 'manual_override';

export interface MitigationRecommendation {
  id: string;
  nodeId: string;
  predictionId?: string;
  incidentId?: string;
  actionType: MitigationActionType;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  description: string;
  expectedRiskReduction: number;
  estimatedTimeMinutes: number;
  requiresApproval: boolean;
  automatable: boolean;
  dependencies: string[];
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed';
  createdAt: string;
}

// ============================================================================
// Log Types
// ============================================================================

export type LogSource = 'system' | 'operator' | 'simulation' | 'audit';
export type LogCategory = 'prediction' | 'alert' | 'incident' | 'mitigation' | 'config' | 'scenario' | 'anchor' | 'threat' | 'demo' | 'api' | 'health';

export interface LogEntry {
  id: string;
  timestamp: string;
  user?: string;
  source: LogSource;
  category: LogCategory;
  message: string;
  metadata?: Record<string, unknown>;
  severity?: SeverityLevel;
}

// ============================================================================
// Prediction Types
// ============================================================================

export interface PredictionReasoning {
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

export interface EnhancedPrediction {
  id: string;
  nodeId: string;
  nodeName: string;
  type: string;
  probability: number;
  confidence: number;
  hoursToEvent: number;
  predictedTime: string;
  severity: SeverityLevel;
  riskScore: RiskScore;
  reasoning: string;
  structuredReasoning: PredictionReasoning;
  contributingFactors: ContributingFactor[];
  suggestedActions: SuggestedAction[];
  cascadePath?: string[];
  status: 'active' | 'mitigated' | 'expired' | 'occurred';
  createdAt: string;
  resolvedAt?: string;
  wasAccurate?: boolean;
  actualOutcome?: string;
}

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

// ============================================================================
// Topology Types
// ============================================================================

export interface TopologyNode {
  id: string;
  name: string;
  region: string;
  voltage?: string;
  type: string;
  category?: NodeCategory;
}

export interface TopologyEdge {
  from: string;
  to: string;
  capacity: number;
  type?: 'power' | 'data' | 'control';
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  importedAt?: string;
}

// ============================================================================
// Demo Types
// ============================================================================

export interface DemoStep {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  action: {
    type: 'normal' | 'anomaly' | 'prediction' | 'cascade' | 'mitigation' | 'recovery';
    params: Record<string, unknown>;
  };
  expectedOutcome: string;
}

export interface DemoSequence {
  id: string;
  name: string;
  description: string;
  steps: DemoStep[];
  totalDurationMs: number;
}

export interface DemoState {
  isRunning: boolean;
  currentStepIndex: number;
  startedAt?: string;
  sequence?: DemoSequence;
}

// ============================================================================
// Reporting Types
// ============================================================================

export interface IncidentReport {
  id: string;
  period: { start: string; end: string };
  totalIncidents: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  avgResolutionTimeMinutes: number;
  topAffectedNodes: Array<{ nodeId: string; count: number }>;
  mitigationsSummary: {
    total: number;
    automated: number;
    manual: number;
    successRate: number;
  };
}

export interface AccuracyReport {
  id: string;
  period: { start: string; end: string };
  totalPredictions: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgLeadTimeHours: number;
  byType: Record<string, {
    total: number;
    accurate: number;
    accuracy: number;
  }>;
  rolling7Day: {
    accuracy: number;
    predictions: number;
  };
  dailyAccuracy: Array<{ date: string; accuracy: number; count: number }>;
}

export interface OperatorLogReport {
  id: string;
  period: { start: string; end: string };
  totalActions: number;
  byCategory: Record<string, number>;
  byOperator: Record<string, number>;
  timeline: Array<{
    timestamp: string;
    action: string;
    operator?: string;
    details: string;
  }>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  version: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  version: string;
  components: {
    simulation: 'up' | 'down';
    websocket: 'up' | 'down';
    storage: 'up' | 'down';
  };
  metrics: {
    activeConnections: number;
    nodesCount: number;
    predictionsCount: number;
    incidentsOpen: number;
    memoryUsageMB: number;
  };
}

export interface SystemMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  uptime: number;
  requestsPerMinute: number;
  avgResponseTimeMs: number;
  activeWebsockets: number;
  simulationTicksPerMinute: number;
}
