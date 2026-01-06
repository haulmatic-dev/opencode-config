# MCP Agent Mail Integration

**Quick Start Guide** - Get up and running in 5 minutes

## What is MCP Agent Mail?

MCP Agent Mail enables agent-to-agent communication, file reservations, and coordination between Factory Droids via a local server.

## Quick Install

```bash
# Run droid-init with MCP Agent Mail (interactive)
~/.config/opencode/bin/droid-init

# Or skip MCP setup
~/.config/opencode/bin/droid-init --skip-mcp-agent-mail
```

## Quick Test

```bash
~/.config/opencode/hooks/mcp-agent-mail-check.sh
✓ MCP Agent Mail is ready
```

## Quick Use

```bash
# Use wrapper that ensures MCP is running
~/.config/opencode/bin/droid-with-mcp orchestrator "Implement user authentication"
```

## Documentation

- [Quick Start](README.md) - This guide
- [Integration Guide](./INTEGRATION_GUIDE.md) - How to integrate MCP into your droids
- [Complete Examples](./EXAMPLES.md) - Working code examples
- [Auto-Start Feature](./AUTO_START.md) - Automatic server management
- [Test Report](./TEST_REPORT.md) - Full test results
- [Migration Guide](./MIGRATION.md) - Migrating from legacy implementations

## Support

See [Troubleshooting](./TROUBLESHOOTING.md) or open an issue.
