/**
 * Sentinel Grid - Report Routes
 * Incident reports, accuracy metrics, operator logs
 */

import { Router, Request, Response } from 'express';
import { ReportService } from '../services/index.js';
import { validateRequest, ReportQuerySchema, createApiResponse } from '../validation/index.js';
import { logStore } from '../stores/index.js';

const router = Router();

/**
 * GET /api/report/incidents
 * Generate incident summary report
 */
router.get('/incidents', (req: Request, res: Response) => {
  try {
    const validation = validateRequest(ReportQuerySchema, req.query);
    if (!validation.success) {
      res.status(400).json(createApiResponse(false, null, validation.errors.join(', ')));
      return;
    }

    const { start, end } = validation.data;
    const report = ReportService.generateIncidentReport(start, end);

    logStore.addSystemLog('api', 'Incident report generated', {
      period: report.period,
      totalIncidents: report.totalIncidents,
    });

    res.json(createApiResponse(true, report));
  } catch (error) {
    console.error('Error generating incident report:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to generate incident report'));
  }
});

/**
 * GET /api/report/accuracy
 * Generate prediction accuracy report
 */
router.get('/accuracy', (req: Request, res: Response) => {
  try {
    const validation = validateRequest(ReportQuerySchema, req.query);
    if (!validation.success) {
      res.status(400).json(createApiResponse(false, null, validation.errors.join(', ')));
      return;
    }

    const { start, end } = validation.data;
    const report = ReportService.generateAccuracyReport(start, end);

    logStore.addSystemLog('api', 'Accuracy report generated', {
      period: report.period,
      totalPredictions: report.totalPredictions,
      accuracy: report.accuracy,
    });

    res.json(createApiResponse(true, report));
  } catch (error) {
    console.error('Error generating accuracy report:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to generate accuracy report'));
  }
});

/**
 * GET /api/report/operator-log
 * Generate operator log report
 */
router.get('/operator-log', (req: Request, res: Response) => {
  try {
    const validation = validateRequest(ReportQuerySchema, req.query);
    if (!validation.success) {
      res.status(400).json(createApiResponse(false, null, validation.errors.join(', ')));
      return;
    }

    const { start, end } = validation.data;
    const report = ReportService.generateOperatorLogReport(start, end);

    res.json(createApiResponse(true, report));
  } catch (error) {
    console.error('Error generating operator log report:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to generate operator log report'));
  }
});

/**
 * POST /api/report/seed-demo-data
 * Seed demo data for reports (for demos)
 */
router.post('/seed-demo-data', (_req: Request, res: Response) => {
  try {
    ReportService.seedDemoReportData();
    res.json(createApiResponse(true, { seeded: true }, 'Demo data seeded successfully'));
  } catch (error) {
    console.error('Error seeding demo data:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to seed demo data'));
  }
});

export default router;
