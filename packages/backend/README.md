# @sentinel-grid/backend

> Backend API for Sentinel Grid infrastructure monitoring platform

REST API + WebSocket server that provides real-time infrastructure simulation, predictive analytics, and blockchain anchoring capabilities.

## Features

- 🔌 **REST API** — Full CRUD for nodes, predictions, actions, and audit logs
- 📡 **WebSocket** — Real-time updates for simulation state, predictions, alerts
- 🎯 **Simulation Engine** — Deterministic infrastructure simulation with 200+ nodes
- 🔮 **Predictive Analytics** — Pattern detection and failure prediction
- 📝 **Audit Trail** — Comprehensive logging with cryptographic hashes
- 📌 **IPFS Pinning** — Data integrity with Web3.Storage integration
- ⛓️ **Blockchain Anchoring** — On-chain proof records (Base/Optimism)
- 🐳 **Docker Ready** — Containerized deployment

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start development server
npm run dev
```

Server runs at http://localhost:4000

## API Endpoints

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/state` | Current system state |
| GET | `/api/system/health` | Health check |
| GET | `/api/system/metrics` | Prometheus metrics |
| POST | `/api/system/start` | Start simulation |
| POST | `/api/system/stop` | Stop simulation |
| POST | `/api/system/reset` | Reset simulation |

### Nodes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nodes` | List all nodes |
| GET | `/api/nodes/summary` | Statistics summary |
| GET | `/api/nodes/critical` | Critical nodes only |
| GET | `/api/nodes/:id` | Single node details |
| GET | `/api/nodes/:id/connections` | Node connections |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/predictions` | Current predictions |
| GET | `/api/predictions/patterns` | Detected patterns |
| GET | `/api/predictions/accuracy` | Model accuracy metrics |
| GET | `/api/predictions/history` | Historical predictions |
| POST | `/api/predictions/save` | Save to database |

### Simulation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulate/cascade` | Trigger cascade failure |
| GET | `/api/simulate/cascades` | Cascade history |
| POST | `/api/simulate/threat` | Deploy threat |
| DELETE | `/api/simulate/threat` | Clear threat |
| POST | `/api/simulate/scenario` | Run predefined scenario |

### Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/actions/mitigate` | Mitigate single node |
| POST | `/api/actions/mitigate/batch` | Mitigate multiple nodes |
| POST | `/api/actions/mitigate/critical` | Mitigate all critical |
| PUT | `/api/actions/auto-mitigation` | Toggle auto-mitigation |
| GET | `/api/actions/history` | Mitigation history |

### Audit & Anchoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit` | Audit log entries |
| GET | `/api/audit/types` | Event types |
| GET | `/api/audit/stats` | Audit statistics |
| POST | `/api/anchor` | Create anchor record |
| GET | `/api/anchors` | List anchors |
| PUT | `/api/anchors/:id/confirm` | Confirm with tx hash |
| POST | `/api/pin` | Pin to IPFS |
| POST | `/api/verify` | Verify signature |

## WebSocket

Connect to `ws://localhost:4000/ws/updates`

### Subscription Channels
- `tick` — Simulation state updates (throttled to 1/sec)
- `prediction` — New predictions
- `alert` — Triggered alerts
- `cascade` — Cascade events
- `mitigation` — Mitigation actions

### Client Messages
```javascript
// Subscribe to channels
{ "type": "subscribe", "channels": ["tick", "alert"] }

// Unsubscribe
{ "type": "unsubscribe", "channels": ["tick"] }

// Get current state
{ "type": "getState" }

// Ping/pong
{ "type": "ping" }
```

### Server Messages
```javascript
{
  "type": "tick",
  "data": { "systemState": {...}, "weather": {...} },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment | `development` |
| `API_KEY` | API key for auth | `demo-api-key...` |
| `CORS_ORIGIN` | CORS origins | `*` |
| `DB_PATH` | SQLite database path | `./data/sentinel.db` |
| `SIMULATION_SEED` | RNG seed | `12345` |
| `NODE_COUNT` | Simulated nodes | `200` |
| `WEB3STORAGE_TOKEN` | Web3.Storage API token | — |
| `PIN_HMAC_KEY` | HMAC signing key | `demo-hmac-key...` |
| `HARDHAT_RPC` | Local chain RPC | `http://localhost:8545` |
| `BASE_RPC_URL` | Base testnet RPC | — |
| `PRIVATE_KEY` | Wallet private key | — |
| `CONTRACT_ADDRESS` | Deployed contract | — |

## Docker

### Build and Run
```bash
# Build image
docker build -t sentinel-grid-backend .

# Run container
docker run -p 4000:4000 -e API_KEY=your-key sentinel-grid-backend
```

### Docker Compose
```bash
# Start all services (backend + hardhat)
docker-compose up --build

# With IPFS
docker-compose --profile full up --build
```

## Authentication

In production, include `x-api-key` header:

```bash
curl -H "x-api-key: your-api-key" http://localhost:4000/api/system/state
```

In development mode, auth is optional.

## Example Usage

### Start Simulation
```bash
# Start simulation
curl -X POST http://localhost:4000/api/system/start

# Get state
curl http://localhost:4000/api/system/state
```

### Trigger Cascade
```bash
# Get a node ID
NODE_ID=$(curl -s http://localhost:4000/api/nodes?limit=1 | jq -r '.data[0].id')

# Trigger cascade
curl -X POST http://localhost:4000/api/simulate/cascade \
  -H "Content-Type: application/json" \
  -d "{\"originId\": \"$NODE_ID\", \"severity\": 0.7}"
```

### Apply Mitigation
```bash
curl -X POST http://localhost:4000/api/actions/mitigate \
  -H "Content-Type: application/json" \
  -d '{"nodeId": "node_0001"}'
```

### Pin to IPFS
```bash
curl -X POST http://localhost:4000/api/pin \
  -H "Content-Type: application/json" \
  -d '{"payload": {"event": "cascade", "timestamp": "2024-01-15"}}'
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Demo Script

```bash
# Run interactive demo
npm run demo
```

The demo script walks through:
1. Initialize simulation
2. Deploy threat scenario
3. Show predictions appearing
4. Trigger cascade
5. Apply mitigation
6. Pin snapshot to IPFS
7. Create anchor record

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express app
│   ├── config.ts             # Environment config
│   ├── middleware/
│   │   ├── auth.ts           # API key auth
│   │   └── errorHandler.ts   # Error handling
│   ├── routes/
│   │   ├── index.ts          # Route aggregator
│   │   ├── system.ts         # System endpoints
│   │   ├── nodes.ts          # Node endpoints
│   │   ├── predictions.ts    # Prediction endpoints
│   │   ├── simulate.ts       # Simulation endpoints
│   │   ├── actions.ts        # Action endpoints
│   │   ├── audit.ts          # Audit endpoints
│   │   └── anchor.ts         # Anchor/IPFS endpoints
│   ├── services/
│   │   ├── simulation.ts     # Simulation service
│   │   └── storage.ts        # IPFS/storage service
│   ├── db/
│   │   └── index.ts          # SQLite database
│   └── websocket/
│       └── index.ts          # WebSocket server
├── tests/
│   ├── setup.ts              # Test configuration
│   └── api.test.ts           # API tests
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

## Related Packages

- `@sentinel-grid/predictive-engine` — Core simulation and prediction logic
- `@sentinel-grid/contracts` — Smart contracts (coming soon)
- `@sentinel-grid/frontend` — React dashboard (coming soon)

## License

MIT © Monza Tech LLC
