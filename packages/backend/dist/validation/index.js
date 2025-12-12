"use strict";
/**
 * Sentinel Grid - API Validation Schemas
 * Zod schemas for request validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_VERSION = exports.SystemConfigSchema = exports.SkipToStepSchema = exports.RunDemoSchema = exports.ReportQuerySchema = exports.ImportTopologySchema = exports.TopologyEdgeSchema = exports.TopologyNodeSchema = exports.AddMitigationActionSchema = exports.UpdateIncidentSchema = exports.BatchMitigateSchema = exports.MitigateNodeSchema = exports.MitigationActionTypeSchema = exports.CreateThreatSchema = exports.ThreatSubtypeSchema = exports.ThreatTypeSchema = exports.RunScenarioSchema = exports.ScenarioTypeSchema = exports.DateRangeSchema = exports.IncidentIdSchema = exports.NodeIdSchema = exports.SeverityLevelSchema = void 0;
exports.validateRequest = validateRequest;
exports.createApiResponse = createApiResponse;
const zod_1 = require("zod");
// ============================================================================
// Common Schemas
// ============================================================================
exports.SeverityLevelSchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.NodeIdSchema = zod_1.z.string()
    .min(1, 'Node ID required')
    .regex(/^node_\d{4}$/, 'Invalid node ID format');
exports.IncidentIdSchema = zod_1.z.string()
    .min(1, 'Incident ID required')
    .regex(/^INC-[A-Z0-9]+$/, 'Invalid incident ID format');
exports.DateRangeSchema = zod_1.z.object({
    start: zod_1.z.string().datetime().optional(),
    end: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Scenario Schemas
// ============================================================================
exports.ScenarioTypeSchema = zod_1.z.enum([
    'storm', 'line_outage', 'generator_loss', 'cascade_stress',
    'cyber_attack', 'telecom_outage', 'sensor_spoof'
]);
exports.RunScenarioSchema = zod_1.z.object({
    templateId: zod_1.z.string().min(1, 'Template ID required'),
    severity: exports.SeverityLevelSchema.optional(),
    horizonHours: zod_1.z.number().min(1).max(48).optional(),
});
// ============================================================================
// Threat Schemas
// ============================================================================
exports.ThreatTypeSchema = zod_1.z.enum([
    'cyber_attack', 'physical_intrusion', 'equipment_failure', 'overload',
    'weather_stress', 'cascade_origin', 'sensor_spoofing', 'telecom_outage', 'supply_chain'
]);
exports.ThreatSubtypeSchema = zod_1.z.enum([
    'ransomware', 'dos_attack', 'command_injection', 'credential_theft',
    'man_in_middle', 'false_data_injection', 'gps_spoofing', 'firmware_attack',
    'voltage_manipulation', 'frequency_deviation'
]).optional();
exports.CreateThreatSchema = zod_1.z.object({
    type: exports.ThreatTypeSchema,
    subtype: exports.ThreatSubtypeSchema,
    severity: zod_1.z.number().min(0).max(1).optional().default(0.6),
    target: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    durationSeconds: zod_1.z.number().min(10).max(600).optional().default(120),
});
// ============================================================================
// Mitigation Schemas
// ============================================================================
exports.MitigationActionTypeSchema = zod_1.z.enum([
    'isolate', 'load_shed', 'reroute', 'activate_backup',
    'dispatch_maintenance', 'enable_cooling', 'cyber_lockdown', 'manual_override'
]);
exports.MitigateNodeSchema = zod_1.z.object({
    nodeId: zod_1.z.string().min(1),
    actionType: exports.MitigationActionTypeSchema,
    operator: zod_1.z.string().optional(),
});
exports.BatchMitigateSchema = zod_1.z.object({
    nodeIds: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'At least one node required'),
    actionType: exports.MitigationActionTypeSchema,
    operator: zod_1.z.string().optional(),
});
// ============================================================================
// Incident Schemas
// ============================================================================
exports.UpdateIncidentSchema = zod_1.z.object({
    status: zod_1.z.enum(['open', 'mitigated', 'closed']).optional(),
    summary: zod_1.z.string().max(1000).optional(),
    rootCause: zod_1.z.string().max(2000).optional(),
    endedAt: zod_1.z.string().datetime().optional(),
});
exports.AddMitigationActionSchema = zod_1.z.object({
    actionType: zod_1.z.string().min(1),
    details: zod_1.z.string().min(1).max(500),
    automated: zod_1.z.boolean().optional().default(false),
    operator: zod_1.z.string().optional(),
});
// ============================================================================
// Topology Schemas
// ============================================================================
exports.TopologyNodeSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    region: zod_1.z.string().min(1),
    voltage: zod_1.z.string().optional(),
    type: zod_1.z.string().min(1),
    category: zod_1.z.enum(['generation', 'transmission', 'distribution', 'datacenter', 'telecom', 'control', 'storage']).optional(),
});
exports.TopologyEdgeSchema = zod_1.z.object({
    from: zod_1.z.string().min(1),
    to: zod_1.z.string().min(1),
    capacity: zod_1.z.number().min(0),
    type: zod_1.z.enum(['power', 'data', 'control']).optional(),
});
exports.ImportTopologySchema = zod_1.z.object({
    nodes: zod_1.z.array(exports.TopologyNodeSchema).min(1, 'At least one node required'),
    edges: zod_1.z.array(exports.TopologyEdgeSchema).min(0),
});
// ============================================================================
// Report Schemas
// ============================================================================
exports.ReportQuerySchema = zod_1.z.object({
    start: zod_1.z.string().datetime().optional(),
    end: zod_1.z.string().datetime().optional(),
    format: zod_1.z.enum(['json', 'csv']).optional().default('json'),
});
// ============================================================================
// Demo Schemas
// ============================================================================
exports.RunDemoSchema = zod_1.z.object({
    demoId: zod_1.z.string().optional().default('investor-demo'),
});
exports.SkipToStepSchema = zod_1.z.object({
    stepIndex: zod_1.z.number().min(0),
});
// ============================================================================
// System Schemas
// ============================================================================
exports.SystemConfigSchema = zod_1.z.object({
    autoMitigation: zod_1.z.boolean().optional(),
    tickIntervalMs: zod_1.z.number().min(500).max(10000).optional(),
    predictionIntervalMs: zod_1.z.number().min(1000).max(60000).optional(),
    criticalThreshold: zod_1.z.number().min(0.5).max(1).optional(),
    warningThreshold: zod_1.z.number().min(0.3).max(0.9).optional(),
});
// ============================================================================
// Validation Helper
// ============================================================================
function validateRequest(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return { success: false, errors };
}
// ============================================================================
// API Version
// ============================================================================
exports.API_VERSION = '1.0.0';
function createApiResponse(success, data, message, requestId) {
    return {
        success,
        data,
        message,
        timestamp: new Date().toISOString(),
        version: exports.API_VERSION,
        requestId,
    };
}
//# sourceMappingURL=index.js.map