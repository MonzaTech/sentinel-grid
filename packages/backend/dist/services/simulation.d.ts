/**
 * Sentinel Grid Backend - Simulation Service
 * Wraps the predictive-engine and maintains simulation state
 */
import { type Node, type Prediction, type Pattern, type SystemState, type WeatherData, type Threat, type CascadeEvent, type MitigationResult, type Alert } from '@sentinel-grid/predictive-engine';
import { EventEmitter } from 'events';
export interface SimulationState {
    nodes: Record<string, Node>;
    systemState: SystemState;
    weather: WeatherData;
    predictions: Prediction[];
    patterns: Pattern[];
    alerts: Alert[];
    activeThreat: Threat | null;
    isRunning: boolean;
    tickCount: number;
    startedAt: Date | null;
}
export interface SimulationEvents {
    tick: (state: SimulationState) => void;
    prediction: (predictions: Prediction[]) => void;
    alert: (alert: Alert) => void;
    cascade: (event: CascadeEvent) => void;
    mitigation: (result: MitigationResult & {
        nodeId: string;
    }) => void;
    stateChange: (state: SimulationState) => void;
}
export declare class SimulationService extends EventEmitter {
    private nodes;
    private predictiveEngine;
    private alertManager;
    private weather;
    private activeThreat;
    private isRunning;
    private tickCount;
    private startedAt;
    private tickInterval;
    private predictionInterval;
    private autoMitigationEnabled;
    constructor();
    getState(): SimulationState;
    getNodes(): Record<string, Node>;
    getNode(id: string): Node | undefined;
    getSystemState(): SystemState;
    getWeather(): WeatherData;
    getPredictions(): Prediction[];
    getPatterns(): Pattern[];
    getAlerts(status?: 'active' | 'acknowledged' | 'resolved'): Alert[];
    getHealthScore(): number;
    getAccuracyMetrics(): import("@sentinel-grid/predictive-engine").AccuracyMetrics;
    isSimulationRunning(): boolean;
    start(): void;
    stop(): void;
    reset(): void;
    tick(): void;
    runPredictions(): void;
    deployThreat(threat: Omit<Threat, 'id'>): Threat;
    clearThreat(): void;
    triggerCascade(originId: string, severity?: number): CascadeEvent;
    mitigate(nodeId: string, triggeredBy?: string): MitigationResult & {
        nodeId: string;
    };
    private runAutoMitigation;
    setAutoMitigation(enabled: boolean): void;
    acknowledgeAlert(alertId: string, by?: string): boolean;
    resolveAlert(alertId: string): boolean;
    createSnapshot(): {
        timestamp: string;
        state: SimulationState;
        hash: string;
        signature: string;
    };
    exportState(): string;
}
export declare function getSimulation(): SimulationService;
export declare function resetSimulation(): SimulationService;
