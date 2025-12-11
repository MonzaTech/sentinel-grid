/**
 * Sentinel Grid Backend - Audit Routes
 * GET /api/audit
 */

import { Router, Request, Response } from 'express';
import { auditRepo } from '../db/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/audit
 * Get audit log entries
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { type, limit } = req.query;
  
  let entries;
  if (type) {
    entries = auditRepo.getByType.all(type as string);
  } else if (limit) {
    entries = auditRepo.getRecent.all(parseInt(limit as string, 10));
  } else {
    entries = auditRepo.getAll.all();
  }
  
  res.json({
    success: true,
    count: entries.length,
    data: entries.map((e: any) => ({
      ...e,
      dataSummary: e.data_summary ? JSON.parse(e.data_summary) : null,
    })),
  });
}));

/**
 * GET /api/audit/types
 * Get available audit event types
 */
router.get('/types', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      'system_start',
      'system_stop',
      'prediction_generated',
      'auto_mitigation',
      'manual_mitigation',
      'batch_mitigation',
      'threat_deployment',
      'cascade_event',
      'proactive_action_executed',
      'alert_triggered',
      'config_changed',
      'anchor_created',
      'pin_created',
    ],
  });
});

/**
 * GET /api/audit/stats
 * Get audit statistics
 */
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const entries = auditRepo.getAll.all() as any[];
  
  // Count by type
  const byType = entries.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Recent activity (last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentCount = entries.filter((e) => e.timestamp > oneDayAgo).length;
  
  res.json({
    success: true,
    data: {
      total: entries.length,
      recentCount,
      byType,
    },
  });
}));

export default router;
