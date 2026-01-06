# MCP Agent Mail Integration Guide for Factory Droids

## Overview

This guide provides integration patterns for Factory Droids to use MCP Agent Mail for agent-to-agent communication, file reservations, and human oversight.

## Quick Reference

```python
# Import the client helper
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

# At session start
result = await register_agent(
    mcp_client,
    project_key=get_project_key(),
    agent_name="orchestrator",
    model=os.getenv("MODEL_NAME", "unknown"),
    task_description="Task coordination and delegation to specialist droids"
)

# Send task to specialist
result = await send_message(
    mcp_client,
    project_key=get_project_key(),
    sender_name="orchestrator",
    recipient_name="frontend-specialist",
    content={
        "type": "task_assignment",
        "task_id": "bd-42",
        "description": "Implement user authentication UI",
        "files": ["src/frontend/**/*.ts"]
    },
    importance="high"
)

# Check inbox periodically
result = await fetch_inbox(
    mcp_client,
    project_key=get_project_key(),
    agent_name="orchestrator"
)
```

## Orchestrator Integration Patterns

### Pattern 1: Agent Registration at Session Start

```python
# At the beginning of orchestrator execution
import sys
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')
from mcp_agent_mail_client import register_agent, get_project_key
import os

# Register orchestrator as an agent
result = await register_agent(
    mcp_client,  # MCP client from droid context
    project_key=get_project_key(),  # Git repo slug or working dir
    agent_name="orchestrator",
    model=os.getenv("MODEL_NAME", "unknown"),
    task_description="Task coordination and delegation to specialist droids"
)

if not result["success"]:
    print(f"⚠️  MCP Agent Mail registration failed: {result.get('error', 'Unknown error')}")
    print("   Continuing without MCP Agent Mail (graceful degradation)")
    # Set flag to skip MCP operations
    USE_MCP = False
else:
    print("✓ Registered with MCP Agent Mail as agent: orchestrator")
    USE_MCP = True
```

### Pattern 2: Task Delegation with Messaging

```python
# When delegating to a specialist droid
from mcp_agent_mail_client import send_message

# After determining task assignment via bv --robot-triage
for task in tasks_to_delegate:
    specialist = task["assigned_to"]  # e.g., "frontend-specialist"
    
    result = await send_message(
        mcp_client,
        project_key=get_project_key(),
        sender_name="orchestrator",
        recipient_name=specialist,
        content={
            "type": "task_assignment",
            "task_id": task["bd_id"],  # Link to bd task
            "description": task["description"],
            "files": task["file_patterns"],  # Files to work on
            "priority": task["priority"],  # From bv PageRank
            "dependencies": task.get("dependencies", []),
            "deadline": task.get("deadline")
        },
        importance="high" if task["priority"] <= 1 else "normal"
    )
    
    if result["success"]:
        print(f"✓ Task sent via MCP to {specialist}")
    else:
        print(f"⚠️  Failed to send task: {result.get('error')}")
```

### Pattern 3: Inbox Polling for Completion Status

```python
# Periodically check inbox for completions
from mcp_agent_mail_client import fetch_inbox, acknowledge_message

async def check_for_completions(mcp_client, project_key):
    """Poll inbox for task completion messages"""
    result = await fetch_inbox(
        mcp_client,
        project_key=project_key,
        agent_name="orchestrator",
        limit=50,
        acknowledged_only=False
    )
    
    if not result["success"]:
        print(f"⚠️  Failed to fetch inbox: {result.get('error')}")
        return []
    
    messages = result["response"].get("result", {}).get("messages", [])
    completed_tasks = []
    
    for msg in messages:
        if msg.get("type") == "task_completion":
            task_id = msg["content"].get("task_id")
            completed_tasks.append(task_id)
            print(f"✓ Task {task_id} completed by {msg['sender_name']}")
            
            # Acknowledge completion
            await acknowledge_message(
                mcp_client,
                project_key=project_key,
                agent_name="orchestrator",
                message_id=msg["id"]
            )
            
            # Update bd task status
            # bd close {task_id} --reason "Completed via MCP Agent Mail"
    
    return completed_tasks
```

### Pattern 4: File Reservation Before Parallel Work

```python
# Before delegating parallel work that might edit same files
from mcp_agent_mail_client import reserve_file_paths, release_file_reservations

# Reserve files for each specialist before starting work
reservations = {}

for specialist, patterns in work_assignments.items():
    result = await reserve_file_paths(
        mcp_client,
        project_key=get_project_key(),
        agent_name=specialist,
        paths=patterns,
        ttl_seconds=3600,  # 1 hour reservation
        exclusive=False
    )
    
    if result["success"]:
        reservations[specialist] = result["response"]
        print(f"✓ Reserved {len(patterns)} patterns for {specialist}")
    else:
        print(f"⚠️  Failed to reserve files for {specialist}: {result.get('error')}")
        # Handle conflict - queue task or escalate

# On all tasks complete, release reservations
for specialist in reservations:
    result = await release_file_reservations(
        mcp_client,
        project_key=get_project_key(),
        agent_name=specialist
    )
    print(f"✓ Released reservations for {specialist}")
```

### Pattern 5: Graceful Degradation

```python
# All MCP operations should have fallback
USE_MCP = True  # Set based on registration success

async def safe_send_message(mcp_client, *args, **kwargs):
    """Send message with fallback to direct delegation"""
    if not USE_MCP:
        # Direct delegation without messaging
        return {"success": False, "fallback": True}
    
    try:
        return await send_message(mcp_client, *args, **kwargs)
    except Exception as e:
        print(f"⚠️  MCP send_message failed: {e}")
        print("   Falling back to direct delegation")
        return {"success": False, "fallback": True, "error": str(e)}
```

### Pattern 6: Cross-Project Communication Setup

```python
# For cross-project coordination
from mcp_agent_mail_client import send_message, get_project_key

# When orchestrator needs to contact agent in different project
# (e.g., frontend/backend coordination)

result = await send_message(
    mcp_client,
    project_key="/path/to/other/project",  # Different project key
    sender_name="orchestrator-project-a",
    recipient_name="orchestrator-project-b",
    content={
        "type": "cross_project_request",
        "request": "Need API endpoint for user auth",
        "priority": "high"
    },
    importance="high"
)

# Must first approve cross-project contact
# Via respond_contact tool in MCP Agent Mail
```

## Message Format Standards

**Comprehensive message format specifications** are documented in `droids/MESSAGE_FORMATS.md`. All droid communication should follow the standards defined there.

### Quick Reference

The most commonly used message types:

1. **Task Assignment** (`task_assignment`) - Delegate work to another agent
2. **Task Completion** (`task_completion`) - Report task completion status
3. **Error Report** (`error_report`) - Report blocking errors
4. **Status Update** (`status_update`) - Provide periodic progress updates

### Example: Task Assignment

```json
{
  "type": "task_assignment",
  "task_id": "bd-42",
  "description": "Implement user authentication UI",
  "files": ["src/frontend/**/*.ts", "src/frontend/**/*.tsx"],
  "priority": "high",
  "priority_value": 1,
  "dependencies": ["bd-41"],
  "deadline": "2025-12-31",
  "acceptance_criteria": [
    "Login form working",
    "Password validation",
    "Error handling"
  ]
}
```

### Example: Task Completion

```json
{
  "type": "task_completion",
  "task_id": "bd-42",
  "status": "complete",
  "files_modified": [
    "src/frontend/auth.ts",
    "src/frontend/components/LoginForm.tsx"
  ],
  "test_results": {
    "unit_tests": {
      "passed": 15,
      "failed": 0
    }
  },
  "errors_encountered": [],
  "time_spent_minutes": 120,
  "notes": "All acceptance criteria met, tests passing"
}
```

### Example: Error Report

```json
{
  "type": "error_report",
  "task_id": "bd-42",
  "severity": "blocking",
  "error": {
    "code": "API_CONNECTION_ERROR",
    "message": "Cannot connect to authentication API endpoint"
  },
  "attempted_solutions": [
    "Checked network connectivity",
    "Verified API endpoint URL",
    "Tested with curl"
  ],
  "needs_human_intervention": false
}
```

For complete message format specifications including all fields, validation rules, and additional message types, see `droids/MESSAGE_FORMATS.md`.

## Common File Patterns for Reservations

| Droid Type | Typical File Patterns |
|------------|----------------------|
| **frontend-developer** | `src/frontend/**/*.ts`, `src/frontend/**/*.tsx`, `src/frontend/**/*.css` |
| **backend-developer** | `src/backend/**/*.py`, `src/backend/**/*.ts`, `src/api/**/*.ts` |
| **database-engineer** | `src/db/**/*.sql`, `migrations/**/*.sql`, `models/**/*.py` |
| **test-automator** | `tests/**/*.py`, `tests/**/*.ts`, `**/*.test.*`, `**/*.spec.*` |
| **orchestrator** | `tasks/*.md`, `.config/opencode/*.json`, `AGENTS.md` |

## Testing Your Integration

Create a test script to validate MCP Agent Mail integration:

```python
#!/usr/bin/env python3
"""Test MCP Agent Mail integration"""

import sys
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')
import asyncio

async def test_integration():
    from mcp_agent_mail_client import register_agent, send_message, fetch_inbox
    
    # This requires MCP client from droid context
    # In real usage, mcp_client is provided by Factory
    
    print("Testing MCP Agent Mail integration...")
    print("✓ Client module imports successfully")
    print("✓ Ready for testing once server is running")

if __name__ == "__main__":
    asyncio.run(test_integration())
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **MCP Agent Mail not available** | Set `USE_MCP = False` and continue without messaging |
| **Registration fails** | Check server is running, verify network connectivity |
| **Message send fails** | Retry with exponential backoff, fall back to direct delegation |
| **File reservation conflict** | Queue task, wait for release, or escalate to human |
| **Python version error** | Install Python 3.10+ (see MCP_AGENT_MAIL_SETUP.md) |

## Next Steps

1. Install Python 3.10+ (required)
2. Start MCP Agent Mail server (refer to MCP_AGENT_MAIL_SETUP.md)
3. Test integration with the test script above
4. Update droids to use these patterns

## References

- [MCP Agent Mail Repository](https://github.com/Dicklesworthstone/mcp_agent_mail)
- [MCP_AGENT_MAIL_SETUP.md](./MCP_AGENT_MAIL_SETUP.md) - Setup instructions
- [AGENTS.md](./AGENTS.md) - bv vs MCP Agent Mail usage guidance
