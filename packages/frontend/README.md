# @sentinel-grid/frontend

> React dashboard for Sentinel Grid infrastructure monitoring platform

Premium dark-glass UI dashboard with real-time WebSocket updates, interactive visualizations, and wallet integration.

## Features

- 🎨 **Premium Dark Glass UI** — Modern glassmorphism design with animated gradients
- 📡 **Real-time Updates** — WebSocket connection for live simulation data
- 🗺️ **Network Visualization** — Interactive node grid with filtering and status
- 📊 **Predictive Analytics** — Predictions with probability, confidence, actions
- 📈 **System Timeline** — Cascade history and weather conditions
- 🔔 **Alert Management** — Active alerts with severity levels
- 💼 **Wallet Connect** — MetaMask integration for blockchain features
- 🎛️ **Control Panel** — Threat deployment and cascade simulation

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Dashboard runs at http://localhost:3000

**Note:** Requires the backend to be running at http://localhost:4000

## Tech Stack

- **React 18** — UI framework
- **Vite** — Build tool and dev server
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **Framer Motion** — Animations
- **Recharts** — Charts
- **Lucide React** — Icons

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── MetricCard.tsx      # Stat display card
│   │   ├── NetworkTab.tsx      # Node grid + filtering
│   │   ├── PredictionsTab.tsx  # Predictions + accuracy
│   │   ├── TimelineTab.tsx     # Cascade history
│   │   ├── AlertsTab.tsx       # Alert list
│   │   └── ControlPanel.tsx    # Simulation controls
│   ├── hooks/
│   │   └── index.ts            # useSimulation, useWallet, etc.
│   ├── services/
│   │   ├── api.ts              # REST API client
│   │   └── websocket.ts        # WebSocket client
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── App.tsx                 # Main dashboard
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind + custom styles
├── public/
│   └── shield.svg              # Favicon
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Features Overview

### Network Tab
- Grid view of all infrastructure nodes
- Filter by status (healthy/warning/critical/failed)
- Filter by type (substation/transformer/generator/etc.)
- Search by node name
- Click to expand and apply mitigation

### Predictions Tab
- Real-time ML predictions with confidence scores
- Model accuracy metrics (precision, recall, F1)
- Contributing factors for each prediction
- Recommended actions with priority levels

### Timeline Tab
- System health gauges (health, risk, load)
- Current weather conditions
- Cascade event history with propagation paths
- Impact scores and mitigation status

### Alerts Tab
- Active/Acknowledged/Resolved alerts
- Severity levels (emergency/critical/warning/info)
- Real-time alert feed via WebSocket

### Control Panel
- Start/Stop/Reset simulation
- Deploy threats (cyber, physical, equipment, overload, weather)
- Trigger cascade from critical nodes
- Mitigate all critical nodes

## API Integration

The frontend connects to the backend via:

### REST API
- `GET /api/system/state` — Current state
- `GET /api/nodes` — Node list
- `GET /api/predictions` — Active predictions
- `POST /api/simulate/cascade` — Trigger cascade
- `POST /api/actions/mitigate` — Apply mitigation

### WebSocket
- `ws://localhost:4000/ws/updates`
- Channels: `tick`, `prediction`, `alert`, `cascade`, `mitigation`

## Wallet Integration

MetaMask integration for blockchain features:

```typescript
const { connected, address, connect, disconnect } = useWallet();
```

Supported chains:
- Base Sepolia (testnet)
- Base Mainnet
- Optimism

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `/api` (proxied) |
| `VITE_WS_URL` | WebSocket URL | Auto-detected |

## Development

```bash
# Run with hot reload
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

## Building for Production

```bash
npm run build
```

Outputs to `dist/` directory. Serve with any static file server.

## Related Packages

- `@sentinel-grid/backend` — Express + WebSocket server
- `@sentinel-grid/predictive-engine` — Simulation + ML engine
- `@sentinel-grid/contracts` — Smart contracts

## License

MIT © Monza Tech LLC
