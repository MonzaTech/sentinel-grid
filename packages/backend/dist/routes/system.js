"use strict";
/**
 * Sentinel Grid Backend - System Routes
 * GET /api/system/state, /api/system/health, /api/system/metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const simulation_js_1 = require("../services/simulation.js");
const index_js_1 = require("../stores/index.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const index_js_2 = require("../validation/index.js");
const router = (0, express_1.Router)();
// Track system start time for uptime
const systemStartTime = Date.now();
// Request metrics
let requestCount = 0;
let totalResponseTime = 0;
// Middleware to track request metrics
router.use((req, res, next) => {
    const start = Date.now();
    requestCount++;
    res.on('finish', () => {
        totalResponseTime += Date.now() - start;
    });
    next();
});
/**
 * GET /api/system/state
 * Returns current system state with extended metrics
 */
router.get('/state', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const state = sim.getSystemState();
    const healthScore = sim.getHealthScore();
    const nodes = sim.getNodes();
    // Calculate extended metrics
    const nodeList = Object.values(nodes);
    const cyberHealth = nodeList.length > 0
        ? nodeList.reduce((sum, n) => sum + (n.cyberHealth || 0.9), 0) / nodeList.length
        : 0.9;
    const avgLatency = nodeList.length > 0
        ? nodeList.reduce((sum, n) => sum + (n.latency || 50), 0) / nodeList.length
        : 50;
    const isolatedNodes = nodeList.filter((n) => n.status === 'isolated').length;
    // Get active incidents
    const incidents = index_js_1.incidentStore.getAll();
    const openIncidents = incidents.filter(i => i.status === 'open').length;
    res.json((0, index_js_2.createApiResponse)(true, {
        ...state,
        healthScore,
        isRunning: sim.isSimulationRunning(),
        // Extended metrics
        cyberHealth,
        avgLatency,
        isolatedNodes,
        activeThreats: 0, // Would come from ThreatService
        pendingMitigations: 0,
        openIncidents,
        // Generation and demand
        systemLoad: state.loadRatio,
        generationCapacity: nodeList
            .filter((n) => n.type === 'generator' || n.type === 'solar_farm' || n.type === 'wind_turbine')
            .reduce((sum, n) => sum + (n.ratedCapacity || 100), 0),
    }));
}));
/**
 * GET /api/system/health
 * Enhanced health check endpoint with component status
 */
router.get('/health', (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const state = sim.getSystemState();
    const uptime = Math.floor((Date.now() - systemStartTime) / 1000);
    // Check component health
    const simulationUp = sim.isSimulationRunning() || state.totalNodes > 0;
    const websocketUp = true; // Would check actual WS connections
    const storageUp = true; // Would check DB connection
    const overallStatus = simulationUp && websocketUp && storageUp
        ? 'healthy'
        : (!simulationUp ? 'unhealthy' : 'degraded');
    const incidents = index_js_1.incidentStore.getAll();
    res.json((0, index_js_2.createApiResponse)(true, {
        status: overallStatus,
        uptime,
        timestamp: new Date().toISOString(),
        version: index_js_2.API_VERSION,
        components: {
            simulation: simulationUp ? 'up' : 'down',
            websocket: websocketUp ? 'up' : 'down',
            storage: storageUp ? 'up' : 'down',
        },
        metrics: {
            activeConnections: 0, // Would track WebSocket connections
            nodesCount: state.totalNodes,
            predictionsCount: sim.getPredictions().length,
            incidentsOpen: incidents.filter(i => i.status === 'open').length,
            memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
    }));
});
/**
 * GET /api/system/metrics
 * Prometheus-compatible metrics with extended data
 */
router.get('/metrics', (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    const state = sim.getSystemState();
    const healthScore = sim.getHealthScore();
    const accuracy = sim.getAccuracyMetrics();
    const uptime = Math.floor((Date.now() - systemStartTime) / 1000);
    const avgResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
    const incidents = index_js_1.incidentStore.getAll();
    const metrics = `
# HELP sentinel_system_health_score System health score (0-1)
# TYPE sentinel_system_health_score gauge
sentinel_system_health_score ${healthScore.toFixed(4)}

# HELP sentinel_nodes_total Total number of nodes
# TYPE sentinel_nodes_total gauge
sentinel_nodes_total ${state.totalNodes}

# HELP sentinel_nodes_online Number of online nodes
# TYPE sentinel_nodes_online gauge
sentinel_nodes_online ${state.onlineNodes}

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

# HELP sentinel_prediction_total Total predictions generated
# TYPE sentinel_prediction_total counter
sentinel_prediction_total ${accuracy.totalPredictions}

# HELP sentinel_incidents_open Open incidents count
# TYPE sentinel_incidents_open gauge
sentinel_incidents_open ${incidents.filter(i => i.status === 'open').length}

# HELP sentinel_incidents_total Total incidents
# TYPE sentinel_incidents_total counter
sentinel_incidents_total ${incidents.length}

# HELP sentinel_simulation_running Whether simulation is running
# TYPE sentinel_simulation_running gauge
sentinel_simulation_running ${sim.isSimulationRunning() ? 1 : 0}

# HELP sentinel_uptime_seconds System uptime in seconds
# TYPE sentinel_uptime_seconds counter
sentinel_uptime_seconds ${uptime}

# HELP sentinel_requests_total Total API requests
# TYPE sentinel_requests_total counter
sentinel_requests_total ${requestCount}

# HELP sentinel_response_time_avg_ms Average response time
# TYPE sentinel_response_time_avg_ms gauge
sentinel_response_time_avg_ms ${avgResponseTime.toFixed(2)}

# HELP sentinel_memory_usage_bytes Memory usage in bytes
# TYPE sentinel_memory_usage_bytes gauge
sentinel_memory_usage_bytes ${process.memoryUsage().heapUsed}
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
    index_js_1.logStore.addOperatorLog('config', 'Simulation started');
    res.json((0, index_js_2.createApiResponse)(true, {
        isRunning: sim.isSimulationRunning(),
    }, 'Simulation started'));
});
/**
 * POST /api/system/stop
 * Stop simulation
 */
router.post('/stop', (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    sim.stop();
    index_js_1.logStore.addOperatorLog('config', 'Simulation stopped');
    res.json((0, index_js_2.createApiResponse)(true, {
        isRunning: sim.isSimulationRunning(),
    }, 'Simulation stopped'));
});
/**
 * POST /api/system/reset
 * Reset simulation
 */
router.post('/reset', (_req, res) => {
    const sim = (0, simulation_js_1.getSimulation)();
    sim.reset();
    index_js_1.logStore.addOperatorLog('config', 'Simulation reset');
    res.json((0, index_js_2.createApiResponse)(true, null, 'Simulation reset'));
});
exports.default = router;
//# sourceMappingURL=system.js.map