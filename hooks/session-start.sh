#!/bin/bash
# Main entry point for opencode session start
# Checks all required services and reports status
# Returns exit code 0 if all required services available, 1 if any missing

set -e

INTERACTIVE=false
SKIP_CASS_CHECK=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --interactive|-i)
      INTERACTIVE=true
      shift
      ;;
    --skip-cass)
      SKIP_CASS_CHECK=true
      shift
      ;;
  esac
done

# Check if cass is installed and accessible (skip if --skip-cass)
if [ "$SKIP_CASS_CHECK" = false ]; then
  if ! command -v cm &> /dev/null; then
    echo "❌ cass_memory (cm): not found"
  fi

  # Check cass health
  CASS_HEALTHY=$(cass health 2>/dev/null && echo "healthy")

  if [ "$CASS_HEALTHY" != "healthy" ]; then
    echo "⚠️  cass is not healthy"
    echo "Run: 'cass doctor --fix' or 'cass index --full'"
  fi

  # Check if cass is running and healthy
  if command -v cass &> /dev/null && ! pgrep -f "cass" > /dev/null 2>&1; then
    echo "🚀 Starting cass (not running)..."
    cass index --full &
    sleep 2
    echo "✓ cass started and indexing"
  elif command -v cass &> /dev/null && pgrep -f "cass" > /dev/null 2>&1; then
    echo "✓ cass is already running and healthy"
  else
    echo "⚠️  cass is not healthy or not running"
  fi
fi

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_HOOKS=("check-cass-memory.sh" "check-mcp-agent-mail.sh" "check-beads.sh" "check-bv.sh" "check-gptcache.sh" "check-cass-health.sh" "check-ubs.sh" "check-api-keys.sh")
FAILED_HOOKS=()

echo "🔍 OpenCode: Checking required services..."
echo

# Check and configure PATH first (always run)
if [[ ":$PATH:" != *":$HOME/.config/opencode/bin:"* ]]; then
  echo ""
  echo "⚠️  ~/.config/opencode/bin is not in your PATH"
  echo "   Adding to shell config..."
  
  # Detect shell and config file
  if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
  elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
  else
    SHELL_CONFIG="$HOME/.profile"
  fi
  
  # Check if already in config file
  if ! grep -q "opencode/bin" "$SHELL_CONFIG" 2>/dev/null; then
    echo "" >> "$SHELL_CONFIG"
    echo "# OpenCode bin folder" >> "$SHELL_CONFIG"
    echo "export PATH=\"\$HOME/.config/opencode/bin:\$PATH\"" >> "$SHELL_CONFIG"
    echo "✓ Added to $SHELL_CONFIG"
  else
    echo "✓ Already in $SHELL_CONFIG"
  fi
  
  # Apply to current session
  export PATH="$HOME/.config/opencode/bin:$PATH"
  echo "✓ Applied to current session"
  echo ""
fi

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
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#FAILED_HOOKS[@]} -eq 0 ]; then
  echo "✅ All required services are available"
  
  # Check if PATH is configured and add if missing
  if [[ ":$PATH:" != *":$HOME/.config/opencode/bin:"* ]]; then
    echo ""
    echo "⚠️  ~/.config/opencode/bin is not in your PATH"
    echo "   Adding to shell config..."
    
    # Detect shell and config file
    if [ -n "$ZSH_VERSION" ]; then
      SHELL_CONFIG="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
      SHELL_CONFIG="$HOME/.bashrc"
    else
      SHELL_CONFIG="$HOME/.profile"
    fi
    
    # Check if already in config file
    if ! grep -q "opencode/bin" "$SHELL_CONFIG" 2>/dev/null; then
      echo "" >> "$SHELL_CONFIG"
      echo "# OpenCode bin folder" >> "$SHELL_CONFIG"
      echo "export PATH=\"\$HOME/.config/opencode/bin:\$PATH\"" >> "$SHELL_CONFIG"
      echo "✓ Added to $SHELL_CONFIG"
    else
      echo "✓ Already in $SHELL_CONFIG"
    fi
    
    # Apply to current session
    export PATH="$HOME/.config/opencode/bin:$PATH"
    echo "✓ Applied to current session"
  fi
  
  exit 0
else
  echo "❌ Some required services are missing:"
  printf '   - %s\n' "${FAILED_HOOKS[@]}"
  echo
  
  if [ "$INTERACTIVE" = true ]; then
    echo "Would you like to run interactive setup to install missing services?"
    read -p "Run opencode-init? [y/N]: " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
      echo
      echo "Starting interactive setup..."
      ~/.config/opencode/bin/opencode-init
      exit_code=$?
      if [ $exit_code -eq 0 ]; then
        echo
        echo "✅ Setup complete! Please run 'session-start.sh' again to verify."
        exit 0
      else
        echo
        echo "❌ Setup failed or was cancelled."
        exit 1
      fi
    fi
  fi
  
  echo "To resolve:"
  echo "  1. Run interactive setup: ~/.config/opencode/bin/opencode-init"
  echo "  2. Or install missing services manually (see README.md)"
  echo "  3. Run session-start.sh again to verify"
  exit 1
fi
