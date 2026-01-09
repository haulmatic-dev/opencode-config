#!/bin/bash
# Check if Biome is installed and available
# Returns exit code 0 if available, 1 if not

if ! command -v biome &> /dev/null; then
  echo "⚠️  Biome (biome): not found"
  echo "Install: npm install -g @biomejs/biome"
  exit 1
fi

# Check if biome is working
BIOME_VERSION=$(biome --version 2>/dev/null || echo "unknown")

echo "✅ Biome (biome): available (version: $BIOME_VERSION)"
exit 0
