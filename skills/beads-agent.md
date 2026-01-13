## Task Tracking: Beads (bd) & Beads Viewer (bv)

This project uses [Beads](https://github.com/steveyegge/beads) for issue tracking and [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for intelligent task management. Issues are stored in `.beads/` and tracked in git.

### Quick Reference (Basic Commands)

```bash
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd delete <id> --force  # Delete issues
bd sync               # Sync with git
```

---

## Beads Advanced Commands

### Deleting Issues

Delete single issue:

```bash
bd delete bd-123 --force
```

Delete with cascade (removes dependents):

```bash
bd delete bd-123 --cascade --force
```

Delete from file (batch):

```bash
bd delete --from-file deletions.txt --force
```

Preview before deleting:

```bash
bd delete bd-123 --dry-run
```

Permanent deletion (skip tombstones - DANGEROUS):

```bash
bd delete bd-123 --hard --force
```

Delete all issues:

```bash
ids=$(node bin/beads-api.mjs list | jq -r '.[].id' | tr '\n' ',' | sed 's/,$//') && node bin/beads-api.mjs delete "$ids" '{"cascade":true,"force":true}'
```

**Safety Notes:**

- Use `--force` only after `--dry-run` confirms correct targets
- `--hard` bypasses recovery - use only when absolutely certain
- Tombstones allow recovery via `bd sync` from remote

### Dependency Management

Add dependency:

```bash
bd dep add bd-2 bd-1              # bd-1 blocks bd-2
bd dep add bd-2 blocks:bd-1        # Explicit type
```

Remove dependency:

```bash
bd dep remove bd-2 bd-1
```

List dependencies:

```bash
bd dep list bd-2 dependents    # Show what bd-2 blocks
bd dep list bd-2 dependencies   # Show what blocks bd-2
```

Show dependency tree:

```bash
bd dep tree bd-1
```

Detect cycles:

```bash
bd dep cycles
```

### Advanced Filtering

Filter by status:

```bash
bd list --status open
bd list --status in_progress
```

Filter by priority:

```bash
bd list --priority-min 0 --priority-max 2
```

Filter by label:

```bash
bd list --label backend --label urgent
```

Filter by date ranges:

```bash
bd list --created-after "2025-01-01"
bd list --updated-after "30 days ago"
```

Search in content:

```bash
bd list --title-contains "bug"
bd list --desc-contains "performance"
```

Sort and limit:

```bash
bd list --sort priority --reverse --limit 10
```

### Search

Text search across title/description/ID:

```bash
bd search "authentication bug"
bd search "login" --status open --limit 10
bd search "bd-5q"  # Search by partial ID
```

### Label Management

Add labels:

```bash
bd label add bd-123 backend urgent
```

Remove labels:

```bash
bd label remove bd-123 urgent
```

List all labels:

```bash
bd label list-all
```

### Creating Issues

Basic create:

```bash
bd create "Fix authentication bug"
```

Full options:

```bash
bd create "Add user feedback feature" \
  --description "Implement feedback form..." \
  --type feature \
  --priority 1 \
  --labels backend,ui \
  --deps bd-42,bd-45 \
  --assignee alice \
  --estimate 120
```

Interactive form:

```bash
bd create-form
```

### Editing Issues

Edit description in $EDITOR:

```bash
bd edit bd-123
```

Edit specific field:

```bash
bd edit bd-123 --title
bd edit bd-123 --design
bd edit bd-123 --acceptance
```

### Issue State Management

Defer issue:

```bash
bd defer bd-123
bd defer bd-123 --until "next monday"
```

Undefer (restore):

```bash
bd undefer bd-123
```

Reopen closed issue:

```bash
bd reopen bd-123 --reason "Reopened for investigation"
```

Mark as duplicate:

```bash
bd duplicate bd-456 --of bd-123
```

Mark as superseded:

```bash
bd supersede bd-456 bd-789
```

### Comments

View comments:

```bash
bd comments bd-123
```

Add comment:

```bash
bd comments add bd-123 "This is blocking release"
```

### Views & Reports

Count issues:

```bash
bd count --status open
bd count --label backend --priority-min 0
```

Show stale issues:

```bash
bd stale --days 30 --status in_progress
```

Database status:

```bash
bd status
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

| Category            | Command                                                | Returns                                                                                                           |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Triage**          | `bv --robot-triage`                                    | Recommendations, quick_wins, blockers_to_clear, project_health                                                    |
| **Planning**        | `bv --robot-plan`                                      | Parallel execution tracks with `unblocks` lists                                                                   |
| **Priority**        | `bv --robot-priority`                                  | Priority misalignment detection with confidence                                                                   |
| **Insights**        | `bv --robot-insights`                                  | Full metrics: PageRank, betweenness, HITS, eigenvector, critical path, cycles, k-core, articulation points, slack |
| **Label Health**    | `bv --robot-label-health`                              | Per-label health: `health_level`, `velocity_score`, `staleness`, `blocked_count`                                  |
| **Label Flow**      | `bv --robot-label-flow`                                | Cross-label dependency: `flow_matrix`, `dependencies`, `bottleneck_labels`                                        |
| **Label Attention** | `bv --robot-label-attention [--attention-limit=N]`     | Attention-ranked labels by: (pagerank × staleness × block_impact) / velocity                                      |
| **History**         | `bv --robot-history`                                   | Bead-to-commit correlations: `stats`, `histories`, `commit_index`                                                 |
| **Diff**            | `bv --robot-diff --diff-since <ref>`                   | Changes since ref: new/closed/modified issues, cycles introduced/resolved                                         |
| **Burndown**        | `bv --robot-burndown <sprint>`                         | Sprint burndown, scope changes, at-risk items                                                                     |
| **Forecast**        | `bv --robot-forecast <id\|all>`                        | ETA predictions with dependency-aware scheduling                                                                  |
| **Alerts**          | `bv --robot-alerts`                                    | Stale issues, blocking cascades, priority mismatches                                                              |
| **Suggestions**     | `bv --robot-suggest`                                   | Hygiene: duplicates, missing deps, label suggestions, cycle breaks                                                |
| **Graph Export**    | `bv --robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export                                                                                           |

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

| Metric            | Purpose                  | Key Insight                                                |
| ----------------- | ------------------------ | ---------------------------------------------------------- |
| **PageRank**      | Dependency importance    | Foundational blockers (high PageRank = bedrock)            |
| **Betweenness**   | Shortest-path traffic    | Bottlenecks & bridges (gatekeepers)                        |
| **HITS**          | Hub/Authority duality    | Epics vs. utilities (Hubs=Epics, Authorities=Utilities)    |
| **Critical Path** | Longest dependency chain | Keystones with zero slack (delays impact project directly) |
| **Eigenvector**   | Influence via neighbors  | Strategic dependencies (connected to power players)        |
| **Cycles**        | Circular dependencies    | **CRITICAL**: Must fix (logical impossibility)             |
| **Density**       | Edge-to-node ratio       | Project coupling health (low=healthy, high=overly coupled) |

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

**CRITICAL: Never commit directly to main or master branch**

Before committing, verify you're not on main/master:

```bash
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  echo "ERROR: Cannot commit to $CURRENT_BRANCH"
  echo "Create a feature branch first: git checkout -b feature/your-work"
  exit 1
fi
```

### Best Practices

- **ALWAYS** use `bv --robot-*` commands for AI agents (never bare `bv`)
- Start sessions with `bv --robot-triage` to get intelligent recommendations
- Check for cycles with `bv --robot-insights | jq '.Cycles'`
- Use `bv --robot-label-health` to identify stuck domains
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Always `bd sync` before ending session
- **NEVER** commit to main or master branch - create a feature branch first

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
// CRUD Operations
await beadsClient.ready(); // Get ready tasks
await beadsClient.show(id); // Get task details
await beadsClient.update(id, options); // Update task
await beadsClient.close(id, reason); // Close task
await beadsClient.sync(); // Sync to git
await beadsClient.delete(ids, options); // Delete issues
await beadsClient.create(options); // Create issue
await beadsClient.edit(id, field); // Edit issue field
await beadsClient.reopen(ids, reason); // Reopen issues

// Search & Filtering
await beadsClient.search(query, filters); // Search issues
await beadsClient.list(filters); // List with filters
await beadsClient.count(filters); // Count issues

// Issue State
await beadsClient.defer(ids, until); // Defer issues
await beadsClient.undefer(ids); // Undefer issues
await beadsClient.duplicate(id, canonicalId); // Mark duplicate
await beadsClient.supersede(id, successorId); // Mark superseded

// Comments
await beadsClient.addComment(id, comment); // Add comment

// Labels
await beadsClient.addLabel(ids, labels); // Add labels
await beadsClient.removeLabel(ids, labels); // Remove labels

// Dependencies
await beadsClient.depAdd(blockedId, blockerId, type); // Add dependency
await beadsClient.depRemove(blockedId, blockerId); // Remove dependency
await beadsClient.depList(id, direction); // List deps/dependents
await beadsClient.depTree(id); // Show dependency tree
await beadsClient.depCycles(); // Detect cycles

// Reports
await beadsClient.stale(options); // Show stale issues
await beadsClient.status(); // Database status
```

**BeadsViewerClient** - Graph-aware intelligence:

```javascript
// Core Robot Commands
await bvClient.triage(); // Get recommendations (main entry point)
await bvClient.next(); // Single top pick (minimal triage)
await bvClient.plan(options); // Get execution plan
await bvClient.insights(options); // Get graph metrics
await bvClient.alerts(); // Get alerts
await bvClient.history(); // Get history
await bvClient.labelHealth(); // Get label health

// Analysis Commands
await bvClient.capacity(options); // Capacity simulation
await bvClient.drift(options); // Drift detection
await bvClient.checkDrift(); // Check drift
await bvClient.saveBaseline(description); // Save baseline

// Search Commands
await bvClient.search(query, options); // Semantic search

// File Analysis
await bvClient.fileBeads(filePath); // Beads touching file
await bvClient.fileHotspots(); // Files touched most often
await bvClient.fileRelations(filePath); // Files that co-change

// Impact Analysis
await bvClient.impact(filePaths); // Analyze file impact
await bvClient.impactNetwork(beadId); // Bead impact network

// Relationship Analysis
await bvClient.related(beadId); // Related beads
await bvClient.causality(beadId); // Causal chain
await bvClient.blockerChain(beadId); // Full blocker chain

// Correlation Commands
await bvClient.correlationStats(); // Correlation statistics
await bvClient.confirmCorrelation(sha, beadId); // Confirm correlation
await bvClient.rejectCorrelation(sha, beadId); // Reject correlation
await bvClient.explainCorrelation(sha, beadId); // Explain correlation

// Orphans & Sprints
await bvClient.orphans(); // Orphan commit candidates
await bvClient.sprintList(); // List sprints
await bvClient.sprintShow(sprintId); // Show sprint details
await bvClient.recipes(); // Available recipes

// Export Commands
await bvClient.exportMd(outputPath); // Export Markdown
await bvClient.exportGraph(outputPath, format); // Export graph
```

### Benefits over Manual Usage

| Before (Manual)                  | After (Plugin)              |
| -------------------------------- | --------------------------- |
| Run `bv --robot-triage` manually | Automatic context injection |
| Manually claim/close tasks       | Auto-claim and auto-close   |
| Manually check for cycles        | Automatic cycle detection   |
| Manually sync beads              | Auto-sync on completion     |
| No triage in system prompt       | Formatted triage in prompts |

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

| Category            | Command                                                | Returns                                                                                                           |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Triage**          | `bv --robot-triage`                                    | Recommendations, quick_wins, blockers_to_clear, project_health                                                    |
| **Planning**        | `bv --robot-plan`                                      | Parallel execution tracks with `unblocks` lists                                                                   |
| **Priority**        | `bv --robot-priority`                                  | Priority misalignment detection with confidence                                                                   |
| **Insights**        | `bv --robot-insights`                                  | Full metrics: PageRank, betweenness, HITS, eigenvector, critical path, cycles, k-core, articulation points, slack |
| **Label Health**    | `bv --robot-label-health`                              | Per-label health: `health_level`, `velocity_score`, `staleness`, `blocked_count`                                  |
| **Label Flow**      | `bv --robot-label-flow`                                | Cross-label dependency: `flow_matrix`, `dependencies`, `bottleneck_labels`                                        |
| **Label Attention** | `bv --robot-label-attention [--attention-limit=N]`     | Attention-ranked labels by: (pagerank × staleness × block_impact) / velocity                                      |
| **History**         | `bv --robot-history`                                   | Bead-to-commit correlations: `stats`, `histories`, `commit_index`                                                 |
| **Diff**            | `bv --robot-diff --diff-since <ref>`                   | Changes since ref: new/closed/modified issues, cycles introduced/resolved                                         |
| **Burndown**        | `bv --robot-burndown <sprint>`                         | Sprint burndown, scope changes, at-risk items                                                                     |
| **Forecast**        | `bv --robot-forecast <id\|all>`                        | ETA predictions with dependency-aware scheduling                                                                  |
| **Alerts**          | `bv --robot-alerts`                                    | Stale issues, blocking cascades, priority mismatches                                                              |
| **Suggestions**     | `bv --robot-suggest`                                   | Hygiene: duplicates, missing deps, label suggestions, cycle breaks                                                |
| **Graph Export**    | `bv --robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export                                                                                           |

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

| Metric            | Purpose                  | Key Insight                                                |
| ----------------- | ------------------------ | ---------------------------------------------------------- |
| **PageRank**      | Dependency importance    | Foundational blockers (high PageRank = bedrock)            |
| **Betweenness**   | Shortest-path traffic    | Bottlenecks & bridges (gatekeepers)                        |
| **HITS**          | Hub/Authority duality    | Epics vs. utilities (Hubs=Epics, Authorities=Utilities)    |
| **Critical Path** | Longest dependency chain | Keystones with zero slack (delays impact project directly) |
| **Eigenvector**   | Influence via neighbors  | Strategic dependencies (connected to power players)        |
| **Cycles**        | Circular dependencies    | **CRITICAL**: Must fix (logical impossibility)             |
| **Density**       | Edge-to-node ratio       | Project coupling health (low=healthy, high=overly coupled) |

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

**CRITICAL: Never commit directly to main or master branch**

Before committing, verify you're not on main/master:

```bash
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  echo "ERROR: Cannot commit to $CURRENT_BRANCH"
  echo "Create a feature branch first: git checkout -b feature/your-work"
  exit 1
fi
```

### Best Practices

- **ALWAYS** use `bv --robot-*` commands for AI agents (never bare `bv`)
- Start sessions with `bv --robot-triage` to get intelligent recommendations
- Check for cycles with `bv --robot-insights | jq '.Cycles'`
- Use `bv --robot-label-health` to identify stuck domains
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Always `bd sync` before ending session
- **NEVER** commit to main or master branch - create a feature branch first

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
