/**
 * Demo Controller Service
 * Powers scripted 2-3 minute investor demonstrations
 */

import { v4 as uuidv4 } from 'uuid';
import type { DemoStep, DemoSequence, DemoState } from '../types/index.js';
import * as DigitalTwinService from './DigitalTwinService.js';
import * as ThreatService from './ThreatService.js';
import * as RiskScoringService from './RiskScoringService.js';
import * as MitigationService from './MitigationService.js';
import { logStore, incidentStore } from '../stores/index.js';

// ============================================================================
// Demo State
// ============================================================================

let demoState: DemoState = {
  isRunning: false,
  currentStepIndex: -1,
};

let demoTimeouts: NodeJS.Timeout[] = [];
let onStepCallback: ((step: DemoStep, index: number) => void) | null = null;
let onCompleteCallback: (() => void) | null = null;

// ============================================================================
// Demo Sequences
// ============================================================================

const INVESTOR_DEMO: DemoSequence = {
  id: 'investor-demo',
  name: 'Investor Demo - Cascade Prediction',
  description: '2-3 minute demonstration showing cascade failure prediction and mitigation',
  totalDurationMs: 150000, // 2.5 minutes
  steps: [
    {
      id: 'step-1-normal',
      name: 'Normal Operations',
      description: 'System operating normally with all nodes online',
      durationMs: 15000,
      action: {
        type: 'normal',
        params: { resetThreats: true },
      },
      expectedOutcome: 'Grid stable, risk scores low, all nodes green',
    },
    {
      id: 'step-2-anomaly',
      name: 'Anomaly Detected',
      description: 'Load imbalance detected in Central region',
      durationMs: 20000,
      action: {
        type: 'anomaly',
        params: {
          region: 'Central',
          type: 'load_spike',
          severity: 0.4,
        },
      },
      expectedOutcome: 'Warning indicators appear, load ratios increase',
    },
    {
      id: 'step-3-prediction',
      name: 'AI Prediction Generated',
      description: 'Sentinel Grid predicts cascade failure in 4 hours',
      durationMs: 25000,
      action: {
        type: 'prediction',
        params: {
          type: 'cascade_failure',
          probability: 0.78,
          hoursToEvent: 4,
        },
      },
      expectedOutcome: 'High-confidence prediction with contributing factors',
    },
    {
      id: 'step-4-cascade',
      name: 'Cascade Path Visualization',
      description: 'Predicted cascade path shown across regions',
      durationMs: 20000,
      action: {
        type: 'cascade',
        params: {
          severity: 0.6,
          showPath: true,
        },
      },
      expectedOutcome: 'Visual cascade path, affected nodes highlighted',
    },
    {
      id: 'step-5-mitigation',
      name: 'Mitigation Recommended',
      description: 'System recommends load shedding and isolation',
      durationMs: 25000,
      action: {
        type: 'mitigation',
        params: {
          actions: ['load_shed', 'isolate', 'activate_backup'],
        },
      },
      expectedOutcome: 'Mitigation options displayed with risk reduction estimates',
    },
    {
      id: 'step-6-recovery',
      name: 'System Stabilizes',
      description: 'Mitigations applied, risk score decreasing',
      durationMs: 25000,
      action: {
        type: 'recovery',
        params: {},
      },
      expectedOutcome: 'Risk scores drop, nodes return to normal',
    },
    {
      id: 'step-7-summary',
      name: 'Demo Complete',
      description: 'Summary of prediction accuracy and time saved',
      durationMs: 20000,
      action: {
        type: 'normal',
        params: { summary: true },
      },
      expectedOutcome: '48-hour advance warning, $12M potential savings',
    },
  ],
};

const CYBER_ATTACK_DEMO: DemoSequence = {
  id: 'cyber-attack-demo',
  name: 'Cyber Attack Detection',
  description: 'Demonstration of cyber attack detection and response',
  totalDurationMs: 120000,
  steps: [
    {
      id: 'cyber-1',
      name: 'Normal Operations',
      description: 'All systems secure',
      durationMs: 10000,
      action: { type: 'normal', params: {} },
      expectedOutcome: 'All cyber health indicators green',
    },
    {
      id: 'cyber-2',
      name: 'Reconnaissance Detected',
      description: 'Anomalous network scanning detected',
      durationMs: 15000,
      action: {
        type: 'anomaly',
        params: { type: 'cyber_recon', severity: 0.3 },
      },
      expectedOutcome: 'Tamper signals increase on perimeter nodes',
    },
    {
      id: 'cyber-3',
      name: 'Attack in Progress',
      description: 'False data injection detected',
      durationMs: 20000,
      action: {
        type: 'cascade',
        params: {
          threatType: 'cyber_attack',
          subtype: 'false_data_injection',
          severity: 0.7,
        },
      },
      expectedOutcome: 'Cyber health drops, compromised status',
    },
    {
      id: 'cyber-4',
      name: 'AI Response',
      description: 'Cyber lockdown recommended',
      durationMs: 20000,
      action: {
        type: 'mitigation',
        params: { actions: ['cyber_lockdown', 'isolate'] },
      },
      expectedOutcome: 'Isolation of affected SCADA systems',
    },
    {
      id: 'cyber-5',
      name: 'Threat Contained',
      description: 'Attack vector isolated',
      durationMs: 20000,
      action: { type: 'recovery', params: {} },
      expectedOutcome: 'System returns to secure state',
    },
  ],
};

const AVAILABLE_DEMOS: Record<string, DemoSequence> = {
  'investor-demo': INVESTOR_DEMO,
  'cyber-attack-demo': CYBER_ATTACK_DEMO,
};

// ============================================================================
// Execute Demo Step
// ============================================================================

function executeStep(step: DemoStep, index: number): void {
  demoState.currentStepIndex = index;
  
  logStore.addSimulationLog('demo', `Executing step: ${step.name}`, {
    stepId: step.id,
    stepIndex: index,
    action: step.action.type,
  });

  const params = step.action.params;

  switch (step.action.type) {
    case 'normal':
      if (params.resetThreats) {
        ThreatService.endAllThreats();
      }
      // Stabilize all nodes
      stabilizeNodes();
      break;

    case 'anomaly':
      createAnomaly(params);
      break;

    case 'prediction':
      generateDemoPrediction(params);
      break;

    case 'cascade':
      triggerDemoCascade(params);
      break;

    case 'mitigation':
      applyDemoMitigation(params);
      break;

    case 'recovery':
      recoverSystem();
      break;
  }

  // Notify callback
  if (onStepCallback) {
    onStepCallback(step, index);
  }
}

// ============================================================================
// Step Implementations
// ============================================================================

function stabilizeNodes(): void {
  const nodes = DigitalTwinService.getAllNodes();
  nodes.forEach(node => {
    if (node.riskScore > 0.5) {
      DigitalTwinService.applyMitigationToNode(node.id, 'activate_backup');
    }
  });
}

function createAnomaly(params: Record<string, unknown>): void {
  const region = params.region as string || 'Central';
  const severity = params.severity as number || 0.4;
  const type = params.type as string || 'load_spike';

  const regionNodes = DigitalTwinService.getNodesByRegion(region);
  const targetNodes = regionNodes.slice(0, Math.ceil(regionNodes.length * 0.3));

  targetNodes.forEach(node => {
    if (type === 'load_spike') {
      node.loadRatio = Math.min(0.9, node.loadRatio + severity * 0.3);
      node.riskScore = Math.min(0.7, node.riskScore + severity * 0.2);
    } else if (type === 'cyber_recon') {
      node.tamperSignal = Math.min(0.5, node.tamperSignal + severity * 0.3);
      node.latency = Math.min(150, node.latency + severity * 50);
    }
  });
}

function generateDemoPrediction(params: Record<string, unknown>): void {
  const type = params.type as string || 'cascade_failure';
  const probability = params.probability as number || 0.75;
  const hoursToEvent = params.hoursToEvent as number || 4;

  // Find a high-risk node to attach prediction to
  const nodes = DigitalTwinService.getAllNodes()
    .sort((a, b) => b.riskScore - a.riskScore);
  
  const targetNode = nodes[0];
  if (!targetNode) return;

  // The prediction will be generated naturally by the risk scoring service
  // Just ensure the node is at appropriate risk level
  targetNode.riskScore = Math.max(0.65, targetNode.riskScore);
  targetNode.status = 'degraded';

  // Generate and store prediction
  const prediction = RiskScoringService.generatePrediction(targetNode);
  if (prediction) {
    // Adjust to match demo parameters
    prediction.probability = probability;
    prediction.hoursToEvent = hoursToEvent;
  }
}

function triggerDemoCascade(params: Record<string, unknown>): void {
  const severity = params.severity as number || 0.6;
  const threatType = params.threatType as string;
  const subtype = params.subtype as string;

  if (threatType === 'cyber_attack') {
    ThreatService.createCyberAttack(
      null,
      (subtype as any) || 'false_data_injection',
      severity
    );
  } else {
    // Physical cascade
    const criticalNodes = DigitalTwinService.getCriticalNodes();
    const degradedNodes = DigitalTwinService.getAllNodes()
      .filter(n => n.status === 'degraded');
    
    const origin = criticalNodes[0] || degradedNodes[0];
    if (origin) {
      ThreatService.createThreat({
        type: 'cascade_origin',
        target: origin.id,
        severity,
        durationSeconds: 60,
      });
    }
  }
}

function applyDemoMitigation(params: Record<string, unknown>): void {
  const actions = params.actions as string[] || ['load_shed'];
  
  // Get all recommendations and execute them
  const recommendations = MitigationService.getPendingRecommendations();
  
  recommendations.slice(0, 5).forEach(rec => {
    MitigationService.executeMitigation(rec.nodeId, rec.actionType, 'demo-system');
  });

  // Also mitigate any critical nodes
  const criticalNodes = DigitalTwinService.getCriticalNodes();
  criticalNodes.forEach(node => {
    const action = actions[0] as any || 'load_shed';
    MitigationService.executeMitigation(node.id, action, 'demo-system');
  });
}

function recoverSystem(): void {
  ThreatService.endAllThreats();
  
  const allNodes = DigitalTwinService.getAllNodes();
  allNodes.forEach(node => {
    if (node.status === 'critical' || node.status === 'degraded') {
      DigitalTwinService.applyMitigationToNode(node.id, 'activate_backup');
      DigitalTwinService.applyMitigationToNode(node.id, 'enable_cooling');
    }
    if (node.cyberStatus !== 'secure') {
      DigitalTwinService.applyMitigationToNode(node.id, 'cyber_lockdown');
    }
  });
}

// ============================================================================
// Run Demo
// ============================================================================

export function runDemo(
  demoId: string = 'investor-demo',
  stepCallback?: (step: DemoStep, index: number) => void,
  completeCallback?: () => void
): { success: boolean; message: string } {
  const sequence = AVAILABLE_DEMOS[demoId];
  if (!sequence) {
    return { success: false, message: `Demo '${demoId}' not found` };
  }

  if (demoState.isRunning) {
    return { success: false, message: 'Demo already running' };
  }

  // Reset state
  resetDemo();

  demoState.isRunning = true;
  demoState.startedAt = new Date().toISOString();
  demoState.sequence = sequence;
  onStepCallback = stepCallback || null;
  onCompleteCallback = completeCallback || null;

  logStore.addSimulationLog('demo', `Starting demo: ${sequence.name}`, {
    demoId,
    totalSteps: sequence.steps.length,
    totalDurationMs: sequence.totalDurationMs,
  });

  // Schedule all steps
  let cumulativeDelay = 0;
  sequence.steps.forEach((step, index) => {
    const timeout = setTimeout(() => {
      executeStep(step, index);
    }, cumulativeDelay);
    demoTimeouts.push(timeout);
    cumulativeDelay += step.durationMs;
  });

  // Schedule completion
  const completeTimeout = setTimeout(() => {
    demoState.isRunning = false;
    logStore.addSimulationLog('demo', `Demo completed: ${sequence.name}`, {
      demoId,
      duration: cumulativeDelay,
    });
    if (onCompleteCallback) {
      onCompleteCallback();
    }
  }, cumulativeDelay);
  demoTimeouts.push(completeTimeout);

  return { success: true, message: `Demo '${sequence.name}' started` };
}

// ============================================================================
// Reset Demo
// ============================================================================

export function resetDemo(): void {
  // Clear all timeouts
  demoTimeouts.forEach(t => clearTimeout(t));
  demoTimeouts = [];

  // Reset state
  demoState = {
    isRunning: false,
    currentStepIndex: -1,
  };

  // Clear threats and recover system
  ThreatService.endAllThreats();
  MitigationService.clearRecommendations();
  
  // Reset digital twin
  DigitalTwinService.resetDigitalTwin();
  DigitalTwinService.initializeDigitalTwin(150, 12345);

  logStore.addSimulationLog('demo', 'Demo reset complete', {});
}

// ============================================================================
// Queries
// ============================================================================

export function getDemoState(): DemoState {
  return { ...demoState };
}

export function getAvailableDemos(): DemoSequence[] {
  return Object.values(AVAILABLE_DEMOS);
}

export function isDemoRunning(): boolean {
  return demoState.isRunning;
}

export function getCurrentStep(): DemoStep | null {
  if (!demoState.sequence || demoState.currentStepIndex < 0) return null;
  return demoState.sequence.steps[demoState.currentStepIndex] || null;
}

export function skipToStep(stepIndex: number): boolean {
  if (!demoState.isRunning || !demoState.sequence) return false;
  if (stepIndex < 0 || stepIndex >= demoState.sequence.steps.length) return false;
  
  const step = demoState.sequence.steps[stepIndex];
  executeStep(step, stepIndex);
  return true;
}
