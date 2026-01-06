---
name: task-breakdown
description: Break down features or PRDs into actionable tasks. Use when user has a PRD, feature spec, or description and wants tasks, todo list, implementation steps, or work breakdown.
---

# Task Breakdown Skill

## When to Activate
- User has an existing PRD or feature specification
- User asks to "break down", "create tasks", "what are the steps"
- User wants implementation roadmap or todo list
- User provides feature description and wants actionable tasks
- User asks "how do I implement this" with clear scope

## Workflow

### Step 1: Analyze Input
1. Determine if input is PRD, feature description, or requirements
2. If no PRD exists but feature is complex, suggest `feature-planning` skill first

### Step 2: Generate Tasks
1. Invoke `@generate-tasks` droid with the input
2. Droid performs:
   - Codebase intelligence gathering (Senior Engineer Framework)
   - File discovery and mapping
   - Git history analysis for risk assessment
3. Generate parallelized task breakdown

### Step 3: Output Structure
- Parallelism summary (tracks, max developers, timeline)
- Visual execution timeline
- Files grouped by track
- Task hierarchy with dependencies
- Integration tasks (cross-track work)
- Dependency matrix
- Critical path highlight (use `bv --robot-insights` or `bv --robot-plan` for graph-based validation)

### Optional: Task Persistence
After generating task structure, create persistent tasks using `bd create`:
```bash
PARENT=$(bd create "Task X.X" --description="..." -t task -p 1 --json | jq -r '.id')
bd create "Task X.Y" --description="..." -t task -p 2 --deps discovered-from:$PARENT --json
```

## Inputs Expected
- PRD document or feature specification
- Feature description with clear scope
- Any constraints or requirements

## Outputs Produced
- `tasks-[feature-name]-parallel.md` containing:
  - Track assignments (Backend/Frontend/Infrastructure)
  - Dependency mapping (depends on, blocks, parallel with)
  - File mappings for each task
  - Success criteria per task
  - Critical path analysis

## Success Criteria
- Tasks organized into 2-4 independent tracks
- Every task has explicit dependencies stated
- File paths are accurate and grouped by track
- Critical path identified with time estimates (validate with `bv --robot-insights` after task creation)
- Junior developer can execute tasks without ambiguity

## Fallback
- If scope is too large/ambiguous → suggest `complex-project` skill
- If no requirements exist → suggest `feature-planning` skill first
