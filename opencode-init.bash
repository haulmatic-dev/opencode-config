#!/bin/bash
# opencode-init - System-wide setup for opencode
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect shell and config file
if [ -n "$ZSH_VERSION" ]; then
  SHELL_CONFIG="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
  SHELL_CONFIG="$HOME/.bashrc"
else
  SHELL_CONFIG="$HOME/.profile"
fi

# Banner
echo -e "${BLUE}══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   OpenCode - System Setup (opencode-init)   ║${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}📋 Instructions:${NC}"
echo -e "  Run this script to install and configure opencode tools"
echo -e "  After completion, source your shell config or restart terminal"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════╝${NC}"
