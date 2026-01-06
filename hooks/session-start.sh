#!/bin/bash
# Main entry point for opencode session start
# Checks all required services and reports status
# Returns exit code 0 if all required services available, 1 if any missing

set -e

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_HOOKS=("check-cass-memory.sh" "check-mcp-agent-mail.sh" "check-beads.sh" "check-bv.sh")
FAILED_HOOKS=()

echo "🔍 OpenCode: Checking required services..."
echo

for hook in "${REQUIRED_HOOKS[@]}"; do
    hook_path="$HOOKS_DIR/$hook"
    if [ -f "$hook_path" ]; then
        if ! bash "$hook_path"; then
            FAILED_HOOKS+=("$hook")
        fi
    else
        echo "⚠️  Warning: Hook not found: $hook"
        FAILED_HOOKS+=("$hook")
    fi
done

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#FAILED_HOOKS[@]} -eq 0 ]; then
    echo "✅ All required services are available"
    exit 0
else
    echo "❌ Some required services are missing:"
    printf '   - %s\n' "${FAILED_HOOKS[@]}"
    echo
    echo "To resolve:"
    echo "  1. Install missing services (see README.md for installation instructions)"
    echo "  2. Run session-start.sh again to verify"
    exit 1
fi
