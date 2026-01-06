# opencode - AI Development Environment

## 🚀 Overview

opencode brings together best-in-class AI development tools into a unified, hook-based environment. It replaces Factory CLI with a modern, service-agnostic architecture where tools are installed independently and checked on-demand.

### Key Features

- **cass_memory** (cm) - Evidence-based learning system for cross-agent intelligence
- **MCP Agent Mail** - Tool-agnostic agent coordination and file reservations
- **Beads CLI** (bd) - Dependency-aware task tracking with git persistence
- **Beads Viewer** (bv) - Graph-aware task triage with AI agent integration
- **7 Research Droids**:
  - **codebase-researcher** - Pattern discovery and technical debt identification
  - **git-history-analyzer** - Change evolution and team collaboration analysis
  - **context-researcher** - Project-wide context gathering (stakeholder analysis)
  - **best-practices-researcher** - Industry best practices and competitive analysis
  - **library-source-reader** - Third-party library deep analysis
  - **domain-specialist** - Domain-specific expertise and compliance
- **semantic-search** (osgrep) - Conceptual code search with embedding models
- **Specialized Droids**:
  - **orchestrator** - Master coordinator with dual-mode operation (2000+ lines)
  - **prd** - Product Requirements Document generator
  - **generate-tasks** - Atomic task breakdown with dependencies
  - **task-coordinator** - Beads task creation and tracking
- **3 Skills**:
  - **task-breakdown** - Feature → tasks workflow
  - **feature-planning** - End-to-end PRD generation
  - **complex-project** - Enterprise feature planning
- **Semantic Code Search**:
  - osgrep integration for conceptual code queries
- **Full Factory CLI workflows**:
  - droid-init (system setup)
  - workspace-init (project initialization)
  - Beads CLI installation and configuration
  - MCP Agent Mail setup and integration
  - Complete test suite with 83 tests passing (100%)
- **Hook-based Service Checks** - Verify services are available before session start (no installation from hooks)

### Design Principles

1. **Tool-Agnostic Services**: Services work with any AI tool (Claude, opencode, Factory, Cursor, etc.)
2. **On-Demand Verification**: Hooks check service availability, don't install
3. **Minimal Dependencies**: Only requires services to be in PATH
4. **No Duplication**: Single installation of each service, shared across all tools
5. **Graceful Degradation**: Works even when some services are unavailable
6. **Git-Native**: Beads data persists in `.beads/` directory, synced with git

---

## 📚 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Tool-Agnostic Architecture](#-tool-agnostic-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Hook System](#-hook-system)
- [Workflow](#-workflow)
- [bv Integration](#-bv-integration)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Overview

opencode is a minimal, hook-based AI development environment that replaces Factory CLI. It uses:

- **cass_memory (cm)** - Primary learning system with evidence validation
- **MCP Agent Mail** - Agent-to-agent communication and file reservations
- **Beads CLI (bd)** - Task tracking with dependency management
- **Beads Viewer (bv)** - Graph-aware triage with AI agent integration

### Why Replace Factory CLI?

1. **Tool Independence**: Services are installed globally, not per-tool
2. **Hook-Based**: Services are checked, not installed by opencode
3. **No Pre-Installation**: No `droid-init` script required
4. **Evidence-Based Learning**: cass_memory's ACE pipeline validates rules
5. **Graph Intelligence**: bv provides PageRank, critical path, cycles

---

## 🚀 Quick Start

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

### Work with Beads Tasks

```bash
# See what to work on
bd ready

# Create a new task
bd create "task title" --description "what needs to be done"

# Track progress
bd update <id> --status in_progress
bd close <id> --reason "Completed"
```

---

## 🏗 Tool-Agnostic Architecture

### Service Installation Locations

```
Tool-Agnostic Services (Global):
├── ~/.cass-memory/              # cass_memory - Learning system (ALREADY INSTALLED)
├── ~/.mcp-agent-mail/           # MCP Agent Mail - Agent coordination (TO BE INSTALLED)
├── ~/.local/bin/bd              # Beads CLI - Task tracking (ALREADY INSTALLED)
├── ~/.local/bin/bv              # Beads Viewer - TUI for browsing (ALREADY INSTALLED)
└── ~/.config/opencode/         # Tool-specific configs
    ├── AGENTS.md                  # Agent instructions
    ├── hooks/                     # Service checks ONLY
    └── .beads/                   # Beads data per project
```

### Service Management Strategy

| Service | Installation Method | Check Location | Auto-Start |
|-----------|-------------------|---------------|-------------|
| **cass_memory** | `cm init` | `check-cass-memory.sh` | ❌ No |
| **MCP Agent Mail** | Clone + `uv sync` | `check-mcp-agent-mail.sh` | ❌ No |
| **Beads CLI (bd)** | `go install` | `check-beads.sh` | ❌ No |
| **Beads Viewer (bv)** | `curl install.sh` | `check-bv.sh` | ❌ No |

**Key Principle**: Services are **tool-agnostic** - they work with Factory CLI, opencode, Cursor, Claude Code, Codex, etc.

---

## 🔧 Installation

### Installing cass_memory

```bash
# One-time installation
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/cass_memory_system/main/install.sh | bash -s -- --easy-mode --verify

# Verify installation
cm --version
cm doctor --json
```

### Installing MCP Agent Mail

```bash
# Tool-agnostic location (works with Factory CLI, opencode, etc.)
git clone https://github.com/Dicklesworthstone/mcp_agent_mail.git ~/.mcp-agent-mail
cd ~/.mcp-agent-mail

# Install dependencies
uv sync

# Configure environment
cat > .env << 'EOF'
STORAGE_ROOT=~/.mcp-agent-mail/storage
DATABASE_URL=sqlite+aiosqlite:////~/.mcp-agent-mail/storage/mcp.db
HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true
HTTP_PORT=8765
EOF

# Start server (manual or via hook)
HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true uv run python -m mcp_agent_mail.http --host 127.0.0.1 --port 8765
```

### Installing Beads CLI (bd)

```bash
# Already installed? Check with:
which bd
bd --version

# If not installed:
go install github.com/steveyegge/beads/cmd/bd@latest

# Add to PATH (if not already there)
echo 'export PATH="$HOME/go/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Installing Beads Viewer (bv)

```bash
# Already installed? Check with:
which bv
bv --version

# If not installed:
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh?$(date +%s)" | bash
```

---

## ⚙️ Configuration

### cass_memory Configuration

```bash
# View config
cat ~/.cass-memory/config.json

# Set LLM provider (Anthropic, OpenAI, Google, etc.)
cm config set provider anthropic

# Set API key
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Beads Configuration

```bash
# Initialize in project directory
cd /path/to/project
bd init

# Configure merge driver (optional)
git config merge.beads.driver "bd merge %A %O %A %B"

# Install git hooks
bd hooks install
```

### MCP Agent Mail Configuration

```bash
# Environment variables (can be set in .env or shell profile)
export MCP_SERVER_HOST=127.0.0.1
export MCP_SERVER_PORT=8765
export MCP_AGENT_MAIL_DIR=~/.mcp-agent-mail
```

---

## 🎣 Hook System

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
```

---

## 🔄 Workflow

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

### cass_memory Learning Protocol

```bash
# 1. Get context before work
cm context "your task" --json

# 2. Reference rules in code
# Following rule b-8f3a2c: Always validate inputs
// [cass: helpful b-8f3a2c] - rule helped catch edge case

# 3. Work on task
# ... code changes ...

# 4. End session
# Reflection happens automatically (schedule: cm reflect --days 7)
```

---

## 🤖 bv Integration for AI Agents

### The One Command to Remember

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
```

### Key bv Commands for AI Agents

| Command | Purpose | Use Case |
|----------|-----------|-----------|
| `--robot-triage` | THE MEGA-COMMAND: single entry point for all analysis |
| `--robot-next` | Minimal: just top pick + claim command |
| `--robot-insights` | Full metrics: PageRank, betweenness, critical path, cycles |
| `--robot-plan` | Parallel execution tracks with dependency awareness |
| `--robot-priority` | Priority recommendations based on computed scores |
| `--robot-history` | Bead-to-commit correlations with confidence scores |
| `--robot-alerts` | Stale issues, blocking cascades, mismatches |

### Example AI Agent Workflow

```bash
# Step 1: Get triage
TRIAGE=$(bv --robot-triage)

# Step 2: Get top recommendation
NEXT_TASK=$(echo "$TRIAGE" | jq -r '.recommendations[0].id')

# Step 3: Get claim command
CLAIM_CMD=$(echo "$TRIAGE" | jq -r '.commands.claim')

# Step 4: Claim task (optional)
eval $CLAIM_CMD

# Step 5: Get context from cass_memory
CONTEXT=$(cm context "implement $NEXT_TASK" --json)

# Step 6: Work on task
# ... implement ...

# Step 7: Mark complete
bd update $NEXT_TASK --status completed
```

### bv + cass_memory Integration

```bash
# bv checks for cass_memory automatically
# If cass is installed and indexed, bv shows "🤖" in status bar

# Session correlation
# Press "V" on any bead to see cass sessions that contributed
```

---

## 🧪 Testing

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

### Quality Metrics

- **Pass Rate**: Target 100% (matching Factory's 83/83)
- **Coverage**: All critical paths tested
- **Regression Prevention**: Tests prevent breaking existing functionality

---

## 🔧 Troubleshooting

### Service Not Installed?

```bash
# cass_memory not found
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/cass_memory_system/main/install.sh | bash -s -- --easy-mode --verify

# MCP Agent Mail not found
git clone https://github.com/Dicklesworthstone/mcp_agent_mail.git ~/.mcp-agent-mail
cd ~/.mcp-agent-mail
uv sync

# Beads CLI not found
go install github.com/steveyegge/beads/cmd/bd@latest
echo 'export PATH="$HOME/go/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Beads Viewer not found
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh?$(date +%s)" | bash
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

# Check logs
tail -f ~/.mcp-agent-mail/storage/mcp.db

# Restart if needed
# Kill existing process
pkill -f "mcp_agent_mail.http"

# Start fresh
HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true uv run python -m mcp_agent_mail.http --host 127.0.0.1 --port 8765
```

### Beads Issues?

```bash
# Check Beads status
bd doctor

# Re-initialize if needed
bd init
```

### bv Issues?

```bash
# Check bv status
bv --version

# Re-install if needed
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh?$(date +%s)" | bash
```

---

## 📁 Project Structure

```
~/.config/opencode/
├── AGENTS.md                 # Agent instructions (THIS FILE)
├── README.md                 # This file
├── .beads/                   # Beads data (per project)
└── hooks/                    # Service check hooks
    ├── session-start.sh
    ├── check-cass-memory.sh
    ├── check-mcp-agent-mail.sh
    ├── check-beads.sh
    └── check-bv.sh
```

---

## 🤖 bv Integration: Complete Feature List

From the bv documentation (beads_viewer), here are ALL features available:

### Core Views

- **List View** (`b` - default) - Issue list with details panel
- **Kanban Board** - Columnar workflow (Open, In Progress, Blocked, Closed)
- **Graph Visualizer** (`g`) - Dependency DAG with pan/zoom
- **Tree View** (`E`) - Parent-child hierarchy visualization
- **Insights Dashboard** (`i`) - Graph metrics and health analytics
- **History View** (`h`) - Bead-to-commit correlations with timeline

### Robot Commands (AI Agent Interface)

| Command | Returns | When to Use |
|----------|---------|--------------|
| `--robot-triage` | quick_ref, recommendations, quick_wins, blockers_to_clear, project_health | **Start every session** |
| `--robot-next` | Top recommendation + claim command | What to work on next |
| `--robot-insights` | Full metrics (PageRank, betweenness, cycles, etc.) | Assess project health |
| `--robot-plan` | Parallel execution tracks | How to parallelize work |
| `--robot-priority` | Priority recommendations | Fix misaligned priorities |
| `--robot-history` | Bead-to-commit correlations | Track what was done when |
| `--robot-alerts` | Stale issues, blocking cascades, mismatches | Proactive monitoring |
| `--robot-sprint-list` | All sprints as JSON | Sprint management |
| `--robot-burndown` | Sprint burndown with at-risk detection | Progress tracking |
| `--robot-forecast` | ETA predictions with dependency-aware scheduling | When will tasks complete |
| `--robot-label-health` | Per-label health metrics | Domain health monitoring |
| `--robot-label-flow` | Cross-label dependency matrix | Identify bottlenecks between teams |
| `--robot-label-attention` | Attention-ranked labels | Prioritize domain focus |
| `--robot-graph` | Dependency graph export | JSON, DOT, Mermaid formats |

### Graph Analysis Features

- **9 Graph Metrics**: PageRank, betweenness, HITS, eigenvector, critical path, degree, density, cycles, topo sort
- **Time-Travel**: Compare project state across any git revision
- **Impact Network**: Implicit relationships between beads based on shared code changes
- **Causal Chain Analysis**: Reconstruct why a bead took as long as it did
- **Correlation Feedback**: Train bv to learn from confirmed/rejected correlations

### Search & Filtering

- **Fuzzy Search** (`/`) - Instant search across ID, title, content, metadata
- **Status Filters**: Open (`o`), Closed (`c`), Ready (`r`)
- **Priority Filters**: P0-Critical through P4-Backlog
- **Label Filters**: Dynamic per-project labels
- **Semantic Search** (Optional): Vector-based search with cass Memory integration

### Export & Reporting

- **Markdown Export** (`--export-md`) - Management-ready reports with Mermaid diagrams
- **Graph Export** (`--robot-graph`) - JSON, DOT, Mermaid formats
- **Static Site** (`--export-pages`) - Self-contained HTML visualizations
- **History Export** - Bead-to-commit correlation data

---

## 🚀 Quick Reference

### Essential Commands

```bash
# cass_memory
cm context "task" --json                    # Get rules before working
cm doctor --json                            # Check system health
cm playbook list                             # List all rules

# Beads CLI
bd ready                                    # See unblocked issues
bd create "task" --description "..."         # Create task
bd show <id>                                # View task details
bd update <id> --status in_progress          # Start working
bd close <id> --reason "Done"                 # Complete task
bd sync                                      # Sync to git
bd doctor                                    # Troubleshoot

# Beads Viewer (bv)
bv --robot-triage                           # THE COMMAND - start every session
bv --robot-next                               # What to work on next
bv --robot-insights                          # Full project analysis
bv --robot-plan                              # Parallel execution tracks
```

### Keyboard Shortcuts (bv)

| Key | Action |
|------|---------|
| `j` / `k` | Navigate down/up |
| `g` / `G` | Jump to top/bottom |
| `Enter` | Open/Select |
| `/` | Start search |
| `b` | Kanban board |
| `i` | Insights dashboard |
| `g` | Graph visualizer |
| `E` | Tree view |
| `h` | History view |
| `a` | Actionable plan |
| `?` | Help |
| `q` / `Esc` | Quit |

---

## 🎯 Getting Started

### Option 1: Fresh Installation

```bash
# 1. Install cass_memory (already done)
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/cass_memory_system/main/install.sh | bash -s -- --easy-mode --verify

# 2. Install MCP Agent Mail
git clone https://github.com/Dicklesworthstone/mcp_agent_mail.git ~/.mcp-agent-mail
cd ~/.mcp-agent-mail
cat > .env << 'EOF'
STORAGE_ROOT=~/.mcp-agent-mail/storage
DATABASE_URL=sqlite+aiosqlite:////~/.mcp-agent-mail/storage/mcp.db
HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true
HTTP_PORT=8765
EOF
uv sync
HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true uv run python -m mcp_agent_mail.http --host 127.0.0.1 --port 8765 &

# 3. Verify installations
which cm  # Should show ~/.local/bin/cm
which bv   # Should show ~/.local/bin/bv
which bd   # Should show ~/.local/bin/bd

# 4. Start using opencode in a project
cd /path/to/your/project
cm init --repo  # Initialize cass_memory for project
bd ready         # Check what to work on
```

### Option 2: Use Existing Factory Installations

```bash
# If you already have Factory CLI installed, you can use existing services:

# cass_memory: Already installed at ~/.cass-memory/
# MCP Agent Mail: Already at ~/.config/opencode/mcp_agent_mail/
# Beads CLI: Already in PATH
# Beads Viewer: Already in PATH

# Just initialize hooks and project
cd /path/to/your/project
~/.config/opencode/hooks/session-start.sh  # Checks services
```

---

## 📚 Further Reading

- [Factory CLI Reference](https://github.com/steveyegge/factory) - Original framework
- [cass_memory Documentation](https://github.com/Dicklesworthstone/cass_memory_system) - Learning system
- [MCP Agent Mail](https://github.com/Dicklesworthstone/mcp_agent_mail) - Agent coordination
- [Beads Documentation](https://github.com/steveyegge/beads) - Task tracking
- [Beads Viewer (beads_viewer)](https://github.com/Dicklesworthstone/beads_viewer) - Task browser

---

## 📄 License

MIT License - See LICENSE file for details.
