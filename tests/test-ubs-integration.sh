#!/bin/bash
# Test UBS Integration - Test Scenarios

set -e

echo "========================================="
echo "UBS Integration Test Suite"
echo "========================================="
echo ""

# Test 1: Check UBS Plugin Exists
echo "Test 1: UBS Plugin Files Exist"
echo "----------------------------------------"

PLUGIN_FILES=(
    "plugin/ubs.mjs"
    "lib/ubs-client.js"
    "config/ubs_config.json"
    "hooks/check-ubs.sh"
)

for file in "${PLUGIN_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
        exit 1
    fi
done

echo ""

# Test 2: UBS Health Check Hook
echo "Test 2: UBS Health Check Hook"
echo "----------------------------------------"

if [ -f "hooks/check-ubs.sh" ]; then
    if [ -x "hooks/check-ubs.sh" ]; then
        echo "✓ check-ubs.sh is executable"
    else
        echo "✗ check-ubs.sh is not executable"
        exit 1
    fi

    # Run the health check
    if bash hooks/check-ubs.sh; then
        echo "✓ UBS health check passes"
    else
        echo "✗ UBS health check failed"
        exit 1
    fi
else
    echo "✗ check-ubs.sh not found"
    exit 1
fi

echo ""

# Test 3: UBS Config Valid JSON
echo "Test 3: UBS Config Valid JSON"
echo "----------------------------------------"

if [ -f "config/ubs_config.json" ]; then
    if python3 -m json.tool config/ubs_config.json > /dev/null 2>&1; then
        echo "✓ ubs_config.json is valid JSON"
    else
        echo "✗ ubs_config.json is invalid JSON"
        exit 1
    fi
else
    echo "✗ ubs_config.json not found"
    exit 1
fi

echo ""

# Test 4: Pre-commit Hook Exists
echo "Test 4: Pre-commit Hook"
echo "----------------------------------------"

if [ -f ".githooks/pre-commit" ]; then
    if [ -x ".githooks/pre-commit" ]; then
        echo "✓ Pre-commit hook exists and is executable"
    else
        echo "✗ Pre-commit hook is not executable"
        exit 1
    fi
else
    echo "✗ Pre-commit hook not found"
    exit 1
fi

echo ""

# Test 5: Documentation Updated
echo "Test 5: Documentation Updates"
echo "----------------------------------------"

# Check AGENTS.md for UBS section
if grep -q "## Ultimate Bug Scanner (UBS)" AGENTS.md; then
    echo "✓ AGENTS.md contains UBS section"
else
    echo "✗ AGENTS.md missing UBS section"
    exit 1
fi

# Check README.md for UBS mentions
if grep -q "Ultimate Bug Scanner (UBS)" README.md; then
    echo "✓ README.md contains UBS references"
else
    echo "✗ README.md missing UBS references"
    exit 1
fi

# Check task-to-commit.md for UBS
if grep -q "UBS" docs/task-to-commit.md; then
    echo "✓ task-to-commit.md contains UBS references"
else
    echo "✗ task-to-commit.md missing UBS references"
    exit 1
fi

echo ""

# Test 6: Session Start Hook Integration
echo "Test 6: Session Start Hook Integration"
echo "----------------------------------------"

if grep -q "check-ubs.sh" hooks/session-start.sh; then
    echo "✓ session-start.sh includes check-ubs.sh"
else
    echo "✗ session-start.sh missing check-ubs.sh"
    exit 1
fi

echo ""

# Test 7: Beads Tasks Created
echo "Test 7: Beads Tasks for UBS Integration"
echo "----------------------------------------"

# Check if tasks exist (they should be closed now)
TASK_COUNT=$(bd list --status=closed 2>/dev/null | grep -i "ubs\|ultimate bug scanner" | wc -l | tr -d ' ')

if [ "$TASK_COUNT" -ge 7 ]; then
    echo "✓ Found $TASK_COUNT UBS-related Beads tasks"
else
    echo "⚠️  Found only $TASK_COUNT UBS-related Beads tasks (expected 7)"
fi

echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo "✅ All critical tests passed!"
echo ""
echo "UBS Integration Components:"
echo "  - Plugin: plugin/ubs.mjs"
echo "  - Client: lib/ubs-client.js"
echo "  - Config: config/ubs_config.json"
echo "  - Health Check: hooks/check-ubs.sh"
echo "  - Pre-commit Hook: .githooks/pre-commit"
echo "  - Documentation: AGENTS.md, README.md, task-to-commit.md"
echo "  - Session Integration: hooks/session-start.sh"
echo ""
echo "Next Steps:"
echo "  1. Install UBS: curl -fsSL \"https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh?\$(date +%s)\" | bash"
echo "  2. Test pre-commit hook with a buggy file"
echo "  3. Verify auto-update works on session start"
echo "  4. Test Stage 3 quality gate"
echo ""
