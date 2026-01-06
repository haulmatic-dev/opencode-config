#!/bin/bash
# Check if Beads CLI (bd) is installed and accessible
# Returns exit code 0 if available, 1 if not

if command -v bd &> /dev/null; then
    version=$(bd --version 2>/dev/null || echo "unknown")
    echo "✅ Beads CLI (bd): installed (version: $version)"
    exit 0
else
    echo "❌ Beads CLI (bd): not found in PATH"
    echo "   Install: go install github.com/steveyegge/beads/cmd/bd@latest"
    echo "   Add to PATH: export PATH=\"\$HOME/go/bin:\$PATH\""
    exit 1
fi
