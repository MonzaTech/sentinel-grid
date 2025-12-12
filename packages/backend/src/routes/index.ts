/**
 * Sentinel Grid Backend - Route Aggregator
 */

import { Router } from 'express';
import systemRoutes from './system';
import nodesRoutes from './nodes';
import predictionsRoutes from './predictions';
import simulateRoutes from './simulate';
import actionsRoutes from './actions';
import auditRoutes from './audit';
import anchorRoutes from './anchor';
import logsRoutes from './logs';
import scenariosRoutes from './scenarios';
import incidentsRoutes from './incidents';
import topologyRoutes from './topology';
import reportRoutes from './report';
import demoRoutes from './demo';

const router = Router();

// Mount routes
router.use('/system', systemRoutes);
router.use('/nodes', nodesRoutes);
router.use('/predictions', predictionsRoutes);
router.use('/simulate', simulateRoutes);
router.use('/actions', actionsRoutes);
router.use('/audit', auditRoutes);
router.use('/anchors', anchorRoutes);
router.use('/anchor', anchorRoutes); // Alias
router.use('/logs', logsRoutes);
router.use('/scenarios', scenariosRoutes);
router.use('/incidents', incidentsRoutes);
router.use('/topology', topologyRoutes);
router.use('/report', reportRoutes);
router.use('/demo', demoRoutes);

// Import pin and verify handlers directly for top-level routes
import { pinHandler, verifyHandler } from './anchor';
router.post('/pin', pinHandler);
router.post('/verify', verifyHandler);

// Root endpoint
router.get('/', (_req, res) => {
  res.json({
    name: 'Sentinel Grid API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      system: [
        'GET  /api/system/state',
        'GET  /api/system/health',
        'GET  /api/system/metrics',
        'POST /api/system/start',
        'POST /api/system/stop',
        'POST /api/system/reset',
      ],
      nodes: [
        'GET  /api/nodes',
        'GET  /api/nodes/summary',
        'GET  /api/nodes/critical',
        'GET  /api/nodes/:id',
      ],
      predictions: [
        'GET  /api/predictions',
        'GET  /api/predictions/patterns',
        'GET  /api/predictions/accuracy',
      ],
      simulate: [
        'POST /api/simulate/cascade',
        'POST /api/simulate/threat',
        'DELETE /api/simulate/threat',
        'POST /api/simulate/scenario',
      ],
      actions: [
        'GET  /api/actions/recommendations',
        'POST /api/actions/mitigate',
        'POST /api/actions/mitigate/batch',
        'POST /api/actions/mitigate/critical',
      ],
      incidents: [
        'GET  /api/incidents',
        'GET  /api/incidents/:id',
        'PATCH /api/incidents/:id',
        'POST /api/incidents/:id/mitigation',
        'POST /api/incidents/:id/close',
        'POST /api/incidents/:id/anchor',
      ],
      scenarios: [
        'GET  /api/scenarios/templates',
        'GET  /api/scenarios/templates/:id',
        'POST /api/scenarios/run',
      ],
      report: [
        'GET  /api/report/incidents',
        'GET  /api/report/accuracy',
        'GET  /api/report/operator-log',
      ],
      demo: [
        'GET  /api/demo/available',
        'GET  /api/demo/state',
        'POST /api/demo/run',
        'POST /api/demo/reset',
      ],
      topology: [
        'GET  /api/topology',
        'POST /api/topology/import',
        'DELETE /api/topology',
        'GET  /api/topology/summary',
      ],
      anchor: [
        'GET  /api/anchors',
        'POST /api/anchor',
        'GET  /api/anchor/status',
        'POST /api/pin',
      ],
      logs: [
        'GET  /api/logs',
        'GET  /api/logs/export',
      ],
      audit: [
        'GET  /api/audit',
      ],
    },
  });
});

export default router;
