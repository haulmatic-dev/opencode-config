---
name: feature-planning
description: Plan new features end-to-end with PRD and parallelized tasks. Use when user describes a new feature, says "I want to build", "let's add", "implement", or asks for requirements, specs, or task breakdown.
---

# Feature Planning Skill

## When to Activate
- User describes a new feature idea or enhancement
- User asks for PRD, requirements, specifications, or planning
- User says "plan", "design", "architect", or "break down" a feature
- User wants to know "what needs to be done" for a feature
- User mentions building something new that spans multiple components

## Workflow

### Phase 1: Requirements Gathering
1. Invoke `@prd` droid with the feature description
2. Let PRD droid:
   - Gather codebase intelligence silently
   - Ask clarifying questions one at a time
   - Generate comprehensive PRD with acceptance criteria
3. Save PRD to `/tasks/prd-[feature-name].md`

### Phase 2: Task Breakdown (After PRD Approval)
1. Invoke `@generate-tasks` droid with the PRD
2. Let task droid:
   - Analyze PRD and codebase
   - Create parallel tracks (Backend/Frontend/Infrastructure)
   - Generate dependency matrix and critical path
   - Create visual execution timeline
3. Save tasks to `/tasks/tasks-[feature-name]-parallel.md`

### Optional: Task Persistence
After task generation, create persistent tasks using `bd create`:
```bash
PARENT=$(bd create "Task X.X" --description="..." -t task -p 1 --json | jq -r '.id')
bd create "Task X.Y" --description="..." -t task -p 2 --deps discovered-from:$PARENT --json
```

### Optional: Beads Viewer Integration
After creating tasks, use `bv` for intelligent analysis:
```bash
# Critical path and parallel tracks
bv --robot-plan

# PageRank-based task prioritization
bv --robot-triage

# Comprehensive project health
bv --robot-insights
```

## Inputs Expected
- Feature description or idea from user
- Any constraints or requirements mentioned
- Target tech stack (if specified)

## Outputs Produced
- `prd-[feature-name].md` - Comprehensive PRD with:
  - User stories and acceptance criteria
  - Functional/non-functional requirements
  - Risk assessment and success metrics
- `tasks-[feature-name]-parallel.md` - Parallelized task breakdown with:
  - Independent tracks for team assignment
  - Dependency matrix
  - Critical path and timeline estimate

## Success Criteria
- PRD covers all functional requirements with testable acceptance criteria
- Tasks are organized into 2-4 parallel tracks
- Each task has clear file mappings and success criteria
- Critical path is identified with timeline estimate (validate with `bv --robot-insights` after task creation)
- Junior developer can understand and execute tasks

## Integration Notes
- Both droids use Senior Engineer Framework for intelligence gathering
- Memory files are read for historical patterns
- Codebase analysis informs technical constraints
