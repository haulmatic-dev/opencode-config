# workspace-init

Initialize a project workspace with opencode. Sets up git, cass_memory, Beads, and quality infrastructure.

## Synopsis

```bash
~/.config/opencode/bin/workspace-init [--skip-system-check] [--force]
```

## Description

The `workspace-init` command initializes a project directory with the complete opencode development environment. It should be run **after** `opencode-init` to set up project-specific configurations.

## Prerequisites

**Required:** Run `opencode-init` first to install system-wide dependencies.

### Required Tools

- **cass_memory (cm)** - Must be installed by `opencode-init`
- **Beads CLI (bd)** - Must be installed by `opencode-init`

### Optional Tools

- **TLDR** - For code indexing and semantic search
- **Biome** - For linting configuration
- **Prettier** - For formatting configuration
- **Husky** - For git hooks (requires `package.json`)
- **npm** - For dependency installation (requires `package.json`)

## Options

| Option                | Description                                        |
| --------------------- | -------------------------------------------------- |
| `--skip-system-check` | Skip verification of system prerequisites          |
| `--force, -f`         | Run in force mode with default answers (for CI/CD) |
| `--help, -h`          | Show help message                                  |

## Initialization Steps

### Step 1: Git Repository

Initializes a git repository if one doesn't exist:

```bash
git init -q
```

### Step 2: cass_memory (REQUIRED)

Initializes project-level cass_memory:

```bash
cm init --repo
```

Creates:

- `.cass/playbook.yaml` - Project-specific rules
- `.cass/blocked.log` - Blocked patterns

### Step 3: Beads Tracking

Initializes task tracking:

```bash
bd init
```

Creates:

- `.beads/beads.db` - SQLite database
- `.beads/config.yaml` - Configuration
- `.beads/README.md` - Documentation

### Step 4: TLDR Code Indexing

Indexes the project for semantic search:

```bash
tldr warm .
```

Creates:

- `.tldr/` - TLDR index and cache

### Step 5: Biome Configuration

Copies Biome linting configuration:

```bash
cp ~/.config/opencode/biome.json .
```

### Step 6: Prettier Configuration

Copies Prettier formatting configuration:

```bash
cp ~/.config/opencode/.prettierrc .
```

### Step 7: opencode Configuration

Copies opencode configuration:

```bash
cp ~/.config/opencode/opencode.json .
```

### Step 8: Git Hooks (Pre-commit)

Installs pre-commit hook for UBS static analysis:

```bash
cp ~/.config/opencode/.githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Step 9: Husky & Lint-staged

Installs Husky git hooks framework (if `package.json` exists):

```bash
npx husky install
```

### Step 10: Git Merge Driver

Configures git merge driver for Beads:

```bash
git config merge.beads.driver "bd merge %A %O %A %B"
```

### Step 11: Beads Git Hooks

Installs Beads-specific git hooks:

```bash
bd hooks install
```

Installs hooks:

- `pre-commit` - Pre-commit validation
- `post-merge` - Post-merge validation
- `pre-push` - Pre-push validation
- `post-checkout` - Post-checkout validation
- `prepare-commit-msg` - Commit message validation

### Step 12: Node Dependencies

Installs npm dependencies (if `package.json` exists):

```bash
npm install
```

## Created Files

| File/Directory          | Description                |
| ----------------------- | -------------------------- |
| `.git/`                 | Git repository             |
| `.cass/`                | cass_memory project data   |
| `.cass/playbook.yaml`   | Project-specific rules     |
| `.cass/blocked.log`     | Blocked patterns           |
| `.beads/`               | Beads task tracking        |
| `.beads/beads.db`       | SQLite database            |
| `.beads/config.yaml`    | Configuration              |
| `.tldr/`                | TLDR index (if indexed)    |
| `biome.json`            | Biome configuration        |
| `.prettierrc`           | Prettier configuration     |
| `opencode.json`         | opencode configuration     |
| `.git/hooks/pre-commit` | Pre-commit hook            |
| `.husky/`               | Husky hooks (if installed) |

## Output

The script provides colored output:

| Color  | Symbol   | Meaning                |
| ------ | -------- | ---------------------- |
| Green  | `✓`      | Success                |
| Yellow | `○`      | Already exists/skipped |
| Yellow | `⚠`      | Warning/failure        |
| Red    | `✗`      | Error                  |
| Blue   | `Step N` | Section headers        |

## Exit Codes

| Code | Description                    |
| ---- | ------------------------------ |
| 0    | Success                        |
| 1    | Error or missing prerequisites |

## Examples

### Interactive Initialization

```bash
cd /path/to/your/project
~/.config/opencode/bin/workspace-init
```

### Non-Interactive (CI/CD)

```bash
cd /path/to/your/project
~/.config/opencode/bin/workspace-init --force
```

### Skip System Check

```bash
~/.config/opencode/bin/workspace-init --skip-system-check
```

### After Initialization

```bash
# Create a task
bd create "Implement feature X" --description "Description of work"

# Get context before working
cm context "Implement feature X" --json

# Check what to work on
bd ready

# Run linting
npm run lint

# Format code
npm run format
```

## Post-Initialization

### Verify Setup

```bash
# Check all services
~/.config/opencode/hooks/session-start.sh

# Check beads status
bd doctor

# Check cass_memory health
cm doctor --json
```

### Typical Workflow

```bash
# 1. Check what to work on
bd ready

# 2. Create and claim a task
bd create "Fix bug" --description "Description"
bd update <id> --status in_progress

# 3. Get context from cass_memory
cm context "Fix bug" --json

# 4. Make changes
# ... edit code ...

# 5. Run quality checks
npm run lint
npm run format

# 6. Complete task
bd close <id> --reason "Fixed the bug"

# 7. Sync to git
bd sync
git push
```

## Troubleshooting

### cass_memory Initialization Fails

```bash
# Ensure git repository exists
ls -la .git

# Reinitialize
cm init --repo
```

### Beads Initialization Fails

```bash
# Ensure git repository exists
ls -la .git

# Check Beads CLI
bd --version

# Reinitialize
bd init
```

### Pre-commit Hook Not Working

```bash
# Verify hook exists
cat .git/hooks/pre-commit

# Make executable
chmod +x .git/hooks/pre-commit

# Test hook
git commit --dry-run
```

### TLDR Indexing Fails

```bash
# Check TLDR installation
tldr --version

# Start daemon
tldr daemon start

# Re-index
tldr warm .
```

## Related Commands

- [opencode-init](opencode-init.md) - System-wide setup
- [bd](../tools/beads.md) - Task tracking
- [cm](../tools/cass_memory.md) - Cross-agent learning
- [bv](../tools/beads-viewer.md) - Task browser
- [tldr](../tools/tldr.md) - Code analysis
- [ubs](../tools/ubs.md) - Static analysis
