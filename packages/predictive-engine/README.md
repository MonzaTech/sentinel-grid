# @sentinel-grid/predictive-engine

> Deterministic predictive engine for infrastructure monitoring and cascade failure prediction

Part of the **Sentinel Grid** platform — an AI-powered system that predicts critical infrastructure cascade failures 48 hours in advance.

## Features

- 🎲 **Deterministic Simulation** — Seedable RNG for reproducible demos and testing
- 🔮 **Predictive Analytics** — Pattern detection + physics-informed heuristics
- 🌊 **Cascade Modeling** — Simulate failure propagation through network topology
- 🚨 **Alert Management** — Configurable alert rules with cooldowns
- 🔐 **Integrity Hashing** — SHA-256 + HMAC for audit trail verification
- 📊 **Accuracy Tracking** — Precision, recall, F1 for model validation

## Installation

```bash
npm install @sentinel-grid/predictive-engine
# or
yarn add @sentinel-grid/predictive-engine
```

## Quick Start

```typescript
import {
  initializeNodes,
  updateNodeState,
  getSystemState,
  fetchWeatherData,
  PredictiveEngine,
  AlertManager,
} from '@sentinel-grid/predictive-engine';

// 1. Initialize with seed for determinism
const nodes = initializeNodes({ seed: 12345, nodeCount: 200 });
const engine = new PredictiveEngine({ seed: 12345 });
const alerts = new AlertManager();

// 2. Simulation loop
setInterval(() => {
  const weather = fetchWeatherData();
  const updated = updateNodeState(nodes, null, weather);
  Object.assign(nodes, updated);
  
  const state = getSystemState(nodes);
  engine.updateHistories([state], nodes);
  
  // Generate predictions every 10 ticks
  const patterns = engine.analyzePatterns(nodes);
  const predictions = engine.generatePredictions(nodes);
  
  console.log(`Predictions: ${predictions.length}, Patterns: ${patterns.length}`);
}, 3000);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Predictive Engine                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │ SeededRandom │───▶│  Simulation  │───▶│  Predictive  │ │
│  │   (PRNG)     │    │   Engine     │    │   Engine     │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                   │                   │          │
│         │                   ▼                   ▼          │
│         │           ┌──────────────┐    ┌──────────────┐  │
│         │           │    Nodes     │    │   Patterns   │  │
│         │           │   + State    │    │ + Predictions│  │
│         │           └──────────────┘    └──────────────┘  │
│         │                   │                   │          │
│         │                   └───────────────────┘          │
│         │                           │                      │
│         │                           ▼                      │
│         │                   ┌──────────────┐               │
│         └──────────────────▶│    Alert     │               │
│                             │   Manager    │               │
│                             └──────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## API Reference

### SimulationEngine

#### `initializeNodes(config?)`

Creates a deterministic set of infrastructure nodes.

```typescript
const nodes = initializeNodes({
  seed: 12345,           // RNG seed for reproducibility
  nodeCount: 200,        // Number of nodes
  regions: ['North', 'South', 'East', 'West', 'Central'],
});
```

Returns `Record<string, Node>` with structure:
```typescript
interface Node {
  id: string;
  name: string;
  type: NodeType;        // 'substation' | 'transformer' | 'generator' | ...
  region: string;
  coordinates: { x: number; y: number };
  riskScore: number;     // 0-1
  health: number;        // 0-1
  loadRatio: number;     // 0-1
  temperature: number;   // Celsius
  status: NodeStatus;
  connections: string[]; // Connected node IDs
}
```

#### `updateNodeState(nodes, threat, weather)`

Advances simulation by one tick.

```typescript
const weather = fetchWeatherData();
const threat = { type: 'cyber_attack', severity: 0.7, target: 'node_001' };
const updated = updateNodeState(nodes, threat, weather);
```

#### `simulateCascade(nodes, originId, severity)`

Simulates cascade failure propagation.

```typescript
const { nodes: updated, event } = simulateCascade(nodes, 'node_001', 0.8);

console.log(event.affectedNodes);    // ['node_001', 'node_002', ...]
console.log(event.impactScore);      // 0.15 (15% of network affected)
console.log(event.propagationPath);  // [{ from, to, riskTransfer }...]
```

#### `autoMitigate(nodes, nodeId)`

Applies automated mitigation to a node.

```typescript
const result = autoMitigate(nodes, 'node_001');

if (result.success) {
  console.log(result.actions);       // ['Emergency load shedding', ...]
  console.log(result.riskReduction); // 0.25
}
```

### PredictiveEngine

#### `updateHistories(states, nodes)`

Feeds data into the predictive model.

```typescript
const engine = new PredictiveEngine({ seed: 12345 });
engine.updateHistories([systemState], nodes);
```

#### `analyzePatterns(nodes)`

Detects patterns in the network.

```typescript
const patterns = engine.analyzePatterns(nodes);

// Pattern types:
// - 'correlated_degradation'
// - 'load_imbalance'
// - 'thermal_cluster'
// - 'cascading_risk'
// - 'geographic_stress'
```

#### `generatePredictions(nodes)`

Generates predictions for at-risk nodes.

```typescript
const predictions = engine.generatePredictions(nodes);

predictions.forEach(p => {
  console.log(p.nodeName);           // "North Substation 123"
  console.log(p.type);               // "cascade_failure"
  console.log(p.probability);        // 0.85
  console.log(p.hoursToEvent);       // 6.5
  console.log(p.suggestedActions);   // [{ action: '...', priority: 'immediate' }]
});
```

#### `getSystemHealthScore(nodes)`

Returns overall system health (0-1).

#### `getAccuracyMetrics()`

Returns prediction accuracy metrics.

```typescript
const metrics = engine.getAccuracyMetrics();
console.log(metrics.accuracy);   // 0.87
console.log(metrics.precision);  // 0.89
console.log(metrics.recall);     // 0.84
console.log(metrics.f1Score);    // 0.86
```

### AlertManager

```typescript
const alertManager = new AlertManager();

// Check predictions for alerts
const triggered = await alertManager.checkPredictionsForAlerts(predictions);

// Get active alerts
const active = alertManager.getAlerts('active');

// Acknowledge/resolve
alertManager.acknowledgeAlert('alert_123', 'operator@example.com');
alertManager.resolveAlert('alert_123');
```

### Integrity Hashing

```typescript
import { createAuditHash, createSignedHash } from '@sentinel-grid/predictive-engine';

// Simple hash
const hash = createAuditHash({ event: 'mitigation', nodeId: 'node_001' });

// Signed hash (for IPFS pinning)
const { sha256, signature } = createSignedHash(data, process.env.HMAC_KEY);
```

## Swapping to Python ML Model

The predictive engine is designed to be replaceable with a real ML model served via REST:

```typescript
// Replace PredictiveEngine.generatePredictions with:
async function generatePredictions(nodes: Record<string, Node>): Promise<Prediction[]> {
  const response = await fetch('http://ml-service:8000/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes: Object.values(nodes) }),
  });
  
  return response.json();
}
```

Expected ML service endpoint:
```
POST /predict
Content-Type: application/json

{
  "nodes": [{ "id": "...", "riskScore": 0.6, ... }]
}

Response:
[
  {
    "nodeId": "node_001",
    "type": "cascade_failure",
    "probability": 0.85,
    "hoursToEvent": 6.5,
    "confidence": 0.78
  }
]
```

## Demo

Run the interactive demo:

```bash
npm run demo
# or
npx ts-node scripts/demo.ts
```

Output:
```
============================================================
  🛡️  SENTINEL GRID - PREDICTIVE ENGINE DEMO
============================================================

Step 1: Initialize Infrastructure Nodes
✓ Created 50 nodes

Step 2: Initialize Predictive Engine
✓ Predictive Engine initialized

...

📊 DEMO SUMMARY
  ✓ Deterministic node initialization
  ✓ Pattern detection across infrastructure network
  ✓ Predictive analytics with probability and time-to-event
  ✓ Cascade failure simulation
  ✓ HMAC-signed snapshots for integrity verification

🛡️  Demo complete!
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SEED` | RNG seed for determinism | `12345` |
| `NODE_COUNT` | Number of simulated nodes | `200` |
| `CRITICAL_THRESHOLD` | Risk level for critical status | `0.8` |
| `WARNING_THRESHOLD` | Risk level for warning status | `0.6` |

## Integration with Backend

This package is used by the Sentinel Grid backend:

```typescript
// server/simulation.ts
import {
  initializeNodes,
  updateNodeState,
  PredictiveEngine,
} from '@sentinel-grid/predictive-engine';

export class SimulationService {
  private nodes = initializeNodes({ seed: 12345 });
  private engine = new PredictiveEngine();
  
  tick(threat: Threat | null) {
    const weather = fetchWeatherData();
    this.nodes = updateNodeState(this.nodes, threat, weather);
    
    const state = getSystemState(this.nodes);
    this.engine.updateHistories([state], this.nodes);
    
    return {
      nodes: this.nodes,
      state,
      predictions: this.engine.generatePredictions(this.nodes),
    };
  }
}
```

## License

MIT © Monza Tech LLC

## Related Packages

- `@sentinel-grid/backend` — Express + WebSocket server
- `@sentinel-grid/contracts` — Solidity smart contracts
- `@sentinel-grid/frontend` — React dashboard
