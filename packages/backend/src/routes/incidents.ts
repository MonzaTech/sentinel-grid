/**
 * Sentinel Grid Backend - Incidents Routes
 * GET /api/incidents, GET /api/incidents/:id, POST /api/incidents/:id/anchor
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { incidentStore, logStore } from '../stores/index.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { config } from '../config.js';
import { createSignedHash } from '@sentinel-grid/predictive-engine';
import type { OnChainAnchor, MitigationAction } from '../types/index.js';

const router = Router();

// Validation schemas
const updateIncidentSchema = z.object({
  status: z.enum(['open', 'mitigated', 'closed']).optional(),
  endedAt: z.string().optional(),
  summary: z.string().optional(),
  rootCause: z.string().optional(),
});

const addMitigationSchema = z.object({
  actionType: z.string().min(1),
  details: z.string().min(1),
});

/**
 * GET /api/incidents
 * List all incidents
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, limit } = req.query;

  let incidents = incidentStore.getAll();

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
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const incident = incidentStore.getById(id);

  if (!incident) {
    throw createError(404, `Incident ${id} not found`);
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
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = updateIncidentSchema.parse(req.body);

  const incident = incidentStore.update(id, updates);

  if (!incident) {
    throw createError(404, `Incident ${id} not found`);
  }

  logStore.addOperatorLog('incident', `Incident ${id} updated`, {
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
router.post('/:id/mitigation', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { actionType, details } = addMitigationSchema.parse(req.body);

  const action: MitigationAction = {
    at: new Date().toISOString(),
    actionType,
    details,
  };

  const incident = incidentStore.addMitigationAction(id, action);

  if (!incident) {
    throw createError(404, `Incident ${id} not found`);
  }

  logStore.addOperatorLog('mitigation', `Mitigation action added to incident ${id}`, {
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
router.post('/:id/close', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const incident = incidentStore.update(id, {
    status: 'closed',
    endedAt: new Date().toISOString(),
  });

  if (!incident) {
    throw createError(404, `Incident ${id} not found`);
  }

  logStore.addOperatorLog('incident', `Incident ${id} closed`, { incidentId: id });

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
router.post('/:id/anchor', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const incident = incidentStore.getById(id);
  if (!incident) {
    throw createError(404, `Incident ${id} not found`);
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
  const { sha256: payloadHash, signature } = createSignedHash(anchorPayload, config.hmacKey);

  // Simulate IPFS pinning and blockchain anchoring
  // In production, this would call actual services
  const mockCid = `bafybeig${payloadHash.slice(0, 44).toLowerCase()}`;
  const mockTxHash = `0x${payloadHash.slice(0, 64)}`;

  const onChain: OnChainAnchor = {
    anchored: true,
    chain: 'optimism',
    txHash: mockTxHash,
    payloadHash,
    ipfsCid: mockCid,
  };

  // Update incident with on-chain data
  const updatedIncident = incidentStore.update(id, { onChain });

  // Log the anchoring
  logStore.addOperatorLog('anchor', `Incident ${id} anchored on Optimism`, {
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

export default router;
