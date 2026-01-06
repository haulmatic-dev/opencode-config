#!/bin/bash
# Check if MCP Agent Mail is installed and configured
# Returns exit code 0 if available, 1 if not

MCP_AGENT_MAIL_DIR="$HOME/.mcp-agent-mail"

# Check if directory exists
if [ ! -d "$MCP_AGENT_MAIL_DIR" ]; then
    echo "❌ MCP Agent Mail: directory not found at $MCP_AGENT_MAIL_DIR"
    echo "   Install: git clone https://github.com/Dicklesworthstone/mcp_agent_mail.git $MCP_AGENT_MAIL_DIR"
    exit 1
fi

# Check if server is running
if curl -s http://127.0.0.1:8765/health/readiness &> /dev/null; then
    echo "✅ MCP Agent Mail: installed and running (http://127.0.0.1:8765)"
    exit 0
else
    echo "⚠️  MCP Agent Mail: installed but server not running"
    echo "   Start: cd $MCP_AGENT_MAIL_DIR && HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true uv run python -m mcp_agent_mail.http --host 127.0.0.1 --port 8765 &"
    exit 1
fi
