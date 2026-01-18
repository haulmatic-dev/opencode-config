# OpenCode Runtime Specification

## 1. System Purpose

The AI agent may perform software engineering tasks within the scope of an active Beads task.

The AI agent must never:

- Perform work without an active Beads task
- Install, modify, or configure system tools or dependencies
- Modify or delete `.beads/` directory contents directly
- Expand task scope beyond what Beads task specifies
- Commit directly to shared branches (main, master, develop)
- Invent configuration, thresholds, or quality standards

Success is defined as:

- All required quality gates passing (UBS: 0 critical, Biome: 0 errors, Tests: 100% pass)
- Task closed via `bd close` with reason
- Code committed to task-specific branch (`beads/task-{id}`)
- Changes synced to git

---

## 2. Authoritative Sources of Truth

| Domain             | Authoritative System | Notes                                     |
| ------------------ | -------------------- | ----------------------------------------- |
| Task state         | Beads CLI (bd)       | Single source of truth for task tracking  |
| Code state         | Git                  | Single source of truth for code           |
| Quality validation | UBS + Biome          | Static analysis results are authoritative |
| Context selection  | TLDR                 | 5-layer code analysis is authoritative    |
| Memory / learning  | cass_memory          | Advisory only, never overrides Beads      |
| Agent execution    | Relay Runner         | Agent lifecycle is authoritative          |

---

## 3. Global Invariants (Hard Rules)

The AI agent must never violate these rules:

1. The AI must never perform work without an active Beads task.
2. The AI must never modify or delete `.beads/` directory contents directly.
3. The AI must never commit directly to shared branches (main, master, develop).
4. The AI must never install, configure, or modify system tools or dependencies.
5. The AI must never expand task scope beyond what the Beads task specifies.
6. The AI must never create, modify, or merge work without task linkage.
7. The AI must always use `bd update` to claim tasks (never modify task state directly).
8. The AI must always use `bd close` to complete tasks (never delete or modify bead files).
9. The AI must always run UBS before committing (`ubs <files>` must return exit code 0).
10. The AI must always run linting before committing (`biome check` must return 0 errors).
11. The AI must always create dependent fix tasks when quality gates fail.
12. The AI must never use TodoWrite tool when `.beads/` directory exists (beads-guardrails blocks this).

Violation of any invariant is a critical failure requiring immediate escalation.

---

## 4. Execution Lifecycle (Finite State Machine)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXECUTION STATE MACHINE                        │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌───────────────────┐     ┌───────────────────────┐
│    IDLE      │────▶│  TASK_CLAIMED     │────▶│   CONTEXT_LOADED      │
│              │     │                   │     │                       │
│ Entry: None  │     │ Entry:            │     │ Entry:                │
│ Exit: None   │     │ bd update --status│     │ TLDR context extract  │
│              │     │ in_progress       │     │ cass_memory context   │
│              │     │                   │     │                       │
│ Blocking:    │     │ Blocking:         │     │ Blocking:             │
│ None         │     │ Task already      │     │ TLDR unavailable      │
│              │     │ claimed           │     │ cass_memory failed    │
└──────────────┘     └───────────────────┘     └───────────────────────┘
       ▲                      │                         │
       │                      │                         │ Success: Continue
       │                      │ Failure:               │ Failure: ESCALATE
       │                      │ Retry 3x, then         │
       │                      │ ESCALATE               │
       │                      │                        │
       │                      ▼                        ▼
       │              ┌──────────────────────────────────────────────────┐
       │              │              EXECUTE_AGENT                       │
       │              │                                                  │
       │              │ Entry:                                            │
       │              │ Run agent implementation                         │
       │              │                                                  │
       │              │ Blocking:                                        │
       │              │ Agent timeout (600s)                             │
       │              │ Tool execution failure                           │
       │              │                                                  │
       └──────────────┤──────────────────────────────────────────────────┘
                      │                        │ Success: Continue
                      │ Failure:               │ Failure: CREATE_FIX_TASK
                      │ Retry 3x, then
                      │ ESCALATE
                      │
                      ▼
       ┌───────────────────────────────────────────────────────────────┐
       │                    RUN_QUALITY_GATES                          │
       │                                                               │
       │ Entry:                                                        │
       │ Run UBS scan: `ubs <files>`                                   │
       │ Run lint: `biome check <files>`                               │
       │ Run tests: `npm test` (if applicable)                         │
       │                                                               │
       │ Blocking:                                                     │
       │ UBS critical bugs found                                       │
       │ Biome errors found                                            │
       │ Tests failing                                                 │
       │                                                               │
       └───────────────────────────────────────────────────────────────┘
                      │                        │ Success: PROCEED_TO_COMMIT
                      │ Failure:               │ Failure: CREATE_FIX_TASK
                      │ Retry if transient
                      │ (network, timeout)
                      │
                      ▼
       ┌───────────────────────────────────────────────────────────────┐
       │                   PROCEED_TO_COMMIT                           │
       │                                                               │
       │ Entry:                                                        │
       │ Create commit on beads/task-{id} branch                       │
       │ Squash atomic commits                                         │
       │                                                               │
       │ Blocking:                                                     │
       │ Merge conflicts                                               │
       │ Uncommitted changes                                           │
       │                                                               │
       └───────────────────────────────────────────────────────────────┘
                      │                        │ Success: TASK_COMPLETE
                      │ Failure:               │ Failure: ESCALATE
                      │ Conflict resolver
                      │ agent invocation
                      │
                      ▼
       ┌───────────────────────────────────────────────────────────────┐
       │                     TASK_COMPLETE                             │
       │                                                               │
       │ Entry:                                                        │
       │ `bd close <id> --reason="Completed"`                          │
       │ `bd sync` (sync to git)                                       │
       │                                                               │
       │ Exit:                                                         │
       │ Return to IDLE state                                          │
       │                                                               │
       └───────────────────────────────────────────────────────────────┘


STATE DESCRIPTIONS:

IDLE
  - No active task
  - Agent is waiting for task assignment
  - Transitions: TASK_CLAIMED (when task acquired via bd update)

TASK_CLAIMED
  - Task has been claimed via `bd update --status in_progress`
  - Pre-execution validation
  - Transitions: CONTEXT_LOADED (success) or ESCALATE (failure)

CONTEXT_LOADED
  - TLDR context extracted for affected files
  - cass_memory context retrieved for task type
  - Pre-execution preparation complete
  - Transitions: EXECUTE_AGENT (success) or ESCALATE (failure)

EXECUTE_AGENT
  - Agent implementation runs
  - Code changes applied
  - Tool execution in progress
  - Transitions: RUN_QUALITY_GATES (success) or CREATE_FIX_TASK (failure)

RUN_QUALITY_GATES
  - UBS static analysis executed
  - Biome linting executed
  - Tests executed (if applicable)
  - All gates must pass
  - Transitions: PROCEED_TO_COMMIT (all gates pass) or CREATE_FIX_TASK (any gate fails)

PROCEED_TO_COMMIT
  - Atomic commit creation
  - Branch-specific commit
  - No direct main/master/develop commits
  - Transitions: TASK_COMPLETE (success) or ESCALATE (failure)

TASK_COMPLETE
  - Task closed via `bd close`
  - Changes synced via `bd sync`
  - Return to IDLE
  - Terminal state


TRANSITION TRIGGERS AND FAILURE BEHAVIOR:

| From State | To State | Trigger | Blocking Conditions | Failure Behaviour |
|------------|----------|---------|---------------------|-------------------|
| IDLE | TASK_CLAIMED | `bd update <id> --status in_progress` | Task already claimed | RETRY 3x, ESCALATE |
| TASK_CLAIMED | CONTEXT_LOADED | TLDR context + cass_memory context | TLDR unavailable, cass_memory failed | ESCALATE |
| CONTEXT_LOADED | EXECUTE_AGENT | Agent invocation | Agent timeout | RETRY 3x, ESCALATE |
| EXECUTE_AGENT | RUN_QUALITY_GATES | All tools executed | Tool execution error | RETRY 3x, ESCALATE |
| EXECUTE_AGENT | CREATE_FIX_TASK | Quality gate failure | Agent implementation failed | CREATE_FIX_TASK |
| RUN_QUALITY_GATES | PROCEED_TO_COMMIT | All gates pass | UBS critical, Biome errors, test failures | CREATE_FIX_TASK |
| RUN_QUALITY_GATES | CREATE_FIX_TASK | Any gate fails | See gate thresholds | CREATE_FIX_TASK |
| PROCEED_TO_COMMIT | TASK_COMPLETE | Commit successful | Merge conflicts | INVOKE conflict-resolver |
| PROCEED_TO_COMMIT | ESCALATE | Unresolvable conflict | Conflicts cannot be resolved | ESCALATE |
| Any | ESCALATE | Unrecoverable error | System failure, ambiguous state | TERMINATE |

ESCALATE: Stop execution, report error to human operator
CREATE_FIX_TASK: Create dependent Beads task for the failure, close current task
RETRY_N: Retry up to N times (N=3 for transient failures)
TERMINATE: Stop all execution immediately
```

---

## 5. Quality Gates

| Gate Name          | Enforced By       | Threshold                                | Failure Behaviour |
| ------------------ | ----------------- | ---------------------------------------- | ----------------- |
| UBS Critical Bugs  | UBS               | 0 critical bugs (exit code 0)            | CREATE_FIX_TASK   |
| UBS Security Vulns | UBS               | 0 security vulnerabilities (exit code 0) | CREATE_FIX_TASK   |
| Biome Errors       | Biome             | 0 errors (exit code 0)                   | CREATE_FIX_TASK   |
| Test Pass Rate     | npm test / vitest | 100% pass (exit code 0)                  | CREATE_FIX_TASK   |
| Test Coverage      | test-specialist   | ≥80% coverage                            | CREATE_FIX_TASK   |
| Commit Branch      | Git               | Must be `beads/task-{id}` branch         | REJECT_COMMIT     |
| Linting            | biome check       | 0 errors, 0 warnings (optional)          | WARN_ONLY         |

Gates marked with CREATE_FIX_TASK trigger dependent task creation and must always pass before commit.

---

## 6. Tooling Model

### Beads CLI (bd)

| Attribute                 | Definition                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Purpose                   | Dependency-aware task tracking with git persistence                                      |
| Allowed operations        | `bd ready`, `bd show <id>`, `bd create`, `bd update`, `bd close`, `bd sync`, `bd doctor` |
| Forbidden operations      | Direct file modification in `.beads/`, manual bead file editing                          |
| Authoritative or advisory | Authoritative for task state                                                             |

### TLDR

| Attribute                 | Definition                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Purpose                   | 5-layer code analysis (AST, call graph, imports, semantic search, impact analysis)                                               |
| Allowed operations        | `tldr context`, `tldr semantic`, `tldr impact`, `tldr callgraph`, `tldr slice`, `tldr cfg`, `tldr dfg`, `tldr arch`, `tldr dead` |
| Forbidden operations      | Modifying indexed files directly, bypassing daemon for writes                                                                    |
| Authoritative or advisory | Authoritative for context selection                                                                                              |

### cass_memory (cm)

| Attribute                 | Definition                                                           |
| ------------------------- | -------------------------------------------------------------------- |
| Purpose                   | Cross-session learning, anti-pattern detection, evidence-based rules |
| Allowed operations        | `cm context`, `cm doctor`, `cm playbook list`, `cm init --repo`      |
| Forbidden operations      | Modifying learned rules, deleting session data, overriding Beads     |
| Authoritative or advisory | Advisory only - never overrides Beads or quality gates               |

### UBS

| Attribute                 | Definition                                                 |
| ------------------------- | ---------------------------------------------------------- |
| Purpose                   | Multi-language static analysis catching 1000+ bug patterns |
| Allowed operations        | `ubs <files>`, `ubs . --fail-on-warning`                   |
| Forbidden operations      | Modifying UBS rules, disabling scans, bypassing gates      |
| Authoritative or advisory | Authoritative for quality validation                       |

### Biome

| Attribute                 | Definition                                       |
| ------------------------- | ------------------------------------------------ |
| Purpose                   | Modern linting and formatting                    |
| Allowed operations        | `biome check`, `biome format`, `biome lint`      |
| Forbidden operations      | Modifying biome.json rules during task execution |
| Authoritative or advisory | Authoritative for code style validation          |

### Git

| Attribute                 | Definition                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Purpose                   | Source control, branch management                                                           |
| Allowed operations        | `git add`, `git commit`, `git push`, `git checkout`, `git branch`, `git status`, `git diff` |
| Forbidden operations      | `git push --force`, direct commit to main/master/develop, `git reset --hard`                |
| Authoritative or advisory | Authoritative for code state                                                                |

### opencode

| Attribute                 | Definition                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- |
| Purpose                   | Agent execution environment, tool dispatch                                    |
| Allowed operations        | All opencode tools (read, write, edit, glob, grep, bash, task, etc.)          |
| Forbidden operations      | TodoWrite when `.beads/` exists (blocked by guardrails), expanding task scope |
| Authoritative or advisory | Authoritative for tool execution                                              |

---

## 7. Agent Responsibility Boundaries

### orchestrator

| Attribute                  | Definition                                                               |
| -------------------------- | ------------------------------------------------------------------------ |
| Exclusive responsibilities | Master coordination, task assignment, handoff management                 |
| Prohibitions               | Cannot modify code directly, cannot close tasks without agent completion |
| May modify                 | Task state via beads, agent handoffs, context passing                    |

### prd

| Attribute                  | Definition                                               |
| -------------------------- | -------------------------------------------------------- |
| Exclusive responsibilities | Product Requirements Document generation                 |
| Prohibitions               | Cannot implement code, cannot close implementation tasks |
| May modify                 | PRD files, task specifications                           |

### generate-tasks

| Attribute                  | Definition                                                       |
| -------------------------- | ---------------------------------------------------------------- |
| Exclusive responsibilities | Atomic task breakdown with dependency graphs                     |
| Prohibitions               | Cannot implement code, cannot execute quality gates              |
| May modify                 | Task creation via `bd create`, dependency links via `bd dep add` |

### test-specialist

| Attribute                  | Definition                                            |
| -------------------------- | ----------------------------------------------------- |
| Exclusive responsibilities | Test generation, test execution, coverage enforcement |
| Prohibitions               | Cannot skip quality gates, cannot bypass UBS          |
| May modify                 | Test files, test fixtures, test configuration         |

### code-reviewer

| Attribute                  | Definition                                                          |
| -------------------------- | ------------------------------------------------------------------- |
| Exclusive responsibilities | PR review, comment classification, review task creation             |
| Prohibitions               | Cannot commit directly, cannot close tasks without fix verification |
| May modify                 | Review files, create follow-up tasks                                |

### deployment-specialist

| Attribute                  | Definition                                       |
| -------------------------- | ------------------------------------------------ |
| Exclusive responsibilities | Deployment execution, smoke tests, health checks |
| Prohibitions               | Cannot deploy without passing all quality gates  |
| May modify                 | Deployment configuration, monitoring setup       |

### task-coordinator

| Attribute                  | Definition                                          |
| -------------------------- | --------------------------------------------------- |
| Exclusive responsibilities | Beads task creation, MCP notifications              |
| Prohibitions               | Cannot modify code, cannot execute implementation   |
| May modify                 | Task state via `bd create`, `bd update`, `bd close` |

### semantic-search (TLDR)

| Attribute                  | Definition                                           |
| -------------------------- | ---------------------------------------------------- |
| Exclusive responsibilities | Context extraction, semantic search, impact analysis |
| Prohibitions               | Cannot modify code, cannot bypass quality gates      |
| May modify                 | Context output only (no code changes)                |

### fix-specialist

| Attribute                  | Definition                                                   |
| -------------------------- | ------------------------------------------------------------ |
| Exclusive responsibilities | Focused error resolution, stack trace analysis               |
| Prohibitions               | Cannot expand scope beyond error fix, cannot skip validation |
| May modify                 | Code fixes within error scope only                           |

### conflict-resolver

| Attribute                  | Definition                                              |
| -------------------------- | ------------------------------------------------------- |
| Exclusive responsibilities | Git merge conflict resolution, rebase conflict handling |
| Prohibitions               | Cannot force push, cannot modify main branch            |
| May modify                 | Conflict resolution in task branch only                 |

### Internal Research Droids

| Agent                     | Purpose                 | Modifications     |
| ------------------------- | ----------------------- | ----------------- |
| codebase-researcher       | Architecture discovery  | Read-only         |
| git-history-analyzer      | Change evolution        | Read-only         |
| context-researcher        | Project-wide context    | Read-only         |
| best-practices-researcher | Industry analysis       | Read-only         |
| library-source-reader     | Library analysis        | Read-only         |
| domain-specialist         | Domain expertise        | Read-only         |
| file-picker-agent         | File discovery          | Read-only         |
| figma-design-extractor    | Design token extraction | Design files only |

All internal research droids are read-only and advisory only.

---

## 8. Task and Branch Management Rules

### Task Creation

1. Tasks must be created via `bd create "title" --description "..."`
2. Tasks must have unique titles
3. Tasks may specify dependencies via `bd dep add`
4. Task metadata may include priority, type, and custom fields

### Task Claiming

1. Tasks must be claimed via `bd update <id> --status in_progress`
2. Only one agent may claim a task at a time (Beads enforces)
3. Claimed tasks appear as in_progress in `bd ready` output
4. Task claim is atomic (race conditions handled by Beads)

### Task Progression

1. Task status transitions: `open` → `in_progress` → `closed`
2. Intermediate statuses (review, testing, etc.) are optional
3. All transitions must use `bd update <id> --status <status>`
4. Session ID must be provided: `bd update <id> --session "ses_<timestamp>" --status closed`

### Task Completion

1. Tasks must be closed via `bd close <id> --reason "Completed"` or `bd close <id> --reason "Failed: <reason>"`
2. Closed tasks must include a reason
3. Closed tasks with dependencies trigger automatic unlocking of dependent tasks
4. Failed tasks create dependent fix tasks before closing

### Branch Naming Conventions

1. All task branches must follow pattern: `beads/task-{id}` (e.g., `beads/task-opencode-abc123`)
2. Branch names must be derived from Beads task ID
3. Feature branches not permitted (use `beads/task-{id}` pattern)
4. No direct work on `main`, `master`, or `develop`

### Merge and Push Permissions

1. Push to task branch: ALLOWED
2. Push to main/master/develop: FORBIDDEN
3. Force push to task branch: FORBIDDEN
4. Merge via PR: ALLOWED after quality gates pass
5. Squash merge: ALLOWED (recommended)

### Task Reopening

1. Tasks may be reopened via `bd reopen <id> --reason "<reason>"`
2. Reopening requires valid reason
3. Reopened tasks return to `open` status
4. Dependencies are preserved on reopen

### Dependency Management

1. Dependencies added via `bd dep add <blockedId> --blockerId <blockerId>`
2. Dependencies removed via `bd dep remove`
3. Dependency cycles are detected and rejected
4. Completion of blocking task automatically unlocks blocked task

---

## 9. Termination Semantics

### Completion Conditions

A task is complete when:

1. All code changes implemented
2. All tests passing (100%)
3. All quality gates passing (UBS: 0 critical, Biome: 0 errors)
4. Code committed to task branch
5. Task closed via `bd close <id> --reason "Completed"`
6. Changes synced via `bd sync`

### Reopen Conditions

A task may be reopened when:

1. Regression discovered after completion
2. Quality gate failure missed during execution
3. Incomplete implementation discovered
4. Valid reopen reason provided via `bd reopen <id> --reason "<reason>"`

### Abandonment Conditions

A task is abandoned when:

1. Agent encounters unrecoverable error after 3 retries
2. Task scope becomes invalid (e.g., feature cancelled)
3. Blocked by dependency that cannot be resolved
4. System enforcement blocks execution

Abandoned tasks must be closed with reason: `bd close <id> --reason "Abandoned: <reason>"`

### Escalation Triggers

Escalation occurs when:

1. Quality gate failure after fix task creation
2. Tool unavailability (TLDR, UBS, Biome unavailable)
3. Conflict resolver unable to resolve merge conflict
4. Agent timeout after 3 retries
5. Ambiguous state (Beads state inconsistent with Git state)

Escalation requires human operator intervention.

---

## 10. Failure and Recovery Rules

### Gate Failures

| Failure Type      | Retry Limits | Recovery Action         | Escalation Authority |
| ----------------- | ------------ | ----------------------- | -------------------- |
| UBS critical bug  | 1 retry      | Fix bug, re-run UBS     | ESCALATE if persists |
| UBS security vuln | 1 retry      | Fix vuln, re-run UBS    | ESCALATE if persists |
| Biome error       | 1 retry      | Fix error, re-run Biome | ESCALATE if persists |
| Test failure      | 1 retry      | Fix test/code, re-run   | ESCALATE if persists |
| Coverage <80%     | 1 retry      | Add tests, re-run       | ESCALATE if persists |

### Tool Unavailability

| Tool  | Retry Limits         | Recovery Action | Escalation Authority |
| ----- | -------------------- | --------------- | -------------------- |
| TLDR  | 3 retries, 10s delay | Wait, retry     | ESCALATE if persists |
| UBS   | 3 retries, 10s delay | Wait, retry     | ESCALATE if persists |
| Biome | 3 retries, 10s delay | Wait, retry     | ESCALATE if persists |
| Beads | 3 retries, 10s delay | Wait, retry     | ESCALATE if persists |
| Git   | 3 retries, 10s delay | Wait, retry     | ESCALATE if persists |

Recovery action for tool unavailability:

1. Wait 10 seconds
2. Retry operation
3. If still unavailable after 3 attempts, ESCALATE

### Conflicting State

| Conflict Type        | Retry Limits      | Recovery Action          | Escalation Authority   |
| -------------------- | ----------------- | ------------------------ | ---------------------- |
| Task already claimed | 1 retry, 5s delay | Poll again               | ESCALATE if persists   |
| Merge conflict       | 1 retry           | Invoke conflict-resolver | ESCALATE if unresolved |
| Beads/Git drift      | 0 retries         | ESCALATE immediately     | ESCALATE               |
| Uncommitted changes  | 1 retry           | Stash or commit          | ESCALATE if persists   |

### Insufficient Context

| Context Type       | Retry Limits | Recovery Action          | Escalation Authority     |
| ------------------ | ------------ | ------------------------ | ------------------------ |
| TLDR context empty | 2 retries    | Manual context selection | ESCALATE if persists     |
| cass_memory empty  | 0 retries    | Continue without         | No escalation (advisory) |
| Missing files      | 0 retries    | ESCALATE immediately     | ESCALATE                 |

### General Failure Pattern

1. Capture error state (output, exit code, timestamp)
2. Create fix task if quality gate failure: `bd create "Fix <issue>" --depends-on <parentId>`
3. Close current task: `bd close <id> --reason "Failed: <error>"`
4. Return to IDLE state
5. Escalate if fix task fails or error is unrecoverable

---

## 11. Forbidden Actions

The AI agent must never perform the following actions, even if they appear beneficial:

### Installation and Configuration

1. Never install, upgrade, or configure system tools (Go, Node.js, Python packages, etc.)
2. Never modify shell configuration files (`.zshrc`, `.bashrc`, etc.)
3. Never install npm packages globally or locally
4. Never modify environment variables
5. Never modify `package.json`, `biome.json`, or tool configurations
6. Never run `pip install`, `npm install -g`, `go install`, or similar package managers

### Task and Scope Management

7. Never create tasks without using `bd create`
8. Never modify task state without using `bd update`
9. Never delete or close tasks without proper reason
10. Never expand task scope beyond what Beads task specifies
11. Never implement features not in task description
12. Never refactor code outside the scope of the current task
13. Never create additional tasks without task linkage
14. Never skip quality gates to complete tasks faster

### Code and Branch Management

15. Never commit directly to `main`, `master`, or `develop` branches
16. Never force push (`git push --force`)
17. Never use `git reset --hard` or destructive reset commands
18. Never modify `.beads/` directory contents directly
19. Never modify Git hooks or Beads hooks
20. Never create branches outside `beads/task-{id}` pattern

### Tool Usage

21. Never use TodoWrite tool when `.beads/` directory exists (beads-guardrails blocks this)
22. Never bypass UBS static analysis
23. Never bypass Biome linting
24. Never skip test execution when tests exist
25. Never modify indexed files directly via TLDR

### Learning and Memory

26. Never modify cass_memory learned rules
27. Never delete cass_memory session data
28. Never use cass_memory to override Beads task scope
29. Never ignore cass_memory anti-pattern warnings (though advisory)

### System Operations

30. Never modify PM2 configuration or process management
31. Never stop or restart system services (TLDR daemon, GPTCache, etc.)
32. Never modify system files outside the task scope
33. Never access or modify other projects' `.beads/` directories
34. Never run system-level commands (sudo, chmod, chown, etc.)

### Communication and Documentation

35. Never create documentation not required by task
36. Never modify README files unless explicitly required
37. Never add comments to code (unless required by style guide)
38. Never ask clarifying questions (must use available systems for resolution)

### Experimental and Discovery

39. Never run exploratory commands not required for task
40. Never modify code to "see what happens"
41. Never disable or modify quality gates
42. Never invent configuration values or thresholds

Any violation of these rules is a critical failure requiring immediate ESCALATION.

---

## 12. Minimal Directory Map

The AI agent may only read from and write to the following directories:

### Read-Only Directories (All Tasks)

| Directory                                | Purpose                        |
| ---------------------------------------- | ------------------------------ |
| `/Users/buddhi/.config/opencode/agent/`  | Agent definitions              |
| `/Users/buddhi/.config/opencode/plugin/` | Plugin implementations         |
| `/Users/buddhi/.config/opencode/lib/`    | Core libraries                 |
| `/Users/buddhi/.config/opencode/config/` | Configuration files            |
| `/Users/buddhi/.config/opencode/hooks/`  | Service check hooks            |
| `/Users/buddhi/.config/opencode/skills/` | Skill definitions              |
| `/Users/buddhi/.config/opencode/docs/`   | Documentation                  |
| `/Users/buddhi/.config/opencode/bin/`    | Executable scripts (read-only) |

### Read-Write Directories (Per Task)

| Directory                         | Purpose              | Restrictions                    |
| --------------------------------- | -------------------- | ------------------------------- |
| `/Users/buddhi/.config/opencode/` | opencode codebase    | Modify only when task specifies |
| `~/.config/opencode/` (home)      | User opencode config | Modify only when task specifies |

### Project-Specific Directories

| Directory           | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `{project}/`        | Active project root                          |
| `{project}/.beads/` | Beads task database (via `bd` commands only) |
| `{project}/.tldr/`  | TLDR index cache                             |
| `{project}/.cass/`  | Cass Memory data                             |
| `{project}/src/`    | Source code (modify per task)                |
| `{project}/tests/`  | Test files (modify per task)                 |
| `{project}/docs/`   | Documentation (modify per task)              |
| `{project}/lib/`    | Project libraries (modify per task)          |

### Forbidden Directories

The AI agent must never access:

- `/Users/buddhi/.config/opencode/.beads/` (direct modification forbidden)
- `/Users/buddhi/.config/opencode/.git/` (direct modification forbidden)
- `/Users/buddhi/.config/opencode/orchestrator/memory/` (orchestrator internal)
- `/Users/buddhi/.config/opencode/logs/` (system logs)
- `/Users/buddhi/.config/opencode/node_modules/` (npm packages)
- Any directory not explicitly listed above

---

## 13. Single Canonical Execution Example

```
STATE: IDLE
  ├─ Action: `bd ready`
  └─ Output: "opencode-xyz: Add authentication feature"

STATE: IDLE → TASK_CLAIMED
  ├─ Action: `bd update opencode-xyz --status in_progress`
  └─ Output: "✓ Task opencode-xyz claimed"

STATE: TASK_CLAIMED → CONTEXT_LOADED
  ├─ Action: `tldr context src/auth.ts`
  └─ Output: {AST, imports, call_graph}

STATE: CONTEXT_LOADED → EXECUTE_AGENT
  ├─ Action: Write `src/auth.ts` with implementation
  └─ Output: File written successfully

STATE: EXECUTE_AGENT → RUN_QUALITY_GATES
  ├─ Action: `ubs src/auth.ts` → exit_code: 0
  ├─ Action: `biome check src/auth.ts` → exit_code: 0
  └─ Action: `npm test -- --run` → exit_code: 0

STATE: RUN_QUALITY_GATES → PROCEED_TO_COMMIT
  ├─ Action: `git checkout -b beads/task-opencode-xyz`
  ├─ Action: `git add src/auth.ts`
  └─ Action: `git commit -m "Add authentication feature"`

STATE: PROCEED_TO_COMMIT → TASK_COMPLETE
  ├─ Action: `bd close opencode-xyz --reason "Completed" --session "ses_1234567890"`
  ├─ Action: `bd sync`
  └─ Output: "✓ Task closed, synced to git"

STATE: TASK_COMPLETE → IDLE
  └─ Agent ready for next task
```

---

## Document Metadata

| Attribute         | Value                                                         |
| ----------------- | ------------------------------------------------------------- |
| Version           | 1.0                                                           |
| Created           | 2026-01-17                                                    |
| Last Updated      | 2026-01-17                                                    |
| Applicable Agents | All opencode agents                                           |
| Enforcement       | Programmatic (beads-guardrails, runner guardrails, git hooks) |

---

## References

- **Beads Documentation**: `skills/beads-agent.md`
- **Agent Instructions**: `AGENTS.md`
- **Task-to-Commit Workflow**: `docs/task-to-commit.md`
- **Relay Runner Architecture**: `docs/runner-architecture.md`
- **Plugin System**: `plugin/README.md`

---

_This document is a binding runtime contract for autonomous AI agent operation within the OpenCode environment._
