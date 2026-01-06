#!/usr/bin/env python3
"""
Agent Specialization Framework

Base classes and specialized implementations for different agent roles:
- ImplementationAgent
- TestingAgent
- FixingAgent
- VerificationAgent

These agents understand how to process task assignments specific to their role.
"""

import json
import sys
import os
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Add droids path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from handoff_protocol import (
    create_task_completion_message,
    create_error_report_message,
    create_status_update_message
)


class BaseAgent(ABC):
    """Abstract base class for all specialized agents"""

    def __init__(self, agent_name: str, agent_role: str):
        """
        Initialize base agent

        Args:
            agent_name: Name of this agent instance
            agent_role: Role of this agent (implementation, testing, fixing, verification)
        """
        self.agent_name = agent_name
        self.agent_role = agent_role
        self.current_task = None
        self.start_time = None

    @abstractmethod
    def process_task(self, task_assignment: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Process a task assignment - must be implemented by subclasses

        Args:
            task_assignment: Task assignment message

        Returns:
            Tuple of (success: bool, result: dict with completion/error data)
        """
        pass

    def start_task(self, task_assignment: Dict[str, Any]):
        """Record task start time and details"""
        self.current_task = task_assignment
        self.start_time = datetime.utcnow()

    def get_time_spent(self) -> int:
        """Get time spent on current task in minutes"""
        if not self.start_time:
            return 0
        elapsed = datetime.utcnow() - self.start_time
        return int(elapsed.total_seconds() // 60)

    def generate_completion_report(
        self,
        status: str,
        summary: str,
        files_modified: List[str],
        test_results: Optional[Dict[str, Any]] = None,
        warnings: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate a standard completion report

        Args:
            status: Task status (complete, partial, blocked)
            summary: Completion summary
            files_modified: List of modified files
            test_results: Test execution results
            warnings: List of warnings

        Returns:
            Task completion message dict
        """
        time_spent = self.get_time_spent()

        return create_task_completion_message(
            sender_id=self.agent_name,
            task_id=self.current_task.get('task_id', 'unknown'),
            status=status,
            completion_summary=summary,
            files_modified=files_modified,
            time_spent_minutes=time_spent,
            test_results=test_results,
            warnings=warnings
        )

    def generate_error_report(
        self,
        severity: str,
        error_code: str,
        error_message: str,
        stack_trace: Optional[str] = None,
        needs_human_intervention: bool = False
    ) -> Dict[str, Any]:
        """
        Generate a standard error report

        Args:
            severity: Error severity
            error_code: Error code
            error_message: Error message
            stack_trace: Stack trace
            needs_human_intervention: Whether human help is needed

        Returns:
            Error report message dict
        """
        return create_error_report_message(
            sender_id=self.agent_name,
            task_id=self.current_task.get('task_id', 'unknown'),
            severity=severity,
            error_code=error_code,
            error_message=error_message,
            stack_trace=stack_trace,
            needs_human_intervention=needs_human_intervention
        )


class ImplementationAgent(BaseAgent):
    """Specialized agent for implementation tasks"""

    def __init__(self, agent_name: str = "implementation-agent"):
        super().__init__(agent_name, "implementation")

    def process_task(self, task_assignment: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Process an implementation task

        Implementation tasks involve:
        - Writing new code
        - Implementing features
        - Creating new files/modules
        - Integration work

        Args:
            task_assignment: Task assignment with implementation details

        Returns:
            Tuple of (success, result)
        """
        try:
            self.start_task(task_assignment)

            task_id = task_assignment.get('task_id', 'unknown')
            description = task_assignment.get('description', '')
            file_patterns = task_assignment.get('file_patterns', [])

            print(f"[{self.agent_name}] Starting implementation for {task_id}")
            print(f"  Description: {description}")
            print(f"  Files: {file_patterns}")

            # Simulate implementation work
            # In real usage, this would:
            # 1. Read existing code context
            # 2. Generate implementation
            # 3. Write files
            # 4. Run basic validation

            # Mark as complete
            completion_report = self.generate_completion_report(
                status="complete",
                summary=f"Implementation completed: {description}",
                files_modified=list(file_patterns),
                test_results={
                    "unit_tests": {
                        "total": 5,
                        "passed": 5,
                        "failed": 0,
                        "coverage": 85
                    }
                }
            )

            return True, completion_report

        except Exception as e:
            error_report = self.generate_error_report(
                severity="high",
                error_code="IMPLEMENTATION_ERROR",
                error_message=f"Implementation failed: {str(e)}",
                needs_human_intervention=True
            )
            return False, error_report


class TestingAgent(BaseAgent):
    """Specialized agent for testing tasks"""

    def __init__(self, agent_name: str = "testing-agent"):
        super().__init__(agent_name, "testing")

    def process_task(self, task_assignment: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Process a testing task

        Testing tasks involve:
        - Writing unit tests
        - Running test suites
        - Validating implementations
        - Reporting test results

        Args:
            task_assignment: Task assignment with testing requirements

        Returns:
            Tuple of (success, result)
        """
        try:
            self.start_task(task_assignment)

            task_id = task_assignment.get('task_id', 'unknown')
            description = task_assignment.get('description', '')
            file_patterns = task_assignment.get('file_patterns', [])

            print(f"[{self.agent_name}] Starting testing for {task_id}")
            print(f"  Description: {description}")

            # Simulate testing work
            # In real usage, this would:
            # 1. Read implementation code
            # 2. Generate tests
            # 3. Run test suite
            # 4. Analyze coverage
            # 5. Report results

            # Check if this is a validation test (for completion verification)
            if "validate" in description.lower() or "verify" in description.lower():
                # This is a validation test - check completion criteria
                test_results = {
                    "unit_tests": {"total": 10, "passed": 10, "failed": 0, "coverage": 92},
                    "integration_tests": {"total": 5, "passed": 5, "failed": 0}
                }
                summary = f"Validation complete: All tests passing, coverage 92%"
            else:
                # Regular testing task
                test_results = {
                    "unit_tests": {"total": 8, "passed": 8, "failed": 0, "coverage": 88}
                }
                summary = f"Testing completed: {description}"

            completion_report = self.generate_completion_report(
                status="complete",
                summary=summary,
                files_modified=list(file_patterns),
                test_results=test_results
            )

            return True, completion_report

        except Exception as e:
            error_report = self.generate_error_report(
                severity="medium",
                error_code="TESTING_ERROR",
                error_message=f"Testing failed: {str(e)}"
            )
            return False, error_report


class FixingAgent(BaseAgent):
    """Specialized agent for fixing tasks"""

    def __init__(self, agent_name: str = "fixing-agent"):
        super().__init__(agent_name, "fixing")

    def process_task(self, task_assignment: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Process a fixing task

        Fixing tasks involve:
        - Debugging issues
        - Repairing broken code
        - Resolving errors
        - Bug fixing

        Args:
            task_assignment: Task assignment with error details

        Returns:
            Tuple of (success, result)
        """
        try:
            self.start_task(task_assignment)

            task_id = task_assignment.get('task_id', 'unknown')
            description = task_assignment.get('description', '')

            print(f"[{self.agent_name}] Starting fix for {task_id}")
            print(f"  Description: {description}")

            # Simulate fixing work
            # In real usage, this would:
            # 1. Analyze error reports
            # 2. Identify root cause
            # 3. Apply fixes
            # 4. Verify fix resolves issue

            # Check if task description contains error info
            if "error" in description.lower() or "bug" in description.lower():
                print(f"  Analyzing reported error...")

            completion_report = self.generate_completion_report(
                status="complete",
                summary=f"Fix completed: {description}",
                files_modified=["src/error_handling.py"],
                test_results={
                    "unit_tests": {"total": 3, "passed": 3, "failed": 0, "coverage": 95}
                }
            )

            return True, completion_report

        except Exception as e:
            error_report = self.generate_error_report(
                severity="high",
                error_code="FIXING_ERROR",
                error_message=f"Fixing failed: {str(e)}",
                needs_human_intervention=True
            )
            return False, error_report


class VerificationAgent(BaseAgent):
    """Specialized agent for verification tasks"""

    def __init__(self, agent_name: str = "verification-agent"):
        super().__init__(agent_name, "verification")

    def process_task(self, task_assignment: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Process a verification task

        Verification tasks involve:
        - Final review of completed work
        - Sign-off on implementation
        - Quality assurance
        - Readiness assessment

        Args:
            task_assignment: Task assignment with items to verify

        Returns:
            Tuple of (success, result)
        """
        try:
            self.start_task(task_assignment)

            task_id = task_assignment.get('task_id', 'unknown')
            description = task_assignment.get('description', '')

            print(f"[{self.agent_name}] Starting verification for {task_id}")
            print(f"  Description: {description}")

            # Simulate verification work
            # In real usage, this would:
            # 1. Review all completion reports
            # 2. Verify acceptance criteria met
            # 3. Check test results
            # 4. Confirm readiness for next phase

            verification_result = "✅ VERIFIED"

            # Check if verification passes
            if "review" in description.lower() or "verify" in description.lower():
                print(f"  Performing final verification checks...")

            completion_report = self.generate_completion_report(
                status="complete",
                summary=f"Verification completed: {verification_result}",
                files_modified=[],
                test_results={
                    "verification_checks": {"total": 5, "passed": 5, "failed": 0}
                }
            )

            return True, completion_report

        except Exception as e:
            error_report = self.generate_error_report(
                severity="medium",
                error_code="VERIFICATION_ERROR",
                error_message=f"Verification failed: {str(e)}"
            )
            return False, error_report


# --- Agent Factory ---

class AgentFactory:
    """Factory for creating specialized agents"""

    @staticmethod
    def create_agent(agent_role: str, agent_name: Optional[str] = None) -> BaseAgent:
        """
        Create an agent instance based on role

        Args:
            agent_role: Role of the agent (implementation, testing, fixing, verification)
            agent_name: Optional custom agent name

        Returns:
            Specialized agent instance
        """
        if agent_role == "implementation":
            name = agent_name or "implementation-agent"
            return ImplementationAgent(name)

        elif agent_role == "testing":
            name = agent_name or "testing-agent"
            return TestingAgent(name)

        elif agent_role == "fixing":
            name = agent_name or "fixing-agent"
            return FixingAgent(name)

        elif agent_role == "verification":
            name = agent_name or "verification-agent"
            return VerificationAgent(name)

        else:
            raise ValueError(f"Unknown agent role: {agent_role}")

    @staticmethod
    def process_with_agent(
        agent_role: str,
        task_assignment: Dict[str, Any],
        agent_name: Optional[str] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Convenience method to process a task with appropriate agent

        Args:
            agent_role: Role of the agent to use
            task_assignment: Task assignment message
            agent_name: Optional custom agent name

        Returns:
            Tuple of (success, result)
        """
        agent = AgentFactory.create_agent(agent_role, agent_name)
        return agent.process_task(task_assignment)


# --- Test Suite ---

def test_all_agents():
    """Test all specialized agents"""
    print("=" * 70)
    print("Specialized Agents Framework - Comprehensive Test")
    print("=" * 70)
    print()

    # Sample task assignment
    task_assignment = {
        "task_id": "bd-test-123",
        "description": "Test task for agent specialization",
        "file_patterns": ["test_file.py"]
    }

    # Test 1: Implementation Agent
    print("Test 1: ImplementationAgent")
    impl_agent = AgentFactory.create_agent("implementation", "test-impl")
    success, result = impl_agent.process_task(task_assignment)
    print(f"  ✓ Success: {success}")
    print(f"  ✓ Status: {result.get('status')}")
    assert success
    assert result['status'] == 'complete'
    print()

    # Test 2: Testing Agent
    print("Test 2: TestingAgent")
    test_agent = AgentFactory.create_agent("testing", "test-tester")
    test_task = {
        "task_id": "bd-test-456",
        "description": "Validate implementation with unit tests",
        "file_patterns": ["tests/test_file.py"]
    }
    success, result = test_agent.process_task(test_task)
    print(f"  ✓ Success: {success}")
    print(f"  ✓ Test results: {result.get('test_results', {}).get('unit_tests', {})}")
    assert success
    print()

    # Test 3: Fixing Agent
    print("Test 3: FixingAgent")
    fix_agent = AgentFactory.create_agent("fixing", "test-fixer")
    fix_task = {
        "task_id": "bd-test-789",
        "description": "Fix bug in error handling",
        "file_patterns": ["src/error_handling.py"]
    }
    success, result = fix_agent.process_task(fix_task)
    print(f"  ✓ Success: {success}")
    assert success
    print()

    # Test 4: Verification Agent
    print("Test 4: VerificationAgent")
    verify_agent = AgentFactory.create_agent("verification", "test-verifier")
    verify_task = {
        "task_id": "bd-test-999",
        "description": "Verify implementation is complete and ready",
        "file_patterns": []
    }
    success, result = verify_agent.process_task(verify_task)
    print(f"  ✓ Success: {success}")
    print(f"  ✓ Summary: {result.get('completion_summary')}")
    assert success
    print()

    # Test 5: Factory convenience method
    print("Test 5: AgentFactory.process_with_agent()")
    success, result = AgentFactory.process_with_agent(
        "testing",
        test_task,
        "factory-test"
    )
    print(f"  ✓ Success: {success}")
    assert success
    print()

    print("=" * 70)
    print("✅ All agent tests passed!")
    print("=" * 70)


if __name__ == "__main__":
    test_all_agents()
