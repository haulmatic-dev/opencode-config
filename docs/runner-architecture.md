# Agent Runner Architecture

## Overview

The Agent Runner is a distributed, code-driven system designed for **scalability** and **strict quality governance**. Unlike traditional "Coordinator" models where a central process manages agents, this system uses a **Relay Runner** pattern.

Each agent runs as an independent process wrapped in a **Quality Harness**. When an agent completes its work and passes strict local gates (TDD, Lint), the Harness itself spawns the next agent in the workflow chain.

**Core Philosophy:** "Code is guilty until proven innocent." The Harness intercepts all agent output and rejects it unless it passes verification.

---

## The Relay Runner Pattern vs Traditional Coordinator

### Traditional Coordinator Model

A central orchestrator process manages all agent lifecycles:

```
┌─────────────────────────────────────┐
│      Central Coordinator            │
│  • Manages agent state              │
│  • Schedules execution              │
│  • Handles failures                 │
└──────────┬──────────┬───────────────┘
           │          │
    ┌──────▼─────┐ ┌──▼──────────┐
    │  Agent A   │ │  Agent B    │
    └────────────┘ └─────────────┘
```

**Problems:**

- Single point of failure
- Tightly coupled to agent logic
- Prompt-based state management
- Difficult to scale

### Relay Runner Pattern

Each agent runs independently, handing off execution to the next:

```
┌──────────────┐    Handoff    ┌──────────────┐
│ Agent A      │ ───────────▶  │ Agent B      │
│ + Harness    │               │ + Harness    │
└──────────────┘               └──────────────┘
       │                              │
       ▼                              ▼
   Pass Gates                     Pass Gates
       │                              │
       └──────────▶ Agent C ◀────────┘
                   + Harness
```

**Benefits:**

- Each agent is an independent process
- Code-driven workflow state machines
- Quality gates enforced locally
- Failures don't cascade unexpectedly
- Easier to debug and test

---

## The Quality Harness

The Harness (`lib/runner/index.js`) is a Node.js process that wraps every LLM interaction.

### Responsibilities

1. **Context Setup:** Checks out the task branch (`beads/task-123`)
2. **Context Distillation:** Parses previous errors/logs to create a minimal prompt context
3. **Agent Invocation:** Uses `OpencodeSDK.session.prompt` to call the LLM
4. **Gatekeeping:** Intercepts "Completion" signals
5. **Handoff:** Spawns the next runner process on success

### Usage

```bash
node lib/runner/index.js --task <ID> --agent <TYPE>
```

### Harness Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ 1. Setup Phase                                       │
│    • Checkout task branch                            │
│    • Load workflow state from Beads                  │
│    • Parse progress.txt for context                  │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│ 2. Execution Phase                                  │
│    • Load agent markdown definition                 │
│    • Invoke LLM with distilled context              │
│    • Stream logs to UI                               │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│ 3. Gatekeeping Phase                                │
│    • Run configured gates (TDD, Lint, Mutation)     │
│    • If pass → Continue                             │
│    • If fail → Trigger fix loop or escalate         │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│ 4. Handoff Phase                                   │
│    • Update Beads task status                       │
│    • Append learnings to progress.txt               │
│    • Spawn next agent process                       │
│    • Exit (current process terminates)              │
└─────────────────────────────────────────────────────┘
```

---

## Gatekeeping

The Gatekeeper (`lib/runner/gates.js`) implements the "Pessimistic" workflow. All agent output must pass verification before proceeding.

### Built-in Gates

#### TDD Verification (`verifyTDD()`)

Ensures Test-Driven Development discipline:

1. Run new tests against _old_ code → **MUST FAIL**
2. Run new tests against _new_ code → **MUST PASS**

If either check fails, the task is rejected.

#### Mutation Testing (`verifyMutation()`)

Runs `stryker` on modified files to verify test quality:

- Mutation score must be > 80%
- Low scores indicate poor test coverage
- Triggers fix loop with specific feedback

#### Lint Verification (`verifyLint()`)

Runs static analysis tools:

- `ubs` (Ultimate Bug Scanner) for security
- `eslint` for code quality
- Project-specific linting rules

### Gate Configuration

Gates are defined in workflow configurations:

```javascript
testing: {
  onSuccess: 'security_audit',
  onFail: 'coding_fix_loop',
  gates: ['tdd', 'coverage'],
},
```

### Retry Budgets

Each failure type has a configurable retry budget:

```javascript
retryBudgets: {
  security: 1,  // Fail fast on security
  lint: 3,      // Allow auto-fix attempts
  build: 2,     // Retry once for flake
  test: 3
}
```

The Runner tracks `attempts` in Beads metadata keyed by failure type.

---

## Handoff Flow

The Relay (`lib/runner/handoff.js`) manages transitions between agents.

### Handoff Process

1. **Read Workflow:** Determine next agent from `lib/workflows/feature-dev.js`
2. **Update State:** Change Beads task status (`IN_PROGRESS` → `VERIFYING` → `REVIEW`)
3. **Spawn Process:** Execute next agent with `spawn('node', ['lib/runner', '--task', id, '--agent', nextAgent])`
4. **Exit:** Current process terminates

### State Machine Example

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
      onFail: 'coding_fix_loop',
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

## Guardrails and Safety Measures

### Command Interception Layer

The Runner acts as a proxy for all system calls, enforcing hard rules:

1. **File Writes:** Denied if `task_id` is null or path is `.beads/`
2. **Git Commits:** Denied if message missing `task_id`
3. **Git Checkout:** Denied if target is `main` or `develop` (only `beads/task-*` allowed)

**Principle:** "Illegal states are unrepresentable."

If a forbidden command is attempted, the Runner throws a `GuardrailException` and halts.

### Failure Fingerprinting & Deduplication

Prevents duplicate fix tasks for identical failures:

1. Calculate fingerprint: `sha256(error_type + stack_trace_top + file_path)`
2. Query Beads for existing tasks with this fingerprint
3. If exists and `OPEN`, link current task as dependent
4. If not found, spawn new fix agent

### Graph Compaction

Automatically resolves blocked tasks when root causes are fixed:

- When a "Root Cause" task resolves, the Runner identifies all tasks waiting on that fingerprint
- Moves dependent tasks from `BLOCKED` to `READY`
- Triggers their retry

### Irreversible Actions Guard

Prevents autonomous execution of destructive operations:

**Metadata Declaration:**

```json
{
  "irreversible": true,
  "requires_human_approval": true,
  "action_type": "schema_migration"
}
```

**Stop Relay:**

- Handoff detects this flag
- Sets Status `BLOCKED`
- Exits and alerts human

**Never auto-merge** if `metadata.irreversible === true`.

---

## Git Automation & Safety

### Reactive Rebase

Triggered at Runner startup:

1. Check: `git fetch origin main`
2. Compare: Is `origin/main` ahead of task branch base?
3. Action: If yes, run `git rebase origin/main`
   - Success → Resume execution
   - Conflict → Spawn `ConflictResolver` agent

### Squash-on-Green

The `MergeAuthority` agent ensures clean history:

- Performs `git merge --squash` or `git commit --amend`
- Hides internal "fix loops" from final commit
- Atomic commit history

---

## Infrastructure Requirements

### Opencode SDK Integration

The Runner uses `@opencode-ai/sdk` to:

- Create sessions for audit logging
- Invoke LLM models with specific parameters
- Stream logs to the UI

### Beads (State Store)

SQLite database acting as the shared "Blackboard":

- Runner updates Task Metadata:
  - `current_agent`: "Coding"
  - `attempt`: 3
  - `last_gate_failure`: "Mutation Score 65%"

### Progress Logger

The Runner appends structured "Learnings" to `progress.txt` after every successful stage. This file is read during Context Distillation to prime the next agent with discovered gotchas.

---

## Specialized Agents

Agents are streamlined Markdown definitions that focus **only** on the task, as coordination is handled by the Runner.

### Adversarial Reviewer (`agent/adversarial-reviewer.md`)

- **Persona:** "Security Auditor. You are penalized if you approve buggy code."
- **Goal:** Find _one_ reason to reject
- **Input:** Smart Context (Diff + AST analysis)

### Fix Specialist (`agent/fix-specialist.md`)

- **Input:** Context Slices only
  - Receives 20 lines of code referenced in stack trace
  - Receives specific error message
  - NOT entire file + 500 lines of logs

### Conflict Resolver

- **Trigger:** Invoked by Runner if `git rebase` fails
- **Action:** Analyze 3-way diffs and propose resolutions
