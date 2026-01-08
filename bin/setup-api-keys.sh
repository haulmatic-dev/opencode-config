#!/bin/bash
# Setup OpenCode API keys in .zshrc from .zshrc.example

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   OpenCode API Keys Setup                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .zshrc.example exists
if [ ! -f "$HOME/.config/opencode/.zshrc.example" ]; then
    echo -e "${RED}✗${NC} .zshrc.example not found at ~/.config/opencode/.zshrc.example"
    exit 1
fi

# Check if opencode section exists in .zshrc
if grep -q "# OpenCode API Keys & Configuration" ~/.zshrc; then
    echo -e "${YELLOW}⚠️${NC} OpenCode API section already exists in ~/.zshrc"
    echo ""
    echo -n "Do you want to overwrite it? [y/N]: "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Skipping setup"
        exit 0
    fi

    # Remove existing section
    echo "Removing existing OpenCode API section from ~/.zshrc..."
    sed -i.bak '/# ═════════════════════════════════════════════════════════════════/,/# ═════════════════════════════════════════════════════════════════/d' ~/.zshrc
fi

# Copy opencode section from .zshrc.example
echo -e "${BLUE}Adding OpenCode API section to ~/.zshrc...${NC}"
cat ~/.config/opencode/.zshrc.example >> ~/.zshrc

echo ""
echo -e "${GREEN}✓${NC} OpenCode API section added to ~/.zshrc"

# Backup notice
if [ -f ~/.zshrc.bak ]; then
    echo -e "${YELLOW}⚠️${NC}  Backup created: ~/.zshrc.bak"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Edit ~/.zshrc to add your actual API keys:"
echo "     ${YELLOW}nano ~/.zshrc${NC} or ${YELLOW}vim ~/.zshrc${NC}"
echo ""
echo "  2. Replace placeholder values:"
echo "     ${YELLOW}sk-ant-...${NC} → your Anthropic API key"
echo "     ${YELLOW}sk-...${NC}       → your OpenAI API key (optional)"
echo ""
echo "  3. Apply changes to your current shell:"
echo "     ${YELLOW}source ~/.zshrc${NC}"
echo ""
echo "  4. Or restart your terminal"
echo ""
echo -e "${BLUE}Security Reminder:${NC}"
echo "  • Never commit ~/.zshrc to git"
echo "  • Rotate keys if compromised: https://console.anthropic.com"
echo "  • Use different keys for different environments"
echo ""
echo -e "${GREEN}✓${NC} Setup complete!"
