/**
 * Sentinel Grid Backend - Topology Routes
 * GET /api/topology, POST /api/topology/import
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { topologyStore, logStore } from '../stores/index.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const topologyNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  region: z.string().min(1),
  voltage: z.string().optional(),
  type: z.string().min(1),
});

const topologyEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  capacity: z.number().min(0),
});

const importTopologySchema = z.object({
  nodes: z.array(topologyNodeSchema).min(1),
  edges: z.array(topologyEdgeSchema),
});

/**
 * GET /api/topology
 * Get the active topology
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const topology = topologyStore.get();

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
router.post('/import', asyncHandler(async (req: Request, res: Response) => {
  const { nodes, edges } = importTopologySchema.parse(req.body);

  // Validate that all edge endpoints exist in nodes
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.from)) {
      throw createError(400, `Edge references non-existent node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      throw createError(400, `Edge references non-existent node: ${edge.to}`);
    }
  }

  // Store the topology
  topologyStore.set({ nodes, edges });

  // Log the import
  logStore.addOperatorLog('config', `Topology imported: ${nodes.length} nodes, ${edges.length} edges`, {
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
router.delete('/', asyncHandler(async (_req: Request, res: Response) => {
  topologyStore.clear();

  logStore.addOperatorLog('config', 'Custom topology cleared, reverted to default');

  res.json({
    success: true,
    message: 'Topology cleared, reverted to default',
  });
}));

/**
 * GET /api/topology/summary
 * Get topology summary statistics
 */
router.get('/summary', asyncHandler(async (_req: Request, res: Response) => {
  const topology = topologyStore.get();

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

export default router;
