/**
 * Mitigation Advisor Service
 * Computes recommended actions for predictions and incidents
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  MitigationRecommendation,
  MitigationActionType,
  EnhancedPrediction,
  Incident,
  DigitalTwinNode,
  SeverityLevel,
} from '../types/index.js';
import * as DigitalTwinService from './DigitalTwinService.js';
import { logStore } from '../stores/index.js';

// ============================================================================
// Recommendation Store
// ============================================================================

const recommendations: Map<string, MitigationRecommendation> = new Map();

// ============================================================================
// Generate Recommendations for Prediction
// ============================================================================

export function generateRecommendationsForPrediction(
  prediction: EnhancedPrediction
): MitigationRecommendation[] {
  const node = DigitalTwinService.getNodeById(prediction.nodeId);
  if (!node) return [];

  const newRecommendations: MitigationRecommendation[] = [];

  // Based on prediction type, generate specific recommendations
  switch (prediction.type) {
    case 'thermal_stress':
      newRecommendations.push(
        createRecommendation(node, 'enable_cooling', 'immediate', prediction.id),
        createRecommendation(node, 'load_shed', 'high', prediction.id)
      );
      break;

    case 'overload':
      newRecommendations.push(
        createRecommendation(node, 'load_shed', 'immediate', prediction.id),
        createRecommendation(node, 'reroute', 'high', prediction.id),
        createRecommendation(node, 'activate_backup', 'medium', prediction.id)
      );
      break;

    case 'cyber_vulnerability':
      newRecommendations.push(
        createRecommendation(node, 'cyber_lockdown', 'immediate', prediction.id),
        createRecommendation(node, 'isolate', 'high', prediction.id)
      );
      break;

    case 'cascade_failure':
      newRecommendations.push(
        createRecommendation(node, 'isolate', 'immediate', prediction.id),
        createRecommendation(node, 'activate_backup', 'high', prediction.id),
        createRecommendation(node, 'reroute', 'high', prediction.id)
      );
      break;

    case 'equipment_failure':
      newRecommendations.push(
        createRecommendation(node, 'dispatch_maintenance', 'high', prediction.id),
        createRecommendation(node, 'activate_backup', 'medium', prediction.id)
      );
      break;

    default:
      newRecommendations.push(
        createRecommendation(node, 'dispatch_maintenance', 'medium', prediction.id)
      );
  }

  // Store recommendations
  newRecommendations.forEach(rec => recommendations.set(rec.id, rec));

  return newRecommendations;
}

// ============================================================================
// Generate Recommendations for Incident
// ============================================================================

export function generateRecommendationsForIncident(
  incident: Incident
): MitigationRecommendation[] {
  const newRecommendations: MitigationRecommendation[] = [];

  incident.affectedNodes.forEach(nodeId => {
    const node = DigitalTwinService.getNodeById(nodeId);
    if (!node) return;

    // Priority based on node status
    const priority = node.status === 'critical' ? 'immediate' : 
      node.status === 'degraded' ? 'high' : 'medium';

    if (node.status === 'critical') {
      newRecommendations.push(
        createRecommendation(node, 'isolate', priority, undefined, incident.id)
      );
    }

    if (node.loadRatio > 0.85) {
      newRecommendations.push(
        createRecommendation(node, 'load_shed', priority, undefined, incident.id)
      );
    }

    if (node.cyberStatus !== 'secure') {
      newRecommendations.push(
        createRecommendation(node, 'cyber_lockdown', priority, undefined, incident.id)
      );
    }
  });

  // Store recommendations
  newRecommendations.forEach(rec => recommendations.set(rec.id, rec));

  return newRecommendations;
}

// ============================================================================
// Create Recommendation Helper
// ============================================================================

function createRecommendation(
  node: DigitalTwinNode,
  actionType: MitigationActionType,
  priority: 'immediate' | 'high' | 'medium' | 'low',
  predictionId?: string,
  incidentId?: string
): MitigationRecommendation {
  const descriptions: Record<MitigationActionType, string> = {
    isolate: `Isolate ${node.name} from grid to prevent cascade propagation`,
    load_shed: `Reduce load on ${node.name} by ${Math.round((node.loadRatio - 0.7) * 100)}%`,
    reroute: `Reroute power/data from ${node.name} to backup paths`,
    activate_backup: `Activate backup systems for ${node.name}`,
    dispatch_maintenance: `Dispatch maintenance crew to ${node.name}`,
    enable_cooling: `Enable auxiliary cooling for ${node.name}`,
    cyber_lockdown: `Initiate cyber lockdown on ${node.name}`,
    manual_override: `Manual operator override required for ${node.name}`,
  };

  const estimatedEffects: Record<MitigationActionType, number> = {
    isolate: 0.6,
    load_shed: 0.4,
    reroute: 0.35,
    activate_backup: 0.45,
    dispatch_maintenance: 0.2,
    enable_cooling: 0.3,
    cyber_lockdown: 0.5,
    manual_override: 0.25,
  };

  const estimatedTimes: Record<MitigationActionType, number> = {
    isolate: 1,
    load_shed: 2,
    reroute: 5,
    activate_backup: 3,
    dispatch_maintenance: 30,
    enable_cooling: 1,
    cyber_lockdown: 2,
    manual_override: 10,
  };

  const automatable: Record<MitigationActionType, boolean> = {
    isolate: false,
    load_shed: true,
    reroute: false,
    activate_backup: true,
    dispatch_maintenance: false,
    enable_cooling: true,
    cyber_lockdown: false,
    manual_override: false,
  };

  return {
    id: `rec_${uuidv4().slice(0, 8)}`,
    nodeId: node.id,
    predictionId,
    incidentId,
    actionType,
    priority,
    description: descriptions[actionType],
    expectedRiskReduction: estimatedEffects[actionType],
    estimatedTimeMinutes: estimatedTimes[actionType],
    requiresApproval: !automatable[actionType],
    automatable: automatable[actionType],
    dependencies: getDependencies(actionType),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

function getDependencies(actionType: MitigationActionType): string[] {
  const deps: Record<MitigationActionType, string[]> = {
    isolate: ['reroute'],
    load_shed: [],
    reroute: [],
    activate_backup: [],
    dispatch_maintenance: [],
    enable_cooling: [],
    cyber_lockdown: ['isolate'],
    manual_override: [],
  };
  return deps[actionType] || [];
}

// ============================================================================
// Execute Mitigation
// ============================================================================

export function executeMitigation(
  nodeId: string,
  actionType: MitigationActionType,
  operator?: string
): { success: boolean; riskReduction: number; message: string } {
  const node = DigitalTwinService.getNodeById(nodeId);
  if (!node) {
    return { success: false, riskReduction: 0, message: 'Node not found' };
  }

  // Apply mitigation
  const success = DigitalTwinService.applyMitigationToNode(nodeId, actionType);
  if (!success) {
    return { success: false, riskReduction: 0, message: 'Mitigation failed to apply' };
  }

  // Calculate risk reduction
  const riskReductionMap: Record<MitigationActionType, number> = {
    isolate: 0.5,
    load_shed: 0.3,
    reroute: 0.25,
    activate_backup: 0.35,
    dispatch_maintenance: 0.15,
    enable_cooling: 0.2,
    cyber_lockdown: 0.4,
    manual_override: 0.2,
  };

  const riskReduction = riskReductionMap[actionType] || 0.2;

  // Log the action
  logStore.addOperatorLog('mitigation', `Executed ${actionType} on ${node.name}`, {
    nodeId,
    actionType,
    riskReduction,
    previousRisk: node.riskScore,
    newRisk: Math.max(0, node.riskScore - riskReduction),
  }, operator);

  // Update any pending recommendations
  recommendations.forEach((rec, id) => {
    if (rec.nodeId === nodeId && rec.actionType === actionType && rec.status === 'pending') {
      rec.status = 'completed';
    }
  });

  return {
    success: true,
    riskReduction,
    message: `Successfully executed ${actionType} on ${node.name}`,
  };
}

// ============================================================================
// Batch Mitigation
// ============================================================================

export function executeBatchMitigation(
  nodeIds: string[],
  actionType: MitigationActionType,
  operator?: string
): { success: number; failed: number; totalRiskReduction: number } {
  let success = 0;
  let failed = 0;
  let totalRiskReduction = 0;

  nodeIds.forEach(nodeId => {
    const result = executeMitigation(nodeId, actionType, operator);
    if (result.success) {
      success++;
      totalRiskReduction += result.riskReduction;
    } else {
      failed++;
    }
  });

  return { success, failed, totalRiskReduction };
}

// ============================================================================
// Auto-Mitigation for Critical Nodes
// ============================================================================

export function autoMitigateCriticalNodes(): {
  mitigated: number;
  actions: Array<{ nodeId: string; action: string }>;
} {
  const criticalNodes = DigitalTwinService.getCriticalNodes();
  const actions: Array<{ nodeId: string; action: string }> = [];

  criticalNodes.forEach(node => {
    // Determine best automatic action
    let actionType: MitigationActionType = 'activate_backup';

    if (node.loadRatio > 0.9) {
      actionType = 'load_shed';
    } else if (node.temperature > node.thermalLimit * 0.95) {
      actionType = 'enable_cooling';
    }

    const result = executeMitigation(node.id, actionType, 'auto-mitigation');
    if (result.success) {
      actions.push({ nodeId: node.id, action: actionType });
    }
  });

  logStore.addSystemLog('mitigation', `Auto-mitigation executed on ${actions.length} nodes`, {
    mitigatedCount: actions.length,
    criticalCount: criticalNodes.length,
  });

  return {
    mitigated: actions.length,
    actions,
  };
}

// ============================================================================
// Query Recommendations
// ============================================================================

export function getAllRecommendations(): MitigationRecommendation[] {
  return Array.from(recommendations.values())
    .sort((a, b) => {
      const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

export function getPendingRecommendations(): MitigationRecommendation[] {
  return getAllRecommendations().filter(r => r.status === 'pending');
}

export function getRecommendationsForNode(nodeId: string): MitigationRecommendation[] {
  return getAllRecommendations().filter(r => r.nodeId === nodeId);
}

export function getRecommendationsForPrediction(predictionId: string): MitigationRecommendation[] {
  return getAllRecommendations().filter(r => r.predictionId === predictionId);
}

export function getRecommendationsForIncident(incidentId: string): MitigationRecommendation[] {
  return getAllRecommendations().filter(r => r.incidentId === incidentId);
}

export function approveRecommendation(recommendationId: string): boolean {
  const rec = recommendations.get(recommendationId);
  if (!rec || rec.status !== 'pending') return false;
  rec.status = 'approved';
  return true;
}

export function clearRecommendations(): void {
  recommendations.clear();
}
