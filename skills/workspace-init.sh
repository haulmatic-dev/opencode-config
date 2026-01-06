#!/bin/bash
# workspace-init-skill - Makes workspace-init available to droids

# Check if workspace-init is executable
if [ -x "$HOME/.config/opencode/bin/workspace-init" ]; then
  exec "$HOME/.config/opencode/bin/workspace-init" "$@"
else
  echo "Error: workspace-init not found at $HOME/.config/opencode/bin/workspace-init"
  echo "Please ensure workspace-init is installed."
  exit 1
fi
