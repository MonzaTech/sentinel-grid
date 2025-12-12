/**
 * Sentinel Grid - API Validation Schemas
 * Zod schemas for request validation
 */
import { z } from 'zod';
export declare const SeverityLevelSchema: z.ZodEnum<["low", "medium", "high", "critical"]>;
export declare const NodeIdSchema: z.ZodString;
export declare const IncidentIdSchema: z.ZodString;
export declare const DateRangeSchema: z.ZodObject<{
    start: z.ZodOptional<z.ZodString>;
    end: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    start?: string | undefined;
    end?: string | undefined;
}, {
    start?: string | undefined;
    end?: string | undefined;
}>;
export declare const ScenarioTypeSchema: z.ZodEnum<["storm", "line_outage", "generator_loss", "cascade_stress", "cyber_attack", "telecom_outage", "sensor_spoof"]>;
export declare const RunScenarioSchema: z.ZodObject<{
    templateId: z.ZodString;
    severity: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    horizonHours: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    templateId: string;
    severity?: "low" | "medium" | "high" | "critical" | undefined;
    horizonHours?: number | undefined;
}, {
    templateId: string;
    severity?: "low" | "medium" | "high" | "critical" | undefined;
    horizonHours?: number | undefined;
}>;
export declare const ThreatTypeSchema: z.ZodEnum<["cyber_attack", "physical_intrusion", "equipment_failure", "overload", "weather_stress", "cascade_origin", "sensor_spoofing", "telecom_outage", "supply_chain"]>;
export declare const ThreatSubtypeSchema: z.ZodOptional<z.ZodEnum<["ransomware", "dos_attack", "command_injection", "credential_theft", "man_in_middle", "false_data_injection", "gps_spoofing", "firmware_attack", "voltage_manipulation", "frequency_deviation"]>>;
export declare const CreateThreatSchema: z.ZodObject<{
    type: z.ZodEnum<["cyber_attack", "physical_intrusion", "equipment_failure", "overload", "weather_stress", "cascade_origin", "sensor_spoofing", "telecom_outage", "supply_chain"]>;
    subtype: z.ZodOptional<z.ZodEnum<["ransomware", "dos_attack", "command_injection", "credential_theft", "man_in_middle", "false_data_injection", "gps_spoofing", "firmware_attack", "voltage_manipulation", "frequency_deviation"]>>;
    severity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    target: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    durationSeconds: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    type: "cyber_attack" | "physical_intrusion" | "equipment_failure" | "overload" | "weather_stress" | "cascade_origin" | "sensor_spoofing" | "telecom_outage" | "supply_chain";
    severity: number;
    durationSeconds: number;
    subtype?: "ransomware" | "dos_attack" | "command_injection" | "credential_theft" | "man_in_middle" | "false_data_injection" | "gps_spoofing" | "firmware_attack" | "voltage_manipulation" | "frequency_deviation" | undefined;
    target?: string | undefined;
    region?: string | undefined;
}, {
    type: "cyber_attack" | "physical_intrusion" | "equipment_failure" | "overload" | "weather_stress" | "cascade_origin" | "sensor_spoofing" | "telecom_outage" | "supply_chain";
    subtype?: "ransomware" | "dos_attack" | "command_injection" | "credential_theft" | "man_in_middle" | "false_data_injection" | "gps_spoofing" | "firmware_attack" | "voltage_manipulation" | "frequency_deviation" | undefined;
    severity?: number | undefined;
    target?: string | undefined;
    region?: string | undefined;
    durationSeconds?: number | undefined;
}>;
export declare const MitigationActionTypeSchema: z.ZodEnum<["isolate", "load_shed", "reroute", "activate_backup", "dispatch_maintenance", "enable_cooling", "cyber_lockdown", "manual_override"]>;
export declare const MitigateNodeSchema: z.ZodObject<{
    nodeId: z.ZodString;
    actionType: z.ZodEnum<["isolate", "load_shed", "reroute", "activate_backup", "dispatch_maintenance", "enable_cooling", "cyber_lockdown", "manual_override"]>;
    operator: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nodeId: string;
    actionType: "isolate" | "load_shed" | "reroute" | "activate_backup" | "dispatch_maintenance" | "enable_cooling" | "cyber_lockdown" | "manual_override";
    operator?: string | undefined;
}, {
    nodeId: string;
    actionType: "isolate" | "load_shed" | "reroute" | "activate_backup" | "dispatch_maintenance" | "enable_cooling" | "cyber_lockdown" | "manual_override";
    operator?: string | undefined;
}>;
export declare const BatchMitigateSchema: z.ZodObject<{
    nodeIds: z.ZodArray<z.ZodString, "many">;
    actionType: z.ZodEnum<["isolate", "load_shed", "reroute", "activate_backup", "dispatch_maintenance", "enable_cooling", "cyber_lockdown", "manual_override"]>;
    operator: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    actionType: "isolate" | "load_shed" | "reroute" | "activate_backup" | "dispatch_maintenance" | "enable_cooling" | "cyber_lockdown" | "manual_override";
    nodeIds: string[];
    operator?: string | undefined;
}, {
    actionType: "isolate" | "load_shed" | "reroute" | "activate_backup" | "dispatch_maintenance" | "enable_cooling" | "cyber_lockdown" | "manual_override";
    nodeIds: string[];
    operator?: string | undefined;
}>;
export declare const UpdateIncidentSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["open", "mitigated", "closed"]>>;
    summary: z.ZodOptional<z.ZodString>;
    rootCause: z.ZodOptional<z.ZodString>;
    endedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "open" | "mitigated" | "closed" | undefined;
    endedAt?: string | undefined;
    summary?: string | undefined;
    rootCause?: string | undefined;
}, {
    status?: "open" | "mitigated" | "closed" | undefined;
    endedAt?: string | undefined;
    summary?: string | undefined;
    rootCause?: string | undefined;
}>;
export declare const AddMitigationActionSchema: z.ZodObject<{
    actionType: z.ZodString;
    details: z.ZodString;
    automated: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    operator: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    actionType: string;
    details: string;
    automated: boolean;
    operator?: string | undefined;
}, {
    actionType: string;
    details: string;
    operator?: string | undefined;
    automated?: boolean | undefined;
}>;
export declare const TopologyNodeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    region: z.ZodString;
    voltage: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    category: z.ZodOptional<z.ZodEnum<["generation", "transmission", "distribution", "datacenter", "telecom", "control", "storage"]>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    region: string;
    name: string;
    voltage?: string | undefined;
    category?: "generation" | "transmission" | "distribution" | "datacenter" | "telecom" | "control" | "storage" | undefined;
}, {
    type: string;
    id: string;
    region: string;
    name: string;
    voltage?: string | undefined;
    category?: "generation" | "transmission" | "distribution" | "datacenter" | "telecom" | "control" | "storage" | undefined;
}>;
export declare const TopologyEdgeSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    capacity: z.ZodNumber;
    type: z.ZodOptional<z.ZodEnum<["power", "data", "control"]>>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
    capacity: number;
    type?: "control" | "power" | "data" | undefined;
}, {
    from: string;
    to: string;
    capacity: number;
    type?: "control" | "power" | "data" | undefined;
}>;
export declare const ImportTopologySchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        region: z.ZodString;
        voltage: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        category: z.ZodOptional<z.ZodEnum<["generation", "transmission", "distribution", "datacenter", "telecom", "control", "storage"]>>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
        region: string;
        name: string;
        voltage?: string | undefined;
        category?: "generation" | "transmission" | "distribution" | "datacenter" | "telecom" | "control" | "storage" | undefined;
    }, {
        type: string;
        id: string;
        region: string;
        name: string;
        voltage?: string | undefined;
        category?: "generation" | "transmission" | "distribution" | "datacenter" | "telecom" | "control" | "storage" | undefined;
    }>, "many">;
    edges: z.ZodArray<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        capacity: z.ZodNumber;
        type: z.ZodOptional<z.ZodEnum<["power", "data", "control"]>>;
    }, "strip", z.ZodTypeAny, {
        from: string;
        to: string;
        capacity: number;
        type?: "control" | "power" | "data" | undefined;
    }, {
        from: string;
        to: string;
        capacity: number;
        type?: "control" | "power" | "data" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    nodes: {
        type: string;
        id: string;
        region: string;
        name: string;
        voltage?: string | undefined;
        category?: "generation" | "transmission" | "distribution" | "datacenter" | "telecom" | "control" | "storage" | undefined;
    }[];
    edges: {
        from: string;
        to: string;
        capacity: number;
        type?: "control" | "power" | "data" | undefined;
    }[];
}, {
    nodes: {
        type: string;
        id: string;
        region: string;
        name: string;
        voltage?: string | undefined;
        category?: "generation" | "transmission" | "distribution" | "datacenter" | "telecom" | "control" | "storage" | undefined;
    }[];
    edges: {
        from: string;
        to: string;
        capacity: number;
        type?: "control" | "power" | "data" | undefined;
    }[];
}>;
export declare const ReportQuerySchema: z.ZodObject<{
    start: z.ZodOptional<z.ZodString>;
    end: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<["json", "csv"]>>>;
}, "strip", z.ZodTypeAny, {
    format: "json" | "csv";
    start?: string | undefined;
    end?: string | undefined;
}, {
    start?: string | undefined;
    end?: string | undefined;
    format?: "json" | "csv" | undefined;
}>;
export declare const RunDemoSchema: z.ZodObject<{
    demoId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    demoId: string;
}, {
    demoId?: string | undefined;
}>;
export declare const SkipToStepSchema: z.ZodObject<{
    stepIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    stepIndex: number;
}, {
    stepIndex: number;
}>;
export declare const SystemConfigSchema: z.ZodObject<{
    autoMitigation: z.ZodOptional<z.ZodBoolean>;
    tickIntervalMs: z.ZodOptional<z.ZodNumber>;
    predictionIntervalMs: z.ZodOptional<z.ZodNumber>;
    criticalThreshold: z.ZodOptional<z.ZodNumber>;
    warningThreshold: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tickIntervalMs?: number | undefined;
    predictionIntervalMs?: number | undefined;
    criticalThreshold?: number | undefined;
    warningThreshold?: number | undefined;
    autoMitigation?: boolean | undefined;
}, {
    tickIntervalMs?: number | undefined;
    predictionIntervalMs?: number | undefined;
    criticalThreshold?: number | undefined;
    warningThreshold?: number | undefined;
    autoMitigation?: boolean | undefined;
}>;
export declare function validateRequest<T>(schema: z.ZodType<T>, data: unknown): {
    success: true;
    data: T;
} | {
    success: false;
    errors: string[];
};
export declare const API_VERSION = "1.0.0";
export declare function createApiResponse<T>(success: boolean, data?: T, message?: string, requestId?: string): {
    success: boolean;
    data?: T;
    message?: string;
    timestamp: string;
    version: string;
    requestId?: string;
};
