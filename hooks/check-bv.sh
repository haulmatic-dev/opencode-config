#!/bin/bash
# Check if Beads Viewer (bv) is installed and accessible
# Returns exit code 0 if available, 1 if not

if command -v bv &> /dev/null; then
    version=$(bv --version 2>/dev/null || echo "unknown")
    echo "✅ Beads Viewer (bv): installed (version: $version)"
    exit 0
else
    echo "❌ Beads Viewer (bv): not found in PATH"
    echo "   Install: curl -fsSL \"https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh?\$(date +%s)\" | bash"
    exit 1
fi
