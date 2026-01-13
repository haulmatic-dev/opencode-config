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

If work is not associated with a Beads task:

1. Stop
2. Create a task with `bd`
3. Then proceed

Violations are expected to be blocked by enforcement.

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
- **semantic-search** (osgrep) — Embedding‑based code search
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
```

### Rules

- `.beads/` must never be edited manually
- Task state changes via `bd` or `bin/beads-api.mjs`
- Tasks define scope; agents execute only what the task specifies
- All work must be linked to a task

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
