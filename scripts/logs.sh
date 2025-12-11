#!/bin/bash
# ============================================================================
# Sentinel Grid - Log Viewer
# ============================================================================
# Usage:
#   ./scripts/logs.sh                # All services, follow
#   ./scripts/logs.sh backend        # Backend only
#   ./scripts/logs.sh --tail 100     # Last 100 lines
#   ./scripts/logs.sh --since 1h     # Last hour
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Defaults
SERVICE=""
FOLLOW=true
TAIL=""
SINCE=""
TIMESTAMPS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    backend|frontend|ipfs|hardhat)
      SERVICE="$1"
      shift
      ;;
    --no-follow|-n)
      FOLLOW=false
      shift
      ;;
    --tail|-t)
      TAIL="$2"
      shift 2
      ;;
    --since|-s)
      SINCE="$2"
      shift 2
      ;;
    --timestamps|-T)
      TIMESTAMPS=true
      shift
      ;;
    --help|-h)
      echo "Sentinel Grid Log Viewer"
      echo ""
      echo "Usage: ./scripts/logs.sh [service] [options]"
      echo ""
      echo "Services:"
      echo "  backend     Backend API logs"
      echo "  frontend    Frontend/nginx logs"
      echo "  ipfs        IPFS node logs"
      echo "  hardhat     Hardhat blockchain logs"
      echo ""
      echo "Options:"
      echo "  --no-follow, -n    Don't follow logs"
      echo "  --tail, -t NUM     Show last NUM lines"
      echo "  --since, -s TIME   Show logs since TIME (e.g., 1h, 30m)"
      echo "  --timestamps, -T   Show timestamps"
      echo "  --help, -h         Show this help"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

# Build docker-compose command
CMD="docker-compose logs"

[ "$FOLLOW" = true ] && CMD="$CMD -f"
[ -n "$TAIL" ] && CMD="$CMD --tail=$TAIL"
[ -n "$SINCE" ] && CMD="$CMD --since=$SINCE"
[ "$TIMESTAMPS" = true ] && CMD="$CMD --timestamps"
[ -n "$SERVICE" ] && CMD="$CMD $SERVICE"

# Execute
exec $CMD
