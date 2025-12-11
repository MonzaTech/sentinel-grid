"use strict";
/**
 * Sentinel Grid Backend - Simulation Routes
 * POST /api/simulate/cascade, /api/simulate/threat
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const simulation_js_1 = require("../services/simulation.js");
const index_js_1 = require("../db/index.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const uuid_1 = require("uuid");
const predictive_engine_1 = require("@sentinel-grid/predictive-engine");
const router = (0, express_1.Router)();
// Validation schemas
const cascadeSchema = zod_1.z.object({
    originId: zod_1.z.string().min(1),
    severity: zod_1.z.number().min(0).max(1).optional().default(0.7),
});
const threatSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'cyber_attack',
        'physical_intrusion',
        'equipment_failure',
        'overload',
        'weather_stress',
        'cascade_origin',
    ]),
    severity: zod_1.z.number().min(0).max(1).optional().default(0.5),
    target: zod_1.z.string().optional().nullable(),
    region: zod_1.z.string().optional(),
    duration: zod_1.z.number().optional().default(60), // seconds
});
/**
 * POST /api/simulate/cascade
 * Trigger a cascade failure from origin node
 */
router.post('/cascade', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { originId, severity } = cascadeSchema.parse(req.body);
    const sim = (0, simulation_js_1.getSimulation)();
    const node = sim.getNode(originId);
    if (!node) {
        throw (0, errorHandler_js_1.createError)(404, `Origin node ${originId} not found`);
    }
    // Trigger cascade
    const event = sim.triggerCascade(originId, severity);
    // Save to database
    index_js_1.cascadeRepo.insert.run({
        id: event.id,
        originNode: event.originNode,
        affectedNodes: JSON.stringify(event.affectedNodes),
        impactScore: event.impactScore,
        totalDamage: event.totalDamage,
        propagationPath: JSON.stringify(event.propagationPath),
        startTime: event.startTime.toISOString(),
        endTime: event.endTime?.toISOString() || undefined,
    });
    // Create audit entry
    const auditData = {
        type: 'cascade_event',
        originNode: event.originNode,
        affectedCount: event.affectedNodes.length,
        impactScore: event.impactScore,
        severity,
    };
    index_js_1.auditRepo.insert.run({
        id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        type: 'cascade_event',
        hash: (0, predictive_engine_1.createAuditHash)(auditData),
        actor: 'system',
        dataSummary: JSON.stringify(auditData),
    });
    res.json({
        success: true,
        message: `Cascade triggered from ${node.name}`,
        data: {
            id: event.id,
            originNode: event.originNode,
            affectedNodes: event.affectedNodes.length,
            impactScore: event.impactScore,
            totalDamage: event.totalDamage,
            propagationDepth: event.propagationPath.length,
        },
    });
}));
/**
 * GET /api/simulate/cascades
 * Get cascade history
 */
router.get('/cascades', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const cascades = index_js_1.cascadeRepo.getAll.all();
    res.json({
        success: true,
        count: cascades.length,
        data: cascades.map((c) => ({
            ...c,
            affectedNodes: JSON.parse(c.affected_nodes),
            propagationPath: JSON.parse(c.propagation_path || '[]'),
        })),
    });
}));
/**
 * POST /api/simulate/threat
 * Deploy a threat scenario
 */
router.post('/threat', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const threatData = threatSchema.parse(req.body);
    const sim = (0, simulation_js_1.getSimulation)();
    // Verify target exists if specified
    if (threatData.target) {
        const node = sim.getNode(threatData.target);
        if (!node) {
            throw (0, errorHandler_js_1.createError)(404, `Target node ${threatData.target} not found`);
        }
    }
    // Deploy threat
    const threat = sim.deployThreat({
        type: threatData.type,
        severity: threatData.severity,
        target: threatData.target || null,
        region: threatData.region,
        active: true,
        until: new Date(Date.now() + threatData.duration * 1000),
        duration: threatData.duration,
    });
    // Create audit entry
    const auditData = {
        type: 'threat_deployment',
        threatType: threat.type,
        severity: threat.severity,
        target: threat.target,
        region: threat.region,
    };
    index_js_1.auditRepo.insert.run({
        id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        type: 'threat_deployment',
        hash: (0, predictive_engine_1.createAuditHash)(auditData),
        actor: 'operator',
        dataSummary: JSON.stringify(auditData),
    });
    res.json({
        success: true,
        message: `Threat ${threat.type} deployed`,
        data: threat,
    });
}));
/**
 * DELETE /api/simulate/threat
 * Clear active threat
 */
router.delete('/threat', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    sim.clearThreat();
    res.json({
        success: true,
        message: 'Threat cleared',
    });
}));
/**
 * POST /api/simulate/scenario
 * Run a predefined scenario with optional severity
 */
router.post('/scenario', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { scenario, severity } = zod_1.z.object({
        scenario: zod_1.z.enum(['cyber_attack', 'storm', 'cascade', 'overload', 'demo']),
        severity: zod_1.z.enum(['low', 'medium', 'high']).optional().default('medium'),
    }).parse(req.body);
    const sim = (0, simulation_js_1.getSimulation)();
    // Start simulation if not running
    if (!sim.isSimulationRunning()) {
        sim.start();
    }
    // Map severity to numeric value
    const severityMultiplier = severity === 'low' ? 0.5 : severity === 'high' ? 1.2 : 1.0;
    const baseSeverity = severity === 'low' ? 0.4 : severity === 'high' ? 0.9 : 0.7;
    const state = sim.getSystemState();
    const nodes = sim.getNodes();
    const nodeIds = Object.keys(nodes);
    switch (scenario) {
        case 'cyber_attack': {
            const target = nodeIds.find((id) => nodes[id].type === 'control_center') || nodeIds[0];
            sim.deployThreat({
                type: 'cyber_attack',
                severity: Math.min(1, 0.6 * severityMultiplier),
                target,
                active: true,
                until: new Date(Date.now() + 120000 * severityMultiplier),
            });
            break;
        }
        case 'storm': {
            const region = nodes[nodeIds[0]].region;
            sim.deployThreat({
                type: 'weather_stress',
                severity: Math.min(1, 0.5 * severityMultiplier),
                target: null,
                region,
                active: true,
                until: new Date(Date.now() + 180000 * severityMultiplier),
            });
            break;
        }
        case 'cascade': {
            // Find highest risk node
            const critical = state.criticalNodes[0] ||
                Object.values(nodes).sort((a, b) => b.riskScore - a.riskScore)[0].id;
            sim.triggerCascade(critical, baseSeverity);
            break;
        }
        case 'overload': {
            const substation = nodeIds.find((id) => nodes[id].type === 'substation') || nodeIds[0];
            sim.deployThreat({
                type: 'overload',
                severity: Math.min(1, 0.7 * severityMultiplier),
                target: substation,
                active: true,
                until: new Date(Date.now() + 90000 * severityMultiplier),
            });
            break;
        }
        case 'demo': {
            // Run comprehensive demo: threat → cascade → predictions
            const target = nodeIds[Math.floor(nodeIds.length / 2)];
            // Deploy threat first
            sim.deployThreat({
                type: 'cyber_attack',
                severity: Math.min(1, 0.5 * severityMultiplier),
                target,
                active: true,
                until: new Date(Date.now() + 60000 * severityMultiplier),
            });
            // Schedule cascade after 5 seconds
            setTimeout(() => {
                sim.triggerCascade(target, baseSeverity * 0.7);
            }, 5000);
            break;
        }
    }
    res.json({
        success: true,
        message: `Scenario '${scenario}' started with ${severity} severity`,
        scenario,
        severity,
    });
}));
exports.default = router;
//# sourceMappingURL=simulate.js.map