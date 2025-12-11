"use strict";
/**
 * Sentinel Grid Backend - Simulation Service
 * Wraps the predictive-engine and maintains simulation state
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationService = void 0;
exports.getSimulation = getSimulation;
exports.resetSimulation = resetSimulation;
const predictive_engine_1 = require("@sentinel-grid/predictive-engine");
const config_js_1 = require("../config.js");
const uuid_1 = require("uuid");
const events_1 = require("events");
// ============================================================================
// Simulation Service Class
// ============================================================================
class SimulationService extends events_1.EventEmitter {
    constructor() {
        super();
        this.activeThreat = null;
        this.isRunning = false;
        this.tickCount = 0;
        this.startedAt = null;
        this.tickInterval = null;
        this.predictionInterval = null;
        this.autoMitigationEnabled = false;
        // Initialize with seed for determinism
        this.nodes = (0, predictive_engine_1.initializeNodes)({
            seed: config_js_1.config.simulation.seed,
            nodeCount: config_js_1.config.simulation.nodeCount,
        });
        this.predictiveEngine = new predictive_engine_1.PredictiveEngine({
            seed: config_js_1.config.simulation.seed + 1,
        });
        this.alertManager = new predictive_engine_1.AlertManager(config_js_1.config.simulation.seed + 2);
        this.weather = (0, predictive_engine_1.fetchWeatherData)();
        console.log(`✓ Simulation initialized with ${Object.keys(this.nodes).length} nodes (seed: ${config_js_1.config.simulation.seed})`);
    }
    // ==========================================================================
    // Getters
    // ==========================================================================
    getState() {
        return {
            nodes: this.nodes,
            systemState: (0, predictive_engine_1.getSystemState)(this.nodes),
            weather: this.weather,
            predictions: this.predictiveEngine.generatePredictions(this.nodes),
            patterns: this.predictiveEngine.analyzePatterns(this.nodes),
            alerts: this.alertManager.getAlerts('active'),
            activeThreat: this.activeThreat,
            isRunning: this.isRunning,
            tickCount: this.tickCount,
            startedAt: this.startedAt,
        };
    }
    getNodes() {
        return { ...this.nodes };
    }
    getNode(id) {
        return this.nodes[id];
    }
    getSystemState() {
        return (0, predictive_engine_1.getSystemState)(this.nodes);
    }
    getWeather() {
        return this.weather;
    }
    getPredictions() {
        return this.predictiveEngine.generatePredictions(this.nodes);
    }
    getPatterns() {
        return this.predictiveEngine.analyzePatterns(this.nodes);
    }
    getAlerts(status) {
        return this.alertManager.getAlerts(status);
    }
    getHealthScore() {
        return this.predictiveEngine.getSystemHealthScore(this.nodes);
    }
    getAccuracyMetrics() {
        return this.predictiveEngine.getAccuracyMetrics();
    }
    isSimulationRunning() {
        return this.isRunning;
    }
    // ==========================================================================
    // Simulation Control
    // ==========================================================================
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.startedAt = new Date();
        // Tick interval - update node states
        this.tickInterval = setInterval(() => {
            this.tick();
        }, config_js_1.config.simulation.tickIntervalMs);
        // Prediction interval - generate predictions
        this.predictionInterval = setInterval(() => {
            this.runPredictions();
        }, config_js_1.config.simulation.predictionIntervalMs);
        this.emit('stateChange', this.getState());
        console.log('▶ Simulation started');
    }
    stop() {
        if (!this.isRunning)
            return;
        this.isRunning = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        if (this.predictionInterval) {
            clearInterval(this.predictionInterval);
            this.predictionInterval = null;
        }
        this.emit('stateChange', this.getState());
        console.log('⏹ Simulation stopped');
    }
    reset() {
        this.stop();
        this.nodes = (0, predictive_engine_1.initializeNodes)({
            seed: config_js_1.config.simulation.seed,
            nodeCount: config_js_1.config.simulation.nodeCount,
        });
        this.predictiveEngine = new predictive_engine_1.PredictiveEngine({
            seed: config_js_1.config.simulation.seed + 1,
        });
        this.alertManager = new predictive_engine_1.AlertManager(config_js_1.config.simulation.seed + 2);
        this.weather = (0, predictive_engine_1.fetchWeatherData)();
        this.activeThreat = null;
        this.tickCount = 0;
        this.startedAt = null;
        this.emit('stateChange', this.getState());
        console.log('🔄 Simulation reset');
    }
    // ==========================================================================
    // Simulation Actions
    // ==========================================================================
    tick() {
        // Guard against uninitialized state
        if (!this.nodes || Object.keys(this.nodes).length === 0) {
            console.warn('Tick called before nodes initialized');
            return;
        }
        // Update weather occasionally
        if (this.tickCount % 10 === 0) {
            this.weather = (0, predictive_engine_1.fetchWeatherData)();
        }
        // Update node states
        this.nodes = (0, predictive_engine_1.updateNodeState)(this.nodes, this.activeThreat, this.weather);
        // Update histories
        const state = (0, predictive_engine_1.getSystemState)(this.nodes);
        this.predictiveEngine.updateHistories([state], this.nodes);
        // Check for auto-mitigation
        if (this.autoMitigationEnabled) {
            this.runAutoMitigation();
        }
        this.tickCount++;
        this.emit('tick', this.getState());
    }
    runPredictions() {
        this.predictiveEngine.analyzePatterns(this.nodes);
        const predictions = this.predictiveEngine.generatePredictions(this.nodes);
        this.emit('prediction', predictions);
        // Check alerts
        this.alertManager.checkPredictionsForAlerts(predictions).then((alerts) => {
            alerts.forEach((alert) => this.emit('alert', alert));
        });
    }
    deployThreat(threat) {
        const fullThreat = {
            ...threat,
            id: `threat_${(0, uuid_1.v4)()}`,
        };
        this.activeThreat = fullThreat;
        console.log(`⚠ Threat deployed: ${fullThreat.type} (severity: ${fullThreat.severity})`);
        return fullThreat;
    }
    clearThreat() {
        this.activeThreat = null;
        console.log('✓ Threat cleared');
    }
    triggerCascade(originId, severity = 0.7) {
        const { nodes: updatedNodes, event } = (0, predictive_engine_1.simulateCascade)(this.nodes, originId, severity);
        this.nodes = updatedNodes;
        this.emit('cascade', event);
        console.log(`🌊 Cascade triggered from ${originId}, affected ${event.affectedNodes.length} nodes`);
        return event;
    }
    mitigate(nodeId, triggeredBy = 'manual') {
        const result = (0, predictive_engine_1.autoMitigate)(this.nodes, nodeId);
        if (result.success) {
            this.nodes[nodeId] = result.updatedNode;
        }
        const fullResult = { ...result, nodeId, triggeredBy };
        this.emit('mitigation', fullResult);
        console.log(`🛠 Mitigation ${result.success ? 'successful' : 'failed'} for ${result.node}`);
        return fullResult;
    }
    runAutoMitigation() {
        const state = (0, predictive_engine_1.getSystemState)(this.nodes);
        state.criticalNodes.forEach((nodeId) => {
            this.mitigate(nodeId, 'auto');
        });
    }
    setAutoMitigation(enabled) {
        this.autoMitigationEnabled = enabled;
        console.log(`🤖 Auto-mitigation ${enabled ? 'enabled' : 'disabled'}`);
    }
    // ==========================================================================
    // Alert Management
    // ==========================================================================
    acknowledgeAlert(alertId, by) {
        return this.alertManager.acknowledgeAlert(alertId, by);
    }
    resolveAlert(alertId) {
        return this.alertManager.resolveAlert(alertId);
    }
    // ==========================================================================
    // Export / Snapshot
    // ==========================================================================
    createSnapshot() {
        const state = this.getState();
        const timestamp = new Date().toISOString();
        const snapshotData = {
            timestamp,
            systemState: state.systemState,
            predictions: state.predictions.slice(0, 10),
            patterns: state.patterns.slice(0, 5),
            nodeCount: Object.keys(state.nodes).length,
            criticalNodes: state.systemState.criticalNodes.length,
            tickCount: state.tickCount,
        };
        const { sha256: hash, signature } = (0, predictive_engine_1.createSignedHash)(snapshotData, config_js_1.config.hmacKey);
        return {
            timestamp,
            state,
            hash,
            signature,
        };
    }
    exportState() {
        return JSON.stringify(this.getState(), null, 2);
    }
}
exports.SimulationService = SimulationService;
// Singleton instance
let simulationInstance = null;
function getSimulation() {
    if (!simulationInstance) {
        simulationInstance = new SimulationService();
    }
    return simulationInstance;
}
function resetSimulation() {
    if (simulationInstance) {
        simulationInstance.stop();
    }
    simulationInstance = new SimulationService();
    return simulationInstance;
}
//# sourceMappingURL=simulation.js.map