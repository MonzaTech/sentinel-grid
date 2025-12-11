# Sentinel Grid Installation Guide

## Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Docker** (optional, for containerized deployment)

## Quick Start

### 1. Install Dependencies

```bash
cd sentinel-grid
npm install
```

### 2. Build All Packages

Build in order (dependencies first):

```bash
# Build the predictive engine first (required by backend)
npm run build:predictive

# Build storage and bridge packages
npm run build:storage
npm run build:bridge

# Build backend (depends on predictive-engine)
npm run build:backend

# Build frontend
npm run build:frontend
```

Or build everything at once:

```bash
npm run build
```

### 3. Run Tests

```bash
# Test all packages
npm test

# Test specific package
npm test -w packages/predictive-engine
npm test -w packages/backend
```

### 4. Start Development

```bash
# Start backend (terminal 1)
npm run dev:backend

# Start frontend (terminal 2)
npm run dev:frontend
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

## Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Required
API_KEY=your-api-key-here
PIN_HMAC_KEY=your-hmac-key-here

# Optional
NODE_ENV=development
PORT=4000
FRONTEND_PORT=3000
```

Generate secure keys:
```bash
openssl rand -hex 32  # For API_KEY
openssl rand -hex 32  # For PIN_HMAC_KEY
```

## Troubleshooting

### "tsup: command not found"
This error was fixed. The packages now use standard `tsc` for building.

### Module not found errors
Make sure to build packages in order:
1. `predictive-engine` first
2. Then `backend` (depends on predictive-engine)

### Permission denied on scripts
```bash
chmod +x scripts/*.sh
chmod +x demo/*.sh
```

## Package Structure

```
sentinel-grid/
├── packages/
│   ├── predictive-engine/  # Core ML inference engine
│   ├── backend/            # Express API server
│   ├── frontend/           # React dashboard
│   ├── contracts/          # Solidity smart contracts
│   ├── storage/            # IPFS/decentralized storage
│   └── bridge/             # Cross-chain messaging
├── scripts/                # DevOps scripts
├── demo/                   # Demo infrastructure
└── docs/                   # Documentation
```

## Support

For issues, please open a GitHub issue at:
https://github.com/monzatech/sentinel-grid/issues
