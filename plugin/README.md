# opencode plugins

This directory contains opencode plugins for extending functionality.

## Available Plugins

### beads-guardrails.mjs

**Purpose**: Enforce task tracking via beads by blocking TodoWrite tool in beads workspaces

**Features**:
- Blocks TodoWrite tool when `.beads/` directory exists
- Prevents task duplication between TodoWrite and Beads
- Graceful degradation when beads not active

**Behavior**:
- Checks for `.beads/` directory at tool execution
- Throws error: `[beads-guard] TodoWrite blocked in beads workspace. Use "bd create" instead for persistent tracking.`
- Allows TodoWrite in non-beads workspaces

**For detailed documentation**, see [docs/BEADS_GUARDRAILS_IMPLEMENTATION.md](../docs/BEADS_GUARDRAILS_IMPLEMENTATION.md)

### gptcache.mjs

**Purpose**: LLM response caching to reduce API costs and improve response times

**Features**:
- Automatic caching of LLM responses
- 70-90% cost reduction for repeated prompts
- <50ms retrieval vs 2-5s LLM calls
- SQLite-based storage with ONNX embeddings
- Supports semantic similarity search

**Configuration**:
```json
{
  "enabled": true,
  "host": "127.0.0.1",
  "port": 8000,
  "cacheKeyPrefix": "opencode"
}
```

**Usage**:
- Automatically caches agent responses when enabled
- Configured in `../gptcache_config.json`
- Requires GPTCache server running on port 8000

**For detailed documentation**, see [docs/GPTCACHE_INTEGRATION.md](../docs/GPTCACHE_INTEGRATION.md)

## Plugin Registration

Plugins in this directory (`~/.config/opencode/plugin/`) are automatically loaded by opencode at startup. No additional configuration in `opencode.json` is required.

## Plugin Development

**Requirements**:
- Export named functions (e.g., `export const MyPlugin`)
- Use `import` for ES modules (`.mjs` files)
- Accept plugin context parameters: `{ project, client, $, directory, worktree }`
- Return object with hook implementations

**Example**:
```javascript
export const MyPlugin = async ({ project, client, $, directory, worktree }) => {
  console.log("Plugin initialized!");
  
  return {
    'tool.execute.before': async (input, output) => {
      console.log("Tool:", input.tool);
    }
  };
};
```

**Available Hooks**:
- `tool.execute.before` - Before tool execution
- `tool.execute.after` - After tool execution
- `agent.execute.before` - Before agent execution
- `agent.execute.after` - After agent execution
- `chat.message` - Chat message events
- `chat.params` - Chat parameter events
- And many more (see opencode docs)

**Dependencies**:
- Use relative paths to access parent directory files
- External npm packages require `package.json` in config directory
- Dynamic imports work: `await import('../lib/module.js')`

## Testing

Test plugins individually:
```bash
# Test syntax
node --check plugin/my-plugin.mjs

# Test execution
node --eval "import('./plugin/my-plugin.mjs').then(async m => {
  const result = await m.MyPlugin({ 
    project: { id: 'test' }, 
    directory: '/tmp', 
    client: {}, 
    $: {}, 
    worktree: '/tmp' 
  });
  console.log('Result:', result);
})"
```

## References

- [opencode Plugin Documentation](https://opencode.ai/docs/plugins/)
- [Plugin Examples](https://opencode.ai/docs/ecosystem#plugins)
