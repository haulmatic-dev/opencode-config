# Beads Guardrails Plugin - Setup Instructions

This plugin prevents TodoWrite tool usage in beads workspaces, ensuring task tracking consistency via `bd` commands.

## Installation

1. **Copy plugin file** (if not already present):
```bash
cp beads-guardrails.plugin.mjs /path/to/your/project/
```

2. **Register plugin in opencode.json** (add to your project's opencode.json):
```json
{
  "plugin": ["./beads-guardrails.plugin.mjs"]
}
```

Note: `opencode.json` is typically gitignored and should be configured per-project.

## How It Works

- **In beads workspaces** (contains `.beads/` directory): 
  - Blocks TodoWrite tool with clear error message
  - Forces use of `bd create` for persistent task tracking

- **In non-beads workspaces**:
  - Allows TodoWrite tool normally
  - No changes to existing workflow

## Testing

Test in beads workspace:
```bash
opencode run "Use TodoWrite to create a test task"
```
Expected: TodoWrite blocked with error message

Test in non-beads workspace:
```bash
mkdir /tmp/test-no-beads
cd /tmp/test-no-beads
opencode run "Use TodoWrite to create a test task"
```
Expected: TodoWrite executes normally

## Error Messages

When TodoWrite is blocked:
```
[beads-guard] TodoWrite blocked in beads workspace. Use "bd create" instead for persistent tracking.
```

## Benefits

1. **Consistent tracking** - Prevents mixing TodoWrite and beads task management
2. **Zero context cost** - No prompt modification, middleware-based
3. **Clear guidance** - Agent knows exactly what command to use
4. **Environment-aware** - Only activates when `.beads/` exists
5. **Proactive blocking** - Prevents wasted tokens on blocked operations

## Troubleshooting

**Plugin not loading?**
- Verify opencode.json contains correct plugin path
- Check file is executable: `chmod +x beads-guardrails.plugin.mjs`
- Restart opencode session

**TodoWrite not blocking?**
- Verify `.beads/` directory exists in project root
- Check logs for `[beads-guardrails]` messages
- Ensure tool name is `todowrite` (lowercase)
