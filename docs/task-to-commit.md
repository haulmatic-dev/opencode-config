# Task-to-Commit Cycle: Atomic Workflow with Beads

This document explains the complete task-to-commit workflow for the OpenCode Headless Swarm system.

## Overview

The task-to-commit cycle is a **6-stage atomic workflow** managed by **Beads dependency graphs**. Individual agents execute tasks, run quality gates, and handle success/failure. The Beads system automatically manages task dependencies, unlocking downstream tasks and blocking work when failures occur.

## Complete Workflow Flow

```
User Request
    ↓
[1] PRD Agent generates PRD
    (with 6-stage workflow spec)
    ↓
[2] generate-tasks creates 5 dependent tasks
    Task X-0: Plan (Stage 0)
    Task X-1: Write Unit Tests (Stage 1) [depends on X-0]
    Task X-2: Implement Code (Stage 2) [depends on X-1]
    Task X-3: Test Code (Stage 3) [depends on X-2]
    Task X-4: Quality Checks (Stage 4) [depends on X-3]
    ↓
[3] Orchestrator/PM2 spawns agents for ready tasks
    (via `bd ready` - finds unblocked tasks)
    ↓
[4] Individual agents execute tasks
    ┌─────────────────────────────────────────┐
    │ test-specialist      (Stage 1,3)  │
    │ code-reviewer        (Stage 5)        │
    │ deployment-specialist (Stage 6)        │
    │ implementation-agent (Stage 2,4)      │
    │ planning-agent       (Stage 0)        │
    └─────────────────────────────────────────┘
    ↓
[5] Agent runs quality gates
    • If all PASS → bd.close(task_id) → Beads unlocks next task
    • If any FAIL → Create dependent fix task → bd.close(task_id) → Beads blocks downstream
    ↓
[6] Beads dependency graph manages task flow automatically
    (No orchestration logic needed!)
```

## 6-Stage Workflow

| Stage | Agent | Description | Quality Gates |
|--------|---------|-------------|---------------|
| **Stage 0** | planning-agent | Discovery & Planning | Requirements validated, risks assessed |
| **Stage 1** | test-specialist | Write Unit Tests | Coverage ≥80%, all tests written |
| **Stage 2** | implementation-agent | Implement Code | Typecheck passes, build succeeds |
| **Stage 3** | test-specialist | Test Code | 100% tests pass, no failures |
| **Stage 4** | quality-agent | Quality Checks | 0 lint errors, 0 UBS critical bugs, 0 security vulns, 0 type errors |
| **Stage 5** | code-reviewer | Code Review & Validation | No blocking comments, auto-checks pass |
| **Stage 6** | deployment-specialist | Deployment & Monitoring | Smoke tests pass, health OK, monitoring configured |

## Execution Flows

### Happy Path (All Stages Pass)

```
X-0: Plan → planning-agent executes → Quality gates pass → bd.close(X-0)
    ↓ Beads unlocks X-1
X-1: Write Tests → test-specialist executes → Coverage ≥80% → bd.close(X-1)
    ↓ Beads unlocks X-2
X-2: Implement Code → implementation-agent executes → Typecheck/Build pass → bd.close(X-2)
    ↓ Beads unlocks X-3
X-3: Test Code → test-specialist executes → All tests pass → bd.close(X-3)
    ↓ Beads unlocks X-4
X-4: Quality Checks → quality-agent executes → Lint/Security/Typecheck pass → bd.close(X-4)
    ↓ Feature complete!
```

### Failure Path (Test Stage Fails)

```
X-2: Implement Code → implementation-agent executes → Typecheck/Build pass → bd.close(X-2)
    ↓ Beads unlocks X-3
X-3: Test Code → test-specialist executes → 2 tests FAIL
    ↓ Agent creates fix task
X-5: Fix Failing Tests [depends on X-3] → bd.close(X-3)
    ↓ Beads keeps X-4 BLOCKED (depends on X-3)
X-5: Fix Failing Tests → implementation-agent executes → Tests fixed → bd.close(X-5)
    ↓ Beads unlocks X-3-retry
X-3-retry: Re-run Tests → test-specialist executes → All tests pass → bd.close(X-3-retry)
    ↓ Beads unlocks X-4
X-4: Quality Checks → quality-agent executes → Pass → bd.close(X-4)
    ↓ Feature complete!
```

## Agent Responsibilities

### Success Handling

When an agent completes a task successfully:

```python
# Agent executes task
run_quality_gates()  # lint, UBS scan, typecheck, build, test

# All quality gates pass
bd.close(task_id, reason="Completed")
exit(0)
# Beads automatically unlocks next dependent task
```

### Failure Handling

When an agent encounters a quality gate failure:

```python
# Agent executes task
run_quality_gates()  # lint, UBS scan, typecheck, build, test

# Quality gate fails (e.g., test failures)
failure_info = {
    "stage": stage_number,
    "failure_type": "test_failure",
    "details": {"failed_tests": ["test_a", "test_b"]}
}

# Create dependent fix task
fix_task_id = bd.create(
    title="Fix failing tests",
    type="bug",
    priority=0,
    depends_on=[task_id],
    description=failure_info['details'],
    metadata=failure_info
)

# Close original task with failure reason
bd.close(task_id, reason=f"Failed - created fix task {fix_task_id}")
exit(0)
# Beads keeps downstream tasks blocked until fix_task_id completes
```

## Beads Dependency Graph Management

**Key Insight:** Beads handles ALL task dependency logic. No orchestration logic needed in agents.

### Automatic Task Unlocking

When a task closes successfully, Beads automatically unlocks its dependent tasks:

```
Task X-0 closes → X-1 becomes ready → Orchestrator spawns agent for X-1
Task X-1 closes → X-2 becomes ready → Orchestrator spawns agent for X-2
Task X-2 closes → X-3 becomes ready → Orchestrator spawns agent for X-3
```

### Automatic Task Blocking

When a task closes with a failure, Beads automatically blocks its dependent tasks until the fix task completes:

```
Task X-3 fails → Creates X-5 (fix task) → Closes X-3
    ↓ Beads keeps X-4 BLOCKED (depends on X-3)
Task X-5 completes → X-3-retry unlocks → X-4 becomes ready
```

### Orchestrator/PM2 Role

**Current (Orchestrator):**
```python
while True:
    ready_tasks = bd.ready()  # Get unblocked tasks
    
    for task in ready_tasks:
        agent_type = determine_agent_for_task(task)
        spawn_agent(agent_type, task_id=task.id)
        wait_for_agent_completion(task.id)
        # Beads automatically unlocks next task
```

**Future (PM2 Headless Workers):**
```javascript
// Headless worker (NO CHANGES NEEDED)
const readyOutput = execSync('bd ready', { encoding: 'utf8' });
const taskId = extractTaskId(readyOutput);

const agentType = determineAgentForTask(taskId);
execSync(`TASK_ID=${taskId} opencode-task-${agentType}`);

// Agent handles success/failure automatically
// Beads unlocks next task automatically

// Worker exits → PM2 restarts → claims next task
process.exit(0);
```

## Parallelism Across Features

**Within a feature:** Stages execute sequentially (dependencies enforce order)

```
Feature A: [Plan] → [Tests] → [Impl] → [Exec] → [Quality]
```

**Across features:** Features execute in parallel (independent task chains)

```
Feature A: [Plan] → [Tests] → [Impl] → [Exec] → [Quality]
Feature B: [Plan] → [Tests] → [Impl] → [Exec] → [Quality]
Feature C: [Plan] → [Tests] → [Impl] → [Exec] → [Quality]
           ↓          ↓          ↓           ↓           ↓
         Parallel  Parallel   Parallel    Parallel    Parallel
```

## Specialist Agents Implemented

### test-specialist (Stages 1 & 3)
- Generates test specifications
- Writes test code (unit, integration, E2E)
- Creates test fixtures and mocks
- Ensures test coverage ≥ 80%
- Executes test suites
- Handles test failures by creating dependent fix tasks

**Quality Gates (Stage 1):**
- Test coverage ≥ 80%
- All acceptance criteria have tests
- Test fixtures and mocks created
- Tests compile and run successfully

**Quality Gates (Stage 3):**
- All unit tests pass (100%)
- All integration tests pass (100%)
- All E2E tests pass (100%)
- Test coverage ≥ 80%
- No flaky tests

### code-reviewer (Stage 5)
- Parses review comments from PRs
- Classifies comments by type
- Creates tasks for each comment category
- Enforces automated review checks
- Assesses performance implications
- Verifies security implications
- Checks accessibility compliance

**Quality Gates:**
- PR size ≤ 400 lines
- No TODO/FIXME comments
- No debug statements (console.log, debugger, print)
- All functions documented
- Migration guide for breaking changes
- No security vulnerabilities
- No accessibility violations

**Task Creation Patterns:**
- security → "Fix Security Issues" (P0)
- bug → "Fix Review Bugs" (P0)
- architecture → "Refactor Architecture Issues" (P1)
- performance → "Optimize Performance Issues" (P1)
- accessibility → "Fix Accessibility Issues" (P1)
- documentation → "Add Missing Documentation" (P2)
- style → "Address Style Comments" (P3)

### deployment-specialist (Stage 6)
- Deploys to staging/production
- Runs smoke tests
- Checks health endpoints
- Configures monitoring and logging
- Sets up error tracking (Sentry)
- Creates rollback plans
- Monitors for deployment failures

**Quality Gates:**
- Deployment successful (no errors)
- Smoke tests pass (100%)
- Health check passes (200 OK)
- Monitoring configured
- Error tracking configured (Sentry)
- Rollback plan tested

**Failure Handling:**
- P0 "Rollback failed deployment" (immediate)
- P0 "Investigate deployment failure" (after rollback)
- P0 "Fix failing smoke tests"
- P0 "Fix service health issues"

## Key Architecture Principles

1. **Beads = Task Flow Control**
   - Handles ALL dependency logic
   - Auto-unlocks tasks when parents close
   - Auto-blocks tasks when dependencies fail
   - Orchestrator/PM2 just spawns agents for ready tasks

2. **Individual Agents = Stateless Workers**
   - Execute one task, then exit
   - No orchestration logic in agents
   - Success/Failure = close task (Beads handles the rest)

3. **Quality Gates = Stage-Specific**
   - Each stage has different checks
   - Failure triggers dependent fix task creation
   - Success triggers task completion

4. **Modular & Additive Architecture**
   - Core task-to-commit cycle stays the same
   - Each layer (PM2, CI/CD, monitoring) can be added without breaking existing workflow
   - Orchestrator/PM2 just changes the **spawner**, not the workflow

## Implementation Status

### ✅ Completed (Priority 1 & 2)
- Atomic task cycle framework
- 6-stage workflow specification
- Beads dependency graph integration
- 3 specialist agents (test-specialist, code-reviewer, deployment-specialist)
- Success/failure handling pattern
- Quality gates per stage
- Agent success/failure pattern guide

### 🔄 In Progress / Next (Priority 3)
- PM2 ecosystem & headless workers
- Local code quality tools (ESLint, Prettier, Black, pylint, Snyk)
- Failure detection patterns (detailed parsing of test/CI/CD output)
- Metrics & monitoring (Prometheus, Grafana, Sentry, PagerDuty)
- CI/CD integration (GitHub Actions workflow for stages 3-6)

## Related Documentation

- [Atomic Task Cycle Implementation](../agent/prd.md#15-atomic-task-workflow-specification) - PRD agent specification
- [Task Generation](../agent/generate-tasks.md) - generate-tasks agent specification
- [Agent Success/Failure Pattern](./agent-success-failure-pattern.md) - Complete agent template
- [Beads Documentation](../BEADS_GUARDRAILS_IMPLEMENTATION.md) - Beads integration
- [Agent Instructions](../AGENTS.md) - All available agents
