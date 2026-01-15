# TLDR Context Injection Hook

The `agent.execute.before` hook automatically injects relevant code context into agent system prompts based on file references detected in user messages.

## Overview

When an agent is about to execute, the hook:

1. **Extracts file references** from user messages (quoted paths, glob patterns)
2. **Filters and validates** files (existence checks, binary detection)
3. **Prioritizes** by relevance (using `TLDRContextSelector`)
4. **Fetches context** from TLDR daemon (with caching)
5. **Merges and optimizes** context within scope ceiling limits
6. **Injects** into system prompt

## When Context is Injected

Context is automatically injected when:

- TLDR middleware is enabled (`config.enabled: true`)
- `autoInject` is enabled (default: `true`)
- A model is specified in the input
- File references are detected in messages

### Files Detected

The hook recognizes:

- **Quoted paths**: `"src/utils/helper.js"`, `'/lib/module.ts'`
- **Glob patterns**: `"src/**/*.js"`, `"tests/*spec.ts"`
- **Multiple files**: `"main.js", "lib/utils.ts", "config.py"`

## How File Relevance is Determined

The `TLDRContextSelector` scores files based on:

1. **Query relevance** - Filename matches user query (+10 points)
2. **Path priority** - Core directories preferred:
   - `src`, `lib`, `app`, `components` (+25 points)
   - `tests`, `spec`, `mocks` (+20 points)
   - `docs`, `documentation` (+15 points)
   - `config`, `utils`, `helpers` (+10 points)
3. **File size** - Smaller files preferred:
   - <1KB (+3 points)
   - <5KB (+2 points)
   - <20KB (+1 point)

Files are sorted by score and limited to `scopeCeilingFiles` (default: 10).

## Scope Ceiling Enforcement

| Limit      | Default  | Purpose                         |
| ---------- | -------- | ------------------------------- |
| Files      | 10       | Prevent excessive file context  |
| Tokens     | 5000     | Prevent context window overflow |
| Cache size | 50 files | Memory management               |

When limits are exceeded:

- Files are prioritized and truncated
- Context is optimized (functions trimmed to token limit)
- Warnings are logged

## Error Handling Behavior

### TLDR Daemon Unavailable

If the TLDR daemon is unreachable:

1. Context fetch fails gracefully
2. Fallback message added: "Manual code review required - TLDR unavailable"
3. Execution continues with reduced context

### Non-existent Files

- Files are skipped
- Warning logged: `"File not found: /path/to/file"`
- Processing continues with valid files

### Binary Files

- Automatically detected and skipped
- Warning logged: `"Skipping binary file: /path/to/image.png"`
- No context injected (grep fallback recommended)

### Large Files (>100KB)

- Warning logged: `"Large file (>100KB), will use summary"`
- Full context not fetched
- Summary approach used if available

### Hook Errors

- Errors caught and logged
- Default context injected as fallback
- Execution continues normally

## Default Context

When no valid files are found:

```markdown
# Project Context

- This is an opencode project with TLDR semantic code analysis enabled
- TLDR provides structured code context (AST, call graph, imports) for files
- Use tldr_context to get context for any file you need to understand
- Use tldr_semantic to search code semantically when you need to find related code
- Use tldr_impact to understand what code might be affected by changes

## Scope Guardrails

- TLDR output is informational only
- Do NOT expand task scope based on TLDR findings without creating a new Beads task
- If you discover the scope is larger than expected, document findings and stop
```

## Context Output Format

The hook adds to `output`:

```typescript
{
  systemPrompt: string,      // Formatted context for the model
  tldrContext: {
    functions: [],           // Function definitions
    imports: [],             // Import statements
    callGraph: [],           // Call relationships
    files: [],              // Files analyzed
    estimatedTokens: number, // Token count
    fallbacks: [],          // Warnings/fallbacks
    default: boolean,       // Using default context
  }
}
```

## Configuration

In `config/tldr.json`:

```json
{
  "enabled": true,
  "autoInject": true,
  "contextDepth": 2,
  "maxContextTokens": 1000,
  "scopeCeilingFiles": 10,
  "scopeCeilingTokens": 5000,
  "diagnosticsOnEdit": true
}
```

## Performance Considerations

- **Caching**: Context cached per-file (LRU, 50 files)
- **Parallel Fetching**: Multiple file contexts fetched concurrently
- **Lazy Loading**: Context only fetched when needed
- **Graceful Degradation**: Works even when daemon unavailable

## Debugging

Enable verbose logging:

```javascript
const middleware = new TLDRMiddleware({
  logger: console, // Default
});
```

Expected log output:

```
[TLDR] Hook executing for session abc123
[TLDR] Selected 3 files for context injection
[TLDR] Injected context for 3 files (450 tokens)
```

## Integration Points

### Before Hook (`agent.execute.before`)

```javascript
'agent.execute.before': async (input, output) => {
  // Context is injected into output.systemPrompt
}
```

### After Hook (`agent.execute.after`)

```javascript
'agent.execute.after': async (input, output) => {
  // Runs diagnostics on modified files
}
```

## Testing

Run the hook test suite:

```bash
node --test tests/unit/test-tldr-hooks.mjs
```

Key test scenarios:

- No file references → default context
- Non-existent files → skip with warning
- Too many files → prioritize and limit
- Large files → summary approach
- Binary files → skip with grep fallback
- Daemon unavailable → graceful degradation
- Caching → repeated access returns cached
