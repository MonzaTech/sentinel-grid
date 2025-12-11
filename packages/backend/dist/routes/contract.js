"use strict";
/**
 * Sentinel Grid Backend - Contract Routes
 * Blockchain interaction endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const contract_js_1 = require("../services/contract.js");
const index_js_1 = require("../db/index.js");
const config_js_1 = require("../config.js");
const router = (0, express_1.Router)();
// Middleware to check if blockchain features are enabled
const requireBlockchain = (req, res, next) => {
    if (!config_js_1.config.blockchainEnabled) {
        res.status(501).json({
            success: false,
            message: 'Blockchain features disabled. Set ENABLE_BLOCKCHAIN=true to enable.',
            hint: 'For demo mode, audit logging still works without blockchain.',
        });
        return;
    }
    next();
};
// Apply blockchain check to all routes in this router
router.use(requireBlockchain);
// Validation schemas
const connectSchema = zod_1.z.object({
    chain: zod_1.z.enum(['local', 'base', 'optimism']).default('local'),
});
const submitAnchorSchema = zod_1.z.object({
    anchorId: zod_1.z.string().uuid(),
});
const verifyHashSchema = zod_1.z.object({
    payloadHash: zod_1.z.string().min(64).max(66),
});
const mintSchema = zod_1.z.object({
    to: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    tokenURI: zod_1.z.string().url(),
});
// ============================================================================
// Connection Endpoints
// ============================================================================
/**
 * POST /api/contract/connect
 * Connect to a blockchain
 */
router.post('/connect', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { chain } = connectSchema.parse(req.body);
    const contract = await (0, contract_js_1.initializeContract)(chain);
    res.json({
        success: true,
        data: {
            chain: contract.getChain()?.name,
            chainId: contract.getChain()?.chainId,
            address: contract.getAddress(),
            connected: contract.isConnected(),
        },
    });
}));
/**
 * GET /api/contract/status
 * Get connection status
 */
router.get('/status', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const contract = (0, contract_js_1.getContract)();
    let balance = null;
    let gasPrice = null;
    if (contract.isConnected() && contract.getAddress()) {
        try {
            balance = await contract.getBalance();
            gasPrice = await contract.getGasPrice();
        }
        catch {
            // Ignore errors, just report null
        }
    }
    res.json({
        success: true,
        data: {
            connected: contract.isConnected(),
            chain: contract.getChain(),
            address: contract.getAddress(),
            balance: balance ? `${balance} ETH` : null,
            gasPrice: gasPrice ? `${gasPrice} gwei` : null,
        },
    });
}));
/**
 * POST /api/contract/disconnect
 * Disconnect from blockchain
 */
router.post('/disconnect', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const contract = (0, contract_js_1.getContract)();
    contract.disconnect();
    res.json({
        success: true,
        message: 'Disconnected from blockchain',
    });
}));
// ============================================================================
// Anchor Endpoints
// ============================================================================
/**
 * POST /api/contract/anchor/submit
 * Submit a pending anchor to the blockchain
 */
router.post('/anchor/submit', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { anchorId } = submitAnchorSchema.parse(req.body);
    const contract = (0, contract_js_1.getContract)();
    if (!contract.isConnected()) {
        throw (0, errorHandler_js_1.createError)(400, 'Not connected to blockchain. Call POST /api/contract/connect first.');
    }
    // Get anchor from database
    const anchor = index_js_1.anchorsRepo.getById.get(anchorId);
    if (!anchor) {
        throw (0, errorHandler_js_1.createError)(404, `Anchor ${anchorId} not found`);
    }
    if (anchor.status === 'confirmed') {
        throw (0, errorHandler_js_1.createError)(400, `Anchor ${anchorId} already confirmed with tx: ${anchor.txHash}`);
    }
    // Submit to blockchain
    const result = await contract.anchor(anchor.payloadHash, anchor.ipfsCid || '');
    // Update anchor record
    index_js_1.anchorsRepo.updateStatus.run('confirmed', result.txHash, result.timestamp.toISOString(), anchorId);
    res.json({
        success: true,
        message: 'Anchor submitted to blockchain',
        data: {
            anchorId,
            txHash: result.txHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
        },
    });
}));
/**
 * POST /api/contract/anchor/verify
 * Verify an anchor exists on-chain
 */
router.post('/anchor/verify', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { payloadHash } = verifyHashSchema.parse(req.body);
    const contract = (0, contract_js_1.getContract)();
    if (!contract.isConnected()) {
        throw (0, errorHandler_js_1.createError)(400, 'Not connected to blockchain');
    }
    const result = await contract.verify(payloadHash);
    res.json({
        success: true,
        data: {
            payloadHash,
            onChain: result.exists,
            timestamp: result.timestamp?.toISOString() ?? null,
            submitter: result.submitter,
        },
    });
}));
/**
 * GET /api/contract/anchor/:hash
 * Get anchor details from blockchain
 */
router.get('/anchor/:hash', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const contract = (0, contract_js_1.getContract)();
    if (!contract.isConnected()) {
        throw (0, errorHandler_js_1.createError)(400, 'Not connected to blockchain');
    }
    const anchor = await contract.getAnchor(req.params.hash);
    if (!anchor) {
        throw (0, errorHandler_js_1.createError)(404, 'Anchor not found on chain');
    }
    res.json({
        success: true,
        data: {
            payloadHash: anchor.payloadHash,
            ipfsCid: anchor.ipfsCid,
            timestamp: anchor.timestamp.toISOString(),
            submitter: anchor.submitter,
        },
    });
}));
/**
 * POST /api/contract/anchor/estimate
 * Estimate gas for anchor submission
 */
router.post('/anchor/estimate', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { payloadHash } = verifyHashSchema.parse(req.body);
    const ipfsCid = req.body.ipfsCid || '';
    const contract = (0, contract_js_1.getContract)();
    if (!contract.isConnected()) {
        throw (0, errorHandler_js_1.createError)(400, 'Not connected to blockchain');
    }
    const gasEstimate = await contract.estimateAnchorGas(payloadHash, ipfsCid);
    const gasPrice = await contract.getGasPrice();
    // Calculate cost in ETH (estimate)
    const gasPriceWei = parseFloat(gasPrice) * 1e9;
    const costWei = parseInt(gasEstimate) * gasPriceWei;
    const costEth = costWei / 1e18;
    res.json({
        success: true,
        data: {
            gasEstimate,
            gasPrice: `${gasPrice} gwei`,
            estimatedCost: `${costEth.toFixed(8)} ETH`,
        },
    });
}));
// ============================================================================
// NFT Endpoints
// ============================================================================
/**
 * POST /api/contract/nft/mint
 * Mint a sensor asset NFT
 */
router.post('/nft/mint', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { to, tokenURI } = mintSchema.parse(req.body);
    const contract = (0, contract_js_1.getContract)();
    if (!contract.isConnected()) {
        throw (0, errorHandler_js_1.createError)(400, 'Not connected to blockchain');
    }
    const result = await contract.mintSensorAsset(to, tokenURI);
    res.json({
        success: true,
        message: 'NFT minted successfully',
        data: {
            tokenId: result.tokenId,
            owner: result.owner,
            tokenURI: result.tokenURI,
            txHash: result.txHash,
        },
    });
}));
/**
 * GET /api/contract/nft/:tokenId
 * Get NFT details
 */
router.get('/nft/:tokenId', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const contract = (0, contract_js_1.getContract)();
    if (!contract.isConnected()) {
        throw (0, errorHandler_js_1.createError)(400, 'Not connected to blockchain');
    }
    const tokenURI = await contract.getTokenURI(req.params.tokenId);
    res.json({
        success: true,
        data: {
            tokenId: req.params.tokenId,
            tokenURI,
        },
    });
}));
// ============================================================================
// Batch Operations
// ============================================================================
/**
 * POST /api/contract/anchor/submit-pending
 * Submit all pending anchors to blockchain
 */
router.post('/anchor/submit-pending', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const contract = (0, contract_js_1.getContract)();
    if (!contract.isConnected()) {
        throw (0, errorHandler_js_1.createError)(400, 'Not connected to blockchain');
    }
    const pending = index_js_1.anchorsRepo.getPending.all();
    if (pending.length === 0) {
        res.json({
            success: true,
            message: 'No pending anchors',
            data: { submitted: 0 },
        });
        return;
    }
    const results = [];
    for (const anchor of pending) {
        try {
            const result = await contract.anchor(anchor.payloadHash, anchor.ipfsCid || '');
            index_js_1.anchorsRepo.updateStatus.run('confirmed', result.txHash, result.timestamp.toISOString(), anchor.id);
            results.push({ anchorId: anchor.id, txHash: result.txHash });
        }
        catch (error) {
            results.push({
                anchorId: anchor.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    const submitted = results.filter(r => r.txHash).length;
    const failed = results.filter(r => r.error).length;
    res.json({
        success: true,
        message: `Submitted ${submitted}/${pending.length} anchors`,
        data: {
            submitted,
            failed,
            results,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=contract.js.map