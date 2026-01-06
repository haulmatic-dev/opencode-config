#!/usr/bin/env python3
"""
MCP Agent Mail Client Helper for Factory Droids

Provides helper functions for droids to:
- Register as an agent
- Send messages to other agents
- Fetch inbox and process messages
- Acknowledge message receipt
- Reserve/release file paths

**IMPORTANT:** MCP Agent Mail responses are wrapped in `structuredContent`.
This module automatically extracts that wrapper for you.
"""

import json
import os
from typing import Dict, Any, List, Optional
import asyncio

# Factory droid will have access to MCP client via context
# This module provides a higher-level interface


def _extract_structured_content(response: Dict[str, Any]) -> Any:
    """
    Extract structuredContent from MCP Agent Mail response.

    MCP Agent Mail has TWO response formats:
    1. Direct method calls (e.g., register_agent, whois):
       { "result": {...actual result...}, "isError": false }
       
    2. tools/call wrapper:
       { "result": {
           "content": [{"type": "text", "text": "..."}],
           "isError": false
         }
       }
       
    For format 1, structuredContent is directly in result.
    For format 2, the actual result is inside content[0].text as JSON.

    This helper extracts the actual result from either format.

    Args:
        response: The raw MCP Agent Mail response

    Returns:
        The extracted structuredContent or the actual result
    """
    # Check for error in content array
    if "content" in response and len(response.get("content", [])) > 0:
        first_content = response["content"][0]
        if first_content.get("type") == "text":
            text = first_content.get("text", "")
            # Check for error messages
            if "Error" in text or "not found" in text.lower():
                raise Exception(text)

    # Case 1: structuredContent directly available (format 1)
    if "structuredContent" in response:
        return response["structuredContent"]

    # Case 2: result is the actual data (format 1)
    # Check if it looks like a structured response, not just {content, isError}
    if "result" in response and "content" not in response:
        # This is format 1 with actual result
        return response["result"]

    # Case 3: tools/call format - extract from content[0].text
    if "result" in response and "content" in response:
        content_list = response.get("content", [])
        if len(content_list) > 0 and content_list[0].get("type") == "text":
            try:
                # Parse the JSON string from content[0].text
                import json
                actual_result = json.loads(content_list[0].get("text", "{}"))
                return actual_result
            except json.JSONDecodeError:
                # Not JSON, return content as-is
                return response

    # Return original response if no structuredContent
    return response


async def register_agent(
    mcp_client: Any,
    project_key: str,
    agent_name: Optional[str],
    model: str,
    task_description: str = ""
) -> Dict[str, Any]:
    """
    Register this droid with MCP Agent Mail.

    Args:
        mcp_client: The MCP client available in droid context
        project_key: Git repository slug or working directory
        agent_name: Optional name of this droid (e.g., "orchestrator", "codebase-researcher")
                   IMPORTANT: If omitted, server auto-generates adjective+noun name
        model: Model being used
        task_description: Optional description of agent's purpose

    Returns:
        Agent registration response with actual name used

    Note:
        Agent names MUST follow adjective+noun format (e.g., PurpleCat, BlueLake).
        If you don't provide agent_name, server will auto-generate a valid name.
    """
    try:
        params = {
            "project_key": project_key,
            "program": "factory-droid",
            "model": model,
            "task_description": task_description
        }
        # Only include name if provided (let server auto-generate if not)
        if agent_name:
            params["name"] = agent_name

        response = await mcp_client.call_tool(
            "call_tool",
            {
                "tool_name": "register_agent",
                "arguments": params
            }
        )

        # Extract structuredContent
        result = _extract_structured_content(response)

        return {"success": True, "response": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def send_message(
    mcp_client: Any,
    project_key: str,
    sender_name: str,
    recipient_name: str,
    content: Dict[str, Any],
    importance: str = "normal"
) -> Dict[str, Any]:
    """
    Send a message to another agent via MCP Agent Mail.

    Args:
        mcp_client: The MCP client available in droid context
        project_key: Project key
        sender_name: Name of sending agent
        recipient_name: Name of receiving agent
        content: Message payload (supports nested dicts)
        importance: "normal" | "high" | "low"

    Returns:
        Message send response
    """
    try:
        response = await mcp_client.call_tool(
            "call_tool",
            {
                "tool_name": "send_message",
                "arguments": {
                    "project_key": project_key,
                    "sender_name": sender_name,
                    "to": [recipient_name],
                    "subject": content.get("subject", ""),
                    "body_md": json.dumps(content) if "type" in content else str(content),
                    "importance": importance
                }
            }
        )
        result = _extract_structured_content(response)
        return {"success": True, "response": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_inbox(
    mcp_client: Any,
    project_key: str,
    agent_name: str,
    limit: int = 50,
    acknowledged_only: bool = False
) -> Dict[str, Any]:
    """
    Fetch messages from this agent's inbox.

    Args:
        mcp_client: The MCP client available in droid context
        project_key: Project key
        agent_name: Name of this droid
        limit: Maximum number of messages to fetch
        acknowledged_only: Only fetch unacknowledged messages

    Returns:
        Inbox with messages list
    """
    try:
        response = await mcp_client.call_tool(
            "call_tool",
            {
                "tool_name": "fetch_inbox",
                "arguments": {
                    "project_key": project_key,
                    "agent_name": agent_name,
                    "limit": limit,
                    "acknowledged_only": acknowledged_only
                }
            }
        )
        result = _extract_structured_content(response)
        return {"success": True, "response": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def acknowledge_message(
    mcp_client: Any,
    project_key: str,
    agent_name: str,
    message_id: str
) -> Dict[str, Any]:
    """
    Acknowledge receipt of a message.

    Args:
        mcp_client: The MCP client available in droid context
        project_key: Project key
        agent_name: Name of this droid
        message_id: ID of message to acknowledge

    Returns:
        Acknowledgment response
    """
    try:
        response = await mcp_client.call_tool(
            "call_tool",
            {
                "tool_name": "acknowledge_message",
                "arguments": {
                    "project_key": project_key,
                    "agent_name": agent_name,
                    "message_id": message_id
                }
            }
        )
        result = _extract_structured_content(response)
        return {"success": True, "response": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def reserve_file_paths(
    mcp_client: Any,
    project_key: str,
    agent_name: str,
    paths: List[str],
    ttl_seconds: int = 3600,
    exclusive: bool = False
) -> Dict[str, Any]:
    """
    Reserve file paths to prevent concurrent edits.

    Args:
        mcp_client: The MCP client available in droid context
        project_key: Project key
        agent_name: Name of this droid
        paths: Glob patterns of files to reserve
        ttl_seconds: Time-to-live for reservation
        exclusive: Whether reservation is exclusive (no other agent can reserve)

    Returns:
        Reservation response with expiry time
    """
    try:
        response = await mcp_client.call_tool(
            "call_tool",
            {
                "tool_name": "reserve_file_paths",
                "arguments": {
                    "project_key": project_key,
                    "agent_name": agent_name,
                    "paths": paths,
                    "ttl_seconds": ttl_seconds,
                    "exclusive": exclusive
                }
            }
        )
        result = _extract_structured_content(response)
        return {"success": True, "response": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def release_file_reservations(
    mcp_client: Any,
    project_key: str,
    agent_name: str
) -> Dict[str, Any]:
    """
    Release all file reservations for this agent.

    Args:
        mcp_client: The MCP client available in droid context
        project_key: Project key
        agent_name: Name of this droid

    Returns:
        Release response
    """
    try:
        response = await mcp_client.call_tool(
            "call_tool",
            {
                "tool_name": "release_file_reservations",
                "arguments": {
                    "project_key": project_key,
                    "agent_name": agent_name
                }
            }
        )
        result = _extract_structured_content(response)
        return {"success": True, "response": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_project_key() -> str:
    """
    Get the project key for the current session.
    
    Returns:
        Git repository slug or current directory as fallback
    """
    try:
        # Try to get git repository slug
        import subprocess
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True
        )
        if result.returncode == 0:
            repo_path = result.stdout.strip()
            # Convert to human_key format
            return repo_path
    except Exception:
        # Fallback to current directory
        import os
        return os.getcwd()


def is_mcp_available() -> bool:
    """
    Check if MCP Agent Mail is available.

    **NOTE:** This function is deprecated. MCP Agent Mail is now REQUIRED for all orchestrator operations.

    Returns:
        True if MCP Agent Mail client can be imported
    """
    try:
        # Try to find the MCP Agent Mail module in the local directory
        import importlib.util
        import sys
        import os

        # Add the mcp_agent_mail src to path if not already there
        mcp_path = "/Users/buddhi/.config/opencode/mcp_agent_mail/src"
        if mcp_path not in sys.path:
            sys.path.insert(0, mcp_path)

        # Try to import mcp module (for MCP protocol)
        spec = importlib.util.find_spec('mcp')
        if spec is None:
            # Fallback: check if we can import mcp_agent_mail
            spec = importlib.util.find_spec('mcp_agent_mail')

        return spec is not None
    except Exception:
        return False


# Usage examples:
if __name__ == "__main__":
    # Get project key
    project_key = get_project_key()
    print(f"Project key: {project_key}")

    # Example usage
    print("\nExample: Register as agent")
    print("  register_agent(mcp_client, project_key, 'orchestrator', 'gpt-4', 'Orchestrator for task delegation')")

    print("\nExample: Send message")
    print("  send_message(mcp_client, project_key, 'orchestrator', 'frontend-dev', {'task': 'Implement feature'})")
