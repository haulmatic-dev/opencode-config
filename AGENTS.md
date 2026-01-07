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
- **task-coordinator** - Beads task creation and tracking

### Internal Research Droids

These agents are hidden from tab completion and are used internally by the orchestrator:

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
# 1. Get context before starting a task (THE MAIN COMMAND)
cm context "<your task>" --json

# Returns:
#   • relevantBullets - Evidence-backed rules
#   • antiPatterns - Pitfalls to avoid
#   • historySnippets - Similar past sessions
#   • suggestedCassQueries - Deeper investigation searches
```

### Protocol

1. **START**: Run `cm context "<task>" --json` before non-trivial work
2. **WORK**: Reference rule IDs when following them (e.g., "Following b-8f3a2c...")
3. **FEEDBACK**: Leave inline comments when rules help/hurt:
    - `// [cass: helpful b-xyz] - reason`
    - `// [cass: harmful b-xyz] - reason`
4. **END**: Just finish your work. Learning happens automatically via reflection.

### Key Features

- **Evidence Validation** - Rules require historical proof before acceptance
- **Confidence Decay** - 90-day half-life prevents stale patterns
- **Anti-Pattern Learning** - Bad rules auto-convert to warnings
- **Trauma Guard** - Blocks dangerous commands learned from incidents
- **Cross-Agent Learning** - Works with Claude, Cursor, Codex, Aider, etc.

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

| Benefit | Impact |
|---------|---------|
| **Cost Savings** | 70-90% reduction for repeated prompts |
| **Speed** | <50ms for cache hits vs 2-5s for LLM |
| **RAM** | +50MB (negligible on 8GB) |
| **Disk** | ~50-100MB growing with usage |
| **Offline** | Works after first use |

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

## Task Tracking: Beads (bd)

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds


<!-- bv-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for issue tracking. Issues are stored in `.beads/` and tracked in git.

### Essential Commands

```bash
# View issues (launches TUI - avoid in automated sessions)
bv

# CLI commands for agents (use these instead)
bd ready              # Show issues ready to work (no blockers)
bd list --status=open # All open issues
bd show <id>          # Full issue details with dependencies
bd create --title="..." --type=task --priority=2
bd update <id> --status=in_progress
bd close <id> --reason="Completed"
bd close <id1> <id2>  # Close multiple issues at once
bd sync               # Commit and push changes
```

### Workflow Pattern

1. **Start**: Run `bd ready` to find actionable work
2. **Claim**: Use `bd update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `bd close <id>`
5. **Sync**: Always run `bd sync` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `bd ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `bd dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
bd sync                 # Commit beads changes
git commit -m "..."     # Commit code
bd sync                 # Commit any new beads changes
git push                # Push to remote
```

### Best Practices

- Check `bd ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always `bd sync` before ending session

<!-- end-bv-agent-instructions -->
