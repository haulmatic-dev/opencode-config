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
# Note: MESSAGE_FORMATS is available via droids/ path already in sys.path
# from MESSAGE_FORMATS import TaskAssignment, TaskCompletion


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
