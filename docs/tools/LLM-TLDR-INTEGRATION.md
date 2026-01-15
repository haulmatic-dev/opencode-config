# LLM-TLDR Integration Plan for opencode

> **Project**: Integrate llm-tldr (code analysis with 95% token savings) into opencode workflow
>
> **Status**: Planning Phase
>
> **Impact**: **Replaces and removes osgrep** with 5-layer code analysis

---

## 📋 Executive Summary

### What is llm-tldr?

**llm-tldr** is a multi-layer code analysis tool that extracts structure instead of dumping raw text, providing:

- **95% token savings** (21K tokens → 175 tokens for function context)
- **155x faster queries** (100ms daemon vs 30s CLI spawns)
- **Semantic search** with embeddings (bge-large-en-v1.5)
- **16 languages** via tree-sitter parsers
- **Program slicing** for debugging (shows only relevant lines)

### Integration Strategy

**Approach**: Full replacement of osgrep with complementary integration to existing systems

| System          | Current Role                 | After TLDR Integration                   | Relationship                                                       |
| --------------- | ---------------------------- | ---------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| **GPTCache**    | Cache LLM responses          | Still caches responses                   | ✅ Complementary - TLDR reduces input size, GPTCache caches result |
| **cass_memory** | Learn procedural rules       | Still learns rules                       | ✅ Complementary - Different domains (code structure vs patterns)  |
|                 | **osgrep (semantic-search)** | Concept-based search                     | **Removed** - TLDR replaces it completely                          | ✅ TLDR provides superior capabilities |
| **Beads**       | Task tracking                | Task tracking + TLDR dependency analysis | ✅ Enhanced - `tldr impact` for code dependencies                  |

### Expected Benefits

| Metric                  | Current                | With TLDR                       | Improvement          |
| ----------------------- | ---------------------- | ------------------------------- | -------------------- |
| Tokens for code context | 21,000                 | 175                             | **99% savings**      |
| Query latency           | 30s                    | 100ms                           | **300x faster**      |
| Semantic search quality | Concept-based (osgrep) | Structure + behavior (5 layers) | **Higher precision** |
| Impact analysis         | Manual/limited         | Automated via call graphs       | **Complete**         |
| Program slicing         | Not available          | Available                       | **Debugging boost**  |

---

## 🏗️ Architecture Overview

### Current Architecture

```
User Request
  → Agent
  → cass_memory (rules ~300 tokens)
  → semantic-search (osgrep) for code discovery
  → Read raw files (~21K tokens)
  → LLM (bloated prompt)
  → Response
  → GPTCache (caches result)
```

_(osgrep provides ~50ms semantic search but lacks advanced analysis)_

### After TLDR Integration

```
User Request
  → Agent
  → cass_memory (rules ~300 tokens)
  → TLDR context injection (code structure ~1K tokens, 95% savings)
  → TLDR semantic search (replaces osgrep, 100ms vs 50ms acceptable)
  → LLM (optimized prompt)
  → Response
  → GPTCache (caches result)
```

_(osgrep completely removed)_

### TLDR's 5-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Program Dependence  → "What affects line 42?"     │
│ Layer 4: Data Flow           → "Where does this value go?"  │
│ Layer 3: Control Flow        → "How complex is this?"       │
│ Layer 2: Call Graph          → "Who calls this function?"   │
│ Layer 1: AST                 → "What functions exist?"      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    Semantic Index
                (bge-large-en-v1.5 + FAISS)
                           │
                           ▼
                      Daemon (100ms queries)
```

---

## 🎯 Integration Strategy

### Phase 1: Core Plugin Integration (Week 1)

**Goal**: Create plugin structure with essential tools and guardrails

**Tasks**:

1. Create `plugin/tldr.mjs` with tool definitions
2. Create `config/tldr.json` for configuration
3. Create `lib/tldr-client.mjs` for TLDR daemon communication
4. Implement basic tools: `tldr_context`, `tldr_semantic`
5. Add to `opencode.json` plugin list
6. **Implement guardrails in tool descriptions** (see Guardrails section)

**Deliverables**:

- Functional plugin with 2 core tools
- Configuration file
- Client library
- Unit tests
- Guardrails enforced via tool descriptions

### Phase 2: Context Injection & Hooks (Week 2)

**Goal**: Auto-inject TLDR context before agent execution

**Tasks**:

1. Implement `agent.execute.before` hook for context injection
2. Implement `agent.execute.after` hook for shift-left diagnostics
3. Create smart context selection logic (what to include)
4. Add file change detection for incremental updates
5. Test with existing agents

**Deliverables**:

- Automatic context injection working
- Shift-left diagnostics on code edits
- Incremental index updates

### Phase 3: Beads Integration (Week 3)

**Goal**: Use TLDR for impact analysis and dependency tracking

**Tasks**:

1. Integrate `tldr impact` with Beads dependency tracking
2. Create `tldr change-impact` tool for selective testing
3. Add Beads tasks for TLDR maintenance
4. Update `beads-tools.mjs` to use TLDR where appropriate
5. Document Beads + TLDR workflow

**Deliverables**:

- Beads tasks reference TLDR impact analysis
- Selective testing based on `tldr change-impact`
- Documentation

### Phase 4: Full osgrep Replacement (Week 4)

**Goal**: Complete removal of osgrep - TLDR is now only semantic search engine

**Tasks**:

1. Remove osgrep from installation scripts
2. Remove osgrep from system diagnostics (plugin/setup.mjs)
3. Update `agent/semantic-search.md` to use TLDR only
4. Update `AGENTS.md` and documentation
5. Remove osgrep models download scripts (bin/workspace-init)
6. Update README.md and project documentation
7. Benchmark TLDR performance with real workflows

**Deliverables**:

- osgrep completely removed from codebase
- Updated semantic-search agent (TLDR only)
- Updated installation scripts (TLDR checks only)
- Updated AGENTS.md documentation
- Removed osgrep model downloads

### Phase 5: Advanced Features (Week 5-6)

**Goal**: Add advanced TLDR capabilities

**Tasks**:

1. Implement program slicing (`tldr_slice`) for debugging
2. Implement data flow analysis (`tldr_dfg`)
3. Implement control flow graphs (`tldr_cfg`)
4. Create architecture analysis tool (`tldr_arch`)
5. Add dead code detection (`tldr_dead`)

**Deliverables**:

- 5 additional tools
- Debugging workflows documentation
- Architecture analysis workflows

### Phase 6: MCP Server Integration (Week 7) - OPTIONAL / DEFERRED

> **Status**: This phase is for Claude Code/Desktop integration, NOT opencode.
> opencode has TLDR integrated directly via `plugin/tldr.mjs` - no MCP needed.

**Goal**: Expose TLDR as MCP server for Claude Code/Desktop (external AI assistants)

**Tasks**:

1. Implement MCP server for TLDR daemon
2. Register MCP server in Claude config
3. Test with Claude Code and Claude Desktop
4. Document MCP integration
5. Create MCP tools reference

**Deliverables**:

- MCP server running
- Claude integration working
- MCP documentation

**Note**: This phase is ONLY needed if you want to use TLDR with:

- Claude Code (Anthropic's IDE)
- Claude Desktop (Anthropic's desktop app)

For opencode users: **Phase 6 can be safely ignored.**

---

## 🛡️ Guardrails: Required Safety Adjustments

**Critical**: TLDR's powerful capabilities require guardrails to prevent agent drift, scope expansion, and over-confident autonomous behavior.

---

## 1. Hard Enforcement Philosophy

### Core Principle

> **Rules must be enforced by system, not remembered by agent.**

We assume:

- Agents will drift
- Agents will optimize locally
- Agents will misinterpret "helpful" context

Therefore:

- All critical guardrails must be **machine-enforced**
- Violations must **fail fast**
- Partial execution must not be allowed

### Why This Matters

Without machine enforcement, agents will:

- Eventually refactor without permission
- Mutate tasks or code outside their mandate
- Create implicit work from TLDR insights

With machine enforcement:

- Behavior becomes predictable
- Failures are explicit and early
- System becomes safe for night-long or week-long execution

---

## 2. Command Interception (Required Enforcement)

### Core Principle

> **No irreversible action may occur without validation.**

### Irreversible Actions (Must Intercept)

| Action                 | Risk                        | Required Validation                   |
| ---------------------- | --------------------------- | ------------------------------------- |
| **Write files**        | Create unauthorized code    | All files belong to active Beads task |
| **Delete files**       | Remove authorized code      | All deletions within task scope       |
| **Create commits**     | Commit unauthorized changes | Commit maps to task scope             |
| **Modify Beads state** | Task scope manipulation     | Explicit task operations only         |

### Required Pre-Execution Checks

**Before ANY file write or delete**:

1. Validate that all touched files belong to active Beads task
2. Validate that no TLDR-reported scope expansion exists
3. Validate that task is in an executable state

**Before ANY commit**:

1. Validate that:
   - A task exists and is active
   - All changes map to task scope
   - No scope expansion detected by TLDR

### Failure Behavior (Non-Negotiable)

On violation:

- Abort execution immediately
- Roll back partial changes
- Emit structured violation report
- Do **not** allow retry without human or supervisor intervention

**Violation Report Format**:

```text
VIOLATION: [VIOLATION_CLASS]
Source: [SOURCE_MECHANISM]
Task: [TASK_ID]
Details: [SPECIFIC_VIOLATION]
Files affected: [LIST_OF_FILES]
Action: Execution aborted
Required next step: [REQUIRED_ACTION]
```

---

## 3. Scope Ceiling Guardrail (Non-Negotiable)

### Problem

TLDR's impact analysis, call graphs, and dependency views can cause agents to:

- "See" more problems than assigned
- Expand implementation beyond active task scope

This is one of the most common failure modes in autonomous coding agents.

### Rule

> **TLDR may reveal impact, but must never authorize additional work.**

### Scope Expansion Detection Rule

**Definition**: Scope expansion occurs when:

- TLDR impact reveals files, functions, or modules
- AND those entities are outside of active task scope

### Required System Behavior

On detection:

1. Stop execution immediately
2. Prevent file writes
3. Require explicit task creation
4. Do not auto-continue

**This rule applies even if**:

- The change is "small"
- The agent is confident
- Tests appear unaffected

---

## 4. TLDR Authority Boundaries

### TLDR Authority (Informational Only)

TLDR tools may:

- Analyze structure
- Reveal dependencies
- Explain impact
- Provide debugging slices

TLDR tools may **never**:

- Create Beads tasks
- Modify Beads DAGs
- Close tasks
- Split tasks
- Approve scope expansion

---

### Mandatory Rule (Explicit)

```markdown
TLDR output is informational only.
TLDR tools are forbidden from creating, modifying, or closing tasks.
```

### Task Creation Reserved For

- A dedicated task-management agent
- A human operator

TLDR may only _annotate_ findings for later review.

---

### Required Policy for agent/semantic-search.md

```markdown
### Scope Constraint (Non-Negotiable)

TLDR is permitted to explain impact and dependencies,
but it must never expand task scope.

If TLDR reveals additional affected files, functions, or tests:

- The agent MUST stop
- Create a new Beads task
- Proceed only after task approval

TLDR output is informational, not permissive.
```

### Implementation: Tool Guardrails

Add to `plugin/tldr.mjs` tool descriptions:

```javascript
tldr_impact: tool({
  description: `Find all callers of a function (reverse call graph). Essential for refactoring - shows what breaks if you change a function.

  ⚠️ SCOPE GUARDRAIL: This tool reveals dependencies but does NOT authorize scope expansion.
  If impact shows more affected code than your task scope:
  1. STOP work
  2. Create new Beads task with findings
  3. Wait for task approval before proceeding

  TLDR output is informational, not permissive.`,
  // ...
});
```

### Rationale

- **Beads remains sole scope authority**
- Agents remain executors, not planners
- Prevents silent refactors and "helpful" overreach

---

## 2. Program Slicing Guardrail

### Problem

`tldr slice` provides extremely focused views that can:

- Create false confidence
- Hide architectural or lifecycle context
- Encourage unsafe refactors

### Rule

> **Program slicing is allowed only for debugging and localized reasoning.**

### Required Policy for TLDR Tool Descriptions

```markdown
### Program Slicing Guardrail

Program slicing is allowed only for:

- Debugging an existing defect
- Understanding control or data flow within current task scope

Program slices must not be used to justify:

- Refactors
- Architectural changes
- Cross-module edits
- Behavior changes outside of active task
```

### Implementation: Tool Guardrails

```javascript
tldr_slice: tool({
  description: `Program slicing - shows only code that affects a specific line. Killer feature for debugging. Instead of reading a 150-line function, see 6 lines that actually matter.

  ⚠️ GUARDRAIL: Program slicing is for DEBUGGING ONLY.
  Allowed uses:
  - Debugging existing defects
  - Understanding control/data flow within task scope

  PROHIBITED uses:
  - Justifying refactors
  - Architectural changes
  - Cross-module edits
  - Any behavior change outside active task`,
  // ...
});
```

### Rationale

Slices are a microscope, not a map. This rule prevents misuse.

---

## 3. TLDR Task Creation Prohibition (Non-Negotiable)

### Explicit Prohibition

```markdown
TLDR tools MUST NOT:

- Create Beads tasks
- Implicitly enqueue work
- Suggest automatic follow-ups
```

TLDR may only _annotate_ findings for later review.

---

### Rationale

Task creation is reserved for:

- A dedicated task-management agent
- A human operator

TLDR is informational only. Preventing it from creating tasks ensures:

- No implicit scope expansion
- No autonomous work queue manipulation
- Clear authority boundaries

---

## 4. Violation Classes (For Observability)

To support monitoring and debugging, violations should be categorized:

| Class                  | Description                                 | Severity     |
| ---------------------- | ------------------------------------------- | ------------ |
| SCOPE_EXPANSION        | Files outside task touched                  | **Critical** |
| TASK_MISSING           | Write attempted without task                | **Critical** |
| TLDR_AUTHORITY         | TLDR attempted task mutation                | **Critical** |
| SEARCH_DUPLICATION     | Multiple semantic tools used for same query | Medium       |
| IRREVERSIBLE_NO_CHECK  | Write without validation                    | **Critical** |
| PROGRAM_SLICING_MISUSE | Slicing used for refactor                   | Medium       |

### Required Logging

All violations must be logged centrally with:

- Timestamp
- Agent ID
- Task ID (if applicable)
- Violation class
- Files affected
- Required remediation

---

## 5. Deterministic Semantic Search Order

### Problem

If multiple semantic tools are available, agents will:

- Run more than one
- Cross-validate unnecessarily
- Waste time and tokens

### Rule

> **Exactly one semantic engine per query.**

### Required Policy for agent/semantic-search.md

```markdown
### Semantic Search Fallback Policy

Agents must attempt semantic search in this order:

1. TLDR semantic search (ONLY semantic engine)
2. grep (LAST RESORT - crude string matching only)

Agents must never run multiple semantic search tools for the same query.

Decision tree:

- Is TLDR available and indexed? → Use tldr_semantic
- Is TLDR daemon down? → Alert user, fall back to grep with warning
```

### Implementation: Plugin Logic

```javascript
// In plugin/tldr.mjs
async semanticSearch(query, options) {
  // Try TLDR only
  const tldrResult = await tldrClient.semanticSearch(query, options);
  if (tldrResult && tldrResult.length > 0) {
    return tldrResult; // Success
  }

  // TLDR unavailable - alert user
  console.error('[TLDR] Semantic search unavailable - daemon not running or index not built');
  console.error('[TLDR] Falling back to grep (crude string matching only)');

  // Fall back to grep as last resort
  const grepResult = await this.runGrep(query, options);
  return grepResult;
}
```

### Language Requirements (Canonical)

**In ALL documentation, tools, and agents**:

```markdown
TLDR is the ONLY semantic engine.
osgrep has been completely removed.
```

**Forbidden language** (to avoid misinterpretation):

- "osgrep is retained as fallback"
- "Use osgrep when TLDR unavailable"
- "osgrep de-scoped but present"

**Correct language**:

- "TLDR is the only semantic engine"
- "osgrep has been completely removed"
- "Semantic search requires TLDR daemon"

````


- Alert user that semantic search is unavailable
- Fall back to grep with clear warning
- Never attempt other semantic search tools

---

## 5. Beads + TLDR Interaction Rule

### Rule

> **TLDR may inform Beads, but may not mutate Beads.**

### Allowed

- Attach TLDR insights to task context
- Reference `tldr impact` output in task notes

### Forbidden

- Creating implicit dependencies
- Closing tasks based on TLDR results
- Skipping required tasks due to "low impact"
- Modifying task scope without explicit approval

### Implementation: Beads Task Description Template

When creating tasks from TLDR findings:

```markdown
### Task Template for TLDR-Derived Dependencies

**Source**: TLDR impact analysis
**Context**: Found while working on parent task [PARENT_ID]

**What TLDR Revealed**:

- Function X called by functions A, B, C
- Tests D, E, F depend on X
- Impact spans modules M1, M2, M3

**Action Required**:

- [ ] Validate that this impact is within parent task scope
- [ ] If YES: Document findings in parent task
- [ ] If NO: Create new task for this impact
- [ ] Do NOT proceed without explicit task approval
````

### Rationale

Beads remains the authoritative DAG. TLDR is informational only.

---

## 6. Enforcement at Tool Level

### Tool Description Guardrails

Every TLDR tool description must include guardrail warnings:

```javascript
// Pattern for all TLDR tools
description: `
  [Main description]

  ⚠️ GUARDRAILS:
  - TLDR output is INFORMATIONAL only
  - Does NOT authorize scope expansion
  - Impact analysis requires task approval before action
  - Program slicing is DEBUGGING ONLY
`;
```

### Agent-Level Enforcement

Update `AGENTS.md` with:

```markdown
### TLDR Usage Rules (Non-Negotiable)

Agents using TLDR tools MUST:

1. Treat TLDR output as informational, not permissive
2. Stop work if TLDR reveals scope-expanding dependencies
3. Create new Beads task for additional findings
4. Use program slicing for debugging ONLY
5. Use TLDR as only semantic search engine
6. Never mutate Beads based on TLDR findings alone

Violations will be detected and blocked by enforcement system.
```

---

## 7. Strategic Outcome

With these guardrails in place:

- TLDR becomes a **high-signal cognition layer**
- Agents operate with **reduced degrees of freedom**
- Scope creep is structurally prevented
- Unattended runs become safer and more predictable

This moves the system from:

> "Agents explore codebase"

To:

> "Agents are shown only what matters — and nothing more."

---

## 8. Summary: Required Actions

| Guardrail            | Implementation Location             | Priority     | Status  |
| -------------------- | ----------------------------------- | ------------ | ------- |
| Scope ceiling        | `plugin/tldr.mjs` tool descriptions | **Critical** | Pending |
| Program slicing      | `plugin/tldr.mjs` tool descriptions | **Critical** | Pending |
| Deterministic search | `agent/semantic-search.md`          | **Critical** | Pending |
| Beads interaction    | `AGENTS.md` TLDR usage rules        | **Critical** | Pending |
| osgrep de-scoping    | Documentation updates               | Medium       | Pending |
| Agent-level rules    | `AGENTS.md` enforcement             | **Critical** | Pending |

---

## 📊 Benefits & ROI Analysis

### Cost Savings

**Scenario**: 100 sessions/month, avg 50K tokens/session

| Metric         | Without TLDR | With TLDR | Savings          |
| -------------- | ------------ | --------- | ---------------- |
| Tokens/session | 50,000       | 2,500     | 47,500           |
| Tokens/month   | 5,000,000    | 250,000   | 4,750,000        |
| Cost (@$3/M)   | $15          | $0.75     | **$14.25/month** |
| Annual savings | -            | -         | **$171/year**    |

### Time Savings

**Scenario**: Agent workflow with 10 code searches/session

| Operation             | Without TLDR  | With TLDR  | Savings            |
| --------------------- | ------------- | ---------- | ------------------ |
| Code search (avg)     | 30s           | 100ms      | 29.9s              |
| Context reading       | 2min          | 5s         | 1m55s              |
| Impact analysis       | 5min (manual) | 10s        | 4m50s              |
| **Total/session**     | ~8min         | ~20s       | **~7m40s**         |
| Annual (100 sessions) | ~13.3 hours   | ~3.3 hours | **~10 hours/year** |

---

## 🔄 Complete osgrep Removal Decision

### Why Remove osgrep Entirely?

**Answer**: TLDR provides superior capabilities and simplifying to a single semantic engine improves architecture.

**Comparison Matrix**:

| Capability               | TLDR                            | Benefit        |
| ------------------------ | ------------------------------- | -------------- |
| Semantic search          | ✅ Structure + behavior         | High precision |
| Code snippets (15 lines) | ✅ (structured)                 | Better context |
| Call graph (basic)       | ✅ (forward + backward + depth) | Superior       |
| Program slicing          | ✅                              | Unique feature |
| Data flow analysis       | ✅                              | Unique feature |
| Control flow graphs      | ✅                              | Unique feature |
| Complexity metrics       | ✅                              | Unique feature |
| Impact analysis          | ✅                              | Unique feature |
| Dead code detection      | ✅                              | Unique feature |
| Architecture layers      | ✅                              | Unique feature |
| **Response time**        | **100ms**                       | Fast enough    |
| **Index size**           | **150MB**                       | Acceptable     |
| **Setup complexity**     | Medium                          | One-time cost  |

**Key Insight**: TLDR provides **8 unique features** and the 100ms latency is negligible compared to:

- 95% token savings (21K → 175 tokens)
- Automated impact analysis (vs manual tracing)
- Program slicing (vs reading entire functions)
- 5-layer analysis (vs basic embeddings)

### Real-World Scenario

**Task**: "Find where JWT validation happens and what calls it"

**Using TLDR**:

```
1. tldr_semantic "JWT validation" [100ms]
   → Returns 3 results with structured context
2. tldr_impact "validateToken" [20ms]
   → Shows 7 callers with line numbers
3. Total time: ~120ms
```

**Speedup**: 5 minutes → 0.12 seconds = **2500x faster**

### Migration Cost-Benefit Analysis

| Metric             | Cost (TLDR Migration) | Benefit                    | Net Impact          |
| ------------------ | --------------------- | -------------------------- | ------------------- |
| Development time   | 1-2 weeks             | -                          | Investment          |
| Training time      | 1 week                | -                          | Investment          |
| Disk space         | +50MB/project         | -                          | Small cost          |
| Query latency      | 100ms                 | -                          | Fast enough         |
| **Token savings**  | -                     | 95% (47.5K tokens/session) | **$171/year**       |
| **Time savings**   | -                     | 2500x for complex queries  | **~40 hours/year**  |
| **Better results** | -                     | 8 additional features      | **Invaluable**      |
| **Debugging**      | -                     | Program slicing available  | **10x faster**      |
| **Simplification** | -                     | Single semantic engine     | **Maintainability** |

**ROI**: **10:1** (benefits:costs)

### Replacement Strategy

**Direct Migration** (Week 1-4):

- Install TLDR daemon
- Implement TLDR-only semantic search
- Remove all osgrep references
- No parallel deployment

### Files to Update for Complete Removal

| File                            | Change                             | Priority |
| ------------------------------- | ---------------------------------- | -------- |
| `agent/semantic-search.md`      | Rewrite to use TLDR primary        | **High** |
| `bin/opencode-init`             | Remove osgrep from checks          | Medium   |
| `plugin/setup.mjs`              | Replace osgrep check with TLDR     | Medium   |
| `AGENTS.md`                     | Update semantic-search description | Medium   |
| `bin/workspace-init`            | Remove osgrep models download      | Low      |
| `README.md`                     | Update tooling list                | Low      |
| `docs/integrations/osgrep-*.md` | Add deprecation notice             | Low      |

### Success Criteria

- [ ] TLDR handles all semantic search queries (100%)
- [ ] Token savings measured > 90%
- [ ] Agent feedback positive on result quality
- [ ] No regression in search relevance

---

## 🔄 Relationship with Existing Systems

### GPTCache: Complementary

**How they work together**:

```
TLDR reduces context: 21K tokens → 1K tokens (95% savings)
      ↓
LLM processes smaller prompt (faster, cheaper)
      ↓
GPTCache caches optimized response
```

**No overlap** - TLDR optimizes input, GPTCache caches output.

### cass_memory: Complementary

**Different domains**:

- **cass_memory**: Procedural rules and patterns from past sessions
- **TLDR**: Structural code understanding and analysis

**Example**:

- cass_memory: "Always validate JWT tokens before authorizing API calls"
- TLDR: "Here's how JWT validation is implemented in your codebase"

### osgrep: Complete Removal

**Decision**: Remove osgrep entirely - TLDR is the only semantic search engine

---

## 📁 Implementation Files

### 1. Plugin File: `plugin/tldr.mjs`

Main plugin with tool definitions and hooks.

### 2. Configuration File: `config/tldr.json`

```json
{
  "enabled": true,
  "autoInject": true,
  "contextDepth": 2,
  "maxContextTokens": 1000,
  "diagnosticsOnEdit": true,
  "semanticSearchMaxResults": 10,
  "description": "LLM TLDR configuration for opencode - 5-layer code analysis with 95% token savings",
  "docs": "https://github.com/parcadei/llm-tldr"
}
```

**Configuration Options**:

| Option                     | Type    | Default | Description                                              |
| -------------------------- | ------- | ------- | -------------------------------------------------------- |
| `enabled`                  | boolean | `true`  | Enable/disable TLDR integration                          |
| `autoInject`               | boolean | `true`  | Automatically inject TLDR context before agent execution |
| `contextDepth`             | number  | `2`     | Depth for call graph traversal (1-5)                     |
| `maxContextTokens`         | number  | `1000`  | Maximum tokens to inject (prevents bloat)                |
| `diagnosticsOnEdit`        | boolean | `true`  | Run shift-left diagnostics after file edits              |
| `semanticSearchMaxResults` | number  | `10`    | Maximum results from semantic search                     |

### 3. Library File: `lib/tldr-client.mjs`

Client library for TLDR daemon communication.

### 4. Test File: `tests/unit/test-tldr-plugin.mjs`

Unit tests for plugin functionality.

### 5. Integration Test: `tests/integration/test-tldr-integration.sh`

Integration tests for end-to-end workflows.

### 6. Documentation: `agent/semantic-search.md`

Update semantic search agent to use TLDR only.

### 7. Update: `bin/opencode-init` (Week 4)

Remove osgrep from installation checks.

### 8. Update: `plugin/setup.mjs` (Week 4)

Replace osgrep check with TLDR check in system diagnostics.

### 9. Update: `AGENTS.md` (Week 4)

Change semantic-search description from "osgrep" to "TLDR".

### 10. Remove: `docs/integrations/osgrep-*.md` (Week 4)

Remove osgrep integration documentation.

---

## 🧪 Testing Strategy

### Unit Tests

Test plugin initialization, tool registration, and hook execution.

### Integration Tests

Test daemon startup, context extraction, semantic search, and hooks.

### Performance Benchmarks

Validate TLDR semantic search quality and speed meets targets.

---

## 📖 Next Steps

1. **Review this plan** with team
2. **Create Beads task** for Phase 1 implementation
3. **Start development** following phased approach
4. **Monitor metrics** (token savings, query latency, cache hit ratio)
5. **Gather feedback** from agent performance
6. **Iterate** based on real-world usage
7. **Week 4**: Decide on osgrep deprecation based on TLDR adoption metrics
8. **Week 6**: Update all documentation to reflect final osgrep status

---

## 📋 Enforcement Status: Current Gaps

### Critical Gap Identified

The current guardrails are **documentation-only**. Autonomous agents will not reliably follow intent unless violations are **structurally impossible**.

### Required Enforcement Mechanisms

| Enforcement Mechanism         | Status      | Priority     | Implementation Location                  |
| ----------------------------- | ----------- | ------------ | ---------------------------------------- |
| Command interception          | **Missing** | **Critical** | `runner/` or `enforcement/` module       |
| Task validation pre-write     | **Missing** | **Critical** | Enforcement hooks before file operations |
| Commit validation             | **Missing** | **Critical** | Git hooks or runner guard                |
| TLDR authority enforcement    | **Missing** | **Critical** | Tool-level blocking                      |
| Violation logging & reporting | **Missing** | **Critical** | Centralized violation handler            |

### Implementation Priority

**Week 1-2**: Core plugin (current plan)
**Week 3**: Add enforcement hooks for file operations
**Week 4**: Add commit validation
**Week 5-6**: Full enforcement system testing

### Success Criteria Update

**Technical Metrics**:

- [ ] TLDR handles all semantic search queries (100%)
- [ ] Token savings measured > 90%
- [ ] Agent feedback positive on result quality
- [ ] No regression in search relevance

**Guardrail Enforcement** (NEW):

- [ ] Command interception implemented for file operations
- [ ] Task validation pre-write functional
- [ ] Commit validation blocking unauthorized commits
- [ ] TLDR authority enforced at tool level
- [ ] Violations logged centrally with classes
- [ ] No scope creep incidents in agent runs
- [ ] Agent autonomy reduced to execution-only mode

**Safety Validation** (NEW):

- [ ] Unattended agent runs tested with guardrails
- [ ] Scope expansion attempts blocked by enforcement
- [ ] No implicit task creation from TLDR findings
- [ ] TLDR output treated as informational only
- [ ] Enforcement system prevents all defined violations

---

## ✅ Decision Summary

**Can we replace osgrep with llm-tldr?**

**Answer: YES** - Full replacement with complete osgrep removal.

**Key Reasons**:

1. **TLDR provides 8+ unique features** osgrep lacks (program slicing, data flow, impact analysis, etc.)
2. **95% token savings** vs osgrep's basic embeddings (similar token cost)
3. **2500x faster for complex queries** (5min manual → 120ms TLDR)
4. **Simpler architecture** - single semantic search engine
5. **TLDR daemon is a required dependency** - ensures availability

**Guardrails Required**: YES

- Without guardrails, TLDR's powerful analysis will cause agent scope expansion
- Must enforce scope ceiling, program slicing restrictions, deterministic search order
- TLDR must be informational, not permissive

**Timeline**: 7-week phased integration with complete osgrep removal by Week 4.

**Implementation Order**:

1. Week 1-2: Core plugin + basic guardrails
2. Week 3: Context injection hooks
3. Week 4: Complete osgrep removal
4. Week 5-6: Advanced features + complete guardrail enforcement
5. Week 7: **MCP integration (OPTIONAL - for Claude Code/Desktop only)**

**Critical Success Factor**: Guardrails are not optional - they're **mandatory** for production safety.

**Note**: Phase 6 (MCP) is only needed for external AI assistants (Claude Code/Desktop). For opencode, Phases 1-5 complete the integration.

---

## 🔗 References

- **llm-tldr GitHub**: https://github.com/parcadei/llm-tldr
- **TLDR Documentation**: https://github.com/parcadei/llm-tldr/blob/main/docs/TLDR.md
- **opencode SDK**: See AGENTS.md for plugin architecture
- **GPTCache Integration**: docs/GPTCACHE_INTEGRATION.md
- **cass_memory Integration**: docs/integrations/CASS_PLUGIN_INTEGRATION.md
- **osgrep Integration**: docs/integrations/osgrep-integration-plan.md

---

**Document Status**: 📖 Source of Truth Ready

**Last Updated**: 2026-01-14

**Version**: 4.0 (Complete osgrep Removal)

```

```
