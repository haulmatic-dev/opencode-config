# Beads Task Analysis & Consolidation Plan

**Date:** 2026-01-09
**Total Tasks:** 48
**Status Analysis:** 24 tombstoned, 15 closed, 2 in progress, 7 open

---

## Current Task Distribution

### By Status
| Status | Count | Percentage |
|---------|--------|------------|
| **Tombstone** | 24 | 50% |
| **Closed** | 15 | 31% |
| **In Progress** | 2 | 4% |
| **Open** | 7 | 15% |

**Issue:** 50% of tasks are tombstoned (abandoned/obsolete)

### By Type
| Type | Count |
|------|--------|
| **Epic** | 2 |
| **Task** | 46 |

### By Priority
| Priority | Count |
|----------|--------|
| **P1** | 29 |
| **P2** | 10 |
| **P3** | 9 |

---

## Top Tasks (Current Priority)

| ID | Title | Status | Priority | Blocks |
|----|-------|--------|----------|--------|
| opencode-0bc | Migrate Factory CLI to opencode with cass_memory | Tombstone | P1 | 4 |
| opencode-o0b | Create hook-based service check architecture for opencode | Tombstone | P1 | 1 |
| opencode-6n7 | Migrate MCP Agent Mail integration to opencode | Tombstone | P1 | 0 |
| opencode-9bz | Migrate droids from Factory CLI to opencode agent/ | Tombstone | P1 | 0 |
| opencode-ivn | Migrate skills from Factory CLI to opencode skills/ | Tombstone | P1 | 0 |
| opencode-pqy | Investigate and plan agent migration | Tombstone | P1 | 0 |

---

## Task Groups by Purpose

### Group 1: Factory Migration Tasks (Obsolete)
**Tasks:** opencode-0bc, opencode-9bz, opencode-ivn, opencode-pqy, opencode-hfi, opencode-7u8, opencode-yl1, opencode-8eu

**Issue:** These are tombstoned Factory migration tasks that are now obsolete because we're building a NEW architecture instead.

**Action:** DELETE or MARK OBSOLETE

### Group 2: Infrastructure Tasks (Partially Relevant)
**Tasks:** opencode-o0b, opencode-6n7, opencode-0zl, opencode-4wm, opencode-7ts, opencode-jub

**Issue:** Some are still relevant, some are tombstoned

**Relevant Tasks:**
- opencode-o0b: Hook-based service check architecture (blocked by opencode-0bc)
- opencode-6n7: MCP Agent Mail integration (tombstoned)
- opencode-0zl: Integrate MCP Agent Mail into opencode-init (tombstoned)
- opencode-4wm: Create opencode MCP Agent Mail client helper (tombstoned)

**Action:** CONSOLIDATE into new architecture tasks

### Group 3: UBS Integration (Completed)
**Tasks:** opencode-q4a, opencode-7ts, opencode-jub

**Status:** opencode-q4a just closed (UBS integration tested successfully)

**Action:** opencode-7ts and opencode-jub may be obsolete, verify

### Group 4: Task-to-Commit Workflow (New)
**Tasks:** (none yet in Beads)

**Issue:** No tasks for new architecture implementation yet

**Action:** CREATE new tasks for architecture implementation

---

## Consolidation Plan

### Phase 1: Clean Up Obsolete Tasks

**Delete or Mark Obsolete (8 tasks):**
```bash
# Factory migration tasks (obsolete - new architecture)
bd delete opencode-0bc  # "Migrate Factory CLI to opencode with cass_memory"
bd delete opencode-9bz  # "Migrate droids from Factory CLI to opencode agent/"
bd delete opencode-ivn  # "Migrate skills from Factory CLI to opencode skills/"
bd delete opencode-pqy  # "Investigate and plan agent migration"
bd delete opencode-hfi  # "Convert prd.md - remove Factory dependencies"
bd delete opencode-7u8  # "Convert generate-tasks.md - remove Factory dependencies"
bd delete opencode-yl1  # "Remove Factory-specific agent files"
bd delete opencode-8eu  # "Create workspace-init script"
```

**Rationale:**
- These were Factory CLI migration tasks
- We're building NEW architecture, not migrating Factory
- Keeping them creates confusion and noise

### Phase 2: Consolidate Infrastructure Tasks

**Consolidate Into New Tasks (5 tasks → 3 tasks):**

**OLD → NEW:**

```
opencode-o0b: "Create hook-based service check architecture for opencode"
opencode-6n7: "Migrate MCP Agent Mail integration to opencode"
opencode-0zl: "Integrate MCP Agent Mail into opencode-init"
opencode-4wm: "Create opencode MCP Agent Mail client helper"
opencode-7ts: "Test MCP Agent Mail integration"

→ CONSOLIDATE INTO →

NEW TASK 1: "Implement Parallel Agent Spawn Middleware"
  - Create lib/parallel-agent-middleware.js
  - PM2 and subprocess support for headless workers
  - Worker lifecycle management
  - Returns: spawn_headless_worker(), wait_for_completion(), monitor_workers()

NEW TASK 2: "Implement Orchestrator Main Loop"
  - Update agent/orchestrator.md
  - Continuous bd.ready() polling
  - MCP message handling
  - Periodic status reporting (every 5 min)
  - User command handling
  - Minimal state tracking

NEW TASK 3: "Integrate MCP Agent Mail End-to-End"
  - Register orchestrator with MCP
  - Test agent-to-agent communication
  - Verify message passing
  - Test worker spawning via middleware
```

**Delete Old:**
```bash
bd delete opencode-o0b
bd delete opencode-6n7
bd delete opencode-0zl
bd delete opencode-4wm
bd delete opencode-7ts
```

### Phase 3: Verify UBS Tasks

**Check These Tasks:**
- opencode-q4a: "Test UBS integration end-to-end" (CLOSED ✅)
- opencode-7ts: "Test MCP Agent Mail integration" (tombstoned)
- opencode-jub: "Update AGENTS.md with UBS quick reference" (tombstoned)

**Action:**
- opencode-7ts: DELETE (consolidated into NEW TASK 3)
- opencode-jub: VERIFY if still needed or DELETE

### Phase 4: Create New Architecture Tasks

**Create Tasks for New Architecture (6 tasks):**

```bash
# Priority 1: Core Infrastructure
bd create \
  --title "Implement Parallel Agent Spawn Middleware" \
  --type "epic" \
  --priority 1 \
  --labels "infrastructure,high-impact" \
  --description "Create shared middleware for spawning headless opencode workers via PM2 or subprocess. Includes worker lifecycle management, health monitoring, and result aggregation."

bd create \
  --title "Implement Orchestrator Main Loop" \
  --type "epic" \
  --priority 1 \
  --labels "infrastructure,orchestrator" \
  --description "Update orchestrator with continuous bd.ready() polling, MCP message handling, periodic status reporting, user command handling, and minimal state tracking."

bd create \
  --title "Integrate MCP Agent Mail End-to-End" \
  --type "task" \
  --priority 1 \
  --depends-on "implement-parallel-agent-spawn-middleware,implement-orchestrator-main-loop" \
  --labels "mcp,integration" \
  --description "Register orchestrator with MCP, test agent-to-agent communication, verify message passing, test worker spawning via middleware."

# Priority 2: Agent Integration
bd create \
  --title "Add Research Integration to PRD Agent" \
  --type "task" \
  --priority 2 \
  --depends-on "implement-parallel-agent-spawn-middleware" \
  --labels "agent,prd,research" \
  --description "Update agent/prd.md with optional parallel research spawning. Integrate with parallel agent spawn middleware. Create research tasks as Beads tasks (optional)."

bd create \
  --title "Add Research Integration to Generate-Tasks Agent" \
  --type "task" \
  --priority 2 \
  --depends-on "implement-parallel-agent-spawn-middleware" \
  --labels "agent,generate-tasks,research" \
  --description "Update agent/generate-tasks.md with optional parallel research spawning. Integrate with parallel agent spawn middleware. Create research tasks as Beads tasks (optional)."

bd create \
  --title "Test End-to-End Figma Workflow" \
  --type "task" \
  --priority 3 \
  --depends-on "integrate-mcp-agent-mail,end-to-end,add-research-integration-to-prd-agent,add-research-integration-to-generate-tasks-agent" \
  --labels "testing,figma,e2e" \
  --description "Test complete Figma → PRD → Generate-Tasks → Beads → Implementation workflow. Verify all agents communicate via MCP and headless workers execute correctly."
```

### Phase 5: Create VM Setup Tasks (If Needed)

```bash
bd create \
  --title "Set Up Remote VM Environment" \
  --type "task" \
  --priority 1 \
  --labels "infrastructure,vm,setup" \
  --description "Set up remote VM environment for opencode orchestration. Includes: VM provisioning, dependency installation, MCP Agent Mail server setup, PM2 installation, Beads installation, opencode installation, and testing."

bd create \
  --title "Create VM Provisioning Script" \
  --type "task" \
  --priority 1 \
  --depends-on "set-up-remote-vm-environment" \
  --labels "infrastructure,vm,automation" \
  --description "Create automated VM provisioning script for opencode. Includes: one-command setup, dependency installation verification, configuration bootstrapping, and health checks."
```

---

## Summary of Actions

### Tasks to DELETE (13 total)

**Factory Migration (8):**
- opencode-0bc
- opencode-9bz
- opencode-ivn
- opencode-pqy
- opencode-hfi
- opencode-7u8
- opencode-yl1
- opencode-8eu

**Infrastructure Consolidation (5):**
- opencode-o0b
- opencode-6n7
- opencode-0zl
- opencode-4wm
- opencode-7ts

**UBS Tasks (1):**
- opencode-7ts (consolidated into new MCP integration task)

**Potential Deletion (1):**
- opencode-jub (verify if still needed)

### Tasks to CREATE (6 new)

**Priority 1 (Core Infrastructure):**
1. "Implement Parallel Agent Spawn Middleware" (epic)
2. "Implement Orchestrator Main Loop" (epic)
3. "Integrate MCP Agent Mail End-to-End" (task)

**Priority 2 (Agent Integration):**
4. "Add Research Integration to PRD Agent" (task)
5. "Add Research Integration to Generate-Tasks Agent" (task)
6. "Test End-to-End Figma Workflow" (task)

**Priority 3 (VM Setup - Optional):**
7. "Set Up Remote VM Environment" (task)
8. "Create VM Provisioning Script" (task)

---

## After Consolidation

**Expected Task Count:**
- Current: 48 tasks
- Delete: 13-14 tasks
- Create: 6 new tasks
- **New Total: ~40 tasks** (cleaner, aligned with new architecture)

**Expected Improvement:**
- ✅ No obsolete Factory migration tasks
- ✅ Consolidated infrastructure tasks
- ✅ Aligned with new architecture plan
- ✅ Clear priority structure (P1: core, P2: integration, P3: testing)
- ✅ Proper dependencies between tasks
- ✅ VM setup tasks included (optional)

---

## Next Steps

1. ✅ Review this consolidation plan
2. ⏭️ Execute task deletions
3. ⏭️ Create new architecture tasks
4. ⏭️ Verify dependencies are correct
5. ⏭️ Update AGENTS.md with new task structure
6. ⏭️ Begin implementation (start with Parallel Agent Spawn Middleware)
