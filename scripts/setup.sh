#!/bin/bash
# ============================================================================
# Sentinel Grid - Developer Setup Script
# ============================================================================
# Usage:
#   ./scripts/setup.sh              # Full setup
#   ./scripts/setup.sh --docker     # Docker-based setup
#   ./scripts/setup.sh --local      # Local Node.js setup
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

MODE="auto"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --docker)
      MODE="docker"
      shift
      ;;
    --local)
      MODE="local"
      shift
      ;;
    --help)
      echo "Sentinel Grid Developer Setup"
      echo ""
      echo "Usage: ./scripts/setup.sh [options]"
      echo ""
      echo "Options:"
      echo "  --docker    Use Docker-based development"
      echo "  --local     Use local Node.js development"
      echo "  --help      Show this help"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

# Banner
echo ""
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║   🛡️  SENTINEL GRID - DEVELOPER SETUP                             ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Detect environment
echo -e "${BOLD}Detecting environment...${NC}"
echo ""

HAS_NODE=false
HAS_DOCKER=false
NODE_VERSION=""

if command -v node &> /dev/null; then
  HAS_NODE=true
  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  echo -e "${GREEN}✓${NC} Node.js $(node -v)"
else
  echo -e "${YELLOW}⚠${NC} Node.js not found"
fi

if command -v docker &> /dev/null; then
  HAS_DOCKER=true
  echo -e "${GREEN}✓${NC} Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
else
  echo -e "${YELLOW}⚠${NC} Docker not found"
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Docker Compose"
else
  echo -e "${YELLOW}⚠${NC} Docker Compose not found"
fi

# Auto-detect mode
if [ "$MODE" = "auto" ]; then
  if [ "$HAS_DOCKER" = true ]; then
    MODE="docker"
  elif [ "$HAS_NODE" = true ] && [ "$NODE_VERSION" -ge 18 ]; then
    MODE="local"
  else
    echo ""
    echo -e "${RED}Error: Neither Docker nor Node.js 18+ found.${NC}"
    echo "Please install one of:"
    echo "  - Docker: https://docs.docker.com/get-docker/"
    echo "  - Node.js 18+: https://nodejs.org/"
    exit 1
  fi
fi

echo ""
echo -e "${BOLD}Setup mode: ${CYAN}$MODE${NC}"
echo ""

# Create environment file
if [ ! -f ".env" ]; then
  echo -e "${BOLD}Creating environment file...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✓${NC} Created .env from .env.example"
  echo -e "${YELLOW}  Note: Edit .env for production use${NC}"
else
  echo -e "${GREEN}✓${NC} Environment file exists"
fi

# Mode-specific setup
if [ "$MODE" = "docker" ]; then
  echo ""
  echo -e "${BOLD}Setting up Docker environment...${NC}"
  
  # Build images
  echo "Building Docker images (this may take a few minutes)..."
  docker-compose build
  
  echo -e "${GREEN}✓${NC} Docker images built"
  
  echo ""
  echo -e "${GREEN}${BOLD}✓ Docker setup complete!${NC}"
  echo ""
  echo "To start Sentinel Grid:"
  echo -e "  ${CYAN}docker-compose up${NC}"
  echo ""
  echo "Or use the deploy script:"
  echo -e "  ${CYAN}./scripts/deploy.sh${NC}"
  
else
  echo ""
  echo -e "${BOLD}Setting up local development environment...${NC}"
  
  # Check Node version
  if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required (found v$NODE_VERSION)${NC}"
    exit 1
  fi
  
  # Install dependencies
  echo "Installing dependencies..."
  npm install --workspaces
  echo -e "${GREEN}✓${NC} Dependencies installed"
  
  # Build predictive engine
  echo "Building predictive engine..."
  npm run build --workspace=packages/predictive-engine
  echo -e "${GREEN}✓${NC} Predictive engine built"
  
  # Create data directories
  mkdir -p packages/backend/data
  echo -e "${GREEN}✓${NC} Data directories created"
  
  echo ""
  echo -e "${GREEN}${BOLD}✓ Local setup complete!${NC}"
  echo ""
  echo "To start Sentinel Grid:"
  echo ""
  echo "  Terminal 1 (Backend):"
  echo -e "    ${CYAN}cd packages/backend && npm run dev${NC}"
  echo ""
  echo "  Terminal 2 (Frontend):"
  echo -e "    ${CYAN}cd packages/frontend && npm run dev${NC}"
  echo ""
  echo "Then open: http://localhost:3000"
fi

echo ""
echo "Run the demo:"
echo -e "  ${CYAN}./demo/demo.sh${NC}"
echo ""
echo "Run tests:"
echo -e "  ${CYAN}npm test --workspaces${NC}"
echo ""
echo "Documentation:"
echo "  - README.md"
echo "  - docs/DEPLOYMENT.md"
echo "  - demo/DEMO_SCRIPT.md"
echo ""
