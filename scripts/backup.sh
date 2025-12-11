#!/bin/bash
# ============================================================================
# Sentinel Grid - Backup Script
# ============================================================================
# Usage:
#   ./scripts/backup.sh                    # Full backup
#   ./scripts/backup.sh --db-only          # Database only
#   ./scripts/backup.sh --to s3://bucket   # Upload to S3
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="sentinel-backup-$TIMESTAMP"
DB_ONLY=false
UPLOAD_TO=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --db-only)
      DB_ONLY=true
      shift
      ;;
    --to)
      UPLOAD_TO="$2"
      shift 2
      ;;
    --dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

echo ""
echo -e "${CYAN}${BOLD}🛡️  Sentinel Grid - Backup${NC}"
echo "════════════════════════════════════════════════════"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo -e "${BOLD}Backing up database...${NC}"

if docker-compose ps backend | grep -q "Up"; then
  # Docker deployment - copy from container
  docker-compose exec -T backend cat /app/data/sentinel.db > "$BACKUP_DIR/${BACKUP_NAME}-db.sqlite" 2>/dev/null || true
  
  if [ -s "$BACKUP_DIR/${BACKUP_NAME}-db.sqlite" ]; then
    echo -e "${GREEN}✓${NC} Database backed up from Docker"
  else
    echo -e "${YELLOW}⚠${NC} No database found in Docker container"
    rm -f "$BACKUP_DIR/${BACKUP_NAME}-db.sqlite"
  fi
else
  # Local deployment
  if [ -f "packages/backend/data/sentinel.db" ]; then
    cp "packages/backend/data/sentinel.db" "$BACKUP_DIR/${BACKUP_NAME}-db.sqlite"
    echo -e "${GREEN}✓${NC} Database backed up from local"
  else
    echo -e "${YELLOW}⚠${NC} No local database found"
  fi
fi

if [ "$DB_ONLY" = false ]; then
  # Backup configuration
  echo -e "${BOLD}Backing up configuration...${NC}"
  
  CONFIG_DIR="$BACKUP_DIR/${BACKUP_NAME}-config"
  mkdir -p "$CONFIG_DIR"
  
  [ -f ".env" ] && cp ".env" "$CONFIG_DIR/"
  [ -f "docker-compose.yml" ] && cp "docker-compose.yml" "$CONFIG_DIR/"
  [ -f "docker-compose.prod.yml" ] && cp "docker-compose.prod.yml" "$CONFIG_DIR/"
  
  echo -e "${GREEN}✓${NC} Configuration backed up"
  
  # Backup Docker volumes
  echo -e "${BOLD}Backing up Docker volumes...${NC}"
  
  if docker volume ls | grep -q "sentinel-backend-data"; then
    docker run --rm \
      -v sentinel-backend-data:/data \
      -v "$BACKUP_DIR":/backup \
      alpine tar czf "/backup/${BACKUP_NAME}-volumes.tar.gz" /data 2>/dev/null || true
    
    if [ -f "$BACKUP_DIR/${BACKUP_NAME}-volumes.tar.gz" ]; then
      echo -e "${GREEN}✓${NC} Docker volumes backed up"
    fi
  else
    echo -e "${YELLOW}⚠${NC} No Docker volumes found"
  fi
  
  # Create combined archive
  echo -e "${BOLD}Creating backup archive...${NC}"
  
  cd "$BACKUP_DIR"
  tar czf "${BACKUP_NAME}.tar.gz" \
    "${BACKUP_NAME}-db.sqlite" \
    "${BACKUP_NAME}-config" \
    "${BACKUP_NAME}-volumes.tar.gz" 2>/dev/null || \
  tar czf "${BACKUP_NAME}.tar.gz" \
    "${BACKUP_NAME}-db.sqlite" \
    "${BACKUP_NAME}-config" 2>/dev/null || \
  tar czf "${BACKUP_NAME}.tar.gz" \
    "${BACKUP_NAME}-db.sqlite" 2>/dev/null || true
  
  # Cleanup intermediate files
  rm -f "${BACKUP_NAME}-db.sqlite"
  rm -rf "${BACKUP_NAME}-config"
  rm -f "${BACKUP_NAME}-volumes.tar.gz"
  
  cd "$PROJECT_ROOT"
fi

# Calculate backup size
BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
if [ ! -f "$BACKUP_FILE" ]; then
  BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}-db.sqlite"
fi

if [ -f "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✓${NC} Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
  echo -e "${YELLOW}⚠${NC} No backup file created"
  exit 1
fi

# Upload if specified
if [ -n "$UPLOAD_TO" ]; then
  echo ""
  echo -e "${BOLD}Uploading backup...${NC}"
  
  if [[ "$UPLOAD_TO" == s3://* ]]; then
    if command -v aws &> /dev/null; then
      aws s3 cp "$BACKUP_FILE" "$UPLOAD_TO/"
      echo -e "${GREEN}✓${NC} Uploaded to $UPLOAD_TO"
    else
      echo -e "${YELLOW}⚠${NC} AWS CLI not installed"
    fi
  elif [[ "$UPLOAD_TO" == gs://* ]]; then
    if command -v gsutil &> /dev/null; then
      gsutil cp "$BACKUP_FILE" "$UPLOAD_TO/"
      echo -e "${GREEN}✓${NC} Uploaded to $UPLOAD_TO"
    else
      echo -e "${YELLOW}⚠${NC} gsutil not installed"
    fi
  else
    echo -e "${YELLOW}⚠${NC} Unknown upload destination: $UPLOAD_TO"
  fi
fi

# Cleanup old backups (keep last 7)
echo ""
echo -e "${BOLD}Cleaning old backups...${NC}"
cd "$BACKUP_DIR"
ls -t sentinel-backup-*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
ls -t sentinel-backup-*-db.sqlite 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
echo -e "${GREEN}✓${NC} Kept last 7 backups"

echo ""
echo -e "${GREEN}${BOLD}✓ Backup complete${NC}"
echo ""
