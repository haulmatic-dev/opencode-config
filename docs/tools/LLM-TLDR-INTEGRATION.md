# LLM-TLDR Integration Plan for opencode

> **Project**: Integrate llm-tldr (code analysis with 95% token savings) into opencode workflow
>
> **Status**: Planning Phase
>
> **Impact**: **Replaces osgrep** as primary semantic search with 5-layer code analysis

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

| System                       | Current Role           | After TLDR Integration                    | Relationship                                                       |
| ---------------------------- | ---------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| **GPTCache**                 | Cache LLM responses    | Still caches responses                    | ✅ Complementary - TLDR reduces input size, GPTCache caches result |
| **cass_memory**              | Learn procedural rules | Still learns rules                        | ✅ Complementary - Different domains (code structure vs patterns)  |
| **osgrep (semantic-search)** | Concept-based search   | **Replaced by TLDR** (emergency fallback) | ⚠️ TLDR supersedes osgrep with superior capabilities               |
| **Beads**                    | Task tracking          | Task tracking + TLDR dependency analysis  | ✅ Enhanced - `tldr impact` for code dependencies                  |

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

_(osgrep removed as primary, kept only as emergency fallback)_

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

**Goal**: Replace osgrep as primary semantic search with TLDR's superior capabilities

**Tasks**:

1. Compare TLDR semantic vs osgrep results
2. Update `agent/semantic-search.md` to use TLDR as primary
3. Implement fallback logic: TLDR → osgrep → grep
4. Remove osgrep from installation scripts (mark deprecated)
5. Update `AGENTS.md` and documentation
6. Benchmark performance with real workflows

**Deliverables**:

- Updated semantic-search agent (TLDR primary, osgrep fallback)
- Updated installation scripts (osgrep deprecated)
- Updated AGENTS.md documentation
- Performance benchmarks
- Migration guide for users

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

### Phase 6: MCP Server Integration (Week 7)

**Goal**: Expose TLDR as MCP server for Claude Code/Desktop

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

1. TLDR semantic search (PRIMARY - 99% of queries)
2. osgrep (FALLBACK - only if TLDR daemon unavailable or index missing)
3. grep (LAST RESORT - crude string matching only)

Agents must never run multiple semantic search tools for the same query.

Decision tree:

- Is TLDR available and indexed? → Use tldr_semantic
- Is TLDR daemon down? → Try osgrep with warning
- Is neither available? → Fall back to grep with note
```

### Implementation: Plugin Logic

```javascript
// In plugin/tldr.mjs
async semanticSearchWithFallback(query, options) {
  // Try TLDR first
  const tldrResult = await tldrClient.semanticSearch(query, options);
  if (tldrResult && tldrResult.length > 0) {
    return tldrResult; // Success
  }

  // Fallback to osgrep only if TLDR completely unavailable
  console.warn('[TLDR] Unavailable, falling back to osgrep');
  const osgrepResult = await this.runOsgrep(query, options);
  return osgrepResult;
}
```

### Language Requirements (Canonical)

**In ALL documentation, tools, and agents**:

```markdown
TLDR is the PRIMARY semantic engine.
osgrep is a FALLBACK when TLDR is unavailable.
```

**Forbidden language** (to avoid misinterpretation):

- "osgrep is removed"
- "osgrep is deleted"
- "osgrep no longer exists"

**Correct language**:

- "TLDR supersedes osgrep as primary semantic engine"
- "osgrep is retained as emergency fallback"

````

### Rationale

```javascript
// In plugin/tldr.mjs
async semanticSearchWithFallback(query, options) {
  // Try TLDR first
  const tldrResult = await tldrClient.semanticSearch(query, options);
  if (tldrResult && tldrResult.length > 0) {
    return tldrResult; // Success
  }

  // Fallback to osgrep only if TLDR completely unavailable
  console.warn('[TLDR] Unavailable, falling back to osgrep');
  const osgrepResult = await this.runOsgrep(query, options);
  return osgrepResult;
}
````

### Rationale

- Determinism over optionality
- Prevents search loops
- Simplifies agent decision logic
- Canonical language prevents agent misinterpretation

---

## 6. osgrep De-scoping (Not Deletion)

### Clarification

osgrep should **not** be described as "removed" or "deleted".

### Recommended Language (Canonical)

**Correct**: "TLDR supersedes osgrep as primary semantic engine"

**Forbidden** (to avoid misinterpretation by agents):

- "osgrep is removed"
- "osgrep is deleted"
- "osgrep no longer exists"

### Implementation: Documentation Updates

> **TLDR supersedes osgrep as primary semantic engine.**

### osgrep Allowed Uses (Fallback Mode Only)

- TLDR daemon unavailable
- Cold-start scenarios (index not built yet)
- Crude file-level scavenging (location, imports, filenames only)

### osgrep Disallowed Uses

- Understanding code behavior (use TLDR)
- Impact analysis (use TLDR)
- Debugging logic (use TLDR)
- Refactoring context (use TLDR)

### Implementation: Documentation Updates

In `agent/semantic-search.md`:

```markdown
You are a semantic code search specialist using TLDR (primary) with osgrep fallback.

## Your Role

Use TLDR for comprehensive code understanding and semantic search. Use osgrep ONLY as fallback when TLDR daemon is completely unavailable.

## Forbidden

- Never use osgrep for understanding behavior
- Never use osgrep for impact analysis
- Never use osgrep for debugging logic
- Never use osgrep when TLDR is available
```

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
```

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
5. Follow semantic search order: TLDR → osgrep → grep
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

## 🔄 osgrep Replacement Decision

### Why Replace osgrep Despite Slower Speed?

**Question**: osgrep is 2x faster (50ms vs 100ms) - why replace it?

**Answer**: Because TLDR's additional capabilities far outweigh 50ms latency difference.

**Comparison Matrix**:

| Capability               | osgrep           | TLDR                            | Impact        |
| ------------------------ | ---------------- | ------------------------------- | ------------- |
| Semantic search          | ✅ Concept-based | ✅ Structure + behavior         | Equal         |
| Code snippets (15 lines) | ✅               | ✅ (structured)                 | TLDR better   |
| Call graph (basic)       | ✅               | ✅ (forward + backward + depth) | TLDR superior |
| Program slicing          | ❌               | ✅                              | TLDR unique   |
| Data flow analysis       | ❌               | ✅                              | TLDR unique   |
| Control flow graphs      | ❌               | ✅                              | TLDR unique   |
| Complexity metrics       | ❌               | ✅                              | TLDR unique   |
| Impact analysis          | ❌               | ✅                              | TLDR unique   |
| Dead code detection      | ❌               | ✅                              | TLDR unique   |
| Architecture layers      | ❌               | ✅                              | TLDR unique   |
| **Response time**        | **50ms**         | **100ms**                       | osgrep wins   |
| **Index size**           | **100MB**        | **150MB**                       | osgrep wins   |
| **Setup complexity**     | Low              | Medium                          | osgrep wins   |

**Key Insight**: TLDR provides **8 unique features** osgrep completely lacks. The 2x speed difference is negligible when compared to:

- 95% token savings (21K → 175 tokens)
- Automated impact analysis (vs manual tracing)
- Program slicing (vs reading entire functions)
- 5-layer analysis (vs basic embeddings)

### Real-World Scenario Comparison

**Task**: "Find where JWT validation happens and what calls it"

**Using osgrep**:

```
1. osgrep "JWT validation" [50ms]
   → Returns 10 results, 15-line snippets
2. Manual grep for "validateToken" [2s]
   → Find 7 files
3. Read each file to understand call graph [5min]
4. Total time: ~5min
```

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

| Metric             | Cost (TLDR Migration) | Benefit (TLDR vs osgrep)   | Net Impact         |
| ------------------ | --------------------- | -------------------------- | ------------------ |
| Development time   | 1-2 weeks             | -                          | Investment         |
| Training time      | 1 week                | -                          | Investment         |
| Disk space         | +50MB/project         | -                          | Small cost         |
| Query latency      | +50ms                 | -                          | Acceptable         |
| **Token savings**  | -                     | 95% (47.5K tokens/session) | **$171/year**      |
| **Time savings**   | -                     | 2500x for complex queries  | **~40 hours/year** |
| **Better results** | -                     | 8 additional features      | **Invaluable**     |
| **Debugging**      | -                     | Program slicing available  | **10x faster**     |

**ROI**: **10:1** (benefits:costs)

### Replacement Strategy

**Phase 1 (Week 1-2)**: Parallel Deployment

- Install TLDR alongside osgrep
- Update `agent/semantic-search.md` to prefer TLDR
- Add fallback: `try tldr_semantic, catch → osgrep`

**Phase 2 (Week 3-4)**: Monitor & Validate

- Track usage: TLDR vs osgrep calls
- Measure: relevance, latency, token savings
- Gather feedback from agents

**Phase 3 (Week 5-6)**: Decommission Decision

- **If TLDR adoption > 90%**:
  - Remove osgrep from init scripts
  - Mark as deprecated in documentation
  - Remove from AGENTS.md
- **If TLDR adoption < 70%**:
  - Investigate pain points
  - Keep both, add better fallback logic

### Files to Update for Full Replacement

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

- [ ] TLDR handles > 95% of semantic search queries
- [ ] osgrep fallback triggered < 5% of queries
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

### osgrep: Full Replacement

**Decision**: Replace osgrep as primary semantic search engine

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

Update semantic search agent to use TLDR.

### 7. Update: `bin/opencode-init` (Week 5-6)

Remove osgrep from installation checks, mark as deprecated.

### 8. Update: `plugin/setup.mjs` (Week 5-6)

Replace osgrep check with TLDR check in system diagnostics.

### 9. Update: `AGENTS.md` (Week 5-6)

Change semantic-search description from "osgrep" to "TLDR".

### 10. Deprecation Notice: `docs/integrations/osgrep-*.md` (Week 5-6)

Add deprecation notice to osgrep documentation.

---

## 🧪 Testing Strategy

### Unit Tests

Test plugin initialization, tool registration, and hook execution.

### Integration Tests

Test daemon startup, context extraction, semantic search, and hooks.

### Performance Benchmarks

Compare TLDR vs osgrep for semantic search quality and speed.

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

- [ ] TLDR handles > 95% of semantic search queries
- [ ] osgrep fallback triggered < 5% of queries
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

**Answer: YES** - Full replacement recommended with osgrep kept only as emergency fallback.

**Key Reasons**:

1. **TLDR provides 8+ unique features** osgrep lacks (program slicing, data flow, impact analysis, etc.)
2. **95% token savings** vs osgrep's basic embeddings (similar token cost)
3. **2500x faster for complex queries** (5min manual → 120ms TLDR)
4. **2x latency (100ms vs 50ms) is negligible** compared to CLI spawn (30s)
5. **10:1 ROI** (benefits:costs)

**Guardrails Required**: YES

- Without guardrails, TLDR's powerful analysis will cause agent scope expansion
- Must enforce scope ceiling, program slicing restrictions, deterministic search order
- TLDR must be informational, not permissive

**Timeline**: 7-week phased integration with full osgrep replacement by Week 6.

**Implementation Order**:

1. Week 1-2: Core plugin + basic guardrails
2. Week 3: Context injection hooks
3. Week 4: Full osgrep replacement + fallback logic
4. Week 5-6: Advanced features + complete guardrail enforcement
5. Week 7: MCP integration

**Critical Success Factor**: Guardrails are not optional - they're **mandatory** for production safety.

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

**Version**: 3.0 (Hard Enforcement Added)
