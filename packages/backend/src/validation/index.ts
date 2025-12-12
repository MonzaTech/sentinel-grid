/**
 * Sentinel Grid - API Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const SeverityLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const NodeIdSchema = z.string()
  .min(1, 'Node ID required')
  .regex(/^node_\d{4}$/, 'Invalid node ID format');

export const IncidentIdSchema = z.string()
  .min(1, 'Incident ID required')
  .regex(/^INC-[A-Z0-9]+$/, 'Invalid incident ID format');

export const DateRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

// ============================================================================
// Scenario Schemas
// ============================================================================

export const ScenarioTypeSchema = z.enum([
  'storm', 'line_outage', 'generator_loss', 'cascade_stress',
  'cyber_attack', 'telecom_outage', 'sensor_spoof'
]);

export const RunScenarioSchema = z.object({
  templateId: z.string().min(1, 'Template ID required'),
  severity: SeverityLevelSchema.optional(),
  horizonHours: z.number().min(1).max(48).optional(),
});

// ============================================================================
// Threat Schemas
// ============================================================================

export const ThreatTypeSchema = z.enum([
  'cyber_attack', 'physical_intrusion', 'equipment_failure', 'overload',
  'weather_stress', 'cascade_origin', 'sensor_spoofing', 'telecom_outage', 'supply_chain'
]);

export const ThreatSubtypeSchema = z.enum([
  'ransomware', 'dos_attack', 'command_injection', 'credential_theft',
  'man_in_middle', 'false_data_injection', 'gps_spoofing', 'firmware_attack',
  'voltage_manipulation', 'frequency_deviation'
]).optional();

export const CreateThreatSchema = z.object({
  type: ThreatTypeSchema,
  subtype: ThreatSubtypeSchema,
  severity: z.number().min(0).max(1).optional().default(0.6),
  target: z.string().optional(),
  region: z.string().optional(),
  durationSeconds: z.number().min(10).max(600).optional().default(120),
});

// ============================================================================
// Mitigation Schemas
// ============================================================================

export const MitigationActionTypeSchema = z.enum([
  'isolate', 'load_shed', 'reroute', 'activate_backup',
  'dispatch_maintenance', 'enable_cooling', 'cyber_lockdown', 'manual_override'
]);

export const MitigateNodeSchema = z.object({
  nodeId: z.string().min(1),
  actionType: MitigationActionTypeSchema,
  operator: z.string().optional(),
});

export const BatchMitigateSchema = z.object({
  nodeIds: z.array(z.string().min(1)).min(1, 'At least one node required'),
  actionType: MitigationActionTypeSchema,
  operator: z.string().optional(),
});

// ============================================================================
// Incident Schemas
// ============================================================================

export const UpdateIncidentSchema = z.object({
  status: z.enum(['open', 'mitigated', 'closed']).optional(),
  summary: z.string().max(1000).optional(),
  rootCause: z.string().max(2000).optional(),
  endedAt: z.string().datetime().optional(),
});

export const AddMitigationActionSchema = z.object({
  actionType: z.string().min(1),
  details: z.string().min(1).max(500),
  automated: z.boolean().optional().default(false),
  operator: z.string().optional(),
});

// ============================================================================
// Topology Schemas
// ============================================================================

export const TopologyNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  region: z.string().min(1),
  voltage: z.string().optional(),
  type: z.string().min(1),
  category: z.enum(['generation', 'transmission', 'distribution', 'datacenter', 'telecom', 'control', 'storage']).optional(),
});

export const TopologyEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  capacity: z.number().min(0),
  type: z.enum(['power', 'data', 'control']).optional(),
});

export const ImportTopologySchema = z.object({
  nodes: z.array(TopologyNodeSchema).min(1, 'At least one node required'),
  edges: z.array(TopologyEdgeSchema).min(0),
});

// ============================================================================
// Report Schemas
// ============================================================================

export const ReportQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

// ============================================================================
// Demo Schemas
// ============================================================================

export const RunDemoSchema = z.object({
  demoId: z.string().optional().default('investor-demo'),
});

export const SkipToStepSchema = z.object({
  stepIndex: z.number().min(0),
});

// ============================================================================
// System Schemas
// ============================================================================

export const SystemConfigSchema = z.object({
  autoMitigation: z.boolean().optional(),
  tickIntervalMs: z.number().min(500).max(10000).optional(),
  predictionIntervalMs: z.number().min(1000).max(60000).optional(),
  criticalThreshold: z.number().min(0.5).max(1).optional(),
  warningThreshold: z.number().min(0.3).max(0.9).optional(),
});

// ============================================================================
// Validation Helper
// ============================================================================

export function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
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

export const API_VERSION = '1.0.0';

export function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  requestId?: string
): {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  version: string;
  requestId?: string;
} {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString(),
    version: API_VERSION,
    requestId,
  };
}
