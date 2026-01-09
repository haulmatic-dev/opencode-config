# opencode - AI Development Environment

## 🚀 Overview

opencode brings together best-in-class AI development tools into a unified, hook-based environment. It replaces Factory CLI with a modern, service-agnostic architecture where tools are installed independently and checked on-demand.

### Key Features

- **cass_memory** (cm) - Evidence-based learning system for cross-agent intelligence
- **MCP Agent Mail** - Tool-agnostic agent coordination and file reservations
- **Beads CLI** (bd) - Dependency-aware task tracking with git persistence
- **Beads Viewer** (bv) - Graph-aware task triage with AI agent integration
- **Ultimate Bug Scanner (UBS)** - Multi-language static analysis catching 1000+ bug patterns
- **7 Research Droids**:
  - **codebase-researcher** - Pattern discovery and technical debt identification
  - **git-history-analyzer** - Change evolution and team collaboration analysis
  - **context-researcher** - Project-wide context gathering (stakeholder analysis)
  - **best-practices-researcher** - Industry best practices and competitive analysis
  - **library-source-reader** - Third-party library deep analysis
  - **domain-specialist** - Domain-specific expertise and compliance
 - **semantic-search** (osgrep) - Conceptual code search with embedding models
- **Parallel Agent Spawn Middleware** - Shared middleware for spawning headless workers via PM2 or subprocess with unified API
- **Plugin System** - Extensible architecture with:
  - **gptcache** - LLM response caching for 70-90% cost reduction
  - **beads-guardrails** - Enforce task tracking via beads
  - **ubs** - Automated static analysis before/after agent execution
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
- **Task-to-Commit Cycle** - 6-stage atomic workflow managed by Beads dependency graphs with automated failure handling

### Task-to-Commit Workflow

opencode implements a **6-stage atomic task cycle** managed by **Beads dependency graphs**. Individual agents execute tasks, run quality gates, and handle success/failure. The Beads system automatically manages task dependencies, unlocking downstream tasks and blocking work when failures occur.

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
- [Task-to-Commit Workflow](#-task-to-commit-workflow)
- [Quick Start](#-quick-start)
- [Tool-Agnostic Architecture](#-tool-agnostic-architecture)
- [Installation](#-installation)
  - [Configuration](#-configuration)
  - [Plugin System](#-plugin-system)
  - [Parallel Agent Spawn Middleware](#-parallel-agent-spawn-middleware)
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

### Parallel Agent Spawn

```bash
# Run headless worker
node ~/.config/opencode/bin/headless-worker.js

# Worker will:
# 1. Poll Beads for available tasks
# 2. Claim a task
# 3. Reserve file paths via MCP
# 4. Execute the task
# 5. Close the task on success
# 6. Release file reservations
```

---

## 🏗 Tool-Agnostic Architecture

### Service Installation Locations

```
Tool-Agnostic Services (Global):
├── ~/.cass-memory/              # cass_memory - Learning system (ALREADY INSTALLED)
├── ~/.mcp-agent-mail/           # MCP Agent Mail - Agent coordination (REQUIRED)
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
| | **UBS** | `curl install.sh` | `check-ubs.sh` | ❌ No |
**Key Principle**: Services are **tool-agnostic** - they work with Factory CLI, opencode, Cursor, Claude Code, Codex, etc.

---

## 🔧 Installation

### Quick Install: opencode-init

For a one-command system setup, use the **opencode-init** script:

```bash
# Clone and install all required services
cd ~/.config/opencode/bin
./opencode-init

# This will install:
# - cass_memory (cm)
# - MCP Agent Mail (REQUIRED)
# - Beads CLI (bd)
# - Beads Viewer (bv)
# - osgrep (semantic search)
# - Configure PATH for ~/.config/opencode/bin
```

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

# Install Python 3.14 (required)
uv python install 3.14

# Install dependencies
uv sync --python 3.14

# Configure environment
cat > .env << 'EOF'
STORAGE_ROOT=~/.mcp-agent-mail/storage
DATABASE_URL=sqlite+aiosqlite:////~/.mcp-agent-mail/storage/mcp.db
HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true
HTTP_PORT=8765
EOF

# Start server (manual or via hook)
HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true uv run python -m mcp_agent_mail.http --host 127.0.0.1 --port 8765 &
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

### Using MCP Agent Mail in Agents

opencode provides a Python client helper `mcp_agent_mail_client.py` for agents to communicate with MCP Agent Mail server:

```python
# Import in agent files
from mcp_agent_mail_client import (
    register_agent,
    send_message,
    fetch_inbox,
    acknowledge_message,
    reserve_file_paths,
    release_file_reservations,
    get_project_key
)

# Register agent
result = await register_agent(
    agent_name="my-agent",
    model="claude-sonnet-4-5",
    task_description="What this agent does"
)

# Send message to other agent
result = await send_message(
    sender_name="my-agent",
    recipient_name="other-agent",
    content={"type": "task_assignment", "task_id": "bd-123"}
)

# Fetch inbox for messages
result = await fetch_inbox(agent_name="my-agent", limit=50)

# Reserve file paths (prevent conflicts)
result = await reserve_file_paths(
    agent_name="my-agent",
    paths=["src/**/*.ts"],
    ttl_seconds=3600
)

# Release reservations when done
await release_file_reservations(agent_name="my-agent")
```

---

## 🔌 Plugin System

### Available Plugins

opencode plugins extend functionality through a hook-based architecture. All plugins are located in `./plugin/` directory.

#### beads-guardrails.mjs

**Purpose**: Enforce task tracking via beads by blocking TodoWrite tool in beads workspaces

**Features**:
- Blocks TodoWrite tool when `.beads/` directory exists
- Prevents task duplication between TodoWrite and Beads
- Graceful degradation when beads not active

**Behavior**:
- Checks for `.beads/` directory at tool execution
- Throws error: `[beads-guard] TodoWrite blocked in beads workspace. Use "bd create" instead for persistent tracking.`
- Allows TodoWrite in non-beads workspaces

**For detailed documentation**, see [docs/BEADS_GUARDRAILS_IMPLEMENTATION.md](./docs/BEADS_GUARDRAILS_IMPLEMENTATION.md)

#### gptcache.mjs

**Purpose**: LLM response caching to reduce API costs and improve response times

**Features**:
- Automatic caching of LLM responses
- 70-90% cost reduction for repeated prompts
- <50ms retrieval vs 2-5s LLM calls
- SQLite-based storage with ONNX embeddings
- Supports semantic similarity search

**Configuration**:
```json
{
  "enabled": true,
  "host": "127.0.0.1",
  "port": 8000,
  "cacheKeyPrefix": "opencode"
}
```

**Usage**:
- Automatically caches agent responses when enabled
- Configured in `gptcache_config.json`
- Requires GPTCache server running on port 8000

**For detailed documentation**, see [docs/GPTCACHE_INTEGRATION.md](./docs/GPTCACHE_INTEGRATION.md)

#### ubs.mjs

**Purpose**: Automated static analysis with Ultimate Bug Scanner for catching bugs before they reach production

**Features**:
- Pre-agent scan: Automatically scans changed files before agent execution
- Post-agent scan: Scans files modified by agent to catch regressions
- Auto-update check: Updates UBS every 24 hours on session start
- Quality gate: Integrates with Stage 3 (Static Analysis & Security) of task workflow
- Pre-commit hook: Blocks commits with critical bugs

**Configuration**:
```json
{
  "enabled": true,
  "autoScan": true,
  "failOnCritical": true,
  "autoUpdate": true,
  "updateInterval": 86400,
  "categories": [],
  "skipCategories": [],
  "languageFilter": [],
  "ciMode": false,
  "verbose": false
}
```

**Usage**:
- Automatically runs before/after agent execution when enabled
- Configured in `ubs_config.json`
- Requires UBS installed (optional - graceful degradation if missing)

**For detailed documentation**, see [AGENTS.md](./AGENTS.md#ultimate-bug-scanner-ubs---static-analysis)

### Plugin Registration

Plugins in `~/.config/opencode/plugin/` are automatically loaded at startup. No configuration in `opencode.json` is required.

### Plugin Development

**Requirements**:
- Export named functions (e.g., `export const MyPlugin`)
- Use `import` for ES modules (`.mjs` files)
- Accept plugin context parameters: `{ project, client, $, directory, worktree }`
- Return object with hook implementations

**Example**:
```javascript
export const MyPlugin = async ({ project, client, $, directory, worktree }) => {
  console.log("Plugin initialized!");
  
  return {
    'tool.execute.before': async (input, output) => {
      console.log("Tool:", input.tool);
    }
  };
};
```

**Available Hooks**:
- `tool.execute.before` - Before tool execution
- `tool.execute.after` - After tool execution
- `agent.execute.before` - Before agent execution
- `agent.execute.after` - After agent execution
- `chat.message` - Chat message events
- And many more (see [opencode docs](https://opencode.ai/docs/plugins/))

**Dependencies**:
- Use relative paths to access parent directory files
- External npm packages require `package.json` in config directory
- Dynamic imports work: `await import('../lib/module.js')`

### Plugin Documentation

For detailed plugin development guide, see [plugin/README.md](./plugin/README.md).

---

## 🤖 Parallel Agent Spawn Middleware

Shared middleware for spawning headless opencode workers via PM2 or subprocess. Provides a unified API for agent orchestration and worker lifecycle management.

### Features

- **Unified API** - Single interface for spawning workers via PM2 or subprocess
- **Worker Lifecycle Management** - Automatic tracking of worker state (pending, running, completed, failed, timeout)
- **Health Monitoring** - Track memory usage, uptime, and worker status
- **Event System** - Listen to worker lifecycle events (started, completed, failed, timeout)
- **Error Handling** - Automatic retry logic with configurable max retries
- **Graceful Shutdown** - Clean termination of running workers with kill timeout
- **Logging** - Automatic log file creation for each worker

### Quick Start

```javascript
const WorkerManager = require('./lib/parallel-agent-middleware');

const manager = new WorkerManager({ mode: 'subprocess', maxWorkers: 4 });

const worker = await manager.spawn_headless_worker({
  agent_type: 'general',
  task_id: 'example-task-123',
  task_description: 'Example task description',
  timeout: 60000 // 1 minute
});

console.log('Worker spawned:', worker.id);
console.log('PID:', worker.pid);
console.log('Status:', worker.status);

const results = await manager.wait_for_completion([worker]);
console.log('Worker completed:', results);

manager.cleanup_workers([worker.id]);
await manager.shutdown();
```

### API Reference

**WorkerManager(options)**
- `mode`: 'pm2' or 'subprocess' (default: 'subprocess')
- `maxWorkers`: Maximum number of parallel workers (default: 6)
- `defaultTimeout`: Default timeout in milliseconds (default: 600000)
- `maxRetries`: Maximum retry attempts (default: 3)
- `logDir`: Directory for log files (default: './logs')

**Key Methods:**
- `spawn_headless_worker(config)` - Spawn a new headless worker
- `wait_for_completion(workers, timeout)` - Wait for workers to complete
- `monitor_workers(pollInterval)` - Start monitoring workers for health
- `cleanup_workers(workerIds)` - Clean up completed/failed workers
- `get_worker_status(workerId)` - Get status of a single worker
- `get_all_workers_status()` - Get status of all workers
- `spawn_parallel_workers(workers_config)` - Spawn multiple workers in parallel
- `shutdown()` - Gracefully shut down all running workers

### Event System

The middleware emits events for worker lifecycle changes:

```javascript
manager.on('worker_started', (worker) => {
  console.log('Worker started:', worker.id);
});

manager.on('worker_complete', (worker) => {
  console.log('Worker completed:', worker.id);
});

manager.on('worker_error', (worker) => {
  console.error('Worker error:', worker.id, worker.error);
});

manager.on('worker_timeout', (worker) => {
  console.warn('Worker timeout:', worker.id);
});

manager.on('worker_memory_warning', (worker) => {
  console.warn('Worker memory warning:', worker.id);
});

manager.on('shutdown_complete', () => {
  console.log('All workers shut down');
});
```

### Spawning Multiple Workers

```javascript
const workers = await manager.spawn_parallel_workers([
  {
    agent_type: 'codebase-researcher',
    task_id: 'research-architecture',
    task_description: 'Analyze architecture patterns',
    timeout: 300000
  },
  {
    agent_type: 'git-history-analyzer',
    task_id: 'analyze-history',
    task_description: 'Analyze git history',
    timeout: 300000
  },
  {
    agent_type: 'file-picker-agent',
    task_id: 'find-files',
    task_description: 'Find relevant files',
    timeout: 300000
  }
]);

console.log(`Spawned ${workers.length} workers in parallel`);

const results = await manager.wait_for_completion(workers);
console.log('All workers completed:', results);

manager.cleanup_workers(workers.map(w => w.id));
```

### Headless Worker Integration

The headless worker script (`bin/headless-worker.js`) uses the middleware:

```javascript
const WorkerManager = require('../lib/parallel-agent-middleware');

const manager = new WorkerManager({ 
  mode: 'subprocess', 
  maxWorkers: 1,
  logDir: './logs'
});

async function runTask() {
  const taskId = await fetchReadyTask();
  
  console.log(`[Worker] Claimed task: ${taskId}`);
  
  await executeTask(taskId);
  
  await manager.shutdown();
}

runTask();
```

### PM2 vs Subprocess

**PM2 Mode (Production):**
```javascript
const manager = new WorkerManager({ 
  mode: 'pm2',
  maxWorkers: 8 
});
```

**Subprocess Mode (Development):**
```javascript
const manager = new WorkerManager({ 
  mode: 'subprocess',
  maxWorkers: 4 
});
```

### Architecture

The Parallel Agent Spawn Middleware is part of the larger Parallel Agent Orchestration architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (Coordinator)                   │
│  - Spawns headless workers via middleware                    │
│  - Communicates via MCP Agent Mail                              │
│  - Reads Beads for ready tasks                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │ PARALLEL AGENT       │
            │ SPAWN MIDDLEWARE     │
            │                      │
            │ spawn_headless_      │
            │ worker()             │
            │ wait_for_           │
            │ completion()        │
            │ monitor_workers()    │
            │ cleanup_workers()    │
            └──────────┬───────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  PRD    │  │ GENERATE│  │  WORKER │
   │  AGENT  │  │  TASKS  │  │  N      │
   └─────────┘  └─────────┘  └─────────┘
```

### Usage in Agent Workflows

**PRD Agent Research Integration:**
```javascript
const workers = await manager.spawn_parallel_workers([
  {
    agent_type: 'codebase-researcher',
    task_id: 'research-codebase',
    task_description: 'Analyze codebase architecture patterns'
  },
  {
    agent_type: 'file-picker-agent',
    task_id: 'find-files',
    task_description: 'Find relevant files for PRD generation'
  },
  {
    agent_type: 'domain-specialist',
    task_id: 'domain-analysis',
    task_description: 'Analyze domain-specific requirements'
  }
]);

const results = await manager.wait_for_completion(workers);
// Use research results in PRD generation
```

**Generate-Tasks Agent Research Integration:**
```javascript
const workers = await manager.spawn_parallel_workers([
  {
    agent_type: 'git-history-analyzer',
    task_id: 'analyze-history',
    task_description: 'Analyze git history for similar tasks'
  },
  {
    agent_type: 'library-source-reader',
    task_id: 'read-library',
    task_description: 'Read third-party library source code'
  },
  {
    agent_type: 'best-practices-researcher',
    task_id: 'best-practices',
    task_description: 'Research industry best practices'
  }
]);

const results = await manager.wait_for_completion(workers);
// Use research results in task breakdown
```

### Testing

Run unit tests:
```bash
node test-middleware.js
```

**Test Coverage:**
- Manager initialization with correct defaults
- Worker spawning and lifecycle tracking
- Health monitoring and memory tracking
- Event system functionality
- Worker cleanup and shutdown
- All 14 unit tests passing (100%)

### Troubleshooting

**Worker Not Starting**
```bash
# Check if opencode command is available
which opencode
opencode --version
```

**Worker Timeout**
```javascript
// Increase timeout in worker config
const worker = await manager.spawn_headless_worker({
  agent_type: 'general',
  task_id: 'task-123',
  timeout: 600000 // 10 minutes
});
```

**Memory Issues**
```javascript
// Worker is automatically killed if memory exceeds 1GB
manager.on('worker_memory_warning', (worker) => {
  console.warn('Worker using too much memory:', worker.memory_usage);
});
```

**Cleanup Issues**
```javascript
// Force cleanup with kill timeout
manager.cleanup_workers([worker.id]);

// Manual cleanup
process.kill(worker.pid, 'SIGTERM');
setTimeout(() => {
  process.kill(worker.pid, 'SIGKILL');
}, 5000);
```

### Documentation

For complete API reference and usage examples, see [lib/README.md](./lib/README.md).

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

### UBS Issues?

```bash
# Check UBS status
ubs --version
ubs doctor

# Re-install if needed
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh?$(date +%s)" | bash
```

---

## 📁 Project Structure

```
~/.config/opencode/
├── AGENTS.md                 # Agent instructions (THIS FILE)
├── README.md                 # This file
├── mcp_agent_mail_client.py # HTTP client for MCP Agent Mail
├── bin/                     # opencode scripts
│   ├── opencode-init          # System-wide setup
│   └── workspace-init         # Project initialization
├── .beads/                   # Beads data (per project)
├── plugin/                   # Plugin system
│   ├── beads-guardrails.mjs    # Task tracking enforcement
│   ├── gptcache.mjs          # LLM response caching
│   ├── ubs.mjs                # UBS static analysis
│   └── README.md              # Plugin documentation
├── docs/                     # Documentation
│   ├── GPTCACHE_INTEGRATION.md
│   ├── BEADS_GUARDRAILS_SETUP.md
│   ├── BEADS_GUARDRAILS_IMPLEMENTATION.md
│   ├── task-to-commit.md      # Workflow documentation
│   └── ...
├── lib/                      # Client libraries
│   ├── beads-client.js         # Beads CLI wrapper
│   ├── beads-viewer-client.js  # BV CLI wrapper
│   ├── gptcache-client.js     # GPTCache wrapper
│   ├── gptcache-middleware.js # GPTCache middleware
│   ├── ubs-client.js          # UBS wrapper
│   ├── parallel-agent-middleware.js # Worker spawn middleware
│   └── README.md              # Middleware documentation
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

# UBS (Ultimate Bug Scanner)
ubs file.ts                                  # Scan specific file
ubs $(git diff --name-only --cached)          # Scan staged files
ubs . --fail-on-warning                      # Stage 3 quality gate
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

### Option 1: Fresh Installation (Recommended)

```bash
# 1. Run opencode-init (one-time system setup)
cd ~/.config/opencode/bin
./opencode-init

# This will install and configure:
# - cass_memory (cm)
# - MCP Agent Mail (REQUIRED)
# - Beads CLI (bd)
# - Beads Viewer (bv)
# - osgrep (semantic search)
# - Configure PATH for ~/.config/opencode/bin

# 2. Source shell config or start new terminal
source ~/.zshrc  # or source ~/.bashrc

# 3. Initialize project
cd /path/to/your/project
~/.config/opencode/bin/workspace-init

# This will:
# - Initialize git repo (if missing)
# - Initialize cass_memory (cm init --repo) - REQUIRED
# - Initialize beads (bd init)
```

### Option 2: Use Existing Factory Installations

```bash
# If you already have Factory CLI installed, you can use existing services:

# cass_memory: Already installed at ~/.cass-memory/
# MCP Agent Mail: Already at ~/.mcp-agent-mail/
# Beads CLI: Already in PATH
# Beads Viewer: Already in PATH

# Just initialize hooks and project
cd /path/to/your/project
~/.config/opencode/hooks/session-start.sh  # Checks services
~/.config/opencode/bin/workspace-init  # Initialize project
```

---

## 📚 Further Reading

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
- [Parallel Agent Orchestration](./docs/architecture/parallel-agent-orchestration.md) - Parallel agent architecture design

---

## 📄 License

MIT License - See LICENSE file for details.
