#!/bin/bash
# Check TLDR daemon status and start if needed
# Used by opencode session-start.sh

# Check if tldr is installed
if ! command -v tldr &> /dev/null; then
  echo "⚠️  TLDR: not installed"
  exit 1
fi

# Check if daemon is running
DAEMON_STATUS=$(tldr daemon status 2>&1 || echo "not running")

if echo "$DAEMON_STATUS" | grep -qi "ready\|running"; then
  echo "✓ TLDR daemon: running"
  echo "$DAEMON_STATUS"
  exit 0
fi

# Not running - try to start
echo "⏳ TLDR daemon: not running, starting..."

tldr daemon start 2>/dev/null

# Wait for daemon to be ready
sleep 3

# Check if it's responding
DAEMON_STATUS=$(tldr daemon status 2>&1 || echo "not running")
if echo "$DAEMON_STATUS" | grep -qi "ready\|running"; then
  echo "✓ TLDR daemon: started successfully"
  echo "$DAEMON_STATUS"
  exit 0
else
  echo "⚠️  TLDR daemon: failed to start"
  echo "$DAEMON_STATUS"
  exit 1
fi
