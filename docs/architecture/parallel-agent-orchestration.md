# Architecture Design: Parallel Agent Orchestration

## Current Workflow Understanding

### Work Types

**1. Annotated Figma Files (Primary Source)**
- Each component has annotations explaining functionality
- Annotations reference JIRA tickets
- **Annotated Figma = PRD** (acts as requirements document)
- Used for both backend and frontend development

**2. JIRA Tickets (Secondary Source)**
- When Figma not available
- Can be: bug fixes, capability development, architecture design
- Explain requirements directly

**3. Combination Approach (Most Common)**
- Annotated Figma (design + functionality) → PRD Agent → Generate-Tasks Agent → Beads Tasks
- Creates structured workflow: Design → Requirements → Tasks → Implementation

### Work Categories

| Type | Source | Output |
|------|--------|--------|
| **Capability Development** | Annotated Figma + JIRA | Build new feature (frontend UI or backend logic) |
| **Bug Fixes** | JIRA ticket | Fix specific issue (frontend or backend) |
| **Architecture Design** | JIRA ticket | Design system architecture (frontend or backend) |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (Coordinator)                   │
│  - Spawns headless workers via PM2/subprocess               │
│  - Communicates via MCP Agent Mail                              │
│  - Reads Beads for ready tasks                                 │
│  - Reports status periodically                                    │
│  - Minimal context (conserve window)                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌───────────────┼──────────────────┬──────────────────┐
        │               │                  │                  │
        ▼               ▼                  ▼                  ▼
  ┌─────────┐    ┌──────────┐    ┌─────────────┐   ┌──────────┐
  │   PRD   │    │ GENERATE │    │ PARALLEL    │   │  BEADS   │
  │  AGENT  │    │  TASKS   │    │ AGENT SPAWN │   │ TASKS   │
  │         │    │  AGENT  │    │ MIDDLEWARE  │   │         │
  │         │    │         │    │             │   │         │
  │         │    │         │    │             │   │         │
  └────┬────┘    └────┬────┘    └──────┬──────┘   └────┬────┘
       │                │                  │                 │
       │                │                  │                 │
       ▼                ▼                  ▼                 ▼
  ┌─────────┐    ┌──────────┐    ┌─────────────┐   ┌──────────┐
  │  FIGMA  │    │  HEADLESS│    │  HEADLESS   │   │ HEADLESS │
  │AGENT    │    │ WORKER 1 │    │  WORKER N   │   │ WORKER N │
  └─────────┘    └──────────┘    └─────────────┘   └──────────┘
       │                │                  │                 │
       │                └──────────┬───────┘                 │
       │                           │                          │
       ▼                           ▼                          ▼
  ┌─────────┐             ┌────────────┐              ┌──────────┐
  │DESIGN   │             │ RESEARCH   │              │ CODING   │
  │RENDERED │             │  TASKS    │              │ TASKS    │
  │OUTPUT   │             │ (Beads)   │              │ (Beads)  │
  └─────────┘             └────────────┘              └──────────┘
```

---

## Component Descriptions

### 1. Orchestrator (Coordinator)

**Purpose:** Main coordinator for task-to-commit workflow

**Responsibilities:**
- Spawn headless workers via PM2 or subprocess
- Communicate via MCP Agent Mail only
- Read Beads for ready tasks
- Report status periodically (every 5 min, unless asked)
- Conserve context window (minimal state tracking)
- Handle user commands (status, pause, resume, stop)

**Does NOT:**
- ❌ Generate PRDs directly
- ❌ Create task breakdowns directly
- ❌ Implement code directly

**Coordinates:**
- ✅ PRD Agent (when PRD generation needed)
- ✅ Generate-Tasks Agent (when task breakdown needed)
- ✅ Beads tasks (ready tasks for implementation)
- ✅ Workers via MCP Agent Mail

---

### 2. PRD Agent (Standalone)

**Purpose:** Generate PRDs from annotated Figma files or JIRA tickets

**Responsibilities:**
- Read annotated Figma files (via figma-design-extractor)
- Read JIRA ticket information
- Generate comprehensive PRD documents
- Write `prd-*.md` files
- Accept pre-gathered research (via middleware)

**Triggers:**
- User provides Figma link
- Orchestrator spawns PRD agent with Figma URL
- User requests PRD for JIRA ticket

**Output:**
- `prd-*.md` file with requirements, acceptance criteria, risk assessment
- Sent back via MCP Agent Mail to orchestrator

**Integration:**
- Uses **Parallel Agent Spawn Middleware** for research tasks
- Creates research tasks as Beads tasks (optional)

---

### 3. Generate-Tasks Agent (Standalone)

**Purpose:** Transform PRDs into parallelized task breakdowns

**Responsibilities:**
- Read PRD files
- Create Beads tasks with dependencies
- Create `tasks-*.md` files
- Organize into independent tracks (swimlanes)
- Accept pre-gathered research (via middleware)

**Triggers:**
- Orchestrator spawns generate-tasks agent with PRD path
- User requests task breakdown from PRD

**Output:**
- Beads tasks (via `bd create`)
- `tasks-*.md` file with task hierarchy
- Sent back via MCP Agent Mail to orchestrator

**Integration:**
- Uses **Parallel Agent Spawn Middleware** for research tasks
- Creates research tasks as Beads tasks (optional)

---

### 4. Parallel Agent Spawn Middleware (NEW)

**Purpose:** Shared middleware for spawning headless opencode workers

**Responsibilities:**
- Spawn headless opencode instances (PM2 or subprocess)
- Manage worker lifecycle (start, monitor, cleanup)
- Return results from spawned workers
- Handle failures and timeouts
- Track worker PIDs and status

**API:**
```python
# Middleware API that any agent can use
from parallel_agent_middleware import spawn_headless_worker, wait_for_completion

# Spawn single worker
worker = spawn_headless_worker(
    agent_type="codebase-researcher",
    task_id="research-architecture",
    task_description="Analyze architecture patterns",
    timeout=600  # 10 minutes
)

# Spawn multiple workers in parallel
workers = [
    spawn_headless_worker("codebase-researcher", ...),
    spawn_headless_worker("git-history-analyzer", ...),
    spawn_headless_worker("file-picker-agent", ...),
    spawn_headless_worker("domain-specialist", ...),
]

# Wait for all to complete
results = wait_for_all(workers)
```

**Implementation Options:**
- **PM2** (production): `pm2.start('opencode-task-research', env=...)`
- **subprocess** (development): `subprocess.Popen(['opencode', '--headless', ...])`

---

### 5. Research Tasks as Beads Tasks

**Purpose:** Make research tasks pickable by any agent anywhere

**Approach:**
- Research droids create Beads tasks when they run
- Beads tracks research output and completion
- Any agent (orchestrator, PRD, generate-tasks) can read research results

**Example:**
```python
# codebase-researcher creates research task
bd.create(
    title="Analyze codebase architecture patterns",
    type="research",
    priority=1,
    deliverables=["~/.orchestrator/memory/codebase_intelligence.json"],
    description="Analyze codebase to extract architecture patterns, coding conventions, security implementations, performance characteristics"
)

# When PRD agent needs research, it can check for existing tasks
ready_research = bd.ready(type="research")

if ready_research:
    # Use existing research results
    codebase_intel = read_json_file("~/.orchestrator/memory/codebase_intelligence.json")
else:
    # Spawn new research tasks
    spawn_research_tasks()
```

**Benefits:**
- Research tasks visible in Beads triage
- Can be picked up by any agent needing that intelligence
- Progress tracked centrally
- No duplication - if research already exists, reuse it

---

## Work Flows

### Flow 1: Annotated Figma → PRD → Tasks → Implementation

```
User Request: "Build login form from Figma"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Orchestrator: Figma link detected                         │
│ ├─ Spawn figma-design-extractor via middleware              │
│ └─ Spawn PRD agent via middleware                      │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ PRD Agent:                                            │
│ ├─ Receive Figma design spec from figma-design-extractor   │
│ ├─ (Optional) Spawn parallel research via middleware:        │
│ │   ├─ codebase-researcher (Beads task)              │
│ │   ├─ file-picker-agent (Beads task)                │
│ │   └─ domain-specialist (Beads task)               │
│ ├─ Generate PRD from design spec + research               │
│ └─ Write prd-login-form.md                               │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Orchestrator: PRD complete                              │
│ └─ Spawn generate-tasks agent via middleware                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Generate-Tasks Agent:                                    │
│ ├─ Read prd-login-form.md                                  │
│ ├─ (Optional) Spawn parallel research via middleware:        │
│ │   ├─ git-history-analyzer (Beads task)              │
│ │   ├─ library-source-reader (Beads task)              │
│ │   └─ best-practices-researcher (Beads task)         │
│ ├─ Create Beads tasks with dependencies                    │
│ └─ Write tasks-login-form.md                             │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Orchestrator: Tasks ready for implementation              │
│ └─ Spawn implementation workers via middleware             │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
Multiple headless workers (implementation, testing, quality checks)
run in parallel via MCP Agent Mail coordination
```

### Flow 2: JIRA Ticket → Direct Implementation

```
User Request: "Fix login bug from JIRA-1234"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Orchestrator: JIRA ticket detected                         │
│ └─ Spawn implementation agent via middleware                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Implementation Agent:                                    │
│ ├─ Read JIRA-1234 details                                   │
│ ├─ Implement fix                                           │
│ ├─ Run quality gates (UBS, lint, typecheck, test)        │
│ └─ Complete Beads task                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## MCP Agent Mail Integration

All communication via MCP Agent Mail:

**Message Types:**
- `task_assignment` - Orchestrator → Worker agent
- `task_completion` - Worker agent → Orchestrator
- `task_failure` - Worker agent → Orchestrator
- `research_result` - Research agent → Any agent needing research
- `status_update` - Periodic status updates

**Message Flow:**
```
Orchestrator → [assign task] → Worker A
Orchestrator → [assign task] → Worker B
Worker A → [complete task] → Orchestrator
Worker B → [complete task] → Orchestrator
Orchestrator → [read Beads] → Next ready task
Orchestrator → [assign task] → Worker C
```

---

## Implementation Priority

### Priority 1: Parallel Agent Spawn Middleware
**File:** `lib/parallel-agent-middleware.js` or `agent/parallel-middleware.mjs`

**Components:**
1. `spawn_headless_worker()` - Spawn via PM2 or subprocess
2. `wait_for_completion()` - Wait for worker completion
3. `monitor_workers()` - Track worker health
4. `cleanup_workers()` - Cleanup completed/failed workers
5. `get_worker_status()` - Query worker status

### Priority 2: Orchestrator Main Loop
**File:** Update `agent/orchestrator.md`

**Components:**
1. `main_orchestration_loop()` - Continuous loop
2. `get_ready_tasks_from_beads()` - Read Beads
3. `spawn_workers_via_middleware()` - Use middleware
4. `process_mcp_messages()` - Handle completions
5. `report_status_summary()` - Periodic reports
6. `handle_user_commands()` - User input handling

### Priority 3: PRD Agent Research Integration
**File:** Update `agent/prd.md`

**Components:**
1. Add "Optional: Spawn Parallel Research" section
2. Integrate with parallel agent spawn middleware
3. Create research tasks as Beads (optional)

### Priority 4: Generate-Tasks Agent Research Integration
**File:** Update `agent/generate-tasks.md`

**Components:**
1. Add "Optional: Spawn Parallel Research" section
2. Integrate with parallel agent spawn middleware
3. Create research tasks as Beads (optional)

---

## Key Design Decisions

### Decision 1: Orchestrator Focus
**Chosen:** Orchestrator is pure coordinator
**Reason:** Separates concerns cleanly
- Orchestrator coordinates
- PRD agent does PRD
- Generate-tasks agent does task breakdown

### Decision 2: Research Tasks as Beads Tasks
**Chosen:** Create research tasks as Beads tasks
**Reason:**
- Research visible in Beads triage
- Reusable across agents
- Progress tracked centrally
- No duplication

### Decision 3: Shared Middleware
**Chosen:** Create parallel agent spawn middleware
**Reason:**
- Any agent can use it
- Centralized worker management
- PM2 or subprocess abstraction
- Easier testing and maintenance

### Decision 4: Context Conservation
**Chosen:** Minimal state in orchestrator
**Reason:**
- Prevents context window exhaustion
- Reduces hallucinations
- Better performance
- Cleaner architecture

---

## Benefits of This Architecture

| Aspect | Benefit |
|---------|----------|
| **Modularity** | Each agent has single responsibility |
| **Reusability** | Middleware used by all agents |
| **Visibility** | Research tasks visible in Beads |
| **Parallelism** | Multiple workers run simultaneously |
| **Coordination** | MCP Agent Mail centralizes communication |
| **Flexibility** | Works with Figma, JIRA, or combination |
| **Scalability** | Can spawn many workers in parallel |
| **Resilience** | Worker failures handled gracefully |
| **Observability** | Status reports, Beads tracking |

---

## Next Steps

1. ✅ **Design complete** - This document
2. ⏭️ **Implement parallel agent spawn middleware** (Priority 1)
3. ⏭️ **Update orchestrator with main loop** (Priority 1)
4. ⏭️ **Update PRD agent with research integration** (Priority 2)
5. ⏭️ **Update generate-tasks agent with research integration** (Priority 2)
6. ⏭️ **Test end-to-end workflow** (Figma → PRD → Tasks → Implementation)
7. ⏭️ **Test JIRA workflow** (JIRA → Direct implementation)
