"use strict";
/**
 * Sentinel Grid Backend - Predictions Routes
 * GET /api/predictions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const simulation_js_1 = require("../services/simulation.js");
const index_js_1 = require("../db/index.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
/**
 * GET /api/predictions
 * Get current predictions
 */
router.get('/', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const predictions = sim.getPredictions();
    // Query params for filtering
    const { type, severity, minProbability, nodeId, limit } = req.query;
    let filtered = predictions;
    if (type) {
        filtered = filtered.filter((p) => p.type === type);
    }
    if (severity) {
        filtered = filtered.filter((p) => p.severity === severity);
    }
    if (minProbability) {
        const min = parseFloat(minProbability);
        filtered = filtered.filter((p) => p.probability >= min);
    }
    if (nodeId) {
        filtered = filtered.filter((p) => p.nodeId === nodeId);
    }
    if (limit) {
        filtered = filtered.slice(0, parseInt(limit, 10));
    }
    res.json({
        success: true,
        count: filtered.length,
        data: filtered,
    });
}));
/**
 * GET /api/predictions/patterns
 * Get detected patterns
 */
router.get('/patterns', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const patterns = sim.getPatterns();
    res.json({
        success: true,
        count: patterns.length,
        data: patterns,
    });
}));
/**
 * GET /api/predictions/accuracy
 * Get prediction accuracy metrics
 */
router.get('/accuracy', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const metrics = sim.getAccuracyMetrics();
    res.json({
        success: true,
        data: metrics,
    });
}));
/**
 * GET /api/predictions/history
 * Get historical predictions from database
 */
router.get('/history', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { status } = req.query;
    let predictions;
    if (status === 'active') {
        predictions = index_js_1.predictionsRepo.getActive.all();
    }
    else {
        predictions = index_js_1.predictionsRepo.getAll.all();
    }
    res.json({
        success: true,
        count: predictions.length,
        data: predictions,
    });
}));
/**
 * POST /api/predictions/save
 * Save current predictions to database
 */
router.post('/save', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const predictions = sim.getPredictions();
    let saved = 0;
    for (const pred of predictions) {
        try {
            index_js_1.predictionsRepo.insert.run({
                id: pred.id || (0, uuid_1.v4)(),
                nodeId: pred.nodeId,
                nodeName: pred.nodeName,
                type: pred.type,
                probability: pred.probability,
                confidence: pred.confidence,
                hoursToEvent: pred.hoursToEvent,
                predictedTime: pred.predictedTime.toISOString(),
                severity: pred.severity,
                reasoning: pred.reasoning,
                contributingFactors: JSON.stringify(pred.contributingFactors),
                suggestedActions: JSON.stringify(pred.suggestedActions),
                status: pred.status,
                createdAt: pred.createdAt.toISOString(),
            });
            saved++;
        }
        catch (error) {
            // Skip duplicates
            console.warn(`Failed to save prediction ${pred.id}:`, error);
        }
    }
    res.json({
        success: true,
        message: `Saved ${saved} predictions`,
        saved,
        total: predictions.length,
    });
}));
/**
 * GET /api/predictions/:id
 * Get single prediction
 */
router.get('/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const prediction = index_js_1.predictionsRepo.getById.get(req.params.id);
    if (!prediction) {
        throw (0, errorHandler_js_1.createError)(404, `Prediction ${req.params.id} not found`);
    }
    res.json({
        success: true,
        data: prediction,
    });
}));
/**
 * PUT /api/predictions/:id/resolve
 * Mark prediction as resolved
 */
router.put('/:id/resolve', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { wasAccurate } = req.body;
    const prediction = index_js_1.predictionsRepo.getById.get(req.params.id);
    if (!prediction) {
        throw (0, errorHandler_js_1.createError)(404, `Prediction ${req.params.id} not found`);
    }
    index_js_1.predictionsRepo.updateStatus.run('resolved', new Date().toISOString(), wasAccurate ? 1 : 0, req.params.id);
    res.json({
        success: true,
        message: 'Prediction resolved',
    });
}));
exports.default = router;
//# sourceMappingURL=predictions.js.map