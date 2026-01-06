---
name: complex-project
description: Handle complex multi-domain projects requiring coordination. Use when task spans frontend+backend+infrastructure, requires multiple specialists, user mentions "enterprise", "full system", "end-to-end", "production-ready", or project needs deep research and parallel execution.
---

# Complex Project Skill

## When to Activate
- Task spans 3+ technical domains (frontend, backend, database, infrastructure)
- User mentions "enterprise", "production-ready", "full stack", "complete system"
- Project requires coordination between multiple specialists
- Deep codebase research would significantly improve planning
- Task is ambiguous and needs exploration before implementation
- Security, performance, or compliance requirements are mentioned
- User asks to "build from scratch" or create a "complete" solution

## Workflow

### Layer 0: Parallel Research Phase
Orchestrator launches up to 6 research droids in parallel:
- `@codebase-researcher` - Architecture patterns analysis
- `@git-history-analyzer` - Historical change patterns
- `@library-source-reader` - Technology insights
- `@file-picker-agent` - Targeted file discovery
- `@context-researcher` - Project-wide context
- `@best-practices-researcher` - Industry standards

### Layer 1: Discovery + Intelligence
- Synthesize research findings
- Identify technical constraints and risks
- Map existing patterns and conventions

### Layer 2: Planning + PRD
- Invoke `@prd` for comprehensive requirements
- Apply research intelligence to inform PRD
- Generate acceptance criteria with codebase context

### Layer 3: Task Breakdown
- Invoke `@generate-tasks` for parallelized tasks
- Create independent tracks with dependency mapping
- Identify critical path and integration points (use `bv --robot-insights` or `bv --robot-plan` for graph-based validation)

### Optional: Task Persistence with bd
After generating task structure, create persistent tasks using `bd create`:
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

### Layer 4: Delegation
- Orchestrator delegates to specialist droids (up to 6 parallel)
- Each droid receives full context + intelligence findings
- Tracks coordinated for maximum efficiency

### Layer 5: Review & Learning
- Quality gates with intelligence validation
- Update memory files with new patterns
- Cross-project learning integration

## Inputs Expected
- Project description or requirements
- Any constraints (tech stack, timeline, compliance)
- Scope boundaries (what's in/out)

## Outputs Produced
- Research intelligence report
- Comprehensive PRD
- Parallelized task breakdown with tracks
- Implementation by coordinated specialist droids
- Updated memory files with learned patterns

## Success Criteria
- All technical domains covered with appropriate specialists
- Parallel execution maximized (up to 6 droids)
- Research intelligence applied throughout
- Quality gates passed at each layer
- Memory updated with new patterns for future projects

## When NOT to Use
- Simple single-domain tasks (use direct droid instead)
- Quick fixes or bug fixes
- Tasks with clear, simple scope
- Time-critical simple changes
