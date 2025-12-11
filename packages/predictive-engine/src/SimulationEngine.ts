/**
 * Sentinel Grid - Simulation Engine
 * Deterministic infrastructure simulation with weather, threats, and cascades
 */

import { SeededRandom } from './SeededRandom';
import {
  Node,
  NodeType,
  NodeStatus,
  WeatherData,
  WeatherCondition,
  Threat,
  ThreatType,
  CascadeEvent,
  CascadePath,
  SystemState,
  SimulationConfig,
  DEFAULT_CONFIG,
} from './types';
import { createHash, createHmac } from 'crypto';

// ============================================================================
// Constants & Thresholds
// ============================================================================

export const CRITICAL_THRESHOLD = 0.8;
export const WARNING_THRESHOLD = 0.6;

const NODE_TYPES: NodeType[] = [
  'substation',
  'transformer',
  'generator',
  'datacenter',
  'telecom_tower',
  'water_pump',
  'control_center',
];

const NODE_TYPE_WEIGHTS: Record<NodeType, number> = {
  substation: 25,
  transformer: 30,
  generator: 10,
  datacenter: 15,
  telecom_tower: 10,
  water_pump: 5,
  control_center: 5,
};

const NODE_TYPE_NAMES: Record<NodeType, string[]> = {
  substation: ['Substation', 'Power Hub', 'Distribution Center'],
  transformer: ['Transformer', 'Step-Down Unit', 'Voltage Regulator'],
  generator: ['Generator', 'Power Plant', 'Generation Facility'],
  datacenter: ['Data Center', 'Server Farm', 'Computing Hub'],
  telecom_tower: ['Cell Tower', 'Communication Tower', 'Relay Station'],
  water_pump: ['Pump Station', 'Water Facility', 'Treatment Plant'],
  control_center: ['Control Center', 'Operations Hub', 'Command Center'],
};

// ============================================================================
// Node Initialization
// ============================================================================

export function initializeNodes(
  config: Partial<SimulationConfig> = {}
): Record<string, Node> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = new SeededRandom(cfg.seed);
  const nodes: Record<string, Node> = {};

  // Create clustered regions
  const regionCenters: Record<string, { x: number; y: number }> = {};
  cfg.regions.forEach((region, i) => {
    const angle = (i / cfg.regions.length) * 2 * Math.PI;
    regionCenters[region] = {
      x: 50 + 35 * Math.cos(angle),
      y: 50 + 35 * Math.sin(angle),
    };
  });

  // Create nodes
  for (let i = 0; i < cfg.nodeCount; i++) {
    const id = `node_${i.toString().padStart(4, '0')}`;
    const region = rng.pick(cfg.regions);
    const center = regionCenters[region];
    
    // Weighted type selection
    const typeWeights = Object.values(NODE_TYPE_WEIGHTS);
    const type = rng.weightedPick(NODE_TYPES, typeWeights);
    
    // Position within region cluster (Gaussian distribution)
    const x = Math.max(0, Math.min(100, center.x + rng.nextGaussian(0, 12)));
    const y = Math.max(0, Math.min(100, center.y + rng.nextGaussian(0, 12)));
    
    // Generate name
    const namePrefix = rng.pick(NODE_TYPE_NAMES[type]);
    const name = `${region} ${namePrefix} ${rng.nextInt(100, 999)}`;

    nodes[id] = {
      id,
      name,
      type,
      region,
      coordinates: { x, y },
      riskScore: rng.nextFloat(0.05, 0.25),
      health: rng.nextFloat(0.85, 1.0),
      loadRatio: rng.nextFloat(0.3, 0.7),
      temperature: rng.nextFloat(35, 55),
      powerDraw: rng.nextFloat(10, 100),
      status: 'online',
      lastSeen: new Date(),
      connections: [],
    };
  }

  // Create network topology (connections)
  const nodeIds = Object.keys(nodes);
  nodeIds.forEach((nodeId) => {
    const node = nodes[nodeId];
    const connectionCount = rng.nextInt(2, 5);
    
    // Prefer connections within same region
    const sameRegion = nodeIds.filter(
      (id) => id !== nodeId && nodes[id].region === node.region
    );
    const otherRegion = nodeIds.filter(
      (id) => id !== nodeId && nodes[id].region !== node.region
    );
    
    // 70% chance to connect within region
    for (let i = 0; i < connectionCount; i++) {
      const pool = rng.nextBool(0.7) && sameRegion.length > 0 
        ? sameRegion 
        : otherRegion;
      
      if (pool.length > 0) {
        const targetId = rng.pick(pool);
        if (!node.connections.includes(targetId)) {
          node.connections.push(targetId);
          // Bidirectional connection
          if (!nodes[targetId].connections.includes(nodeId)) {
            nodes[targetId].connections.push(nodeId);
          }
        }
      }
    }
  });

  return nodes;
}

// ============================================================================
// Weather Simulation
// ============================================================================

export function fetchWeatherData(rng?: SeededRandom): WeatherData {
  const r = rng || new SeededRandom(Date.now());
  
  const conditions: WeatherCondition[] = [
    'clear', 'clear', 'cloudy', 'cloudy', 'rain', 'storm', 'extreme_heat', 'extreme_cold'
  ];
  const condition = r.pick(conditions);
  
  let baseTemp = 25;
  let basePrecip = 0;
  let baseWind = 10;
  let stormProb = 0.05;
  
  switch (condition) {
    case 'extreme_heat':
      baseTemp = 40;
      stormProb = 0.15;
      break;
    case 'extreme_cold':
      baseTemp = -5;
      stormProb = 0.1;
      break;
    case 'storm':
      basePrecip = 50;
      baseWind = 60;
      stormProb = 0.8;
      break;
    case 'rain':
      basePrecip = 20;
      baseWind = 25;
      stormProb = 0.2;
      break;
  }
  
  return {
    temperature: baseTemp + r.nextGaussian(0, 5),
    humidity: r.nextFloat(30, 95),
    windSpeed: Math.max(0, baseWind + r.nextGaussian(0, 10)),
    precipitation: Math.max(0, basePrecip + r.nextGaussian(0, 10)),
    stormProbability: Math.min(1, Math.max(0, stormProb + r.nextFloat(-0.1, 0.1))),
    heatIndex: baseTemp + r.nextFloat(0, 10),
    condition,
  };
}

// ============================================================================
// Node State Updates (Tick)
// ============================================================================

export function updateNodeState(
  nodes: Record<string, Node>,
  threat: Threat | null,
  weather: WeatherData,
  config: Partial<SimulationConfig> = {}
): Record<string, Node> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = new SeededRandom(Date.now());
  const updatedNodes: Record<string, Node> = {};

  // Weather impact multiplier
  let weatherImpact = 1.0;
  if (weather.condition === 'storm') weatherImpact = 2.0;
  else if (weather.condition === 'extreme_heat') weatherImpact = 1.5;
  else if (weather.condition === 'extreme_cold') weatherImpact = 1.3;
  else if (weather.condition === 'rain') weatherImpact = 1.1;

  Object.entries(nodes).forEach(([nodeId, node]) => {
    let newRisk = node.riskScore;
    let newHealth = node.health;
    let newLoad = node.loadRatio;
    let newTemp = node.temperature;

    // Base drift (small random walk)
    newRisk += rng.nextGaussian(0, cfg.baseRiskDrift);
    newHealth += rng.nextGaussian(0, 0.01);
    newLoad += rng.nextGaussian(0, 0.02);

    // Weather effects
    if (weather.condition === 'extreme_heat') {
      newTemp += rng.nextFloat(0.5, 2);
      if (newTemp > 70) newRisk += 0.05;
    } else if (weather.condition === 'storm') {
      newRisk += rng.nextFloat(0.01, 0.05) * weatherImpact;
      if (node.type === 'telecom_tower') newRisk += 0.03;
    }

    // Active threat effects
    if (threat && threat.active) {
      const isThreatTarget = 
        threat.target === nodeId || 
        (threat.region && node.region === threat.region);
      
      if (isThreatTarget || rng.nextBool(0.1)) {
        const threatSeverity = threat.severity || 0.5;
        
        switch (threat.type) {
          case 'cyber_attack':
            newRisk += rng.nextFloat(0.05, 0.15) * threatSeverity;
            newHealth -= rng.nextFloat(0.02, 0.08) * threatSeverity;
            break;
          case 'overload':
            newLoad += rng.nextFloat(0.1, 0.3) * threatSeverity;
            newRisk += newLoad > 0.9 ? 0.1 : 0.03;
            break;
          case 'equipment_failure':
            newHealth -= rng.nextFloat(0.05, 0.2) * threatSeverity;
            newRisk += rng.nextFloat(0.05, 0.15) * threatSeverity;
            break;
          case 'weather_stress':
            newRisk += rng.nextFloat(0.03, 0.1) * weatherImpact * threatSeverity;
            break;
        }
      }
    }

    // Natural recovery (small healing when healthy)
    if (newRisk < 0.3 && rng.nextBool(0.3)) {
      newRisk -= 0.01;
      newHealth += 0.005;
    }

    // Neighbor influence (connected nodes affect each other)
    const neighborRisks = node.connections
      .map((connId) => nodes[connId]?.riskScore || 0)
      .filter((r) => r > 0);
    
    if (neighborRisks.length > 0) {
      const avgNeighborRisk = neighborRisks.reduce((a, b) => a + b, 0) / neighborRisks.length;
      if (avgNeighborRisk > CRITICAL_THRESHOLD) {
        newRisk += 0.02 * cfg.cascadePropagationRate;
      }
    }

    // Clamp values
    newRisk = Math.max(0, Math.min(1, newRisk));
    newHealth = Math.max(0.1, Math.min(1, newHealth));
    newLoad = Math.max(0.1, Math.min(1, newLoad));
    newTemp = Math.max(20, Math.min(100, newTemp));

    // Determine status
    let status: NodeStatus = 'online';
    if (newRisk > CRITICAL_THRESHOLD || newHealth < 0.3) {
      status = 'critical';
    } else if (newRisk > WARNING_THRESHOLD || newHealth < 0.6) {
      status = 'degraded';
    }

    updatedNodes[nodeId] = {
      ...node,
      riskScore: newRisk,
      health: newHealth,
      loadRatio: newLoad,
      temperature: newTemp,
      status,
      lastSeen: new Date(),
    };
  });

  return updatedNodes;
}

// ============================================================================
// Cascade Simulation
// ============================================================================

export function simulateCascade(
  nodes: Record<string, Node>,
  originId: string,
  severity: number = 0.7,
  config: Partial<SimulationConfig> = {}
): { nodes: Record<string, Node>; event: CascadeEvent } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = new SeededRandom(Date.now());
  
  const affectedNodes: string[] = [originId];
  const propagationPath: CascadePath[] = [];
  const updatedNodes = { ...nodes };
  
  // Initialize origin
  const origin = updatedNodes[originId];
  if (!origin) {
    throw new Error(`Origin node ${originId} not found`);
  }
  
  updatedNodes[originId] = {
    ...origin,
    riskScore: Math.min(1, origin.riskScore + severity * 0.5),
    health: Math.max(0.1, origin.health - severity * 0.3),
    status: 'critical',
  };

  // BFS propagation
  const queue: Array<{ nodeId: string; depth: number; riskTransfer: number }> = [
    { nodeId: originId, depth: 0, riskTransfer: severity }
  ];
  const visited = new Set<string>([originId]);
  
  while (queue.length > 0) {
    const { nodeId, depth, riskTransfer } = queue.shift()!;
    
    if (depth > 4 || riskTransfer < 0.1) continue;
    
    const node = updatedNodes[nodeId];
    
    for (const connId of node.connections) {
      if (visited.has(connId)) continue;
      
      const propagationChance = cfg.cascadePropagationRate * (1 - depth * 0.15);
      if (!rng.nextBool(propagationChance)) continue;
      
      visited.add(connId);
      const transferAmount = riskTransfer * rng.nextFloat(0.4, 0.8);
      
      const connNode = updatedNodes[connId];
      const newRisk = Math.min(1, connNode.riskScore + transferAmount);
      const newHealth = Math.max(0.1, connNode.health - transferAmount * 0.2);
      
      updatedNodes[connId] = {
        ...connNode,
        riskScore: newRisk,
        health: newHealth,
        status: newRisk > CRITICAL_THRESHOLD ? 'critical' : 
                newRisk > WARNING_THRESHOLD ? 'degraded' : connNode.status,
      };
      
      affectedNodes.push(connId);
      propagationPath.push({
        from: nodeId,
        to: connId,
        timestamp: new Date(),
        riskTransfer: transferAmount,
      });
      
      queue.push({ nodeId: connId, depth: depth + 1, riskTransfer: transferAmount });
    }
  }

  const event: CascadeEvent = {
    id: `cascade_${Date.now()}`,
    originNode: originId,
    affectedNodes,
    impactScore: affectedNodes.length / Object.keys(nodes).length,
    startTime: new Date(),
    propagationPath,
    totalDamage: affectedNodes.reduce(
      (sum, id) => sum + (updatedNodes[id].riskScore - nodes[id].riskScore), 
      0
    ),
  };

  return { nodes: updatedNodes, event };
}

// ============================================================================
// Mitigation
// ============================================================================

export interface MitigationResult {
  success: boolean;
  node: string;
  updatedNode: Node;
  actions: string[];
  riskReduction: number;
}

export function autoMitigate(
  nodes: Record<string, Node>,
  nodeId: string,
  config: Partial<SimulationConfig> = {}
): MitigationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const node = nodes[nodeId];
  
  if (!node) {
    return { 
      success: false, 
      node: nodeId, 
      updatedNode: node, 
      actions: [], 
      riskReduction: 0 
    };
  }

  const actions: string[] = [];
  let riskReduction = 0;
  let healthGain = 0;
  
  // Apply mitigations based on conditions
  if (node.riskScore > CRITICAL_THRESHOLD) {
    actions.push('Emergency load shedding');
    riskReduction += 0.2;
    actions.push('Activated backup systems');
    riskReduction += 0.1;
  }
  
  if (node.loadRatio > 0.85) {
    actions.push('Load balancing to adjacent nodes');
    riskReduction += 0.1;
  }
  
  if (node.temperature > 65) {
    actions.push('Activated cooling systems');
    riskReduction += 0.05;
    healthGain += 0.05;
  }
  
  if (node.health < 0.5) {
    actions.push('Scheduled maintenance dispatch');
    healthGain += 0.1;
  }
  
  // Apply effectiveness multiplier
  riskReduction *= cfg.mitigationEffectiveness;
  healthGain *= cfg.mitigationEffectiveness;

  const updatedNode: Node = {
    ...node,
    riskScore: Math.max(0, node.riskScore - riskReduction),
    health: Math.min(1, node.health + healthGain),
    loadRatio: Math.max(0.3, node.loadRatio - 0.1),
    status: (node.riskScore - riskReduction) > WARNING_THRESHOLD ? 'degraded' : 'online',
  };

  return {
    success: actions.length > 0,
    node: node.name,
    updatedNode,
    actions,
    riskReduction,
  };
}

// ============================================================================
// System State
// ============================================================================

export function getSystemState(nodes: Record<string, Node>): SystemState {
  const nodeList = Object.values(nodes);
  const riskScores = nodeList.map((n) => n.riskScore);
  const healthScores = nodeList.map((n) => n.health);
  const loadRatios = nodeList.map((n) => n.loadRatio);
  
  return {
    maxRisk: Math.max(...riskScores),
    avgHealth: healthScores.reduce((a, b) => a + b, 0) / healthScores.length,
    loadRatio: loadRatios.reduce((a, b) => a + b, 0) / loadRatios.length,
    criticalNodes: nodeList
      .filter((n) => n.riskScore > CRITICAL_THRESHOLD || n.status === 'critical')
      .map((n) => n.id),
    warningNodes: nodeList
      .filter((n) => n.riskScore > WARNING_THRESHOLD && n.riskScore <= CRITICAL_THRESHOLD)
      .map((n) => n.id),
    totalNodes: nodeList.length,
    onlineNodes: nodeList.filter((n) => n.status !== 'offline').length,
    timestamp: new Date(),
  };
}

// ============================================================================
// Audit Hash
// ============================================================================

export function createAuditHash(data: Record<string, unknown>): string {
  const json = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

export function createSignedHash(
  data: Record<string, unknown>, 
  hmacKey: string
): { sha256: string; signature: string } {
  const json = JSON.stringify(data, Object.keys(data).sort());
  const sha256 = createHash('sha256').update(json).digest('hex');
  const signature = createHmac('sha256', hmacKey).update(sha256).digest('hex');
  return { sha256, signature };
}
