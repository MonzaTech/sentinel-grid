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
  },
  {
    id: 'tpl-line-outage',
    name: 'Transmission Line Outage',
    description: 'Critical transmission line failure causing load redistribution',
    type: 'line_outage',
    defaultSeverity: 'medium',
    defaultHorizonHours: 2,
    targetRegions: ['Central', 'South'],
  },
  {
    id: 'tpl-generator-loss',
    name: 'Generator Trip Event',
    description: 'Sudden loss of major generation capacity requiring emergency response',
    type: 'generator_loss',
    defaultSeverity: 'high',
    defaultHorizonHours: 1,
    targetRegions: ['West', 'Central'],
  },
  {
    id: 'tpl-cascade-stress',
    name: 'Cascade Stress Test',
    description: 'Progressive stress test to evaluate cascade failure resilience',
    type: 'cascade_stress',
    defaultSeverity: 'medium',
    defaultHorizonHours: 4,
    targetRegions: ['North', 'South', 'East', 'West'],
  },
];

export const scenarioStore = {
  getAll(): ScenarioTemplate[] {
    return [...scenarioTemplates];
  },

  getById(id: string): ScenarioTemplate | undefined {
    return scenarioTemplates.find((t) => t.id === id);
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

  clear(): void {
    incidents.clear();
  },
};

// ============================================================================
// Logs Store
// ============================================================================

const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

export const logStore = {
  getAll(): LogEntry[] {
    return [...logs];
  },

  getRecent(limit: number = 100): LogEntry[] {
    return logs.slice(-limit);
  },

  add(
    source: LogSource,
    category: LogCategory,
    message: string,
    metadata?: Record<string, unknown>,
    user?: string
  ): LogEntry {
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      source,
      category,
      message,
      metadata,
      user,
    };

    logs.push(entry);

    // Trim if over limit
    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS);
    }

    return entry;
  },

  addSystemLog(category: LogCategory, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.add('system', category, message, metadata);
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

  clear(): void {
    logs.length = 0;
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
};
