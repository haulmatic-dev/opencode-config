# TLDR Integration - Parallel Execution Plan

## Executive Summary

**Timeline Reduction**: 7 weeks → 3-4 weeks with parallel execution

## Phase Dependencies

```
Phase 1: Core Plugin (DONE ✅)
    │
    ├──► Phase 2: Context Injection & Hooks (independent)
    │
    ├──► Phase 3: Beads Integration (independent)
    │
    ├──► Phase 4: osgrep Removal (independent)
    │
    ├──► Phase 5: Advanced Features (independent)
    │       │
    │       ├──► tldr_slice (program slicing)
    │       ├──► tldr_dfg (data flow analysis)
    │       ├──► tldr_cfg (control flow graphs)
    │       ├──► tldr_arch (architecture analysis)
    │       └──► tldr_dead (dead code detection)
    │
    └──► Phase 6: MCP Integration (depends on Phase 5 tools)
```

## Parallel Tracks

### Track A: Context + Beads (Weeks 2-3)

| Phase   | Tasks                                    | Dependencies   |
| ------- | ---------------------------------------- | -------------- |
| Phase 2 | Hooks, context selection, file detection | Phase 1 (DONE) |
| Phase 3 | Impact integration, change-impact tool   | Phase 1 (DONE) |

**Rationale**: Both phases only depend on Phase 1 core infrastructure.

### Track B: osgrep Removal (Week 2-3)

| Phase   | Tasks                                     | Dependencies   |
| ------- | ----------------------------------------- | -------------- |
| Phase 4 | Remove osgrep from scripts, docs, configs | Phase 1 (DONE) |

**Rationale**: Removing osgrep is independent of other phases.

### Track C: Advanced Tools (Weeks 2-4)

| Phase   | Tasks                                | Dependencies   |
| ------- | ------------------------------------ | -------------- |
| Phase 5 | 5 tools: slice, dfg, cfg, arch, dead | Phase 1 (DONE) |

**Rationale**: All tools use the same client library.

### Track D: MCP Integration (Weeks 4-5)

| Phase   | Tasks                             | Dependencies         |
| ------- | --------------------------------- | -------------------- |
| Phase 6 | MCP server, registration, testing | Phase 5 (or Phase 1) |

**Rationale**: MCP can expose existing tools from Phase 1.

## Execution Timeline

```
Week 1:  Phase 1 (COMPLETE ✅)

Week 2-3:
  ┌─────────────┬─────────────┬─────────────┬─────────────┐
  │ Track A     │ Track B     │ Track C     │ Track D     │
  │ Phase 2+3   │ Phase 4     │ Phase 5     │ Phase 6     │
  │ (parallel)  │ (parallel)  │ (parallel)  │             │
  └─────────────┴─────────────┴─────────────┴─────────────┘

Week 4:
  ┌─────────────┬─────────────┬─────────────┐
  │ Track A     │ Track C     │ Track D     │
  │ Finish      │ Continue    │ Continue    │
  └─────────────┴─────────────┴─────────────┘

Week 5:
  ┌─────────────┬─────────────┐
  │ Track C     │ Track D     │
  │ Finish      │ Finish      │
  └─────────────┴─────────────┘
```

## Parallel Within Each Phase

### Phase 2: 5 tasks in parallel

1. agent.execute.before hook ✓
2. agent.execute.after hook ✓
3. Smart context selection ✓
4. File change detection ✓
5. Test with agents ✓

### Phase 3: 5 tasks in parallel

1. tldr impact with Beads ✓
2. tldr change-impact tool ✓
3. Beads tasks for TLDR ✓
4. Update beads-tools.mjs ✓
5. Document workflow ✓

### Phase 4: 7 tasks in parallel

1. Remove osgrep from scripts ✓
2. Remove osgrep from diagnostics ✓
3. Update semantic-search.md ✓
4. Update AGENTS.md ✓
5. Remove model downloads ✓
6. Update README.md ✓
7. Benchmark performance ✓

### Phase 5: 5 tools in parallel

1. tldr_slice ✓
2. tldr_dfg ✓
3. tldr_cfg ✓
4. tldr_arch ✓
5. tldr_dead ✓

### Phase 6: 5 tasks in parallel

1. MCP server implementation ✓
2. Register MCP server ✓
3. Test with Claude Code ✓
4. Test with Claude Desktop ✓
5. Document MCP integration ✓

## Beads Tasks for Parallel Execution

### Track A Tasks (Week 2-3)

| ID  | Title                      | Priority | Track |
| --- | -------------------------- | -------- | ----- |
|     | Phase 2 Hooks              | P2       | A     |
|     | Phase 2 Context Selection  | P2       | A     |
|     | Phase 2 File Detection     | P2       | A     |
|     | Phase 2 Testing            | P2       | A     |
|     | Phase 3 Impact Integration | P2       | A     |
|     | Phase 3 change-impact Tool | P2       | A     |
|     | Phase 3 beads-tools Update | P2       | A     |
|     | Phase 3 Documentation      | P2       | A     |

### Track B Tasks (Week 2-3)

| ID  | Title                             | Priority | Track |
| --- | --------------------------------- | -------- | ----- |
|     | Phase 4 Remove osgrep Scripts     | P2       | B     |
|     | Phase 4 Remove osgrep Diagnostics | P2       | B     |
|     | Phase 4 Update semantic-search.md | P2       | B     |
|     | Phase 4 Update AGENTS.md          | P2       | B     |
|     | Phase 4 Remove Model Downloads    | P2       | B     |
|     | Phase 4 Update README             | P2       | B     |
|     | Phase 4 Benchmark                 | P2       | B     |

### Track C Tasks (Weeks 2-4)

| ID  | Title              | Priority | Track |
| --- | ------------------ | -------- | ----- |
|     | Phase 5 tldr_slice | P2       | C     |
|     | Phase 5 tldr_dfg   | P2       | C     |
|     | Phase 5 tldr_cfg   | P2       | C     |
|     | Phase 5 tldr_arch  | P2       | C     |
|     | Phase 5 tldr_dead  | P2       | C     |

### Track D Tasks (Weeks 4-5)

| ID  | Title                       | Priority | Track |
| --- | --------------------------- | -------- | ----- |
|     | Phase 6 MCP Server          | P2       | D     |
|     | Phase 6 MCP Registration    | P2       | D     |
|     | Phase 6 Claude Code Test    | P2       | D     |
|     | Phase 6 Claude Desktop Test | P2       | D     |
|     | Phase 6 MCP Documentation   | P2       | D     |

## Resource Requirements

**Minimum parallelism**: 2 concurrent developers
**Optimal parallelism**: 4 concurrent developers

With 4 parallel tracks:

- Week 2-3: All 4 tracks active
- Week 4: Tracks A done, B done, C+D continue
- Week 5: C+D finish

**Estimated completion**: Week 5 (vs original Week 7)

## Critical Path

1. Phase 1 (DONE) → Week 2 starts
2. Track A (Phase 2+3) → Week 3 ends
3. Track B (Phase 4) → Week 3 ends
4. Track C (Phase 5) → Week 4-5
5. Track D (Phase 6) → Week 4-5

**Critical path length**: 3 weeks (Week 2-4 active, Week 5 finish)
