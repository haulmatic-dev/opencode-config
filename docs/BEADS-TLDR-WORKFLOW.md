# TLDR + Beads Integration Guide

## Overview

This document describes how TLDR integrates with the Beads task management system for impact analysis and dependency tracking.

## Impact Analysis Integration

### Automatic Impact Detection

When creating or updating a Beads task, TLDR can analyze the impact of proposed changes:

```javascript
// Example: Analyzing impact before creating a task
const impact = await tldrClient.getImpact('src/auth/handler.ts', { depth: 3 });

// Results include:
impact.impact = {
  callers: ['src/api/routes.ts', 'src/middleware/auth.ts'],
  callees: ['validateToken', 'checkRole', 'respond'],
  tests: ['tests/auth.test.ts', 'tests/middleware.test.ts'],
  modules: ['auth', 'api', 'middleware'],
  files: ['src/auth/handler.ts'],
};
```

### Beads Task Integration

Tasks can reference TLDR impact analysis in their context:

```markdown
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

### Auto-Impact on Task Creation

Use `autoImpact=true` when creating tasks to automatically analyze files mentioned in the description:

```javascript
beads_create({
  title: 'Fix authentication bug',
  description: 'Fix bug in src/auth/handler.ts that causes login failures',
  autoImpact: true,
});
```

**What happens:**

1. Extracts file paths from description: `['src/auth/handler.ts']`
2. Runs TLDR impact analysis on detected files
3. Stores impact analysis in task notes under `tldr_impact:` key
4. Returns impact summary with task creation result

### Impact Display in Task Details

When viewing a task with impact analysis, `beads_show` automatically:

- Parses impact context from task notes
- Displays affected files, functions, tests, modules
- Shows callers and callees relationships
- Includes scope validation warnings

```bash
beads_show --id "opencode-abc"
```

Output includes:

```
{
  "id": "opencode-abc",
  "title": "Fix authentication bug",
  "tldrImpact": {
    "analyzedFiles": ["src/auth/handler.ts"],
    "impact": {
      "files": [...],
      "functions": [...],
      "tests": [...]
    }
  },
  "impactDisplay": "...",
  "scopeValidation": {
    "isValid": true,
    "warnings": []
  }
}
```

## Scope Validation Guardrail

When viewing tasks with impact analysis, the system validates scope:

1. **Scope vs Impact Comparison**:
   - Compares files in task scope to impact analysis
   - Detects files mentioned but not in impact
   - Warns if scope keywords not in impact

2. **Severity Levels**:
   - `none`: Scope matches impact
   - `medium`: 1-2 scope warnings
   - `high`: 3+ scope warnings

3. **Action Required**:
   ```
   ⚠️ SCOPE WARNING: Files in scope not in impact analysis
   → STOP work
   → Create new Beads task with expanded scope
   → Wait for approval before proceeding
   ```

## Selective Testing with tldr_change_impact

Use `tldr_change_impact` to determine which tests to run after making changes:

```bash
# Input: comma-separated list of changed files
tldr_change_impact --changedFiles "src/auth.ts,src/api/routes.ts"

# Output:
{
  "success": true,
  "recommendedTests": [
    "tests/auth.test.ts",
    "tests/api.test.ts",
    "tests/integration.test.ts"
  ],
  "affectedModules": ["auth", "api"],
  "summary": "2 files analyzed, 3 tests potentially affected"
}
```

## Scope Guardrails

TLDR tools reveal dependencies but **do NOT authorize scope expansion**:

1. If impact analysis shows more affected code than task scope:
   - STOP work immediately
   - Create a new Beads task with findings
   - Wait for task approval before proceeding

2. TLDR output is **informational only** - it does not permit additional work

## Programmatic Integration

### Using lib/beads-tldr.mjs

```javascript
import {
  extractFilePathsFromDescription,
  runImpactAnalysis,
  formatImpactForContext,
  validateScopeAgainstImpact,
  enhanceBeadCreateWithTLDR,
} from './lib/beads-tldr.mjs';

// Extract files from description
const files = extractFilePathsFromDescription(description);

// Run impact analysis
const impact = await runImpactAnalysis(files, { depth: 2 });

// Format for storage
const context = formatImpactForContext(impact);

// Validate scope
const validation = validateScopeAgainstImpact(scope, { success: true, impact: impact.impact });

// Auto-enhance task creation
const { options, impactContext } = await enhanceBeadCreateWithTLDR({
  title,
  description,
  autoImpact: true,
});
```

## Best Practices

### Before Making Changes

1. Run `tldr_impact` on files you plan to modify
2. Review the full impact (callers, callees, tests)
3. If impact exceeds task scope, create a new task

### During Task Creation

1. Add file paths to task description
2. Set `autoImpact: true` to auto-analyze
3. Review impact analysis in task output
4. Validate scope matches impact

### After Making Changes

1. Use `tldr_change_impact` to identify affected tests
2. Run only the necessary tests (faster feedback)
3. Monitor for cascading failures

### Maintenance Tasks

Create recurring Beads tasks for TLDR maintenance:

```yaml
title: Rebuild TLDR index
type: task
priority: 3
recurring: weekly
description: |
  Run tldr index rebuild to ensure semantic search accuracy.
  Command: tldr rebuild --project .
```

## Tool Reference

| Tool                        | Purpose                   | Guardrail     |
| --------------------------- | ------------------------- | ------------- |
| `tldr_impact`               | Analyze change impact     | Scope ceiling |
| `tldr_change_impact`        | Select tests to run       | Scope ceiling |
| `tldr_callgraph`            | Get call graph            | Scope ceiling |
| `tldr_context`              | Extract code structure    | Scope ceiling |
| `beads_create` (autoImpact) | Auto-analyze on creation  | Scope ceiling |
| `beads_show`                | Display impact + validate | Scope ceiling |

## Error Handling

If TLDR daemon is unavailable:

1. Semantic search alerts user
2. Fall back to grep for basic string matching
3. Continue without impact analysis (document gap)

## Performance Considerations

- Impact analysis depth: 2-3 is usually sufficient
- Maximum 5 files per change_impact analysis
- Use incremental updates for repeated analyses
- Auto-impact runs synchronously during task creation

## Scope Ceiling Enforcement

**Critical**: The scope ceiling guardrail is enforced programmatically:

```
⚠️ SCOPE CEILING GUARDRAIL ⚠️

This tool reveals dependencies but does NOT authorize scope expansion.

If impact analysis shows more affected code than your task scope:
1. STOP work immediately
2. Create a new Beads task with findings
3. Wait for task approval before proceeding

TLDR output is informational, not permissive.
```

When scope validation fails:

- `scopeValidation.severity` = 'high' or 'medium'
- `scopeValidation.recommendation` = "STOP work. Create new Beads task with expanded scope."
- Task should NOT proceed until new task is created and approved
