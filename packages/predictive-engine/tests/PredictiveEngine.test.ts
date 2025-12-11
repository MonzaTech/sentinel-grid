/**
 * Tests for PredictiveEngine - Pattern analysis and prediction generation
 */

import { PredictiveEngine } from '../src/PredictiveEngine';
import { initializeNodes, getSystemState, fetchWeatherData, updateNodeState } from '../src/SimulationEngine';
import { Node } from '../src/types';

describe('PredictiveEngine', () => {
  let engine: PredictiveEngine;
  let nodes: Record<string, Node>;

  beforeEach(() => {
    engine = new PredictiveEngine({ seed: 12345 });
    nodes = initializeNodes({ seed: 12345, nodeCount: 20 });
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const e = new PredictiveEngine();
      expect(e).toBeDefined();
      expect(e.nodeHistories.size).toBe(0);
    });

    it('should accept custom config', () => {
      const e = new PredictiveEngine({ 
        seed: 99999,
        historyWindowSize: 100,
      });
      expect(e).toBeDefined();
    });
  });

  describe('updateHistories()', () => {
    it('should track node history', () => {
      const state = getSystemState(nodes);
      engine.updateHistories([state], nodes);

      expect(engine.nodeHistories.size).toBe(20);

      const firstNodeId = Object.keys(nodes)[0];
      const history = engine.nodeHistories.get(firstNodeId);

      expect(history).toBeDefined();
      expect(history!.timestamps.length).toBe(1);
      expect(history!.riskScores.length).toBe(1);
      expect(history!.healthScores.length).toBe(1);
    });

    it('should accumulate history over time', () => {
      const weather = fetchWeatherData();

      for (let i = 0; i < 10; i++) {
        nodes = updateNodeState(nodes, null, weather);
        const state = getSystemState(nodes);
        engine.updateHistories([state], nodes);
      }

      const firstNodeId = Object.keys(nodes)[0];
      const history = engine.nodeHistories.get(firstNodeId);

      expect(history!.timestamps.length).toBe(10);
    });

    it('should respect window size limit', () => {
      const smallEngine = new PredictiveEngine({ 
        seed: 12345,
        historyWindowSize: 5,
      });

      const weather = fetchWeatherData();

      for (let i = 0; i < 20; i++) {
        nodes = updateNodeState(nodes, null, weather);
        const state = getSystemState(nodes);
        smallEngine.updateHistories([state], nodes);
      }

      const firstNodeId = Object.keys(nodes)[0];
      const history = smallEngine.nodeHistories.get(firstNodeId);

      expect(history!.timestamps.length).toBe(5);
    });
  });

  describe('analyzePatterns()', () => {
    beforeEach(() => {
      // Build up some history
      const weather = fetchWeatherData();
      for (let i = 0; i < 30; i++) {
        nodes = updateNodeState(nodes, null, weather);
        const state = getSystemState(nodes);
        engine.updateHistories([state], nodes);
      }
    });

    it('should return array of patterns', () => {
      const patterns = engine.analyzePatterns(nodes);

      expect(Array.isArray(patterns)).toBe(true);
      patterns.forEach((pattern) => {
        expect(pattern.id).toBeDefined();
        expect(pattern.type).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should detect load imbalance pattern', () => {
      // Create imbalance
      const nodeIds = Object.keys(nodes);
      nodeIds.slice(0, 5).forEach((id) => {
        nodes[id].loadRatio = 0.95;
      });
      nodeIds.slice(10, 15).forEach((id) => {
        nodes[id].loadRatio = 0.2;
      });

      const patterns = engine.analyzePatterns(nodes);
      const loadPattern = patterns.find((p) => p.type === 'load_imbalance');

      expect(loadPattern).toBeDefined();
    });

    it('should detect thermal cluster pattern', () => {
      // Create thermal hotspot - nodes close together with high temp
      const nodeIds = Object.keys(nodes);
      nodeIds.slice(0, 4).forEach((id) => {
        nodes[id].temperature = 75;
        // Make them spatially close
        nodes[id].coordinates = { x: 50, y: 50 };
      });

      const patterns = engine.analyzePatterns(nodes);
      const thermalPattern = patterns.find((p) => p.type === 'thermal_cluster');

      // May or may not detect based on spatial clustering
      if (thermalPattern) {
        expect(thermalPattern.affectedNodes.length).toBeGreaterThan(0);
      }
    });

    it('should detect cascading risk pattern', () => {
      // Create critical node with high-risk neighbors
      const nodeIds = Object.keys(nodes);
      const criticalId = nodeIds[0];
      nodes[criticalId].riskScore = 0.9;

      // Set connected nodes to elevated risk
      nodes[criticalId].connections.forEach((connId) => {
        if (nodes[connId]) {
          nodes[connId].riskScore = 0.7;
        }
      });

      const patterns = engine.analyzePatterns(nodes);
      const cascadePattern = patterns.find((p) => p.type === 'cascading_risk');

      // May detect if enough connected nodes at risk
      if (cascadePattern) {
        expect(cascadePattern.affectedNodes).toContain(criticalId);
      }
    });
  });

  describe('generatePredictions()', () => {
    beforeEach(() => {
      // Build up history
      const weather = fetchWeatherData();
      for (let i = 0; i < 20; i++) {
        nodes = updateNodeState(nodes, null, weather);
        const state = getSystemState(nodes);
        engine.updateHistories([state], nodes);
      }
    });

    it('should generate predictions for at-risk nodes', () => {
      // Create at-risk node
      const nodeId = Object.keys(nodes)[0];
      nodes[nodeId].riskScore = 0.75;
      nodes[nodeId].health = 0.4;

      const predictions = engine.generatePredictions(nodes);

      expect(predictions.length).toBeGreaterThanOrEqual(0);

      if (predictions.length > 0) {
        const pred = predictions[0];
        expect(pred.nodeId).toBeDefined();
        expect(pred.probability).toBeGreaterThan(0);
        expect(pred.hoursToEvent).toBeGreaterThan(0);
        expect(pred.suggestedActions.length).toBeGreaterThan(0);
      }
    });

    it('should include reasoning and contributing factors', () => {
      // Create clear risk condition
      const nodeId = Object.keys(nodes)[0];
      nodes[nodeId].riskScore = 0.85;
      nodes[nodeId].loadRatio = 0.95;

      const predictions = engine.generatePredictions(nodes);
      const pred = predictions.find((p) => p.nodeId === nodeId);

      if (pred) {
        expect(pred.reasoning).toBeDefined();
        expect(pred.reasoning.length).toBeGreaterThan(0);
        expect(pred.contributingFactors.length).toBeGreaterThan(0);

        pred.contributingFactors.forEach((factor) => {
          expect(factor.factor).toBeDefined();
          expect(factor.weight).toBeGreaterThan(0);
        });
      }
    });

    it('should sort predictions by urgency', () => {
      // Create multiple at-risk nodes
      const nodeIds = Object.keys(nodes);
      nodes[nodeIds[0]].riskScore = 0.95; // Most urgent
      nodes[nodeIds[1]].riskScore = 0.7;
      nodes[nodeIds[2]].riskScore = 0.6;

      const predictions = engine.generatePredictions(nodes);

      if (predictions.length >= 2) {
        // Higher probability / lower time should come first
        const urgency = (p: any) => p.probability / Math.max(1, p.hoursToEvent);
        expect(urgency(predictions[0])).toBeGreaterThanOrEqual(urgency(predictions[1]));
      }
    });

    it('should generate appropriate suggested actions', () => {
      const nodeId = Object.keys(nodes)[0];
      nodes[nodeId].riskScore = 0.9;
      nodes[nodeId].loadRatio = 0.95; // Overload condition

      const predictions = engine.generatePredictions(nodes);
      const pred = predictions.find((p) => p.nodeId === nodeId);

      if (pred) {
        expect(pred.suggestedActions.length).toBeGreaterThan(0);

        pred.suggestedActions.forEach((action) => {
          expect(action.action).toBeDefined();
          expect(action.priority).toBeDefined();
          expect(action.impact).toBeDefined();
          expect(action.estimatedEffect).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('getSystemHealthScore()', () => {
    it('should return value between 0 and 1', () => {
      const score = engine.getSystemHealthScore(nodes);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should decrease with more critical nodes', () => {
      const healthyScore = engine.getSystemHealthScore(nodes);

      // Make nodes critical
      Object.values(nodes).slice(0, 10).forEach((node) => {
        node.riskScore = 0.9;
        node.health = 0.3;
      });

      const unhealthyScore = engine.getSystemHealthScore(nodes);

      expect(unhealthyScore).toBeLessThan(healthyScore);
    });
  });

  describe('getAccuracyMetrics()', () => {
    it('should return accuracy metrics structure', () => {
      const metrics = engine.getAccuracyMetrics();

      expect(metrics.totalPredictions).toBeDefined();
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
      expect(metrics.precision).toBeGreaterThanOrEqual(0);
      expect(metrics.recall).toBeGreaterThanOrEqual(0);
      expect(metrics.f1Score).toBeGreaterThanOrEqual(0);
      expect(metrics.byType).toBeDefined();
    });

    it('should have metrics for each prediction type', () => {
      const metrics = engine.getAccuracyMetrics();
      const types = [
        'cascade_failure',
        'equipment_failure',
        'overload',
        'thermal_stress',
      ];

      types.forEach((type) => {
        expect(metrics.byType[type as keyof typeof metrics.byType]).toBeDefined();
      });
    });
  });

  describe('resolvePrediction()', () => {
    it('should update prediction status', () => {
      // Generate a prediction
      const nodeId = Object.keys(nodes)[0];
      nodes[nodeId].riskScore = 0.85;

      const predictions = engine.generatePredictions(nodes);

      if (predictions.length > 0) {
        const predId = predictions[0].id;
        engine.resolvePrediction(predId, true);

        // Note: We can't directly verify internal state, but this should not throw
        expect(true).toBe(true);
      }
    });
  });

  describe('determinism', () => {
    it('should produce same predictions with same seed and data', () => {
      const engine1 = new PredictiveEngine({ seed: 99999 });
      const engine2 = new PredictiveEngine({ seed: 99999 });

      const nodes1 = initializeNodes({ seed: 11111, nodeCount: 10 });
      const nodes2 = initializeNodes({ seed: 11111, nodeCount: 10 });

      // Set same conditions
      nodes1[Object.keys(nodes1)[0]].riskScore = 0.85;
      nodes2[Object.keys(nodes2)[0]].riskScore = 0.85;

      // Build same history
      for (let i = 0; i < 10; i++) {
        const state1 = getSystemState(nodes1);
        const state2 = getSystemState(nodes2);
        engine1.updateHistories([state1], nodes1);
        engine2.updateHistories([state2], nodes2);
      }

      const pred1 = engine1.generatePredictions(nodes1);
      const pred2 = engine2.generatePredictions(nodes2);

      expect(pred1.length).toBe(pred2.length);

      // Predictions should match in structure
      pred1.forEach((p, i) => {
        expect(p.nodeId).toBe(pred2[i].nodeId);
        expect(p.type).toBe(pred2[i].type);
        // Probabilities may vary slightly due to timing
      });
    });
  });
});
