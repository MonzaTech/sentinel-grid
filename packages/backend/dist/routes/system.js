"use strict";
/**
 * Sentinel Grid Backend - System Routes
 * GET /api/system/state, /api/system/health, /api/system/metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const simulation_js_1 = require("../services/simulation.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const router = (0, express_1.Router)();
/**
 * GET /api/system/state
 * Returns current system state
 */
router.get('/state', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
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
router.get('/health', (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
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
router.get('/metrics', (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
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
router.post('/start', (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    sim.start();
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
router.post('/stop', (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    sim.stop();
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
router.post('/reset', (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    sim.reset();
    res.json({
        success: true,
        message: 'Simulation reset',
    });
});
exports.default = router;
//# sourceMappingURL=system.js.map