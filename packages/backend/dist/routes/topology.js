"use strict";
/**
 * Sentinel Grid Backend - Topology Routes
 * GET /api/topology, POST /api/topology/import
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_js_1 = require("../stores/index.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const router = (0, express_1.Router)();
// Validation schemas
const topologyNodeSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    region: zod_1.z.string().min(1),
    voltage: zod_1.z.string().optional(),
    type: zod_1.z.string().min(1),
});
const topologyEdgeSchema = zod_1.z.object({
    from: zod_1.z.string().min(1),
    to: zod_1.z.string().min(1),
    capacity: zod_1.z.number().min(0),
});
const importTopologySchema = zod_1.z.object({
    nodes: zod_1.z.array(topologyNodeSchema).min(1),
    edges: zod_1.z.array(topologyEdgeSchema),
});
/**
 * GET /api/topology
 * Get the active topology
 */
router.get('/', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const topology = index_js_1.topologyStore.get();
    if (!topology) {
        res.json({
            success: true,
            message: 'No custom topology imported, using default',
            data: null,
        });
        return;
    }
    res.json({
        success: true,
        data: {
            nodes: topology.nodes,
            edges: topology.edges,
            importedAt: topology.importedAt,
            nodeCount: topology.nodes.length,
            edgeCount: topology.edges.length,
        },
    });
}));
/**
 * POST /api/topology/import
 * Import a new topology
 */
router.post('/import', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { nodes, edges } = importTopologySchema.parse(req.body);
    // Validate that all edge endpoints exist in nodes
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
        if (!nodeIds.has(edge.from)) {
            throw (0, errorHandler_js_1.createError)(400, `Edge references non-existent node: ${edge.from}`);
        }
        if (!nodeIds.has(edge.to)) {
            throw (0, errorHandler_js_1.createError)(400, `Edge references non-existent node: ${edge.to}`);
        }
    }
    // Store the topology
    index_js_1.topologyStore.set({ nodes, edges });
    // Log the import
    index_js_1.logStore.addOperatorLog('config', `Topology imported: ${nodes.length} nodes, ${edges.length} edges`, {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        regions: [...new Set(nodes.map((n) => n.region))],
    });
    res.json({
        success: true,
        message: `Topology imported: ${nodes.length} nodes, ${edges.length} edges`,
        data: {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            importedAt: new Date().toISOString(),
        },
    });
}));
/**
 * DELETE /api/topology
 * Clear the custom topology (revert to default)
 */
router.delete('/', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    index_js_1.topologyStore.clear();
    index_js_1.logStore.addOperatorLog('config', 'Custom topology cleared, reverted to default');
    res.json({
        success: true,
        message: 'Topology cleared, reverted to default',
    });
}));
/**
 * GET /api/topology/summary
 * Get topology summary statistics
 */
router.get('/summary', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const topology = index_js_1.topologyStore.get();
    if (!topology) {
        res.json({
            success: true,
            data: {
                source: 'default',
                nodeCount: 200, // Default count
                edgeCount: 0,
                regions: [],
            },
        });
        return;
    }
    // Calculate summary statistics
    const regions = [...new Set(topology.nodes.map((n) => n.region))];
    const nodeTypes = [...new Set(topology.nodes.map((n) => n.type))];
    const avgCapacity = topology.edges.length > 0
        ? topology.edges.reduce((sum, e) => sum + e.capacity, 0) / topology.edges.length
        : 0;
    res.json({
        success: true,
        data: {
            source: 'imported',
            nodeCount: topology.nodes.length,
            edgeCount: topology.edges.length,
            regions,
            nodeTypes,
            avgCapacity: Math.round(avgCapacity),
            importedAt: topology.importedAt,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=topology.js.map