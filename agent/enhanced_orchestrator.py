#!/usr/bin/env python3
"""
Enhanced Orchestrator - Task Routing, Agent Matching, and Handoff Coordination

Implements intelligent task routing for EXPLICIT HANDOFF workflow,
matching tasks to specialized agents based on tags and capabilities.
"""

import json
import re
from typing import Dict, List, Any, Optional, Tuple
import sys
import os

# Add droids path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from handoff_protocol import (
    create_task_assignment_message,
    create_task_completion_message,
    report_error,
    delegate_task
)


class EnhancedOrchestrator:
    """
    Enhanced orchestrator with intelligent task routing and agent matching
    """

    def __init__(self):
        """Initialize the orchestrator with agent registry"""
        self.agent_registry = {}
        self.load_agent_definitions()

    def load_agent_definitions(self):
        """Load agent definitions from AGENT_ROLES.yaml content"""
        # This would normally load from YAML file
        # For now, define programmatically
        self.agent_registry = {
            "orchestrator": {
                "specialist_tags": ["coordination", "routing", "task-management"],
                "capabilities": ["task_delegation", "agent_coordination", "conflict_resolution"],
                "description": "Main coordinator for task delegation and agent management"
            },
            "prd": {
                "specialist_tags": ["requirements", "planning", "documentation", "analysis"],
                "capabilities": ["prd_generation", "requirements_gathering", "specification"],
                "description": "Generates Product Requirements Documents and specifications"
            },
            "generate-tasks": {
                "specialist_tags": ["task-generation", "planning", "breakdown"],
                "capabilities": ["task_breakdown", "parallelization", "dependency_mapping"],
                "description": "Breaks down features into implementation tasks"
            },
            "task-coordinator": {
                "specialist_tags": ["bd", "bv", "beads", "task-tracking"],
                "capabilities": ["task_management", "dependency_tracking", "progress_monitoring"],
                "description": "Manages task creation, tracking, and coordination using beads"
            },
            "codebase-researcher": {
                "specialist_tags": ["codebase", "research", "analysis", "patterns"],
                "capabilities": ["code_analysis", "pattern_detection", "architecture_review"],
                "description": "Analyzes codebase for patterns, architecture, and technical context"
            },
            "git-history-analyzer": {
                "specialist_tags": ["git", "history", "analysis", "evolution"],
                "capabilities": ["commit_analysis", "change_tracking", "collaboration_analysis"],
                "description": "Analyzes git history for patterns and team collaboration"
            },
            "figma-design-extractor": {
                "specialist_tags": ["figma", "design", "ui", "frontend"],
                "capabilities": ["design_extraction", "token_analysis", "component_specification"],
                "description": "Extracts design tokens and specifications from Figma"
            },
            "implementation": {
                "specialist_tags": ["implementation", "coding", "development"],
                "capabilities": ["code_generation", "feature_implementation", "integration"],
                "description": "Implements features and writes code"
            },
            "testing": {
                "specialist_tags": ["testing", "validation", "quality"],
                "capabilities": ["test_generation", "validation", "verification"],
                "description": "Tests implementations and validates requirements"
            },
            "fixing": {
                "specialist_tags": ["fixing", "debugging", "repair"],
                "capabilities": ["bug_fixing", "issue_resolution", "troubleshooting"],
                "description": "Fixes bugs and resolves issues identified in testing"
            },
            "verification": {
                "specialist_tags": ["verification", "review", "approval"],
                "capabilities": ["final_review", "sign_off", "quality_assurance"],
                "description": "Verifies work is complete and ready for next phase"
            }
        }

    def parse_notes_for_handoff(self, notes: str) -> Optional[Dict[str, Any]]:
        """
        Parse EXPLICIT_HANDOFF JSON from task notes

        Args:
            notes: Task notes field that may contain EXPLICIT_HANDOFF: {...}

        Returns:
            Parsed handoff dict or None if not found
        """
        if not notes or 'EXPLICIT_HANDOFF:' not in notes:
            return None

        try:
            # Remove EXPLICIT_HANDOFF: prefix and parse JSON
            json_str = notes.replace('EXPLICIT_HANDOFF:', '').strip()
            # Remove surrounding quotes if present
            json_str = json_str.strip('"\'')

            handoff_data = json.loads(json_str)
            return handoff_data
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing EXPLICIT_HANDOFF from notes: {e}", file=sys.stderr)
            return None

    def extract_specialist_tags(self, task_data: Dict[str, Any]) -> List[str]:
        """
        Extract specialist tags from task title and description

        Args:
            task_data: Task data from bd (contains title, description, notes)

        Returns:
            List of specialist tags
        """
        tags = set()

        # Check notes for explicit tags first
        if 'notes' in task_data and task_data['notes']:
            handoff_data = self.parse_notes_for_handoff(task_data['notes'])
            if handoff_data and 'specialist_tags' in handoff_data:
                tags.update(handoff_data['specialist_tags'])

        # Auto-detect from title and description
        text = f"{task_data.get('title', '')} {task_data.get('description', '')}"
        text = text.lower()

        # Keyword to tag mapping
        keyword_map = {
            'python': ['python', 'backend', 'django', 'flask', 'fastapi'],
            'testing': ['testing', 'tests', 'pytest', 'unittest', 'validate', 'test'],
            'mcp': ['mcp', 'agent', 'mail', 'orchestrator', 'coordination'],
            'frontend': ['react', 'typescript', 'javascript', 'frontend', 'ui', 'component', 'html', 'css'],
            'database': ['database', 'sql', 'migration', 'schema', 'sqlite', 'postgres', 'mysql'],
            'documentation': ['documentation', 'docs', 'readme', 'guide', 'comment'],
            'shell': ['bash', 'shell', 'script', 'automation'],
            'validation': ['validate', 'verify', 'check', 'ensure'],
            'implementation': ['implement', 'code', 'develop', 'create', 'build'],
            'fixing': ['fix', 'repair', 'debug', 'resolve'],
            'git': ['git', 'commit', 'history', 'branch', 'merge'],
            'figma': ['figma', 'design', 'ui', 'mockup', 'prototype']
        }

        for tag, keywords in keyword_map.items():
            if any(keyword in text for keyword in keywords):
                tags.add(tag)

        # Add general tag if no specific tags found
        if not tags:
            tags.add('general')

        return list(tags)

    def match_agent_to_task(self, task_data: Dict[str, Any]) -> Optional[str]:
        """
        Match the best agent for a task based on specialist tags

        Args:
            task_data: Task data from bd

        Returns:
            Best matching agent name or None if no match found
        """
        specialist_tags = self.extract_specialist_tags(task_data)

        if not specialist_tags:
            return None

        # Score each agent based on tag overlap
        agent_scores = {}

        for agent_name, agent_info in self.agent_registry.items():
            agent_tags = set(agent_info.get('specialist_tags', []))
            task_tag_set = set(specialist_tags)

            # Calculate overlap score (Jaccard similarity)
            overlap = len(agent_tags.intersection(task_tag_set))
            total = len(agent_tags.union(task_tag_set))
            score = overlap / total if total > 0 else 0

            agent_scores[agent_name] = score

        # Find agent with highest score
        best_agent = max(agent_scores.items(), key=lambda x: x[1])

        # Only return if score is meaningful (at least 0.3)
        if best_agent[1] >= 0.3:
            return best_agent[0]

        return None

    def route_task(self, task_id: str, orchestrator_name: str = "orchestrator") -> Tuple[bool, str, Optional[str]]:
        """
        Route a task to the appropriate agent

        Args:
            task_id: bd task ID
            orchestrator_name: Orchestrator agent name

        Returns:
            Tuple of (success: bool, message: str, assigned_agent: Optional[str])
        """
        try:
            # Get task data from bd
            import subprocess
            import json

            result = subprocess.run(
                ['bd', 'show', task_id, '--json'],
                capture_output=True,
                text=True,
                check=True
            )

            task_data = json.loads(result.stdout)

            if isinstance(task_data, list) and len(task_data) > 0:
                task_data = task_data[0]

            # Extract task details
            title = task_data.get('title', 'Unknown Task')
            description = task_data.get('description', '')

            # Extract specialist tags
            specialist_tags = self.extract_specialist_tags(task_data)

            # Match to agent
            assigned_agent = self.match_agent_to_task(task_data)

            if not assigned_agent:
                return False, f"No suitable agent found for task {task_id}", None

            # Get agent info
            agent_info = self.agent_registry.get(assigned_agent, {})

            # Create task assignment message
            message = create_task_assignment_message(
                sender_id=orchestrator_name,
                task_id=task_id,
                description=description,
                file_patterns=["**/*"],  # General pattern, could be refined
                priority="high",
                priority_value=1,
                metadata={
                    "labels": specialist_tags,
                    "assigned_agent": assigned_agent,
                    "agent_capabilities": agent_info.get('capabilities', [])
                }
            )

            # Note: In real usage, this would send via MCP
            # For now, just prepare the message

            success_msg = f"Task {task_id} routed to {assigned_agent}"
            return True, success_msg, assigned_agent

        except Exception as e:
            error_msg = f"Error routing task {task_id}: {e}"
            return False, error_msg, None

    def route_batch(self, task_ids: List[str]) -> Dict[str, Any]:
        """
        Route multiple tasks and return routing report

        Args:
            task_ids: List of bd task IDs

        Returns:
            Routing report with success/failure details
        """
        report = {
            "total_tasks": len(task_ids),
            "successful_routes": 0,
            "failed_routes": 0,
            "assignments": {},
            "errors": []
        }

        for task_id in task_ids:
            success, message, assigned_agent = self.route_task(task_id)

            if success:
                report["successful_routes"] += 1
                report["assignments"][task_id] = assigned_agent
            else:
                report["failed_routes"] += 1
                report["errors"].append({
                    "task_id": task_id,
                    "error": message
                })

        return report

    def get_routing_suggestion(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get routing suggestion for a task without actually routing it

        Args:
            task_data: Task data

        Returns:
            Suggestion with agent match and confidence score
        """
        specialist_tags = self.extract_specialist_tags(task_data)
        assigned_agent = self.match_agent_to_task(task_data)

        if assigned_agent:
            agent_info = self.agent_registry.get(assigned_agent, {})
            agent_tags = set(agent_info.get('specialist_tags', []))
            task_tag_set = set(specialist_tags)

            overlap = len(agent_tags.intersection(task_tag_set))
            total = len(agent_tags.union(task_tag_set))
            confidence = (overlap / total * 100) if total > 0 else 0

            return {
                "suggested_agent": assigned_agent,
                "confidence": round(confidence, 1),
                "reason": f"Matched on tags: {', '.join(agent_tags.intersection(task_tag_set))}",
                "specialist_tags": specialist_tags
            }

        return {
            "suggested_agent": None,
            "confidence": 0,
            "reason": "No suitable agent found",
            "specialist_tags": specialist_tags
        }


# --- Test and Demo Functions ---

def test_routing():
    """Test the routing logic with sample tasks"""
    print("=" * 60)
    print("Enhanced Orchestrator - Routing Logic Test")
    print("=" * 60)
    print()

    orchestrator = EnhancedOrchestrator()

    # Test 1: Parse notes for handoff
    print("Test 1: Parse EXPLICIT_HANDOFF from notes")
    sample_notes = 'EXPLICIT_HANDOFF: {"agent_role":"testing","specialist_tags":["testing","python","validation"]}'
    handoff = orchestrator.parse_notes_for_handoff(sample_notes)
    print(f"  ✓ Parsed: {handoff}")
    assert handoff is not None
    assert handoff['agent_role'] == 'testing'
    print()

    # Test 2: Extract specialist tags
    print("Test 2: Auto-detect specialist tags")
    task_data = {
        "title": "Implement user authentication API",
        "description": "Create Django backend endpoint with JWT tokens",
        "notes": ""
    }
    tags = orchestrator.extract_specialist_tags(task_data)
    print(f"  ✓ Detected tags: {tags}")
    assert 'python' in tags or 'backend' in tags or 'implementation' in tags
    print()

    # Test 3: Match agent to task
    print("Test 3: Agent matching")
    task_data = {
        "title": "Test authentication API endpoint",
        "description": "Write pytest tests for JWT token endpoint",
        "notes": 'EXPLICIT_HANDOFF: {"agent_role":"testing"}'
    }
    matched_agent = orchestrator.match_agent_to_task(task_data)
    print(f"  ✓ Matched agent: {matched_agent}")
    assert matched_agent is not None
    print()

    # Test 4: Get routing suggestion
    print("Test 4: Routing suggestion")
    suggestion = orchestrator.get_routing_suggestion(task_data)
    print(f"  ✓ Suggestion: {json.dumps(suggestion, indent=2)}")
    assert suggestion['suggested_agent'] is not None
    assert suggestion['confidence'] > 0
    print()

    print("=" * 60)
    print("✅ All routing tests passed!")
    print("=" * 60)


if __name__ == "__main__":
    test_routing()
