/**
 * Risk Scoring Service
 * Advanced risk calculation with probability, severity, and contributing factors
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  RiskScore,
  LeadingFactor,
  DigitalTwinNode,
  EnhancedPrediction,
  PredictionReasoning,
  ContributingFactor,
  SuggestedAction,
  SeverityLevel,
  MitigationActionType,
} from '../types/index.js';
import * as DigitalTwinService from './DigitalTwinService.js';

// ============================================================================
// Historical Patterns for Pattern Matching
// ============================================================================

const HISTORICAL_PATTERNS = [
  {
    id: 'pattern-thermal-cascade',
    name: 'Thermal Cascade Failure',
    indicators: ['high_temperature', 'high_load', 'neighbor_stress'],
    outcome: 'Cascading thermal failure affecting 12+ nodes',
    similarity: 0.85,
  },
  {
    id: 'pattern-cyber-propagation',
    name: 'Cyber Attack Propagation',
    indicators: ['tamper_signal', 'packet_loss', 'latency_spike'],
    outcome: 'Compromise spread to control systems',
    similarity: 0.78,
  },
  {
    id: 'pattern-overload-cascade',
    name: 'Load-Induced Cascade',
    indicators: ['overload', 'voltage_deviation', 'frequency_drop'],
    outcome: 'Regional blackout affecting distribution network',
    similarity: 0.92,
  },
  {
    id: 'pattern-generation-loss',
    name: 'Generation Capacity Loss',
    indicators: ['generator_trip', 'frequency_deviation', 'voltage_sag'],
    outcome: 'Emergency load shedding required',
    similarity: 0.88,
  },
];

// ============================================================================
// Risk Score Calculation
// ============================================================================

export function calculateRiskScore(node: DigitalTwinNode): RiskScore {
  // Physical risk components
  const thermalRisk = node.temperature >= node.thermalLimit ? 0.9 :
    node.temperature >= node.thermalLimit * 0.9 ? 0.6 :
    node.temperature / node.thermalLimit;
  
  const loadRisk = node.loadRatio >= 0.95 ? 0.95 :
    node.loadRatio >= 0.85 ? 0.7 :
    node.loadRatio >= 0.7 ? 0.4 : node.loadRatio * 0.5;

  const voltageDeviation = Math.abs(node.voltage - 230) / 20;
  const frequencyDeviation = Math.abs(node.frequency - 60) / 0.5;
  
  const physicalRisk = (thermalRisk * 0.35 + loadRisk * 0.35 + 
    voltageDeviation * 0.15 + frequencyDeviation * 0.15);

  // Cyber risk components
  const tamperRisk = node.tamperSignal >= 0.7 ? 0.9 : node.tamperSignal;
  const latencyRisk = node.latency >= 200 ? 0.8 : node.latency / 300;
  const packetRisk = node.packetLoss >= 0.3 ? 0.9 : node.packetLoss * 2;
  const cyberHealthRisk = 1 - node.cyberHealth;

  const cyberRisk = (tamperRisk * 0.4 + latencyRisk * 0.2 + 
    packetRisk * 0.2 + cyberHealthRisk * 0.2);

  // Operational risk
  const operationalRisk = (1 - node.health) * 0.6 + 
    (node.failedAuthCount > 3 ? 0.4 : node.failedAuthCount * 0.1);

  // Environmental risk (simplified - would come from weather service)
  const environmentalRisk = Math.random() * 0.3;

  // Cascading risk from neighbors
  const neighbors = DigitalTwinService.getNeighbors(node.id);
  const neighborRisks = neighbors.map(n => n.riskScore);
  const cascadingRisk = neighborRisks.length > 0 
    ? neighborRisks.reduce((a, b) => a + b, 0) / neighborRisks.length * 0.7
    : 0;

  // Overall risk
  const overall = Math.min(1, 
    physicalRisk * 0.3 + 
    cyberRisk * 0.25 + 
    operationalRisk * 0.2 + 
    environmentalRisk * 0.1 + 
    cascadingRisk * 0.15
  );

  // Probability and severity
  const probability = Math.min(1, overall * 1.2);
  const severity = overall >= 0.8 ? 0.9 : overall >= 0.6 ? 0.7 : overall >= 0.4 ? 0.5 : 0.3;

  // Time to failure estimation (hours)
  const timeToFailure = overall >= 0.9 ? 0.5 :
    overall >= 0.8 ? 2 :
    overall >= 0.6 ? 6 :
    overall >= 0.4 ? 24 : 48;

  // Leading factors
  const leadingFactors: LeadingFactor[] = [];

  if (thermalRisk > 0.5) {
    leadingFactors.push({
      name: 'Thermal Stress',
      contribution: thermalRisk,
      value: node.temperature,
      threshold: node.thermalLimit,
      trend: node.temperature > 60 ? 'increasing' : 'stable',
      explanation: `Temperature at ${node.temperature.toFixed(1)}°C approaching thermal limit of ${node.thermalLimit}°C`,
    });
  }

  if (loadRisk > 0.5) {
    leadingFactors.push({
      name: 'Load Overload',
      contribution: loadRisk,
      value: node.loadRatio,
      threshold: 0.85,
      trend: node.loadRatio > 0.8 ? 'increasing' : 'stable',
      explanation: `Load ratio at ${(node.loadRatio * 100).toFixed(0)}% exceeds safe operating threshold`,
    });
  }

  if (tamperRisk > 0.3) {
    leadingFactors.push({
      name: 'Cyber Tampering',
      contribution: tamperRisk,
      value: node.tamperSignal,
      threshold: 0.5,
      trend: node.tamperSignal > 0.4 ? 'increasing' : 'stable',
      explanation: `Anomalous telemetry patterns detected suggesting potential tampering`,
    });
  }

  if (cascadingRisk > 0.3) {
    leadingFactors.push({
      name: 'Neighbor Risk Propagation',
      contribution: cascadingRisk,
      value: cascadingRisk,
      threshold: 0.4,
      trend: 'stable',
      explanation: `Connected nodes showing elevated risk levels`,
    });
  }

  // Sort by contribution
  leadingFactors.sort((a, b) => b.contribution - a.contribution);

  // Confidence interval
  const stdDev = overall * 0.15;
  const confidenceInterval: [number, number] = [
    Math.max(0, overall - 1.96 * stdDev),
    Math.min(1, overall + 1.96 * stdDev),
  ];

  // Trend
  const trend = overall > node.riskScore * 1.1 ? 'increasing' :
    overall < node.riskScore * 0.9 ? 'decreasing' : 'stable';

  return {
    overall,
    probability,
    severity,
    timeToFailure,
    confidenceInterval,
    trend,
    components: {
      physical: physicalRisk,
      cyber: cyberRisk,
      operational: operationalRisk,
      environmental: environmentalRisk,
      cascading: cascadingRisk,
    },
    leadingFactors,
  };
}

// ============================================================================
// Cascade Prediction
// ============================================================================

export function predictCascadePath(originNodeId: string): string[] {
  const visited = new Set<string>();
  const path: string[] = [originNodeId];
  const queue: { nodeId: string; depth: number; riskTransfer: number }[] = [];

  const originNode = DigitalTwinService.getNodeById(originNodeId);
  if (!originNode) return path;

  queue.push({ nodeId: originNodeId, depth: 0, riskTransfer: originNode.riskScore });
  visited.add(originNodeId);

  while (queue.length > 0) {
    const { nodeId, depth, riskTransfer } = queue.shift()!;
    if (depth > 5 || riskTransfer < 0.2) continue;

    const neighbors = DigitalTwinService.getNeighbors(nodeId);
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.id)) continue;

      // Calculate propagation probability based on edge weight and node vulnerability
      const propagationProb = 0.4 * (1 - depth * 0.1) * (1 - neighbor.health);
      if (Math.random() > propagationProb) continue;

      visited.add(neighbor.id);
      path.push(neighbor.id);
      
      const newRiskTransfer = riskTransfer * 0.7 * (1 - neighbor.health * 0.5);
      queue.push({ nodeId: neighbor.id, depth: depth + 1, riskTransfer: newRiskTransfer });
    }
  }

  return path;
}

// ============================================================================
// Generate Enhanced Prediction
// ============================================================================

export function generatePrediction(node: DigitalTwinNode): EnhancedPrediction | null {
  const riskScore = calculateRiskScore(node);

  // Only generate predictions for high-risk nodes
  if (riskScore.overall < 0.5) return null;

  // Determine prediction type
  let predictionType: string;
  let primaryFactor: LeadingFactor | undefined;

  if (riskScore.components.cyber > 0.6) {
    predictionType = 'cyber_vulnerability';
    primaryFactor = riskScore.leadingFactors.find(f => f.name.includes('Cyber'));
  } else if (riskScore.components.physical > 0.6 && node.temperature > node.thermalLimit * 0.85) {
    predictionType = 'thermal_stress';
    primaryFactor = riskScore.leadingFactors.find(f => f.name.includes('Thermal'));
  } else if (node.loadRatio > 0.85) {
    predictionType = 'overload';
    primaryFactor = riskScore.leadingFactors.find(f => f.name.includes('Load'));
  } else if (riskScore.components.cascading > 0.4) {
    predictionType = 'cascade_failure';
    primaryFactor = riskScore.leadingFactors.find(f => f.name.includes('Neighbor'));
  } else {
    predictionType = 'equipment_failure';
    primaryFactor = riskScore.leadingFactors[0];
  }

  // Find matching historical pattern
  const matchedPattern = HISTORICAL_PATTERNS.find(p => {
    if (predictionType === 'thermal_stress' && p.id === 'pattern-thermal-cascade') return true;
    if (predictionType === 'cyber_vulnerability' && p.id === 'pattern-cyber-propagation') return true;
    if (predictionType === 'overload' && p.id === 'pattern-overload-cascade') return true;
    return false;
  });

  // Generate structured reasoning
  const structuredReasoning: PredictionReasoning = {
    rootCause: primaryFactor?.explanation || `Elevated risk detected in ${node.name}`,
    leadingSignals: riskScore.leadingFactors.slice(0, 4).map(f => f.explanation),
    historicalPattern: matchedPattern?.outcome || 'Similar conditions have led to equipment degradation',
    riskShift: riskScore.trend === 'increasing' 
      ? `Risk level increasing from ${(node.riskScore * 100).toFixed(0)}% to ${(riskScore.overall * 100).toFixed(0)}%`
      : `Risk level stable at ${(riskScore.overall * 100).toFixed(0)}%`,
    confidenceDriver: `Based on ${riskScore.leadingFactors.length} contributing factors with ${(riskScore.probability * 100).toFixed(0)}% confidence`,
    recommendedMitigation: generateMitigationText(predictionType, node),
    patternMatch: matchedPattern ? {
      patternId: matchedPattern.id,
      similarity: matchedPattern.similarity,
      historicalOutcome: matchedPattern.outcome,
    } : undefined,
  };

  // Contributing factors
  const contributingFactors: ContributingFactor[] = riskScore.leadingFactors.slice(0, 5).map(f => ({
    factor: f.name,
    weight: f.contribution,
    currentValue: f.value,
    threshold: f.threshold,
    trend: f.trend,
  }));

  // Suggested actions
  const suggestedActions = generateSuggestedActions(predictionType, node, riskScore);

  // Cascade path prediction
  const cascadePath = riskScore.overall > 0.7 ? predictCascadePath(node.id) : undefined;

  // Severity level
  const severityLevel: SeverityLevel = riskScore.overall >= 0.8 ? 'critical' :
    riskScore.overall >= 0.6 ? 'high' :
    riskScore.overall >= 0.4 ? 'medium' : 'low';

  const now = new Date();
  const predictedTime = new Date(now.getTime() + riskScore.timeToFailure * 3600000);

  return {
    id: `pred_${uuidv4().slice(0, 8)}`,
    nodeId: node.id,
    nodeName: node.name,
    type: predictionType,
    probability: riskScore.probability,
    confidence: 0.7 + Math.random() * 0.25,
    hoursToEvent: riskScore.timeToFailure,
    predictedTime: predictedTime.toISOString(),
    severity: severityLevel,
    riskScore,
    reasoning: structuredReasoning.rootCause,
    structuredReasoning,
    contributingFactors,
    suggestedActions,
    cascadePath,
    status: 'active',
    createdAt: now.toISOString(),
  };
}

// ============================================================================
// Generate Mitigation Text
// ============================================================================

function generateMitigationText(predictionType: string, node: DigitalTwinNode): string {
  switch (predictionType) {
    case 'thermal_stress':
      return `Activate cooling systems for ${node.name}, consider load shedding if temperature exceeds ${node.thermalLimit}°C`;
    case 'overload':
      return `Implement load shedding for ${node.name}, reroute power to neighboring nodes`;
    case 'cyber_vulnerability':
      return `Initiate cyber lockdown on ${node.name}, isolate from SCADA network, dispatch security team`;
    case 'cascade_failure':
      return `Pre-emptively isolate ${node.name} to prevent cascade propagation, activate backup systems`;
    case 'equipment_failure':
      return `Dispatch maintenance to ${node.name}, prepare backup equipment for hot swap`;
    default:
      return `Monitor ${node.name} closely, prepare contingency measures`;
  }
}

// ============================================================================
// Generate Suggested Actions
// ============================================================================

function generateSuggestedActions(
  predictionType: string, 
  node: DigitalTwinNode,
  riskScore: RiskScore
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  if (predictionType === 'thermal_stress' || node.temperature > node.thermalLimit * 0.9) {
    actions.push({
      action: 'Activate auxiliary cooling systems',
      priority: 'immediate',
      impact: 'high',
      estimatedEffect: 0.3,
      automated: true,
      actionType: 'enable_cooling',
    });
  }

  if (predictionType === 'overload' || node.loadRatio > 0.85) {
    actions.push({
      action: 'Implement emergency load shedding',
      priority: 'immediate',
      impact: 'critical',
      estimatedEffect: 0.4,
      automated: true,
      actionType: 'load_shed',
    });
    actions.push({
      action: 'Reroute power to adjacent substations',
      priority: 'high',
      impact: 'high',
      estimatedEffect: 0.25,
      automated: false,
      actionType: 'reroute',
    });
  }

  if (predictionType === 'cyber_vulnerability' || node.cyberStatus !== 'secure') {
    actions.push({
      action: 'Initiate network isolation protocol',
      priority: 'immediate',
      impact: 'critical',
      estimatedEffect: 0.5,
      automated: false,
      actionType: 'cyber_lockdown',
    });
  }

  if (predictionType === 'cascade_failure' || riskScore.components.cascading > 0.5) {
    actions.push({
      action: 'Isolate node from grid to prevent cascade',
      priority: 'high',
      impact: 'critical',
      estimatedEffect: 0.6,
      automated: false,
      actionType: 'isolate',
    });
  }

  if (node.health < 0.6) {
    actions.push({
      action: 'Dispatch maintenance crew',
      priority: 'high',
      impact: 'medium',
      estimatedEffect: 0.2,
      automated: false,
      actionType: 'dispatch_maintenance',
    });
  }

  actions.push({
    action: 'Activate backup systems',
    priority: 'medium',
    impact: 'high',
    estimatedEffect: 0.35,
    automated: true,
    actionType: 'activate_backup',
  });

  // Sort by priority
  const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions.slice(0, 5);
}

// ============================================================================
// Generate All Predictions
// ============================================================================

export function generateAllPredictions(): EnhancedPrediction[] {
  const nodes = DigitalTwinService.getAllNodes();
  const predictions: EnhancedPrediction[] = [];

  for (const node of nodes) {
    if (node.riskScore > 0.5 || node.status === 'critical' || node.cyberStatus !== 'secure') {
      const prediction = generatePrediction(node);
      if (prediction) {
        predictions.push(prediction);
      }
    }
  }

  // Sort by severity and probability
  predictions.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.probability - a.probability;
  });

  return predictions.slice(0, 20); // Return top 20 predictions
}

// ============================================================================
// Accuracy Tracking
// ============================================================================

interface PredictionOutcome {
  predictionId: string;
  wasAccurate: boolean;
  type: string;
  resolvedAt: string;
}

const predictionOutcomes: PredictionOutcome[] = [];

export function recordPredictionOutcome(
  predictionId: string,
  wasAccurate: boolean,
  type: string
): void {
  predictionOutcomes.push({
    predictionId,
    wasAccurate,
    type,
    resolvedAt: new Date().toISOString(),
  });
}

export function getAccuracyStats(): {
  total: number;
  accurate: number;
  accuracy: number;
  byType: Record<string, { total: number; accurate: number; accuracy: number }>;
} {
  const total = predictionOutcomes.length;
  const accurate = predictionOutcomes.filter(o => o.wasAccurate).length;
  
  const byType: Record<string, { total: number; accurate: number; accuracy: number }> = {};
  
  predictionOutcomes.forEach(outcome => {
    if (!byType[outcome.type]) {
      byType[outcome.type] = { total: 0, accurate: 0, accuracy: 0 };
    }
    byType[outcome.type].total++;
    if (outcome.wasAccurate) byType[outcome.type].accurate++;
  });

  Object.keys(byType).forEach(type => {
    byType[type].accuracy = byType[type].total > 0 
      ? byType[type].accurate / byType[type].total 
      : 0;
  });

  return {
    total,
    accurate,
    accuracy: total > 0 ? accurate / total : 0,
    byType,
  };
}

export function clearAccuracyStats(): void {
  predictionOutcomes.length = 0;
}
