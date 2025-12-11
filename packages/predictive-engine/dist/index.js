"use strict";
/**
 * Sentinel Grid - Predictive Engine
 * Main entry point - exports all modules for use in frontend and backend
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.AlertManagerClass = exports.AlertManager = exports.PredictiveEngineClass = exports.PredictiveEngine = exports.WARNING_THRESHOLD = exports.CRITICAL_THRESHOLD = exports.createSignedHash = exports.createAuditHash = exports.fetchWeatherData = exports.autoMitigate = exports.simulateCascade = exports.getSystemState = exports.updateNodeState = exports.initializeNodes = exports.setGlobalSeed = exports.getSeededRandom = exports.SeededRandom = void 0;
exports.createDemoSimulation = createDemoSimulation;
// Types
__exportStar(require("./types"), exports);
// Utilities
var SeededRandom_1 = require("./SeededRandom");
Object.defineProperty(exports, "SeededRandom", { enumerable: true, get: function () { return SeededRandom_1.SeededRandom; } });
Object.defineProperty(exports, "getSeededRandom", { enumerable: true, get: function () { return SeededRandom_1.getSeededRandom; } });
Object.defineProperty(exports, "setGlobalSeed", { enumerable: true, get: function () { return SeededRandom_1.setGlobalSeed; } });
// Simulation Engine
var SimulationEngine_1 = require("./SimulationEngine");
Object.defineProperty(exports, "initializeNodes", { enumerable: true, get: function () { return SimulationEngine_1.initializeNodes; } });
Object.defineProperty(exports, "updateNodeState", { enumerable: true, get: function () { return SimulationEngine_1.updateNodeState; } });
Object.defineProperty(exports, "getSystemState", { enumerable: true, get: function () { return SimulationEngine_1.getSystemState; } });
Object.defineProperty(exports, "simulateCascade", { enumerable: true, get: function () { return SimulationEngine_1.simulateCascade; } });
Object.defineProperty(exports, "autoMitigate", { enumerable: true, get: function () { return SimulationEngine_1.autoMitigate; } });
Object.defineProperty(exports, "fetchWeatherData", { enumerable: true, get: function () { return SimulationEngine_1.fetchWeatherData; } });
Object.defineProperty(exports, "createAuditHash", { enumerable: true, get: function () { return SimulationEngine_1.createAuditHash; } });
Object.defineProperty(exports, "createSignedHash", { enumerable: true, get: function () { return SimulationEngine_1.createSignedHash; } });
Object.defineProperty(exports, "CRITICAL_THRESHOLD", { enumerable: true, get: function () { return SimulationEngine_1.CRITICAL_THRESHOLD; } });
Object.defineProperty(exports, "WARNING_THRESHOLD", { enumerable: true, get: function () { return SimulationEngine_1.WARNING_THRESHOLD; } });
// Predictive Engine
var PredictiveEngine_1 = require("./PredictiveEngine");
Object.defineProperty(exports, "PredictiveEngine", { enumerable: true, get: function () { return PredictiveEngine_1.PredictiveEngine; } });
Object.defineProperty(exports, "PredictiveEngineClass", { enumerable: true, get: function () { return __importDefault(PredictiveEngine_1).default; } });
// Alert Manager
var AlertManager_1 = require("./AlertManager");
Object.defineProperty(exports, "AlertManager", { enumerable: true, get: function () { return AlertManager_1.AlertManager; } });
Object.defineProperty(exports, "AlertManagerClass", { enumerable: true, get: function () { return __importDefault(AlertManager_1).default; } });
// Version
exports.VERSION = '1.0.0';
// Re-import for use in helper function
const SimulationEngine_2 = require("./SimulationEngine");
const PredictiveEngine_2 = require("./PredictiveEngine");
const AlertManager_2 = require("./AlertManager");
// Quick start helpers
function createDemoSimulation(seed = 12345) {
    const nodes = (0, SimulationEngine_2.initializeNodes)({ seed });
    const predictiveEngine = new PredictiveEngine_2.PredictiveEngine({ seed: seed + 1 });
    const alertManager = new AlertManager_2.AlertManager(seed + 2);
    return {
        nodes,
        predictiveEngine,
        alertManager,
        tick: (threat = null) => {
            const weather = (0, SimulationEngine_2.fetchWeatherData)();
            const updatedNodes = (0, SimulationEngine_2.updateNodeState)(nodes, threat, weather);
            Object.assign(nodes, updatedNodes);
            const state = (0, SimulationEngine_2.getSystemState)(nodes);
            predictiveEngine.updateHistories([state], nodes);
            return {
                nodes: updatedNodes,
                state,
                weather,
            };
        },
        predict: () => {
            const patterns = predictiveEngine.analyzePatterns(nodes);
            const predictions = predictiveEngine.generatePredictions(nodes);
            return { patterns, predictions };
        },
        getState: () => (0, SimulationEngine_2.getSystemState)(nodes),
    };
}
//# sourceMappingURL=index.js.map