# MCP Agent Mail - Integration Guide

**For developers integrating MCP Agent Mail into droids**

## Overview

MCP Agent Mail provides a client library for droids to communicate with the MCP Agent Mail server for:
- Agent registration and discovery
- Message sending and receiving
- File reservations to prevent conflicts
- Agent-to-agent coordination

## Quick Setup

### 1. Import the Client

```python
import sys
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')
from mcp_agent_mail_client import (
    register_agent,
    send_message,
    fetch_inbox,
    acknowledge_message,
    reserve_file_paths,
    release_file_reservations,
    get_project_key
)
```

### 2. Register Your Droid

```python
result = await register_agent(
    mcp_client,
    project_key=get_project_key(),
    agent_name="your-droid",  # Omit for auto-generation
    model="gpt-4",
    task_description="What your droid does"
)

if result["success"]:
    agent_info = result["response"]
    print(f"✓ Registered as agent: {agent_info['name']}")
else:
    print(f"⚠ Registration failed: {result['error']}")
```

### 3. Send a Message

```python
result = await send_message(
    mcp_client,
    project_key=get_project_key(),
    sender_name="your-droid",
    recipient_name="other-droid",
    content={
        "type": "task_assignment",
        "task_id": "bd-123",
        "description": "Implement feature X",
        "file_patterns": ["src/**/*.ts"],
        "priority": "high",
        "acceptance_criteria": [...]
    },
    importance="high"
)
```

### 4. Check Inbox

```python
result = await fetch_inbox(
    mcp_client,
    project_key=get_project_key(),
    agent_name="your-droid",
    limit=50
)

if result["success"]:
    messages = result["response"].get("messages", [])
    for msg in messages:
        await process_message(msg)
        await acknowledge_message(
            mcp_client,
            project_key=get_project_key(),
            agent_name="your-droid",
            message_id=msg["id"]
        )
```

## Message Formats

### Task Assignment

```json
{
  "version": "1.0.0",
  "timestamp": "2025-12-25T12:00:00Z",
  "sender_id": "orchestrator",
  "message_id": "msg-001",
  "type": "task_assignment",
  "task_id": "bd-42",
  "description": "Implement user authentication UI",
  "file_patterns": ["src/frontend/**/*.ts"],
  "priority": "high",
  "priority_value": 1,
  "acceptance_criteria": [...]
}
```

### Task Completion

```json
{
  "type": "task_completion",
  "task_id": "bd-42",
  "status": "complete",
  "files_modified": [...],
  "test_results": {...}
}
```

See [MESSAGE_FORMATS.md](../../../droids/MESSAGE_FORMATS.md) for complete formats.

## Auto-Start Integration

### Using the Decorator

```python
from mcp_agent_mail.auto_start_integration import ensure_mcp_agent_mail

@ensure_mcp_agent_mail
async def my_droid_function():
    # MCP Agent Mail is guaranteed to be running
    await register_agent(...)
```

### Manual Hook Call

```python
import subprocess

result = subprocess.run(
    ["$HOME/.config/opencode/hooks/mcp-agent-mail-session-start.sh"],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("✓ MCP Agent Mail is ready")
else:
    print("⚠ MCP Agent Mail not available")
```

### Wrapper Script

```bash
# Use droid-with-mcp wrapper
~/.config/opencode/bin/droid-with-mcp your-droid "your task"
```

## File Reservations

```python
# Reserve files before editing
result = await reserve_file_paths(
    mcp_client,
    project_key=get_project_key(),
    agent_name="your-droid",
    paths=["src/**/*.ts"],
    ttl_seconds=3600,
    exclusive=False
)

if result["success"]:
    print("✓ Files reserved")

# Release when done
await release_file_reservations(
    mcp_client,
    project_key=get_project_key(),
    agent_name="your-droid"
)
```

## Graceful Degradation

Handle MCP Agent Mail being unavailable:

```python
USE_MCP = False
try:
    result = await register_agent(...)
    if result["success"]:
        USE_MCP = True
except Exception as e:
    print(f"⚠ MCP not available: {e}")
    USE_MCP = False

# Continue with direct execution
if not USE_MCP:
    # Direct execution without MCP
    pass
```

## Best Practices

1. **Always check MCP availability** - Don't assume it's running
2. **Use auto-start** - Ensures server is available
3. **Handle errors gracefully** - Continue without MCP if needed
4. **Reserve files before editing** - Prevent conflicts
5. **Acknowledge messages** - Clean up inbox after processing
6. **Use standard message formats** - Ensure interoperability

## Examples

See [EXAMPLES.md](./EXAMPLES.md) for complete working examples and runnable code.
