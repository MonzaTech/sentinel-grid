"use strict";
/**
 * Sentinel Grid Backend - Anchor Routes
 * POST /api/anchor, GET /api/anchors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyHandler = exports.pinHandler = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const index_js_1 = require("../db/index.js");
const storage_js_1 = require("../services/storage.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const uuid_1 = require("uuid");
const predictive_engine_1 = require("@sentinel-grid/predictive-engine");
const router = (0, express_1.Router)();
// Validation schemas
const anchorSchema = zod_1.z.object({
    payloadHash: zod_1.z.string().min(1),
    ipfsCid: zod_1.z.string().optional(),
    chain: zod_1.z.enum(['base', 'optimism', 'local']).optional().default('base'),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
const pinSchema = zod_1.z.object({
    payload: zod_1.z.record(zod_1.z.unknown()),
    encrypt: zod_1.z.boolean().optional().default(false),
});
/**
 * POST /api/anchor
 * Create an anchor record (queued for on-chain submission)
 */
router.post('/', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { payloadHash, ipfsCid, chain, metadata } = anchorSchema.parse(req.body);
    const anchorId = (0, uuid_1.v4)();
    // Save anchor record
    index_js_1.anchorsRepo.insert.run({
        id: anchorId,
        payloadHash,
        ipfsCid: ipfsCid || undefined,
        chain,
        txHash: undefined,
        status: 'pending',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
    // Create audit entry
    const auditData = {
        type: 'anchor_created',
        anchorId,
        chain,
        payloadHash: payloadHash.slice(0, 16) + '...',
        hasCid: !!ipfsCid,
    };
    index_js_1.auditRepo.insert.run({
        id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        type: 'anchor_created',
        hash: (0, predictive_engine_1.createAuditHash)(auditData),
        actor: 'system',
        dataSummary: JSON.stringify(auditData),
    });
    res.status(201).json({
        success: true,
        message: 'Anchor record created',
        data: {
            id: anchorId,
            payloadHash,
            ipfsCid,
            chain,
            status: 'pending',
        },
    });
}));
/**
 * GET /api/anchors
 * List anchor records
 */
router.get('/', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { status, chain } = req.query;
    let anchors;
    if (status === 'pending') {
        anchors = index_js_1.anchorsRepo.getPending.all();
    }
    else {
        anchors = index_js_1.anchorsRepo.getAll.all();
    }
    // Filter by chain if specified
    if (chain) {
        anchors = anchors.filter((a) => a.chain === chain);
    }
    res.json({
        success: true,
        count: anchors.length,
        data: anchors.map((a) => ({
            ...a,
            metadata: a.metadata ? JSON.parse(a.metadata) : null,
        })),
    });
}));
/**
 * GET /api/anchors/:id
 * Get single anchor
 */
router.get('/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const anchor = index_js_1.anchorsRepo.getById.get(req.params.id);
    if (!anchor) {
        throw (0, errorHandler_js_1.createError)(404, `Anchor ${req.params.id} not found`);
    }
    res.json({
        success: true,
        data: {
            ...anchor,
            metadata: anchor.metadata ? JSON.parse(anchor.metadata) : null,
        },
    });
}));
/**
 * PUT /api/anchors/:id/confirm
 * Confirm anchor with transaction hash
 */
router.put('/:id/confirm', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { txHash } = zod_1.z.object({
        txHash: zod_1.z.string().min(1),
    }).parse(req.body);
    const anchor = index_js_1.anchorsRepo.getById.get(req.params.id);
    if (!anchor) {
        throw (0, errorHandler_js_1.createError)(404, `Anchor ${req.params.id} not found`);
    }
    index_js_1.anchorsRepo.updateStatus.run('confirmed', txHash, new Date().toISOString(), req.params.id);
    res.json({
        success: true,
        message: 'Anchor confirmed',
        txHash,
    });
}));
/**
 * POST /api/pin
 * Pin data to IPFS and return CID + hash
 */
exports.pinHandler = (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { payload, encrypt } = pinSchema.parse(req.body);
    const storage = (0, storage_js_1.getStorage)();
    let dataToPin = payload;
    let isEncrypted = false;
    if (encrypt) {
        dataToPin = storage.encrypt(payload);
        isEncrypted = true;
    }
    const result = await storage.pin(dataToPin);
    // Create audit entry
    const auditData = {
        type: 'pin_created',
        cid: result.cid,
        size: result.size,
        encrypted: isEncrypted,
    };
    index_js_1.auditRepo.insert.run({
        id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        type: 'pin_created',
        hash: (0, predictive_engine_1.createAuditHash)(auditData),
        actor: 'system',
        dataSummary: JSON.stringify(auditData),
    });
    res.json({
        success: true,
        data: {
            ...result,
            encrypted: isEncrypted,
        },
    });
});
router.post('/pin', exports.pinHandler);
/**
 * POST /api/verify
 * Verify a signature
 */
exports.verifyHandler = (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { hash, signature } = zod_1.z.object({
        hash: zod_1.z.string().min(1),
        signature: zod_1.z.string().min(1),
    }).parse(req.body);
    const storage = (0, storage_js_1.getStorage)();
    const valid = storage.verify(hash, signature);
    res.json({
        success: true,
        valid,
    });
});
router.post('/verify', exports.verifyHandler);
exports.default = router;
//# sourceMappingURL=anchor.js.map