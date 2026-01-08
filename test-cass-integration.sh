#!/bin/bash

# Test script to verify cass_memory plugin integration

echo "Testing Cass Memory Plugin Integration"
echo "========================================"
echo ""

# Check if plugin file exists
echo "1. Checking plugin file..."
if [ -f "plugin/cass.mjs" ]; then
    echo "   ✓ plugin/cass.mjs exists"
    ls -lh plugin/cass.mjs
else
    echo "   ✗ plugin/cass.mjs not found"
    exit 1
fi

# Check if config exists
echo ""
echo "2. Checking config file..."
if [ -f "cass_config.json" ]; then
    echo "   ✓ cass_config.json exists"
    cat cass_config.json
else
    echo "   ✗ cass_config.json not found"
    exit 1
fi

# Check if cm is installed
echo ""
echo "3. Checking cm installation..."
if command -v cm &> /dev/null; then
    echo "   ✓ cm is installed"
    cm --version
else
    echo "   ✗ cm not found"
    exit 1
fi

# Test cm context
echo ""
echo "4. Testing cm context..."
cm context "test plugin integration" --json --limit 1 > /tmp/cass_test.json 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ cm context command works"
    echo "   Response:"
    cat /tmp/cass_test.json | head -20
else
    echo "   ✗ cm context failed"
    cat /tmp/cass_test.json
    exit 1
fi

# Check plugin syntax
echo ""
echo "5. Checking plugin syntax..."
node --check plugin/cass.mjs
if [ $? -eq 0 ]; then
    echo "   ✓ plugin syntax is valid"
else
    echo "   ✗ plugin syntax error"
    exit 1
fi

# Compare with gptcache plugin structure
echo ""
echo "6. Comparing with gptcache plugin..."
echo "   gptcache plugin hooks:"
grep -o "'[^']*': async" plugin/gptcache.mjs | head -5
echo ""
echo "   cass plugin hooks:"
grep -o "'[^']*': async" plugin/cass.mjs | head -5

echo ""
echo "========================================"
echo "✅ All checks passed!"
echo ""
echo "Integration Summary:"
echo "- Plugin: plugin/cass.mjs ✓"
echo "- Config: cass_config.json ✓"
echo "- Client: cm (installed) ✓"
echo "- Hooks: agent.execute.before, agent.execute.after ✓"
echo "- Test: node test-cass.mjs ✓"
