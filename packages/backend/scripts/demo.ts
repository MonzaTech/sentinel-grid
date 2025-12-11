#!/usr/bin/env tsx
/**
 * Sentinel Grid Backend - Demo Script
 * Interactive demonstration of backend capabilities
 */

import { config } from '../src/config.js';

const BASE_URL = `http://localhost:${config.port}`;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(title: string) {
  console.log('\n' + '═'.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('═'.repeat(60) + '\n');
}

async function api(method: string, path: string, body?: unknown) {
  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch (error) {
    return { error: (error as Error).message };
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  header('🛡️  SENTINEL GRID BACKEND DEMO');
  
  log('Testing connection to backend...', 'yellow');
  
  // Health check
  const health = await api('GET', '/health');
  if (health.error) {
    log(`❌ Backend not running. Start with: npm run dev`, 'red');
    process.exit(1);
  }
  log(`✓ Backend is ${health.status}`, 'green');

  // ============================================================
  // Step 1: Get initial state
  // ============================================================
  header('Step 1: Get Initial System State');
  
  const state = await api('GET', '/api/system/state');
  console.log(`  Total Nodes: ${state.data.totalNodes}`);
  console.log(`  Max Risk: ${(state.data.maxRisk * 100).toFixed(1)}%`);
  console.log(`  Avg Health: ${(state.data.avgHealth * 100).toFixed(1)}%`);
  console.log(`  Critical Nodes: ${state.data.criticalNodes.length}`);
  console.log(`  Running: ${state.data.isRunning}`);
  
  // ============================================================
  // Step 2: Start simulation
  // ============================================================
  header('Step 2: Start Simulation');
  
  await api('POST', '/api/system/start');
  log('✓ Simulation started', 'green');
  
  log('Waiting for simulation to warm up (3 seconds)...', 'yellow');
  await sleep(3000);

  // ============================================================
  // Step 3: Get nodes
  // ============================================================
  header('Step 3: Get Nodes');
  
  const nodes = await api('GET', '/api/nodes?limit=5');
  console.log(`  Retrieved ${nodes.count} of ${nodes.total} nodes\n`);
  
  nodes.data.slice(0, 3).forEach((n: any) => {
    const riskColor = n.riskScore > 0.6 ? 'red' : n.riskScore > 0.3 ? 'yellow' : 'green';
    log(`  • ${n.name}`, 'bright');
    console.log(`    Type: ${n.type}, Region: ${n.region}`);
    log(`    Risk: ${(n.riskScore * 100).toFixed(1)}%`, riskColor);
  });

  // ============================================================
  // Step 4: Get predictions
  // ============================================================
  header('Step 4: Get Predictions');
  
  const predictions = await api('GET', '/api/predictions');
  console.log(`  Found ${predictions.count} predictions\n`);
  
  predictions.data.slice(0, 3).forEach((p: any) => {
    const sevColor = p.severity === 'critical' ? 'red' : p.severity === 'high' ? 'yellow' : 'reset';
    log(`  • [${p.severity.toUpperCase()}] ${p.nodeName}`, sevColor);
    console.log(`    Type: ${p.type}`);
    console.log(`    Probability: ${(p.probability * 100).toFixed(0)}%`);
    console.log(`    Hours to Event: ${p.hoursToEvent.toFixed(1)}`);
  });

  // ============================================================
  // Step 5: Deploy threat
  // ============================================================
  header('Step 5: Deploy Threat');
  
  const threat = await api('POST', '/api/simulate/threat', {
    type: 'cyber_attack',
    severity: 0.7,
    duration: 60,
  });
  
  log(`✓ Deployed ${threat.data.type} (severity: ${threat.data.severity})`, 'yellow');
  
  log('Waiting for threat to take effect (3 seconds)...', 'yellow');
  await sleep(3000);

  // ============================================================
  // Step 6: Trigger cascade
  // ============================================================
  header('Step 6: Trigger Cascade');
  
  // Get a high-risk node
  const highRisk = await api('GET', '/api/nodes?minRisk=0.3&limit=1');
  const originId = highRisk.data[0]?.id || 'node_0001';
  
  const cascade = await api('POST', '/api/simulate/cascade', {
    originId,
    severity: 0.6,
  });
  
  log(`✓ Cascade triggered!`, 'red');
  console.log(`  Origin: ${cascade.data.originNode}`);
  console.log(`  Affected Nodes: ${cascade.data.affectedNodes}`);
  console.log(`  Impact Score: ${(cascade.data.impactScore * 100).toFixed(1)}%`);

  // ============================================================
  // Step 7: Apply mitigation
  // ============================================================
  header('Step 7: Apply Mitigation');
  
  const criticalNodes = await api('GET', '/api/nodes/critical');
  
  if (criticalNodes.count > 0) {
    const targetNode = criticalNodes.data[0];
    
    log(`Mitigating ${targetNode.name}...`, 'yellow');
    
    const mitigation = await api('POST', '/api/actions/mitigate', {
      nodeId: targetNode.id,
    });
    
    if (mitigation.data.mitigationSuccess) {
      log(`✓ Mitigation successful!`, 'green');
      console.log(`  Risk: ${(mitigation.data.riskBefore * 100).toFixed(1)}% → ${(mitigation.data.riskAfter * 100).toFixed(1)}%`);
      console.log(`  Actions: ${mitigation.data.actions.join(', ')}`);
    }
  } else {
    log('No critical nodes to mitigate', 'yellow');
  }

  // ============================================================
  // Step 8: Pin to IPFS
  // ============================================================
  header('Step 8: Pin Snapshot to IPFS');
  
  const snapshot = {
    timestamp: new Date().toISOString(),
    event: 'cascade_demo',
    originNode: originId,
    predictions: predictions.count,
  };
  
  const pin = await api('POST', '/api/pin', {
    payload: snapshot,
  });
  
  log(`✓ Snapshot pinned!`, 'green');
  console.log(`  CID: ${pin.data.cid}`);
  console.log(`  SHA-256: ${pin.data.sha256.slice(0, 32)}...`);
  console.log(`  Signature: ${pin.data.signature.slice(0, 32)}...`);
  console.log(`  Size: ${pin.data.size} bytes`);

  // ============================================================
  // Step 9: Create anchor
  // ============================================================
  header('Step 9: Create Blockchain Anchor');
  
  const anchor = await api('POST', '/api/anchor', {
    payloadHash: pin.data.sha256,
    ipfsCid: pin.data.cid,
    chain: 'base',
    metadata: { event: 'cascade_demo' },
  });
  
  log(`✓ Anchor created!`, 'green');
  console.log(`  ID: ${anchor.data.id}`);
  console.log(`  Chain: ${anchor.data.chain}`);
  console.log(`  Status: ${anchor.data.status}`);

  // ============================================================
  // Step 10: Get audit log
  // ============================================================
  header('Step 10: Review Audit Log');
  
  const audit = await api('GET', '/api/audit?limit=5');
  console.log(`  Last ${audit.count} audit entries:\n`);
  
  audit.data.forEach((e: any) => {
    console.log(`  • [${e.type}] ${e.timestamp}`);
    console.log(`    Hash: ${e.hash}`);
  });

  // ============================================================
  // Summary
  // ============================================================
  header('📊 DEMO COMPLETE');
  
  // Final state
  const finalState = await api('GET', '/api/system/state');
  
  console.log('Final System State:');
  console.log(`  Health Score: ${(finalState.data.healthScore * 100).toFixed(1)}%`);
  console.log(`  Max Risk: ${(finalState.data.maxRisk * 100).toFixed(1)}%`);
  console.log(`  Critical Nodes: ${finalState.data.criticalNodes.length}`);
  
  console.log('\nDemo demonstrated:');
  console.log('  ✓ System state and metrics');
  console.log('  ✓ Node listing and filtering');
  console.log('  ✓ Prediction generation');
  console.log('  ✓ Threat deployment');
  console.log('  ✓ Cascade simulation');
  console.log('  ✓ Mitigation actions');
  console.log('  ✓ IPFS pinning with signatures');
  console.log('  ✓ Blockchain anchoring');
  console.log('  ✓ Audit trail');
  
  // Stop simulation
  await api('POST', '/api/system/stop');
  log('\n🛡️  Simulation stopped. Demo complete!', 'cyan');
}

// Run
runDemo().catch(console.error);
