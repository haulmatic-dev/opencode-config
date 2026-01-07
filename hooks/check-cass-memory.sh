#!/bin/bash
# Check if cass_memory (cm) is installed and accessible
# Returns exit code 0 if available, 1 if not

if command -v cm &> /dev/null; then
  version=$(cm --version 2>/dev/null || echo "unknown")
  echo "✅ cass_memory (cm): installed (version: $version)"
  exit 0
else
  echo "❌ cass_memory (cm): not found in PATH"
  echo "   Install: curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/cass_memory_system/main/install.sh | bash -s -- --easy-mode --verify"
  exit 1
fi

# If installed, check health and ensure cass is running
if command -v cm &> /dev/null; then
  CASS_HEALTHY=$(cass health 2>/dev/null && echo "healthy")
  
  if [ "$CASS_HEALTHY" = "healthy" ]; then
    # Check if cass process is running
    if ! pgrep -f "cass" > /dev/null 2>&1; then
      echo "🚀 Starting cass (not running)..."
      cass index --full &
      sleep 3
      echo "✅ cass started and indexing"
    else
      echo "✅ cass is already running and healthy"
    fi
  else
    echo "⚠️  cass is not healthy ($(cass health))"
    exit 1
fi
