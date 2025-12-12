/**
 * Sentinel Grid Backend - In-Memory Stores
 * Scenarios, Incidents, Logs, Topology
 */
import type { ScenarioTemplate, Incident, LogEntry, Topology, SeverityLevel, LogSource, LogCategory, MitigationAction } from '../types/index.js';
export declare const scenarioStore: {
    getAll(): ScenarioTemplate[];
    getById(id: string): ScenarioTemplate | undefined;
    getByCategory(category: "physical" | "cyber" | "environmental"): ScenarioTemplate[];
};
export declare const incidentStore: {
    getAll(): Incident[];
    getById(id: string): Incident | undefined;
    getOpen(): Incident[];
    getBySeverity(severity: SeverityLevel): Incident[];
    create(data: Omit<Incident, "id">): Incident;
    update(id: string, updates: Partial<Incident>): Incident | undefined;
    addMitigationAction(id: string, action: MitigationAction): Incident | undefined;
    findByCascadeEventId(cascadeEventId: string): Incident | undefined;
    createFromCascade(cascadeEventId: string, originNode: string, affectedNodes: string[], severity: number, scenarioTemplateId?: string): Incident;
    close(id: string): Incident | undefined;
    mitigate(id: string): Incident | undefined;
    clear(): void;
    count(): number;
};
export declare const logStore: {
    getAll(): LogEntry[];
    getRecent(limit?: number): LogEntry[];
    getBySource(source: LogSource): LogEntry[];
    getByCategory(category: LogCategory): LogEntry[];
    getBySeverity(severity: SeverityLevel): LogEntry[];
    query(filter: {
        source?: LogSource;
        category?: LogCategory;
        severity?: SeverityLevel;
        startTime?: string;
        endTime?: string;
        limit?: number;
    }): LogEntry[];
    add(source: LogSource, category: LogCategory, message: string, metadata?: Record<string, unknown>, user?: string, severity?: SeverityLevel): LogEntry;
    addSystemLog(category: LogCategory, message: string, metadata?: Record<string, unknown>, severity?: SeverityLevel): LogEntry;
    addOperatorLog(category: LogCategory, message: string, metadata?: Record<string, unknown>, user?: string): LogEntry;
    addSimulationLog(category: LogCategory, message: string, metadata?: Record<string, unknown>): LogEntry;
    addAuditLog(category: LogCategory, message: string, metadata?: Record<string, unknown>, user?: string): LogEntry;
    clear(): void;
    count(): number;
};
export declare const topologyStore: {
    get(): Topology | null;
    set(topology: Topology): void;
    clear(): void;
    getSummary(): {
        nodeCount: number;
        edgeCount: number;
        regions: string[];
    } | null;
};
