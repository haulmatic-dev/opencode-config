#!/bin/bash
# Test script for opencode-init-interactive

echo "Testing opencode-init..."

# Test 1: Check if script is executable
echo -n "1. Script executable... "
if [ -x "/Users/buddhi/.config/opencode/bin/opencode-init" ]; then
  echo "✓"
else
  echo "✗ FAILED"
  exit 1
fi

# Test 2: Check if shell can parse the script
echo -n "2. Syntax check... "
if bash -n /Users/buddhi/.config/opencode/bin/opencode-init 2>/dev/null; then
  echo "✓"
else
  echo "✗ FAILED"
  exit 1
fi

# Test 3: Check dependencies are installed
echo -n "3. Node.js dependencies... "
if npm list inquirer ora chalk 2>/dev/null | grep -q "inquirer"; then
  echo "✓"
else
  echo "✗ FAILED - missing dependencies"
  exit 1
fi

# Test 4: Check plugin exists
echo -n "4. Setup plugin exists... "
if [ -f "/Users/buddhi/.config/opencode/plugin/setup.mjs" ]; then
  echo "✓"
else
  echo "✗ FAILED"
  exit 1
fi

# Test 5: Check plugin config exists
echo -n "5. Setup config exists... "
if [ -f "/Users/buddhi/.config/opencode/setup_config.json" ]; then
  echo "✓"
else
  echo "✗ FAILED"
  exit 1
fi

# Test 6: Check hook is updated
echo -n "6. Session start hook updated... "
if grep -q "INTERACTIVE" /Users/buddhi/.config/opencode/hooks/session-start.sh && grep -q "PATH.*opencode/bin" /Users/buddhi/.config/opencode/hooks/session-start.sh; then
  echo "✓"
else
  echo "✗ FAILED"
  exit 1
fi

# Test 7: Check opencode.json includes setup plugin
echo -n "7. opencode.json includes setup plugin... "
if grep -q "setup.mjs" /Users/buddhi/.config/opencode/opencode.json; then
  echo "✓"
else
  echo "✗ FAILED"
  exit 1
fi

echo
echo "All tests passed! ✓"
echo
echo "Usage:"
echo "  Interactive setup: ./bin/opencode-init"
echo "  Bash setup:        ./bin/opencode-init.bash"
echo "  Workspace setup:    ./bin/workspace-init"
echo "  Interactive hook:   ./hooks/session-start.sh --interactive"
