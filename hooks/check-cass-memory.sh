#!/bin/bash
# Check if cass_memory (cm) is installed and accessible
# Returns exit code 0 if available, 1 if not

# Check if cm is installed
if ! command -v cm &> /dev/null; then
  echo "❌ cass_memory (cm): not found in PATH"
  echo "   Install: curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/cass_memory_system/main/install.sh | bash -s -- --easy-mode --verify"
  exit 1
fi

version=$(cm --version 2>/dev/null || echo "unknown")
echo "✅ cass_memory (cm): installed (version: $version)"

# Check cass health (exit 0 = healthy regardless of stale index warning)
if cass health &> /dev/null; then
  echo "✅ cass is healthy"
else
  echo "⚠️  cass is not healthy ($(cass health))"
  exit 1
fi
