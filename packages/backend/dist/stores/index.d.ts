/**
 * Sentinel Grid Backend - In-Memory Stores
 * Scenarios, Incidents, Logs, Topology
 */
import type { ScenarioTemplate, Incident, LogEntry, Topology, LogSource, LogCategory, MitigationAction } from '../types/index.js';
export declare const scenarioStore: {
    getAll(): ScenarioTemplate[];
    getById(id: string): ScenarioTemplate | undefined;
};
export declare const incidentStore: {
    getAll(): Incident[];
    getById(id: string): Incident | undefined;
    create(data: Omit<Incident, "id">): Incident;
    update(id: string, updates: Partial<Incident>): Incident | undefined;
    addMitigationAction(id: string, action: MitigationAction): Incident | undefined;
    findByCascadeEventId(cascadeEventId: string): Incident | undefined;
    createFromCascade(cascadeEventId: string, originNode: string, affectedNodes: string[], severity: number, scenarioTemplateId?: string): Incident;
    clear(): void;
};
export declare const logStore: {
    getAll(): LogEntry[];
    getRecent(limit?: number): LogEntry[];
    add(source: LogSource, category: LogCategory, message: string, metadata?: Record<string, unknown>, user?: string): LogEntry;
    addSystemLog(category: LogCategory, message: string, metadata?: Record<string, unknown>): LogEntry;
    addOperatorLog(category: LogCategory, message: string, metadata?: Record<string, unknown>, user?: string): LogEntry;
    addSimulationLog(category: LogCategory, message: string, metadata?: Record<string, unknown>): LogEntry;
    clear(): void;
};
export declare const topologyStore: {
    get(): Topology | null;
    set(topology: Topology): void;
    clear(): void;
};
