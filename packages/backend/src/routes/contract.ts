/**
 * Sentinel Grid Backend - Contract Routes
 * Blockchain interaction endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { getContract, initializeContract } from '../services/contract.js';
import { anchorsRepo } from '../db/index.js';
import { config } from '../config.js';

const router = Router();

// Middleware to check if blockchain features are enabled
const requireBlockchain = (req: Request, res: Response, next: NextFunction) => {
  if (!config.blockchainEnabled) {
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
const connectSchema = z.object({
  chain: z.enum(['local', 'base', 'optimism']).default('local'),
});

const submitAnchorSchema = z.object({
  anchorId: z.string().uuid(),
});

const verifyHashSchema = z.object({
  payloadHash: z.string().min(64).max(66),
});

const mintSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenURI: z.string().url(),
});

// ============================================================================
// Connection Endpoints
// ============================================================================

/**
 * POST /api/contract/connect
 * Connect to a blockchain
 */
router.post('/connect', asyncHandler(async (req: Request, res: Response) => {
  const { chain } = connectSchema.parse(req.body);
  
  const contract = await initializeContract(chain);
  
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
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const contract = getContract();
  
  let balance: string | null = null;
  let gasPrice: string | null = null;
  
  if (contract.isConnected() && contract.getAddress()) {
    try {
      balance = await contract.getBalance();
      gasPrice = await contract.getGasPrice();
    } catch {
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
router.post('/disconnect', asyncHandler(async (_req: Request, res: Response) => {
  const contract = getContract();
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
router.post('/anchor/submit', asyncHandler(async (req: Request, res: Response) => {
  const { anchorId } = submitAnchorSchema.parse(req.body);
  
  const contract = getContract();
  if (!contract.isConnected()) {
    throw createError(400, 'Not connected to blockchain. Call POST /api/contract/connect first.');
  }
  
  // Get anchor from database
  const anchor = anchorsRepo.getById.get(anchorId) as any;
  if (!anchor) {
    throw createError(404, `Anchor ${anchorId} not found`);
  }
  
  if (anchor.status === 'confirmed') {
    throw createError(400, `Anchor ${anchorId} already confirmed with tx: ${anchor.txHash}`);
  }
  
  // Submit to blockchain
  const result = await contract.anchor(
    anchor.payloadHash,
    anchor.ipfsCid || ''
  );
  
  // Update anchor record
  anchorsRepo.updateStatus.run(
    'confirmed',
    result.txHash,
    result.timestamp.toISOString(),
    anchorId
  );
  
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
router.post('/anchor/verify', asyncHandler(async (req: Request, res: Response) => {
  const { payloadHash } = verifyHashSchema.parse(req.body);
  
  const contract = getContract();
  if (!contract.isConnected()) {
    throw createError(400, 'Not connected to blockchain');
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
router.get('/anchor/:hash', asyncHandler(async (req: Request, res: Response) => {
  const contract = getContract();
  if (!contract.isConnected()) {
    throw createError(400, 'Not connected to blockchain');
  }
  
  const anchor = await contract.getAnchor(req.params.hash);
  
  if (!anchor) {
    throw createError(404, 'Anchor not found on chain');
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
router.post('/anchor/estimate', asyncHandler(async (req: Request, res: Response) => {
  const { payloadHash } = verifyHashSchema.parse(req.body);
  const ipfsCid = (req.body.ipfsCid as string) || '';
  
  const contract = getContract();
  if (!contract.isConnected()) {
    throw createError(400, 'Not connected to blockchain');
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
router.post('/nft/mint', asyncHandler(async (req: Request, res: Response) => {
  const { to, tokenURI } = mintSchema.parse(req.body);
  
  const contract = getContract();
  if (!contract.isConnected()) {
    throw createError(400, 'Not connected to blockchain');
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
router.get('/nft/:tokenId', asyncHandler(async (req: Request, res: Response) => {
  const contract = getContract();
  if (!contract.isConnected()) {
    throw createError(400, 'Not connected to blockchain');
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
router.post('/anchor/submit-pending', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const contract = getContract();
  if (!contract.isConnected()) {
    throw createError(400, 'Not connected to blockchain');
  }
  
  const pending = anchorsRepo.getPending.all() as any[];
  
  if (pending.length === 0) {
    res.json({
      success: true,
      message: 'No pending anchors',
      data: { submitted: 0 },
    });
    return;
  }
  
  const results: Array<{ anchorId: string; txHash?: string; error?: string }> = [];
  
  for (const anchor of pending) {
    try {
      const result = await contract.anchor(
        anchor.payloadHash,
        anchor.ipfsCid || ''
      );
      
      anchorsRepo.updateStatus.run(
        'confirmed',
        result.txHash,
        result.timestamp.toISOString(),
        anchor.id
      );
      
      results.push({ anchorId: anchor.id, txHash: result.txHash });
    } catch (error) {
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

export default router;
