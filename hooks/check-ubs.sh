#!/bin/bash

# UBS Health Check Hook
# Checks if Ultimate Bug Scanner is installed and healthy

echo "🔬 Checking UBS (Ultimate Bug Scanner)..."

# Check if UBS is installed
if ! command -v ubs &> /dev/null; then
    echo "⚠️  UBS not installed"
    echo "   To install: curl -fsSL \"https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh?\$(date +%s)\" | bash"
    echo ""
    exit 0  # UBS is optional, don't fail session start
fi

# Get UBS version
UBS_VERSION=$(ubs --version 2>/dev/null || echo "unknown")
echo "✓ UBS installed (version: $UBS_VERSION)"

# Check if UBS is working by running a quick health check
if ! ubs doctor &> /dev/null; then
    echo "⚠️  UBS doctor check failed"
    echo "   Run: ubs doctor"
    echo ""
    exit 0  # UBS is optional, don't fail session start
fi

echo "✓ UBS is healthy"
echo ""

# Return success (UBS is optional)
exit 0