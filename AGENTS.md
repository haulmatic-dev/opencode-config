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

## Task Tracking: Beads (bd) & Beads Viewer (bv)

This project uses [Beads](https://github.com/steveyegge/beads) for issue tracking and [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for intelligent task management. Issues are stored in `.beads/` and tracked in git.

### Quick Reference (Basic Commands)

```bash
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

---

## Beads Viewer (bv) - AI Agent Protocol

**⚠️ CRITICAL: Use ONLY `--robot-*` flags. Bare `bv` command launches interactive TUI that blocks your session.**

### The Workflow: Start With Triage

**`bv --robot-triage` is your single entry point.** It returns everything you need in one call:
- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps

```bash
# THE MEGA-COMMAND: start here
bv --robot-triage

# Alternative: Minimal output (single top pick + claim command)
bv --robot-next
```

### Robot Commands Reference

| Category | Command | Returns |
|-----------|----------|---------|
| **Triage** | `bv --robot-triage` | Recommendations, quick_wins, blockers_to_clear, project_health |
| **Planning** | `bv --robot-plan` | Parallel execution tracks with `unblocks` lists |
| **Priority** | `bv --robot-priority` | Priority misalignment detection with confidence |
| **Insights** | `bv --robot-insights` | Full metrics: PageRank, betweenness, HITS, eigenvector, critical path, cycles, k-core, articulation points, slack |
| **Label Health** | `bv --robot-label-health` | Per-label health: `health_level`, `velocity_score`, `staleness`, `blocked_count` |
| **Label Flow** | `bv --robot-label-flow` | Cross-label dependency: `flow_matrix`, `dependencies`, `bottleneck_labels` |
| **Label Attention** | `bv --robot-label-attention [--attention-limit=N]` | Attention-ranked labels by: (pagerank × staleness × block_impact) / velocity |
| **History** | `bv --robot-history` | Bead-to-commit correlations: `stats`, `histories`, `commit_index` |
| **Diff** | `bv --robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues, cycles introduced/resolved |
| **Burndown** | `bv --robot-burndown <sprint>` | Sprint burndown, scope changes, at-risk items |
| **Forecast** | `bv --robot-forecast <id\|all>` | ETA predictions with dependency-aware scheduling |
| **Alerts** | `bv --robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| **Suggestions** | `bv --robot-suggest` | Hygiene: duplicates, missing deps, label suggestions, cycle breaks |
| **Graph Export** | `bv --robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export |

### Scoping & Filtering

```bash
# Scope to specific label's subgraph
bv --robot-plan --label backend

# Historical point-in-time analysis
bv --robot-insights --as-of HEAD~30

# Pre-filter: ready to work (no blockers)
bv --recipe actionable --robot-plan

# Pre-filter: top PageRank scores
bv --recipe high-impact --robot-triage

# Group by parallel work streams
bv --robot-triage --robot-triage-by-track

# Group by domain
bv --robot-triage --robot-triage-by-label
```

### Understanding Robot Output

**All robot JSON includes:**
- `data_hash` — Fingerprint of source beads.jsonl (verify consistency across calls)
- `status` — Per-metric state: `computed|approx|timeout|skipped` + elapsed ms
- `as_of` / `as_of_commit` — Present when using `--as-of`; contains ref and resolved SHA

**Two-phase analysis:**
- **Phase 1 (instant):** degree, topo sort, density — always available immediately
- **Phase 2 (async, 500ms timeout):** PageRank, betweenness, HITS, eigenvector, cycles — check `status` flags

**For large graphs (>500 nodes):** Some metrics may be approximated or skipped. Always check `status`.

### jq Quick Reference

```bash
bv --robot-triage | jq '.quick_ref'                        # At-a-glance summary
bv --robot-triage | jq '.recommendations[0]'               # Top recommendation
bv --robot-plan | jq '.plan.summary.highest_impact'        # Best unblock target
bv --robot-insights | jq '.status'                         # Check metric readiness
bv --robot-insights | jq '.Cycles'                         # Circular deps (must fix!)
bv --robot-label-health | jq '.results.labels[] | select(.health_level == "critical")'
```

### Graph Metrics Explained

| Metric | Purpose | Key Insight |
|---------|----------|-------------|
| **PageRank** | Dependency importance | Foundational blockers (high PageRank = bedrock) |
| **Betweenness** | Shortest-path traffic | Bottlenecks & bridges (gatekeepers) |
| **HITS** | Hub/Authority duality | Epics vs. utilities (Hubs=Epics, Authorities=Utilities) |
| **Critical Path** | Longest dependency chain | Keystones with zero slack (delays impact project directly) |
| **Eigenvector** | Influence via neighbors | Strategic dependencies (connected to power players) |
| **Cycles** | Circular dependencies | **CRITICAL**: Must fix (logical impossibility) |
| **Density** | Edge-to-node ratio | Project coupling health (low=healthy, high=overly coupled) |

---

## Workflow Pattern

1. **Start**: Run `bv --robot-triage` to get recommendations
2. **Claim**: Use `bd update <id> --status in_progress` on recommended task
3. **Work**: Implement task
4. **Complete**: Use `bd close <id> --reason="Completed"`
5. **Sync**: Always run `bd sync` at session end
6. **Verify**: Run `bv --robot-history` to check changes

### Key Concepts

- **Dependencies**: Issues can block other issues. `bv --robot-triage` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `bd dep add <issue> <depends-on>` to add dependencies
- **Graph Metrics**: Use `bv --robot-insights` to detect bottlenecks, cycles, and critical paths

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

- **ALWAYS** use `bv --robot-*` commands for AI agents (never bare `bv`)
- Start sessions with `bv --robot-triage` to get intelligent recommendations
- Check for cycles with `bv --robot-insights | jq '.Cycles'`
- Use `bv --robot-label-health` to identify stuck domains
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Always `bd sync` before ending session

## Beads Plugin Integration

The Beads plugin (`plugin/beads.mjs`) provides automatic integration with task tracking via intelligent hooks:

### How It Works

**Automatic Context Injection (`agent.execute.before`):**
- Runs `bv --robot-triage` to get intelligent recommendations
- Formats triage data as system prompt
- Includes quick_ref, recommended tasks, quick_wins, blockers, project health

**Automatic Task Management (`agent.execute.after`):**
- Auto-claims recommended task (if `autoClaim` enabled)
- Auto-closes completed task (if `autoClose` enabled)
- Auto-syncs beads to git (if `autoSync` enabled)

### Configuration

**File:** `beads_config.json`

```json
{
  "enabled": true,
  "autoTriage": true,
  "autoClaim": false,
  "autoClose": true,
  "autoSync": false
}
```

**Options:**
- `enabled`: Enable/disable plugin globally
- `autoTriage`: Automatically run `bv --robot-triage` on agent start
- `autoClaim`: Auto-claim recommended task (use carefully - may conflict with manual claims)
- `autoClose`: Auto-close task after successful completion
- `autoSync`: Auto-sync beads to git after task completion

### Features

- **Intelligent Triage**: Automatic `bv --robot-triage` with formatted output
- **Graph Metrics**: Automatic cycle detection, bottleneck identification
- **Alerts**: Automatic stale issue and blocking cascade detection
- **Task Lifecycle**: Auto-claim and auto-close for seamless workflow
- **Git Integration**: Automatic beads sync to git

### Client API

**BeadsClient** - Basic task management:
```javascript
await beadsClient.ready();              // Get ready tasks
await beadsClient.show(id);            // Get task details
await beadsClient.update(id, options);   // Update task
await beadsClient.close(id, reason);    // Close task
await beadsClient.sync();               // Sync to git
```

**BeadsViewerClient** - Graph-aware intelligence:
```javascript
await bvClient.triage();             // Get recommendations (main entry point)
await bvClient.plan(options);          // Get execution plan
await bvClient.insights(options);     // Get graph metrics
await bvClient.alerts();            // Get alerts
await bvClient.history();           // Get history
await bvClient.labelHealth();       // Get label health
```

### Benefits over Manual Usage

| Before (Manual) | After (Plugin) |
|-----------------|----------------|
| Run `bv --robot-triage` manually | Automatic context injection |
| Manually claim/close tasks | Auto-claim and auto-close |
| Manually check for cycles | Automatic cycle detection |
| Manually sync beads | Auto-sync on completion |
| No triage in system prompt | Formatted triage in prompts |

### Integration Notes

- Works alongside GPTCache and cass_memory plugins
- No conflicts - each plugin handles separate concerns
- Plugin hooks run in order registered in `opencode.json`

<!-- end-bv-agent-instructions-v2 -->

---

## Beads Workflow Integration

This project uses [Beads](https://github.com/steveyegge/beads) for issue tracking and [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for intelligent task management. Issues are stored in `.beads/` and tracked in git.

### Quick Reference (Basic Commands)

```bash
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

---

## Beads Viewer (bv) - AI Agent Protocol

**⚠️ CRITICAL: Use ONLY `--robot-*` flags. Bare `bv` command launches interactive TUI that blocks your session.**

### The Workflow: Start With Triage

**`bv --robot-triage` is your single entry point.** It returns everything you need in one call:
- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps

```bash
# THE MEGA-COMMAND: start here
bv --robot-triage

# Alternative: Minimal output (single top pick + claim command)
bv --robot-next
```

### Robot Commands Reference

| Category | Command | Returns |
|-----------|----------|---------|
| **Triage** | `bv --robot-triage` | Recommendations, quick_wins, blockers_to_clear, project_health |
| **Planning** | `bv --robot-plan` | Parallel execution tracks with `unblocks` lists |
| **Priority** | `bv --robot-priority` | Priority misalignment detection with confidence |
| **Insights** | `bv --robot-insights` | Full metrics: PageRank, betweenness, HITS, eigenvector, critical path, cycles, k-core, articulation points, slack |
| **Label Health** | `bv --robot-label-health` | Per-label health: `health_level`, `velocity_score`, `staleness`, `blocked_count` |
| **Label Flow** | `bv --robot-label-flow` | Cross-label dependency: `flow_matrix`, `dependencies`, `bottleneck_labels` |
| **Label Attention** | `bv --robot-label-attention [--attention-limit=N]` | Attention-ranked labels by: (pagerank × staleness × block_impact) / velocity |
| **History** | `bv --robot-history` | Bead-to-commit correlations: `stats`, `histories`, `commit_index` |
| **Diff** | `bv --robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues, cycles introduced/resolved |
| **Burndown** | `bv --robot-burndown <sprint>` | Sprint burndown, scope changes, at-risk items |
| **Forecast** | `bv --robot-forecast <id\|all>` | ETA predictions with dependency-aware scheduling |
| **Alerts** | `bv --robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| **Suggestions** | `bv --robot-suggest` | Hygiene: duplicates, missing deps, label suggestions, cycle breaks |
| **Graph Export** | `bv --robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export |

### Scoping & Filtering

```bash
# Scope to specific label's subgraph
bv --robot-plan --label backend

# Historical point-in-time analysis
bv --robot-insights --as-of HEAD~30

# Pre-filter: ready to work (no blockers)
bv --recipe actionable --robot-plan

# Pre-filter: top PageRank scores
bv --recipe high-impact --robot-triage

# Group by parallel work streams
bv --robot-triage --robot-triage-by-track

# Group by domain
bv --robot-triage --robot-triage-by-label
```

### Understanding Robot Output

**All robot JSON includes:**
- `data_hash` — Fingerprint of source beads.jsonl (verify consistency across calls)
- `status` — Per-metric state: `computed|approx|timeout|skipped` + elapsed ms
- `as_of` / `as_of_commit` — Present when using `--as-of`; contains ref and resolved SHA

**Two-phase analysis:**
- **Phase 1 (instant):** degree, topo sort, density — always available immediately
- **Phase 2 (async, 500ms timeout):** PageRank, betweenness, HITS, eigenvector, cycles — check `status` flags

**For large graphs (>500 nodes):** Some metrics may be approximated or skipped. Always check `status`.

### jq Quick Reference

```bash
bv --robot-triage | jq '.quick_ref'                        # At-a-glance summary
bv --robot-triage | jq '.recommendations[0]'               # Top recommendation
bv --robot-plan | jq '.plan.summary.highest_impact'        # Best unblock target
bv --robot-insights | jq '.status'                         # Check metric readiness
bv --robot-insights | jq '.Cycles'                         # Circular deps (must fix!)
bv --robot-label-health | jq '.results.labels[] | select(.health_level == "critical")'
```

### Graph Metrics Explained

| Metric | Purpose | Key Insight |
|---------|----------|-------------|
| **PageRank** | Dependency importance | Foundational blockers (high PageRank = bedrock) |
| **Betweenness** | Shortest-path traffic | Bottlenecks & bridges (gatekeepers) |
| **HITS** | Hub/Authority duality | Epics vs. utilities (Hubs=Epics, Authorities=Utilities) |
| **Critical Path** | Longest dependency chain | Keystones with zero slack (delays impact project directly) |
| **Eigenvector** | Influence via neighbors | Strategic dependencies (connected to power players) |
| **Cycles** | Circular dependencies | **CRITICAL**: Must fix (logical impossibility) |
| **Density** | Edge-to-node ratio | Project coupling health (low=healthy, high=overly coupled) |

---

## Workflow Pattern

1. **Start**: Run `bv --robot-triage` to get recommendations
2. **Claim**: Use `bd update <id> --status=in_progress` on recommended task
3. **Work**: Implement task
4. **Complete**: Use `bd close <id> --reason="Completed"`
5. **Sync**: Always run `bd sync` at session end
6. **Verify**: Run `bv --robot-history` to check changes

### Key Concepts

- **Dependencies**: Issues can block other issues. `bv --robot-triage` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `bd dep add <issue> <depends-on>` to add dependencies
- **Graph Metrics**: Use `bv --robot-insights` to detect bottlenecks, cycles, and critical paths

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

- **ALWAYS** use `bv --robot-*` commands for AI agents (never bare `bv`)
- Start sessions with `bv --robot-triage` to get intelligent recommendations
- Check for cycles with `bv --robot-insights | jq '.Cycles'`
- Use `bv --robot-label-health` to identify stuck domains
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Always `bd sync` before ending session
