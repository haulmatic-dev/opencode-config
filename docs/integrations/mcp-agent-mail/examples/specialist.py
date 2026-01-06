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
