#!/bin/bash
# test-workspace-init.sh - Test workspace-init script
# Creates a temporary directory and runs workspace-init

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Testing workspace-init Script            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"

# Create temp directory
TEST_DIR=$(mktemp -d)
echo -e "${BLUE}Test directory:${NC} $TEST_DIR"

# Initialize git
cd "$TEST_DIR"
git init -q

echo -e "${BLUE}Running workspace-init --force${NC}"
/Users/buddhi/.config/opencode/bin/workspace-init --force

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Verification Results                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"

PASSED=0
FAILED=0

# Check each item
check_item() {
    local name="$1"
    local path="$2"
    if [ -e "$path" ]; then
        echo -e "  ${GREEN}✓${NC} $name"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} $name (missing: $path)"
        ((FAILED++))
    fi
}

echo ""
echo -e "${YELLOW}Core Infrastructure:${NC}"
check_item "Git repository" ".git"
check_item "cass_memory" ".cass"
check_item "cass_memory playbook" ".cass/playbook.yaml"
check_item "Beads" ".beads"
check_item "Beads database" ".beads/beads.db"

echo ""
echo -e "${YELLOW}Configuration Files:${NC}"
check_item "biome.json" "biome.json"
check_item ".prettierrc" ".prettierrc"
check_item "opencode.json" "opencode.json"

echo ""
echo -e "${YELLOW}Git Hooks:${NC}"
check_item "pre-commit hook" ".git/hooks/pre-commit"

echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  Passed: $PASSED"
echo -e "  Failed: $FAILED"

# Cleanup
echo ""
echo -e "${YELLOW}Cleaning up test directory...${NC}"
cd /
rm -rf "$TEST_DIR"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
