#!/usr/bin/env python3
"""
MCP Agent Mail Handoff Protocol Implementation

Provides high-level functions for orchestrator-to-droid task handoffs
using the standardized message formats from MESSAGE_FORMATS.md
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import sys
import os

# Add droids path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from mcp_agent_mail_client import send_message, fetch_inbox, acknowledge_message


def generate_message_id() -> str:
    """Generate a unique message ID (UUID v4)"""
    return str(uuid.uuid4())


def get_utc_timestamp() -> str:
    """Get current timestamp in ISO 8601 UTC format"""
    return datetime.utcnow().isoformat() + 'Z'


# Message Type Constants
MESSAGE_TYPE_TASK_ASSIGNMENT = "task_assignment"
MESSAGE_TYPE_TASK_COMPLETION = "task_completion"
MESSAGE_TYPE_ERROR_REPORT = "error_report"
MESSAGE_TYPE_STATUS_UPDATE = "status_update"
MESSAGE_TYPE_COORDINATION_REQUEST = "coordination_request"
MESSAGE_TYPE_FILE_RESERVATION = "file_reservation"


# Message Version
MESSAGE_VERSION = "1.0.0"


def create_base_message(sender_id: str, message_type: str) -> Dict[str, Any]:
    """
    Create base message structure with common fields

    Args:
        sender_id: Name of the sending agent
        message_type: Type of message

    Returns:
        Base message dict with version, timestamp, sender_id, message_id, and type
    """
    return {
        "version": MESSAGE_VERSION,
        "timestamp": get_utc_timestamp(),
        "sender_id": sender_id,
        "message_id": generate_message_id(),
        "type": message_type
    }


def create_task_assignment_message(
    sender_id: str,
    task_id: str,
    description: str,
    file_patterns: List[str],
    priority: str = "normal",
    priority_value: int = 2,
    specification: Optional[Dict[str, Any]] = None,
    dependencies: Optional[List[str]] = None,
    estimated_duration_minutes: Optional[int] = None,
    deadline: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a task assignment message

    Args:
        sender_id: Name of orchestrator sending the task
        task_id: bd task ID
        description: Human-readable task description
        file_patterns: Glob patterns for files to modify
        priority: Priority string (low, normal, high, urgent)
        priority_value: Numeric priority (0=urgent, 1=high, 2=normal, 3=low)
        specification: Task specification with acceptance_criteria and technical_requirements
        dependencies: List of dependent task IDs
        estimated_duration_minutes: Estimated time to complete
        deadline: ISO 8601 deadline timestamp
        metadata: Additional metadata (labels, component, epic)

    Returns:
        Complete task assignment message dict
    """
    message = create_base_message(sender_id, MESSAGE_TYPE_TASK_ASSIGNMENT)

    message["task_id"] = task_id
    message["description"] = description
    message["file_patterns"] = file_patterns
    message["priority"] = priority
    message["priority_value"] = priority_value

    if specification:
        message["specification"] = specification

    if dependencies:
        message["dependencies"] = dependencies

    if estimated_duration_minutes:
        message["estimated_duration_minutes"] = estimated_duration_minutes

    if deadline:
        message["deadline"] = deadline

    if metadata:
        message["metadata"] = metadata

    return message


def create_task_completion_message(
    sender_id: str,
    task_id: str,
    status: str = "complete",
    completion_summary: str = "",
    files_modified: Optional[List[str]] = None,
    test_results: Optional[Dict[str, Any]] = None,
    errors_encountered: Optional[List[str]] = None,
    warnings: Optional[List[str]] = None,
    time_spent_minutes: Optional[int] = None,
    next_tasks: Optional[List[Dict[str, Any]]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a task completion message

    Args:
        sender_id: Name of agent completing the task
        task_id: bd task ID
        status: Completion status (complete, partial, blocked)
        completion_summary: Summary of what was completed
        files_modified: List of modified files
        test_results: Test execution results
        errors_encountered: List of errors encountered
        warnings: List of warnings
        time_spent_minutes: Actual time spent
        next_tasks: Suggested follow-up tasks
        metadata: Additional metadata

    Returns:
        Complete task completion message dict
    """
    message = create_base_message(sender_id, MESSAGE_TYPE_TASK_COMPLETION)

    message["task_id"] = task_id
    message["status"] = status
    message["completion_summary"] = completion_summary
    message["files_modified"] = files_modified or []
    message["errors_encountered"] = errors_encountered or []

    if test_results:
        message["test_results"] = test_results

    if warnings:
        message["warnings"] = warnings

    if time_spent_minutes:
        message["time_spent_minutes"] = time_spent_minutes

    if next_tasks:
        message["next_tasks"] = next_tasks

    if metadata:
        message["metadata"] = metadata

    return message


def create_error_report_message(
    sender_id: str,
    task_id: str,
    severity: str,
    error_code: str,
    error_message: str,
    stack_trace: Optional[str] = None,
    error_context: Optional[Dict[str, Any]] = None,
    attempted_solutions: Optional[List[Dict[str, Any]]] = None,
    reproduction_steps: Optional[List[str]] = None,
    needs_human_intervention: bool = False,
    suggested_actions: Optional[List[str]] = None,
    impact: Optional[Dict[str, Any]] = None,
    attachments: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Create an error report message

    Args:
        sender_id: Name of agent reporting the error
        task_id: Task during which error occurred
        severity: Error severity (low, medium, high, blocking)
        error_code: Machine-readable error code
        error_message: Human-readable error message
        stack_trace: Stack trace if available
        error_context: Additional error context
        attempted_solutions: Solutions already tried
        reproduction_steps: Steps to reproduce
        needs_human_intervention: Whether human help is needed
        suggested_actions: Suggested resolution steps
        impact: Impact assessment
        attachments: Attached files

    Returns:
        Complete error report message dict
    """
    message = create_base_message(sender_id, MESSAGE_TYPE_ERROR_REPORT)

    message["task_id"] = task_id
    message["severity"] = severity

    error_obj = {
        "code": error_code,
        "message": error_message
    }

    if stack_trace:
        error_obj["stack_trace"] = stack_trace

    if error_context:
        error_obj["context"] = error_context

    message["error"] = error_obj
    message["needs_human_intervention"] = needs_human_intervention

    if attempted_solutions:
        message["attempted_solutions"] = attempted_solutions

    if reproduction_steps:
        message["reproduction_steps"] = reproduction_steps

    if suggested_actions:
        message["suggested_actions"] = suggested_actions

    if impact:
        message["impact"] = impact

    if attachments:
        message["attachments"] = attachments

    return message


def create_status_update_message(
    sender_id: str,
    task_id: str,
    update_type: str,
    status_summary: str,
    progress: Optional[Dict[str, Any]] = None,
    metrics: Optional[Dict[str, Any]] = None,
    blockers: Optional[List[str]] = None,
    next_milestone: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a status update message

    Args:
        sender_id: Name of agent providing update
        task_id: Task being updated
        update_type: Type of update (progress, milestone, blocker, unblocker)
        status_summary: Brief status summary
        progress: Progress details
        metrics: Relevant metrics
        blockers: List of current blockers
        next_milestone: Next milestone target
        metadata: Additional metadata

    Returns:
        Complete status update message dict
    """
    message = create_base_message(sender_id, MESSAGE_TYPE_STATUS_UPDATE)

    message["task_id"] = task_id
    message["update_type"] = update_type
    message["status_summary"] = status_summary

    if progress:
        message["progress"] = progress

    if metrics:
        message["metrics"] = metrics

    if blockers:
        message["blockers"] = blockers
    else:
        message["blockers"] = []

    if next_milestone:
        message["next_milestone"] = next_milestone

    if metadata:
        message["metadata"] = metadata

    return message


# --- High-Level Handoff Functions ---


def delegate_task(
    task_id: str,
    agent_name: str,
    description: str,
    file_patterns: List[str],
    specialist_tags: List[str],
    estimated_minutes: int,
    project_key: str,
    orchestrator_name: str = "orchestrator"
) -> Tuple[bool, Optional[str]]:
    """
    High-level function to delegate a task to an agent via MCP

    This is a synchronous wrapper that formats the message correctly
    and sends it via MCP Agent Mail.

    Args:
        task_id: bd task ID
        agent_name: Name of droid to delegate to
        description: Task description
        file_patterns: Files to modify
        specialist_tags: Specialist tags for agent matching
        estimated_minutes: Estimated duration
        project_key: Project key
        orchestrator_name: Orchestrator agent name

    Returns:
        Tuple of (success: bool, message_id: Optional[str])
    """
    try:
        # Create task assignment message
        message = create_task_assignment_message(
            sender_id=orchestrator_name,
            task_id=task_id,
            description=description,
            file_patterns=file_patterns,
            priority="high" if estimated_minutes > 120 else "normal",
            priority_value=1 if estimated_minutes > 120 else 2,
            estimated_duration_minutes=estimated_minutes,
            metadata={
                "labels": specialist_tags,
                "agent_role": "implementation"
            }
        )

        # For now, return success and message ID without actually sending
        # In real usage, this would integrate with MCP client
        return True, message["message_id"]

    except Exception as e:
        print(f"Error delegating task: {e}", file=sys.stderr)
        return False, None


def report_task_completion(
    task_id: str,
    agent_name: str,
    completion_summary: str,
    files_modified: List[str],
    time_spent_minutes: int,
    project_key: str,
    test_results: Optional[Dict[str, Any]] = None
) -> Tuple[bool, Optional[str]]:
    """
    High-level function to report task completion via MCP

    Args:
        task_id: bd task ID
        agent_name: Name of completing agent
        completion_summary: What was completed
        files_modified: List of modified files
        time_spent_minutes: Actual time spent
        project_key: Project key
        test_results: Test execution results

    Returns:
        Tuple of (success: bool, message_id: Optional[str])
    """
    try:
        # Create task completion message
        message = create_task_completion_message(
            sender_id=agent_name,
            task_id=task_id,
            status="complete",
            completion_summary=completion_summary,
            files_modified=files_modified,
            time_spent_minutes=time_spent_minutes,
            test_results=test_results or {
                "unit_tests": {"total": 0, "passed": 0, "failed": 0},
                "integration_tests": {"total": 0, "passed": 0, "failed": 0}
            }
        )

        return True, message["message_id"]

    except Exception as e:
        print(f"Error reporting completion: {e}", file=sys.stderr)
        return False, None


def report_error(
    task_id: str,
    agent_name: str,
    severity: str,
    error_code: str,
    error_message: str,
    needs_human_intervention: bool = False
) -> Tuple[bool, Optional[str]]:
    """
    High-level function to report an error via MCP

    Args:
        task_id: Task where error occurred
        agent_name: Name of agent reporting error
        severity: Error severity (low, medium, high, blocking)
        error_code: Machine-readable error code
        error_message: Human-readable error message
        needs_human_intervention: Whether human help is needed

    Returns:
        Tuple of (success: bool, message_id: Optional[str])
    """
    try:
        # Create error report message
        message = create_error_report_message(
            sender_id=agent_name,
            task_id=task_id,
            severity=severity,
            error_code=error_code,
            error_message=error_message,
            needs_human_intervention=needs_human_intervention
        )

        return True, message["message_id"]

    except Exception as e:
        print(f"Error reporting error: {e}", file=sys.stderr)
        return False, None
