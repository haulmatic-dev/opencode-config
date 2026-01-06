#!/bin/bash
# Test script for verifying MCP Agent Mail registration in Track B droids

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DROIDS_DIR="/Users/buddhi/.config/opencode/droids"
DROIDS_TO_TEST=(
    "generate-tasks.md"
    "task-coordinator.md"
    "codebase-researcher.md"
    "git-history-analyzer.md"
    "library-source-reader.md"
    "file-picker-agent.md"
    "context-researcher.md"
    "domain-specialist.md"
    "best-practices-researcher.md"
    "semantic-search.md"
)

echo "=========================================="
echo "MCP Agent Mail Registration Test Suite"
echo "=========================================="
echo ""

TOTAL=0
PASSED=0
FAILED=0

echo -e "${GREEN}Checking for MCP integration sections...${NC}"
for droid in "${DROIDS_TO_TEST[@]}"; do
    droid_file="${DROIDS_DIR}/${droid}"
    TOTAL=$((TOTAL + 1))
    
    # Check if file exists
    if [ ! -f "$droid_file" ]; then
        echo -e "  ${RED}✗ FAIL${NC} $droid - File not found"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # Check for MCP Agent Mail Integration section (with or without emoji)
    if grep -q "## .*MCP Agent Mail Integration" "$droid_file"; then
        echo -e "  ${GREEN}✓ PASS${NC} $droid - Has MCP integration section"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}✗ FAIL${NC} $droid - Missing MCP integration section"
        FAILED=$((FAILED + 1))
    fi
    
    # Check for USE_MCP flag initialization
    if grep -q "USE_MCP = False" "$droid_file"; then
        echo -e "  ${GREEN}✓ PASS${NC} $droid - Has USE_MCP flag"
    else
        echo -e "  ${YELLOW}⚠ WARN${NC} $droid - Missing USE_MCP flag"
        FAILED=$((FAILED + 1))
    fi
    
    # Check for register_agent() call
    if grep -q "register_agent(" "$droid_file"; then
        echo -e "  ${GREEN}✓ PASS${NC} $droid - Has register_agent() call"
    else
        echo -e "  ${RED}✗ FAIL${NC} $droid - Missing register_agent() call"
        FAILED=$((FAILED + 1))
    fi
    
    # Check for graceful degradation message
    if grep -q "graceful degradation" "$droid_file"; then
        echo -e "  ${GREEN}✓ PASS${NC} $droid - Has graceful degradation handling"
    else
        echo -e "  ${YELLOW}⚠ WARN${NC} $droid - Missing graceful degradation message"
        FAILED=$((FAILED + 1))
    fi
    
    # Check for proper code block formatting (no escaped backticks)
    # Just check that code blocks have proper ``` delimiter
    if grep -q '```' "$droid_file"; then
        # Count ``` occurrences - should be paired
        backtick_count=$(grep -o '```' "$droid_file" | wc -l | tr -d ' ')
        if [ $((backtick_count % 2)) -eq 0 ]; then
            echo -e "  ${GREEN}✓ PASS${NC} $droid - Code blocks properly formatted"
        else
            echo -e "  ${RED}✗ FAIL${NC} $droid - Unpaired code block backticks"
            FAILED=$((FAILED + 1))
        fi
    else
        echo -e "  ${YELLOW}⚠ WARN${NC} $droid - No code blocks found"
    fi
done

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Total droids checked: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo -e "Success rate: $(( PASSED * 100 / TOTAL ))%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
