#!/bin/bash
# Test script for Task 1.1: Operating mode detection

set -e

echo "=============================================="
echo "Testing Task 1.1: Operating Mode Detection"
echo "=============================================="
echo ""

# Check Python version
echo "1. Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "   Current Python: $PYTHON_VERSION"

PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 10 ]; then
    echo "   ✅ Python 3.10+ available"
else
    echo "   ❌ Python 3.10+ required (have $PYTHON_VERSION)"
    exit 1
fi

echo ""

# Check if MCP Agent Mail client is available
echo "2. Checking MCP Agent Mail client availability..."
cd /Users/buddhi/.config/opencode
python3 -c "
import sys
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')
try:
    from mcp_agent_mail_client import is_mcp_available
    available = is_mcp_available()
    print(f'   MCP available: {available}')
    exit(0 if available else 1)
except Exception as e:
    print(f'   Error: {e}')
    exit(1)
" || echo "   ⚠️  MCP Agent Mail not fully available"

echo ""
echo "3. Manual verification steps needed:"
echo "   a) Check that orchestrator detects mode correctly"
echo "   b) Verify USE_MCP is set based on availability"
echo "   c) Test graceful degradation when MCP unavailable"
echo ""
echo "=============================================="
echo "Test complete - manual verification required"
echo "=============================================="
