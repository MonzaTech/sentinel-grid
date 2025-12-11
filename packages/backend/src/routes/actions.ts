/**
 * Sentinel Grid Backend - Actions Routes
 * POST /api/actions/mitigate
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSimulation } from '../services/simulation.js';
import { mitigationsRepo, auditRepo } from '../db/index.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import { createAuditHash } from '@sentinel-grid/predictive-engine';

const router = Router();

// Validation schemas
const mitigateSchema = z.object({
  nodeId: z.string().min(1),
  action: z.string().optional(),
});

const autoMitigationSchema = z.object({
  enabled: z.boolean(),
});

/**
 * POST /api/actions/mitigate
 * Apply mitigation to a node
 */
router.post('/mitigate', asyncHandler(async (req: Request, res: Response) => {
  const { nodeId } = mitigateSchema.parse(req.body);
  
  const sim = getSimulation();
  const node = sim.getNode(nodeId);
  
  if (!node) {
    throw createError(404, `Node ${nodeId} not found`);
  }
  
  const riskBefore = node.riskScore;
  
  // Apply mitigation
  const result = sim.mitigate(nodeId, 'manual');
  
  // Save to database
  mitigationsRepo.insert.run({
    id: uuidv4(),
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
  
  auditRepo.insert.run({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type: 'manual_mitigation',
    hash: createAuditHash(auditData),
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
router.post('/mitigate/batch', asyncHandler(async (req: Request, res: Response) => {
  const { nodeIds } = z.object({
    nodeIds: z.array(z.string()).min(1).max(50),
  }).parse(req.body);
  
  const sim = getSimulation();
  const results = [];
  
  for (const nodeId of nodeIds) {
    const node = sim.getNode(nodeId);
    if (!node) continue;
    
    const riskBefore = node.riskScore;
    const result = sim.mitigate(nodeId, 'batch');
    
    // Save to database
    mitigationsRepo.insert.run({
      id: uuidv4(),
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
  
  auditRepo.insert.run({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type: 'batch_mitigation',
    hash: createAuditHash(auditData),
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
router.post('/mitigate/critical', asyncHandler(async (_req: Request, res: Response) => {
  const sim = getSimulation();
  const state = sim.getSystemState();
  
  const results = [];
  
  for (const nodeId of state.criticalNodes) {
    const node = sim.getNode(nodeId);
    if (!node) continue;
    
    const riskBefore = node.riskScore;
    const result = sim.mitigate(nodeId, 'auto-critical');
    
    mitigationsRepo.insert.run({
      id: uuidv4(),
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
router.put('/auto-mitigation', asyncHandler(async (req: Request, res: Response) => {
  const { enabled } = autoMitigationSchema.parse(req.body);
  
  const sim = getSimulation();
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
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  const { nodeId, limit } = req.query;
  
  let mitigations;
  if (nodeId && typeof nodeId === 'string') {
    mitigations = mitigationsRepo.getByNode.all(nodeId);
  } else {
    mitigations = mitigationsRepo.getAll.all();
  }
  
  if (limit) {
    mitigations = mitigations.slice(0, parseInt(limit as string, 10));
  }
  
  res.json({
    success: true,
    count: mitigations.length,
    data: mitigations.map((m: any) => ({
      ...m,
      actions: JSON.parse(m.actions),
      success: m.success === 1,
    })),
  });
}));

export default router;
