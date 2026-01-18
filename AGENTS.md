# Agent Instructions

This project uses **two systems** for memory and task tracking:

- **bd** (beads) — Issue tracking and task management (**source of truth**)
- **cm** (cass_memory) — Cross-agent learning and procedural memory (advisory)

Enforcement is implemented programmatically (command interception, git hooks, runner guards). If instructions conflict with enforcement, **enforcement always wins**.

---

## Hard Constraints (Non‑Negotiable)

Agents **MUST NOT**:

- Perform work without an active Beads task
- Modify or delete `.beads/` directly (use `bd` commands only)
- Implement improvements outside the current task scope
- Create, modify, or merge work without task linkage
- Commit directly to shared branches (`main`, `master`, `develop`)
- Execute sequentially without explicit Beads dependency

If work is not associated with a Beads task:

1. Stop
2. Create a task with `bd`
3. Then proceed

Violations are expected to be blocked by enforcement.

---

## Parallel Execution Default

- All tasks execute in parallel by default
- Sequential requires explicit Beads dependency
- File reservations required for parallel work
- Orchestrator checks for dependencies before sequential

---

## Available Agents

### Primary Agents (Tab Completion)

- **orchestrator** — Master coordinator (COORDINATION vs DIRECT modes)
- **prd** — Product Requirements Document generator
- **generate-tasks** — Atomic task breakdown with dependencies

### Internal Research Droids (Not user‑invocable)

- **task-coordinator** — Beads task creation + MCP notifications
- **codebase-researcher** — Architecture & pattern discovery
- **git-history-analyzer** — Change evolution analysis
- **context-researcher** — Project‑wide context gathering
- **best-practices-researcher** — Industry & competitive analysis
- **library-source-reader** — Third‑party library deep dives
- **domain-specialist** — Domain & compliance expertise
- **semantic-search** (TLDR) — 5-layer code analysis with semantic search
- **file-picker-agent** — Targeted file discovery
- **figma-design-extractor** — Figma design token extraction

### Skills

- **task-breakdown** — Feature → tasks
- **feature-planning** — End‑to‑end PRD generation
- **complex-project** — Enterprise‑scale planning

---

## Task Management: Beads (bd)

Beads is the **only authoritative system** for work tracking. All work must map to a Beads task stored in `.beads/` and tracked in git.

### Quick Reference

```bash
# Using bd CLI directly
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git

# Using beads-api.mjs (recommended for programmatic access)
node bin/beads-api.mjs list                    # List all tasks (JSON)
node bin/beads-api.mjs count                   # Count tasks
node bin/beads-api.mjs bvTriage                # Get AI recommendations
node bin/beads-api.mjs create '{"title":"...","priority":1}'  # Create task
node bin/beads-api.mjs delete <ids> '{"force":true}'  # Delete tasks

# Using beads_tools (native opencode tools - agents can call directly)
beads_list --filters '{"status":"open"}'
beads_show --id "opencode-abc"
beads_create --options '{"title":"Fix bug","priority":1}'
beads_update --id "opencode-abc" --options '{"status":"in_progress"}'
beads_close --id "opencode-abc"
beads_ready
bv_triage
bv_next
bv_insights
```

### Rules

- `.beads/` must never be edited manually
- Task state changes via `bd`, `bin/beads-api.mjs`, or `beads_*`/`bv_*` tools
- Tasks define scope; agents execute only what the task specifies
- All work must be linked to a task

### Available Tools

**Beads Management (beads\_\*):**
| Tool | Description |
|------|-------------|
| `beads_list` | List tasks with optional filters |
| `beads_show` | Show task details |
| `beads_create` | Create a new task |
| `beads_update` | Update task status/fields |
| `beads_close` | Close a completed task |
| `beads_delete` | Delete tasks |
| `beads_ready` | Get actionable tasks |
| `beads_count` | Count tasks |
| `beads_status` | Get database status |
| `beads_sync` | Sync to git |
| `beads_reopen` | Reopen a closed task |
| `beads_dep_add` | Add dependency |
| `beads_dep_remove` | Remove dependency |
| `beads_dep_tree` | Show dependency tree |
| `beads_dep_cycles` | Check for cycles |
| `beads_add_label` | Add labels |
| `beads_remove_label` | Remove labels |
| `beads_search` | Search tasks |
| `beads_stale` | Find stale tasks |

**Beads Viewer (bv\_\*):**
| Tool | Description |
|------|-------------|
| `bv_triage` | AI-powered task recommendations |
| `bv_next` | Next recommended task |
| `bv_insights` | Graph insights (bottlenecks, cycles) |
| `bv_alerts` | Stale issues, blocking cascades |
| `bv_file_beads` | Tasks related to a file |
| `bv_file_hotspots` | High-change files |
| `bv_impact` | Impact analysis for files |
| `bv_impact_network` | Impact network for a task |
| `bv_related` | Related tasks |
| `bv_causality` | Causality chain |
| `bv_blocker_chain` | Blocker chain |
| `bv_orphans` | Orphaned tasks |
| `bv_history` | Git-history correlations |
| `bv_label_health` | Label health metrics |
| `bv_check_drift` | Baseline drift check |
| `bv_recipes` | Available recipes |
| `bv_sprint_list` | List sprints |
| `bv_sprint_show` | Sprint details |
| `bv_capacity` | Capacity recommendations |
| `bv_drift` | Drift analysis |
| `bv_search` | Semantic search |

For comprehensive Beads documentation including advanced commands, dependency management, and workflow integration, see **[skills/beads-agent.md](./skills/beads-agent.md)**.

---

## Memory System: cass_memory (cm)

Cass Memory provides **cross‑agent learning** and historical guidance.

**Important:** cass_memory is **advisory only**. It must not expand task scope, override Beads, or justify additional work.

### Usage

```bash
cm context "task" --json
```

Returns:

- relevantBullets — Evidence‑backed rules
- antiPatterns — Pitfalls to avoid
- historySnippets — Similar past sessions
- suggestedCassQueries — Deeper investigation searches

### Integration

Cass Memory is integrated via opencode plugin (`plugin/cass.mjs`) and configuration (`cass_config.json`).

```json
{
  "enabled": true,
  "contextLimit": 5,
  "autoInject": true
}
```

---

## Prompt Caching (GPTCache)

opencode uses GPTCache to reduce cost and latency for repeated prompts.

- Local SQLite backend (no Redis required)
- Automatic startup via `opencode-init`
- Cache location: `~/.gptcache/sqlite.db`
- Server: gptcache_server, Port: 8000

Cached items:

- Agent initialization prompts
- Common task patterns
- Repeated context queries

---

## Static Analysis & Security: UBS

UBS (Ultimate Bug Scanner) is the **mandatory static analysis gate**.

### Golden Rule

```bash
ubs <changed-files>
```

Exit codes:

- `0` → safe to proceed
- `>0` → fix issues before continuing

### Integration

UBS is integrated via opencode plugin (`plugin/ubs.mjs`) and configuration (`ubs_config.json`).

Runs at:

- Session start (health check)
- Pre‑agent execution (changed files)
- Post‑agent execution (regression detection)
- Quality gate before commit

**Critical findings must always be resolved before proceeding.**

---

## Agent Mental Model

Agents are **executors**, not owners.

- Beads defines _what_ to do
- Agents decide _how_ to do it
- Enforcement decides _whether it is allowed_

When uncertain:

- Prefer stopping over guessing
- Prefer creating a task over expanding scope
- Prefer loud failure over silent progress

---

## Summary

- Beads is the source of truth for work tracking
- cass_memory is advisory guidance only
- Enforcement is real and programmatic
- UBS is mandatory for static analysis
- No task → no work
- No shortcuts around the system
