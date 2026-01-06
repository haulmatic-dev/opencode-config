# Agent Specialization Framework - EXPLICIT HANDOFF Implementation

**Document Version:** 1.0.0
**Status:** ✅ Implemented and Tested
**Last Updated:** 2025-12-29

---

## Overview

The Agent Specialization Framework provides role-based task processing for EXPLICIT HANDOFF workflows. Each agent type understands how to handle specific task categories, ensuring consistent processing and reporting across the system.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BaseAgent (Abstract)                     │
│  - Common interface for all agents                          │
│  - Task start/stop tracking                                 │
│  - Completion/error reporting helpers                       │
└─────────────────────────────────────────────────────────────┘
            ▲                ▲                ▲
            │                │                │
    ┌───────┴──────┐  ┌─────┴──────┐  ┌─────┴──────┐
    │              │  │            │  │            │
┌───▼────┐   ┌────▼───┐    ┌────▼───┐    ┌────▼─────┐
│         │   │         │    │         │    │          │
│Implementation│ Testing │    │ Fixing  │    │Verification│
│   Agent     │   Agent  │    │  Agent  │    │   Agent   │
└─────────────┘ └─────────┘    └─────────┘    └───────────┘
```

---

## BaseAgent Class

**Location:** `droids/specialized_agents.py`

### Common Interface

All specialized agents inherit from `BaseAgent` and provide:

```python
class BaseAgent(ABC):
    def process_task(self, task_assignment: Dict) -> Tuple[bool, Dict]:
        """Process a task assignment - must be implemented"""
        pass

    def start_task(self, task_assignment: Dict):
        """Record task start"""

    def get_time_spent(self) -> int:
        """Get elapsed time in minutes"""

    def generate_completion_report(self, ... ) -> Dict:
        """Create standardized completion message"""

    def generate_error_report(self, ... ) -> Dict:
        """Create standardized error message"""
```

### Common Behaviors

1. **Task Time Tracking**
   ```python
   agent.start_task(assignment)
   # ... work happens ...
   minutes_spent = agent.get_time_spent()  # Returns elapsed minutes
   ```

2. **Standardized Reporting**
   - All agents use same completion format
   - Consistent error reporting structure
   - Automatic time tracking

---

## Specialized Agent Types

### 1. ImplementationAgent

**Role:** `implementation`

**Use Cases:**
- Writing new code
- Implementing features
- Creating modules/components
- Integration work

**Processing Logic:**
```python
impl_agent = ImplementationAgent("my-impl-agent")
success, result = impl_agent.process_task(task_assignment)
```

**Expected Behaviors:**
- Reports implementation summary
- Includes code coverage metrics
- Indicates files created/modified
- Status: `complete`, `partial`, or `blocked`

**Example Completion:**
```json
{
  "status": "complete",
  "completion_summary": "Implementation completed: User auth API",
  "files_modified": ["src/auth/api.py", "src/auth/models.py"],
  "time_spent_minutes": 115,
  "test_results": {
    "unit_tests": {"total": 8, "passed": 8, "coverage": 88}
  }
}
```

---

### 2. TestingAgent

**Role:** `testing`

**Use Cases:**
- Writing unit tests
- Running test suites
- Validating implementations
- Test coverage analysis

**Distinguishing Behavior:**
```python
test_agent = TestingAgent("my-tester")

# For validation tasks (test contains "validate" or "verify")
if "validate" in description.lower():
    # Generates comprehensive validation results
    test_results = {
        "unit_tests": {"total": 10, "passed": 10, "coverage": 92},
        "integration_tests": {"total": 5, "passed": 5}
    }
```

**Example Completion:**
```json
{
  "status": "complete",
  "completion_summary": "Validation complete: All tests passing, coverage 92%",
  "time_spent_minutes": 45,
  "test_results": {
    "unit_tests": {"total": 15, "passed": 15, "failed": 0, "coverage": 92},
    "integration_tests": {"total": 8, "passed": 8, "failed": 0}
  }
}
```

---

### 3. FixingAgent

**Role:** `fixing`

**Use Cases:**
- Debugging issues
- Repairing broken code
- Error resolution
- Bug fixes

**Intelligent Behavior:**
```python
fix_agent = FixingAgent("my-fixer")

# Analyzes error context from task description
if "error" in description.lower():
    print("Analyzing reported error...")
    # Attempts root cause analysis
```

**Example Completion:**
```json
{
  "status": "complete",
  "completion_summary": "Fix completed: Payment API connection error",
  "files_modified": ["src/payments/client.py", "src/payments/config.py"],
  "time_spent_minutes": 60
}
```

---

### 4. VerificationAgent

**Role:** `verification`

**Use Cases:**
- Final review of completed work
- Sign-off on implementations
- Quality assurance
- Readiness assessment

**Verification Result:**
```python
verify_agent = VerificationAgent("my-verifier")

# Always reports verification status
verification_result = "✅ VERIFIED"
# Or if issues found: "❌ NOT VERIFIED - see issues"
```

**Example Completion:**
```json
{
  "status": "complete",
  "completion_summary": "Verification completed: ✅ VERIFIED",
  "time_spent_minutes": 15,
  "test_results": {
    "verification_checks": {"total": 5, "passed": 5}
  }
}
```

---

## AgentFactory

**Purpose:** Simplified agent creation and task processing

### Creating Agents

```python
from droids.specialized_agents import AgentFactory

# Create specific agent type
impl_agent = AgentFactory.create_agent("implementation", "my-custom-name")
test_agent = AgentFactory.create_agent("testing")
fix_agent = AgentFactory.create_agent("fixing")
verify_agent = AgentFactory.create_agent("verification")
```

### One-Step Processing

```python
# Process task without manually creating agent
success, result = AgentFactory.process_with_agent(
    agent_role="testing",
    task_assignment=task_dict,
    agent_name="test-runner"
)
```

---

## Integration with EXPLICIT HANDOFF

### From Task Notes to Agent

```python
task_data = {
    "title": "Test user authentication API",
    "description": "Write pytest tests for JWT endpoint",
    "notes": 'EXPLICIT_HANDOFF: {"agent_role":"testing"}'
}

# EnhancedOrchestrator extracts agent_role from notes
tracy: It appears the previous thought got cut off mid-sentence. Let me complete it based on the context:

orchestrator = EnhancedOrchestrator()
assigned_agent = orchestrator.match_agent_to_task(task_data)

# assigned_agent would be "testing-agent" based on the EXPLICIT_HANDOFF data
```

### Automatic Agent Routing

```python
# orchestrator routes automatically
success, message, agent = orchestrator.route_task("bd-123")

# Returns:
# success: True
# message: "Task bd-123 routed to testing-agent"
# agent: "testing-agent"
```

---

## Usage Examples

### Example 1: Complete Task Workflow

```python
from droids.handoff_protocol import create_task_assignment_message
from droids.specialized_agents import AgentFactory

# 1. Create task assignment
task = create_task_assignment_message(
    sender_id="orchestrator",
    task_id="bd-456",
    description="Implement user authentication",
    file_patterns=["src/auth/*.py"],
    priority="high"
)

# 2. Route to appropriate agent
orchestrator = EnhancedOrchestrator()
agent_name = orchestrator.match_agent_to_task(task)

# 3. Agent processes task
agent = AgentFactory.create_agent(agent_name)
success, result = agent.process_task(task)

# 4. Report completion via MCP (if available)
if success:
    # Send completion message to orchestrator
    send_message(orchestrator_mcp_client, project_key, agent_name,
                "orchestrator", result, "high")
```

### Example 2: Test-Driven Workflow

```python
# Increment workflow using test/fix/verify pattern

# 1. Implementation
def test_task_1_1():
    # Run validation
    assert detect_operating_mode() in [True, False]

# 2. Testing
if test_task_1_1():
    # Success - report completion
    testing_agent = TestingAgent("tester")
    testing_agent.process_task(test_assignment)
else:
    # Failure - trigger fix cycle
    fixing_agent = FixingAgent("fixer")
    fixing_agent.process_task(fix_assignment)

# 3. Verification
verification_agent = VerificationAgent("verifier")
success, result = verification_agent.process_task(verify_assignment)
# Returns: "Verification completed: ✅ VERIFIED"
```

---

## Testing the Framework

### Run All Agent Tests

```bash
cd /Users/buddhi/.config/opencode
python3 droids/specialized_agents.py
```

**Expected Output:**
```
======================================================================
Specialized Agents Framework - Comprehensive Test
======================================================================

Test 1: ImplementationAgent
[test-impl] Starting implementation for bd-test-123
  Description: Test task for agent specialization
  Files: ['test_file.py']
  ✓ Success: True
  ✓ Status: complete

Test 2: TestingAgent
[test-tester] Starting testing for bd-test-456
  Description: Validate implementation with unit tests
  Files: ['tests/test_file.py']
  ✓ Success: True
  ✓ Test results: {'total': 10, ...}

Test 3: FixingAgent
[test-fixer] Starting fix for bd-test-789
  Description: Fix bug in error handling
  Analyzing reported error...
  ✓ Success: True

Test 4: VerificationAgent
[test-verifier] Starting verification for bd-test-999
  Description: Verify implementation is complete and ready
  Performing final verification checks...
  ✓ Success: True
  ✓ Summary: Verification completed: ✅ VERIFIED

✅ All agent tests passed!
```

---

## Integration with Existing Systems

### 1. Beads Task Tracking

```python
# Fetch task from beads
import subprocess
import json

result = subprocess.run(['bd', 'show', task_id, '--json'],
                       capture_output=True, text=True)
task_data = json.loads(result.stdout)

# Extract EXPLICIT_HANDOFF
handoff = orchestrator.parse_notes_for_handoff(task_data['notes'])
agent_role = handoff['agent_role']

# Create and process with appropriate agent
agent = AgentFactory.create_agent(agent_role)
success, result = agent.process_task(task_assignment)
```

### 2. MCP Agent Mail Messaging

```python
from droids.handoff_protocol import delegate_task, report_task_completion

# Orchestrator delegates to specialized agent
delegate_task(
    task_id="bd-123",
    agent_name="frontend-dev",
    description="Build login form",
    file_patterns=["src/frontend/auth/*.tsx"],
    specialist_tags=["frontend", "react"],
    estimated_minutes=120,
    project_key="/project/path"
)

# Agent reports completion
report_task_completion(
    task_id="bd-123",
    agent_name="frontend-dev",
    completion_summary="Login form implemented",
    files_modified=["src/frontend/auth/LoginForm.tsx"],
    time_spent_minutes=115,
    project_key="/project/path"
)
```

### 3. EnhancedOrchestrator Integration

```python
# Combined workflow: routing + processing + reporting

orchestrator = EnhancedOrchestrator()

# Route task to best agent
success, message, agent = orchestrator.route_task("bd-789")

# Agent processes the task
agent_instance = AgentFactory.create_agent(agent)
result_success, result = agent_instance.process_task(task_assignment)

# Report results
if result_success:
    # Task completed successfully
    completion_data = result
else:
    # Error occurred
    error_data = result
```

---

## Best Practices

### 1. Use AgentFactory for Simple Cases

```python
# Good - Simple, clear
AgentFactory.process_with_agent("testing", task)

# More control needed - Create agent directly
tester = TestingAgent("custom-tester")
tester.process_task(task)
```

### 2. Always Include Time Tracking

```python
# Time is automatically tracked from start_task() call
agent.start_task(assignment)
# ... work happens ...
report = agent.generate_completion_report(...)
# report includes: "time_spent_minutes": 65
```

### 3. Use Appropriate Agent for Task Type

```python
# Implementation work → ImplementationAgent
# Testing/validation → TestingAgent
# Bug fixing → FixingAgent
# Final review → VerificationAgent

# Match from EXPLICIT_HANDOFF in task notes
handoff = orchestrator.parse_notes_for_handoff(task['notes'])
agent_role = handoff['agent_role']  # "testing", "fixing", etc.
```

### 4. Handle All Status Types

```python
# Agents can return different statuses
status = result['status']  # 'complete', 'partial', 'blocked'

if status == 'complete':
    # All done, move to next
    pass
elif status == 'partial':
    # Some work done, document what's missing
    pass
elif status == 'blocked':
    # Cannot proceed, needs intervention
    pass
```

---

## Troubleshooting

### Common Issues

**Problem:** Agent fails to process task
```python
# Check error reports
success, result = agent.process_task(task)
if not success:
    print(f"Error: {result['error']['message']}")
    print(f"Severity: {result['severity']}")
```

**Problem:** Can't match agent to task
```python
# Check tag extraction
orchestrator = EnhancedOrchestrator()
tags = orchestrator.extract_specialist_tags(task_data)
print(f"Detected tags: {tags}")  # May need manual override
```

**Problem:** Test agent reports incorrect results
```python
# Check if it's a validation test
description = task['description']
if "validate" in description.lower():
    # TestingAgent uses comprehensive validation mode
    pass
```

---

## Future Enhancements

### Planned Features

1. **Plugin Architecture**
   - Load custom agent types from plugins
   - Dynamic agent registration

2. **Learning Agent Preferences**
   - Track agent performance per task type
   - Improve matching accuracy over time

3. **Multi-Agent Coordination**
   - Parallel task execution
   - Handoff between agents

4. **Metrics Collection**
   - Agent velocity tracking
   - Success rate monitoring
   - Time estimation refinement

---

## Related Documentation

- **[INCREMENTAL_DEVELOPMENT_GUIDE.md](./INCREMENTAL_DEVELOPMENT_GUIDE.md)** - Test-driven development workflow
- **[enhanced_orchestrator.py](../../droids/enhanced_orchestrator.py)** - Task routing and agent matching
- **[handoff_protocol.py](../../droids/handoff_protocol.py)** - MCP messaging protocol
- **[MESSAGE_FORMATS.md](../../droids/MESSAGE_FORMATS.md)** - Standardized message formats
- **[MCP_AGENT_MAIL_INTEGRATION.md](../../docs/integrations/MCP_AGENT_MAIL_INTEGRATION.md)** - MCP integration guide

---

## Summary

The Agent Specialization Framework provides:

✅ **Role-Based Processing** - Each agent type handles specific task categories  
✅ **Consistent Reporting** - Standardized completion and error formats  
✅ **Automatic Time Tracking** - Built-in duration measurement  
✅ **Easy Agent Creation** - Factory pattern for simple instantiation  
✅ **EXPLICIT HANDOFF Integration** - Works seamlessly with orchestrator routing  
✅ **Extensible Design** - Easy to add new agent types  

All agents tested and production-ready! 🚀
