"use strict";
/**
 * Sentinel Grid Backend - Nodes Routes
 * GET /api/nodes, /api/nodes/:id
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const simulation_js_1 = require("../services/simulation.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const router = (0, express_1.Router)();
/**
 * GET /api/nodes
 * List all nodes with optional filtering
 */
router.get('/', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const nodes = sim.getNodes();
    // Query params for filtering
    const { region, type, status, minRisk, maxRisk, limit } = req.query;
    let nodeList = Object.values(nodes);
    // Apply filters
    if (region) {
        nodeList = nodeList.filter((n) => n.region === region);
    }
    if (type) {
        nodeList = nodeList.filter((n) => n.type === type);
    }
    if (status) {
        nodeList = nodeList.filter((n) => n.status === status);
    }
    if (minRisk) {
        const min = parseFloat(minRisk);
        nodeList = nodeList.filter((n) => n.riskScore >= min);
    }
    if (maxRisk) {
        const max = parseFloat(maxRisk);
        nodeList = nodeList.filter((n) => n.riskScore <= max);
    }
    // Sort by risk score descending
    nodeList.sort((a, b) => b.riskScore - a.riskScore);
    // Apply limit
    if (limit) {
        nodeList = nodeList.slice(0, parseInt(limit, 10));
    }
    res.json({
        success: true,
        count: nodeList.length,
        total: Object.keys(nodes).length,
        data: nodeList,
    });
}));
/**
 * GET /api/nodes/summary
 * Get summary statistics
 */
router.get('/summary', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const nodes = sim.getNodes();
    const nodeList = Object.values(nodes);
    // Count by status
    const byStatus = nodeList.reduce((acc, n) => {
        acc[n.status] = (acc[n.status] || 0) + 1;
        return acc;
    }, {});
    // Count by region
    const byRegion = nodeList.reduce((acc, n) => {
        acc[n.region] = (acc[n.region] || 0) + 1;
        return acc;
    }, {});
    // Count by type
    const byType = nodeList.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
    }, {});
    // Risk distribution
    const riskBuckets = {
        low: nodeList.filter((n) => n.riskScore < 0.3).length,
        medium: nodeList.filter((n) => n.riskScore >= 0.3 && n.riskScore < 0.6).length,
        high: nodeList.filter((n) => n.riskScore >= 0.6 && n.riskScore < 0.8).length,
        critical: nodeList.filter((n) => n.riskScore >= 0.8).length,
    };
    // Average metrics
    const avgRisk = nodeList.reduce((sum, n) => sum + n.riskScore, 0) / nodeList.length;
    const avgHealth = nodeList.reduce((sum, n) => sum + n.health, 0) / nodeList.length;
    const avgLoad = nodeList.reduce((sum, n) => sum + n.loadRatio, 0) / nodeList.length;
    res.json({
        success: true,
        data: {
            total: nodeList.length,
            byStatus,
            byRegion,
            byType,
            riskDistribution: riskBuckets,
            averages: {
                risk: avgRisk,
                health: avgHealth,
                load: avgLoad,
            },
        },
    });
}));
/**
 * GET /api/nodes/critical
 * Get critical nodes
 */
router.get('/critical', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const state = sim.getSystemState();
    const nodes = sim.getNodes();
    const criticalNodes = state.criticalNodes.map((id) => nodes[id]).filter(Boolean);
    res.json({
        success: true,
        count: criticalNodes.length,
        data: criticalNodes,
    });
}));
/**
 * GET /api/nodes/:id
 * Get single node by ID
 */
router.get('/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const node = sim.getNode(req.params.id);
    if (!node) {
        throw (0, errorHandler_js_1.createError)(404, `Node ${req.params.id} not found`);
    }
    res.json({
        success: true,
        data: node,
    });
}));
/**
 * GET /api/nodes/:id/connections
 * Get node connections
 */
router.get('/:id/connections', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const node = sim.getNode(req.params.id);
    if (!node) {
        throw (0, errorHandler_js_1.createError)(404, `Node ${req.params.id} not found`);
    }
    const nodes = sim.getNodes();
    const connections = node.connections
        .map((id) => nodes[id])
        .filter(Boolean);
    res.json({
        success: true,
        nodeId: req.params.id,
        count: connections.length,
        data: connections,
    });
}));
exports.default = router;
//# sourceMappingURL=nodes.js.map