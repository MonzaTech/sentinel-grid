/**
 * Sentinel Grid - Predictive Engine
 * Main entry point - exports all modules for use in frontend and backend
 */

// Types
export * from './types';

// Utilities
export { SeededRandom, getSeededRandom, setGlobalSeed } from './SeededRandom';

// Simulation Engine
export {
  initializeNodes,
  updateNodeState,
  getSystemState,
  simulateCascade,
  autoMitigate,
  fetchWeatherData,
  createAuditHash,
  createSignedHash,
  CRITICAL_THRESHOLD,
  WARNING_THRESHOLD,
  type MitigationResult,
} from './SimulationEngine';

// Predictive Engine
export { PredictiveEngine, default as PredictiveEngineClass } from './PredictiveEngine';

// Alert Manager
export { AlertManager, default as AlertManagerClass } from './AlertManager';

// Version
export const VERSION = '1.0.0';

// Re-import for use in helper function
import {
  initializeNodes as _initNodes,
  updateNodeState as _updateState,
  getSystemState as _getState,
  fetchWeatherData as _fetchWeather,
} from './SimulationEngine';
import { PredictiveEngine as _PE } from './PredictiveEngine';
import { AlertManager as _AM } from './AlertManager';

// Quick start helpers
export function createDemoSimulation(seed: number = 12345) {
  const nodes = _initNodes({ seed });
  const predictiveEngine = new _PE({ seed: seed + 1 });
  const alertManager = new _AM(seed + 2);
  
  return {
    nodes,
    predictiveEngine,
    alertManager,
    tick: (threat: any = null) => {
      const weather = _fetchWeather();
      const updatedNodes = _updateState(nodes, threat, weather);
      Object.assign(nodes, updatedNodes);
      
      const state = _getState(nodes);
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
    getState: () => _getState(nodes),
  };
}
