/**
 * Sentinel Grid Backend - Anchor Routes
 * POST /api/anchor, GET /api/anchors
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { anchorsRepo, auditRepo } from '../db/index.js';
import { getStorage } from '../services/storage.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import { createAuditHash } from '@sentinel-grid/predictive-engine';
import { config } from '../config.js';

const router = Router();

// Validation schemas
const anchorSchema = z.object({
  payloadHash: z.string().min(1),
  ipfsCid: z.string().optional(),
  chain: z.enum(['base', 'optimism', 'local']).optional().default('base'),
  metadata: z.record(z.unknown()).optional(),
});

const pinSchema = z.object({
  payload: z.record(z.unknown()),
  encrypt: z.boolean().optional().default(false),
});

/**
 * POST /api/anchor
 * Create an anchor record (queued for on-chain submission)
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { payloadHash, ipfsCid, chain, metadata } = anchorSchema.parse(req.body);
  
  const anchorId = uuidv4();
  
  // Save anchor record
  anchorsRepo.insert.run({
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
  
  auditRepo.insert.run({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type: 'anchor_created',
    hash: createAuditHash(auditData),
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
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, chain } = req.query;
  
  let anchors;
  if (status === 'pending') {
    anchors = anchorsRepo.getPending.all();
  } else {
    anchors = anchorsRepo.getAll.all();
  }
  
  // Filter by chain if specified
  if (chain) {
    anchors = (anchors as any[]).filter((a) => a.chain === chain);
  }
  
  res.json({
    success: true,
    count: anchors.length,
    data: (anchors as any[]).map((a) => ({
      ...a,
      metadata: a.metadata ? JSON.parse(a.metadata) : null,
    })),
  });
}));

/**
 * GET /api/anchors/:id
 * Get single anchor
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const anchor = anchorsRepo.getById.get(req.params.id) as any;
  
  if (!anchor) {
    throw createError(404, `Anchor ${req.params.id} not found`);
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
router.put('/:id/confirm', asyncHandler(async (req: Request, res: Response) => {
  const { txHash } = z.object({
    txHash: z.string().min(1),
  }).parse(req.body);
  
  const anchor = anchorsRepo.getById.get(req.params.id);
  if (!anchor) {
    throw createError(404, `Anchor ${req.params.id} not found`);
  }
  
  anchorsRepo.updateStatus.run(
    'confirmed',
    txHash,
    new Date().toISOString(),
    req.params.id
  );
  
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
export const pinHandler = asyncHandler(async (req: Request, res: Response) => {
  const { payload, encrypt } = pinSchema.parse(req.body);
  
  const storage = getStorage();
  
  let dataToPin = payload;
  let isEncrypted = false;
  
  if (encrypt) {
    dataToPin = storage.encrypt(payload) as unknown as Record<string, unknown>;
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
  
  auditRepo.insert.run({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type: 'pin_created',
    hash: createAuditHash(auditData),
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

router.post('/pin', pinHandler);

/**
 * POST /api/verify
 * Verify a signature
 */
export const verifyHandler = asyncHandler(async (req: Request, res: Response) => {
  const { hash, signature } = z.object({
    hash: z.string().min(1),
    signature: z.string().min(1),
  }).parse(req.body);
  
  const storage = getStorage();
  const valid = storage.verify(hash, signature);
  
  res.json({
    success: true,
    valid,
  });
});

router.post('/verify', verifyHandler);

export default router;
