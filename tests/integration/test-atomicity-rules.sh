#!/bin/bash
# Test script to validate PRD atomicity rules
# Usage: ./test-atomicity-rules.sh [prd-file.md]

set -e

PRD_FILE=${1:-"/Users/buddhi/.config/opencode/tasks/prd-mcp-agent-mail-integration.md"}

echo "=========================================="
echo "PRD Atomicity Rules Validation Test"
echo "File: $PRD_FILE"
echo "=========================================="
echo ""

# Rule 1: Maximum 3 acceptance criteria per requirement
MAX_AC=3
VIOLATIONS=0
WARNINGS=0

# Extract all requirements and count their ACs
echo "Analyzing requirements for atomicity violations..."
echo ""

# Find all requirement sections (#### X.Y patterns)
REQUIREMENTS=$(grep -n "^#### " "$PRD_FILE" | cut -d: -f1)

for REQ_LINE in $REQUIREMENTS; do
    # Get requirement number and title
    REQ_TITLE=$(sed -n "${REQ_LINE}p" "$PRD_FILE" | sed 's/#### //')
    REQ_NUM=$(echo "$REQ_TITLE" | cut -d' ' -f1)
    
    # Find the end of this requirement (next #### or end of file)
    NEXT_REQ_LINE=$(echo "$REQUIREMENTS" | grep -A1 "^${REQ_LINE}$" | tail -n1)
    if [ "$NEXT_REQ_LINE" = "$REQ_LINE" ]; then
        # Last requirement, go to end of file
        END_LINE=$(wc -l < "$PRD_FILE")
    else
        END_LINE=$((NEXT_REQ_LINE - 1))
    fi
    
    # Count acceptance criteria (lines starting with "- [ ]")
    AC_COUNT=$(sed -n "${REQ_LINE},${END_LINE}p" "$PRD_FILE" | grep -c "^- \[ \]" || true)
    
    if [ "$AC_COUNT" -gt "$MAX_AC" ]; then
        VIOLATIONS=$((VIOLATIONS + 1))
        echo "❌ VIOLATION: $REQ_TITLE"
        echo "   Acceptance Criteria: $AC_COUNT (max: $MAX_AC)"
        echo "   Severity: CRITICAL - Must split into multiple requirements"
        echo ""
    elif [ "$AC_COUNT" -gt 3 ]; then
        WARNINGS=$((WARNINGS + 1))
        echo "⚠️  WARNING: $REQ_TITLE"
        echo "   Acceptance Criteria: $AC_COUNT (recommended: ≤3)"
        echo "   Severity: WARNING - Should consider splitting"
        echo ""
    elif [ "$AC_COUNT" -gt 0 ]; then
        echo "✅ OK: $REQ_TITLE"
        echo "   Acceptance Criteria: $AC_COUNT (within limits)"
        echo ""
    fi
done

echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo "Critical Violations (>3 ACs): $VIOLATIONS"
echo "Warnings (4-6 ACs): $WARNINGS"
echo ""

if [ "$VIOLATIONS" -gt 0 ]; then
    echo "❌ FAILED: PRD has $VIOLATIONS requirement(s) that violate atomicity rules."
    echo ""
    echo "Next Steps:"
    echo "1. Split requirements with >3 ACs into multiple atomic requirements"
    echo "2. Group related ACs by functional area (DB, API, UI, etc.)"
    echo "3. Ensure each requirement has ≤3 ACs"
    echo "4. Re-run this validation script"
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo "⚠️  WARNING: PRD has $WARNINGS requirement(s) with 4-6 ACs."
    echo "   Consider splitting for better atomicity."
    echo ""
    echo "✅ PASSED with warnings - Proceed if splitting is not practical."
    exit 0
else
    echo "✅ PASSED: All requirements meet atomicity standards!"
    exit 0
fi
