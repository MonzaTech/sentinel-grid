/**
 * Sentinel Grid - Predictive Engine
 * Main entry point - exports all modules for use in frontend and backend
 */
export * from './types';
export { SeededRandom, getSeededRandom, setGlobalSeed } from './SeededRandom';
export { initializeNodes, updateNodeState, getSystemState, simulateCascade, autoMitigate, fetchWeatherData, createAuditHash, createSignedHash, CRITICAL_THRESHOLD, WARNING_THRESHOLD, type MitigationResult, } from './SimulationEngine';
export { PredictiveEngine, default as PredictiveEngineClass } from './PredictiveEngine';
export { AlertManager, default as AlertManagerClass } from './AlertManager';
export declare const VERSION = "1.0.0";
import { PredictiveEngine as _PE } from './PredictiveEngine';
import { AlertManager as _AM } from './AlertManager';
export declare function createDemoSimulation(seed?: number): {
    nodes: Record<string, import("./types").Node>;
    predictiveEngine: _PE;
    alertManager: _AM;
    tick: (threat?: any) => {
        nodes: Record<string, import("./types").Node>;
        state: import("./types").SystemState;
        weather: import("./types").WeatherData;
    };
    predict: () => {
        patterns: import("./types").Pattern[];
        predictions: import("./types").Prediction[];
    };
    getState: () => import("./types").SystemState;
};
//# sourceMappingURL=index.d.ts.map