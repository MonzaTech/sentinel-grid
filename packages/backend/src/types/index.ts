/**
 * Sentinel Grid Backend - Type Definitions
 * Scenarios, Incidents, Logs, Topology
 */

// ============================================================================
// Scenario Types
// ============================================================================

export type ScenarioType = 'storm' | 'line_outage' | 'generator_loss' | 'cascade_stress';
export type SeverityLevel = 'low' | 'medium' | 'high';

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  defaultSeverity: SeverityLevel;
  defaultHorizonHours: number;
  targetRegions: string[];
}

export interface RunScenarioRequest {
  templateId: string;
  severity?: SeverityLevel;
  horizonHours?: number;
}

// ============================================================================
// Incident Types
// ============================================================================

export type IncidentStatus = 'open' | 'mitigated' | 'closed';

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

// ============================================================================
// Prediction Reasoning Types
// ============================================================================

export interface PredictionReasoning {
  rootCause: string;
  leadingSignals: string[];
  historicalPattern: string;
  riskShift: string;
  confidenceDriver: string;
  recommendedMitigation: string;
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
}

export interface TopologyEdge {
  from: string;
  to: string;
  capacity: number;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  importedAt?: string;
}
