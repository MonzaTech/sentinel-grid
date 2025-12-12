"use strict";
/**
 * Sentinel Grid Backend - Incidents Routes
 * GET /api/incidents, GET /api/incidents/:id, POST /api/incidents/:id/anchor
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_js_1 = require("../stores/index.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const config_js_1 = require("../config.js");
const predictive_engine_1 = require("@sentinel-grid/predictive-engine");
const router = (0, express_1.Router)();
// Validation schemas
const updateIncidentSchema = zod_1.z.object({
    status: zod_1.z.enum(['open', 'mitigated', 'closed']).optional(),
    endedAt: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    rootCause: zod_1.z.string().optional(),
});
const addMitigationSchema = zod_1.z.object({
    actionType: zod_1.z.string().min(1),
    details: zod_1.z.string().min(1),
});
/**
 * GET /api/incidents
 * List all incidents
 */
router.get('/', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { status, limit } = req.query;
    let incidents = index_js_1.incidentStore.getAll();
    // Filter by status if provided
    if (status && typeof status === 'string') {
        incidents = incidents.filter((i) => i.status === status);
    }
    // Limit results if provided
    if (limit && typeof limit === 'string') {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
            incidents = incidents.slice(0, limitNum);
        }
    }
    res.json({
        success: true,
        count: incidents.length,
        data: incidents,
    });
}));
/**
 * GET /api/incidents/:id
 * Get a specific incident
 */
router.get('/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const incident = index_js_1.incidentStore.getById(id);
    if (!incident) {
        throw (0, errorHandler_js_1.createError)(404, `Incident ${id} not found`);
    }
    res.json({
        success: true,
        data: incident,
    });
}));
/**
 * PATCH /api/incidents/:id
 * Update an incident
 */
router.patch('/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updates = updateIncidentSchema.parse(req.body);
    const incident = index_js_1.incidentStore.update(id, updates);
    if (!incident) {
        throw (0, errorHandler_js_1.createError)(404, `Incident ${id} not found`);
    }
    index_js_1.logStore.addOperatorLog('incident', `Incident ${id} updated`, {
        incidentId: id,
        updates,
    });
    res.json({
        success: true,
        message: `Incident ${id} updated`,
        data: incident,
    });
}));
/**
 * POST /api/incidents/:id/mitigation
 * Add a mitigation action to an incident
 */
router.post('/:id/mitigation', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { actionType, details } = addMitigationSchema.parse(req.body);
    const action = {
        at: new Date().toISOString(),
        actionType,
        details,
        automated: false,
    };
    const incident = index_js_1.incidentStore.addMitigationAction(id, action);
    if (!incident) {
        throw (0, errorHandler_js_1.createError)(404, `Incident ${id} not found`);
    }
    index_js_1.logStore.addOperatorLog('mitigation', `Mitigation action added to incident ${id}`, {
        incidentId: id,
        action,
    });
    res.json({
        success: true,
        message: `Mitigation action added to incident ${id}`,
        data: incident,
    });
}));
/**
 * POST /api/incidents/:id/close
 * Close an incident
 */
router.post('/:id/close', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const incident = index_js_1.incidentStore.update(id, {
        status: 'closed',
        endedAt: new Date().toISOString(),
    });
    if (!incident) {
        throw (0, errorHandler_js_1.createError)(404, `Incident ${id} not found`);
    }
    index_js_1.logStore.addOperatorLog('incident', `Incident ${id} closed`, { incidentId: id });
    res.json({
        success: true,
        message: `Incident ${id} closed`,
        data: incident,
    });
}));
/**
 * POST /api/incidents/:id/anchor
 * Anchor incident record on Optimism blockchain
 */
router.post('/:id/anchor', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const incident = index_js_1.incidentStore.getById(id);
    if (!incident) {
        throw (0, errorHandler_js_1.createError)(404, `Incident ${id} not found`);
    }
    // Check if already anchored
    if (incident.onChain?.anchored) {
        res.json({
            success: true,
            message: `Incident ${id} is already anchored`,
            data: incident,
        });
        return;
    }
    // Create payload for anchoring
    const anchorPayload = {
        incidentId: incident.id,
        startedAt: incident.startedAt,
        endedAt: incident.endedAt,
        severity: incident.severity,
        affectedNodes: incident.affectedNodes.length,
        summary: incident.summary,
        rootCause: incident.rootCause,
        mitigationCount: incident.mitigationActions.length,
        status: incident.status,
        anchoredAt: new Date().toISOString(),
    };
    // Create hash of payload
    const { sha256: payloadHash, signature } = (0, predictive_engine_1.createSignedHash)(anchorPayload, config_js_1.config.hmacKey);
    // Simulate IPFS pinning and blockchain anchoring
    // In production, this would call actual services
    const mockCid = `bafybeig${payloadHash.slice(0, 44).toLowerCase()}`;
    const mockTxHash = `0x${payloadHash.slice(0, 64)}`;
    const onChain = {
        anchored: true,
        chain: 'optimism',
        txHash: mockTxHash,
        payloadHash,
        ipfsCid: mockCid,
    };
    // Update incident with on-chain data
    const updatedIncident = index_js_1.incidentStore.update(id, { onChain });
    // Log the anchoring
    index_js_1.logStore.addOperatorLog('anchor', `Incident ${id} anchored on Optimism`, {
        incidentId: id,
        chain: 'optimism',
        txHash: mockTxHash,
        ipfsCid: mockCid,
    });
    res.json({
        success: true,
        message: `Incident ${id} anchored on Optimism`,
        data: updatedIncident,
        anchor: {
            chain: 'optimism',
            txHash: mockTxHash,
            ipfsCid: mockCid,
            payloadHash,
            signature,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=incidents.js.map