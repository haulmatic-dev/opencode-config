# opencode - AI Development Environment

## Overview

opencode brings together best-in-class AI development tools into a unified, hook-based environment. It replaces Factory CLI with a modern, service-agnostic architecture where tools are installed independently and checked on-demand.

### Key Features

- **cass_memory** (cm) - Evidence-based learning system for cross-agent intelligence
- **MCP Agent Mail** - Tool-agnostic agent coordination and file reservations
- **Beads CLI** (bd) - Dependency-aware task tracking with git persistence
- **Beads Viewer** (bv) - Graph-aware task triage with AI agent integration
- **Ultimate Bug Scanner (UBS)** - Multi-language static analysis catching 1000+ bug patterns
- **Autonomous Agent Relay Architecture** - Code-driven quality-governed workflow execution

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation & Setup](#installation--setup)
  - [System Setup](#system-setup)
  - [Project Initialization](#project-initialization)
  - [Configuration](#configuration)
- [How to Use](#how-to-use)
  - [Typical Session Flow](#typical-session-flow)
  - [Working with Beads Tasks](#working-with-beads-tasks)
  - [Beads Viewer Commands](#beads-viewer-commands)
- [Core Architecture Concepts](#core-architecture-concepts)
  - [Autonomous Agent Relay Architecture](#autonomous-agent-relay-architecture)
  - [Task-to-Commit Workflow](#task-to-commit-workflow)
  - [Headless Swarm Architecture](#headless-swarm-architecture)
- [Tools and Components](#tools-and-components)
  - [cass_memory (cm)](#cass_memory-cm)
  - [MCP Agent Mail](#mcp-agent-mail)
  - [Beads CLI (bd)](#beads-cli-bd)
  - [Beads Viewer (bv)](#beads-viewer-bv)
  - [Ultimate Bug Scanner (UBS)](#ultimate-bug-scanner-ubs)
  - [Plugin System](#plugin-system)
- [Hook System](#hook-system)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Further Reading](#further-reading)

---

## Quick Start

### One-Command Setup

```bash
# 1. Install cass_memory (one-time)
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/cass_memory_system/main/install.sh | bash -s -- --easy-mode --verify

# 2. Initialize in current project
cd /path/to/your/project
cm init --repo

# 3. Get context before working (THE MAIN COMMAND)
cm context "your task description" --json

# Returns:
#   - relevantBullets: Evidence-backed rules
#   - antiPatterns: Pitfalls to avoid
#   - historySnippets: Similar past sessions (requires cass CLI)
#   - suggestedCassQueries: Deeper investigation searches
```

### Check Service Status

```bash
# Run opencode hooks to verify all services
~/.config/opencode/hooks/session-start.sh

# Or check individual services
~/.config/opencode/hooks/check-cass-memory.sh
~/.config/opencode/hooks/check-mcp-agent-mail.sh
~/.config/opencode/hooks/check-beads.sh
~/.config/opencode/hooks/check-bv.sh
```

---

## Installation & Setup

### System Setup

#### opencode-init (Interactive)

For system setup, use the **opencode-init** script:

```bash
cd ~/.config/opencode/bin
./opencode-init

# This will guide you through:
# - Selective tool installation (choose what you need)
# - Progress bars and status updates
# - Automatic PATH configuration
# - Verification of installed tools
#
# Tools available:
# - cass_memory (cm) - Evidence-based learning system
# - Biome - Modern linting and formatting (20+ languages)
# - Prettier - Code formatter (MD, JSON, YAML, CSS, HTML)
# - Beads CLI (bd) - Task tracking
# - Beads Viewer (bv) - Terminal UI for browsing tasks
# - Osgrep - Semantic code search (optional)
# - Ultimate Bug Scanner (UBS) - Multi-language static analysis (optional)
```

#### opencode-init.bash (Automated)

For automated or CI/CD setup:

```bash
cd ~/.config/opencode/bin
./opencode-init.bash

# This will install:
# - cass_memory (cm)
# - MCP Agent Mail (REQUIRED)
# - Beads CLI (bd)
# - Beads Viewer (bv)
# - osgrep (semantic search)
# - Configure PATH for ~/.config/opencode/bin
```

### Project Initialization

#### workspace-init

```bash
# Initialize project with opencode
cd /path/to/your/project
~/.config/opencode/bin/workspace-init

# This will:
# - Initialize git repo (if missing)
# - Initialize cass_memory (cm init --repo) - REQUIRED
# - Initialize beads (bd init)
```

### Configuration

#### cass_memory Configuration

```bash
# View config
cat ~/.cass-memory/config.json

# Set LLM provider (Anthropic, OpenAI, Google, etc.)
cm config set provider anthropic
```

**API Key Setup:**

```bash
# Run setup script
~/.config/opencode/bin/setup-api-keys.sh
```

This adds OpenCode API section to your `~/.zshrc` with template for API keys.

**Supported Providers:**

- `anthropic` - Claude models (default)
- `openai` - GPT models
- `google` - Gemini models

#### Beads Configuration

```bash
# Initialize in project directory
cd /path/to/project
bd init

# Configure merge driver (optional)
git config merge.beads.driver "bd merge %A %O %A %B"

# Install git hooks
bd hooks install
```

#### MCP Agent Mail Configuration

```bash
# Environment variables
export MCP_SERVER_HOST=127.0.0.1
export MCP_SERVER_PORT=8765
export MCP_AGENT_MAIL_DIR=~/.mcp-agent-mail
```

---

## How to Use

### Typical Session Flow

```bash
# 1. Start new session (cd to project)
cd /path/to/your/project

# 2. Run hook to verify services
~/.config/opencode/hooks/session-start.sh

# 3. Get context from cass_memory
cm context "your task description" --json

# 4. Check what to work on
bd ready

# 5. Create task
bd create "task" --description "details"
bd update <id> --status in_progress

# 6. Complete task
bd close <id> --reason "Done"

# 7. Sync to git
bd sync
git push
```

### Working with Beads Tasks

```bash
# See what to work on
bd ready

# Create a new task
bd create "task title" --description "what needs to be done"

# Track progress
bd update <id> --status in_progress
bd close <id> --reason "Completed"

# View task details
bd show <id>
```

### Beads Viewer Commands

```bash
# THE ENTRY POINT - Use this before any task
bv --robot-triage

# Returns everything you need:
# - quick_ref: counts + top 3 picks
# - recommendations: ranked actionable items with scores
# - quick_wins: low-effort high-impact items
# - blockers_to_clear: items unblocking most downstream work
# - project_health: status/type/priority distributions
# - commands: copy-paste shell commands

# What to work on next
bv --robot-next

# Full project analysis
bv --robot-insights

# Parallel execution tracks
bv --robot-plan
```

---

## Core Architecture Concepts

### Autonomous Agent Relay Architecture

The **Relay Runner** pattern replaces traditional central coordination with a distributed, quality-first system where agents automatically hand off work through strict quality gates.

#### Core Components

**Harness** (`lib/runner/index.js`)

- Context setup and initialization
- Agent invocation with proper parameters
- Gatekeeping before agent execution
- Handoff coordination between agents

**Gatekeeper** (`lib/runner/gates.js`)

- TDD enforcement (red-green cycle validation)
- Mutation testing verification (80% score threshold with Stryker)
- Lint verification with strict enforcement
- Pre/post-execution quality checks

**Relay** (`lib/runner/handoff.js`)

- State machine driven agent spawning
- Automatic retry budgets for failed attempts
- Intelligent handoff decisions based on task requirements
- Context preservation across agent handoffs

**Guardrails** (`lib/runner/guardrails.js`)

- Command interception for dangerous operations
- Task branch isolation (all work on `beads/task-{id}` branches)
- Irreversible action blocking
- Safe rollback capabilities

**Smart Context** (`lib/runner/smart-context.js`)

- Stack trace slicing for focused error information
- Error formatting and normalization
- Context distillation for efficient LLM processing
- Relevant code extraction (20 lines + error for fix specialists)

**Progress Logger** (`lib/runner/progress.js`)

- Learning tracking across agent handoffs
- Context preservation for future sessions
- Success/failure pattern analysis

#### Workflows

**Feature Development** (`lib/workflows/feature-dev.js`)

- planning → coding → testing → complete
- Automatic quality gate transitions
- Rollback on failure

**Migration** (`lib/workflows/migration.js`)

- 5-phase lifecycle with irreversible guards
- Validation at each phase
- Safe rollback options

#### Specialized Agents

**adversarial-reviewer**

- Security auditor with smart context integration
- Automated vulnerability detection
- Security best practices validation

**fix-specialist**

- Context-slice only operation (20 lines + error)
- Focused error resolution
- Minimal context for efficiency

**conflict-resolver**

- 3-way diff analysis for git rebase conflicts
- Automatic merge resolution suggestions
- Safe conflict handling

#### Git Automation

**Reactive Rebase**

- Automatically rebases task branches when main changes
- Conflict detection and resolution
- Maintains clean history

**Squash-on-Green**

- Atomic commits with hidden fix loops
- Clean commit history
- All tests passing before commit

**Task Branch Isolation**

- All work happens on `beads/task-{id}` branches
- Prevents conflicts between parallel tasks
- Easy rollback and branch management

#### Quality Gates

**TDD Enforcer** (`lib/runner/gates/tdd-enforcer.js`)

- Validates red-green cycle
- Ensures test-first development
- Blocks non-compliant code

**Mutation Testing** (Stryker)

- 80% score threshold requirement
- Automatic mutation testing
- Validates test quality

**Static Analysis** (UBS + Biome)

- Pre-agent execution: scans changed files
- Post-agent execution: regression detection
- 0 critical bugs requirement

#### CLI Entry Point

```bash
bin/runner --task <ID> --agent <TYPE> --workflow <TYPE>
```

#### Documentation

- `docs/runner-architecture.md` - Architecture overview and design patterns
- `docs/runner-usage.md` - User guide and troubleshooting
- `docs/agent-development.md` - Agent creation best practices

#### Test Coverage

- 39 tests passing (unit, E2E, integration)
- 100% test pass rate achieved

For detailed implementation, see [docs/autonomous-agent-task-implementation-plan.md](./docs/autonomous-agent-task-implementation-plan.md).

### Task-to-Commit Workflow

opencode implements a **6-stage atomic task cycle** managed by **Beads dependency graphs**. Individual agents execute tasks, run quality gates, and handle success/failure. The Beads system automatically manages task dependencies.

**Key Concept:**

- **Agents** are stateless workers that execute one task, then exit
- **Success** = Close task → Beads automatically unlocks next dependent task
- **Failure** = Create dependent fix task → Close task → Beads blocks downstream tasks
- **Beads** handles ALL dependency logic - no orchestration needed in agents

**Workflow Stages:**

1. **Stage 0**: Discovery & Planning (PRD validation, risk assessment)
2. **Stage 1**: Write Unit Tests (Test coverage ≥ 80%)
3. **Stage 2**: Implement Code (Typecheck, build)
4. **Stage 3**: Test Code (100% tests pass)
5. **Stage 4**: Static Analysis & Security (UBS quality gate, 0 critical bugs)
6. **Stage 5**: Code Review (PR validation, comment classification)
7. **Stage 6**: Deployment (Smoke tests, health checks, monitoring)

**Specialist Agents:**

- **test-specialist** - Test generation and execution (Stages 1, 3)
- **code-reviewer** - Automated code review (Stage 5)
- **deployment-specialist** - Deployment automation (Stage 6)

For detailed documentation, see [Task-to-Commit Cycle](./docs/task-to-commit.md).

### Headless Swarm Architecture

opencode implements **parallel headless worker execution** for maximum throughput using PM2 process management.

**Process Management (PM2):**

- 4 parallel worker instances (configurable: `pm2 scale headless-swarm 8`)
- Stateless workers: claim → execute → exit (PM2 auto-restarts)
- Auto-restart on crash (max 10 restarts)
- Memory limit: 1GB (max_memory_restart)

**PM2 Configuration (`~/.config/opencode/ecosystem.config.js`):**

```javascript
module.exports = {
  apps: [
    {
      name: 'headless-swarm',
      script: './bin/headless-worker.js',
      instances: 4,
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '1G',
      error_file: '~/.config/opencode/logs/err.log',
      out_file: '~/.config/opencode/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
    },
  ],
};
```

**Headless Worker Lifecycle (`bin/headless-worker.js`):**

1. Poll Beads for available tasks
2. Extract task_id and claim
3. Reserve file paths via MCP (prevent conflicts)
4. Execute task using opencode
5. On success: close task, release reservations, exit
6. On failure: mark failed, release reservations, exit
7. PM2 auto-restarts worker → claims next task

**PM2 Commands:**

```bash
# Start workers
pm2 start ecosystem.config.js

# Scale workers (1 → 8)
pm2 scale headless-swarm 8
pm2 scale headless-swarm 2

# Monitor execution
pm2 logs
pm2 monit
pm2 list

# Control workers
pm2 stop all
pm2 restart all
pm2 delete all

# Save PM2 configuration (auto-start on system boot)
pm2 save
pm2 startup
```

### Design Principles

1. **Tool-Agnostic Services**: Services work with any AI tool (Claude, opencode, Factory, Cursor, etc.)
2. **On-Demand Verification**: Hooks check service availability, don't install
3. **Minimal Dependencies**: Only requires services to be in PATH
4. **No Duplication**: Single installation of each service, shared across all tools
5. **Graceful Degradation**: Works even when some services are unavailable
6. **Git-Native**: Beads data persists in `.beads/` directory, synced with git

---

## Tools and Components

### cass_memory (cm)

**Purpose**: Primary learning system with evidence validation

**Features:**

- Evidence-based rule validation through ACE pipeline
- Cross-session learning from past work
- Context extraction and anti-pattern detection
- Integration with Beads Viewer for session correlation

**Key Commands:**

```bash
cm context "task description" --json  # Get context before work
cm doctor --json                      # Check system health
cm playbook list                      # List all rules
cm init --repo                       # Initialize in project
```

### MCP Agent Mail

**Purpose**: Agent-to-agent communication and file reservations

**Features:**

- Tool-agnostic messaging system
- File path reservations to prevent conflicts
- Works with Factory CLI, opencode, Cursor, Claude Code, etc.
- HTTP API for agent integration

**Installation:**

```bash
git clone https://github.com/Dicklesworthstone/mcp_agent_mail.git ~/.mcp-agent-mail
cd ~/.mcp-agent-mail
uv python install 3.14
uv sync --python 3.14
```

**Using MCP Agent Mail in Agents:**

```python
from mcp_agent_mail_client import (
    register_agent,
    send_message,
    fetch_inbox,
    reserve_file_paths,
    release_file_reservations,
)

# Register agent
result = await register_agent(
    agent_name="my-agent",
    model="claude-sonnet-4-5",
    task_description="What this agent does"
)

# Reserve file paths (prevent conflicts)
result = await reserve_file_paths(
    agent_name="my-agent",
    paths=["src/**/*.ts"],
    ttl_seconds=3600
)
```

### Beads CLI (bd)

**Purpose**: Task tracking with dependency management

**Features:**

- Dependency-aware task tracking
- Git-native persistence (`.beads/` directory)
- Automatic task unlocking on completion
- Integration with Git for atomic workflows

**Key Commands:**

```bash
bd ready                                    # See unblocked issues
bd create "task" --description "..."         # Create task
bd show <id>                                # View task details
bd update <id> --status in_progress          # Start working
bd close <id> --reason "Done"               # Complete task
bd sync                                      # Sync to git
bd doctor                                    # Troubleshoot
```

**Installation:**

```bash
go install github.com/steveyegge/beads/cmd/bd@latest
echo 'export PATH="$HOME/go/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Beads Viewer (bv)

**Purpose**: Graph-aware task triage with AI agent integration

**Features:**

- Terminal UI with multiple views (List, Kanban, Graph, Tree)
- Graph metrics (PageRank, betweenness, critical path, cycles)
- Time-travel: compare project state across git revisions
- Robot commands for AI agent integration
- Impact network and causal chain analysis

**Robot Commands:**

| Command            | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `--robot-triage`   | Single entry point: recommendations, quick_wins, blockers |
| `--robot-next`     | Top recommendation + claim command                        |
| `--robot-insights` | Full metrics (PageRank, betweenness, cycles, etc.)        |
| `--robot-plan`     | Parallel execution tracks                                 |
| `--robot-priority` | Priority recommendations                                  |
| `--robot-history`  | Bead-to-commit correlations                               |
| `--robot-alerts`   | Stale issues, blocking cascades                           |

**Installation:**

```bash
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh?$(date +%s)" | bash
```

**Keyboard Shortcuts:**

| Key         | Action             |
| ----------- | ------------------ |
| `j` / `k`   | Navigate down/up   |
| `g` / `G`   | Jump to top/bottom |
| `Enter`     | Open/Select        |
| `/`         | Start search       |
| `b`         | Kanban board       |
| `i`         | Insights dashboard |
| `g`         | Graph visualizer   |
| `E`         | Tree view          |
| `h`         | History view       |
| `?`         | Help               |
| `q` / `Esc` | Quit               |

### Ultimate Bug Scanner (UBS)

**Purpose**: Multi-language static analysis catching 1000+ bug patterns

**Features:**

- Pre-agent scan: Automatically scans changed files before agent execution
- Post-agent scan: Scans files modified by agent to catch regressions
- Auto-update check: Updates UBS every 24 hours on session start
- Quality gate: Integrates with Stage 3 (Static Analysis & Security)
- Pre-commit hook: Blocks commits with critical bugs

**Key Commands:**

```bash
ubs file.ts                                  # Scan specific file
ubs $(git diff --name-only --cached)          # Scan staged files
ubs . --fail-on-warning                      # Stage 3 quality gate
```

**Installation:**

```bash
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh?$(date +%s)" | bash
```

### Plugin System

opencode plugins extend functionality through a hook-based architecture.

#### Available Plugins

**beads-guardrails.mjs**

- Enforce task tracking via beads
- Block TodoWrite tool in beads workspaces
- Graceful degradation when beads not active

**gptcache.mjs**

- LLM response caching to reduce API costs
- 70-90% cost reduction for repeated prompts
- <50ms retrieval vs 2-5s LLM calls

**ubs.mjs**

- Automated static analysis integration
- Pre/post-agent execution scanning
- Auto-update UBS every 24 hours

#### Plugin Development

```javascript
export const MyPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    'tool.execute.before': async (input, output) => {
      console.log('Tool:', input.tool);
    },
  };
};
```

For detailed plugin documentation, see [plugin/README.md](./plugin/README.md).

---

## Hook System

### Hook Architecture

```
~/.config/opencode/hooks/
├── session-start.sh           # Main entry point
│   └── Calls all check hooks
├── check-cass-memory.sh     # Verify cass_memory
├── check-mcp-agent-mail.sh  # Verify MCP Agent Mail
├── check-beads.sh           # Verify Beads CLI
└── check-bv.sh               # Verify Beads Viewer
```

### Hook Behavior

**Key Principle**: **Check-Only, Don't Install**

- ✅ Checks if service is installed
- ✅ Verifies service is running (if applicable)
- ✅ Reports clear status messages
- ✅ Returns exit code 0 if all required services available
- ✅ Returns exit code 1 if any required service missing
- ❌ Never installs services
- ❌ Never modifies system paths

### Running Hooks

```bash
# Main hook (checks all services)
~/.config/opencode/hooks/session-start.sh

# Individual hooks
~/.config/opencode/hooks/check-cass-memory.sh
~/.config/opencode/hooks/check-mcp-agent-mail.sh
~/.config/opencode/hooks/check-beads.sh
~/.config/opencode/hooks/check-bv.sh

# Interactive mode (prompts for setup if needed)
~/.config/opencode/hooks/session-start.sh --interactive
```

---

## Testing

### Running All Tests

```bash
# Run all tests
cd ~/.config/opencode/tests
./run-all.sh
```

### Test Categories

- **Hook Tests** (`tests/bin/`) - Service check validation
- **cass_memory Tests** (`tests/cass_memory/`) - cm command validation
- **Beads Tests** (`tests/beads/`) - bd workflow validation
- **bv Tests** (`tests/bv/`) - bv robot command validation
- **Integration Tests** (`tests/integration/`) - End-to-end workflows

### Code Quality

```bash
# Run linting
npm run lint              # ESLint check
npm run lint:fix          # ESLint fix

# Run formatting
npm run format            # Prettier format all files
npm run format:check      # Prettier check only

# Pre-commit hooks (Husky + lint-staged)
# Automatically runs lint and format on staged files
```

---

## Troubleshooting

### Service Not Installed?

```bash
# cass_memory not found
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/cass_memory_system/main/install.sh | bash -s -- --easy-mode --verify

# MCP Agent Mail not found
git clone https://github.com/Dicklesworthstone/mcp_agent_mail.git ~/.mcp-agent-mail
cd ~/.mcp-agent-mail && uv sync

# Beads CLI not found
go install github.com/steveyegge/beads/cmd/bd@latest
echo 'export PATH="$HOME/go/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Beads Viewer not found
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh?$(date +%s)" | bash

# UBS not found
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh?$(date +%s)" | bash
```

### Hook Returns Wrong Exit Code?

```bash
# Check exit code manually
echo $?

# Should return:
# 0 = all required services available
# 1 = required service missing
```

### cass_memory Issues?

```bash
# Check cass_memory health
cm doctor --json

# Check if initialized
ls -la ~/.cass-memory/

# If issues, try re-init
cm init
```

### MCP Agent Mail Issues?

```bash
# Check if server running
curl -s http://127.0.0.1:8765/health/readiness

# Restart if needed
pkill -f "mcp_agent_mail.http"
HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true uv run python -m mcp_agent_mail.http --host 127.0.0.1 --port 8765
```

### Beads Issues?

```bash
# Check Beads status
bd doctor

# Re-initialize if needed
bd init
```

---

## Project Structure

```
~/.config/opencode/
├── AGENTS.md                 # Agent instructions
├── README.md                 # This file
├── mcp_agent_mail_client.py # HTTP client for MCP Agent Mail
├── bin/                      # opencode scripts
│   ├── opencode-init          # System-wide setup
│   └── workspace-init         # Project initialization
├── .beads/                   # Beads data (per project)
├── plugin/                   # Plugin system
│   ├── beads-guardrails.mjs  # Task tracking enforcement
│   ├── gptcache.mjs          # LLM response caching
│   ├── ubs.mjs               # UBS static analysis
│   └── README.md             # Plugin documentation
├── docs/                     # Documentation
│   ├── GPTCACHE_INTEGRATION.md
│   ├── BEADS_GUARDRAILS_SETUP.md
│   ├── BEADS_GUARDRAILS_IMPLEMENTATION.md
│   ├── task-to-commit.md     # Workflow documentation
│   ├── runner-architecture.md
│   ├── runner-usage.md
│   └── agent-development.md
├── lib/                      # Client libraries and relay runner
│   ├── beads-client.js         # Beads CLI wrapper
│   ├── beads-viewer-client.js  # BV CLI wrapper
│   ├── gptcache-client.js     # GPTCache wrapper
│   ├── gptcache-middleware.js # GPTCache middleware
│   ├── ubs-client.js          # UBS wrapper
│   ├── runner/                # Relay runner system
│   └── workflows/             # Code-driven workflows
├── config/                   # Plugin configurations
│   ├── beads_config.json       # Beads plugin config
│   ├── gptcache_config.json    # GPTCache plugin config
│   └── ubs_config.json       # UBS plugin config
└── hooks/                    # Service check hooks
    ├── session-start.sh
    ├── check-cass-memory.sh
    ├── check-mcp-agent-mail.sh
    ├── check-beads.sh
    ├── check-bv.sh
    ├── check-gptcache.sh
    ├── check-cass-health.sh
    └── check-ubs.sh
```

---

## Further Reading

### External Resources

- [Factory CLI Reference](https://github.com/steveyegge/factory) - Original framework
- [cass_memory Documentation](https://github.com/Dicklesworthstone/cass_memory_system) - Learning system
- [MCP Agent Mail](https://github.com/Dicklesworthstone/mcp_agent_mail) - Agent coordination
- [Beads Documentation](https://github.com/steveyegge/beads) - Task tracking
- [Beads Viewer (beads_viewer)](https://github.com/Dicklesworthstone/beads_viewer) - Task browser
- [opencode Plugin Documentation](https://opencode.ai/docs/plugins/) - Plugin development guide

### Internal Documentation

- [GPTCache Integration](./docs/GPTCACHE_INTEGRATION.md) - LLM response caching setup
- [Beads Guardrails Setup](./docs/BEADS_GUARDRAILS_SETUP.md) - Enforce task tracking
- [Beads Guardrails Implementation](./docs/BEADS_GUARDRAILS_IMPLEMENTATION.md) - Plugin implementation details
- [Plugin System](./plugin/README.md) - Plugin system documentation
- [Task-to-Commit Workflow](./docs/task-to-commit.md) - Atomic task cycle documentation
- [Runner Architecture](./docs/runner-architecture.md) - Relay runner design
- [Runner Usage](./docs/runner-usage.md) - Relay runner user guide
- [Agent Development](./docs/agent-development.md) - Creating agents

---

## License

MIT License - See LICENSE file for details.
