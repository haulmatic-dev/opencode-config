# opencode-init

System-wide setup for opencode. Installs and configures all required tools.

## Synopsis

```bash
~/.config/opencode/bin/opencode-init [--quiet]
```

## Description

The `opencode-init` command installs and configures the opencode development environment on your system. It sets up all required tools including:

- **cass_memory (cm)** - Evidence-based learning system
- **Biome** - Modern linting and formatting (20+ languages)
- **Prettier** - Code formatter for MD, JSON, YAML, CSS, HTML
- **Beads CLI (bd)** - Task tracking
- **Beads Viewer (bv)** - Terminal UI for browsing tasks
- **TLDR** - 5-layer code analysis with semantic search
- **Ultimate Bug Scanner (UBS)** - Multi-language static analysis

## Options

| Option        | Description                                   |
| ------------- | --------------------------------------------- |
| `--quiet, -q` | Run in quiet mode without interactive prompts |
| `--help, -h`  | Show help message                             |

## Prerequisites

- **Go** - Required for Beads CLI (`go install` will install it if missing)
- **Node.js** - Required for Biome, Prettier, and Husky
- **Git** - Required for version control integration

## Installation Process

### Step 1: Check Prerequisites

The script checks for:

- Go installation
- Node.js installation
- Current PATH configuration

### Step 2: Install Tools

If tools are missing, `opencode-init` will install:

1. **Biome** - `npm install -g @biomejs/biome`
2. **Prettier** - `npm install -g prettier`
3. **Go** - `brew install go` (macOS) or `apt-get install golang-go` (Linux)
4. **cass_memory** - From GitHub installer
5. **Beads CLI** - `go install github.com/steveyegge/beads/cmd/bd@latest`
6. **Beads Viewer** - From GitHub installer
7. **TLDR** - `pip install llm-tldr`
8. **UBS** - From GitHub installer

### Step 3: Configure PATH

Adds `~/.config/opencode/bin` to your shell configuration (`~/.zshrc` or `~/.bashrc`).

### Step 4: Start Services

Ensures cass_memory daemon is running and indexed.

## Output

The script provides colored output:

- `[0;32m✓[0m` - Success
- `[1;33m○[0m` - Already installed/skipped
- `[0;31m✗[0m` - Error
- `[0;34m[0m` - Information headers

## Post-Installation

After running `opencode-init`:

1. **Source your shell** to apply PATH changes:

   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

2. **Verify installation**:

   ```bash
   ~/.config/opencode/hooks/session-start.sh
   ```

3. **Initialize a workspace**:
   ```bash
   cd /path/to/your/project
   ~/.config/opencode/bin/workspace-init
   ```

## Environment Variables

No environment variables are required. The script manages its own configuration.

## Exit Codes

| Code | Description                              |
| ---- | ---------------------------------------- |
| 0    | Success - all tools installed/configured |
| 1    | Error - installation failed              |

## Examples

### Interactive Installation

```bash
~/.config/opencode/bin/opencode-init
```

### Quiet Installation

```bash
~/.config/opencode/bin/opencode-init --quiet
```

### Verify Installation

```bash
~/.config/opencode/hooks/session-start.sh
```

## Troubleshooting

### Tool Not Found After Installation

```bash
# Source your shell configuration
source ~/.zshrc  # or ~/.bashrc

# Or start a new terminal
exec zsh
```

### cass_memory Not Healthy

```bash
# Check cass_memory health
cm doctor --json

# Fix common issues
cass doctor --fix

# Re-index if needed
cass index --full
```

### Beads CLI Not Working

```bash
# Verify Go installation
go version

# Reinstall Beads CLI
go install github.com/steveyegge/beads/cmd/bd@latest

# Verify PATH includes go/bin
echo $PATH | grep -o "$HOME/go/bin"
```

## Related Commands

- [workspace-init](workspace-init.md) - Initialize a project workspace
- [bd](../tools/beads.md) - Task tracking
- [cm](../tools/cass_memory.md) - Cross-agent learning
- [tldr](../tools/tldr.md) - Code analysis
- [ubs](../tools/ubs.md) - Static analysis
