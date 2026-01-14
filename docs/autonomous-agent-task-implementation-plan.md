# Implementation Plan: Autonomous Agent "Relay" Architecture (Quality-First)

## Overview

A distributed, code-driven agent system designed for **scalability** and **strict quality governance**. Unlike traditional "Coordinator" models where a central process manages agents, this system uses a **Relay Runner** pattern.

Each agent runs as an independent process wrapped in a **Quality Harness**. When an agent completes its work and passes strict local gates (TDD, Lint), the Harness itself spawns the next agent in the workflow chain.

**Core Philosophy:** "Code is guilty until proven innocent." The Harness intercepts all agent output and rejects it unless it passes verification.

---

## 1. The Core: Agent Runner (`lib/runner/`)

The single entry point for all execution. It replaces the concept of a central "Task Coordinator."

**Components:**

### A. The Harness (`lib/runner/index.js`)

A Node.js process that wraps the LLM interaction.

- **Usage:** `node lib/runner/index.js --task <ID> --agent <TYPE>`
- **Responsibilities:**
  1.  **Context Setup:** Checks out the task branch (`beads/task-123`).
  2.  **Context Distillation:** Parses previous errors/logs to create a minimal prompt context.
  3.  **Agent Invocation:** Uses `OpencodeSDK.session.prompt` to call the LLM.
  4.  **Gatekeeping:** Intercepts "Completion" signals.
  5.  **Handoff:** Spawns the next runner process on success.

### B. The Gatekeeper (`lib/runner/gates.js`)

Implements the "Pessimistic" workflow.

- **`verifyTDD()`**:
  - Runs new tests against _old_ code (Expect: **FAIL**).
  - Runs new tests against _new_ code (Expect: **PASS**).
  - _If strict TDD is violated, the task is rejected._
- **`verifyMutation()`**: Runs `stryker` on modified files. Score must be >80%.
- **`verifyLint()`**: Runs `ubs` (Ultimate Bug Scanner) and `eslint`.

### C. The Relay (`lib/runner/handoff.js`)

Manages the transition between agents.

- Reads `lib/workflows/feature-dev.js` to determine the next step.
- Updates `Beads` task status (`IN_PROGRESS` -> `VERIFYING` -> `REVIEW`).
- Spawns the next process: `spawn('node', ['lib/runner', '--task', id, '--agent', nextAgent])`.

---

## 2. Code-Driven Workflows (`lib/workflows/`)

Strict State Machines defining the software factory line. No prompt-based logic.

**Example: `lib/workflows/feature.js`**

```javascript
export const workflow = {
  start: 'planning',
  transitions: {
    planning: {
      onSuccess: 'coding',
      onFail: 'human_escalation',
      config: { model: 'claude-opus' },
    },
    coding: {
      onSuccess: 'testing',
      onFail: 'coding_fix_loop', // Spawns FixAgent
      gates: ['lint', 'compile'],
    },
    testing: {
      onSuccess: 'security_audit',
      onFail: 'coding_fix_loop',
      gates: ['tdd', 'coverage'],
    },
    security_audit: {
      onSuccess: 'merge_authority',
      onFail: 'security_fix_loop',
    },
  },
};
```

---

## 3. Specialized Agents (The "Brains")

Streamlined Markdown definitions in `agent/` that focus _only_ on the task, as coordination is handled by the Runner.

### A. The Adversarial Reviewer (`agent/adversarial-reviewer.md`)

- **Persona:** "Security Auditor. You are penalized if you approve buggy code."
- **Goal:** Find _one_ reason to reject.
- **Input:** Smart Context (Diff + AST analysis).

### B. The Fix Specialist (`agent/fix-specialist.md`)

- **Input:** "Context Slices" only.
  - _Instead of:_ Entire file + 500 lines of logs.
  - _Receives:_ The 20 lines of code referenced in the stack trace + the specific error message.

### C. The Conflict Resolver

- **Trigger:** Invoked by `Runner` if `git rebase` fails.
- **Action:** analyzing 3-way diffs and proposing resolutions.

---

## 4. Git Automation & Safety

### A. Reactive Rebase

- **Trigger:** Runner startup.
- **Check:** `git fetch origin main`. Is `origin/main` ahead of `task-branch` base?
- **Action:** If yes, pause. Run `git rebase origin/main`.
  - _Success:_ Resume execution.
  - _Conflict:_ Spawn `ConflictResolver` agent.

### B. Squash-on-Green

- The `MergeAuthority` agent does not just merge.
- It performs a `git merge --squash` or `git commit --amend` to ensure the final history is atomic, hiding the internal "fix loops."

---

## 5. Infrastructure Requirements

### A. Opencode SDK Integration

- The Runner uses `@opencode-ai/sdk` to:
  - Create sessions for audit logging.
  - Invoke LLM models with specific parameters.
  - Stream logs to the UI.

### B. Beads (State Store)

- SQLite database acting as the shared "Blackboard."
- Runner updates Task Metadata:
  - `current_agent`: "Coding"
  - `attempt`: 3
  - `last_gate_failure`: "Mutation Score 65%"

---

## 6. Advanced Governance & Optimization (Integrated from OG Plan)

### A. Failure Fingerprinting & Deduplication

- **Problem:** 5 parallel agents might all encounter the same "Database Connection Error" and spawn 5 identical Fix Tasks.
- **Solution:** The Runner calculates a `sha256(error_type + stack_trace_top + file_path)`.
- **Action:** Before spawning a fix agent, the Runner queries `Beads`. If a task with this fingerprint exists and is `OPEN`, it links the current task as a _dependent_ rather than spawning a new one.

### B. Per-Failure Retry Budgets

- **Configuration:** Extended `lib/workflows/` config.
  ```javascript
  retryBudgets: {
    security: 1, // Fail fast on security
    lint: 3,     // Allow auto-fix attempts
    build: 2,    // Retry once for flake
    test: 3
  }
  ```
- **Enforcement:** The Runner tracks `attempts` in Beads metadata keyed by failure type.

### C. Graph Compaction

- **Role:** A cleanup routine running in `handoff.js`.
- **Logic:** When a "Root Cause" task resolves, the Runner automatically identifies all tasks waiting on that specific fingerprint and moves them from `BLOCKED` to `READY` (triggering their retry).

### D. Progress Logger (`progress.txt`)

- **Persistence:** The Runner appends structured logs ("Learnings") to `progress.txt` after every successful stage.
- **Context:** This file is read _only_ during the "Context Distillation" phase to prime the next agent with "Gotchas" discovered by previous agents in the chain.

---

## 7. Irreversible Actions Guard (Migrations & Data)

**Goal:** Prevent autonomous systems from destroying production data.

### A. Metadata Declaration

Tasks involving schema changes or data backfills must set:

```json
metadata: {
  "irreversible": true,
  "requires_human_approval": true,
  "action_type": "schema_migration | data_backfill"
}
```

### B. The "Stop" Relay

The Runner's `handoff.js` detects this flag.

- _Standard Behavior:_ Spawn next agent.
- _Irreversible Behavior:_ Set Status `BLOCKED`. **Exit.** Alert Human.

### C. Specialized Workflow (`lib/workflows/migration.js`)

Defines a specific 5-phase lifecycle:

1.  **Additive Schema:** Autonomous. Adds nullable columns. Safe.
2.  **Backfill Dry-Run:** Autonomous. Validates logic without writes.
3.  **Execution (BLOCKED):** Human must approve and execute.
4.  **Constraint Enforcement:** Autonomous (Post-exec). Adds NOT NULL/FKs.
5.  **Cleanup:** Autonomous.

### D. Merge Authority Rule

- Explicit rule: **Never auto-merge** if `metadata.irreversible === true`.
- Blocks autonomous execution until human `metadata.approval_granted` is set.

---

## 8. Baseline Guardrails (Command Interception)

**Goal:** Establish hard, mechanical rules that cannot be bypassed.

### A. The Interceptor Layer

The Runner acts as a proxy for all system calls. It intercepts:

1.  **File Writes:** Deny if `task_id` is null. Deny if path is `.beads/`.
2.  **Git Commits:** Deny if message missing `task_id`.
3.  **Git Checkout:** Deny if target is `main` or `develop`. Only `beads/task-*` allowed.

### B. Enforcement Logic

- **Principle:** "Illegal states are unrepresentable."
- **Action:** If a forbidden command is attempted, the Runner throws a specific `GuardrailException` and halts the agent (triggering a fix loop or escalation).

### C. Success Criteria

- Agents cannot write code without a task.
- Agents cannot commit without traceability.
- Shared branches remain clean.

---

## Implementation Roadmap

1.  **Phase 1: The Skeleton**
    - Scaffold `lib/runner/` and `lib/workflows/`.
    - Implement `Beads` client in Node.js.
    - Create the basic "Pass/Fail" loop.

2.  **Phase 2: The Gates**
    - Implement `tdd-enforcer.js`.
    - Integrate `ubs` for linting.
    - Implement `Command Interceptors` (Guardrails).

3.  **Phase 3: The Relay**
    - Implement `handoff.js` to spawn processes.
    - Connect `planning` -> `coding` -> `testing` flow.

4.  **Phase 4: Optimization & Safety**
    - Implement "Smart Context" (stack trace slicing).
    - Add "Reactive Rebase."
    - Implement "Irreversible Action Guard" (Section 7).
