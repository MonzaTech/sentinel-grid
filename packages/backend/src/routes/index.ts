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
    endpoints: [
      'GET  /api/system/state',
      'GET  /api/system/health',
      'GET  /api/system/metrics',
      'POST /api/system/start',
      'POST /api/system/stop',
      'POST /api/system/reset',
      'GET  /api/nodes',
      'GET  /api/nodes/summary',
      'GET  /api/nodes/critical',
      'GET  /api/nodes/:id',
      'GET  /api/predictions',
      'GET  /api/predictions/patterns',
      'GET  /api/predictions/accuracy',
      'POST /api/simulate/cascade',
      'POST /api/simulate/threat',
      'POST /api/simulate/scenario',
      'POST /api/actions/mitigate',
      'POST /api/actions/mitigate/batch',
      'POST /api/actions/mitigate/critical',
      'GET  /api/audit',
      'POST /api/anchor',
      'GET  /api/anchors',
      'POST /api/pin',
      'GET  /api/logs',
      'GET  /api/logs/export',
      'GET  /api/scenarios/templates',
      'POST /api/scenarios/run',
      'GET  /api/incidents',
      'GET  /api/incidents/:id',
      'POST /api/incidents/:id/anchor',
      'GET  /api/topology',
      'POST /api/topology/import',
    ],
  });
});

export default router;
