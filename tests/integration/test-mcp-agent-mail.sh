#!/bin/bash
# Test script for MCP Agent Mail integration

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== MCP Agent Mail Integration Tests ===${NC}"
echo ""

PROGRESS=0
SUCCESS=0
FAILURE=0

run_test() {
    local test_name="$1"
    local test_func="$2"
    
    echo -e "\n${BLUE}Test: $test_name${NC}"
    echo -e "${BLUE}$(printf '%.0s-' {1..60})${NC}"
    
    if $test_func; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((SUCCESS++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILURE++))
    fi
    
    ((PROGRESS++))
    echo "Progress: [$PROGRESS/5]"
}

test_mcp_config() {
    local result
    local mcp_file="/Users/buddhi/.config/opencode/mcp.json"
    
    # Check mcp.json exists
    if [[ -f "$mcp_file" ]]; then
        echo -e "${GREEN}✓${NC} mcp.json exists"
    else
        echo -e "${RED}✗${NC} mcp.json not found"
        return 1
    fi
    
    # Check mcp_agent_mail is configured
    result=$(grep -c "mcp_agent_mail" "$mcp_file" 2>/dev/null || echo "0")
    if [[ "$result" -gt 0 ]]; then
        echo -e "${GREEN}✓${NC} MCP Agent Mail configured in mcp.json"
    else
        echo -e "${RED}✗${NC} MCP Agent Mail not found in mcp.json"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} MCP Agent Mail configuration valid"
    return 0
}

test_server_running() {
    local http_code
    
    # Check if server responds
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        "http://127.0.0.1:8765/health/readiness" 2>/dev/null || echo "000")
    
    if [[ "$http_code" == "200" ]]; then
        echo -e "${GREEN}✓${NC} Server is running and healthy (HTTP 200)"
    elif [[ "$http_code" == "401" ]]; then
        echo -e "${YELLOW}⚠${NC} Server requires authentication (use localhost bypass)"
        return 1
    elif [[ "$http_code" == "000" ]]; then
        echo -e "${RED}✗${NC} Server not responding"
        return 1
    else
        echo -e "${RED}✗${NC} Server returned HTTP $http_code"
        return 1
    fi
    
    return 0
}

test_tools_list() {
    local response
    local tool_count
    
    # List available tools
    response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
        "http://127.0.0.1:8765/mcp" 2>/dev/null)
    
    if [[ -z "$response" ]]; then
        echo -e "${RED}✗${NC} Failed to list tools (no response)"
        return 1
    fi
    
    # Check if response contains 'error'
    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}✗${NC} Tool list failed with error"
        echo "  Response: $response"
        return 1
    fi
    
    # Extract tools count
    tool_count=$(echo "$response" | grep -o '"tools"' | wc -l | tr -d ' ')
    
    echo -e "${GREEN}✓${NC} Tools listed successfully"
    echo "  Tools found: $tool_count"
    
    # Check for required tools
    if echo "$response" | grep -q "register_agent"; then
        echo -e "${GREEN}✓${NC} register_agent tool available"
    else
        echo -e "${RED}✗${NC} register_agent tool not found"
        return 1
    fi
    
    if echo "$response" | grep -q "send_message"; then
        echo -e "${GREEN}✓${NC} send_message tool available"
    else
        echo -e "${RED}✗${NC} send_message tool not found"
        return 1
    fi
    
    if echo "$response" | grep -q "fetch_inbox"; then
        echo -e "${GREEN}✓${NC} fetch_inbox tool available"
    else
        echo -e "${RED}✗${NC} fetch_inbox tool not found"
        return 1
    fi
    
    return 0
}

test_web_ui() {
    local response
    
    # Check main page
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        "http://127.0.0.1:8765/mail" 2>/dev/null || echo "000")
    
    if [[ "$response" == "200" ]]; then
        echo -e "${GREEN}✓${NC} Web UI accessible (HTTP 200)"
    elif [[ "$response" == "000" ]]; then
        echo -e "${YELLOW}⚠${NC} Web UI not responding"
        return 1
    else
        echo -e "${RED}✗${NC} Web UI returned HTTP $response"
        return 1
    fi
    
    return 0
}

test_client_module() {
    local result
    
    # Check if module exists
    if [[ -f "/Users/buddhi/.config/opencode/droids/mcp_agent_mail_client.py" ]]; then
        echo -e "${GREEN}✓${NC} mcp_agent_mail_client.py exists"
    else
        echo -e "${RED}✗${NC} mcp_agent_mail_client.py not found"
        return 1
    fi
    
    # Check if module is readable
    if python3 -c "import sys; sys.path.insert(0, '/Users/buddhi/.config/opencode/droids'); import mcp_agent_mail_client" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} mcp_agent_mail_client module importable"
    else
        echo -e "${RED}✗${NC} mcp_agent_mail_client module not importable"
        return 1
    fi
    
    return 0
}

# Run tests
echo "Running MCP Agent Mail integration tests..."
echo ""

run_test "MCP Agent Mail Configuration" test_mcp_config
run_test "Server Running & Health Check" test_server_running
run_test "MCP Tools Available" test_tools_list
run_test "Web UI Accessible" test_web_ui
run_test "Client Module Available" test_client_module

# Summary
echo -e "\n${BLUE}=== Test Summary ===${NC}"
echo "Tests run: $PROGRESS"
echo -e "${GREEN}Passed: $SUCCESS${NC}"
echo -e "${RED}Failed: $FAILURE${NC}"

if [[ $FAILURE -eq 0 ]]; then
    echo -e "\n${GREEN}✓✓✓ All tests passed! MCP Agent Mail integration is ready.${NC}"
    exit 0
else
    echo -e "\n${RED}✗✗✗ Some tests failed. Please review the errors above.${NC}"
    echo -e "\n${YELLOW}Common issues:${NC}"
    echo "  1. Python 3.10+ required - see MCP_AGENT_MAIL_SETUP.md"
    echo "  2. Server not started - run startup command shown above"
    echo "  3. MCP Agent Mail not configured - add via droid mcp add"
    exit 1
fi
