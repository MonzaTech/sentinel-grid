/**
 * Sentinel Grid Backend - In-Memory Stores
 * Scenarios, Incidents, Logs, Topology
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ScenarioTemplate,
  Incident,
  LogEntry,
  Topology,
  SeverityLevel,
  LogSource,
  LogCategory,
  MitigationAction,
} from '../types/index.js';

// ============================================================================
// Scenario Templates Store
// ============================================================================

const scenarioTemplates: ScenarioTemplate[] = [
  {
    id: 'tpl-storm-severe',
    name: 'Severe Storm Event',
    description: 'Simulates a major storm impacting multiple regions with high wind and lightning risk',
    type: 'storm',
    defaultSeverity: 'high',
    defaultHorizonHours: 6,
    targetRegions: ['North', 'Northeast', 'Central'],
    category: 'environmental',
  },
  {
    id: 'tpl-line-outage',
    name: 'Transmission Line Outage',
    description: 'Critical transmission line failure causing load redistribution',
    type: 'line_outage',
    defaultSeverity: 'medium',
    defaultHorizonHours: 2,
    targetRegions: ['Central', 'South'],
    category: 'physical',
  },
  {
    id: 'tpl-generator-loss',
    name: 'Generator Trip Event',
    description: 'Sudden loss of major generation capacity requiring emergency response',
    type: 'generator_loss',
    defaultSeverity: 'high',
    defaultHorizonHours: 1,
    targetRegions: ['West', 'Central'],
    category: 'physical',
  },
  {
    id: 'tpl-cascade-stress',
    name: 'Cascade Stress Test',
    description: 'Progressive stress test to evaluate cascade failure resilience',
    type: 'cascade_stress',
    defaultSeverity: 'medium',
    defaultHorizonHours: 4,
    targetRegions: ['North', 'South', 'East', 'West'],
    category: 'physical',
  },
  {
    id: 'tpl-cyber-attack',
    name: 'Cyber Intrusion Scenario',
    description: 'Simulates coordinated cyber attack targeting SCADA systems',
    type: 'cyber_attack',
    defaultSeverity: 'high',
    defaultHorizonHours: 2,
    targetRegions: ['Central'],
    category: 'cyber',
  },
  {
    id: 'tpl-telecom-outage',
    name: 'Communication Loss Event',
    description: 'Telecom infrastructure failure isolating control systems',
    type: 'telecom_outage',
    defaultSeverity: 'medium',
    defaultHorizonHours: 3,
    targetRegions: ['East', 'West'],
    category: 'cyber',
  },
  {
    id: 'tpl-sensor-spoof',
    name: 'Sensor Data Injection',
    description: 'False data injection attack on monitoring systems',
    type: 'sensor_spoof',
    defaultSeverity: 'high',
    defaultHorizonHours: 1,
    targetRegions: ['North', 'Central'],
    category: 'cyber',
  },
];

export const scenarioStore = {
  getAll(): ScenarioTemplate[] {
    return [...scenarioTemplates];
  },

  getById(id: string): ScenarioTemplate | undefined {
    return scenarioTemplates.find((t) => t.id === id);
  },
  
  getByCategory(category: 'physical' | 'cyber' | 'environmental'): ScenarioTemplate[] {
    return scenarioTemplates.filter((t) => t.category === category);
  },
};

// ============================================================================
// Incidents Store
// ============================================================================

const incidents: Map<string, Incident> = new Map();

export const incidentStore = {
  getAll(): Incident[] {
    return Array.from(incidents.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  },

  getById(id: string): Incident | undefined {
    return incidents.get(id);
  },
  
  getOpen(): Incident[] {
    return this.getAll().filter((i) => i.status === 'open');
  },
  
  getBySeverity(severity: SeverityLevel): Incident[] {
    return this.getAll().filter((i) => i.severity === severity);
  },

  create(data: Omit<Incident, 'id'>): Incident {
    const incident: Incident = {
      id: `INC-${uuidv4().slice(0, 8).toUpperCase()}`,
      ...data,
    };
    incidents.set(incident.id, incident);
    return incident;
  },

  update(id: string, updates: Partial<Incident>): Incident | undefined {
    const incident = incidents.get(id);
    if (!incident) return undefined;

    const updated = { ...incident, ...updates };
    incidents.set(id, updated);
    return updated;
  },

  addMitigationAction(id: string, action: MitigationAction): Incident | undefined {
    const incident = incidents.get(id);
    if (!incident) return undefined;

    incident.mitigationActions.push(action);
    return incident;
  },

  findByCascadeEventId(cascadeEventId: string): Incident | undefined {
    return Array.from(incidents.values()).find((i) => i.cascadeEventId === cascadeEventId);
  },

  createFromCascade(
    cascadeEventId: string,
    originNode: string,
    affectedNodes: string[],
    severity: number,
    scenarioTemplateId?: string
  ): Incident {
    const severityLevel: SeverityLevel = severity > 0.7 ? 'high' : severity > 0.4 ? 'medium' : 'low';

    const incident: Incident = {
      id: `INC-${uuidv4().slice(0, 8).toUpperCase()}`,
      startedAt: new Date().toISOString(),
      scenarioTemplateId,
      severity: severityLevel,
      affectedNodes,
      summary: `Cascade failure originating from ${originNode} affecting ${affectedNodes.length} nodes`,
      rootCause: `Initial failure detected at ${originNode} with propagation to connected infrastructure`,
      mitigationActions: [],
      status: 'open',
      cascadeEventId,
      onChain: null,
    };

    incidents.set(incident.id, incident);
    return incident;
  },
  
  close(id: string): Incident | undefined {
    const incident = incidents.get(id);
    if (!incident) return undefined;
    
    incident.status = 'closed';
    incident.endedAt = new Date().toISOString();
    return incident;
  },
  
  mitigate(id: string): Incident | undefined {
    const incident = incidents.get(id);
    if (!incident) return undefined;
    
    incident.status = 'mitigated';
    return incident;
  },

  clear(): void {
    incidents.clear();
  },
  
  count(): number {
    return incidents.size;
  },
};

// ============================================================================
// Logs Store
// ============================================================================

const logs: LogEntry[] = [];
const MAX_LOGS = 2000;

export const logStore = {
  getAll(): LogEntry[] {
    return [...logs];
  },

  getRecent(limit: number = 100): LogEntry[] {
    return logs.slice(-limit);
  },
  
  getBySource(source: LogSource): LogEntry[] {
    return logs.filter((l) => l.source === source);
  },
  
  getByCategory(category: LogCategory): LogEntry[] {
    return logs.filter((l) => l.category === category);
  },
  
  getBySeverity(severity: SeverityLevel): LogEntry[] {
    return logs.filter((l) => l.severity === severity);
  },
  
  query(filter: {
    source?: LogSource;
    category?: LogCategory;
    severity?: SeverityLevel;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): LogEntry[] {
    let result = [...logs];
    
    if (filter.source) {
      result = result.filter((l) => l.source === filter.source);
    }
    if (filter.category) {
      result = result.filter((l) => l.category === filter.category);
    }
    if (filter.severity) {
      result = result.filter((l) => l.severity === filter.severity);
    }
    if (filter.startTime) {
      result = result.filter((l) => l.timestamp >= filter.startTime!);
    }
    if (filter.endTime) {
      result = result.filter((l) => l.timestamp <= filter.endTime!);
    }
    if (filter.limit) {
      result = result.slice(-filter.limit);
    }
    
    return result;
  },

  add(
    source: LogSource,
    category: LogCategory,
    message: string,
    metadata?: Record<string, unknown>,
    user?: string,
    severity?: SeverityLevel
  ): LogEntry {
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      source,
      category,
      message,
      metadata,
      user,
      severity,
    };

    logs.push(entry);

    // Trim if over limit
    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS);
    }

    return entry;
  },

  addSystemLog(category: LogCategory, message: string, metadata?: Record<string, unknown>, severity?: SeverityLevel): LogEntry {
    return this.add('system', category, message, metadata, undefined, severity);
  },

  addOperatorLog(
    category: LogCategory,
    message: string,
    metadata?: Record<string, unknown>,
    user?: string
  ): LogEntry {
    return this.add('operator', category, message, metadata, user || 'operator');
  },

  addSimulationLog(category: LogCategory, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.add('simulation', category, message, metadata);
  },
  
  addAuditLog(category: LogCategory, message: string, metadata?: Record<string, unknown>, user?: string): LogEntry {
    return this.add('audit', category, message, metadata, user);
  },

  clear(): void {
    logs.length = 0;
  },
  
  count(): number {
    return logs.length;
  },
};

// ============================================================================
// Topology Store
// ============================================================================

let activeTopology: Topology | null = null;

export const topologyStore = {
  get(): Topology | null {
    return activeTopology;
  },

  set(topology: Topology): void {
    activeTopology = {
      ...topology,
      importedAt: new Date().toISOString(),
    };
  },

  clear(): void {
    activeTopology = null;
  },
  
  getSummary(): { nodeCount: number; edgeCount: number; regions: string[] } | null {
    if (!activeTopology) return null;
    
    const regions = [...new Set(activeTopology.nodes.map((n) => n.region))];
    return {
      nodeCount: activeTopology.nodes.length,
      edgeCount: activeTopology.edges.length,
      regions,
    };
  },
};
