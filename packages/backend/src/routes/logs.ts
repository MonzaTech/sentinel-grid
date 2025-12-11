/**
 * Sentinel Grid Backend - Logs Export Route
 * GET /api/logs - Get recent logs
 * GET /api/logs/export - Export all logs
 */

import { Router, Request, Response } from 'express';
import { getSimulation } from '../services/simulation.js';
import { cascadeRepo, auditRepo } from '../db/index.js';
import { logStore } from '../stores/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/logs
 * Get recent operator log entries
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const category = req.query.category as string;
  const source = req.query.source as string;

  let logs = logStore.getRecent(limit);

  // Filter by category if provided
  if (category) {
    logs = logs.filter((l) => l.category === category);
  }

  // Filter by source if provided
  if (source) {
    logs = logs.filter((l) => l.source === source);
  }

  res.json({
    success: true,
    count: logs.length,
    data: logs,
  });
}));

/**
 * GET /api/logs/export
 * Export logs in JSON or CSV format
 */
router.get('/export', asyncHandler(async (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'json';
  const sim = getSimulation();
  
  // Gather all log data
  const operatorLogs = logStore.getAll();
  const cascades = cascadeRepo.getAll.all() as any[];
  const alerts = sim.getAlerts();
  const auditLog = auditRepo.getAll.all() as any[];
  const state = sim.getState();
  
  // Build unified log entries
  const logEntries: Array<{
    timestamp: string;
    type: 'cascade' | 'alert' | 'audit' | 'prediction' | 'operator';
    severity: string;
    description: string;
    details: Record<string, unknown>;
  }> = [];

  // Add operator logs
  operatorLogs.forEach((l) => {
    logEntries.push({
      timestamp: l.timestamp,
      type: 'operator',
      severity: 'info',
      description: l.message,
      details: {
        id: l.id,
        source: l.source,
        category: l.category,
        user: l.user,
        metadata: l.metadata,
      },
    });
  });
  
  // Add cascades
  cascades.forEach((c) => {
    logEntries.push({
      timestamp: c.startTime || c.createdAt || new Date().toISOString(),
      type: 'cascade',
      severity: c.impactScore > 0.7 ? 'critical' : c.impactScore > 0.4 ? 'high' : 'medium',
      description: `Cascade from ${c.originNode} affecting ${JSON.parse(c.affectedNodes || '[]').length} nodes`,
      details: {
        id: c.id,
        originNode: c.originNode,
        affectedNodes: JSON.parse(c.affectedNodes || '[]'),
        impactScore: c.impactScore,
      },
    });
  });
  
  // Add alerts
  alerts.forEach((a) => {
    logEntries.push({
      timestamp: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
      type: 'alert',
      severity: a.severity || 'medium',
      description: a.message || 'Alert triggered',
      details: {
        id: a.id,
        nodeIds: a.nodeIds,
        status: a.status,
      },
    });
  });
  
  // Add audit entries
  auditLog.forEach((a) => {
    logEntries.push({
      timestamp: a.timestamp || new Date().toISOString(),
      type: 'audit',
      severity: 'info',
      description: `${a.type}: ${a.dataSummary || 'action performed'}`,
      details: {
        id: a.id,
        type: a.type,
        hash: a.hash,
      },
    });
  });
  
  // Add active predictions
  state.predictions.forEach((p) => {
    logEntries.push({
      timestamp: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      type: 'prediction',
      severity: p.probability > 0.7 ? 'high' : p.probability > 0.4 ? 'medium' : 'low',
      description: `${p.type.replace(/_/g, ' ')} prediction for ${p.nodeId} (${(p.probability * 100).toFixed(0)}% confidence)`,
      details: {
        id: p.id,
        nodeId: p.nodeId,
        type: p.type,
        probability: p.probability,
        hoursToEvent: p.hoursToEvent,
      },
    });
  });
  
  // Sort by timestamp descending
  logEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (format === 'csv') {
    // Generate CSV
    const headers = ['timestamp', 'type', 'severity', 'description'];
    const rows = logEntries.map((e) => [
      e.timestamp,
      e.type,
      e.severity,
      `"${e.description.replace(/"/g, '""')}"`,
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sentinel-grid-logs.csv');
    res.send(csv);
  } else {
    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=sentinel-grid-logs.json');
    res.json({
      exportedAt: new Date().toISOString(),
      totalEntries: logEntries.length,
      entries: logEntries,
    });
  }
}));

/**
 * GET /api/logs/summary
 * Get summary of log entries
 */
router.get('/summary', asyncHandler(async (_req: Request, res: Response) => {
  const sim = getSimulation();
  const operatorLogs = logStore.getAll();
  const cascades = cascadeRepo.getAll.all() as any[];
  const alerts = sim.getAlerts();
  const auditLog = auditRepo.getAll.all() as any[];
  
  res.json({
    data: {
      operatorLogs: operatorLogs.length,
      cascades: cascades.length,
      alerts: alerts.length,
      auditEntries: auditLog.length,
      lastUpdated: new Date().toISOString(),
    },
  });
}));

export default router;
