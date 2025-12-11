/**
 * Sentinel Grid Backend - Simulation Service
 * Wraps the predictive-engine and maintains simulation state
 */

import {
  initializeNodes,
  updateNodeState,
  getSystemState,
  simulateCascade,
  autoMitigate,
  fetchWeatherData,
  createSignedHash,
  PredictiveEngine,
  AlertManager,
  type Node,
  type Prediction,
  type Pattern,
  type SystemState,
  type WeatherData,
  type Threat,
  type CascadeEvent,
  type MitigationResult,
  type Alert,
} from '@sentinel-grid/predictive-engine';
import { config } from '../config.js';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

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
  mitigation: (result: MitigationResult & { nodeId: string }) => void;
  stateChange: (state: SimulationState) => void;
}

// ============================================================================
// Simulation Service Class
// ============================================================================

export class SimulationService extends EventEmitter {
  private nodes: Record<string, Node>;
  private predictiveEngine: PredictiveEngine;
  private alertManager: AlertManager;
  private weather: WeatherData;
  private activeThreat: Threat | null = null;
  private isRunning = false;
  private tickCount = 0;
  private startedAt: Date | null = null;
  private tickInterval: NodeJS.Timeout | null = null;
  private predictionInterval: NodeJS.Timeout | null = null;
  private autoMitigationEnabled = false;

  constructor() {
    super();
    
    // Initialize with seed for determinism
    this.nodes = initializeNodes({
      seed: config.simulation.seed,
      nodeCount: config.simulation.nodeCount,
    });
    
    this.predictiveEngine = new PredictiveEngine({
      seed: config.simulation.seed + 1,
    });
    
    this.alertManager = new AlertManager(config.simulation.seed + 2);
    this.weather = fetchWeatherData();
    
    console.log(`✓ Simulation initialized with ${Object.keys(this.nodes).length} nodes (seed: ${config.simulation.seed})`);
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  getState(): SimulationState {
    return {
      nodes: this.nodes,
      systemState: getSystemState(this.nodes),
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

  getNodes(): Record<string, Node> {
    return { ...this.nodes };
  }

  getNode(id: string): Node | undefined {
    return this.nodes[id];
  }

  getSystemState(): SystemState {
    return getSystemState(this.nodes);
  }

  getWeather(): WeatherData {
    return this.weather;
  }

  getPredictions(): Prediction[] {
    return this.predictiveEngine.generatePredictions(this.nodes);
  }

  getPatterns(): Pattern[] {
    return this.predictiveEngine.analyzePatterns(this.nodes);
  }

  getAlerts(status?: 'active' | 'acknowledged' | 'resolved'): Alert[] {
    return this.alertManager.getAlerts(status);
  }

  getHealthScore(): number {
    return this.predictiveEngine.getSystemHealthScore(this.nodes);
  }

  getAccuracyMetrics() {
    return this.predictiveEngine.getAccuracyMetrics();
  }

  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  // ==========================================================================
  // Simulation Control
  // ==========================================================================

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startedAt = new Date();
    
    // Tick interval - update node states
    this.tickInterval = setInterval(() => {
      this.tick();
    }, config.simulation.tickIntervalMs);
    
    // Prediction interval - generate predictions
    this.predictionInterval = setInterval(() => {
      this.runPredictions();
    }, config.simulation.predictionIntervalMs);
    
    this.emit('stateChange', this.getState());
    console.log('▶ Simulation started');
  }

  stop(): void {
    if (!this.isRunning) return;
    
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

  reset(): void {
    this.stop();
    
    this.nodes = initializeNodes({
      seed: config.simulation.seed,
      nodeCount: config.simulation.nodeCount,
    });
    
    this.predictiveEngine = new PredictiveEngine({
      seed: config.simulation.seed + 1,
    });
    
    this.alertManager = new AlertManager(config.simulation.seed + 2);
    this.weather = fetchWeatherData();
    this.activeThreat = null;
    this.tickCount = 0;
    this.startedAt = null;
    
    this.emit('stateChange', this.getState());
    console.log('🔄 Simulation reset');
  }

  // ==========================================================================
  // Simulation Actions
  // ==========================================================================

  tick(): void {
    // Guard against uninitialized state
    if (!this.nodes || Object.keys(this.nodes).length === 0) {
      console.warn('Tick called before nodes initialized');
      return;
    }
    
    // Update weather occasionally
    if (this.tickCount % 10 === 0) {
      this.weather = fetchWeatherData();
    }
    
    // Update node states
    this.nodes = updateNodeState(this.nodes, this.activeThreat, this.weather);
    
    // Update histories
    const state = getSystemState(this.nodes);
    this.predictiveEngine.updateHistories([state], this.nodes);
    
    // Check for auto-mitigation
    if (this.autoMitigationEnabled) {
      this.runAutoMitigation();
    }
    
    this.tickCount++;
    this.emit('tick', this.getState());
  }

  runPredictions(): void {
    this.predictiveEngine.analyzePatterns(this.nodes);
    const predictions = this.predictiveEngine.generatePredictions(this.nodes);
    
    this.emit('prediction', predictions);
    
    // Check alerts
    this.alertManager.checkPredictionsForAlerts(predictions).then((alerts) => {
      alerts.forEach((alert) => this.emit('alert', alert));
    });
  }

  deployThreat(threat: Omit<Threat, 'id'>): Threat {
    const fullThreat: Threat = {
      ...threat,
      id: `threat_${uuidv4()}`,
    };
    
    this.activeThreat = fullThreat;
    console.log(`⚠ Threat deployed: ${fullThreat.type} (severity: ${fullThreat.severity})`);
    
    return fullThreat;
  }

  clearThreat(): void {
    this.activeThreat = null;
    console.log('✓ Threat cleared');
  }

  triggerCascade(originId: string, severity: number = 0.7): CascadeEvent {
    const { nodes: updatedNodes, event } = simulateCascade(
      this.nodes,
      originId,
      severity
    );
    
    this.nodes = updatedNodes;
    this.emit('cascade', event);
    
    console.log(`🌊 Cascade triggered from ${originId}, affected ${event.affectedNodes.length} nodes`);
    
    return event;
  }

  mitigate(nodeId: string, triggeredBy: string = 'manual'): MitigationResult & { nodeId: string } {
    const result = autoMitigate(this.nodes, nodeId);
    
    if (result.success) {
      this.nodes[nodeId] = result.updatedNode;
    }
    
    const fullResult = { ...result, nodeId, triggeredBy };
    this.emit('mitigation', fullResult);
    
    console.log(`🛠 Mitigation ${result.success ? 'successful' : 'failed'} for ${result.node}`);
    
    return fullResult;
  }

  private runAutoMitigation(): void {
    const state = getSystemState(this.nodes);
    
    state.criticalNodes.forEach((nodeId) => {
      this.mitigate(nodeId, 'auto');
    });
  }

  setAutoMitigation(enabled: boolean): void {
    this.autoMitigationEnabled = enabled;
    console.log(`🤖 Auto-mitigation ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ==========================================================================
  // Alert Management
  // ==========================================================================

  acknowledgeAlert(alertId: string, by?: string): boolean {
    return this.alertManager.acknowledgeAlert(alertId, by);
  }

  resolveAlert(alertId: string): boolean {
    return this.alertManager.resolveAlert(alertId);
  }

  // ==========================================================================
  // Export / Snapshot
  // ==========================================================================

  createSnapshot(): {
    timestamp: string;
    state: SimulationState;
    hash: string;
    signature: string;
  } {
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
    
    const { sha256: hash, signature } = createSignedHash(snapshotData, config.hmacKey);
    
    return {
      timestamp,
      state,
      hash,
      signature,
    };
  }

  exportState(): string {
    return JSON.stringify(this.getState(), null, 2);
  }
}

// Singleton instance
let simulationInstance: SimulationService | null = null;

export function getSimulation(): SimulationService {
  if (!simulationInstance) {
    simulationInstance = new SimulationService();
  }
  return simulationInstance;
}

export function resetSimulation(): SimulationService {
  if (simulationInstance) {
    simulationInstance.stop();
  }
  simulationInstance = new SimulationService();
  return simulationInstance;
}
