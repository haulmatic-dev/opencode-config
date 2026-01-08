#!/bin/bash
# API Keys Health Check
# Validates that required API keys are set in environment

set -e

echo "🔐 Checking API Keys..."

# Check cass_memory provider
if [ -n "$CASS_PROVIDER" ]; then
    echo -e "  ${GREEN}✓${NC} CASS_PROVIDER set: $CASS_PROVIDER"
else
    echo -e "  ${YELLOW}⚠️${NC}  CASS_PROVIDER not set (defaulting to anthropic)"
    export CASS_PROVIDER="anthropic"
fi

# Check API keys based on provider
MISSING_KEYS=()

case "$CASS_PROVIDER" in
    anthropic)
        if [ -z "$ANTHROPIC_API_KEY" ]; then
            MISSING_KEYS+=("ANTHROPIC_API_KEY")
        else
            echo -e "  ${GREEN}✓${NC} ANTHROPIC_API_KEY: set"
        fi
        ;;
    openai)
        if [ -z "$OPENAI_API_KEY" ]; then
            MISSING_KEYS+=("OPENAI_API_KEY")
        else
            echo -e "  ${GREEN}✓${NC} OPENAI_API_KEY: set"
        fi
        ;;
    google)
        if [ -z "$GOOGLE_API_KEY" ]; then
            MISSING_KEYS+=("GOOGLE_API_KEY")
        else
            echo -e "  ${GREEN}✓${NC} GOOGLE_API_KEY: set"
        fi
        ;;
    *)
        echo -e "  ${YELLOW}⚠️${NC}  Unknown provider: $CASS_PROVIDER"
        ;;
esac

# Check optional Figma API key
if [ -z "$FIGMA_API_TOKEN" ]; then
    echo -e "  ${BLUE}○${NC}  FIGMA_API_TOKEN: not set (optional - needed for Figma design extraction)"
else
    echo -e "  ${GREEN}✓${NC} FIGMA_API_TOKEN: set"
fi

# Check MCP Agent Mail .env
if [ ! -f "$HOME/.mcp-agent-mail/.env" ]; then
    echo -e "  ${YELLOW}⚠️${NC}  MCP Agent Mail .env not found"
    echo -e "      Run: cd ~/.mcp-agent-mail && cp .env.example .env"
else
    echo -e "  ${GREEN}✓${NC} MCP Agent Mail .env: exists"
fi

echo ""

# Report missing keys
if [ ${#MISSING_KEYS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing Required API Keys:${NC}"
    for key in "${MISSING_KEYS[@]}"; do
        echo -e "  • ${RED}✗${NC} $key"
    done
    echo ""
    echo -e "${YELLOW}⚠️${NC}  To fix this:"
    echo "  1. Edit ~/.zshrc to add your API keys"
    echo "  2. Run: source ~/.zshrc"
    echo "  3. Or restart your terminal"
    echo ""
    echo -e "${BLUE}Reference: ~/.config/opencode/.zshrc.example${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required API keys are set!${NC}"

# Provide helpful information
echo ""
echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Provider: $CASS_PROVIDER"
echo "  Keys: Set in ~/.zshrc"
echo ""

exit 0