#!/usr/bin/env ts-node
/**
 * Sentinel Grid - Predictive Engine Demo
 * 
 * Run: npx ts-node scripts/demo.ts
 * 
 * This script demonstrates:
 * 1. Deterministic node initialization
 * 2. Simulation updates with weather/threats
 * 3. Pattern detection
 * 4. Prediction generation
 * 5. Cascade simulation
 * 6. Mitigation actions
 */

import {
  initializeNodes,
  updateNodeState,
  getSystemState,
  simulateCascade,
  autoMitigate,
  fetchWeatherData,
  createSignedHash,
  CRITICAL_THRESHOLD,
  WARNING_THRESHOLD,
} from '../src/SimulationEngine';
import { PredictiveEngine } from '../src/PredictiveEngine';
import { AlertManager } from '../src/AlertManager';
import { Threat } from '../src/types';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title: string) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function runDemo() {
  const SEED = 12345;
  const NODE_COUNT = 50;

  header('🛡️  SENTINEL GRID - PREDICTIVE ENGINE DEMO');
  
  log('Configuration:', 'bright');
  console.log(`  Seed: ${SEED}`);
  console.log(`  Nodes: ${NODE_COUNT}`);
  console.log(`  Critical Threshold: ${CRITICAL_THRESHOLD}`);
  console.log(`  Warning Threshold: ${WARNING_THRESHOLD}`);

  // ============================================================
  // Step 1: Initialize Nodes
  // ============================================================
  header('Step 1: Initialize Infrastructure Nodes');
  
  let nodes = initializeNodes({ seed: SEED, nodeCount: NODE_COUNT });
  const nodeIds = Object.keys(nodes);
  
  log(`✓ Created ${nodeIds.length} nodes`, 'green');
  
  // Show sample nodes
  console.log('\nSample nodes:');
  nodeIds.slice(0, 5).forEach((id) => {
    const n = nodes[id];
    console.log(`  ${n.name} (${n.type}) - Region: ${n.region}, Risk: ${(n.riskScore * 100).toFixed(1)}%`);
  });

  // ============================================================
  // Step 2: Initialize Predictive Engine
  // ============================================================
  header('Step 2: Initialize Predictive Engine');
  
  const predictiveEngine = new PredictiveEngine({ seed: SEED + 1 });
  const alertManager = new AlertManager(SEED + 2);
  
  log('✓ Predictive Engine initialized', 'green');
  log('✓ Alert Manager initialized', 'green');

  // ============================================================
  // Step 3: Run Simulation Ticks
  // ============================================================
  header('Step 3: Run Simulation (10 ticks)');
  
  const history: any[] = [];
  
  for (let tick = 1; tick <= 10; tick++) {
    const weather = fetchWeatherData();
    nodes = updateNodeState(nodes, null, weather);
    const state = getSystemState(nodes);
    
    history.push({ ...state, timestamp: new Date() });
    predictiveEngine.updateHistories([state], nodes);
    
    if (tick % 2 === 0) {
      console.log(`  Tick ${tick}: Max Risk=${(state.maxRisk * 100).toFixed(1)}%, ` +
                  `Avg Health=${(state.avgHealth * 100).toFixed(1)}%, ` +
                  `Weather=${weather.condition}`);
    }
  }
  
  log(`✓ Completed 10 simulation ticks`, 'green');

  // ============================================================
  // Step 4: Deploy Threat
  // ============================================================
  header('Step 4: Deploy Cyber Attack Threat');
  
  const targetNode = nodeIds[0];
  const threat: Threat = {
    id: 'demo_threat_1',
    type: 'cyber_attack',
    severity: 0.7,
    target: targetNode,
    active: true,
    until: new Date(Date.now() + 60000),
    duration: 60,
  };
  
  log(`Deploying ${threat.type} against ${nodes[targetNode].name}...`, 'yellow');
  console.log(`  Severity: ${(threat.severity * 100).toFixed(0)}%`);
  
  // Run more ticks with threat active
  for (let tick = 1; tick <= 5; tick++) {
    const weather = fetchWeatherData();
    nodes = updateNodeState(nodes, threat, weather);
    const state = getSystemState(nodes);
    
    history.push({ ...state, timestamp: new Date() });
    predictiveEngine.updateHistories([state], nodes);
  }
  
  const targetRisk = nodes[targetNode].riskScore;
  log(`✓ Target node risk increased to ${(targetRisk * 100).toFixed(1)}%`, 
      targetRisk > WARNING_THRESHOLD ? 'red' : 'yellow');

  // ============================================================
  // Step 5: Analyze Patterns
  // ============================================================
  header('Step 5: Analyze Patterns');
  
  const patterns = predictiveEngine.analyzePatterns(nodes);
  
  log(`Found ${patterns.length} patterns:`, 'magenta');
  patterns.slice(0, 5).forEach((p) => {
    console.log(`  • ${p.type}: ${p.description}`);
    console.log(`    Confidence: ${(p.confidence * 100).toFixed(0)}%, Trend: ${p.trend}`);
  });

  // ============================================================
  // Step 6: Generate Predictions
  // ============================================================
  header('Step 6: Generate Predictions');
  
  const predictions = predictiveEngine.generatePredictions(nodes);
  
  log(`Generated ${predictions.length} predictions:`, 'magenta');
  predictions.slice(0, 5).forEach((p, i) => {
    const severity = p.severity === 'critical' ? colors.red :
                     p.severity === 'high' ? colors.yellow : colors.reset;
    
    console.log(`\n  ${i + 1}. ${severity}[${p.severity.toUpperCase()}]${colors.reset} ${p.nodeName}`);
    console.log(`     Type: ${p.type}`);
    console.log(`     Probability: ${(p.probability * 100).toFixed(0)}%`);
    console.log(`     Hours to Event: ${p.hoursToEvent.toFixed(1)}`);
    console.log(`     Reasoning: ${p.reasoning.slice(0, 100)}...`);
    
    if (p.suggestedActions.length > 0) {
      console.log('     Suggested Actions:');
      p.suggestedActions.slice(0, 2).forEach((a) => {
        console.log(`       - [${a.priority}] ${a.action}`);
      });
    }
  });

  // ============================================================
  // Step 7: Simulate Cascade
  // ============================================================
  header('Step 7: Simulate Cascade Event');
  
  const cascadeOrigin = nodeIds.find((id) => nodes[id].riskScore > 0.5) || nodeIds[0];
  log(`Triggering cascade from ${nodes[cascadeOrigin].name}...`, 'red');
  
  const { nodes: postCascadeNodes, event: cascadeEvent } = simulateCascade(
    nodes, 
    cascadeOrigin, 
    0.7
  );
  nodes = postCascadeNodes;
  
  log(`✓ Cascade affected ${cascadeEvent.affectedNodes.length} nodes`, 'red');
  console.log(`  Impact Score: ${(cascadeEvent.impactScore * 100).toFixed(1)}%`);
  console.log(`  Total Damage: ${cascadeEvent.totalDamage.toFixed(3)}`);
  console.log(`  Propagation depth: ${cascadeEvent.propagationPath.length} hops`);

  // ============================================================
  // Step 8: Auto-Mitigation
  // ============================================================
  header('Step 8: Auto-Mitigation');
  
  const criticalNodes = Object.values(nodes).filter((n) => n.riskScore > CRITICAL_THRESHOLD);
  log(`Found ${criticalNodes.length} critical nodes requiring mitigation`, 'yellow');
  
  criticalNodes.slice(0, 3).forEach((node) => {
    const before = node.riskScore;
    const result = autoMitigate(nodes, node.id);
    
    if (result.success) {
      nodes[node.id] = result.updatedNode;
      
      console.log(`\n  ${node.name}:`);
      console.log(`    Risk: ${(before * 100).toFixed(1)}% → ${(result.updatedNode.riskScore * 100).toFixed(1)}%`);
      console.log(`    Actions taken:`);
      result.actions.forEach((a) => console.log(`      - ${a}`));
    }
  });

  // ============================================================
  // Step 9: System Health Score
  // ============================================================
  header('Step 9: System Health Assessment');
  
  const healthScore = predictiveEngine.getSystemHealthScore(nodes);
  const state = getSystemState(nodes);
  const metrics = predictiveEngine.getAccuracyMetrics();
  
  const healthColor = healthScore > 0.7 ? 'green' : healthScore > 0.5 ? 'yellow' : 'red';
  log(`System Health Score: ${(healthScore * 100).toFixed(0)}%`, healthColor);
  
  console.log('\nSystem State:');
  console.log(`  Max Risk: ${(state.maxRisk * 100).toFixed(1)}%`);
  console.log(`  Avg Health: ${(state.avgHealth * 100).toFixed(1)}%`);
  console.log(`  Load Ratio: ${(state.loadRatio * 100).toFixed(1)}%`);
  console.log(`  Critical Nodes: ${state.criticalNodes.length}`);
  console.log(`  Warning Nodes: ${state.warningNodes.length}`);
  
  console.log('\nPredictive Accuracy:');
  console.log(`  Overall: ${(metrics.accuracy * 100).toFixed(1)}%`);
  console.log(`  Precision: ${(metrics.precision * 100).toFixed(1)}%`);
  console.log(`  Recall: ${(metrics.recall * 100).toFixed(1)}%`);
  console.log(`  F1 Score: ${(metrics.f1Score * 100).toFixed(1)}%`);

  // ============================================================
  // Step 10: Export Snapshot
  // ============================================================
  header('Step 10: Export Signed Snapshot');
  
  const snapshot = {
    timestamp: new Date().toISOString(),
    systemState: state,
    predictions: predictions.slice(0, 5),
    patterns: patterns.slice(0, 3),
    nodeCount: Object.keys(nodes).length,
    cascadeEvent: {
      affectedCount: cascadeEvent.affectedNodes.length,
      impactScore: cascadeEvent.impactScore,
    },
  };
  
  const HMAC_KEY = 'demo-secret-key';
  const { sha256, signature } = createSignedHash(snapshot, HMAC_KEY);
  
  log('✓ Snapshot created and signed', 'green');
  console.log(`  SHA-256: ${sha256.slice(0, 32)}...`);
  console.log(`  Signature: ${signature.slice(0, 32)}...`);
  console.log(`  Size: ${JSON.stringify(snapshot).length} bytes`);

  // ============================================================
  // Summary
  // ============================================================
  header('📊 DEMO SUMMARY');
  
  console.log('The Sentinel Grid Predictive Engine successfully demonstrated:');
  console.log('  ✓ Deterministic node initialization (reproducible simulations)');
  console.log('  ✓ Real-time state updates with weather and threat modeling');
  console.log('  ✓ Pattern detection across infrastructure network');
  console.log('  ✓ Predictive analytics with probability and time-to-event');
  console.log('  ✓ Cascade failure simulation and propagation tracking');
  console.log('  ✓ Automated mitigation with action recommendations');
  console.log('  ✓ HMAC-signed snapshots for integrity verification');
  
  log('\n🛡️  Demo complete!\n', 'cyan');
}

// Run the demo
runDemo().catch(console.error);
