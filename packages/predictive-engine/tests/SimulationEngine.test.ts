/**
 * Tests for SimulationEngine - Deterministic infrastructure simulation
 */

import {
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
} from '../src/SimulationEngine';
import { Node, Threat } from '../src/types';

describe('SimulationEngine', () => {
  describe('initializeNodes()', () => {
    it('should create deterministic nodes with same seed', () => {
      const nodes1 = initializeNodes({ seed: 12345 });
      const nodes2 = initializeNodes({ seed: 12345 });

      expect(Object.keys(nodes1)).toEqual(Object.keys(nodes2));

      // Check that node properties match
      Object.keys(nodes1).forEach((id) => {
        expect(nodes1[id].name).toBe(nodes2[id].name);
        expect(nodes1[id].region).toBe(nodes2[id].region);
        expect(nodes1[id].type).toBe(nodes2[id].type);
        expect(nodes1[id].riskScore).toBe(nodes2[id].riskScore);
      });
    });

    it('should create different nodes with different seeds', () => {
      const nodes1 = initializeNodes({ seed: 12345 });
      const nodes2 = initializeNodes({ seed: 54321 });

      // At least some nodes should have different names
      const names1 = Object.values(nodes1).map((n) => n.name);
      const names2 = Object.values(nodes2).map((n) => n.name);

      expect(names1).not.toEqual(names2);
    });

    it('should create the specified number of nodes', () => {
      const nodes = initializeNodes({ seed: 12345, nodeCount: 50 });
      expect(Object.keys(nodes).length).toBe(50);
    });

    it('should create nodes with valid initial values', () => {
      const nodes = initializeNodes({ seed: 12345, nodeCount: 20 });

      Object.values(nodes).forEach((node) => {
        expect(node.riskScore).toBeGreaterThanOrEqual(0);
        expect(node.riskScore).toBeLessThanOrEqual(1);
        expect(node.health).toBeGreaterThanOrEqual(0);
        expect(node.health).toBeLessThanOrEqual(1);
        expect(node.loadRatio).toBeGreaterThanOrEqual(0);
        expect(node.loadRatio).toBeLessThanOrEqual(1);
        expect(node.coordinates.x).toBeGreaterThanOrEqual(0);
        expect(node.coordinates.x).toBeLessThanOrEqual(100);
        expect(node.coordinates.y).toBeGreaterThanOrEqual(0);
        expect(node.coordinates.y).toBeLessThanOrEqual(100);
        expect(node.status).toBe('online');
      });
    });

    it('should create network connections', () => {
      const nodes = initializeNodes({ seed: 12345, nodeCount: 20 });

      // At least some nodes should have connections
      const nodesWithConnections = Object.values(nodes).filter(
        (n) => n.connections.length > 0
      );
      expect(nodesWithConnections.length).toBeGreaterThan(0);
    });

    it('should distribute nodes across regions', () => {
      const regions = ['North', 'South', 'East', 'West', 'Central'];
      const nodes = initializeNodes({ seed: 12345, nodeCount: 100, regions });

      const regionCounts: Record<string, number> = {};
      Object.values(nodes).forEach((node) => {
        regionCounts[node.region] = (regionCounts[node.region] || 0) + 1;
      });

      // Each region should have at least some nodes
      regions.forEach((region) => {
        expect(regionCounts[region]).toBeGreaterThan(0);
      });
    });
  });

  describe('updateNodeState()', () => {
    let nodes: Record<string, Node>;

    beforeEach(() => {
      nodes = initializeNodes({ seed: 12345, nodeCount: 10 });
    });

    it('should update node metrics', () => {
      const weather = fetchWeatherData();
      const updated = updateNodeState(nodes, null, weather);

      // Metrics should change (at least slightly)
      const originalRisks = Object.values(nodes).map((n) => n.riskScore);
      const updatedRisks = Object.values(updated).map((n) => n.riskScore);

      // At least some risks should change
      expect(originalRisks).not.toEqual(updatedRisks);
    });

    it('should increase risk with active threat', () => {
      const weather = fetchWeatherData();
      const targetNode = Object.keys(nodes)[0];

      const threat: Threat = {
        id: 'test_threat',
        type: 'cyber_attack',
        severity: 0.8,
        target: targetNode,
        active: true,
        until: new Date(Date.now() + 60000),
      };

      const originalRisk = nodes[targetNode].riskScore;

      // Run multiple updates to accumulate effect
      let updated = nodes;
      for (let i = 0; i < 5; i++) {
        updated = updateNodeState(updated, threat, weather);
      }

      // Risk should generally increase under threat
      expect(updated[targetNode].riskScore).toBeGreaterThan(originalRisk);
    });

    it('should keep values within bounds', () => {
      const weather = fetchWeatherData();

      // Force extreme conditions
      Object.values(nodes).forEach((node) => {
        node.riskScore = 0.99;
        node.health = 0.01;
      });

      const updated = updateNodeState(nodes, null, weather);

      Object.values(updated).forEach((node) => {
        expect(node.riskScore).toBeGreaterThanOrEqual(0);
        expect(node.riskScore).toBeLessThanOrEqual(1);
        expect(node.health).toBeGreaterThanOrEqual(0.1); // Min health
        expect(node.health).toBeLessThanOrEqual(1);
      });
    });

    it('should update node status based on risk', () => {
      const weather = fetchWeatherData();

      // Set a node to critical risk
      const nodeId = Object.keys(nodes)[0];
      nodes[nodeId].riskScore = 0.95;

      const updated = updateNodeState(nodes, null, weather);

      expect(updated[nodeId].status).toBe('critical');
    });
  });

  describe('getSystemState()', () => {
    it('should calculate correct system metrics', () => {
      const nodes = initializeNodes({ seed: 12345, nodeCount: 10 });

      // Set known values
      const nodeList = Object.values(nodes);
      nodeList[0].riskScore = 0.9; // Max risk
      nodeList[1].riskScore = 0.7; // Warning
      nodeList[2].riskScore = 0.3;

      nodeList.forEach((n, i) => {
        n.health = 0.7 + i * 0.02;
        n.loadRatio = 0.5;
      });

      const state = getSystemState(nodes);

      expect(state.maxRisk).toBe(0.9);
      expect(state.totalNodes).toBe(10);
      expect(state.criticalNodes).toContain(nodeList[0].id);
      expect(state.warningNodes).toContain(nodeList[1].id);
      expect(state.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('simulateCascade()', () => {
    let nodes: Record<string, Node>;

    beforeEach(() => {
      nodes = initializeNodes({ seed: 12345, nodeCount: 20 });
    });

    it('should propagate cascade from origin', () => {
      const originId = Object.keys(nodes)[0];
      const { nodes: updated, event } = simulateCascade(nodes, originId, 0.7);

      expect(event.originNode).toBe(originId);
      expect(event.affectedNodes).toContain(originId);
      expect(event.affectedNodes.length).toBeGreaterThan(1);
      expect(event.impactScore).toBeGreaterThan(0);
    });

    it('should increase risk in affected nodes', () => {
      const originId = Object.keys(nodes)[0];
      const originalRisks: Record<string, number> = {};

      Object.entries(nodes).forEach(([id, node]) => {
        originalRisks[id] = node.riskScore;
      });

      const { nodes: updated, event } = simulateCascade(nodes, originId, 0.8);

      // Affected nodes should have higher risk
      event.affectedNodes.forEach((nodeId) => {
        expect(updated[nodeId].riskScore).toBeGreaterThanOrEqual(originalRisks[nodeId]);
      });
    });

    it('should create propagation path', () => {
      const originId = Object.keys(nodes)[0];
      const { event } = simulateCascade(nodes, originId, 0.7);

      // Should have propagation records
      expect(event.propagationPath.length).toBeGreaterThanOrEqual(0);

      event.propagationPath.forEach((path) => {
        expect(path.from).toBeDefined();
        expect(path.to).toBeDefined();
        expect(path.riskTransfer).toBeGreaterThan(0);
      });
    });

    it('should throw error for invalid origin', () => {
      expect(() => {
        simulateCascade(nodes, 'invalid_node_id', 0.5);
      }).toThrow('Origin node invalid_node_id not found');
    });
  });

  describe('autoMitigate()', () => {
    let nodes: Record<string, Node>;

    beforeEach(() => {
      nodes = initializeNodes({ seed: 12345, nodeCount: 10 });
    });

    it('should reduce risk for critical nodes', () => {
      const nodeId = Object.keys(nodes)[0];
      nodes[nodeId].riskScore = 0.95;
      nodes[nodeId].health = 0.4;
      nodes[nodeId].loadRatio = 0.9;

      const result = autoMitigate(nodes, nodeId);

      expect(result.success).toBe(true);
      expect(result.updatedNode.riskScore).toBeLessThan(0.95);
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.riskReduction).toBeGreaterThan(0);
    });

    it('should return appropriate actions', () => {
      const nodeId = Object.keys(nodes)[0];
      nodes[nodeId].riskScore = 0.9;
      nodes[nodeId].temperature = 75;

      const result = autoMitigate(nodes, nodeId);

      // Should have relevant actions
      expect(result.actions.some((a) => a.includes('cooling') || a.includes('load'))).toBe(true);
    });

    it('should handle non-existent node', () => {
      const result = autoMitigate(nodes, 'invalid_id');

      expect(result.success).toBe(false);
      expect(result.actions).toEqual([]);
    });
  });

  describe('fetchWeatherData()', () => {
    it('should return valid weather data', () => {
      const weather = fetchWeatherData();

      expect(weather.temperature).toBeDefined();
      expect(weather.humidity).toBeGreaterThanOrEqual(0);
      expect(weather.humidity).toBeLessThanOrEqual(100);
      expect(weather.windSpeed).toBeGreaterThanOrEqual(0);
      expect(weather.stormProbability).toBeGreaterThanOrEqual(0);
      expect(weather.stormProbability).toBeLessThanOrEqual(1);
      expect(weather.condition).toBeDefined();
    });
  });

  describe('createAuditHash()', () => {
    it('should create deterministic hash', () => {
      const data = { event: 'test', value: 123 };

      const hash1 = createAuditHash(data);
      const hash2 = createAuditHash(data);

      expect(hash1).toBe(hash2);
    });

    it('should create different hashes for different data', () => {
      const hash1 = createAuditHash({ event: 'test1' });
      const hash2 = createAuditHash({ event: 'test2' });

      expect(hash1).not.toBe(hash2);
    });

    it('should return hex string', () => {
      const hash = createAuditHash({ data: 'test' });

      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash.length).toBe(16);
    });
  });

  describe('createSignedHash()', () => {
    it('should create hash and signature', () => {
      const data = { event: 'test', timestamp: '2024-01-01' };
      const hmacKey = 'test-secret-key';

      const { sha256, signature } = createSignedHash(data, hmacKey);

      expect(sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(signature).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic with same key', () => {
      const data = { event: 'test' };
      const key = 'secret';

      const result1 = createSignedHash(data, key);
      const result2 = createSignedHash(data, key);

      expect(result1.sha256).toBe(result2.sha256);
      expect(result1.signature).toBe(result2.signature);
    });

    it('should produce different signatures with different keys', () => {
      const data = { event: 'test' };

      const result1 = createSignedHash(data, 'key1');
      const result2 = createSignedHash(data, 'key2');

      expect(result1.sha256).toBe(result2.sha256); // Same data = same hash
      expect(result1.signature).not.toBe(result2.signature); // Different keys
    });
  });

  describe('thresholds', () => {
    it('should export correct threshold constants', () => {
      expect(CRITICAL_THRESHOLD).toBe(0.8);
      expect(WARNING_THRESHOLD).toBe(0.6);
    });
  });
});
