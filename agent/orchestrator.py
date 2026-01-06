#!/usr/bin/env python3
"""
Orchestrator Droid - Enhanced with MCP Agent Mail Integration

Implements orchestrator droid with MCP Agent Mail support for:
- Agent registration (MCP Agent Mail required)
- Task delegation coordination via MCP Agent Mail

**IMPORTANT:** MCP Agent Mail is REQUIRED for all orchestrator operations.
If MCP Agent Mail is unavailable, the orchestrator will fail with a clear error message.

Usage Example:
--------------
```python
import asyncio
from orchestrator import Orchestrator

async def main():
    # Initialize orchestrator (MCP Agent Mail required)
    orchestrator = Orchestrator(mcp_client=mcp_client, model="gpt-4")
    result = await orchestrator.initialize(
        task_description="Task coordination for frontend feature"
    )

    # Check registration status
    if result["mcp_registered"]:
        print(f"✓ Registered as agent: {result['agent_name']}")

    # Delegate tasks (uses MCP Agent Mail)
    delegation = await orchestrator.delegate_task(
        droid_name="frontend-specialist",
        task_id="bd-42",
        description="Implement user authentication UI",
        file_patterns=["src/frontend/**/*.ts"],
        priority=1,
        estimated_minutes=60
    )

    if delegation["success"]:
        print(f"✓ Delegated via MCP Agent Mail")

asyncio.run(main())
```

Requirements:
-------------
- Python 3.10+ (required for MCP Agent Mail)
- MCP Agent Mail server running
- MCP client configured in droid context

Features:
---------
- Agent-to-agent messaging via send_message()
- Inbox polling for task completions
- File reservations for concurrent editing
"""

import sys
import os
import asyncio
from typing import Dict, Any, Optional, List

# Add droids path for imports
sys.path.insert(0, os.path.dirname(__file__))

from mcp_agent_mail_client import (
    register_agent,
    get_project_key
)


class Orchestrator:
    """
    Orchestrator droid with MCP Agent Mail integration

    **IMPORTANT:** MCP Agent Mail is REQUIRED. The orchestrator will not function
    without MCP Agent Mail availability.
    """

    def __init__(self, mcp_client=None, model: str = "unknown"):
        """
        Initialize orchestrator

        Args:
            mcp_client: MCP client (available in droid context, REQUIRED)
            model: Model name being used

        Raises:
            ValueError: If mcp_client is None
        """
        if mcp_client is None:
            raise ValueError("MCP client is required for Orchestrator. "
                           "MCP Agent Mail must be configured and running.")

        self.mcp_client = mcp_client
        self.model = model
        self.project_key = None
        self.agent_name = "orchestrator"
        self.registration_result = None

    async def initialize(self, task_description: str = "") -> Dict[str, Any]:
        """
        Initialize orchestrator session

        MCP Agent Mail is required. If registration fails, initialization fails.

        Args:
            task_description: Optional description for agent registration

        Returns:
            Initialization result with registration status

        Raises:
            RuntimeError: If Python version is insufficient, MCP is unavailable, or registration fails
        """
        result = {
            "success": False,
            "mcp_registered": False,
            "error": None
        }

        # Check Python version (need 3.10+ for MCP Agent Mail)
        python_version = sys.version_info
        if python_version < (3, 10):
            error_msg = f"Python 3.10+ required for MCP Agent Mail (current: {python_version.major}.{python_version.minor})"
            print(f"❌ {error_msg}")
            print("   Orchestrator requires MCP Agent Mail. Please upgrade Python.")
            result["error"] = error_msg
            raise RuntimeError(error_msg)

        # Get project key
        try:
            self.project_key = get_project_key()
            print(f"✓ Project key: {self.project_key}")
        except Exception as e:
            error_msg = f"Error getting project key: {str(e)}"
            print(f"❌ {error_msg}")
            result["error"] = error_msg
            raise RuntimeError(error_msg)

        # Register orchestrator as MCP agent (REQUIRED)
        print("🔧 Orchestrator: Registering with MCP Agent Mail...")
        try:
            registration_result = await register_agent(
                self.mcp_client,
                project_key=self.project_key,
                agent_name=self.agent_name,
                model=self.model,
                task_description=task_description or "Task coordination and delegation to specialist droids"
            )

            if registration_result.get("success"):
                self.registration_result = registration_result.get("response")
                agent_id = self.registration_result.get("id", "unknown")
                actual_name = self.registration_result.get("name", self.agent_name)

                print(f"✓ Registered with MCP Agent Mail")
                print(f"  Agent ID: {agent_id}")
                print(f"  Agent Name: {actual_name}")
                print(f"  Model: {self.model}")
                print("  → Using MCP for agent-to-agent coordination")

                result["mcp_registered"] = True
                result["agent_id"] = agent_id
                result["agent_name"] = actual_name
                result["success"] = True
                return result
            else:
                error_msg = registration_result.get("error", "Unknown error")
                print(f"❌ MCP Agent Mail registration failed: {error_msg}")
                print("   Orchestrator requires MCP Agent Mail to function.")
                result["error"] = error_msg
                raise RuntimeError(f"MCP Agent Mail registration failed: {error_msg}")

        except Exception as e:
            error_msg = f"MCP Agent Mail error: {str(e)}"
            print(f"❌ {error_msg}")
            print("   Orchestrator requires MCP Agent Mail to function.")
            result["error"] = error_msg
            raise RuntimeError(error_msg)

    async def delegate_task(
        self,
        droid_name: str,
        task_id: str,
        description: str,
        file_patterns: List[str] = None,
        priority: int = 2,
        dependencies: List[str] = None,
        estimated_minutes: int = 60,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Delegate a task to a specialist droid via MCP Agent Mail

        MCP Agent Mail is required for delegation.

        Args:
            droid_name: Name of droid to delegate to
            task_id: bd task ID
            description: Task description
            file_patterns: Glob patterns for files to modify
            priority: Task priority (0=urgent, 1=high, 2=normal, 3=low)
            dependencies: List of dependent task IDs
            estimated_minutes: Estimated time to complete
            metadata: Additional metadata (labels, component, etc.)

        Returns:
            Delegation result with success status and message ID

        Raises:
            RuntimeError: If delegation fails
        """
        result = {
            "success": False,
            "task_id": task_id,
            "droid_name": droid_name,
            "error": None
        }

        print(f"📤 Orchestrator: Delegating task {task_id} to {droid_name}...")

        # Use MCP Agent Mail for coordination (REQUIRED)
        try:
            from mcp_agent_mail_client import send_message

            # Prepare task assignment message content
            message_content = {
                "type": "task_assignment",
                "task_id": task_id,
                "description": description,
                "file_patterns": file_patterns or [],
                "priority": "high" if priority <= 1 else "normal",
                "priority_value": priority,
                "estimated_duration_minutes": estimated_minutes,
                "dependencies": dependencies or []
            }

            # Add metadata if provided
            if metadata:
                message_content["metadata"] = metadata

            # Send message via MCP Agent Mail
            send_result = await send_message(
                self.mcp_client,
                project_key=self.project_key,
                sender_name=self.agent_name,
                recipient_name=droid_name,
                content=message_content,
                importance="high" if priority <= 1 else "normal"
            )

            if send_result.get("success"):
                response = send_result.get("response", {})
                message_id = response.get("message_id", "unknown")

                print(f"✓ Delegated via MCP Agent Mail")
                print(f"  Message ID: {message_id}")
                print(f"  → Agent {droid_name} will receive task assignment")

                result["success"] = True
                result["message_id"] = message_id
                return result
            else:
                error = send_result.get("error", "Unknown error")
                error_msg = f"MCP Agent Mail delegation failed: {error}"
                print(f"❌ {error_msg}")
                result["error"] = error_msg
                raise RuntimeError(error_msg)

        except Exception as e:
            error_msg = f"MCP Agent Mail delegation error: {str(e)}"
            print(f"❌ {error_msg}")
            result["error"] = error_msg
            raise RuntimeError(error_msg)

    def get_status(self) -> Dict[str, Any]:
        """
        Get current orchestrator status

        Returns:
            Status dict with MCP availability and registration info
        """
        return {
            "mcp_available": True,
            "agent_name": self.agent_name,
            "project_key": self.project_key,
            "model": self.model,
            "registration": self.registration_result
        }


# Convenience function for backward compatibility
async def initialize_orchestrator(
    mcp_client,
    model: str = "unknown",
    task_description: str = ""
) -> Dict[str, Any]:
    """
    Initialize orchestrator with MCP Agent Mail integration

    Args:
        mcp_client: MCP client (REQUIRED)
        model: Model name
        task_description: Optional task description for registration

    Returns:
        Initialization result

    Raises:
        ValueError: If mcp_client is None
    """
    orchestrator = Orchestrator(mcp_client=mcp_client, model=model)
    return await orchestrator.initialize(task_description=task_description)


# Example usage (for testing)
if __name__ == "__main__":
    async def test_initialization():
        print("Testing orchestrator initialization...\n")

        # Test with MCP client
        print("=== Test: Requires MCP client ===")
        try:
            orchestrator = Orchestrator(mcp_client=None, model="test-model")
            result = await orchestrator.initialize(task_description="Test initialization")
            print(f"Result: {result}\n")
        except ValueError as e:
            print(f"✓ Expected error: {e}\n")

        print("Note: Orchestrator requires MCP Agent Mail to be configured.")
        print("Please ensure MCP Agent Mail server is running and mcp_client is provided.")

    # Run test
    asyncio.run(test_initialization())
