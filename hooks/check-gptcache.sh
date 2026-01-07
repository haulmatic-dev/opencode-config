#!/bin/bash
# Check if GPTCache server is running
# Returns exit code 0 if available and running, 1 if not

GPTCACHE_PID_FILE="$HOME/.gptcache/.gptcache.pid"
GPTCACHE_PORT="${GPTCACHE_PORT:-19530}"

# Check if PID file exists
if [ ! -f "$GPTCACHE_PID_FILE" ]; then
  echo "❌ GPTCache: not initialized (no PID file)"
  echo "   Run: opencode-init to install GPTCache"
  exit 1
fi

# Check if process is running
PID=$(cat "$GPTCACHE_PID_FILE" 2>/dev/null || echo "")
if [ -z "$PID" ]; then
  echo "❌ GPTCache: PID file is empty"
  echo "   Run: opencode-init to install GPTCache"
  exit 1
fi

if ! ps -p $PID > /dev/null 2>&1; then
  echo "❌ GPTCache: server not running (PID: $PID)"
  echo "   Start: $HOME/.config/opencode/bin/gptcache-wrapper start"
  exit 1
fi

# Check if server is responding
if ! curl -s "http://127.0.0.1:$GPTCACHE_PORT/health" > /dev/null 2>&1; then
  echo "⚠️  GPTCache: running but not responding"
  echo "   Health check failed at http://127.0.0.1:$GPTCACHE_PORT"
  exit 1
fi

echo "✅ GPTCache: running and healthy (http://127.0.0.1:$GPTCACHE_PORT)"
exit 0
