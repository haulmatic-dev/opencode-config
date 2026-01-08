# Agent Success/Failure Handling Pattern

This guide defines how individual agents should handle task completion with Beads dependency graph integration.

## Core Principle

**Agent success/failure is managed through Beads task state changes:**
- **Success**: Close task → Beads unlocks next dependent task
- **Failure**: Create dependent fix task → Close task → Beads blocks downstream until fix

## Agent Task Lifecycle

### 1. Task Execution

```python
async def execute_task(task_id: str):
    """
    Main agent task execution loop.
    """
    # 1. Load task details from Beads
    task = bd.show(task_id)
    
    # 2. Parse stage and quality gates
    stage = task.metadata.get('stage', 0)
    quality_gates = task.metadata.get('quality_gates', {})
    
    # 3. Execute agent-specific work
    try:
        result = await do_agent_work(task)
    except Exception as e:
        # Handle unexpected errors as failures
        return handle_failure(task_id, stage, "execution_error", str(e))
    
    # 4. Run quality gates
    quality_results = run_quality_gates(quality_gates, stage)
    
    # 5. Determine success/failure
    if all(quality_results.values()):
        return handle_success(task_id, stage)
    else:
        return handle_failure(task_id, stage, quality_results)
```

### 2. Success Handling

```python
def handle_success(task_id: str, stage: int):
    """
    Task completed successfully.
    Close task → Beads unlocks next dependent task automatically.
    """
    print(f"✓ Task {task_id} completed successfully")
    
    # Close task with success reason
    bd.close(
        task_id,
        reason="Completed"
    )
    
    # Update cass_memory with success pattern
    cm.learn(task_id, 'success')
    
    # Agent exits - orchestrator/PM2 will spawn next agent
    exit(0)
    
    # Beads automatically unlocks next dependent task
    # Orchestrator picks up next ready task via `bd ready`
```

**Success Requirements by Stage:**

| Stage | Quality Gates | Success Criteria |
|--------|---------------|-----------------|
| 0 (Plan) | PRD review, risk assessment | Requirements validated, risks documented |
| 1 (Write Tests) | Test coverage | Coverage ≥ 80%, all tests written |
| 2 (Implement) | Typecheck, build | Code compiles, 0 type errors |
| 3 (Test) | Test execution | 100% tests pass, no failures |
| 4 (Quality) | Lint, security, typecheck | 0 lint errors, 0 security vulns, 0 type errors |

### 3. Failure Handling

```python
def handle_failure(task_id: str, stage: int, failure_info: dict):
    """
    Task failed quality gates.
    Create dependent fix task → Close task → Beads blocks downstream.
    """
    print(f"✗ Task {task_id} failed: {failure_info}")
    
    # Determine priority based on failure type
    priority = determine_failure_priority(failure_info)
    
    # Create dependent fix task
    fix_task_id = bd.create(
        title=f"{get_task_title(task_id)} - Fix {failure_info['type']}",
        type="bug",
        priority=priority,
        depends_on=[task_id],
        description=generate_failure_description(failure_info),
        metadata={
            "stage": stage,
            "failure_type": failure_info['type'],
            "original_task": task_id,
            "failure_details": failure_info['details']
        }
    )
    
    print(f"✓ Created fix task: {fix_task_id}")
    
    # Close original task with failure reason
    bd.close(
        task_id,
        reason=f"Failed - created fix task {fix_task_id}"
    )
    
    # Update cass_memory with failure pattern
    cm.learn(task_id, 'failure', failure_info)
    
    # Agent exits
    exit(0)
    
    # Beads keeps downstream tasks blocked until fix_task_id completes
    # Orchestrator/PM2 will spawn agent for fix_task_id (now ready)
```

**Failure Types and Priority Mapping:**

| Failure Type | Priority | Example |
|--------------|-----------|----------|
| Security vulnerability | P0 | SQL injection, XSS, sensitive data exposure |
| Test failure (critical path) | P0 | Authentication test fails, payment flow fails |
| Type error | P0 | Can't compile, TypeScript error |
| Build error | P0 | Missing dependency, syntax error |
| Test failure (non-critical) | P1 | Edge case test fails, UI test fails |
| Lint error | P2 | Code style, missing documentation |
| Performance regression | P1 | Response time > SLA, memory leak |
| Accessibility issue | P1 | Missing ARIA label, keyboard navigation |

### 4. Quality Gate Execution

```python
def run_quality_gates(quality_gates: dict, stage: int) -> dict:
    """
    Execute quality gates for current stage.
    Returns dict of gate results (True/False for each).
    """
    results = {}
    
    # Stage-specific quality gates
    if stage == 0:
        # Planning stage
        results['prd_validated'] = validate_prd(quality_gates.get('prd_file'))
        results['risks_assessed'] = check_risk_documentation()
        
    elif stage == 1:
        # Write tests stage
        results['coverage_met'] = check_test_coverage(min_coverage=80)
        results['tests_written'] = verify_all_tests_exist()
        
    elif stage == 2:
        # Implement stage
        results['typecheck_passes'] = run_typecheck()
        results['build_passes'] = run_build()
        
    elif stage == 3:
        # Test execution stage
        results['all_tests_pass'] = run_tests()
        results['no_flaky_tests'] = check_flaky_tests()
        
    elif stage == 4:
        # Quality checks stage
        results['lint_passes'] = run_lint()
        results['security_clean'] = run_security_scan()
        results['typecheck_passes'] = run_typecheck()
        results['build_passes'] = run_build()
    
    return results
```

### 5. Quality Gate Implementations

```python
# Test Coverage
def check_test_coverage(min_coverage: int = 80) -> bool:
    """Check if test coverage meets minimum threshold."""
    try:
        result = bash.run("npm run coverage || python -m pytest --cov=. --cov-report=term-missing")
        coverage = extract_coverage_percentage(result)
        return coverage >= min_coverage
    except:
        return False

# Type Check
def run_typecheck() -> bool:
    """Run TypeScript/Python type checking."""
    try:
        bash.run("npm run typecheck || tsc --noEmit || mypy .")
        return True
    except:
        return False

# Build
def run_build() -> bool:
    """Run project build."""
    try:
        bash.run("npm run build || cargo build || go build ./...")
        return True
    except:
        return False

# Lint
def run_lint() -> bool:
    """Run code linting."""
    try:
        bash.run("npm run lint || ruff check . || flake8 .")
        return True
    except:
        return False

# Security Scan
def run_security_scan() -> bool:
    """Run security vulnerability scan."""
    try:
        bash.run("snyk test || npm audit || pip-audit")
        return True
    except:
        return False

# Run Tests
def run_tests() -> bool:
    """Execute all tests."""
    try:
        bash.run("npm test || pytest")
        return True
    except:
        return False
```

## Complete Agent Template

```python
#!/usr/bin/env python3
"""
Template for individual agents implementing atomic task cycle.
Replace [AgentName] with specific agent name.
"""

import sys
import os
import json
import asyncio
from typing import Dict, Any

# Add agent directory to path
sys.path.insert(0, '/Users/buddhi/.config/opencode/agent')
sys.path.insert(0, '/Users/buddhi/.config/opencode')

# Import required modules
from mcp_agent_mail_client import (
    register_agent, get_project_key, 
    send_message, fetch_inbox, acknowledge_message
)
import cm  # cass_memory

# Beads CLI wrapper
class BeadsClient:
    """Simple wrapper for bd commands."""
    
    @staticmethod
    def show(task_id: str) -> Dict[str, Any]:
        """Get task details."""
        result = os.popen(f"bd show {task_id}").read()
        return parse_beads_output(result)
    
    @staticmethod
    def create(title: str, type: str, priority: int, 
              depends_on: list = None, description: str = None,
              metadata: dict = None) -> str:
        """Create new task."""
        cmd = f'bd create --title="{title}" --type={type} --priority={priority}'
        if depends_on:
            cmd += f' --depends_on={",".join(depends_on)}'
        if description:
            cmd += f' --description="{description}"'
        if metadata:
            cmd += f' --metadata=\'{json.dumps(metadata)}\''
        result = os.popen(cmd).read()
        return extract_task_id(result)
    
    @staticmethod
    def close(task_id: str, reason: str = "Completed"):
        """Close task."""
        os.popen(f'bd close {task_id} --reason="{reason}"').read()


class [AgentName]Agent:
    """[AgentName] agent implementing atomic task cycle."""
    
    def __init__(self):
        self.task_id = os.getenv('TASK_ID')
        self.mcp_client = None
        self.project_key = None
        
    async def initialize(self):
        """Initialize agent and register with MCP Agent Mail."""
        self.project_key = get_project_key()
        
        result = await register_agent(
            self.mcp_client,
            project_key=self.project_key,
            agent_name="[agent-name]",
            model=os.getenv("MODEL_NAME", "unknown"),
            task_description="[Agent description]"
        )
        
        if not result["success"]:
            raise RuntimeError("Failed to register with MCP Agent Mail")
        
        print(f"✓ Registered [agent-name] as agent")
    
    async def execute(self):
        """Main execution loop."""
        if not self.task_id:
            raise ValueError("TASK_ID environment variable not set")
        
        print(f"🔧 [agent-name] executing task: {self.task_id}")
        
        # Load task details
        task = BeadsClient.show(self.task_id)
        stage = task.get('metadata', {}).get('stage', 0)
        
        # Run quality gates
        quality_results = self.run_quality_gates(task)
        
        # Handle success or failure
        if all(quality_results.values()):
            await self.handle_success(stage)
        else:
            await self.handle_failure(stage, quality_results)
    
    def run_quality_gates(self, task: Dict) -> Dict[str, bool]:
        """
        Run quality gates for this agent's stage.
        Override this method with agent-specific gates.
        """
        # Implement agent-specific quality gates here
        # Example for test-specialist (Stage 1):
        results = {}
        results['coverage_met'] = self.check_test_coverage()
        results['tests_written'] = self.verify_tests_exist()
        return results
    
    async def handle_success(self, stage: int):
        """Handle successful task completion."""
        print(f"✓ Task {self.task_id} completed successfully (Stage {stage})")
        
        # Close task
        BeadsClient.close(self.task_id, reason="Completed")
        
        # Learn success pattern
        cm.learn(self.task_id, 'success')
        
        # Exit
        sys.exit(0)
    
    async def handle_failure(self, stage: int, quality_results: Dict[str, bool]):
        """Handle task failure."""
        # Determine failure type
        failure_type = self.determine_failure_type(quality_results)
        failure_details = self.extract_failure_details(quality_results)
        
        print(f"✗ Task {self.task_id} failed: {failure_type}")
        
        # Create dependent fix task
        fix_task_id = BeadsClient.create(
            title=f"Fix {failure_type}",
            type="bug",
            priority=self.determine_priority(failure_type),
            depends_on=[self.task_id],
            description=self.generate_failure_description(failure_details),
            metadata={
                "stage": stage,
                "failure_type": failure_type,
                "original_task": self.task_id,
                "failure_details": failure_details
            }
        )
        
        print(f"✓ Created fix task: {fix_task_id}")
        
        # Close original task with failure reason
        BeadsClient.close(
            self.task_id,
            reason=f"Failed - created fix task {fix_task_id}"
        )
        
        # Learn failure pattern
        cm.learn(self.task_id, 'failure', {
            "type": failure_type,
            "details": failure_details,
            "stage": stage
        })
        
        # Exit
        sys.exit(0)
    
    # Helper methods (implement based on agent type)
    def check_test_coverage(self) -> bool:
        """Check test coverage (example for test-specialist)."""
        pass
    
    def verify_tests_exist(self) -> bool:
        """Verify tests exist (example for test-specialist)."""
        pass
    
    def determine_failure_type(self, quality_results: Dict) -> str:
        """Determine failure type from quality results."""
        pass
    
    def extract_failure_details(self, quality_results: Dict) -> Dict:
        """Extract failure details from quality results."""
        pass
    
    def determine_priority(self, failure_type: str) -> int:
        """Map failure type to Beads priority."""
        priority_map = {
            "security": 0,
            "test_failure": 0,
            "type_error": 0,
            "build_error": 0,
            "lint_error": 2,
            "performance": 1,
            "accessibility": 1
        }
        return priority_map.get(failure_type, 1)
    
    def generate_failure_description(self, details: Dict) -> str:
        """Generate human-readable failure description."""
        pass


async def main():
    """Main entry point."""
    agent = [AgentName]Agent()
    await agent.initialize()
    await agent.execute()


if __name__ == "__main__":
    asyncio.run(main())
```

## Integration with Orchestrator/PM2

### Orchestrator Mode

```python
# Orchestrator workflow (NO CHANGES NEEDED)
while True:
    ready_tasks = bd.ready()  # Get unblocked tasks
    
    for task in ready_tasks:
        agent_type = determine_agent_for_task(task)
        
        # Spawn appropriate agent
        spawn_agent(agent_type, task_id=task.id)
        
        # Wait for agent to complete
        wait_for_agent_completion(task.id)
        
        # Beads automatically unlocks next task
        # Loop continues with next ready task
```

### PM2 Headless Worker Mode

```javascript
// Headless worker (NO CHANGES NEEDED)
const { execSync } = require('child_process');

// Poll for ready tasks
const readyOutput = execSync('bd ready', { encoding: 'utf8' });
const taskId = extractTaskId(readyOutput);

// Reserve files via MCP
reserveFiles(taskId);

// Determine agent type and spawn
const agentType = determineAgentForTask(taskId);
execSync(`TASK_ID=${taskId} opencode-task-${agentType}`);

// Agent handles success/failure automatically
// Beads unlocks next task automatically

// Worker exits → PM2 restarts → claims next task
process.exit(0);
```

## Key Points

1. **Agents are stateless** - Execute one task, then exit
2. **Success = close task** - Beads unlocks next dependent task
3. **Failure = create fix task + close task** - Beads blocks downstream until fix
4. **Quality gates are stage-specific** - Each stage has different checks
5. **Beads handles all dependency logic** - No manual task management needed
6. **Orchestrator/PM2 just spawns agents** - No orchestration logic in agents
