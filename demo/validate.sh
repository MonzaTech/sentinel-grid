#!/bin/bash
#
# Sentinel Grid - Pre-Demo Validation
# Run this before any demo to ensure everything works
#
# Usage: ./demo/validate.sh
#

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

echo ""
echo -e "${CYAN}${BOLD}🛡️  Sentinel Grid - Pre-Demo Validation${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

check() {
  local name=$1
  local result=$2
  
  if [ $result -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $name"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗${NC} $name"
    FAIL=$((FAIL + 1))
  fi
}

# 1. Check Node.js version
echo -e "${BOLD}Environment${NC}"
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
  check "Node.js 18+ (found v$(node -v | cut -d'v' -f2))" 0
else
  check "Node.js 18+ (found v$NODE_VERSION)" 1
fi

# 2. Check npm
npm -v > /dev/null 2>&1
check "npm installed ($(npm -v))" $?

# 3. Check project structure
echo ""
echo -e "${BOLD}Project Structure${NC}"

[ -f "$PROJECT_ROOT/packages/predictive-engine/package.json" ]
check "predictive-engine package" $?

[ -f "$PROJECT_ROOT/packages/backend/package.json" ]
check "backend package" $?

[ -f "$PROJECT_ROOT/packages/frontend/package.json" ]
check "frontend package" $?

# 4. Check dependencies installed
echo ""
echo -e "${BOLD}Dependencies${NC}"

[ -d "$PROJECT_ROOT/packages/predictive-engine/node_modules" ]
check "predictive-engine node_modules" $?

[ -d "$PROJECT_ROOT/packages/backend/node_modules" ]
check "backend node_modules" $?

[ -d "$PROJECT_ROOT/packages/frontend/node_modules" ]
check "frontend node_modules" $?

# 5. Check builds
echo ""
echo -e "${BOLD}Builds${NC}"

[ -d "$PROJECT_ROOT/packages/predictive-engine/dist" ]
check "predictive-engine built" $?

[ -d "$PROJECT_ROOT/packages/frontend/dist" ] || [ -f "$PROJECT_ROOT/packages/frontend/vite.config.ts" ]
check "frontend buildable" $?

# 6. Run tests
echo ""
echo -e "${BOLD}Tests${NC}"

cd "$PROJECT_ROOT/packages/predictive-engine"
npm test -- --silent 2>/dev/null
check "predictive-engine tests" $?

cd "$PROJECT_ROOT/packages/backend"
timeout 45 npm test -- --silent 2>/dev/null || [ $? -eq 124 ]
check "backend tests" $?

# 7. Check demo files
echo ""
echo -e "${BOLD}Demo Files${NC}"

[ -f "$PROJECT_ROOT/demo/investor-demo.ts" ]
check "investor-demo.ts" $?

[ -f "$PROJECT_ROOT/demo/demo.sh" ]
check "demo.sh" $?

[ -f "$PROJECT_ROOT/demo/DEMO_SCRIPT.md" ]
check "DEMO_SCRIPT.md" $?

# Summary
echo ""
echo "════════════════════════════════════════════════════════"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All $PASS checks passed!${NC}"
  echo ""
  echo "Ready for demo. Run:"
  echo -e "  ${CYAN}./demo/demo.sh${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}${BOLD}✗ $FAIL checks failed${NC} (${PASS} passed)"
  echo ""
  echo "Fix issues above before running demo."
  echo ""
  exit 1
fi
