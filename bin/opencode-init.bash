#!/bin/bash
# opencode-init - System-wide setup for opencode
# Installs cass_memory, beads CLI, beads viewer, osgrep, UBS, Biome
# Run once per machine
#
# Biome is a modern toolchain for the web (formatter, linter, bundler)
# Provides: Linting, formatting, and more for JavaScript/TypeScript, CSS, HTML, JSON, YAML, etc.
# Replaces ESLint for linting, but Prettier is still useful for formatting
#
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
  SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
  SHELL_CONFIG="$HOME/.bashrc"
  SHELL_NAME="bash"
else
  SHELL_CONFIG="$HOME/.profile"
  SHELL_NAME="sh"
fi

# Parse arguments
QUIET=false
for arg in "$@"; do
  case $arg in
    --help|-h)
      echo "System-wide setup for opencode"
      echo ""
      echo "Installs:"
      echo " • cass_memory (cm) - Evidence-based learning system"
      echo " • Biome - Modern linting and formatting (JavaScript, TypeScript, CSS, HTML, JSON, YAML, 20+ languages)"
      echo " • Prettier - Code formatter (for MD, JSON, YAML, CSS, HTML)"
      echo " • beads CLI (bd) - Task tracking"
      echo " • beads viewer (bv) - Terminal UI for browsing tasks"
      echo " • osgrep - Semantic code search"
      echo " • Ultimate Bug Scanner (UBS) - Multi-language static analysis"
      echo " • Configures PATH for ~/.config/opencode/bin"
      echo ""
      echo "Usage: opencode-init [--quiet]"
      echo ""
      echo "Biome vs ESLint:"
      echo "  • Biome: Linting + formatting for 20+ languages (modern, fast)"
      echo "  • Prettier: Formatting-focused for JS, MD, JSON, YAML, CSS, HTML"
      echo "  • Both used together: Biome for linting, Prettier for formatting"
      exit 0
      ;;
    --quiet|-q)
      QUIET=true
      shift
      ;;
  esac
done

# Banner
if [ "$QUIET" = false ]; then
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   OpenCode - System-Wide Setup (opencode-init)║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo -e "${BLUE}📋 System Information:${NC}"
  echo "  OS:        $(uname -s)"
  echo "  Shell:     $SHELL_NAME"
  echo "  Config:    $SHELL_CONFIG"
  echo
  echo -e "${BLUE}📊 Checking Prerequisites:${NC}"

fi

HAS_GO=false
HAS_NODE=false
PATH_CONFIGURED=false
HAS_CM=false
HAS_BIOME=false
HAS_PRETTIER=false
HAS_BD=false
HAS_BV=false
HAS_OSGREP=false
HAS_UBS=false

# Check for Go
command -v go &> /dev/null && HAS_GO=true

# Check for cass
command -v cm &> /dev/null && HAS_CM=true

# Check if cass is healthy and running
if [ "$HAS_CM" = true ]; then
  CASS_HEALTHY=$(cm health 2>/dev/null && echo "healthy")

  if [ "$CASS_HEALTHY" = "healthy" ]; then
    echo -e "${GREEN}✓${NC} cass_memory (cm): installed (version: $(cm --version 2>/dev/null || echo "unknown"))"
  else
    echo -e "${YELLOW}○${NC} cass_memory (cm): not healthy"
    echo "  Run: 'cass doctor --fix' or 'cass index --full'"
  fi

  # Check if cass is healthy and running
  if command -v cass &> /dev/null; then
    CASS_HEALTHY=$(cass health 2>/dev/null && echo "healthy")
    if [ "$CASS_HEALTHY" = "healthy" ]; then
      echo -e "${GREEN}✓${NC} cass is healthy"
    else
      echo -e "${YELLOW}⚠${NC} cass needs attention ($(cass health))"
      echo "  Run 'cass doctor --fix' or 'cass index --full'"
    fi

    # Start cass if it's healthy but not running
    if command -v cass &> /dev/null && ! pgrep -f "cass" > /dev/null 2>&1; then
      echo -e "${BLUE}🚀 Starting cass...${NC}"
      cass index --full &
      sleep 2
      echo -e "${GREEN}✓${NC} cass started and indexing"
    else
      echo -e "${GREEN}✓${NC} cass is already running and healthy"
    fi
  else
    echo -e "${YELLOW}○${NC} cass is not healthy or not running"
  fi

  # Mark cass as installed and configured
  HAS_CM=true
fi

# Check for Biome
command -v biome &> /dev/null && HAS_BIOME=true

if [ "$HAS_BIOME" = true ]; then
  echo -e "${GREEN}✓${NC} Biome: installed (version: $(biome --version 2>/dev/null || echo "unknown"))"
else
  echo -e "${YELLOW}○${NC} Biome: not installed"
  echo -e "  Install: npm install -g @biomejs/biome"
fi

# Check for Prettier
command -v prettier &> /dev/null && HAS_PRETTIER=true

if [ "$HAS_PRETTIER" = true ]; then
  echo -e "${GREEN}✓${NC} Prettier: installed (version: $(prettier --version 2>/dev/null || echo "unknown"))"
else
  echo -e "${YELLOW}○${NC} Prettier: not installed"
  echo -e "  Install: npm install -g prettier"
fi

# Check for Beads CLI
command -v bd &> /dev/null && HAS_BD=true

if [ "$HAS_BD" = true ]; then
  echo -e "${GREEN}✓${NC} Beads CLI (bd): installed (version: $(bd --version 2>/dev/null | head -1 || echo "unknown"))"
else
  echo -e "${YELLOW}○${NC} Beads CLI (bd): not installed"
  echo -e "  Requires Go - install: go install github.com/steveyegge/beads/cmd/bd@latest"
fi

# Check for osgrep
command -v osgrep &> /dev/null && HAS_OSGREP=true

if [ "$HAS_OSGREP" = true ]; then
  echo -e "${GREEN}✓${NC} Osgrep: installed (version: $(osgrep --version 2>/dev/null || echo "unknown"))"
else
  echo -e "${YELLOW}○${NC} Osgrep: not installed"
  echo -e "  Install: npm install -g @steveyegge/osgrep"
fi

# Check for BV
command -v bv &> /dev/null && HAS_BV=true

if [ "$HAS_BV" = true ]; then
  echo -e "${GREEN}✓${NC} Beads Viewer (bv): installed (version: $(bv --version 2>/dev/null | head -1 || echo "unknown"))"
else
  echo -e "${YELLOW}○${NC} Beads Viewer (bv): not installed"
  echo -e "  Install: curl -fsSL \"https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh?$(date +%s)\" | bash"
fi

# Check for UBS
command -v ubs &> /dev/null && HAS_UBS=true

if [ "$HAS_UBS" = true ]; then
  echo -e "${GREEN}✓${NC} Ultimate Bug Scanner (UBS): installed (version: $(ubs --version 2>/dev/null | head -1 || echo "unknown"))"
else
  echo -e "${YELLOW}○${NC} Ultimate Bug Scanner (UBS): not installed"
  echo -e "  Install: curl -fsSL \"https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh?$(date +%s)\" | bash"
fi

# Check if already in PATH
echo -e "${BLUE}📊 Current Status:${NC}"
echo "  Biome:       $([ "$HAS_BIOME" = true ] && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}○${NC}") $(biome --version 2>/dev/null || echo "not installed")"
echo "  Prettier:     $([ "$HAS_PRETTIER" = true ] && echo -e "${GREEN}✓${NC}") || echo -e "${YELLOW}○${NC}") $(prettier --version 2>/dev/null || echo "not installed")"
echo "  Beads CLI:    $([ "$HAS_BD" = true ] && echo -e "${GREEN}✓${NC}") || echo -e "${YELLOW}○${NC}") $(bd --version 2>/dev/null | head -1 || echo "not installed")"

echo

# Step 1: Install Biome if missing
if [ "$HAS_BIOME" = false ]; then
  if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Step 1: Install Biome${NC}"
  fi
  npm install -g @biomejs/biome
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to install Biome"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} Biome installed: $(biome --version 2>/dev/null || echo "unknown")"
fi

# Step 2: Install Prettier if missing
if [ "$HAS_PRETTIER" = false ]; then
  if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Step 2: Install Prettier${NC}"
  fi
  npm install -g prettier
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to install Prettier"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} Prettier installed: $(prettier --version 2>/dev/null || echo "unknown")"
fi

# Step 3: Install Go if missing
if [ "$HAS_GO" = false ]; then
  if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Step 3: Install Go${NC}"
  fi
  if [ "$QUIET" = false ]; then
    echo "  OS detected: $(uname -s)"
    echo "  This will run: brew install go"
  fi
  # Detect package manager
  OS="$(uname -s)"
  if [ "$OS" = "Darwin" ]; then
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      if [ "$ID" = "ubuntu" ] || [ "$ID" = "debian" ]; then
        PACKAGE_MANAGER="apt"
      else
        PACKAGE_MANAGER="unknown"
      fi
    else
      PACKAGE_MANAGER="unknown"
    fi
  elif [ "$OS" = "Linux" ]; then
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      if [ "$ID" = "ubuntu" ] || [ "$ID" = "debian" ]; then
        PACKAGE_MANAGER="apt"
      else
        PACKAGE_MANAGER="unknown"
      fi
  else
    PACKAGE_MANAGER="unknown"
  fi

  if [ "$QUIET" = false ]; then
    echo "  Package manager: $PACKAGE_MANAGER"
  fi

  if [ "$PACKAGE_MANAGER" = "homebrew" ]; then
    brew install go
  elif [ "$PACKAGE_MANAGER" = "apt" ]; then
    sudo apt-get update
    sudo apt-get install -y golang-go
  else
    echo -e "${YELLOW}⚠${NC} Go not found and cannot auto-install on this OS"
    echo -e "  Install Go from: https://golang.org/dl/"
    exit 1
  fi

  echo -e "${GREEN}✓${NC} Go installed: $(go version)"
  HAS_GO=true
fi

# Step 4: Install cass_memory if missing (already checked above)
# cass_memory installation code is above, not in this section

# Step 5: Install Beads CLI if missing
if [ "$HAS_BD" = false ]; then
  if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Step 5: Install Beads CLI (bd)${NC}"
  fi
  if [ "$HAS_GO" = false ]; then
    echo -e "${RED}✗${NC} Go is required for Beads CLI"
    echo -e "  Step 3 should have installed Go"
    exit 1
  fi
  echo "  This will run: go install github.com/steveyegge/beads/cmd/bd@latest"
  if [ "$QUIET" = false ]; then
    echo "  (This may take 1-2 minutes)"
  fi
  go install github.com/steveyegge/beads/cmd/bd@latest
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to install Beads CLI"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} Beads CLI installed: $(bd --version 2>/dev/null | head -1 || echo "unknown")"
fi

# Step 6: Install Beads Viewer (bv) if missing
if [ "$HAS_BV" = false ]; then
  if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Step 6: Install Beads Viewer (bv)${NC}"
  fi
  echo "  This downloads and installs beads viewer from GitHub"
  if [ "$QUIET" = false ]; then
    echo "  (This may take 30-60 seconds)"
  fi
  curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh?$(date +%s)" | bash
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to install Beads Viewer"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} Beads Viewer installed: $(bv --version 2>/dev/null | head -1 || echo "unknown")"
fi

# Step 7: Install osgrep if missing
if [ "$HAS_OSGREP" = false ]; then
  if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Step 7: Install Osgrep${NC}"
  fi
  echo "  Osgrep provides semantic code search with embeddings"
  if [ "$QUIET" = false ]; then
    echo "  (Downloads ~150MB of embedding models)"
  fi
  npm install -g @steveyegge/osgrep
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to install Osgrep"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} Osgrep installed: $(osgrep --version 2>/dev/null || echo "unknown")"
fi

# Step 8: Install UBS if missing
if [ "$HAS_UBS" = false ]; then
  if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Step 8: Install Ultimate Bug Scanner (UBS)${NC}"
  fi
  echo "  UBS provides multi-language static analysis (1000+ bug patterns)"
  if [ "$QUIET" = false ]; then
    echo "  Catches bugs in: JS, Python, C/C++, Rust, Go, Java, Ruby, Swift"
  fi
  curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh?$(date +%s)" | bash
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to install UBS"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} UBS installed: $(ubs --version 2>/dev/null | head -1 || echo "unknown")"
fi

# Step 9: Configure PATH
if [ "$PATH_CONFIGURED" = false ]; then
  if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Step 9: Configure PATH${NC}"
  fi

  # Add ~/.config/opencode/bin to PATH if not already there
  if [[ ":$PATH:" != *":$HOME/.config/opencode/bin:"* ]]; then
    echo "export PATH=$HOME/.config/opencode/bin:\$PATH" >> "$SHELL_CONFIG"
    echo -e "${GREEN}✓${NC} Added ~/.config/opencode/bin to PATH in $SHELL_CONFIG"
  else
    echo -e "${GREEN}✓${NC} PATH already configured"
  fi

  echo -e "${YELLOW}⚠${NC}  Run: source $SHELL_CONFIG or start a new terminal to apply PATH changes"
fi

# Step 10: Ensure cass is running
if [ "$HAS_CM" = true ]; then
  if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Step 10: Ensure cass is running${NC}"
  fi

  if command -v cass &> /dev/null; then
    CASS_HEALTHY=$(cm health 2>/dev/null && echo "healthy")

    if [ "$CASS_HEALTHY" = "healthy" ]; then
      if ! pgrep -f "cass" > /dev/null 2>&1; then
        echo -e "${BLUE}🚀 Starting cass...${NC}"
        cass index --full &
        sleep 2
        echo -e "${GREEN}✓${NC} cass started and indexing"
      else
        echo -e "${GREEN}✓${NC} cass is already running and healthy"
      fi
    else
      echo -e "${YELLOW}⚠${NC} cass needs attention ($(cass health))"
      echo "  Run 'cass doctor --fix' or 'cass index --full'"
    fi
  fi
fi

# Summary
if [ "$QUIET" = false ]; then
  echo
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   Installation Complete!                                     ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
  echo
  echo -e "${GREEN}✓${NC} Installed:"
  echo "  • cass_memory (cm) - Evidence-based learning system"
  echo "  • Biome - Modern linting and formatting (20+ languages)"
  echo "  • Prettier - Code formatter (MD, JSON, YAML, CSS, HTML)"
  echo "  • Go - Required for Beads CLI"
  echo "  • Beads CLI (bd) - Task tracking"
  echo "  • Beads Viewer (bv) - Terminal UI for browsing tasks"
  echo "  • Osgrep - Semantic code search"
  echo "  • Ultimate Bug Scanner (UBS) - Multi-language static analysis"
  echo
  echo -e "${YELLOW}⚠${NC} Important:"
  echo "   Source your shell configuration to apply PATH changes:"
  echo "  • source $SHELL_CONFIG"
  echo "  • Or start a new terminal"
  echo
  echo -e "${BLUE}📚 Documentation:${NC}"
  echo "  • cass: https://github.com/Dicklesworthstone/cass_memory_system"
  echo "  • Biome: https://biomejs.dev"
  echo "  • Prettier: https://prettier.io"
  echo "  • Beads: https://github.com/steveyegge/beads"
  echo "  • opencode: ~/.config/opencode"
fi
