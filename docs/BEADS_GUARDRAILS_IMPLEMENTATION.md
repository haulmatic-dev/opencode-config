# Beads Guardrails Plugin - Implementation Complete

## Overview
Successfully implemented a middleware-based guardrail system to prevent TodoWrite usage in beads workspaces, ensuring task tracking consistency across projects.

## Implementation Details

### File Created
- `/Users/buddhi/.config/opencode/beads-guardrails.plugin.mjs` - ES module plugin
- `/Users/buddhi/.config/opencode/opencode.json` - Updated with plugin reference

### Plugin Behavior
- **Active in beads workspaces** (`.beads/` directory exists): Blocks TodoWrite tool
- **Inactive in non-beads workspaces**: Allows TodoWrite tool normally
- **Zero context impact**: No prompt modification needed
- **Pre-execution blocking**: Prevents wasted tokens on blocked operations

### Key Findings
1. **Tool name is lowercase**: The tool name is "todowrite", not "TodoWrite"
2. **ES module required**: Plugin must use `.mjs` extension and ES import/export
3. **Export naming**: Must export a named constant (e.g., `BeadsGuardrailsPlugin`)
4. **Hook signature**: Must match the `tool.execute.before` signature from @opencode-ai/plugin

### Test Results

#### Test 1: Beads Workspace (Active)
```
[beads-guardrails] Initialized
[beads-guardrails] Beads workspace: ACTIVE
[beads-guardrails] tool.execute.before called for: todowrite
[beads-guardrails] Blocking TodoWrite in beads workspace
```
**Result**: ✅ TodoWrite blocked with clear error message

#### Test 2: Non-Beads Workspace (Inactive)
```
[beads-guardrails] Initialized
[beads-guardrails] Beads workspace: NOT ACTIVE
[beads-guardrails] tool.execute.before called for: todowrite
```
**Result**: ✅ TodoWrite allowed and executed successfully

## Configuration
Plugin registered in `opencode.json`:
```json
{
  "plugin": ["./beads-guardrails.plugin.mjs"]
}
```

## Error Message
When TodoWrite is blocked:
```
[beads-guard] TodoWrite blocked in beads workspace. Use "bd create" instead for persistent tracking.
```

## Benefits
1. **Consistent tracking**: Forces use of beads (bd) for task management in beads-enabled projects
2. **Zero context cost**: No prompt modifications, works via middleware
3. **Clear guidance**: Agent knows exactly what to do (use `bd create`)
4. **Environment-aware**: Only activates when `.beads/` exists
5. **Proactive blocking**: Prevents wasted tokens vs post-processing

## Next Steps
- Monitor usage and effectiveness
- Consider adding additional guards (e.g., TodoRead blocking in beads workspaces)
- Document workflow for users who encounter the guardrail
