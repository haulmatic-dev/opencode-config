#!/usr/bin/env python3
"""
MCP Agent Mail Client Helper for OpenCode Agents

Provides HTTP-based helper functions for opencode agents to communicate with MCP Agent Mail server.

Usage in opencode agents:
    from mcp_agent_mail_client import (
        register_agent,
        send_message,
        fetch_inbox,
        acknowledge_message,
        reserve_file_paths,
        release_file_reservations,
        get_project_key
    )

# Register agent
result = await register_agent(
    agent_name="my-agent",
    model="claude-sonnet-4-5",
    task_description="What this agent does"
)

# Send message
result = await send_message(
    sender_name="my-agent",
    recipient_name="other-agent",
    content={"type": "task_assignment", ...}
)
"""

import json
import os
import requests
from typing import Dict, Any, Optional
from pathlib import Path


# MCP Agent Mail server configuration
MCP_AGENT_MAIL_HOST = "127.0.0.1"
MCP_AGENT_MAIL_PORT = 8765
MCP_BASE_URL = f"http://{MCP_AGENT_MAIL_HOST}:{MCP_AGENT_MAIL_PORT}"


def get_project_key() -> str:
    """
    Get project key for current directory.

    Returns git repo slug or current working directory.
    """
    try:
        import subprocess
        # Try to get git remote URL
        result = subprocess.run(
            ["git", "config", "--get", "remote.origin.url"],
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        if result.returncode == 0:
            git_url = result.stdout.strip()
            # Extract repo slug from URL
            # Example: https://github.com/user/repo.git -> user/repo
            repo_slug = git_url.split("/")[-2:]
            return f"{repo_slug[0]}/{repo_slug[1]}".replace(".git", "")
    except Exception:
        pass

    # Fallback to current directory name
    return Path(os.getcwd()).name


async def register_agent(
    agent_name: str,
    model: str = "unknown",
    task_description: str = "",
    mcp_client: Any = None
) -> Dict[str, Any]:
    """
    Register an agent with MCP Agent Mail.

    Args:
        agent_name: Name of the agent (e.g., "prd", "generate-tasks")
        model: Model name (optional, for tracking)
        task_description: What this agent does
        mcp_client: Ignored (for compatibility with Factory client)

    Returns:
        {"success": bool, "response": {...}, "error": str}
    """
    project_key = get_project_key()

    try:
        response = requests.post(
            f"{MCP_BASE_URL}/api/v1/agents/register",
            json={
                "agent_name": agent_name,
                "project_key": project_key,
                "model": model,
                "task_description": task_description
            },
            timeout=10
        )

        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            return {
                "success": True,
                "response": result.get("response", {}),
                "error": None
            }
        else:
            return {
                "success": False,
                "response": None,
                "error": result.get("error", "Unknown error")
            }
    except Exception as e:
        return {
            "success": False,
            "response": None,
            "error": str(e)
        }


async def send_message(
    sender_name: str,
    recipient_name: str,
    content: Dict[str, Any],
    mcp_client: Any = None,
    importance: str = "normal"
) -> Dict[str, Any]:
    """
    Send a message to another agent.

    Args:
        sender_name: Name of the sending agent
        recipient_name: Name of the recipient agent
        content: Message content (dict)
        mcp_client: Ignored (for compatibility)
        importance: Message importance ("low", "normal", "high", "critical")

    Returns:
        {"success": bool, "response": {...}, "error": str}
    """
    project_key = get_project_key()

    try:
        response = requests.post(
            f"{MCP_BASE_URL}/api/v1/messages/send",
            json={
                "project_key": project_key,
                "sender_name": sender_name,
                "recipient_name": recipient_name,
                "content": content,
                "importance": importance
            },
            timeout=10
        )

        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            return {
                "success": True,
                "response": result.get("response", {}),
                "error": None
            }
        else:
            return {
                "success": False,
                "response": None,
                "error": result.get("error", "Unknown error")
            }
    except Exception as e:
        return {
            "success": False,
            "response": None,
            "error": str(e)
        }


async def fetch_inbox(
    agent_name: str,
    limit: int = 50,
    mcp_client: Any = None
) -> Dict[str, Any]:
    """
    Fetch messages from agent's inbox.

    Args:
        agent_name: Name of the agent
        limit: Maximum number of messages to fetch
        mcp_client: Ignored (for compatibility)

    Returns:
        {"success": bool, "response": {"messages": [...]}, "error": str}
    """
    project_key = get_project_key()

    try:
        response = requests.get(
            f"{MCP_BASE_URL}/api/v1/messages/inbox",
            params={
                "project_key": project_key,
                "agent_name": agent_name,
                "limit": limit
            },
            timeout=10
        )

        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            return {
                "success": True,
                "response": result.get("response", {}),
                "error": None
            }
        else:
            return {
                "success": False,
                "response": None,
                "error": result.get("error", "Unknown error")
            }
    except Exception as e:
        return {
            "success": False,
            "response": None,
            "error": str(e)
        }


async def acknowledge_message(
    agent_name: str,
    message_id: str,
    mcp_client: Any = None
) -> Dict[str, Any]:
    """
    Mark a message as processed (acknowledged).

    Args:
        agent_name: Name of the agent
        message_id: ID of the message to acknowledge
        mcp_client: Ignored (for compatibility)

    Returns:
        {"success": bool, "response": {...}, "error": str}
    """
    project_key = get_project_key()

    try:
        response = requests.post(
            f"{MCP_BASE_URL}/api/v1/messages/acknowledge",
            json={
                "project_key": project_key,
                "agent_name": agent_name,
                "message_id": message_id
            },
            timeout=10
        )

        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            return {
                "success": True,
                "response": result.get("response", {}),
                "error": None
            }
        else:
            return {
                "success": False,
                "response": None,
                "error": result.get("error", "Unknown error")
            }
    except Exception as e:
        return {
            "success": False,
            "response": None,
            "error": str(e)
        }


async def reserve_file_paths(
    agent_name: str,
    paths: list,
    ttl_seconds: int = 3600,
    exclusive: bool = False,
    mcp_client: Any = None
) -> Dict[str, Any]:
    """
    Reserve file paths to prevent conflicts.

    Args:
        agent_name: Name of the agent
        paths: List of file path patterns (e.g., ["src/**/*.ts"])
        ttl_seconds: Time-to-live for reservation (default: 1 hour)
        exclusive: Whether reservation is exclusive
        mcp_client: Ignored (for compatibility)

    Returns:
        {"success": bool, "response": {...}, "error": str}
    """
    project_key = get_project_key()

    try:
        response = requests.post(
            f"{MCP_BASE_URL}/api/v1/files/reserve",
            json={
                "project_key": project_key,
                "agent_name": agent_name,
                "paths": paths,
                "ttl_seconds": ttl_seconds,
                "exclusive": exclusive
            },
            timeout=10
        )

        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            return {
                "success": True,
                "response": result.get("response", {}),
                "error": None
            }
        else:
            return {
                "success": False,
                "response": None,
                "error": result.get("error", "Unknown error")
            }
    except Exception as e:
        return {
            "success": False,
            "response": None,
            "error": str(e)
        }


async def release_file_reservations(
    agent_name: str,
    mcp_client: Any = None
) -> Dict[str, Any]:
    """
    Release all file reservations for an agent.

    Args:
        agent_name: Name of the agent
        mcp_client: Ignored (for compatibility)

    Returns:
        {"success": bool, "response": {...}, "error": str}
    """
    project_key = get_project_key()

    try:
        response = requests.post(
            f"{MCP_BASE_URL}/api/v1/files/release",
            json={
                "project_key": project_key,
                "agent_name": agent_name
            },
            timeout=10
        )

        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            return {
                "success": True,
                "response": result.get("response", {}),
                "error": None
            }
        else:
            return {
                "success": False,
                "response": None,
                "error": result.get("error", "Unknown error")
            }
    except Exception as e:
        return {
            "success": False,
            "response": None,
            "error": str(e)
        }
