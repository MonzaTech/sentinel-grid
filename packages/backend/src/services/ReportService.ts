/**
 * Report Service
 * Generates incident reports, accuracy reports, and operator log summaries
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IncidentReport,
  AccuracyReport,
  OperatorLogReport,
  Incident,
  LogEntry,
} from '../types/index.js';
import { incidentStore, logStore } from '../stores/index.js';
import * as RiskScoringService from './RiskScoringService.js';

// ============================================================================
// Prediction Tracking for Accuracy
// ============================================================================

interface TrackedPrediction {
  id: string;
  type: string;
  nodeId: string;
  probability: number;
  severity: string;
  createdAt: string;
  predictedTime: string;
  wasAccurate?: boolean;
  resolvedAt?: string;
  actualOutcome?: string;
}

const trackedPredictions: Map<string, TrackedPrediction> = new Map();

export function trackPrediction(prediction: {
  id: string;
  type: string;
  nodeId: string;
  probability: number;
  severity: string;
  predictedTime: string;
}): void {
  trackedPredictions.set(prediction.id, {
    ...prediction,
    createdAt: new Date().toISOString(),
  });
}

export function resolvePrediction(
  predictionId: string,
  wasAccurate: boolean,
  actualOutcome?: string
): void {
  const prediction = trackedPredictions.get(predictionId);
  if (prediction) {
    prediction.wasAccurate = wasAccurate;
    prediction.resolvedAt = new Date().toISOString();
    prediction.actualOutcome = actualOutcome;

    // Record in risk scoring service
    RiskScoringService.recordPredictionOutcome(predictionId, wasAccurate, prediction.type);

    logStore.addSystemLog('prediction', `Prediction ${predictionId} resolved`, {
      wasAccurate,
      type: prediction.type,
      actualOutcome,
    });
  }
}

// ============================================================================
// Generate Incident Report
// ============================================================================

export function generateIncidentReport(
  startDate?: string,
  endDate?: string
): IncidentReport {
  const incidents = incidentStore.getAll();
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Filter incidents by date range
  const filteredIncidents = incidents.filter(inc => {
    const incDate = new Date(inc.startedAt);
    return incDate >= start && incDate <= end;
  });

  // Aggregate by type
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const nodeAffectedCount: Record<string, number> = {};
  let totalResolutionTime = 0;
  let resolvedCount = 0;
  let automatedMitigations = 0;
  let manualMitigations = 0;
  let successfulMitigations = 0;

  filteredIncidents.forEach(inc => {
    // By type
    const type = inc.threatType || 'unknown';
    byType[type] = (byType[type] || 0) + 1;

    // By severity
    bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;

    // Affected nodes
    inc.affectedNodes.forEach(nodeId => {
      nodeAffectedCount[nodeId] = (nodeAffectedCount[nodeId] || 0) + 1;
    });

    // Resolution time
    if (inc.endedAt) {
      const resTime = new Date(inc.endedAt).getTime() - new Date(inc.startedAt).getTime();
      totalResolutionTime += resTime;
      resolvedCount++;
    }

    // Mitigations
    inc.mitigationActions.forEach(action => {
      if (action.automated) {
        automatedMitigations++;
      } else {
        manualMitigations++;
      }
      successfulMitigations++; // Assume all recorded actions were successful
    });
  });

  // Top affected nodes
  const topAffectedNodes = Object.entries(nodeAffectedCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nodeId, count]) => ({ nodeId, count }));

  const totalMitigations = automatedMitigations + manualMitigations;

  return {
    id: `report_${uuidv4().slice(0, 8)}`,
    period: { start: start.toISOString(), end: end.toISOString() },
    totalIncidents: filteredIncidents.length,
    byType,
    bySeverity,
    avgResolutionTimeMinutes: resolvedCount > 0 
      ? Math.round(totalResolutionTime / resolvedCount / 60000) 
      : 0,
    topAffectedNodes,
    mitigationsSummary: {
      total: totalMitigations,
      automated: automatedMitigations,
      manual: manualMitigations,
      successRate: totalMitigations > 0 ? successfulMitigations / totalMitigations : 0,
    },
  };
}

// ============================================================================
// Generate Accuracy Report
// ============================================================================

export function generateAccuracyReport(
  startDate?: string,
  endDate?: string
): AccuracyReport {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Filter predictions by date range
  const predictions = Array.from(trackedPredictions.values()).filter(p => {
    const pDate = new Date(p.createdAt);
    return pDate >= start && pDate <= end && p.resolvedAt !== undefined;
  });

  // Calculate metrics
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;
  let totalLeadTime = 0;
  let leadTimeCount = 0;

  const byType: Record<string, { total: number; accurate: number; accuracy: number }> = {};
  const dailyAccuracy: Record<string, { accurate: number; total: number }> = {};

  predictions.forEach(pred => {
    // True/False Positives/Negatives
    if (pred.wasAccurate) {
      if (pred.probability >= 0.5) {
        truePositives++;
      } else {
        trueNegatives++;
      }
    } else {
      if (pred.probability >= 0.5) {
        falsePositives++;
      } else {
        falseNegatives++;
      }
    }

    // By type
    if (!byType[pred.type]) {
      byType[pred.type] = { total: 0, accurate: 0, accuracy: 0 };
    }
    byType[pred.type].total++;
    if (pred.wasAccurate) byType[pred.type].accurate++;

    // Lead time
    if (pred.predictedTime && pred.resolvedAt) {
      const leadTime = new Date(pred.predictedTime).getTime() - new Date(pred.createdAt).getTime();
      if (leadTime > 0) {
        totalLeadTime += leadTime;
        leadTimeCount++;
      }
    }

    // Daily accuracy
    const day = new Date(pred.createdAt).toISOString().slice(0, 10);
    if (!dailyAccuracy[day]) {
      dailyAccuracy[day] = { accurate: 0, total: 0 };
    }
    dailyAccuracy[day].total++;
    if (pred.wasAccurate) dailyAccuracy[day].accurate++;
  });

  // Calculate accuracy metrics
  Object.keys(byType).forEach(type => {
    byType[type].accuracy = byType[type].total > 0 
      ? byType[type].accurate / byType[type].total 
      : 0;
  });

  const total = truePositives + falsePositives + trueNegatives + falseNegatives;
  const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;
  const precision = (truePositives + falsePositives) > 0 
    ? truePositives / (truePositives + falsePositives) 
    : 0;
  const recall = (truePositives + falseNegatives) > 0 
    ? truePositives / (truePositives + falseNegatives) 
    : 0;
  const f1Score = (precision + recall) > 0 
    ? 2 * (precision * recall) / (precision + recall) 
    : 0;

  // Rolling 7 day
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentPredictions = predictions.filter(p => new Date(p.createdAt) >= sevenDaysAgo);
  const rolling7DayAccurate = recentPredictions.filter(p => p.wasAccurate).length;

  // Format daily accuracy array
  const dailyAccuracyArray = Object.entries(dailyAccuracy)
    .map(([date, data]) => ({
      date,
      accuracy: data.total > 0 ? data.accurate / data.total : 0,
      count: data.total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    id: `accuracy_${uuidv4().slice(0, 8)}`,
    period: { start: start.toISOString(), end: end.toISOString() },
    totalPredictions: total,
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
    accuracy,
    precision,
    recall,
    f1Score,
    avgLeadTimeHours: leadTimeCount > 0 ? totalLeadTime / leadTimeCount / 3600000 : 0,
    byType,
    rolling7Day: {
      accuracy: recentPredictions.length > 0 ? rolling7DayAccurate / recentPredictions.length : 0,
      predictions: recentPredictions.length,
    },
    dailyAccuracy: dailyAccuracyArray,
  };
}

// ============================================================================
// Generate Operator Log Report
// ============================================================================

export function generateOperatorLogReport(
  startDate?: string,
  endDate?: string
): OperatorLogReport {
  const allLogs = logStore.getAll();
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Filter logs
  const logs = allLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= start && logDate <= end && log.source === 'operator';
  });

  // Aggregate
  const byCategory: Record<string, number> = {};
  const byOperator: Record<string, number> = {};

  logs.forEach(log => {
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    if (log.user) {
      byOperator[log.user] = (byOperator[log.user] || 0) + 1;
    }
  });

  // Timeline
  const timeline = logs
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(log => ({
      timestamp: log.timestamp,
      action: log.category,
      operator: log.user,
      details: log.message,
    }));

  return {
    id: `oplog_${uuidv4().slice(0, 8)}`,
    period: { start: start.toISOString(), end: end.toISOString() },
    totalActions: logs.length,
    byCategory,
    byOperator,
    timeline,
  };
}

// ============================================================================
// Clear Tracking Data
// ============================================================================

export function clearPredictionTracking(): void {
  trackedPredictions.clear();
}

export function getTrackedPredictionCount(): number {
  return trackedPredictions.size;
}

export function getResolvedPredictionCount(): number {
  return Array.from(trackedPredictions.values()).filter(p => p.resolvedAt).length;
}

// ============================================================================
// Seed Demo Data for Reports
// ============================================================================

export function seedDemoReportData(): void {
  // Seed some tracked predictions for demo
  const types = ['thermal_stress', 'overload', 'cyber_vulnerability', 'cascade_failure', 'equipment_failure'];
  const severities = ['low', 'medium', 'high', 'critical'];

  for (let i = 0; i < 50; i++) {
    const id = `demo_pred_${i}`;
    const hoursAgo = Math.floor(Math.random() * 168); // Last 7 days
    const createdAt = new Date(Date.now() - hoursAgo * 3600000);
    
    trackedPredictions.set(id, {
      id,
      type: types[Math.floor(Math.random() * types.length)],
      nodeId: `node_${Math.floor(Math.random() * 150).toString().padStart(4, '0')}`,
      probability: 0.5 + Math.random() * 0.4,
      severity: severities[Math.floor(Math.random() * severities.length)],
      createdAt: createdAt.toISOString(),
      predictedTime: new Date(createdAt.getTime() + Math.random() * 12 * 3600000).toISOString(),
      wasAccurate: Math.random() > 0.25, // 75% accuracy
      resolvedAt: new Date(createdAt.getTime() + Math.random() * 6 * 3600000).toISOString(),
      actualOutcome: Math.random() > 0.25 ? 'Event occurred as predicted' : 'Event did not occur',
    });
  }

  logStore.addSystemLog('config', 'Demo report data seeded', { predictions: 50 });
}
