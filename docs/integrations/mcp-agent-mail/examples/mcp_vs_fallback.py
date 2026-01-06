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
