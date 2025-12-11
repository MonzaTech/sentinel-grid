#!/bin/bash
# ============================================================================
# Sentinel Grid - Health Check Script
# ============================================================================
# Usage:
#   ./scripts/health-check.sh           # Full health check
#   ./scripts/health-check.sh --quiet   # Minimal output
#   ./scripts/health-check.sh --json    # JSON output
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
QUIET=false
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --quiet|-q)
      QUIET=true
      shift
      ;;
    --json|-j)
      JSON_OUTPUT=true
      shift
      ;;
    --backend-url)
      BACKEND_URL="$2"
      shift 2
      ;;
    --frontend-url)
      FRONTEND_URL="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Results tracking
CHECKS_PASSED=0
CHECKS_FAILED=0
RESULTS=()

check() {
  local name=$1
  local url=$2
  local expected=$3
  
  local response
  local status
  
  response=$(curl -s -o /tmp/health_response -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  
  if [ "$response" = "$expected" ]; then
    status="pass"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    if [ "$QUIET" = false ]; then
      echo -e "${GREEN}✓${NC} $name"
    fi
  else
    status="fail"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    if [ "$QUIET" = false ]; then
      echo -e "${RED}✗${NC} $name (got $response, expected $expected)"
    fi
  fi
  
  RESULTS+=("{\"name\":\"$name\",\"status\":\"$status\",\"code\":\"$response\"}")
}

check_json() {
  local name=$1
  local url=$2
  local jq_filter=$3
  local expected=$4
  
  local response
  local value
  local status
  
  response=$(curl -s "$url" 2>/dev/null || echo "{}")
  value=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null || echo "null")
  
  if [ "$value" = "$expected" ]; then
    status="pass"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    if [ "$QUIET" = false ]; then
      echo -e "${GREEN}✓${NC} $name"
    fi
  else
    status="fail"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    if [ "$QUIET" = false ]; then
      echo -e "${RED}✗${NC} $name (got '$value', expected '$expected')"
    fi
  fi
  
  RESULTS+=("{\"name\":\"$name\",\"status\":\"$status\",\"value\":\"$value\"}")
}

# Header
if [ "$QUIET" = false ] && [ "$JSON_OUTPUT" = false ]; then
  echo ""
  echo -e "${CYAN}${BOLD}🛡️  Sentinel Grid - Health Check${NC}"
  echo "════════════════════════════════════════════════════"
  echo ""
fi

# Backend checks
if [ "$QUIET" = false ] && [ "$JSON_OUTPUT" = false ]; then
  echo -e "${BOLD}Backend ($BACKEND_URL)${NC}"
fi

check "Backend health endpoint" "$BACKEND_URL/health" "200"
check_json "Backend status" "$BACKEND_URL/health" ".status" "ok"
check "Backend API root" "$BACKEND_URL/api" "200"
check_json "Backend API status" "$BACKEND_URL/api" ".status" "operational"
check "System state endpoint" "$BACKEND_URL/api/system/state" "200"
check "Nodes endpoint" "$BACKEND_URL/api/nodes" "200"
check "Predictions endpoint" "$BACKEND_URL/api/predictions" "200"

# Frontend checks
if [ "$QUIET" = false ] && [ "$JSON_OUTPUT" = false ]; then
  echo ""
  echo -e "${BOLD}Frontend ($FRONTEND_URL)${NC}"
fi

check "Frontend serving" "$FRONTEND_URL" "200"

# WebSocket check (basic connectivity)
if [ "$QUIET" = false ] && [ "$JSON_OUTPUT" = false ]; then
  echo ""
  echo -e "${BOLD}WebSocket${NC}"
fi

WS_URL="${BACKEND_URL/http/ws}/ws/updates"
if command -v websocat &> /dev/null; then
  if timeout 2 websocat -1 "$WS_URL" &> /dev/null; then
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    if [ "$QUIET" = false ]; then
      echo -e "${GREEN}✓${NC} WebSocket connection"
    fi
    RESULTS+=("{\"name\":\"WebSocket connection\",\"status\":\"pass\"}")
  else
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    if [ "$QUIET" = false ]; then
      echo -e "${RED}✗${NC} WebSocket connection"
    fi
    RESULTS+=("{\"name\":\"WebSocket connection\",\"status\":\"fail\"}")
  fi
else
  if [ "$QUIET" = false ]; then
    echo -e "${YELLOW}⚠${NC} WebSocket check skipped (websocat not installed)"
  fi
  RESULTS+=("{\"name\":\"WebSocket connection\",\"status\":\"skipped\"}")
fi

# Docker checks
if [ "$QUIET" = false ] && [ "$JSON_OUTPUT" = false ]; then
  echo ""
  echo -e "${BOLD}Docker Services${NC}"
fi

if command -v docker &> /dev/null; then
  cd "$PROJECT_ROOT"
  
  for service in backend frontend; do
    container_status=$(docker-compose ps -q $service 2>/dev/null)
    if [ -n "$container_status" ]; then
      health=$(docker inspect --format='{{.State.Health.Status}}' "$container_status" 2>/dev/null || echo "unknown")
      if [ "$health" = "healthy" ]; then
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        if [ "$QUIET" = false ]; then
          echo -e "${GREEN}✓${NC} Docker $service container: $health"
        fi
        RESULTS+=("{\"name\":\"Docker $service\",\"status\":\"pass\",\"health\":\"$health\"}")
      else
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
        if [ "$QUIET" = false ]; then
          echo -e "${YELLOW}⚠${NC} Docker $service container: $health"
        fi
        RESULTS+=("{\"name\":\"Docker $service\",\"status\":\"warn\",\"health\":\"$health\"}")
      fi
    fi
  done
fi

# Summary
if [ "$JSON_OUTPUT" = true ]; then
  echo "{"
  echo "  \"passed\": $CHECKS_PASSED,"
  echo "  \"failed\": $CHECKS_FAILED,"
  echo "  \"total\": $((CHECKS_PASSED + CHECKS_FAILED)),"
  echo "  \"healthy\": $([ $CHECKS_FAILED -eq 0 ] && echo "true" || echo "false"),"
  echo "  \"checks\": ["
  for i in "${!RESULTS[@]}"; do
    if [ $i -lt $((${#RESULTS[@]} - 1)) ]; then
      echo "    ${RESULTS[$i]},"
    else
      echo "    ${RESULTS[$i]}"
    fi
  done
  echo "  ]"
  echo "}"
else
  if [ "$QUIET" = false ]; then
    echo ""
    echo "════════════════════════════════════════════════════"
    echo ""
  fi
  
  TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))
  
  if [ $CHECKS_FAILED -eq 0 ]; then
    if [ "$QUIET" = false ]; then
      echo -e "${GREEN}${BOLD}✓ All $TOTAL checks passed${NC}"
    else
      echo -e "${GREEN}✓ Healthy ($CHECKS_PASSED/$TOTAL)${NC}"
    fi
    exit 0
  else
    if [ "$QUIET" = false ]; then
      echo -e "${RED}${BOLD}✗ $CHECKS_FAILED of $TOTAL checks failed${NC}"
    else
      echo -e "${RED}✗ Unhealthy ($CHECKS_PASSED/$TOTAL)${NC}"
    fi
    exit 1
  fi
fi
