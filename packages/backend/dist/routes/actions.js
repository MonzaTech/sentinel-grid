"use strict";
/**
 * Sentinel Grid Backend - Actions Routes
 * POST /api/actions/mitigate
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const simulation_js_1 = require("../services/simulation.js");
const index_js_1 = require("../db/index.js");
const index_js_2 = require("../stores/index.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const uuid_1 = require("uuid");
const predictive_engine_1 = require("@sentinel-grid/predictive-engine");
const router = (0, express_1.Router)();
// Validation schemas
const mitigateSchema = zod_1.z.object({
    nodeId: zod_1.z.string().min(1),
    action: zod_1.z.string().optional(),
    actionType: zod_1.z.enum([
        'isolate', 'load_shed', 'reroute', 'activate_backup',
        'dispatch_maintenance', 'enable_cooling', 'cyber_lockdown', 'manual_override'
    ]).optional(),
    incidentId: zod_1.z.string().optional(),
    operator: zod_1.z.string().optional(),
});
const autoMitigationSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
});
/**
 * GET /api/actions/recommendations
 * Get current mitigation recommendations
 */
router.get('/recommendations', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { nodeId, status } = req.query;
    const sim = (0, simulation_js_1.getSimulation)();
    const predictions = sim.getPredictions();
    // Generate recommendations based on active predictions
    const recommendations = [];
    predictions.filter(p => p.status === 'active').forEach(pred => {
        const node = sim.getNode(pred.nodeId);
        if (!node)
            return;
        // Filter by nodeId if specified
        if (nodeId && pred.nodeId !== nodeId)
            return;
        // Generate recommendations based on prediction type
        const actions = [];
        if (pred.type === 'thermal_stress' || node.temperature > 70) {
            actions.push({
                id: `rec_${(0, uuid_1.v4)().slice(0, 8)}`,
                nodeId: pred.nodeId,
                predictionId: pred.id,
                actionType: 'enable_cooling',
                priority: 'immediate',
                description: `Activate cooling for ${node.name}`,
                expectedRiskReduction: 0.25,
                estimatedTimeMinutes: 2,
                automatable: true,
                status: 'pending',
            });
        }
        if (pred.type === 'overload' || node.loadRatio > 0.85) {
            actions.push({
                id: `rec_${(0, uuid_1.v4)().slice(0, 8)}`,
                nodeId: pred.nodeId,
                predictionId: pred.id,
                actionType: 'load_shed',
                priority: 'immediate',
                description: `Reduce load on ${node.name}`,
                expectedRiskReduction: 0.35,
                estimatedTimeMinutes: 3,
                automatable: true,
                status: 'pending',
            });
        }
        if (pred.type === 'cascade_failure' || pred.severity === 'critical') {
            actions.push({
                id: `rec_${(0, uuid_1.v4)().slice(0, 8)}`,
                nodeId: pred.nodeId,
                predictionId: pred.id,
                actionType: 'isolate',
                priority: 'high',
                description: `Isolate ${node.name} to prevent cascade`,
                expectedRiskReduction: 0.5,
                estimatedTimeMinutes: 1,
                automatable: false,
                status: 'pending',
            });
        }
        if (pred.type === 'cyber_vulnerability') {
            actions.push({
                id: `rec_${(0, uuid_1.v4)().slice(0, 8)}`,
                nodeId: pred.nodeId,
                predictionId: pred.id,
                actionType: 'cyber_lockdown',
                priority: 'immediate',
                description: `Initiate cyber lockdown on ${node.name}`,
                expectedRiskReduction: 0.45,
                estimatedTimeMinutes: 5,
                automatable: false,
                status: 'pending',
            });
        }
        // Default backup activation
        if (actions.length === 0) {
            actions.push({
                id: `rec_${(0, uuid_1.v4)().slice(0, 8)}`,
                nodeId: pred.nodeId,
                predictionId: pred.id,
                actionType: 'activate_backup',
                priority: 'medium',
                description: `Activate backup systems for ${node.name}`,
                expectedRiskReduction: 0.3,
                estimatedTimeMinutes: 5,
                automatable: true,
                status: 'pending',
            });
        }
        recommendations.push(...actions);
    });
    // Sort by priority
    const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    res.json({
        success: true,
        count: recommendations.length,
        data: recommendations,
        timestamp: new Date().toISOString(),
    });
}));
/**
 * POST /api/actions/mitigate
 * Apply mitigation to a node
 */
router.post('/mitigate', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { nodeId, incidentId, actionType, operator } = mitigateSchema.parse(req.body);
    const sim = (0, simulation_js_1.getSimulation)();
    const node = sim.getNode(nodeId);
    if (!node) {
        throw (0, errorHandler_js_1.createError)(404, `Node ${nodeId} not found`);
    }
    const riskBefore = node.riskScore;
    // Apply mitigation
    const result = sim.mitigate(nodeId, actionType || 'manual');
    // Save to database
    index_js_1.mitigationsRepo.insert.run({
        id: (0, uuid_1.v4)(),
        nodeId,
        nodeName: result.node,
        actions: JSON.stringify(result.actions),
        riskBefore,
        riskAfter: result.updatedNode.riskScore,
        riskReduction: result.riskReduction,
        success: result.success ? 1 : 0,
        triggeredBy: actionType || 'manual',
    });
    // Create audit entry
    const auditData = {
        type: 'manual_mitigation',
        nodeId,
        nodeName: result.node,
        actionType: actionType || 'manual',
        success: result.success,
        riskReduction: result.riskReduction,
        actions: result.actions,
        operator: operator || 'operator',
    };
    index_js_1.auditRepo.insert.run({
        id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        type: 'manual_mitigation',
        hash: (0, predictive_engine_1.createAuditHash)(auditData),
        actor: operator || 'operator',
        dataSummary: JSON.stringify(auditData),
    });
    // Log the mitigation
    index_js_2.logStore.addOperatorLog('mitigation', `Mitigation applied to ${result.node}: ${actionType || 'manual'}`, {
        nodeId,
        actionType: actionType || 'manual',
        success: result.success,
        riskReduction: result.riskReduction,
        actions: result.actions,
    }, operator);
    // If incident ID provided, add mitigation action to incident
    if (incidentId) {
        index_js_2.incidentStore.addMitigationAction(incidentId, {
            at: new Date().toISOString(),
            actionType: actionType || 'manual_mitigation',
            details: `Applied ${actionType || 'mitigation'} to ${result.node}: ${result.actions.join(', ')}`,
            automated: false,
            operator: operator,
            riskReduction: result.riskReduction,
        });
    }
    res.json({
        success: true,
        data: {
            nodeId,
            nodeName: result.node,
            actionType: actionType || 'manual',
            mitigationSuccess: result.success,
            riskBefore,
            riskAfter: result.updatedNode.riskScore,
            riskReduction: result.riskReduction,
            actions: result.actions,
            updatedNode: result.updatedNode,
        },
        timestamp: new Date().toISOString(),
    });
}));
/**
 * POST /api/actions/mitigate/batch
 * Mitigate multiple nodes
 */
router.post('/mitigate/batch', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { nodeIds, actionType, operator } = zod_1.z.object({
        nodeIds: zod_1.z.array(zod_1.z.string()).min(1).max(50),
        actionType: zod_1.z.string().optional(),
        operator: zod_1.z.string().optional(),
    }).parse(req.body);
    const sim = (0, simulation_js_1.getSimulation)();
    const results = [];
    for (const nodeId of nodeIds) {
        const node = sim.getNode(nodeId);
        if (!node)
            continue;
        const riskBefore = node.riskScore;
        const result = sim.mitigate(nodeId, actionType || 'batch');
        // Save to database
        index_js_1.mitigationsRepo.insert.run({
            id: (0, uuid_1.v4)(),
            nodeId,
            nodeName: result.node,
            actions: JSON.stringify(result.actions),
            riskBefore,
            riskAfter: result.updatedNode.riskScore,
            riskReduction: result.riskReduction,
            success: result.success ? 1 : 0,
            triggeredBy: actionType || 'batch',
        });
        results.push({
            nodeId,
            success: result.success,
            riskReduction: result.riskReduction,
        });
    }
    // Single audit entry for batch
    const auditData = {
        type: 'batch_mitigation',
        actionType: actionType || 'batch',
        count: results.length,
        successful: results.filter((r) => r.success).length,
        operator: operator || 'operator',
    };
    index_js_1.auditRepo.insert.run({
        id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        type: 'batch_mitigation',
        hash: (0, predictive_engine_1.createAuditHash)(auditData),
        actor: operator || 'operator',
        dataSummary: JSON.stringify(auditData),
    });
    // Log the batch mitigation
    index_js_2.logStore.addOperatorLog('mitigation', `Batch mitigation: ${results.filter((r) => r.success).length}/${nodeIds.length} nodes`, {
        nodeCount: nodeIds.length,
        actionType: actionType || 'batch',
        successful: results.filter((r) => r.success).length,
    }, operator);
    res.json({
        success: true,
        message: `Mitigated ${results.filter((r) => r.success).length}/${nodeIds.length} nodes`,
        data: results,
        timestamp: new Date().toISOString(),
    });
}));
/**
 * POST /api/actions/mitigate/critical
 * Mitigate all critical nodes
 */
router.post('/mitigate/critical', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { operator } = zod_1.z.object({
        operator: zod_1.z.string().optional(),
    }).parse(req.body || {});
    const sim = (0, simulation_js_1.getSimulation)();
    const state = sim.getSystemState();
    const results = [];
    for (const nodeId of state.criticalNodes) {
        const node = sim.getNode(nodeId);
        if (!node)
            continue;
        const riskBefore = node.riskScore;
        const result = sim.mitigate(nodeId, 'auto-critical');
        index_js_1.mitigationsRepo.insert.run({
            id: (0, uuid_1.v4)(),
            nodeId,
            nodeName: result.node,
            actions: JSON.stringify(result.actions),
            riskBefore,
            riskAfter: result.updatedNode.riskScore,
            riskReduction: result.riskReduction,
            success: result.success ? 1 : 0,
            triggeredBy: 'auto-critical',
        });
        results.push({
            nodeId,
            nodeName: result.node,
            success: result.success,
            riskReduction: result.riskReduction,
        });
    }
    // Log the critical mitigation
    index_js_2.logStore.addOperatorLog('mitigation', `Critical mitigation: ${results.length} nodes addressed`, {
        nodeCount: results.length,
    }, operator);
    res.json({
        success: true,
        message: `Mitigated ${results.length} critical nodes`,
        data: results,
        timestamp: new Date().toISOString(),
    });
}));
/**
 * PUT /api/actions/auto-mitigation
 * Enable/disable auto-mitigation
 */
router.put('/auto-mitigation', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { enabled } = autoMitigationSchema.parse(req.body);
    const sim = (0, simulation_js_1.getSimulation)();
    sim.setAutoMitigation(enabled);
    // Log config change
    index_js_2.logStore.addOperatorLog('config', `Auto-mitigation ${enabled ? 'enabled' : 'disabled'}`);
    res.json({
        success: true,
        message: `Auto-mitigation ${enabled ? 'enabled' : 'disabled'}`,
        autoMitigation: enabled,
        timestamp: new Date().toISOString(),
    });
}));
/**
 * GET /api/actions/history
 * Get mitigation history
 */
router.get('/history', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { nodeId, limit } = req.query;
    let mitigations;
    if (nodeId && typeof nodeId === 'string') {
        mitigations = index_js_1.mitigationsRepo.getByNode.all(nodeId);
    }
    else {
        mitigations = index_js_1.mitigationsRepo.getAll.all();
    }
    if (limit) {
        mitigations = mitigations.slice(0, parseInt(limit, 10));
    }
    res.json({
        success: true,
        count: mitigations.length,
        data: mitigations.map((m) => ({
            ...m,
            actions: JSON.parse(m.actions),
            success: m.success === 1,
        })),
        timestamp: new Date().toISOString(),
    });
}));
exports.default = router;
//# sourceMappingURL=actions.js.map