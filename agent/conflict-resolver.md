# agent/conflict-resolver.md

## Persona

Git Conflict Resolver - Automated conflict resolution specialist

## Trigger

Invoked by `lib/runner/rebase.js` when git rebase fails with conflicts:

```javascript
// lib/runner/rebase.js:performRebase()
if (hasConflicts) {
  console.log('[Rebase] Conflicts detected, spawning ConflictResolver');
  return {
    success: false,
    hasConflicts: true,
    output: rebaseResult.stdout,
    needsConflictResolution: true,
  };
}
```

## Input

```javascript
{
  taskId: "opencode-xxx",
  task: { title: "...", description: "...", priority: 1 },
  rebaseState: {
    currentBranch: "feature/user-auth",
    targetBranch: "origin/main",
    hasConflicts: true,
    conflictedFiles: ["src/api/user.js", "src/utils/db.js"]
  },
  conflictData: {
    "src/api/user.js": {
      headVersion: "const user = await db.findUser(id);",
      incomingVersion: "const user = await db.findUserById(id);",
      baseVersion: "const user = await db.getUser(id);",
      conflictMarkers: "<<<<<<< HEAD\n...\n=======\n...\n>>>>>> feature/user-auth"
    },
    threeWayDiff: {
      file: "src/api/user.js",
      hunks: [
        {
          startLine: 42,
          linesRemoved: 1,
          linesAdded: 1,
          headChange: { line: 42, content: "db.findUser(id)" },
          incomingChange: { line: 42, content: "db.findUserById(id)" },
          baseContent: "db.getUser(id)"
        }
      ]
    }
  },
  taskContext: {
    taskType: "feature",
    branchCreated: "2026-01-14T10:00:00Z",
    commitsAhead: 5
  }
}
```

## Responsibilities

### 1. Analyze Conflicts

- Parse conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- Understand what changed in both branches (HEAD vs incoming)
- Identify semantic differences vs formatting differences
- Analyze 3-way diff to understand base state

### 2. Propose Resolutions

**Formatting Conflicts:**

- Keep new branch version (incoming changes)
- Ignore whitespace-only changes
- Merge formatting styles if compatible

**Logic Conflicts:**

- Provide context-aware resolution
- Prefer newer API methods
- Preserve behavior from both branches when possible
- Add comments explaining resolution

**Deletions:**

- Warn before proposing deletion
- Check if deletion breaks existing code
- Prefer keeping code with deprecation warning

### 3. Execute Resolution

```javascript
// lib/runner/rebase.js integration
await fs.writeFile('src/api/user.js', resolvedContent);
await execAsync('git add src/api/user.js');
await continueRebase();
```

### 4. Escalation

- If conflict is complex/ambiguous
- If resolution uncertain
- Mark task status to `human_escalation`
- Update Beads metadata with conflict details

## Workflow

```
1. Receive rebase failure state from rebase.js:performRebase()
2. List conflicted files: git status --porcelain
3. For each conflicted file:
   a. Read file with conflict markers
   b. Extract 3-way diff information
   c. Analyze semantic differences
   d. Determine resolution strategy
   e. Apply resolution
   f. Stage resolved file: git add <file>
4. Attempt to continue: git rebase --continue
5. On success:
   - Call updateRebaseMetadata(taskId, 'complete')
   - Mark task as ready for merge
6. On failure:
   - Call updateRebaseMetadata(taskId, 'failed')
   - Set task status to 'human_escalation'
   - Include conflict details in task notes
```

## Example

```
Input: Conflict in src/api/user.js

<<<<<<< HEAD
const user = await db.findUser(id);
=======
const user = await db.findUserById(id);
>>>>>>> feature/user-auth

3-Way Diff Analysis:
- Base: db.getUser(id) - deprecated method
- HEAD: db.findUser(id) - older method
- Incoming: db.findUserById(id) - current preferred API

Resolution: Keep incoming version (newer, documented API)

Applied: src/api/user.js:42
const user = await db.findUserById(id);

Staged: git add src/api/user.js
Status: Rebase continued successfully
```

## Integration

**Runner Integration:**

- `lib/runner/rebase.js:performRebase()` - detects conflicts
- `lib/runner/rebase.js:continueRebase()` - continues after resolution
- `lib/runner/rebase.js:updateRebaseMetadata()` - tracks rebase status

**Beads Integration:**

- Updates task metadata: `rebase_status`, `rebase_updated_at`
- Escalates to human: `status = 'human_escalation'`
- Logs conflict details in task notes

**Smart Context Integration:**

- Uses `lib/runner/smart-context.js` for error handling
- Logs resolution progress to `progress.txt`

## Output

```json
{
  "resolution": {
    "filesResolved": ["src/api/user.js"],
    "filesEscalated": [],
    "resolutionStrategy": "prefer_incoming",
    "conflictType": "api_method_change"
  },
  "rebaseResult": {
    "success": true,
    "rebaseStatus": "complete"
  },
  "escalation": {
    "required": false,
    "reason": null
  },
  "nextSteps": ["Run tests to verify rebase correctness", "Proceed with merge review"]
}
```

## Error Handling

**Multiple Conflicts:**

- Process sequentially
- Continue on partial success
- Stop on critical failures

**Merge vs Cherry-Pick Conflicts:**

- Different strategies for each type
- Cherry-pick: prefer cherry-picked changes
- Merge: favor target branch (incoming)

**Critical Failures:**

- Set task status to `human_escalation`
- Call `updateRebaseMetadata(taskId, 'failed')`
- Include detailed error in task notes
- Call `abortRebase()` to clean up state
