# Agent Instructions

This project uses **two systems** for memory and task tracking:

- **bd** (beads) - Issue tracking and task management
- **cm** (cass_memory) - Cross-agent learning and procedural memory

## Available Agents

### Primary Agents (Tab Completion)

These agents are available via tab completion for direct user interaction:

- **orchestrator** - Master coordinator with dual-mode operation (COORDINATION vs DIRECT)
- **prd** - Product Requirements Document generator with stakeholder alignment
- **generate-tasks** - Atomic task breakdown with dependencies

### Internal Research Droids

These agents are hidden from tab completion and are used internally by the orchestrator:

- **task-coordinator** - Beads task creation with MCP Agent Mail integration (kept for MCP notifications)
- **codebase-researcher** - Pattern discovery and technical debt identification
- **git-history-analyzer** - Change evolution and team collaboration analysis
- **context-researcher** - Project-wide context gathering (stakeholder analysis)
- **best-practices-researcher** - Industry best practices and competitive analysis
- **library-source-reader** - Third-party library deep analysis
- **domain-specialist** - Domain-specific expertise and compliance
- **semantic-search** (osgrep) - Conceptual code search with embedding models
- **file-picker-agent** - Targeted file discovery and codebase navigation
- **figma-design-extractor** - Figma design token extraction for pixel-perfect implementation

### Skills

- **task-breakdown** - Feature → tasks workflow
- **feature-planning** - End-to-end PRD generation
- **complex-project** - Enterprise feature planning

## Memory System: cass_memory

The Cass Memory System (cm) transforms scattered agent sessions into persistent, cross-agent memory—so every agent learns from every other agent's experience.

### Quick Start

```bash
cm context "<your task>" --json

# Returns:
#   • relevantBullets - Evidence-backed rules
#   • antiPatterns - Pitfalls to avoid
#   • historySnippets - Similar past sessions
#   • suggestedCassQueries - Deeper investigation searches
```

### Integration

Cass Memory is integrated via opencode plugin (`plugin/cass.mjs`) and configuration (`cass_config.json`).

**Files:**

- `plugin/cass.mjs` - opencode lifecycle hooks (agent.execute.before, agent.execute.after)
- `cass_config.json` - Plugin configuration (enabled, contextLimit, autoInject)
- `lib/cass-client.js` - HTTP client wrapper for cm commands

**How It Works:**

- **Automatic Context Injection**: `agent.execute.before` hook fetches relevant rules and injects into system prompt
- **Automatic Outcome Tracking**: `agent.execute.after` hook records success/failure for shown rules
- **Smart Filtering**: Limits to top N most relevant rules to manage context window
- **Zero Friction**: No manual protocol needed - works transparently

**Configuration:**

```json
{
  "enabled": true,
  "contextLimit": 5,
  "autoInject": true
}
```

### Key Features

- **Evidence Validation** - Rules require historical proof before acceptance
- **Confidence Decay** - 90-day half-life prevents stale patterns
- **Anti-Pattern Learning** - Bad rules auto-convert to warnings
- **Trauma Guard** - Blocks dangerous commands learned from incidents
- **Cross-Agent Learning** - Works with Claude, Cursor, Codex, Aider, etc.
- **Automatic Integration** - Plugin ensures consistent usage across all agents

### Useful Commands

```bash
cm context "task" --json     # Get rules + history (use this!)
cm similar "query"             # Find similar rules
cm playbook list               # Show all rules
cm doctor --json               # System health check
cm trauma list                # Show dangerous patterns
cm stats --json               # Playbook metrics
```

## Prompt Caching

opencode uses GPTCache to reduce LLM costs and improve response times for repeated prompts.

### Setup

GPTCache is configured to use local SQLite storage (no Redis required). Perfect for M1 MacBook Air with 8GB RAM.

Cache Location: ~/.gptcache/sqlite.db
Server: gptcache_server
Port: 8000

### Integration

The cache is integrated via opencode plugin (`gptcache-plugin.js`) and middleware (`lib/gptcache-middleware.js`).

**Files:**

- `lib/gptcache-client.js` - HTTP client for GPTCache server
- `lib/gptcache-middleware.js` - Cache wrapping logic
- `gptcache-plugin.js` - opencode lifecycle hooks
- `gptcache_config.json` - Cache configuration

**Benefits:**

- **Cost Savings**: 70-90% reduction for repeated prompts
- **Speed**: <50ms for cache hits vs 2-5s for LLM calls
- **Rate Limits**: Fewer API calls means fewer rate limit issues

**Management:**

```bash
# Check stats
node test-gptcache.js

# Cache control
~/.config/opencode/bin/gptcache-wrapper {status|start|stop|clear}

# Database queries
sqlite3 ~/.gptcache/sqlite.db "SELECT COUNT(*) FROM gptcache_question;"
```

### Requirements

- Python 3.10+ (checked during installation)
- numpy<2 (for ONNX compatibility)

### What Gets Cached

- Agent initialization prompts
- Common task patterns
- Repeated context queries

### Cache Behavior

- **Automatic**: Same prompt returns cached response instantly (<50ms)
- **Storage**: SQLite database with ONNX embeddings for similarity search
- **Manual**: Use `clear` command to empty cache when needed

### Benefits

| Benefit          | Impact                                |
| ---------------- | ------------------------------------- |
| **Cost Savings** | 70-90% reduction for repeated prompts |
| **Speed**        | <50ms for cache hits vs 2-5s for LLM  |
| **RAM**          | +50MB (negligible on 8GB)             |
| **Disk**         | ~50-100MB growing with usage          |
| **Offline**      | Works after first use                 |

### Integration

GPTCache is automatically started by `opencode-init` and `session-start.sh`:

- `session-start.sh` checks if server is running
- If not running, it auto-starts the server
- Seamless startup without manual intervention

### Useful Commands

```bash
cm context "task" --json     # Get rules + history (use this!)
cm similar "query"             # Find similar rules
cm playbook list               # Show all rules
cm doctor --json               # System health check
cm trauma list                # Show dangerous patterns
cm stats --json               # Playbook metrics
```

**Note**: cass is not installed (use playbook-only mode). Install from: https://github.com/Dicklesworthstone/coding_agent_session_search

---

## Ultimate Bug Scanner (UBS) - Static Analysis

opencode integrates [UBS (Ultimate Bug Scanner)](https://github.com/Dicklesworthstone/ultimate_bug_scanner) for automated static analysis and security scanning. UBS catches 1000+ bug patterns across 8+ languages before they reach production.

### Integration

UBS is integrated via opencode plugin (`plugin/ubs.mjs`) and configuration (`ubs_config.json`).

**Files:**

- `plugin/ubs.mjs` - opencode lifecycle hooks (agent.execute.before, agent.execute.after, session.start)
- `ubs_config.json` - Plugin configuration (enabled, autoScan, failOnCritical, autoUpdate)
- `lib/ubs-client.js` - HTTP client wrapper for UBS commands
- `hooks/check-ubs.sh` - Health check hook for session-start

**How It Works:**

- **Session Start**: Checks for UBS updates (every 24 hours if autoUpdate enabled)
- **Pre-Agent Scan**: Automatically scans changed files before agent execution
- **Post-Agent Scan**: Scans files modified by agent to catch regressions
- **Quality Gate**: Runs during Stage 3 (Static Analysis & Security) of task workflow
- **Pre-Commit Hook**: Blocks commits with critical bugs

**Configuration:**

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

### Key Features

- **Multi-Language Support**: JavaScript/TypeScript, Python, C/C++, Rust, Go, Java, Ruby, Swift
- **Fast Scanning**: Sub-second for small files, <1 minute for large projects
- **Supply-Chain Security**: SHA-256 checksum verification and minisign support
- **18 Detection Categories**: Null safety, security holes, async/await bugs, memory leaks, type coercion
- **AI-Agent First**: Built specifically for Claude Code, Cursor, Codex, Gemini, Windsurf, Cline, OpenCode MCP
- **Zero Configuration**: Works out of the box with sensible defaults
- **SARIF Output**: Standardized reporting for CI/CD integration

### UBS Quick Reference for AI Agents

**Install:**

```bash
curl -sSL https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh | bash
```

**Golden Rule:** `ubs <changed-files>` before every commit. Exit 0 = safe. Exit >0 = fix & re-run.

**Commands:**

```bash
ubs file.ts file2.py                    # Specific files (< 1s) — USE THIS
ubs $(git diff --name-only --cached)    # Staged files — before commit
ubs --only=js,python src/               # Language filter (3-5x faster)
ubs --ci --fail-on-warning .            # CI mode — before PR
ubs --help                              # Full command reference
ubs .                                   # Whole project (ignores things like .venv and node_modules automatically)
```

**Output Format:**

```
⚠️  Category (N errors)
    file.ts:42:5 – Issue description
    💡 Suggested fix
Exit code: 1
```

Parse: `file:line:col` → location | 💡 → how to fix | Exit 0/1 → pass/fail

**Fix Workflow:**

1. Read finding → category + fix suggestion
2. Navigate `file:line:col` → view context
3. Verify real issue (not false positive)
4. Fix root cause (not symptom)
5. Re-run `ubs <file>` → exit 0
6. Commit

**Speed Critical:**
Scope to changed files. `ubs src/file.ts` (< 1s) vs `ubs .` (30s). Never full scan for small edits.

**Bug Severity:**

- **Critical** (always fix): Null safety, XSS/injection, async/await, memory leaks
- **Important** (production): Type narrowing, division-by-zero, resource leaks
- **Contextual** (judgment): TODO/FIXME, console logs

**Anti-Patterns:**

- ❌ Ignore findings → ✅ Investigate each
- ❌ Full scan per edit → ✅ Scope to file
- ❌ Fix symptom (`if (x) { x.y }`) → ✅ Root cause (`x?.y`)

### Useful Commands

```bash
# Health check
ubs doctor

# Scan changed files only (pre-commit)
ubs $(git diff --name-only)

# Stage 3 quality gate
ubs . --fail-on-warning

# Create baseline for regression detection
ubs --report-json .ubs/baseline.json

# Compare against baseline
ubs . --comparison .ubs/baseline.json
```

### Integration with Task Workflow

UBS is the primary quality gate for **Stage 3: Static Analysis & Security** in the task-to-commit cycle:

```bash
# Stage 3: Run quality gate
if ! ubs . --fail-on-warning; then
  # Create dependent task
  bd create "Fix critical bugs found by UBS" --priority 0 --status open
  exit 1
fi

# Proceed to Stage 4: Test Execution
```

### Benefits

- **Catches What Humans & AI Miss**: 18 specialized detection categories
- **Blazing Fast**: 10,000+ lines analyzed per second
- **Built FOR AI Agents, BY Developers Who Use AI**: Zero configuration, works with any agent
- **Real-World Impact**: 84x faster than manual debugging in production
- **Automatic Updates**: Keeps security rules current without manual intervention

---

---

## Task Management: Beads (bd) & Beads Viewer (bv)

This project uses [Beads](https://github.com/steveyegge/beads) for issue tracking and [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for intelligent task management. Issues are stored in `.beads/` and tracked in git.

### Quick Reference (Basic Commands)

```bash
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

For comprehensive Beads documentation including:
- Advanced commands (delete, dependencies, advanced filtering, search, labels)
- Beads Viewer (bv) protocol for task recommendations and graph analysis
- Workflow integration and session protocol
- Beads Plugin integration with client APIs

**See: [skills/beads-agent.md](./skills/beads-agent.md)**

This file is loaded automatically when:
- User mentions beads/tasks/issues/bv commands
- Agent needs to interact with task tracking system
- Context requires knowledge of bead operations

---

