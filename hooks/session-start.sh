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

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_HOOKS=("check-cass-memory.sh" "check-mcp-agent-mail.sh" "check-beads.sh" "check-bv.sh" "check-gptcache.sh" "check-ubs.sh" "check-api-keys.sh")
FAILED_HOOKS=()

echo "🔍 OpenCode: Checking required services..."
echo

# Check and configure PATH first (always run)
CONFIG_BIN="$HOME/.config/opencode/bin"

echo "🔍 [session-start] PATH check starting..."

# Ensure PATH persists in shell config (works with zprezto, symlinks, etc.)
if ! echo "$PATH" | grep -q "$CONFIG_BIN"; then
    echo "⚠️  [session-start] $CONFIG_BIN not in PATH"
    echo "   Checking PATH variable: $PATH"
    echo ""
    echo "⚠️  $CONFIG_BIN is not in your PATH"
    echo "   Adding to shell config..."

  # Detect shell and config file
  DEFAULT_SHELL=$(basename "$SHELL")
  echo "📋 Detected shell: $DEFAULT_SHELL"

  if [ -n "$ZSH_VERSION" ] || [ "$DEFAULT_SHELL" = "zsh" ] || [ -f "$HOME/.zshrc" ]; then
        SHELL_CONFIG="$HOME/.zshrc"
    echo "📋 Selected config file: $SHELL_CONFIG"
  elif [ -n "$BASH_VERSION" ] || [ "$DEFAULT_SHELL" = "bash" ] || [ -f "$HOME/.bashrc" ]; then
        SHELL_CONFIG="$HOME/.bashrc"
    elif [ -n "$BASH_VERSION" ] || [ "$DEFAULT_SHELL" = "bash" ] || [ -f "$HOME/.profile" ]; then
        SHELL_CONFIG="$HOME/.profile"
  else
        SHELL_CONFIG="$HOME/.profile"
  fi

  # Check if already in config file
  echo "🔍 [session-start] Checking if PATH in config file..."
  if ! grep -q "/.config/opencode/bin" "$SHELL_CONFIG" 2>/dev/null; then
        echo "📝 PATH not found in $SHELL_CONFIG"
        echo "   Will add PATH export to end of file..."
        # Add to end of config file using echo + append
        echo "" >> "$SHELL_CONFIG"
        echo "# OpenCode config bin folder" >> "$SHELL_CONFIG"
        echo "export PATH=\"\$HOME/.config/opencode/bin:\$PATH\"" >> "$SHELL_CONFIG"
        echo "✓ PATH export added to $SHELL_CONFIG"
        echo "✓ Added to $SHELL_CONFIG"
  else
        echo "✓ PATH already in $SHELL_CONFIG"
        echo "   No changes needed"
        echo "   Current PATH export at last line:"
        echo "   $(grep "/.config/opencode/bin" "$SHELL_CONFIG" | head -1)"
    fi

  # Apply to current session
  echo "📤 [session-start] Exporting to current session..."
  export PATH="$CONFIG_BIN:$PATH"
  echo "✓ Applied to current session"
  echo "   Current PATH: $PATH"
  echo ""
  echo "✅ [session-start] PATH check complete"
else
    echo "✓ PATH already configured in shell"
fi

# Apply to current session
export PATH="$CONFIG_BIN:$PATH"
echo "✓ Applied to current session"
echo ""

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
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#FAILED_HOOKS[@]} -eq 0 ]; then
  echo "✅ All required services are available"

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
