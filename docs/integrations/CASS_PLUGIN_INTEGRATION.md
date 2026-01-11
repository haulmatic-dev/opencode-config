# Cass Memory Plugin Integration

## Overview
This document tracks the integration of cass_memory as an opencode plugin, replacing the manual protocol with automatic hooks.

## Before: Manual Integration

### Protocol
1. **START**: Run `cm context "<task>" --json` before non-trivial work
2. **WORK**: Reference rule IDs when following them (e.g., "Following b-8f3a2c...")
3. **FEEDBACK**: Leave inline comments when rules help/hurt
4. **END**: Just finish your work. Learning happens automatically via reflection.

### Issues
- ⚠️ Agents may forget to run `cm context`
- ⚠️ No automatic rule injection
- ⚠️ Manual protocol enforcement required
- ⚠️ Inconsistent usage across agents

## After: Plugin Integration

### How It Works
```javascript
// plugin/cass.mjs
export const cass = async ({ ... }) => {
  return {
    'agent.execute.before': async (input, output) => {
      // Fetch relevant rules and inject into system prompt
      const context = await cassClient.getContext(task);
      output.systemPrompt = formatContextAsSystemPrompt(context);
    },

    'agent.execute.after': async (input, output) => {
      // Record outcome (success/failure) for shown rules
      await cassClient.recordOutcome(status, ruleIds);
    }
  };
};
```

### Benefits
- ✅ **Zero Friction**: No manual commands needed
- ✅ **Automatic Injection**: Rules injected into every agent session
- ✅ **Consistent Usage**: All agents use cass_memory automatically
- ✅ **Smart Filtering**: Limits to top N rules (configurable)
- ✅ **Outcome Tracking**: Automatic success/failure recording

## Files Created/Modified

### New Files
- `plugin/cass.mjs` - Main plugin with hooks
- `cass_config.json` - Configuration (enabled, contextLimit, autoInject)
- `test-cass.mjs` - Integration tests
- `test-cass-integration.sh` - Shell test script
- `test-cass-execution.mjs` - Plugin execution simulation
- `CASS_PLUGIN_INTEGRATION.md` - This file

### Modified Files
- `opencode.json` - Added plugin to plugin array
- `AGENTS.md` - Updated cass_memory section with plugin integration details

## Configuration

```json
// cass_config.json
{
  "enabled": true,
  "contextLimit": 5,
  "autoInject": true
}
```

**Options:**
- `enabled`: Enable/disable plugin globally
- `contextLimit`: Max rules to fetch (manages context window)
- `autoInject`: Automatically inject rules into system prompt

## Testing

### Run All Tests
```bash
./test-cass-integration.sh  # Shell script checks
node test-cass.mjs           # Basic integration tests
node test-cass-execution.mjs # Plugin execution simulation
```

### Test Results
```
✅ All checks passed!
- Plugin: plugin/cass.mjs ✓
- Config: cass_config.json ✓
- Client: cm (installed) ✓
- Hooks: agent.execute.before, agent.execute.after ✓
- Test: node test-cass.mjs ✓

✅ Plugin execution test passed!
- Plugin loads correctly ✓
- agent.execute.before fetches context ✓
- agent.execute.after records outcome ✓
- System prompt injection works ✓
```

## Comparison with GPTCache Plugin

| Feature | GPTCache Plugin | Cass Memory Plugin |
|---------|-----------------|-------------------|
| **Purpose** | Cache LLM responses | Inject procedural knowledge |
| **Hooks** | agent.execute.before/after | agent.execute.before/after |
| **Before Hook** | Check cache for existing response | Fetch relevant rules/history |
| **After Hook** | Cache new response | Record outcome (success/failure) |
| **Context Impact** | REDUCES (cache hits = no LLM call) | ADDS (rules injected into prompt) |
| **Client** | HTTP (gptcache-server) | CLI (cm command) |
| **Config** | gptcache_config.json | cass_config.json |
| **Smart Filtering** | N/A | Yes (contextLimit) |

## Migration Path

### For Existing Agents
1. No code changes required
2. Plugin automatically activates on agent execution
3. Manual `cm context` calls still work (backward compatible)

### For New Agents
1. Install opencode with plugin registered
2. Plugin automatically provides context
3. No protocol learning needed

## Context Window Management

### Smart Filtering
```javascript
// Only top N most relevant rules
const context = await client.getContext(task, { limit: 5 });
```

### Rule Prioritization
1. High confidence rules
2. Recent feedback
3. Similar past sessions
4. Anti-patterns

### Estimated Token Impact
- Without filtering: ~2000-5000 tokens (many rules)
- With filtering: ~300-500 tokens (top 5 rules)

## Future Enhancements

### Potential Improvements
1. **Context substitution**: Replace verbose context with concise rules
2. **Rule summarization**: Compress similar rules
3. **Session-aware**: Adjust context limit based on task complexity
4. **Learning feedback**: Agents can provide explicit helpful/harmful marks
5. **Trauma integration**: Block dangerous patterns automatically

## Status

- ✅ Plugin created and tested
- ✅ Hooks working (before/after)
- ✅ Configuration added
- ✅ Documentation updated
- ✅ Integration verified

## Next Steps

1. Monitor plugin usage in production
2. Collect feedback on context quality
3. Adjust `contextLimit` if needed
4. Consider adding explicit feedback mechanism
5. Monitor rule effectiveness via `cm stats --json`
