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
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const uuid_1 = require("uuid");
const predictive_engine_1 = require("@sentinel-grid/predictive-engine");
const router = (0, express_1.Router)();
// Validation schemas
const mitigateSchema = zod_1.z.object({
    nodeId: zod_1.z.string().min(1),
    action: zod_1.z.string().optional(),
});
const autoMitigationSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
});
/**
 * POST /api/actions/mitigate
 * Apply mitigation to a node
 */
router.post('/mitigate', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { nodeId } = mitigateSchema.parse(req.body);
    const sim = (0, simulation_js_1.getSimulation)();
    const node = sim.getNode(nodeId);
    if (!node) {
        throw (0, errorHandler_js_1.createError)(404, `Node ${nodeId} not found`);
    }
    const riskBefore = node.riskScore;
    // Apply mitigation
    const result = sim.mitigate(nodeId, 'manual');
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
        triggeredBy: 'manual',
    });
    // Create audit entry
    const auditData = {
        type: 'manual_mitigation',
        nodeId,
        nodeName: result.node,
        success: result.success,
        riskReduction: result.riskReduction,
        actions: result.actions,
    };
    index_js_1.auditRepo.insert.run({
        id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        type: 'manual_mitigation',
        hash: (0, predictive_engine_1.createAuditHash)(auditData),
        actor: 'operator',
        dataSummary: JSON.stringify(auditData),
    });
    res.json({
        success: true,
        data: {
            nodeId,
            nodeName: result.node,
            mitigationSuccess: result.success,
            riskBefore,
            riskAfter: result.updatedNode.riskScore,
            riskReduction: result.riskReduction,
            actions: result.actions,
            updatedNode: result.updatedNode,
        },
    });
}));
/**
 * POST /api/actions/mitigate/batch
 * Mitigate multiple nodes
 */
router.post('/mitigate/batch', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { nodeIds } = zod_1.z.object({
        nodeIds: zod_1.z.array(zod_1.z.string()).min(1).max(50),
    }).parse(req.body);
    const sim = (0, simulation_js_1.getSimulation)();
    const results = [];
    for (const nodeId of nodeIds) {
        const node = sim.getNode(nodeId);
        if (!node)
            continue;
        const riskBefore = node.riskScore;
        const result = sim.mitigate(nodeId, 'batch');
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
            triggeredBy: 'batch',
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
        count: results.length,
        successful: results.filter((r) => r.success).length,
    };
    index_js_1.auditRepo.insert.run({
        id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        type: 'batch_mitigation',
        hash: (0, predictive_engine_1.createAuditHash)(auditData),
        actor: 'operator',
        dataSummary: JSON.stringify(auditData),
    });
    res.json({
        success: true,
        message: `Mitigated ${results.filter((r) => r.success).length}/${nodeIds.length} nodes`,
        data: results,
    });
}));
/**
 * POST /api/actions/mitigate/critical
 * Mitigate all critical nodes
 */
router.post('/mitigate/critical', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
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
    res.json({
        success: true,
        message: `Mitigated ${results.length} critical nodes`,
        data: results,
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
    res.json({
        success: true,
        message: `Auto-mitigation ${enabled ? 'enabled' : 'disabled'}`,
        autoMitigation: enabled,
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
    });
}));
exports.default = router;
//# sourceMappingURL=actions.js.map