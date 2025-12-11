#!/bin/bash
#
# Sentinel Grid - Demo Launcher
# One-command demo for investors and stakeholders
#
# Usage: ./demo/demo.sh [options]
#
# Options:
#   --fast          Run demo at 2x speed
#   --no-frontend   Skip opening browser
#   --record        Enable screen recording hints
#   --help          Show this help
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_PORT=4000
FRONTEND_PORT=3000
DEMO_SPEED=""
OPEN_BROWSER=true
RECORDING_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fast)
      DEMO_SPEED="fast"
      shift
      ;;
    --no-frontend)
      OPEN_BROWSER=false
      shift
      ;;
    --record)
      RECORDING_MODE=true
      shift
      ;;
    --help)
      echo "Sentinel Grid Demo Launcher"
      echo ""
      echo "Usage: ./demo/demo.sh [options]"
      echo ""
      echo "Options:"
      echo "  --fast          Run demo at 2x speed"
      echo "  --no-frontend   Skip opening browser"
      echo "  --record        Enable screen recording mode"
      echo "  --help          Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Banner
clear
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                                                                    ║"
echo "║   ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗      ║"
echo "║   ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║      ║"
echo "║   ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║      ║"
echo "║   ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║      ║"
echo "║   ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗ ║"
echo "║   ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝ ║"
echo "║                                                                    ║"
echo "║              🛡️  GRID - Infrastructure Defense System              ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

check_command() {
  if ! command -v $1 &> /dev/null; then
    log_error "$1 is required but not installed"
    exit 1
  fi
}

wait_for_server() {
  local url=$1
  local max_attempts=30
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if curl -s "$url" > /dev/null 2>&1; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

cleanup() {
  echo ""
  log_info "Cleaning up..."
  
  # Kill background processes
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  
  log_success "Cleanup complete"
}

trap cleanup EXIT

# Check requirements
log_info "Checking requirements..."
check_command node
check_command npm
check_command curl

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  log_error "Node.js 18+ required (found v$NODE_VERSION)"
  exit 1
fi
log_success "Node.js $(node -v)"

# Check if ports are available
if lsof -i:$BACKEND_PORT > /dev/null 2>&1; then
  log_warning "Port $BACKEND_PORT already in use - assuming backend is running"
  BACKEND_RUNNING=true
else
  BACKEND_RUNNING=false
fi

# Start backend if needed
if [ "$BACKEND_RUNNING" = false ]; then
  log_info "Starting backend server..."
  cd "$PROJECT_ROOT/packages/backend"
  
  # Check if dependencies are installed
  if [ ! -d "node_modules" ]; then
    log_info "Installing backend dependencies..."
    npm install --silent
  fi
  
  # Start backend in background
  npm run dev > /tmp/sentinel-backend.log 2>&1 &
  BACKEND_PID=$!
  
  log_info "Waiting for backend to start..."
  if wait_for_server "http://localhost:$BACKEND_PORT/health"; then
    log_success "Backend running at http://localhost:$BACKEND_PORT"
  else
    log_error "Backend failed to start. Check /tmp/sentinel-backend.log"
    exit 1
  fi
else
  log_success "Backend already running at http://localhost:$BACKEND_PORT"
fi

# Recording mode hints
if [ "$RECORDING_MODE" = true ]; then
  echo ""
  echo -e "${CYAN}${BOLD}📹 RECORDING MODE${NC}"
  echo -e "${DIM}─────────────────────────────────────────${NC}"
  echo -e "${DIM}1. Set terminal to 120x30 characters${NC}"
  echo -e "${DIM}2. Use a dark theme for best visibility${NC}"
  echo -e "${DIM}3. Start screen recording now${NC}"
  echo -e "${DIM}4. Press ENTER when ready...${NC}"
  read
fi

# Optionally start frontend
if [ "$OPEN_BROWSER" = true ]; then
  if ! lsof -i:$FRONTEND_PORT > /dev/null 2>&1; then
    log_info "Starting frontend server..."
    cd "$PROJECT_ROOT/packages/frontend"
    
    if [ ! -d "node_modules" ]; then
      log_info "Installing frontend dependencies..."
      npm install --silent
    fi
    
    npm run dev > /tmp/sentinel-frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    if wait_for_server "http://localhost:$FRONTEND_PORT"; then
      log_success "Frontend running at http://localhost:$FRONTEND_PORT"
    fi
  else
    log_success "Frontend already running at http://localhost:$FRONTEND_PORT"
  fi
  
  # Open browser
  log_info "Opening dashboard in browser..."
  if command -v open &> /dev/null; then
    open "http://localhost:$FRONTEND_PORT"
  elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$FRONTEND_PORT"
  fi
fi

echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Run the investor demo
cd "$PROJECT_ROOT"
DEMO_SPEED=$DEMO_SPEED npx tsx demo/investor-demo.ts

# Keep servers running for exploration
if [ "$BACKEND_RUNNING" = false ] || [ ! -z "$FRONTEND_PID" ]; then
  echo ""
  echo -e "${CYAN}${BOLD}Servers are still running for exploration:${NC}"
  echo -e "  • Backend:  http://localhost:$BACKEND_PORT"
  echo -e "  • Frontend: http://localhost:$FRONTEND_PORT"
  echo -e "  • API Docs: http://localhost:$BACKEND_PORT/api"
  echo ""
  echo -e "${DIM}Press Ctrl+C to stop all servers${NC}"
  
  # Wait for user to exit
  wait
fi
