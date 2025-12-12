"use strict";
/**
 * Sentinel Grid Backend - In-Memory Stores
 * Scenarios, Incidents, Logs, Topology
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.topologyStore = exports.logStore = exports.incidentStore = exports.scenarioStore = void 0;
const uuid_1 = require("uuid");
// ============================================================================
// Scenario Templates Store
// ============================================================================
const scenarioTemplates = [
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
exports.scenarioStore = {
    getAll() {
        return [...scenarioTemplates];
    },
    getById(id) {
        return scenarioTemplates.find((t) => t.id === id);
    },
    getByCategory(category) {
        return scenarioTemplates.filter((t) => t.category === category);
    },
};
// ============================================================================
// Incidents Store
// ============================================================================
const incidents = new Map();
exports.incidentStore = {
    getAll() {
        return Array.from(incidents.values()).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    },
    getById(id) {
        return incidents.get(id);
    },
    getOpen() {
        return this.getAll().filter((i) => i.status === 'open');
    },
    getBySeverity(severity) {
        return this.getAll().filter((i) => i.severity === severity);
    },
    create(data) {
        const incident = {
            id: `INC-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`,
            ...data,
        };
        incidents.set(incident.id, incident);
        return incident;
    },
    update(id, updates) {
        const incident = incidents.get(id);
        if (!incident)
            return undefined;
        const updated = { ...incident, ...updates };
        incidents.set(id, updated);
        return updated;
    },
    addMitigationAction(id, action) {
        const incident = incidents.get(id);
        if (!incident)
            return undefined;
        incident.mitigationActions.push(action);
        return incident;
    },
    findByCascadeEventId(cascadeEventId) {
        return Array.from(incidents.values()).find((i) => i.cascadeEventId === cascadeEventId);
    },
    createFromCascade(cascadeEventId, originNode, affectedNodes, severity, scenarioTemplateId) {
        const severityLevel = severity > 0.7 ? 'high' : severity > 0.4 ? 'medium' : 'low';
        const incident = {
            id: `INC-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`,
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
    close(id) {
        const incident = incidents.get(id);
        if (!incident)
            return undefined;
        incident.status = 'closed';
        incident.endedAt = new Date().toISOString();
        return incident;
    },
    mitigate(id) {
        const incident = incidents.get(id);
        if (!incident)
            return undefined;
        incident.status = 'mitigated';
        return incident;
    },
    clear() {
        incidents.clear();
    },
    count() {
        return incidents.size;
    },
};
// ============================================================================
// Logs Store
// ============================================================================
const logs = [];
const MAX_LOGS = 2000;
exports.logStore = {
    getAll() {
        return [...logs];
    },
    getRecent(limit = 100) {
        return logs.slice(-limit);
    },
    getBySource(source) {
        return logs.filter((l) => l.source === source);
    },
    getByCategory(category) {
        return logs.filter((l) => l.category === category);
    },
    getBySeverity(severity) {
        return logs.filter((l) => l.severity === severity);
    },
    query(filter) {
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
            result = result.filter((l) => l.timestamp >= filter.startTime);
        }
        if (filter.endTime) {
            result = result.filter((l) => l.timestamp <= filter.endTime);
        }
        if (filter.limit) {
            result = result.slice(-filter.limit);
        }
        return result;
    },
    add(source, category, message, metadata, user, severity) {
        const entry = {
            id: (0, uuid_1.v4)(),
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
    addSystemLog(category, message, metadata, severity) {
        return this.add('system', category, message, metadata, undefined, severity);
    },
    addOperatorLog(category, message, metadata, user) {
        return this.add('operator', category, message, metadata, user || 'operator');
    },
    addSimulationLog(category, message, metadata) {
        return this.add('simulation', category, message, metadata);
    },
    addAuditLog(category, message, metadata, user) {
        return this.add('audit', category, message, metadata, user);
    },
    clear() {
        logs.length = 0;
    },
    count() {
        return logs.length;
    },
};
// ============================================================================
// Topology Store
// ============================================================================
let activeTopology = null;
exports.topologyStore = {
    get() {
        return activeTopology;
    },
    set(topology) {
        activeTopology = {
            ...topology,
            importedAt: new Date().toISOString(),
        };
    },
    clear() {
        activeTopology = null;
    },
    getSummary() {
        if (!activeTopology)
            return null;
        const regions = [...new Set(activeTopology.nodes.map((n) => n.region))];
        return {
            nodeCount: activeTopology.nodes.length,
            edgeCount: activeTopology.edges.length,
            regions,
        };
    },
};
//# sourceMappingURL=index.js.map