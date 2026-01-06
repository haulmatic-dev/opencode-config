# MCP Agent Mail - Complete Working Examples

**Real-world examples showing how to use MCP Agent Mail in your droids**

## Table of Contents

1. [Task Delegation Complete Workflow](#1-task-delegation-complete-workflow) - Orchestrator → Specialist
2. [Inbox Processing Loop](#2-inbox-processing-loop-pattern) - Continuous message handling
3. [MCP vs Fallback Side-by-Side](#3-mcp-vs-fallback-side-by-side) - Comparing both approaches
4. [File Reservation Workflow](#4-file-reservation-workflow) - Reserve → Edit → Release
5. [Multi-Agent Coordination](#5-multi-agent-coordination) - Complex team workflows

---

## 1. Task Delegation Complete Workflow

This example shows a complete task delegation from orchestrator to frontend-specialist, including the full lifecycle.

### orchestrator.py

```python
#!/usr/bin/env python3
"""
Orchestrator droid that delegates tasks to specialists via MCP Agent Mail.
Demonstrates: registration, task delegation, and receiving completion reports.
"""

import sys
import asyncio
import uuid
from datetime import datetime

# Add Factory droids to path
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

from mcp_agent_mail_client import (
    register_agent,
    send_message,
    fetch_inbox,
    acknowledge_message,
    get_project_key
)

# Message format helpers
from MESSAGE_FORMATS import TaskAssignment, TaskCompletion


class Orchestrator:
    def __init__(self, mcp_client):
        self.mcp_client = mcp_client
        self.project_key = get_project_key()
        self.agent_name = "orchestrator"
        self.use_mcp = False
        
    async def initialize(self):
        """Register with MCP Agent Mail or fall back to direct execution."""
        try:
            result = await register_agent(
                mcp_client=self.mcp_client,
                project_key=self.project_key,
                agent_name=self.agent_name,
                model="gpt-4",
                task_description="Coordinates tasks between specialist droids"
            )
            
            if result["success"]:
                self.use_mcp = True
                agent_info = result["response"]
                print(f"✓ Registered as agent: {agent_info['name']}")
                print(f"  Session started at: {agent_info['inception_ts']}")
            else:
                print(f"⚠ Registration failed: {result.get('error', 'Unknown error')}")
                print("→ Will use direct execution mode")
                
        except Exception as e:
            print(f"⚠ MCP Agent Mail unavailable: {e}")
            print("→ Will use direct execution mode")
            
        return self.use_mcp
    
    async def delegate_task(self, task_id, description, specialist, file_patterns):
        """
        Delegate a task to a specialist droid.
        
        Args:
            task_id: The bd task ID (e.g., "bd-42")
            description: Human-readable task description
            specialist: Name of specialist agent (e.g., "frontend-specialist")
            file_patterns: List of file patterns affected
        """
        if not self.use_mcp:
            print(f"⚠ MCP not enabled, running task {task_id} directly...")
            return await self._run_task_directly(task_id, description)
        
        # Create task assignment message
        message_content = {
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sender_id": self.agent_name,
            "message_id": f"msg-{uuid.uuid4()}",
            "type": "task_assignment",
            "task_id": task_id,
            "description": description,
            "specification": {
                "acceptance_criteria": [
                    "Code follows project style guidelines",
                    "All tests pass",
                    "Documentation updated if needed"
                ],
                "technical_requirements": [
                    "Use existing libraries and patterns",
                    "Follow coding guidelines from AGENTS.md"
                ]
            },
            "file_patterns": file_patterns,
            "priority": "high",
            "priority_value": 1,
            "estimated_duration_minutes": 120,
            "metadata": {
                "labels": ["automated", "delegated"],
                "component": "mcp-integration"
            }
        }
        
        print(f"→ Delegating {task_id} to {specialist}...")
        print(f"  Description: {description}")
        print(f"  Files: {', '.join(file_patterns)}")
        
        result = await send_message(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            sender_name=self.agent_name,
            recipient_name=specialist,
            content=message_content,
            importance="high"
        )
        
        if result["success"]:
            delivery = result["response"]
            print(f"✓ Task delegated successfully")
            print(f"  Delivered to: {delivery['recipients']}")
            print(f"  Thread ID: {delivery.get('thread_id', 'N/A')}")
            return True
        else:
            print(f"✗ Delegation failed: {result.get('error')}")
            return False
    
    async def check_completion_reports(self):
        """Check inbox for task completion reports from specialists."""
        if not self.use_mcp:
            return []
        
        result = await fetch_inbox(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            limit=20,
            acknowledged_only=False
        )
        
        if not result["success"]:
            print(f"⚠ Failed to fetch inbox: {result.get('error')}")
            return []
        
        messages = result["response"].get("messages", [])
        completion_reports = []
        
        for msg in messages:
            content = msg.get("content", "")
            subject = msg.get("subject", "")
            
            # Look for task completion messages
            if "task_completion" in content or "completed" in subject.lower():
                print(f"\n📥 Task completion report:")
                print(f"   From: {msg['from']}")
                print(f"   Subject: {subject}")
                print(f"   Received: {msg['created_ts']}")
                
                completion_reports.append(msg)
                
                # Acknowledge the message
                await acknowledge_message(
                    mcp_client=self.mcp_client,
                    project_key=self.project_key,
                    agent_name=self.agent_name,
                    message_id=msg["id"]
                )
                print("   ✓ Acknowledged")
        
        return completion_reports
    
    async def _run_task_directly(self, task_id, description):
        """Fallback: run task directly without MCP."""
        print(f"   Running directly: {description}")
        # In a real scenario, you'd execute the task logic here
        return {"status": "complete_direct", "task_id": task_id}


# Example usage
async def main():
    print("=" * 60)
    print("Orchestrator Task Delegation Demo")
    print("=" * 60)
    
    # Mock MCP client (in real usage, this comes from Factory context)
    class MockMCPClient:
        async def call_tool(self, name, arguments):
            # In real usage, this calls the MCP server
            print(f"   [MCP Call: {name}]")
            return {"result": {"success": True, "recipients": ["frontend-specialist"]}}
    
    mcp_client = MockMCPClient()
    orchestrator = Orchestrator(mcp_client)
    
    # Initialize (register with MCP)
    use_mcp = await orchestrator.initialize()
    print()
    
    if use_mcp:
        # Delegate a task
        await orchestrator.delegate_task(
            task_id="bd-42",
            description="Implement user authentication UI with login form",
            specialist="frontend-specialist",
            file_patterns=["src/frontend/auth/**/*.tsx", "src/frontend/services/auth.ts"]
        )
        print()
        
        # Check for completion reports
        print("Checking for completion reports...")
        reports = await orchestrator.check_completion_reports()
        
        if not reports:
            print("No completion reports yet (specialist still working)")
    
    print("\n" + "=" * 60)
    print("Demo complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
```

### Expected Output

```
============================================================
Orchestrator Task Delegation Demo
============================================================
✓ Registered as agent: orchestrator
  Session started at: 2025-12-26T11:30:00Z

→ Delegating bd-42 to frontend-specialist...
  Description: Implement user authentication UI with login form
  Files: src/frontend/auth/**/*.tsx, src/frontend/services/auth.ts
   [MCP Call: call_tool]
✓ Task delegated successfully
  Delivered to: ['frontend-specialist']
  Thread ID: TKT-123

Checking for completion reports...
No completion reports yet (specialist still working)

============================================================
Demo complete!
============================================================
```

---

## 2. Inbox Processing Loop Pattern

This example shows how a specialist droid continuously checks its inbox and processes different types of messages.

### specialist.py

```python
#!/usr/bin/env python3
"""
Specialist droid that processes tasks from its inbox.
Demonstrates: inbox polling, message processing, and acknowledgment.
"""

import sys
import asyncio
import time
from datetime import datetime

sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

from mcp_agent_mail_client import (
    register_agent,
    fetch_inbox,
    acknowledge_message,
    get_project_key
)


class Specialist:
    def __init__(self, mcp_client, agent_name):
        self.mcp_client = mcp_client
        self.project_key = get_project_key()
        self.agent_name = agent_name
        self.use_mcp = False
        self.is_running = False
        
    async def initialize(self):
        """Register with MCP Agent Mail."""
        try:
            result = await register_agent(
                mcp_client=self.mcp_client,
                project_key=self.project_key,
                agent_name=self.agent_name,
                model="gpt-4",
                task_description=f"Specialist agent: {self.agent_name}"
            )
            
            self.use_mcp = result.get("success", False)
            if self.use_mcp:
                print(f"✓ {self.agent_name} registered and ready")
            else:
                print(f"⚠ {self.agent_name} using direct mode")
                
        except Exception as e:
            print(f"⚠ {self.agent_name} initialization failed: {e}")
        
        return self.use_mcp
    
    async def start_inbox_processor(self, check_interval_seconds=10):
        """
        Start the inbox processing loop.
        
        Args:
            check_interval_seconds: How often to check inbox (default: 10s)
        """
        if not self.use_mcp:
            print(f"⚠ {self.agent_name} not using MCP, inbox processor not started")
            return
        
        self.is_running = True
        print(f"→ Starting inbox processor for {self.agent_name} (checking every {check_interval_seconds}s)")
        
        while self.is_running:
            try:
                await self._process_inbox()
                await asyncio.sleep(check_interval_seconds)
            except Exception as e:
                print(f"✗ Inbox processing error: {e}")
                await asyncio.sleep(check_interval_seconds * 2)  # Back off on errors
    
    async def stop_inbox_processor(self):
        """Stop the inbox processing loop."""
        self.is_running = False
        print(f"→ Stopping inbox processor for {self.agent_name}")
    
    async def _process_inbox(self):
        """Check inbox and process any new messages."""
        result = await fetch_inbox(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            limit=50,
            acknowledged_only=False  # Get all messages, including unacknowledged
        )
        
        if not result["success"]:
            print(f"⚠ Failed to fetch inbox: {result.get('error')}")
            return
        
        messages = result["response"].get("messages", [])
        
        if not messages:
            return  # No messages to process
        
        print(f"\n📥 {self.agent_name} has {len(messages)} message(s)")
        
        for msg in messages:
            await self._process_message(msg)
    
    async def _process_message(self, msg):
        """Process a single message based on its type."""
        message_id = msg.get("id")
        subject = msg.get("subject", "")
        content = msg.get("content", "")
        sender = msg.get("from")
        importance = msg.get("importance", "normal")
        
        print(f"\n  Message from: {sender}")
        print(f"  Subject: {subject}")
        print(f"  Importance: {importance}")
        print(f"  Received: {msg['created_ts']}")
        
        # Determine message type and process accordingly
        if "task_assignment" in content:
            await self._handle_task_assignment(msg)
        elif "task_completion" in content:
            await self._handle_task_completion(msg)
        elif "status_update" in content:
            await self._handle_status_update(msg)
        elif "error_report" in content:
            await self._handle_error_report(msg)
        else:
            await self._handle_generic_message(msg)
        
        # Always acknowledge after processing
        await acknowledge_message(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            message_id=message_id
        )
        print(f"  ✓ Acknowledged")
    
    async def _handle_task_assignment(self, msg):
        """Handle a task assignment message."""
        content = msg.get("content", "")
        
        print(f"  📋 Type: Task Assignment")
        
        # Extract task details from content
        # In real usage, you'd parse the JSON content
        print(f"  Processing task...")
        
        # Simulate task processing
        await asyncio.sleep(2)
        
        # In a real scenario:
        # 1. Parse the task details
        # 2. Validate acceptance criteria
        # 3. Reserve required files
        # 4. Do the work
        # 5. Send completion report
        
        print(f"  ✓ Task accepted and queued for processing")
    
    async def _handle_task_completion(self, msg):
        """Handle a task completion report."""
        print(f"  ✅ Type: Task Completion Report")
        print(f"  Noting completion for tracking...")
    
    async def _handle_status_update(self, msg):
        """Handle a status update message."""
        print(f"  📊 Type: Status Update")
        print(f"  Tracking progress...")
    
    async def _handle_error_report(self, msg):
        """Handle an error report."""
        print(f"  ❌ Type: Error Report")
        content = msg.get("content", "")
        print(f"  Alert: Error needs attention!")
    
    async def _handle_generic_message(self, msg):
        """Handle generic/unrecognized messages."""
        print(f"  💬 Type: Generic Message")
        print(f"  Noting message content...")


# Example usage
async def main():
    print("=" * 60)
    print("Specialist Inbox Processor Demo")
    print("=" * 60)
    
    class MockMCPClient:
        async def call_tool(self, name, arguments):
            tool_name = arguments.get("tool_name", name)
            print(f"   [MCP Call: {tool_name}]")
            
            if tool_name == "fetch_inbox":
                # Simulate returning messages
                return {
                    "result": {
                        "messages": [
                            {
                                "id": 1,
                                "from": "orchestrator",
                                "subject": "Task Assignment: bd-42",
                                "content": '{"type": "task_assignment", "task_id": "bd-42"}',
                                "created_ts": "2025-12-26T11:30:00Z",
                                "importance": "high"
                            },
                            {
                                "id": 2,
                                "from": "backend-specialist",
                                "subject": "Status Update",
                                "content": '{"type": "status_update", "progress": "50%"}',
                                "created_ts": "2025-12-26T11:25:00Z",
                                "importance": "normal"
                            }
                        ]
                    }
                }
            
            return {"result": {"success": True}}
    
    mcp_client = MockMCPClient()
    specialist = Specialist(mcp_client, "frontend-specialist")
    
    # Initialize
    await specialist.initialize()
    print()
    
    # Process inbox once (normally runs continuously)
    await specialist._process_inbox()
    print()
    
    print("=" * 60)
    print("Demo complete!")
    print("In production, use: await specialist.start_inbox_processor()")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
```

---

## 3. MCP vs Fallback Side-by-Side

This example compares the same task delegation workflow implemented both with MCP and as a direct fallback.

### mcp_vs_fallback.py

```python
#!/usr/bin/env python3
"""
Side-by-side comparison: MCP Agent Mail vs Direct Execution

This example shows how to structure your droid to support both modes,
automatically falling back to direct execution when MCP is unavailable.
"""

import sys
import asyncio
from typing import Dict, Any, Optional

sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

from mcp_agent_mail_client import (
    register_agent,
    send_message,
    reserve_file_paths,
    release_file_reservations,
    get_project_key
)


class FlexibleOrchestrator:
    """
    Orchestrator that automatically chooses between MCP and direct execution.
    """
    
    def __init__(self):
        self.project_key = get_project_key()
        self.agent_name = "flexible-orchestrator"
        self.mode = None  # "mcp" or "direct"
        self.mcp_client = None
        
    async def initialize(self, mcp_client: Optional[Any] = None):
        """
        Initialize the orchestrator, trying MCP first then falling back to direct.
        
        Args:
            mcp_client: Optional MCP client (if None, uses direct mode)
        """
        print("Initializing FlexibleOrchestrator...")
        print(f"Project: {self.project_key}")
        print()
        
        # Try MCP mode first
        if mcp_client:
            try:
                success = await self._try_mcp_mode(mcp_client)
                if success:
                    self.mode = "mcp"
                    self.mcp_client = mcp_client
                    print("✓ Mode: MCP Agent Mail")
                    return self.mode
            except Exception as e:
                print(f"⚠ MCP initialization failed: {e}")
        
        # Fall back to direct mode
        self.mode = "direct"
        print("✓ Mode: Direct Execution")
        return self.mode
    
    async def _try_mcp_mode(self, mcp_client) -> bool:
        """Attempt to initialize MCP mode."""
        try:
            result = await register_agent(
                mcp_client=mcp_client,
                project_key=self.project_key,
                agent_name=self.agent_name,
                model="gpt-4",
                task_description="Flexible orchestrator with MCP support"
            )
            return result.get("success", False)
        except Exception:
            return False
    
    async def delegate_task(self, task_id: str, description: str, specialist: str,
                           file_patterns: list, priority: str = "normal") -> Dict[str, Any]:
        """
        Delegate a task using the current mode (MCP or direct).
        
        This method automatically chooses the right implementation based on mode.
        """
        if self.mode == "mcp":
            return await self._delegate_task_mcp(task_id, description, specialist,
                                               file_patterns, priority)
        else:
            return await self._delegate_task_direct(task_id, description, specialist,
                                                   file_patterns, priority)
    
    async def _delegate_task_mcp(self, task_id: str, description: str, specialist: str,
                                file_patterns: list, priority: str) -> Dict[str, Any]:
        """Delegate task using MCP Agent Mail."""
        print(f"→ [MCP MODE] Delegating {task_id} to {specialist}")
        
        # Reserve files first
        print(f"   Reserving files: {file_patterns}")
        reserve_result = await reserve_file_paths(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            paths=file_patterns,
            ttl_seconds=3600,
            exclusive=False
        )
        
        if not reserve_result.get("success"):
            print(f"   ⚠ File reservation failed: {reserve_result.get('error')}")
            # Continue anyway - reservation is advisory
        else:
            print(f"   ✓ Files reserved")
        
        # Send task assignment message
        message_content = {
            "version": "1.0.0",
            "timestamp": "2025-12-26T12:00:00Z",
            "sender_id": self.agent_name,
            "message_id": f"msg-{task_id}",
            "type": "task_assignment",
            "task_id": task_id,
            "description": description,
            "file_patterns": file_patterns,
            "priority": priority
        }
        
        send_result = await send_message(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            sender_name=self.agent_name,
            recipient_name=specialist,
            content=message_content,
            importance=priority
        )
        
        if send_result.get("success"):
            print(f"   ✓ Task message sent via MCP")
            response = send_result["response"]
            return {
                "status": "delegated",
                "mode": "mcp",
                "specialist": specialist,
                "thread_id": response.get("thread_id"),
                "delivery_time": response.get("created_ts")
            }
        else:
            print(f"   ✗ MCP send failed: {send_result.get('error')}")
            # Fall back to direct execution
            print(f"   → Falling back to direct mode for this task")
            return await self._delegate_task_direct(task_id, description, specialist,
                                                   file_patterns, priority)
    
    async def _delegate_task_direct(self, task_id: str, description: str, specialist: str,
                                   file_patterns: list, priority: str) -> Dict[str, Any]:
        """Delegate task using direct execution (no MCP)."""
        print(f"→ [DIRECT MODE] Executing {task_id} as {specialist}")
        print(f"   Description: {description}")
        print(f"   Files: {file_patterns}")
        print(f"   Priority: {priority}")
        
        # Simulate task execution
        print(f"   ⏳ Executing task...")
        await asyncio.sleep(1)  # Simulate work
        
        result = {
            "status": "complete",
            "mode": "direct",
            "specialist": specialist,
            "output": f"Task {task_id} completed directly",
            "completion_time": "2025-12-26T12:01:00Z"
        }
        
        print(f"   ✓ Task completed directly")
        return result
    
    async def reserve_resources(self, paths: list, exclusive: bool = False) -> bool:
        """
        Reserve resources (files) if in MCP mode, otherwise log and continue.
        
        Returns:
            bool: True if reservation successful or not needed (direct mode)
        """
        if self.mode != "mcp":
            print(f"   [DIRECT MODE] Would reserve: {paths}")
            return True  # Direct mode doesn't need reservations
        
        result = await reserve_file_paths(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            paths=paths,
            ttl_seconds=3600,
            exclusive=exclusive
        )
        
        success = result.get("success", False)
        if success:
            print(f"   [MCP MODE] ✓ Reserved: {paths}")
        else:
            print(f"   [MCP MODE] ⚠ Reservation failed: {result.get('error')}")
        
        return success
    
    async def release_resources(self):
        """Release all reservations if in MCP mode."""
        if self.mode != "mcp":
            print(f"   [DIRECT MODE] No reservations to release")
            return
        
        result = await release_file_reservations(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name
        )
        
        if result.get("success"):
            released = result["response"].get("released", 0)
            print(f"   [MCP MODE] ✓ Released {released} reservation(s)")
        else:
            print(f"   [MCP MODE] ⚠ Release failed: {result.get('error')}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status and capabilities."""
        return {
            "agent_name": self.agent_name,
            "mode": self.mode,
            "project": self.project_key,
            "capabilities": {
                "message_routing": self.mode == "mcp",
                "file_reservation": self.mode == "mcp",
                "direct_execution": True,
                "fallback_enabled": True
            }
        }


# Example usage
async def main():
    print("=" * 70)
    print("MCP vs Fallback: Side-by-Side Comparison")
    print("=" * 70)
    print()
    
    # Scenario 1: With MCP available
    print("-" * 70)
    print("SCENARIO 1: MCP Agent Mail Available")
    print("-" * 70)
    
    class MockMCPClient:
        async def call_tool(self, name, arguments):
            tool_name = arguments.get("tool_name", name)
            print(f"   [MCP Call: {tool_name}]")
            return {"result": {"success": True}}
    
    orchestrator_mcp = FlexibleOrchestrator()
    await orchestrator_mcp.initialize(MockMCPClient())
    print()
    
    result1 = await orchestrator_mcp.delegate_task(
        task_id="mcp-1",
        description="Add dark mode toggle",
        specialist="frontend-specialist",
        file_patterns=["src/frontend/theme/**/*.ts"],
        priority="high"
    )
    print()
    print(f"Result: {result1}")
    print()
    
    # Scenario 2: Without MCP (direct mode)
    print("-" * 70)
    print("SCENARIO 2: MCP Unavailable (Direct Mode)")
    print("-" * 70)
    
    orchestrator_direct = FlexibleOrchestrator()
    await orchestrator_direct.initialize(None)  # No MCP client
    print()
    
    result2 = await orchestrator_direct.delegate_task(
        task_id="direct-1",
        description="Add light mode toggle",
        specialist="frontend-specialist",
        file_patterns=["src/frontend/theme/**/*.ts"],
        priority="normal"
    )
    print()
    print(f"Result: {result2}")
    print()
    
    # Show status comparison
    print("-" * 70)
    print("STATUS COMPARISON")
    print("-" * 70)
    print("\nMCP Mode Status:")
    print(f"  {orchestrator_mcp.get_status()}")
    print("\nDirect Mode Status:")
    print(f"  {orchestrator_direct.get_status()}")
    print()
    
    print("=" * 70)
    print("Key Insight: Same API works in both modes!")
    print("Your droids can gracefully handle MCP being unavailable.")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
```

---

## 4. File Reservation Workflow

This example demonstrates a complete file reservation workflow with conflict detection and renewal.

### file_reservation_workflow.py

```python
#!/usr/bin/env python3
"""
Complete file reservation workflow example.
Demonstrates: reserve → check conflicts → renew → release
"""

import sys
import asyncio
from datetime import datetime, timedelta

sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

from mcp_agent_mail_client import (
    register_agent,
    reserve_file_paths,
    release_file_reservations,
    get_project_key
)


class FileReservationWorkflow:
    def __init__(self, mcp_client):
        self.mcp_client = mcp_client
        self.project_key = get_project_key()
        self.agent_name = "reservation-demo"
        
    async def initialize(self):
        """Register as an agent."""
        result = await register_agent(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            model="gpt-4",
            task_description="File reservation workflow demo"
        )
        return result.get("success", False)
    
    async def demonstrate_reservation_workflow(self):
        """
        Demonstrate a complete file reservation workflow:
        1. Check current reservations
        2. Reserve some files
        3. Simulate editing
        4. Renew reservation if needed
        5. Release when done
        """
        print("=" * 60)
        print("File Reservation Workflow Demo")
        print("=" * 60)
        print()
        
        # Step 1: Reserve files for a refactoring task
        print("STEP 1: Reserve files for refactoring")
        print("-" * 60)
        
        files_to_edit = [
            "src/auth/*.py",
            "src/auth/providers/**/*.py",
            "tests/auth/test_*.py"
        ]
        
        print(f"Files to reserve: {files_to_edit}")
        print(f"Agent: {self.agent_name}")
        print(f"Duration: 2 hours")
        print()
        
        result = await reserve_file_paths(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            paths=files_to_edit,
            ttl_seconds=7200,  # 2 hours
            exclusive=False  # Advisory (others can still edit with warning)
        )
        
        if result.get("success"):
            reservation = result["response"]
            print(f"✓ Reservation successful!")
            print(f"  Reserved {len(reservation.get('granted', []))} path(s)")
            
            for granted in reservation.get("granted", []):
                print(f"    - {granted['path_pattern']}")
                print(f"      Expires: {granted['expires_ts']}")
                print(f"      ID: {granted['id']}")
            
            if reservation.get("conflicts"):
                print(f"\n⚠ Conflicts detected:")
                for conflict in reservation["conflicts"]:
                    print(f"    - Path: {conflict['path']}")
                    print(f"      Held by: {conflict.get('holders', [])}")
        else:
            error = result.get("error", "Unknown error")
            print(f"✗ Reservation failed: {error}")
            print("\n⚠ Continuing anyway (file reservations are advisory)")
        
        print()
        
        # Step 2: Simulate editing work
        print("STEP 2: Simulate editing work")
        print("-" * 60)
        print("Status: Editing reserved files...")
        print("        • src/auth/login.py - modified")
        print("        • src/auth/providers/oauth.py - modified")
        print("        • tests/auth/test_login.py - added new tests")
        print()
        
        # Simulate work duration
        await asyncio.sleep(1)
        print("✓ Edits completed")
        print()
        
        # Step 3: Check if reservation needs renewal
        print("STEP 3: Check reservation status")
        print("-" * 60)
        
        # Simulate checking expiration
        time_passed = 90  # minutes
        if time_passed > 60:
            print(f"⚠ {time_passed} minutes have passed")
            print("Reservation may expire soon")
            
            # In a real scenario, you would check the reservation status
            # and renew if needed
            print("→ Consider renewing reservation for more time")
        
        print()
        
        # Step 4: Release reservations
        print("STEP 4: Release reservations (cleanup)")
        print("-" * 60)
        
        result = await release_file_reservations(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name
        )
        
        if result.get("success"):
            released = result["response"].get("released", 0)
            print(f"✓ Released {released} reservation(s)")
        else:
            print(f"⚠ Release failed: {result.get('error')}")
        
        print()
        print("=" * 60)
        print("Workflow complete!")
        print("=" * 60)
    
    async def demonstrate_conflict_scenario(self):
        """
        Demonstrate what happens when two agents try to reserve the same files.
        """
        print()
        print("=" * 60)
        print("Conflict Scenario Demo")
        print("=" * 60)
        print()
        print("Simulating two agents editing the same files simultaneously...")
        print()
        
        # Agent A reserves files
        print("Agent A (you) reserves: src/core/*.py")
        result_a = await reserve_file_paths(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name="agent-a",
            paths=["src/core/*.py"],
            ttl_seconds=3600,
            exclusive=False
        )
        
        if result_a.get("success"):
            print("✓ Agent A reservation successful")
        
        print()
        
        # Agent B tries to reserve the same files
        print("Agent B (teammate) tries to reserve: src/core/*.py")
        result_b = await reserve_file_paths(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name="agent-b",
            paths=["src/core/*.py"],
            ttl_seconds=3600,
            exclusive=False
        )
        
        if result_b.get("success"):
            reservation = result_b["response"]
            
            if reservation.get("conflicts"):
                print("⚠ Conflict detected!")
                for conflict in reservation["conflicts"]:
                    print(f"    Warning: {conflict['path']} already reserved")
                    print(f"    Current holder(s): {conflict.get('holders', [])}")
                
                print()
                print("Options:")
                print("1. Coordinate with Agent A before editing")
                print("2. Use force_release (not recommended)")
                print("3. Edit anyway (advisory reservations only)")
            else:
                print("✓ Agent B reservation successful (no conflicts)")
        
        print()
        print("=" * 60)


# Example usage
async def main():
    print("\nFile Reservation Workflow Demonstration")
    print("This shows how to properly use file reservations in your workflow.\n")
    
    class MockMCPClient:
        async def call_tool(self, name, arguments):
            tool_name = arguments.get("tool_name", name)
            print(f"   [MCP Call: {tool_name}]")
            
            if tool_name == "reserve_file_paths":
                # Simulate successful reservation
                return {
                    "result": {
                        "granted": [{
                            "id": 123,
                            "path_pattern": arguments["arguments"]["paths"][0],
                            "expires_ts": "2025-12-26T14:00:00Z",
                            "reason": arguments["arguments"].get("reason", "")
                        }],
                        "conflicts": []
                    }
                }
            elif tool_name == "release_file_reservations":
                return {"result": {"released": 1}}
            
            return {"result": {"success": True}}
    
    mcp_client = MockMCPClient()
    workflow = FileReservationWorkflow(mcp_client)
    
    # Initialize
    await workflow.initialize()
    print()
    
    # Run workflow demonstration
    await workflow.demonstrate_reservation_workflow()
    
    # Run conflict scenario
    await workflow.demonstrate_conflict_scenario()
    
    print("\n💡 Key Takeaways:")
    print("   • Always reserve files before editing")
    print("   • Check for conflicts and coordinate with teammates")
    print("   • Release reservations when done")
    print("   • Reservations are advisory (no hard locks)")
    print()


if __name__ == "__main__":
    asyncio.run(main())
```

---

## 5. Multi-Agent Coordination

This example shows how multiple agents work together on a complex feature, demonstrating project setup and coordination.

### multi_agent_coordination.py

```python
#!/usr/bin/env python3
"""
Multi-agent coordination example.
Demonstrates: project setup, agent registration, task delegation, and coordination.
"""

import sys
import asyncio
from datetime import datetime

sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

from mcp_agent_mail_client import (
    ensure_project,
    register_agent,
    send_message,
    fetch_inbox,
    acknowledge_message,
    get_project_key
)


class TeamOrchestrator:
    """
    Orchestrator that coordinates multiple specialist agents for a complex feature.
    """
    
    def __init__(self, mcp_client):
        self.mcp_client = mcp_client
        self.project_key = None
        self.agent_name = "feature-orchestrator"
        self.team = {
            "frontend": "frontend-specialist",
            "backend": "backend-specialist",
            "design": "design-extractor",
            "qa": "test-automator"
        }
    
    async def setup_project(self, project_name):
        """
        Ensure the project exists in MCP Agent Mail.
        
        Args:
            project_name: Human-readable project name
        """
        print("=" * 70)
        print("Project Setup")
        print("=" * 70)
        
        result = await ensure_project(
            mcp_client=self.mcp_client,
            human_key=project_name
        )
        
        if result.get("success"):
            project = result["response"]
            self.project_key = project["human_key"]
            print(f"✓ Project ready: {project['slug']}")
            print(f"  Key: {self.project_key}")
            print(f"  Created: {project['created_at']}")
        else:
            raise Exception(f"Failed to setup project: {result.get('error')}")
        
        return self.project_key
    
    async def register_team(self):
        """Register all agents in the team."""
        print()
        print("=" * 70)
        print("Registering Team Agents")
        print("=" * 70)
        
        # Register orchestrator
        print(f"\nRegistering orchestrator: {self.agent_name}")
        result = await register_agent(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            model="gpt-4",
            task_description="Coordinates feature development across specialists"
        )
        
        if result.get("success"):
            print(f"✓ {self.agent_name} registered")
        
        # Register specialists
        for specialty, agent_name in self.team.items():
            print(f"\nRegistering {specialty} specialist: {agent_name}")
            
            result = await register_agent(
                mcp_client=self.mcp_client,
                project_key=self.project_key,
                agent_name=agent_name,
                model="gpt-4",
                task_description=f"Specializes in {specialty} development"
            )
            
            if result.get("success"):
                agent_info = result["response"]
                print(f"✓ {agent_name} registered")
                print(f"  Inception: {agent_info['inception_ts']}")
    
    async def coordinate_feature(self, feature_id, feature_spec):
        """
        Coordinate work on a complex feature across multiple specialists.
        
        Args:
            feature_id: Feature identifier (e.g., "feat-123")
            feature_spec: Complete feature specification
        """
        print()
        print("=" * 70)
        print("Feature Coordination Plan")
        print("=" * 70)
        print()
        print(f"Feature: {feature_spec['name']}")
        print(f"ID: {feature_id}")
        print(f"Description: {feature_spec['description']}")
        print()
        
        # Decompose feature into subtasks
        tasks = feature_spec["tasks"]
        print(f"Coordinating {len(tasks)} tasks across {len(self.team)} specialists")
        print()
        
        # Step 1: Design phase
        if "design" in tasks:
            print("→ STEP 1: Design Phase")
            await self._delegate_task(
                task_id=f"{feature_id}-design",
                description=f"Design UI/UX for: {feature_spec['name']}",
                specialist=self.team["design"],
                files=["design/wireframes/*", "design/prototypes/*"],
                priority="high",
                dependencies=[]
            )
            print()
            # Wait for design completion before proceeding
            print("⏳ Waiting for design completion...")
            await asyncio.sleep(1)
        
        # Step 2: Backend development
        if "backend" in tasks:
            print("→ STEP 2: Backend Development")
            backend_deps = [f"{feature_id}-design"] if "design" in tasks else []
            await self._delegate_task(
                task_id=f"{feature_id}-backend",
                description=f"Implement backend API for: {feature_spec['name']}",
                specialist=self.team["backend"],
                files=["src/api/**/*.py", "src/models/**/*.py"],
                priority="high",
                dependencies=backend_deps
            )
            print()
        
        # Step 3: Frontend development (can start after backend API is defined)
        if "frontend" in tasks:
            print("→ STEP 3: Frontend Development")
            frontend_deps = [f"{feature_id}-backend"] if "backend" in tasks else []
            await self._delegate_task(
                task_id=f"{feature_id}-frontend",
                description=f"Implement frontend UI for: {feature_spec['name']}",
                specialist=self.team["frontend"],
                files=["src/frontend/**/*"],
                priority="high",
                dependencies=frontend_deps
            )
            print()
        
        # Step 4: QA and testing (can run in parallel with development)
        if "qa" in tasks:
            print("→ STEP 4: QA and Testing")
            qa_deps = [f"{feature_id}-backend", f"{feature_id}-frontend"]
            await self._delegate_task(
                task_id=f"{feature_id}-qa",
                description=f"Test and validate: {feature_spec['name']}",
                specialist=self.team["qa"],
                files=["tests/**/*", "test-results/**/*"],
                priority="normal",
                dependencies=qa_deps
            )
            print()
        
        print("=" * 70)
        print("All tasks delegated! Team is now working in parallel.")
        print("Use fetch_inbox() to monitor progress and receive completion reports.")
        print("=" * 70)
    
    async def _delegate_task(self, task_id, description, specialist, files, priority,
                           dependencies):
        """Delegate a single task to a specialist."""
        print(f"Task: {task_id}")
        print(f"  Assigned to: {specialist}")
        print(f"  Files: {', '.join(files[:3])}{'...' if len(files) > 3 else ''}")
        print(f"  Priority: {priority}")
        print(f"  Dependencies: {', '.join(dependencies) if dependencies else 'None'}")
        
        message_content = {
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sender_id": self.agent_name,
            "message_id": f"msg-{task_id}",
            "type": "task_assignment",
            "task_id": task_id,
            "description": description,
            "file_patterns": files,
            "priority": priority,
            "dependencies": dependencies
        }
        
        result = await send_message(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            sender_name=self.agent_name,
            recipient_name=specialist,
            content=message_content,
            importance=priority
        )
        
        if result.get("success"):
            print(f"  ✓ Delegated")
        else:
            print(f"  ✗ Failed: {result.get('error')}")
    
    async def monitor_progress(self, duration_seconds=30):
        """
        Monitor team progress for a duration.
        
        Args:
            duration_seconds: How long to monitor (default: 30s)
        """
        print()
        print("=" * 70)
        print("Monitoring Team Progress")
        print("=" * 70)
        print(f"Duration: {duration_seconds} seconds")
        print()
        
        start_time = asyncio.get_event_loop().time()
        
        while (asyncio.get_event_loop().time() - start_time) < duration_seconds:
            await self._check_team_updates()
            await asyncio.sleep(5)
        
        print()
        print("Monitoring complete!")
    
    async def _check_team_updates(self):
        """Check inbox for updates from the team."""
        result = await fetch_inbox(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            limit=20,
            acknowledged_only=False
        )
        
        if not result.get("success"):
            return
        
        messages = result["response"].get("messages", [])
        
        if not messages:
            return
        
        print(f"📥 New updates ({len(messages)} message(s)):")
        
        for msg in messages:
            await self._process_team_update(msg)
    
    async def _process_team_update(self, msg):
        """Process an update from a team member."""
        subject = msg.get("subject", "")
        sender = msg.get("from", "")
        content = msg.get("content", "")
        
        # Simple classification based on content
        if "completed" in content.lower():
            status = "✅ COMPLETED"
        elif "progress" in content.lower():
            status = "📊 IN PROGRESS"
        elif "blocked" in content.lower() or "need help" in content.lower():
            status = "🚨 NEEDS ATTENTION"
        else:
            status = "💬 UPDATE"
        
        print(f"\n  [{status}] {sender}")
        print(f"    Subject: {subject}")
        print(f"    Time: {msg['created_ts'][:19]}")
        
        # Acknowledge the update
        await acknowledge_message(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            message_id=msg["id"]
        )
        print(f"    ✓ Acknowledged")


# Example usage
async def main():
    print("\n" + "=" * 70)
    print("Multi-Agent Coordination Demo")
    print("=" * 70)
    print()
    
    class MockMCPClient:
        async def call_tool(self, name, arguments):
            tool_name = arguments.get("tool_name", name)
            print(f"   [MCP Call: {tool_name}]")
            
            if tool_name == "ensure_project":
                return {
                    "result": {
                        "slug": "user-auth-feature",
                        "human_key": "/Users/buddhi/projects/auth-feature",
                        "created_at": "2025-12-26T10:00:00Z"
                    }
                }
            
            return {"result": {"success": True}}
    
    mcp_client = MockMCPClient()
    coordinator = TeamOrchestrator(mcp_client)
    
    # Setup project and register team
    project_name = "/Users/buddhi/projects/auth-feature"
    await coordinator.setup_project(project_name)
    await coordinator.register_team()
    
    # Define feature specification
    feature_spec = {
        "name": "User Authentication with Social Login",
        "description": "Add OAuth login with GitHub and Google",
        "tasks": {
            "design": True,
            "backend": True,
            "frontend": True,
            "qa": True
        }
    }
    
    # Coordinate feature development
    await coordinator.coordinate_feature(
        feature_id="feat-auth-001",
        feature_spec=feature_spec
    )
    
    # Monitor progress for a few seconds
    await coordinator.monitor_progress(duration_seconds=5)
    
    print()
    print("=" * 70)
    print("\n💡 Key Takeaways:")
    print("   • Complex features require coordination across multiple specialists")
    print("   • Dependencies determine the order of task execution")
    print("   • Some tasks can run in parallel (backend and design)")
    print("   • Monitoring progress helps identify blockers early")
    print()


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Running the Examples

### Prerequisites

1. **MCP Agent Mail Server Running:**
   ```bash
   cd /Users/buddhi/.config/opencode/mcp_agent_mail
   source .venv/bin/activate
   uv run python -m mcp_agent_mail.http --host 127.0.0.1 --port 8765
   ```

2. **Configuration in mcp.json:**
   ```json
   {
     "mcpServers": {
       "mcp_agent_mail": {
         "type": "http",
         "url": "http://127.0.0.1:8765/mcp",
         "disabled": false
       }
     }
   }
   ```

### Run All Examples

```bash
cd /Users/buddhi/.config/opencode

# Run orchestrator delegation example
python3 docs/integrations/mcp-agent-mail/examples/orchestrator.py

# Run specialist inbox processor
python3 docs/integrations/mcp-agent-mail/examples/specialist.py

# Run MCP vs fallback comparison
python3 docs/integrations/mcp-agent-mail/examples/mcp_vs_fallback.py

# Run file reservation workflow
python3 docs/integrations/mcp-agent-mail/examples/file_reservation_workflow.py

# Run multi-agent coordination
python3 docs/integrations/mcp-agent-mail/examples/multi_agent_coordination.py
```

### Integration with Factory Droids

To use these patterns in your Factory droids:

```python
# In your droid implementation:
from docs.integrations.mcp_agent_mail.examples import Orchestrator

async def your_droid(mcp_client):
    orchestrator = Orchestrator(mcp_client)
    await orchestrator.initialize()
    await orchestrator.delegate_task(...)
```

---

## Troubleshooting

### "MCP Agent Mail unavailable"

- Check if server is running: `lsof -i :8765`
- Start server: See [Auto-Start Guide](./AUTO_START.md)
- Verify mcp.json configuration

### "Agent registration failed"

- Check project key exists: `ensure_project` must be called first
- Verify agent name format (adjective-noun like "BlueLake")
- Check server logs for errors

### "Reservation conflicts"

- Coordinate with teammates before editing shared files
- Use `exclusive=False` for advisory reservations
- Check current reservations: `resource://file_reservations/{project}`
- Contact holder via `whois` to coordinate

For more help, see [Integration Guide](./INTEGRATION_GUIDE.md) or [README.md](./README.md).
