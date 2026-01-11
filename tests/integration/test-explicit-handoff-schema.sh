#!/bin/bash
# Test script for EXPLICIT HANDOFF schema validation
# Tests Phase 1 implementation: agent_role, specialist_tags (labels), and estimated_duration

set -e

echo "=== EXPLICIT HANDOFF Schema Validation Tests ==="
echo ""

FAILED=0
PASSED=0

# Test 1: Create task with agent_role in notes
echo "Test 1: Creating task with agent_role='implementation'"
TASK_ID=$(bd create "Test Implementation Task" --description="Testing implementation role" -t task -p 2 -e 120 --labels python,backend,mcp --silent --json | jq -r '.id')
bd update $TASK_ID --notes 'EXPLICIT_HANDOFF: {"agent_role": "implementation"}' --quiet

# Verify agent_role is stored
AGENT_ROLE=$(python3 /Users/buddhi/.config/opencode/parse-handoff.py $TASK_ID agent_role 2>/dev/null)
if [ "$AGENT_ROLE" = "implementation" ]; then
    echo "  ✅ PASS: agent_role stored correctly as 'implementation'"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: Expected 'implementation', got '$AGENT_ROLE'"
    FAILED=$((FAILED + 1))
fi

# Test 2: Verify labels (specialist_tags) are stored
echo "Test 2: Verifying labels (specialist_tags) storage"
LABELS_COUNT=$(bd show $TASK_ID --json | jq '.[0].labels | length')
if [ "$LABELS_COUNT" -eq 3 ]; then
    echo "  ✅ PASS: 3 labels stored correctly"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: Expected 3 labels, got $LABELS_COUNT"
    FAILED=$((FAILED + 1))
fi

# Verify specific labels
HAS_PYTHON=$(bd show $TASK_ID --json | jq '.[0].labels | contains(["python"])')
if [ "$HAS_PYTHON" = "true" ]; then
    echo "  ✅ PASS: 'python' label found"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: 'python' label not found"
    FAILED=$((FAILED + 1))
fi

# Test 3: Verify estimated_duration is stored
echo "Test 3: Verifying estimated_duration (estimate) storage"
ESTIMATE=$(bd show $TASK_ID --json | jq '.[0].estimated_minutes')
if [ "$ESTIMATE" -eq 120 ]; then
    echo "  ✅ PASS: estimated_duration stored as 120 minutes"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: Expected 120, got $ESTIMATE"
    FAILED=$((FAILED + 1))
fi

# Test 4: Test with agent_role='testing'
echo "Test 4: Creating task with agent_role='testing'"
TASK_ID2=$(bd create "Test Testing Task" --description="Testing testing role" -t task -p 2 -e 30 --labels testing,qa --silent --json | jq -r '.id')
bd update $TASK_ID2 --notes 'EXPLICIT_HANDOFF: {"agent_role": "testing"}' --quiet

AGENT_ROLE2=$(python3 /Users/buddhi/.config/opencode/parse-handoff.py $TASK_ID2 agent_role 2>/dev/null)
if [ "$AGENT_ROLE2" = "testing" ]; then
    echo "  ✅ PASS: agent_role stored correctly as 'testing'"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: Expected 'testing', got '$AGENT_ROLE2'"
    FAILED=$((FAILED + 1))
fi

# Test 5: Test with agent_role='fixing'
echo "Test 5: Creating task with agent_role='fixing'"
TASK_ID3=$(bd create "Test Fixing Task" --description="Testing fixing role" -t task -p 1 -e 60 --labels debugging,troubleshooting --silent --json | jq -r '.id')
bd update $TASK_ID3 --notes 'EXPLICIT_HANDOFF: {"agent_role": "fixing"}' --quiet

AGENT_ROLE3=$(python3 /Users/buddhi/.config/opencode/parse-handoff.py $TASK_ID3 agent_role 2>/dev/null)
if [ "$AGENT_ROLE3" = "fixing" ]; then
    echo "  ✅ PASS: agent_role stored correctly as 'fixing'"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: Expected 'fixing', got '$AGENT_ROLE3'"
    FAILED=$((FAILED + 1))
fi

# Test 6: Test with agent_role='verification'
echo "Test 6: Creating task with agent_role='verification'"
TASK_ID4=$(bd create "Test Verification Task" --description="Testing verification role" -t task -p 2 -e 15 --labels review,approval --silent --json | jq -r '.id')
bd update $TASK_ID4 --notes 'EXPLICIT_HANDOFF: {"agent_role": "verification"}' --quiet

AGENT_ROLE4=$(python3 /Users/buddhi/.config/opencode/parse-handoff.py $TASK_ID4 agent_role 2>/dev/null)
if [ "$AGENT_ROLE4" = "verification" ]; then
    echo "  ✅ PASS: agent_role stored correctly as 'verification'"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: Expected 'verification', got '$AGENT_ROLE4'"
    FAILED=$((FAILED + 1))
fi

# Test 7: Verify create-beads-tasks.sh sets fields correctly
echo "Test 7: Testing create-beads-tasks.sh field assignment"
TEST_TASK_ID=$(bd create "Test Script Task" --description="Testing script field assignment" -t task -p 2 --silent --json | jq -r '.id')

# Simulate what create-beads-tasks.sh does
bd update $TEST_TASK_ID -e 90 --set-labels python,testing,mcp --quiet
bd update $TEST_TASK_ID --notes 'EXPLICIT_HANDOFF: {"agent_role": "implementation"}' --quiet

SCRIPT_ESTIMATE=$(bd show $TEST_TASK_ID --json | jq '.[0].estimated_minutes')
SCRIPT_LABELS=$(bd show $TEST_TASK_ID --json | jq '.[0].labels | length')
SCRIPT_ROLE=$(python3 /Users/buddhi/.config/opencode/parse-handoff.py $TEST_TASK_ID agent_role 2>/dev/null)

if [ "$SCRIPT_ESTIMATE" -eq 90 ] && [ "$SCRIPT_LABELS" -eq 3 ] && [ "$SCRIPT_ROLE" = "implementation" ]; then
    echo "  ✅ PASS: create-beads-tasks.sh approach works correctly"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: Script field assignment failed (estimate: $SCRIPT_ESTIMATE, labels: $SCRIPT_LABELS, role: $SCRIPT_ROLE)"
    FAILED=$((FAILED + 1))
fi

# Test 8: Verify agent_context can be stored
echo "Test 8: Storing agent_context in notes"
CONTEXT='{"previous_agent": "orchestrator-BlueLake", "work_completed": "MCP client registration added", "files_modified": ["droids/orchestrator.md"], "test_status": "pending"}'
bd update $TASK_ID --notes "EXPLICIT_HANDOFF: {\"agent_role\": \"implementation\", \"agent_context\": $CONTEXT}" --quiet

STORED_CONTEXT=$(bd show $TASK_ID --json | jq -r '.[0].notes' | grep -o '"agent_context":' | wc -l)
if [ "$STORED_CONTEXT" -gt 0 ]; then
    echo "  ✅ PASS: agent_context stored successfully"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: agent_context not stored properly"
    FAILED=$((FAILED + 1))
fi

# Test 9: Verify handoff_instructions can be stored
echo "Test 9: Storing handoff_instructions in notes"
INSTRUCTIONS='{"next_role": "testing", "test_command": "./test-orchestrator.sh", "estimated_duration": "15 minutes", "notes": "Check graceful degradation"}'
bd update $TASK_ID --notes "EXPLICIT_HANDOFF: {\"agent_role\": \"implementation\", \"handoff_instructions\": $INSTRUCTIONS}" --quiet

STORED_INSTRUCTIONS=$(bd show $TASK_ID --json | jq -r '.[0].notes' | grep -o '"handoff_instructions":' | wc -l)
if [ "$STORED_INSTRUCTIONS" -gt 0 ]; then
    echo "  ✅ PASS: handoff_instructions stored successfully"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAIL: handoff_instructions not stored properly"
    FAILED=$((FAILED + 1))
fi

# Cleanup
bd delete $TASK_ID --silent 2>/dev/null || true
bd delete $TASK_ID2 --silent 2>/dev/null || true
bd delete $TASK_ID3 --silent 2>/dev/null || true
bd delete $TASK_ID4 --silent 2>/dev/null || true
bd delete $TEST_TASK_ID --silent 2>/dev/null || true

# Summary
echo ""
echo "=== Test Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ All tests passed! Phase 1.1 validation complete."
    exit 0
else
    echo "❌ $FAILED tests failed. Please review."
    exit 1
fi
