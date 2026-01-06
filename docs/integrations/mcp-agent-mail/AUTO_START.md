# MCP Agent Mail - Auto-Start Feature

**Automatically ensure MCP Agent Mail is running when you use droids**

## What It Does

The auto-start feature checks if MCP Agent Mail server is running before starting a droid, and automatically starts it if needed.

### Benefits

- ✅ **Zero manual steps** - Just use droids normally
- ✅ **Self-healing** - Auto-recovers from crashes
- ✅ **Transparent** - Works in background
- ✅ **Reliable** - Droids always have coordination available

## Quick Use

### Method 1: Wrapper Script (Recommended)

```bash
# Use droid-with-mcp instead of droid
~/.config/opencode/bin/droid-with-mcp orchestrator "Implement user authentication"
```

**What happens:**
```
[Droid with MCP] Ensuring MCP Agent Mail is running...
[Factory Session Start Hook] Ensuring MCP Agent Mail is running
✓ MCP Agent Mail running (PID: 12345)
✓ MCP Agent Mail is ready

[Orchestrator] Starting session...
✓ Orchestration complete
```

### Method 2: Direct Hook Call

```bash
# Run hook manually before droid
~/.config/opencode/hooks/mcp-agent-mail-session-start.sh
✓ MCP Agent Mail is ready

# Then run droid normally
~/.config/opencode/bin/droid orchestrator "Implement user authentication"
```

### Method 3: In Droid Code

```python
from mcp_agent_mail.auto_start_integration import ensure_mcp_agent_mail

@ensure_mcp_agent_mail
async def my_droid_function():
    # MCP Agent Mail is guaranteed to be running
    pass
```

## How It Works

### Detection Logic

1. **Check if running:** Looks for running `mcp_agent_mail.http` process
2. **Health check:** Verifies server responds at http://127.0.0.1:8765/health/readiness
3. **Auto-start:** If not running or unhealthy, starts automatically
4. **Wait for ready:** Blocks until server health check passes
5. **Proceed:** Droid continues with full MCP functionality

### Auto-Start Process

```
Hook called → Check if running → If no → Start server → Wait for healthy → Continue
```

**When server NOT running:**
```
$ ~/.config/opencode/hooks/mcp-agent-mail-session-start.sh
[Factory Session Start Hook] Ensuring MCP Agent Mail is running
⚠ MCP Agent Mail is not running
Starting MCP Agent Mail server...
Starting server in background...
Waiting for server to start...
........
✓ Server started successfully (PID: 12345)
✓ MCP Agent Mail is ready
```

**When server already running:**
```
$ ~/.config/opencode/hooks/mcp-agent-mail-session-start.sh
[Factory Session Start Hook] Ensuring MCP Agent Mail is running
✓ MCP Agent Mail running (PID: 12345)
✓ MCP Agent Mail is ready
```

## Self-Healing

### Recovery from Crashes

If the server crashes or is killed:

```bash
# Server was running, now it's dead
$ pkill -f mcp_agent_mail.http

# Hook detects and restarts
$ ~/.config/opencode/hooks/mcp-agent-mail-session-start.sh
[Factory Session Start Hook] Ensuring MCP Agent Mail is running
⚠ Stale PID file removed (process 12345 not found)
MCP Agent Mail server not found.
Starting MCP Agent Mail server...
...
✓ Server started successfully (PID: 67890)
✓ MCP Agent Mail is ready
```

### Recovery from Unhealthy State

If server is running but not responding:

```bash
$ ~/.config/opencode/hooks/mcp-agent-mail-session-start.sh
[Factory Session Start Hook] Ensuring MCP Agent Mail is running
✓ MCP Agent Mail running (PID: 12345)
⚠ Server running but not healthy, restarting...
Starting MCP Agent Mail server...
...
✓ Server started successfully (PID: 67890)
✓ MCP Agent Mail is ready
```

## Graceful Degradation

### When MCP Agent Mail Is Not Installed

```bash
$ mv ~/.config/opencode/mcp_agent_mail ~/.config/opencode/mcp_agent_mail.bak
$ ~/.config/opencode/hooks/mcp-agent-mail-session-start.sh
[Factory Session Start Hook] Ensuring MCP Agent Mail is running
✗ MCP Agent Mail not installed at /Users/buddhi/.config/opencode/mcp_agent_mail
Install with: ~/.config/opencode/bin/droid-init
```

**Droid will proceed without agent coordination features.**

## Testing

See [TEST_REPORT.md](./TEST_REPORT.md) for comprehensive test results.

**Quick test:**
```bash
~/.config/opencode/hooks/mcp-agent-mail-session-start.sh
✓ Should pass if server is ready
```

## Troubleshooting

### Server Won't Start

```bash
# Check logs
$ tail -f ~/.config/opencode/logs/mcp-agent-mail.log

# Check port
$ lsof -i :8765

# Check dependencies
$ cd ~/.config/opencode/mcp_agent_mail && uv sync
```

### Wrapper Not Found

```bash
# Check if executable
$ ls -la ~/.config/opencode/bin/droid-with-mcp
# Should show: -rwxr-xr-x
```

### Hook Not Found

```bash
# Check if executable
$ ls -la ~/.config/opencode/hooks/mcp-agent-mail-session-start.sh
# Should show: -rwxr-xr-x
```

## Performance

| Scenario | Time | Notes |
|----------|------|-------|
| Server already running | ~0.5s | Just health check |
| Server not running | ~8-10s | Includes dependency check, start, health wait |
| First start (no dependencies) | ~12-15s | Includes uv sync |

## Documentation

- [Integration Guide](./INTEGRATION_GUIDE.md) - For developers
- [API Reference](./API_REFERENCE.md) - Technical details
- [Test Report](./TEST_REPORT.md) - Full test results
