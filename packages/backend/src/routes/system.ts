/**
 * Sentinel Grid Backend - System Routes
 * GET /api/system/state, /api/system/health, /api/system/metrics
 */

import { Router, Request, Response } from 'express';
import { getSimulation } from '../services/simulation.js';
import { logStore } from '../stores/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/system/state
 * Returns current system state
 */
router.get('/state', asyncHandler(async (_req: Request, res: Response) => {
  const sim = getSimulation();
  const state = sim.getSystemState();
  const healthScore = sim.getHealthScore();
  
  res.json({
    success: true,
    data: {
      ...state,
      healthScore,
      isRunning: sim.isSimulationRunning(),
    },
  });
}));

/**
 * GET /api/system/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  const sim = getSimulation();
  const state = sim.getSystemState();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    simulation: {
      running: sim.isSimulationRunning(),
      nodes: state.totalNodes,
      critical: state.criticalNodes.length,
    },
  });
});

/**
 * GET /api/system/metrics
 * Prometheus-compatible metrics
 */
router.get('/metrics', (_req: Request, res: Response) => {
  const sim = getSimulation();
  const state = sim.getSystemState();
  const healthScore = sim.getHealthScore();
  const accuracy = sim.getAccuracyMetrics();
  
  const metrics = `
# HELP sentinel_system_health_score System health score (0-1)
# TYPE sentinel_system_health_score gauge
sentinel_system_health_score ${healthScore.toFixed(4)}

# HELP sentinel_nodes_total Total number of nodes
# TYPE sentinel_nodes_total gauge
sentinel_nodes_total ${state.totalNodes}

# HELP sentinel_nodes_critical Number of critical nodes
# TYPE sentinel_nodes_critical gauge
sentinel_nodes_critical ${state.criticalNodes.length}

# HELP sentinel_nodes_warning Number of warning nodes
# TYPE sentinel_nodes_warning gauge
sentinel_nodes_warning ${state.warningNodes.length}

# HELP sentinel_max_risk Maximum risk score across all nodes
# TYPE sentinel_max_risk gauge
sentinel_max_risk ${state.maxRisk.toFixed(4)}

# HELP sentinel_avg_health Average health across all nodes
# TYPE sentinel_avg_health gauge
sentinel_avg_health ${state.avgHealth.toFixed(4)}

# HELP sentinel_load_ratio Average load ratio across all nodes
# TYPE sentinel_load_ratio gauge
sentinel_load_ratio ${state.loadRatio.toFixed(4)}

# HELP sentinel_prediction_accuracy Prediction accuracy score
# TYPE sentinel_prediction_accuracy gauge
sentinel_prediction_accuracy ${accuracy.accuracy.toFixed(4)}

# HELP sentinel_simulation_running Whether simulation is running
# TYPE sentinel_simulation_running gauge
sentinel_simulation_running ${sim.isSimulationRunning() ? 1 : 0}
`.trim();

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

/**
 * POST /api/system/start
 * Start simulation
 */
router.post('/start', (_req: Request, res: Response) => {
  const sim = getSimulation();
  sim.start();

  logStore.addOperatorLog('config', 'Simulation started');
  
  res.json({
    success: true,
    message: 'Simulation started',
    isRunning: sim.isSimulationRunning(),
  });
});

/**
 * POST /api/system/stop
 * Stop simulation
 */
router.post('/stop', (_req: Request, res: Response) => {
  const sim = getSimulation();
  sim.stop();

  logStore.addOperatorLog('config', 'Simulation stopped');
  
  res.json({
    success: true,
    message: 'Simulation stopped',
    isRunning: sim.isSimulationRunning(),
  });
});

/**
 * POST /api/system/reset
 * Reset simulation
 */
router.post('/reset', (_req: Request, res: Response) => {
  const sim = getSimulation();
  sim.reset();

  logStore.addOperatorLog('config', 'Simulation reset');
  
  res.json({
    success: true,
    message: 'Simulation reset',
  });
});

export default router;
