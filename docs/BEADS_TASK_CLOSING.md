# Beads Task Closing Best Practices

## Problem

When closing tasks via `bd update --status closed`, Beads enforces a CHECK constraint:

```sql
(status = 'closed' AND closed_at IS NOT NULL)
```

Without providing a `--session` parameter or `closed_at` timestamp, the database rejects the update with:

```
CHECK constraint failed: (status = 'closed' AND closed_at IS NOT NULL)
```

## Solution

### Always Provide Session ID

When closing tasks, you **must** provide one of:

1. **Explicit `--session` parameter:**

   ```bash
   bd update opencode-xxx --session "ses_$(date +%s)" --status closed --notes "Completed: reason"
   ```

2. **Use `CLAUDE_SESSION_ID` environment variable:**

   ```bash
   export CLAUDE_SESSION_ID="ses_$(date +%s)"
   bd update opencode-xxx --status closed --notes "Completed: reason"
   ```

3. **Close via JSON with `closed_at`:**
   ```javascript
   const timestamp = new Date().toISOString();
   // Include in update JSON
   ```

### Why This Matters

- **Database integrity:** Beads maintains audit trails and prevents incomplete task states
- **Dependency tracking:** Proper closing triggers automatic dependency unblocking
- **Sync consistency:** Daemon correctly processes closed tasks for JSONL export
- **Task lifecycle:** Prevents tasks stuck in "in_progress" limbo

## Examples

### Correct ✅

```bash
# Closing a task with session ID
bd update opencode-ej0 --session "ses_$(date +%s)" --status closed --notes "Completed: Scaffold directory structure"

# Batch closing with session IDs
for task_id in opencode-04f opencode-1d5 opencode-y4w; do
  bd update "$task_id" --session "ses_$(date +%s)" --status closed --notes "Completed: Phase 2 gates"
done
```

### Incorrect ❌

```bash
# Missing session ID - will fail CHECK constraint
bd update opencode-ej0 --status closed --notes "Completed: Scaffold directory structure"

# Will result in:
# Error: CHECK constraint failed
```

## Debugging Task Closing Issues

### 1. Check Task Status Directly

```bash
sqlite3 .beads/beads.db "SELECT id, status, closed_at FROM issues WHERE id = 'opencode-xxx'"
```

### 2. Verify Database Not Locked

```bash
ps aux | grep -E "bd.*daemon"
# If daemon running, it may lock database during updates

# Kill daemon if needed (for manual DB manipulation)
kill $(cat .beads/daemon.pid)
rm .beads/daemon.pid .beads/daemon.lock
```

### 3. Manual Database Fix

If task status is stuck:

```bash
# Force close with timestamp
SESSION_ID="ses_$(date +%s)" && \
sqlite3 .beads/beads.db \
  "UPDATE issues SET status = 'closed', closed_at = datetime('now') WHERE id = 'opencode-xxx'"

# Then restart daemon
bd daemon --start
```

### 4. Verify Unblocking Works

After closing blocking tasks, verify dependent tasks become ready:

```bash
bd ready
# Should show newly unblocked tasks
```

## Process Improvement Recommendations

### 1. Automation

Create a shell function to simplify closing tasks:

```bash
function bd_close() {
  local task_id="$1"
  local reason="$2"
  bd update "$task_id" --session "ses_$(date +%s)" --status closed --notes "Completed: $reason"
}

# Usage:
bd_close opencode-ej0 "Scaffold directory structure"
```

### 2. Subagent Training

When launching subagents to complete tasks:

```javascript
// Subagent prompt should include:
"After completing the task, the subagent MUST report completion with:
1. Confirmation that implementation matches requirements
2. Any issues encountered
3. Files created/modified
4. Do NOT close the task - let the orchestrator close it with --session"
```

### 3. Daemon Management

- **Before bulk updates:** Stop daemon to prevent lock issues
- **After bulk updates:** Force sync (`bd export --format jsonl`)
- **After closing tasks:** Restart daemon for proper auto-sync

### 4. Validation Checklist

Before closing a task, verify:

- [ ] All requirements from task description implemented
- [ ] Code tested (if applicable)
- [ ] No syntax errors (`node --check file.js`)
- [ ] Dependencies properly resolved
- [ ] Session ID available (`echo ses_$(date +%s)`)
- [ ] Notes field populated with completion reason

## Related Documentation

- [Plugin README](../plugin/README.md) - Plugin architecture
- [Atomic Task Implementation](./ATOMIC_TASK_IMPLEMENTATION_STEPS.md) - Task workflow
- [Beads Guardrails Setup](./BEADS_GUARDRAILS_SETUP.md) - Guardrails configuration
- [Beads CLI Reference](https://github.com/beads-org/beads) - Full CLI documentation
