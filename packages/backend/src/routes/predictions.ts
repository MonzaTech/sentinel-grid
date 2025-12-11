/**
 * Sentinel Grid Backend - Predictions Routes
 * GET /api/predictions
 */

import { Router, Request, Response } from 'express';
import { getSimulation } from '../services/simulation.js';
import { predictionsRepo } from '../db/index.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/predictions
 * Get current predictions
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const sim = getSimulation();
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
    const min = parseFloat(minProbability as string);
    filtered = filtered.filter((p) => p.probability >= min);
  }
  
  if (nodeId) {
    filtered = filtered.filter((p) => p.nodeId === nodeId);
  }
  
  if (limit) {
    filtered = filtered.slice(0, parseInt(limit as string, 10));
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
router.get('/patterns', asyncHandler(async (_req: Request, res: Response) => {
  const sim = getSimulation();
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
router.get('/accuracy', asyncHandler(async (_req: Request, res: Response) => {
  const sim = getSimulation();
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
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  
  let predictions;
  if (status === 'active') {
    predictions = predictionsRepo.getActive.all();
  } else {
    predictions = predictionsRepo.getAll.all();
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
router.post('/save', asyncHandler(async (_req: Request, res: Response) => {
  const sim = getSimulation();
  const predictions = sim.getPredictions();
  
  let saved = 0;
  
  for (const pred of predictions) {
    try {
      predictionsRepo.insert.run({
        id: pred.id || uuidv4(),
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
    } catch (error) {
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
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const prediction = predictionsRepo.getById.get(req.params.id);
  
  if (!prediction) {
    throw createError(404, `Prediction ${req.params.id} not found`);
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
router.put('/:id/resolve', asyncHandler(async (req: Request, res: Response) => {
  const { wasAccurate } = req.body;
  
  const prediction = predictionsRepo.getById.get(req.params.id);
  if (!prediction) {
    throw createError(404, `Prediction ${req.params.id} not found`);
  }
  
  predictionsRepo.updateStatus.run(
    'resolved',
    new Date().toISOString(),
    wasAccurate ? 1 : 0,
    req.params.id
  );
  
  res.json({
    success: true,
    message: 'Prediction resolved',
  });
}));

export default router;
