#!/bin/bash
# Check if GPTCache server is running
# Auto-starts if not running
# Returns exit code 0 if available, 1 if failed to start

GPTCACHE_WRAPPER="$HOME/.config/opencode/bin/gptcache-wrapper"
GPTCACHE_PID_FILE="$HOME/.gptcache/.gptcache.pid"
GPTCACHE_PORT="${GPTCACHE_PORT:-8000}"

# Check if wrapper exists
if [ ! -f "$GPTCACHE_WRAPPER" ]; then
  echo "❌ GPTCache: wrapper not found"
  exit 1
fi

# Check if server is responding
if curl -s "http://127.0.0.1:$GPTCACHE_PORT/" > /dev/null 2>&1; then
  echo "✅ GPTCache: running and healthy (http://127.0.0.1:$GPTCACHE_PORT)"
  exit 0
fi

# Server not responding - try to start it
echo "⏳ GPTCache: not running, starting..."

if "$GPTCACHE_WRAPPER" start > /dev/null 2>&1; then
  # Wait a moment for server to be ready
  sleep 1
  
  # Verify it's responding
  if curl -s "http://127.0.0.1:$GPTCACHE_PORT/" > /dev/null 2>&1; then
    echo "✅ GPTCache: started successfully (http://127.0.0.1:$GPTCACHE_PORT)"
    exit 0
  else
    echo "❌ GPTCache: started but not responding"
    exit 1
  fi
else
  echo "❌ GPTCache: failed to start"
  echo "   Manual start: $GPTCACHE_WRAPPER start"
  exit 1
fi

