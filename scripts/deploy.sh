#!/bin/bash
# ============================================================================
# Sentinel Grid - Deployment Script
# ============================================================================
# Usage:
#   ./scripts/deploy.sh              # Deploy with defaults
#   ./scripts/deploy.sh --prod       # Production deployment
#   ./scripts/deploy.sh --dev        # Development with hot reload
#   ./scripts/deploy.sh --full       # Include IPFS
#   ./scripts/deploy.sh --rebuild    # Force rebuild images
#   ./scripts/deploy.sh --down       # Stop all services
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Defaults
MODE="default"
PROFILES=""
BUILD_FLAG=""
COMPOSE_FILES="-f docker-compose.yml"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --prod|--production)
      MODE="production"
      COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
      shift
      ;;
    --dev|--development)
      MODE="development"
      PROFILES="--profile dev"
      shift
      ;;
    --full)
      PROFILES="--profile full"
      shift
      ;;
    --ipfs)
      PROFILES="--profile ipfs"
      shift
      ;;
    --blockchain)
      PROFILES="--profile blockchain"
      shift
      ;;
    --rebuild|--build)
      BUILD_FLAG="--build"
      shift
      ;;
    --down|--stop)
      echo -e "${CYAN}${BOLD}Stopping Sentinel Grid...${NC}"
      docker-compose $COMPOSE_FILES down
      echo -e "${GREEN}✓ Services stopped${NC}"
      exit 0
      ;;
    --logs)
      docker-compose $COMPOSE_FILES logs -f
      exit 0
      ;;
    --status)
      docker-compose $COMPOSE_FILES ps
      exit 0
      ;;
    --help)
      echo "Sentinel Grid Deployment Script"
      echo ""
      echo "Usage: ./scripts/deploy.sh [options]"
      echo ""
      echo "Options:"
      echo "  --prod        Production deployment (with resource limits)"
      echo "  --dev         Development with hot reload"
      echo "  --full        Include all services (IPFS, blockchain)"
      echo "  --ipfs        Include IPFS service"
      echo "  --blockchain  Include Hardhat blockchain"
      echo "  --rebuild     Force rebuild Docker images"
      echo "  --down        Stop all services"
      echo "  --logs        Follow service logs"
      echo "  --status      Show service status"
      echo "  --help        Show this help"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Banner
echo ""
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║   🛡️  SENTINEL GRID - DEPLOYMENT                                  ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Show configuration
echo -e "${BOLD}Configuration:${NC}"
echo "  Mode:     $MODE"
echo "  Profiles: ${PROFILES:-none}"
echo "  Rebuild:  ${BUILD_FLAG:-no}"
echo ""

# Check prerequisites
echo -e "${BOLD}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker not found. Please install Docker.${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo -e "${RED}✗ Docker Compose not found. Please install Docker Compose.${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Docker Compose"

# Check .env file
if [ ! -f .env ]; then
  if [ "$MODE" = "production" ]; then
    echo -e "${RED}✗ .env file not found. Copy .env.example to .env and configure.${NC}"
    exit 1
  else
    echo -e "${YELLOW}⚠ .env not found, using defaults${NC}"
  fi
else
  echo -e "${GREEN}✓${NC} Environment file (.env)"
fi

# Production checks
if [ "$MODE" = "production" ]; then
  echo ""
  echo -e "${BOLD}Production checks...${NC}"
  
  if [ -z "$API_KEY" ] && ! grep -q "^API_KEY=" .env 2>/dev/null; then
    echo -e "${RED}✗ API_KEY not set in .env${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} API_KEY configured"
  
  if grep -q "PIN_HMAC_KEY=change-in-production" .env 2>/dev/null; then
    echo -e "${RED}✗ PIN_HMAC_KEY still has default value${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} PIN_HMAC_KEY configured"
fi

# Pull/build images
echo ""
echo -e "${BOLD}Building images...${NC}"
docker-compose $COMPOSE_FILES $PROFILES build $BUILD_FLAG

# Start services
echo ""
echo -e "${BOLD}Starting services...${NC}"
docker-compose $COMPOSE_FILES $PROFILES up -d $BUILD_FLAG

# Wait for health checks
echo ""
echo -e "${BOLD}Waiting for services to be healthy...${NC}"

wait_for_service() {
  local service=$1
  local max_attempts=30
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if docker-compose $COMPOSE_FILES ps $service | grep -q "healthy"; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  return 1
}

# Check backend
echo -n "  Backend: "
if wait_for_service backend; then
  echo -e "${GREEN}healthy${NC}"
else
  echo -e "${YELLOW}starting...${NC}"
fi

# Check frontend
echo -n "  Frontend: "
if wait_for_service frontend; then
  echo -e "${GREEN}healthy${NC}"
else
  echo -e "${YELLOW}starting...${NC}"
fi

# Run health check
echo ""
./scripts/health-check.sh --quiet || true

# Summary
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}${BOLD}✓ Sentinel Grid is running!${NC}"
echo ""
echo "  Dashboard:  http://localhost:${FRONTEND_PORT:-3000}"
echo "  API:        http://localhost:${BACKEND_PORT:-4000}/api"
echo "  Health:     http://localhost:${BACKEND_PORT:-4000}/health"
echo "  WebSocket:  ws://localhost:${BACKEND_PORT:-4000}/ws/updates"
echo ""
echo "Commands:"
echo "  View logs:    docker-compose logs -f"
echo "  Stop:         ./scripts/deploy.sh --down"
echo "  Status:       ./scripts/deploy.sh --status"
echo ""
