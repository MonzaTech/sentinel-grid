/**
 * Sentinel Grid Backend - Nodes Routes
 * GET /api/nodes, /api/nodes/:id
 */

import { Router, Request, Response } from 'express';
import { getSimulation } from '../services/simulation.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/nodes
 * List all nodes with optional filtering
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const sim = getSimulation();
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
    const min = parseFloat(minRisk as string);
    nodeList = nodeList.filter((n) => n.riskScore >= min);
  }
  
  if (maxRisk) {
    const max = parseFloat(maxRisk as string);
    nodeList = nodeList.filter((n) => n.riskScore <= max);
  }
  
  // Sort by risk score descending
  nodeList.sort((a, b) => b.riskScore - a.riskScore);
  
  // Apply limit
  if (limit) {
    nodeList = nodeList.slice(0, parseInt(limit as string, 10));
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
router.get('/summary', asyncHandler(async (_req: Request, res: Response) => {
  const sim = getSimulation();
  const nodes = sim.getNodes();
  const nodeList = Object.values(nodes);
  
  // Count by status
  const byStatus = nodeList.reduce((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Count by region
  const byRegion = nodeList.reduce((acc, n) => {
    acc[n.region] = (acc[n.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Count by type
  const byType = nodeList.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
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
router.get('/critical', asyncHandler(async (_req: Request, res: Response) => {
  const sim = getSimulation();
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
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const sim = getSimulation();
  const node = sim.getNode(req.params.id);
  
  if (!node) {
    throw createError(404, `Node ${req.params.id} not found`);
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
router.get('/:id/connections', asyncHandler(async (req: Request, res: Response) => {
  const sim = getSimulation();
  const node = sim.getNode(req.params.id);
  
  if (!node) {
    throw createError(404, `Node ${req.params.id} not found`);
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

export default router;
