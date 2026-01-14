# Agent Runner Usage Guide

This guide covers how to use the agent runner system for autonomous task execution.

---

## Running the Runner

### Basic Command

```bash
node lib/runner/index.js --task <TASK_ID> --agent <AGENT_TYPE>
```

**Parameters:**

- `--task`: Beads task ID (e.g., `opencode-abc123`)
- `--agent`: Agent type from workflow (e.g., `planning`, `coding`, `testing`)

### Example

```bash
node lib/runner/index.js --task opencode-abc123 --agent planning
```

This starts the workflow at the `planning` stage for task `opencode-abc123`.

---

## Workflow Types

Workflows are code-driven state machines defined in `lib/workflows/`.

### Feature Development (`lib/workflows/feature-dev.js`)

Standard feature development lifecycle:

```
planning → coding → testing → security_audit → merge_authority
```

**Stages:**

1. **Planning:** Analyze requirements, create implementation plan
2. **Coding:** Implement feature with TDD
3. **Testing:** Run test suite, verify coverage
4. **Security Audit:** Adversarial code review
5. **Merge Authority:** Final verification and merge

### Migration (`lib/workflows/migration.js`)

Specialized workflow for schema changes and data backfills:

```
additive_schema → backfill_dryrun → execution (blocked) → constraint_enforcement → cleanup
```

**Special Behavior:**

- Stages 1, 2, 4, 5: Autonomous
- Stage 3 (Execution): Requires human approval
- Tasks marked with `irreversible: true` stop and wait for human

---

## Flow States

The Runner manages tasks through several states:

### Task States (in Beads)

| State         | Description                              |
| ------------- | ---------------------------------------- |
| `OPEN`        | Task created, awaiting execution         |
| `IN_PROGRESS` | Agent currently executing                |
| `VERIFYING`   | Quality gates running                    |
| `REVIEW`      | Adversarial review in progress           |
| `BLOCKED`     | Waiting on dependency or human approval  |
| `FAILED`      | Task failed after retry budget exhausted |
| `CLOSED`      | Task completed successfully              |

### Agent Execution States

1. **Setup Phase**
   - Checkout task branch
   - Load workflow state
   - Parse `progress.txt`

2. **Execution Phase**
   - Load agent markdown
   - Invoke LLM with context
   - Stream logs

3. **Gatekeeping Phase**
   - Run configured gates
   - Pass → Continue
   - Fail → Fix loop or escalation

4. **Handoff Phase**
   - Update Beads status
   - Write learnings to `progress.txt`
   - Spawn next agent
   - Exit

---

## Interpreting Logs

The Runner streams structured logs to the UI and file system.

### Log Output Format

```
[2025-01-14 10:23:45] [INFO] Runner started for task opencode-abc123
[2025-01-14 10:23:45] [INFO] Checkout branch beads/opencode-abc123
[2025-01-14 10:23:46] [INFO] Loading workflow: feature-dev
[2025-01-14 10:23:46] [INFO] Current stage: planning
[2025-01-14 10:23:47] [INFO] Loading agent: agent/planning.md
[2025-01-14 10:23:48] [INFO] Context distillation complete: 23 files
[2025-01-14 10:24:15] [GATE] Running: tdd
[2025-01-14 10:24:16] [GATE] TDD PASSED: 3/3 tests
[2025-01-14 10:24:16] [GATE] Running: lint
[2025-01-14 10:24:17] [GATE] LINT FAILED: 2 issues found
[2025-01-14 10:24:17] [INFO] Entering fix loop (attempt 1/3)
```

### Log Levels

- `INFO`: General execution flow
- `GATE`: Quality gate results
- `WARN`: Non-critical issues
- `ERROR`: Failures requiring attention
- `DEBUG`: Detailed debugging information

---

## Interpreting `progress.txt`

`progress.txt` accumulates "learnings" from each agent in the chain. It's read during Context Distillation to prime subsequent agents with discovered gotchas.

### Format

```
## Stage: planning (2025-01-14 10:23:48)

**Decision:**
- Use existing auth system (src/auth/index.js)
- Implement new endpoints in src/api/users.js

**Gotchas:**
- Legacy auth middleware expects headers differently
- Test fixtures in __tests__/fixtures/users.json are outdated

---

## Stage: coding (2025-01-14 10:35:12)

**Implementation Notes:**
- Added src/services/user-service.js
- Updated src/auth/middleware.js for new header format

**Fixes Applied:**
- TDD failure: test needed to account for async behavior
- Fixed by adding await to async test cases
```

### How It's Used

When the next agent starts, it receives distilled context including:

1. The most recent 3-5 entries from `progress.txt`
2. Key decisions made by previous agents
3. Gotchas discovered (e.g., "this module is buggy")
4. Specific fixes applied

This prevents agents from repeating mistakes and provides situational awareness.

---

## Troubleshooting

### Common Issues

#### Task Fails at Gate

**Symptom:** Agent completes work, but gate fails (e.g., TDD, Lint)

**Diagnosis:**

1. Check logs for specific gate failure message
2. Review gate output in terminal
3. Examine `progress.txt` for recent fixes

**Actions:**

- If retry budget not exhausted: Runner auto-enters fix loop
- If retry exhausted: Task marked `FAILED`, requires manual intervention
- Check Beads metadata: `bd show <id>` to see failure fingerprint

#### Handoff Fails to Spawn Next Agent

**Symptom:** Agent completes successfully, but workflow stops

**Diagnosis:**

1. Check workflow definition in `lib/workflows/`
2. Verify next agent exists in `agent/`
3. Check Beads for race conditions or missing metadata

**Actions:**

- Manually resume: `node lib/runner/index.js --task <id> --agent <next_agent>`
- Verify workflow configuration
- Check Beads task status

#### Git Rebase Conflict

**Symptom:** Runner stops at startup with "Rebase conflict detected"

**Diagnosis:**

1. `git fetch origin main` showed new commits
2. Automatic rebase produced conflicts

**Actions:**

- Runner spawns `ConflictResolver` agent automatically
- Monitor resolver output
- If resolver fails, manual intervention required:
  ```bash
  cd /path/to/repo
  git status
  # Resolve conflicts manually
  git rebase --continue
  ```

#### Irreversible Action Blocked

**Symptom:** Task status `BLOCKED`, workflow stopped

**Diagnosis:**

1. Check task metadata: `metadata.irreversible === true`
2. Human approval required

**Actions:**

1. Review proposed changes
2. Approve: `bd update <id> --metadata.approval_granted=true`
3. Resume workflow: `node lib/runner/index.js --task <id> --agent <next_agent>`

#### Duplicate Fix Tasks

**Symptom:** Multiple identical fix tasks appear in Beads

**Diagnosis:**

1. Failure fingerprinting may not be working
2. Or multiple parallel agents hit same error simultaneously

**Actions:**

- Check Beads for tasks with same failure fingerprint
- Use `bv_blocker_chain` to identify dependencies
- Mark duplicates as dependent on root cause task
- Close duplicates manually if needed

### Debugging Commands

#### View Current Task State

```bash
bd show <task_id>
```

Check:

- `status`: Current state
- `metadata.current_agent`: Which agent is running
- `metadata.attempt`: Retry count
- `metadata.last_gate_failure`: Specific failure

#### View Workflow Progress

```bash
cat beads/<task_id>/progress.txt
```

Review decisions, gotchas, and fixes applied so far.

#### Check for Dependency Cycles

```bash
bd dep cycles
```

Prevents infinite loops in fix tasks.

#### View Related Tasks

```bash
bv_impact_network --beadId <task_id>
```

See which other tasks are blocked by or blocking this task.

#### Next Recommended Task

```bash
bv_next
```

Get AI-powered recommendations for next actionable task.

### Manual Recovery

Sometimes automatic recovery fails. To manually resume:

1. **Identify where workflow stopped**

   ```bash
   bd show <task_id>
   ```

2. **Check git state**

   ```bash
   cd /path/to/repo
   git status
   git log --oneline -5
   ```

3. **Resume at next agent**

   ```bash
   node lib/runner/index.js --task <task_id> --agent <next_agent_type>
   ```

4. **If in fix loop, check retry budget**
   ```bash
   bd show <task_id> | grep retry
   ```

---

## Best Practices

### Before Running

1. **Ensure Beads is synced:**

   ```bash
   bd sync
   ```

2. **Verify workflow exists:**

   ```bash
   ls lib/workflows/
   ```

3. **Check agent definitions:**
   ```bash
   ls agent/
   ```

### During Execution

1. **Monitor logs in real-time**
2. **Watch `progress.txt` for learnings**
3. **Check Beads status after each stage:**
   ```bash
   bd show <task_id>
   ```

### After Completion

1. **Review `progress.txt` for final summary**
2. **Verify task is closed:**
   ```bash
   bd show <task_id>
   ```
3. **Check git status:**
   ```bash
   cd /path/to/repo
   git log --oneline -5
   ```

---

## Performance Tips

- **Parallel execution:** Can run multiple independent tasks simultaneously
- **Context caching:** Smart context reduces prompt size
- **Failure fingerprinting:** Deduplication prevents duplicate work
- **Graph compaction:** Automatic resolution of blocked tasks
