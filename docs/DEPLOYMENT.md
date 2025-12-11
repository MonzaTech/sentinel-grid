# Sentinel Grid - Deployment Guide

Complete guide for deploying Sentinel Grid in development, staging, and production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Requirements](#requirements)
- [Development Setup](#development-setup)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Cloud Deployments](#cloud-deployments)
- [Configuration Reference](#configuration-reference)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### One-Command Docker Deploy

```bash
# Clone repository
git clone https://github.com/monzatech/sentinel-grid.git
cd sentinel-grid

# Copy environment file
cp .env.example .env

# Deploy
./scripts/deploy.sh

# Open dashboard
open http://localhost:3000
```

### One-Command Local Dev

```bash
# Install dependencies
npm install --workspaces

# Start backend (Terminal 1)
cd packages/backend && npm run dev

# Start frontend (Terminal 2)
cd packages/frontend && npm run dev

# Open dashboard
open http://localhost:3000
```

---

## Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| CPU | 2 cores |
| RAM | 4 GB |
| Disk | 10 GB |
| Docker | 20.10+ |
| Docker Compose | 2.0+ |

### Production Requirements

| Component | Requirement |
|-----------|-------------|
| CPU | 4+ cores |
| RAM | 8+ GB |
| Disk | 50+ GB SSD |
| Docker | 24.0+ |
| Docker Compose | 2.20+ |

### Software Dependencies

- Node.js 18+ (for local development)
- npm 9+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- curl (for health checks)

---

## Development Setup

### Local Development (No Docker)

```bash
# 1. Clone and install
git clone https://github.com/monzatech/sentinel-grid.git
cd sentinel-grid
npm install --workspaces

# 2. Build predictive engine
npm run build --workspace=packages/predictive-engine

# 3. Start backend
cd packages/backend
cp .env.example .env
npm run dev
# → Running at http://localhost:4000

# 4. Start frontend (new terminal)
cd packages/frontend
npm run dev
# → Running at http://localhost:3000
```

### Development with Docker

```bash
# Start with hot reload and local blockchain
./scripts/deploy.sh --dev

# Or manually
docker-compose --profile dev up
```

### Running Tests

```bash
# All tests
npm test --workspaces

# Individual packages
npm test --workspace=packages/predictive-engine  # 62 tests
npm test --workspace=packages/backend            # 29 tests

# With coverage
npm test -- --coverage
```

---

## Docker Deployment

### Basic Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### With Optional Services

```bash
# Include IPFS node
docker-compose --profile ipfs up -d

# Include local blockchain (Hardhat)
docker-compose --profile blockchain up -d

# Include everything
docker-compose --profile full up -d
```

### Building Images

```bash
# Build all images
docker-compose build

# Force rebuild (no cache)
docker-compose build --no-cache

# Build specific service
docker-compose build backend
```

### Image Management

```bash
# List images
docker images | grep sentinel

# Remove old images
docker image prune -f

# Tag for registry
docker tag sentinel-grid_backend:latest myregistry.com/sentinel-grid/backend:v1.0.0
```

---

## Production Deployment

### Pre-Production Checklist

- [ ] Generate secure API_KEY: `openssl rand -hex 32`
- [ ] Generate secure PIN_HMAC_KEY: `openssl rand -hex 32`
- [ ] Configure SSL/TLS termination
- [ ] Set up reverse proxy (nginx/Traefik)
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up database backups
- [ ] Test disaster recovery

### Production Environment File

```bash
# .env (production)
NODE_ENV=production

# Security (REQUIRED - generate unique values)
API_KEY=your-64-char-hex-key-here
PIN_HMAC_KEY=your-64-char-hex-key-here

# Ports
FRONTEND_PORT=80
BACKEND_PORT=4000

# Simulation
NODE_COUNT=200
TICK_INTERVAL_MS=5000

# Blockchain (if using)
BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=your-wallet-private-key
CONTRACT_ADDRESS=0x...
```

### Deploy to Production

```bash
# Production deployment with resource limits
./scripts/deploy.sh --prod

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### SSL/TLS with Traefik

```yaml
# docker-compose.override.yml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - traefik-certs:/letsencrypt

  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`sentinel.yourdomain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"

volumes:
  traefik-certs:
```

---

## Cloud Deployments

### AWS (ECS/Fargate)

```bash
# Build and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
docker build -f packages/backend/Dockerfile -t $ECR_REGISTRY/sentinel-backend:latest .
docker push $ECR_REGISTRY/sentinel-backend:latest

# Deploy with Copilot
copilot init --app sentinel-grid --name backend --type "Load Balanced Web Service"
copilot deploy
```

### Google Cloud (Cloud Run)

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/$PROJECT_ID/sentinel-backend
gcloud run deploy sentinel-backend \
  --image gcr.io/$PROJECT_ID/sentinel-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Azure (Container Apps)

```bash
# Build and push to ACR
az acr build --registry $ACR_NAME --image sentinel-backend:latest .
az containerapp create \
  --name sentinel-backend \
  --resource-group sentinel-rg \
  --image $ACR_NAME.azurecr.io/sentinel-backend:latest \
  --target-port 4000 \
  --ingress external
```

### DigitalOcean (App Platform)

```yaml
# .do/app.yaml
name: sentinel-grid
services:
  - name: backend
    dockerfile_path: packages/backend/Dockerfile
    http_port: 4000
    health_check:
      http_path: /health
    envs:
      - key: NODE_ENV
        value: production
  - name: frontend
    dockerfile_path: packages/frontend/Dockerfile
    http_port: 80
```

### Kubernetes (Helm)

```bash
# Install with Helm (coming soon)
helm repo add sentinel-grid https://charts.sentinelgrid.io
helm install sentinel sentinel-grid/sentinel-grid \
  --set backend.apiKey=$API_KEY \
  --set backend.hmacKey=$PIN_HMAC_KEY
```

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `FRONTEND_PORT` | `3000` | Frontend port |
| `BACKEND_PORT` | `4000` | Backend port |
| `API_KEY` | (none) | API authentication key |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `DB_PATH` | `./data/sentinel.db` | SQLite database path |
| `SIMULATION_SEED` | `12345` | RNG seed for determinism |
| `NODE_COUNT` | `200` | Number of simulated nodes |
| `TICK_INTERVAL_MS` | `3000` | Simulation tick interval |
| `PREDICTION_INTERVAL_MS` | `10000` | Prediction generation interval |
| `WEB3STORAGE_TOKEN` | (none) | Web3.Storage API token |
| `IPFS_LOCAL` | `false` | Use local IPFS node |
| `PIN_HMAC_KEY` | (required) | HMAC signing key |
| `BASE_RPC_URL` | (none) | Base L2 RPC endpoint |
| `PRIVATE_KEY` | (none) | Wallet private key |
| `CONTRACT_ADDRESS` | (none) | Deployed contract address |
| `AUTO_ANCHOR` | `false` | Enable auto-anchoring |

### Port Reference

| Port | Service | Protocol |
|------|---------|----------|
| 3000 | Frontend | HTTP |
| 4000 | Backend API | HTTP |
| 4000 | WebSocket | WS |
| 5001 | IPFS API | HTTP |
| 8080 | IPFS Gateway | HTTP |
| 8545 | Hardhat RPC | HTTP |

---

## Monitoring

### Health Endpoints

```bash
# Backend health
curl http://localhost:4000/health
# → {"status":"ok","timestamp":"..."}

# System metrics
curl http://localhost:4000/api/system/metrics
# → Prometheus-format metrics

# Full health check
./scripts/health-check.sh
```

### Prometheus Metrics

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'sentinel-grid'
    static_configs:
      - targets: ['backend:4000']
    metrics_path: '/api/system/metrics'
```

### Grafana Dashboard

Import dashboard ID: `XXXXX` (coming soon)

Or create panels for:
- Node health distribution
- Prediction accuracy over time
- Alert frequency
- WebSocket connections
- API response times

### Log Aggregation

```yaml
# docker-compose.override.yml for ELK
services:
  backend:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "localhost:24224"
        tag: "sentinel.backend"
```

---

## Troubleshooting

### Common Issues

#### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common fixes:
# 1. Port already in use
lsof -i:4000
kill -9 <PID>

# 2. Missing dependencies
cd packages/backend && npm install

# 3. Database locked
rm -f data/sentinel.db
```

#### Frontend can't connect to backend

```bash
# Check backend is running
curl http://localhost:4000/health

# Check CORS configuration
# In .env: CORS_ORIGIN=http://localhost:3000

# Check nginx proxy (Docker)
docker-compose logs frontend
```

#### WebSocket disconnects

```bash
# Check WebSocket endpoint
wscat -c ws://localhost:4000/ws/updates

# Common causes:
# - Proxy timeout (increase to 7d)
# - Load balancer not configured for WS
# - Firewall blocking upgrade headers
```

#### Docker build fails

```bash
# Clear Docker cache
docker system prune -af
docker-compose build --no-cache

# Check disk space
df -h

# Check Docker daemon
docker info
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=sentinel:* npm run dev

# Verbose Docker build
docker-compose build --progress=plain
```

### Getting Help

1. Check logs: `docker-compose logs -f`
2. Run health check: `./scripts/health-check.sh`
3. Check GitHub Issues
4. Contact: support@sentinelgrid.io

---

## Security Considerations

### Production Security Checklist

- [ ] Change all default passwords and keys
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall (only expose 80/443)
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Backup encryption keys securely
- [ ] Use secrets management (Vault, AWS Secrets Manager)

### Network Security

```bash
# Firewall rules (ufw example)
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 4000/tcp   # Block direct backend access
ufw deny 5001/tcp   # Block IPFS API
ufw enable
```

### Secrets Management

```bash
# Using Docker secrets
echo "my-api-key" | docker secret create api_key -

# In docker-compose.yml
services:
  backend:
    secrets:
      - api_key
    environment:
      - API_KEY_FILE=/run/secrets/api_key

secrets:
  api_key:
    external: true
```

---

## Maintenance

### Backups

```bash
# Backup database
docker-compose exec backend cp /app/data/sentinel.db /app/data/backup-$(date +%Y%m%d).db

# Backup volumes
docker run --rm -v sentinel-backend-data:/data -v $(pwd):/backup alpine \
  tar cvf /backup/sentinel-data-$(date +%Y%m%d).tar /data
```

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and redeploy
./scripts/deploy.sh --rebuild

# Or with zero downtime
docker-compose pull
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build frontend
```

### Scaling

```bash
# Scale backend (with load balancer)
docker-compose up -d --scale backend=3

# Note: Requires sticky sessions for WebSocket
```

---

*Last updated: December 2024*
