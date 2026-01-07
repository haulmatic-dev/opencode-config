#!/bin/bash
# Check cass health and start if needed
# Used by opencode session-start.sh

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if cass is installed
if ! command -v cass &> /dev/null; then
  echo -e "${YELLOW}○${NC} cass_memory (cm): not installed"
  exit 1
fi

# Check cass health
CASS_HEALTHY=$(cass health 2>/dev/null && echo "healthy")

if [ "$CASS_HEALTHY" != "healthy" ]; then
  echo -e "${YELLOW}⚠️${NC} cass is not healthy"
  echo -e "${YELLOW}Run: ${NC}cass doctor --fix or 'cass index --full'"
  exit 1
fi

# Check if cass is running
if ! pgrep -f "cass" > /dev/null 2>&1; then
  echo -e "${GREEN}🚀 Starting cass...${NC}"
  cass index --full &
  sleep 2
  echo -e "${GREEN}✓${NC} cass started and indexing"
  exit 0
else
  echo -e "${GREEN}✓${NC} cass is already running and healthy"
  exit 0
fi
