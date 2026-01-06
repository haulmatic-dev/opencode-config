# Explicit Agent Handoff Coordination Implementation Plan

**Status:** Design Phase Complete
**Objective:** Enable explicit agent handoffs using MCP Agent Mail to preserve context and limit agents to atomic tasks
**Goal:** Prevent context overflow by storing task state in beads rather than agent memory

---

## Current State vs Desired State

### Current State (Emergent Behavior)
- ❌ No explicit agent specialization/role assignment
- ❌ Same agent continues by default (not enforced)
- ❌ No structured way to hand off between agents
- ❌ Task context stored in agent memory (risk of overflow)
- ❌ Handoff decision is agent discretion, not orchestrated
- ✅ Beads tasks exist with test/fix/verify cycles
- ✅ MCP Agent Mail provides messaging infrastructure

### Desired State (Explicit Coordination)
- ✅ Agents have explicit roles (implementation, testing, fixing)
- ✅ Orchestrator routes tasks to appropriate specialists
- ✅ MCP Agent Mail messages trigger handoffs with context
- ✅ Task context stored in beads task metadata (not agent memory)
- ✅ Clear handoff protocol between agent types
- ✅ Preserves agent context by limiting to atomic work

---

## Required Changes

### 1. Beads Task Schema Enhancement

**Add new fields to beads tasks:**

```json
{
  "id": ".factory-abc123",
  "title": "Task 1.1: Detect operating mode",
  "description": "Add code to detect Spec-Fed vs Direct mode...",
  "status": "open",
  "priority": 2,
  "issue_type": "task",
  "agent_role": "implementation",  // NEW: Required agent role
  "agent_context": {                // NEW: Context from previous agent
    "previous_agent": "orchestrator-BlueLake",
    "work_completed": "Operating mode detection implemented",
    "files_modified": ["droids/orchestrator.md"],
    "test_status": "pending",
    "known_issues": []
  },
  "handoff_instructions": {        // NEW: Instructions for next agent
    "next_role": "testing",
    "test_script": "./test-operating-mode.sh",
    "expected_duration": "15 minutes",
    "notes_from_implementer": "MCP client import added, graceful fallback working"
  },
  "specialist_tags": ["python", "mcp", "orchestrator"],  // NEW: Skill tags
  "estimated_duration": 120,        // NEW: Minutes
  "parent_task": null
}
```

**New Fields:**
- `agent_role`: One of `[implementation, testing, fixing, verification]`
- `agent_context`: Structured object storing work state from previous agent
- `handoff_instructions`: What the next agent needs to know
- `specialist_tags`: Skills required to complete the task
- `estimated_duration`: Time estimate in minutes
- `previous_agent`: Who did the last work (for FIX tasks)

**CLI Commands Needed:**
```bash
# Add/update agent context
bd update .factory-abc123 --agent-context '{"previous_agent": "me", "work_completed": "X"}' --json

# Add handoff instructions
bd update .factory-abc123 --handoff-instructions '{"next_role": "testing", "notes": "Run test-x.sh"}' --json

# Tag with specialist skills
bd update .factory-abc123 --tags python,mcp,orchestrator --json

# Set estimated duration
bd update .factory-abc123 --estimated-duration 120 --json
```

---

### 2. Agent Role Definitions

**Create agent specialization registry** (`/droids/AGENT_ROLES.yaml`):

```yaml
agent_roles:
  implementation-specialist:
    skills: [python, javascript, coding, refactoring]
    typical_tasks: [implementation, coding, feature-work]
    max_session_duration: 120  # minutes before context risk
    responsibilities: "Write code to meet acceptance criteria"
    
  testing-specialist:
    skills: [testing, validation, qa, automation]
    typical_tasks: [testing, verification, validation]
    max_session_duration: 60
    responsibilities: "Run tests, verify acceptance criteria, document failures"
    
  fixing-specialist:
    skills: [debugging, troubleshooting, problem-solving]
    typical_tasks: [bug-fixes, error-handling, patches]
    max_session_duration: 90
    responsibilities: "Investigate failures, implement fixes, ensure tests pass"
    
  verification-specialist:
    skills: [review, validation, approval]
    typical_tasks: [verification, sign-off, approval]
    max_session_duration: 30
    responsibilities: "Review test results, confirm quality, approve next increment"
```

---

### 3. Enhanced Task Creation

**Modify `create-beads-tasks.sh` to include role assignment:**

```bash
create_increment() {
  local impl_title="$1"
  local impl_desc="$2"
  local priority="$3"
  local parent="$4"
  local phase="$5"
  local estimated_duration="${6:-120}"  # Default 2 hours
  
  # Create implementation task
  local impl_id=$(create_task "$impl_title" "$impl_desc" "$priority" "$parent" "")
  
  # Add agent role and context to implementation task
  bd update "$impl_id" --agent-role implementation --estimated-duration "$estimated_duration" --silent
  bd update "$impl_id" --tags "python,mcp,backend" --silent  # Example tags
  
  # Create TEST task with different role
  local test_id=$(create_task "TEST: $impl_title" "$test_desc" "$priority" "$parent" "discovered-from:$impl_id")
  bd update "$test_id" --agent-role testing --estimated-duration 30 --silent  # 30 min for testing
  bd update "$test_id" --tags "testing,validation,qa" --silent
  
  # Create FIX task (conditional)
  local fix_id=$(create_task "FIX (conditional): $impl_title" "$fix_desc" "$priority" "$parent" "discovered-from:$test_id")
  bd update "$fix_id" --agent-role fixing --estimated-duration 60 --silent  # 60 min for fixes
  bd update "$fix_id" --tags "debugging,troubleshooting" --silent
  
  # Create VERIFY task
  local verify_id=$(create_task "VERIFY: $impl_title" "$verify_desc" "$priority" "$parent" "discovered-from:$test_id")
  bd update "$verify_id" --agent-role verification --estimated-duration 15 --silent  # 15 min for verification
  
  echo "$verify_id"  # Return verify ID for dependency chaining
}
```

---

### 4. MCP Agent Mail Handoff Protocol

**Standard handoff message format** (`MESSAGE_FORMATS.md`):

```json
{
  "version": "1.0.0",
  "timestamp": "2025-12-29T10:00:00Z",
  "type": "task_handoff",
  "from_agent": "orchestrator-BlueLake",
  "to_agent": "testing-specialist-RedStone",
  "task_id": ".factory-abc123",
  "handoff_type": "implementation_to_testing",
  "context": {
    "work_completed": "Operating mode detection implemented in orchestrator.md",
    "files_modified": ["droids/orchestrator.md:465-513"],
    "implementation_notes": "MCP client import added at top, graceful fallback working",
    "estimated_test_duration": "15 minutes",
    "test_command": "./test-operating-mode.sh",
    "potential_issues": []
  },
  "previous_attempts": 0,
  "urgency": "normal"
}
```

**When to send handoff messages:**

1. **Implementation Complete** → Send to Testing Specialist
   - Trigger: Implementation task closed
   - Content: What was built, files modified, test commands

2. **Test Failed** → Send to Fixing Specialist
   - Trigger: TEST task closed with failure
   - Content: Failure details, error logs, reproduction steps

3. **Fix Complete** → Send to Testing Specialist (again)
   - Trigger: FIX task closed
   - Content: What was fixed, re-test instructions

4. **Test Passed** → Send to Verification Specialist
   - Trigger: TEST task closed with success
   - Content: Summary, ready for approval

---

### 5. Orchestrator Routing Logic

**New orchestrator behavior** (`droids/orchestrator.md`):

```python
from AGENT_ROLES import get_agent_for_role, get_agents_by_tags

class EnhancedOrchestrator:
    def __init__(self, mcp_client):
        self.mcp_client = mcp_client
        self.project_key = get_project_key()
        
    async def route_next_task(self):
        """Route to next available task based on agent capabilities."""
        
        # 1. Check for tasks ready to work on
        ready_tasks = await self._get_ready_tasks()
        
        for task in ready_tasks:
            required_role = task.get("agent_role")
            required_tags = task.get("specialist_tags", [])
            
            # 2. Find best agent for this task
            suitable_agents = await self._find_suitable_agents(required_role, required_tags)
            
            if not suitable_agents:
                print(f"⚠ No suitable agent found for task {task['id']} (role: {required_role})")
                continue
            
            # 3. Pick agent (prioritize least busy, best skill match)
            selected_agent = self._select_best_agent(suitable_agents, task)
            
            # 4. Send handoff message
            if task.get("agent_context"):  # This is a handoff, not new work
                await self._send_handoff_message(
                    from_agent=self.agent_name,
                    to_agent=selected_agent,
                    task=task
                )
            else:
                # New task assignment
                await self._send_assignment_message(
                    to_agent=selected_agent,
                    task=task
                )
            
            # 5. Mark task as in_progress
            bd.update(task['id'], status='in_progress')
            
            return True
        
        return False  # No tasks to route
    
    async def _get_ready_tasks(self):
        """Get all open tasks with unmet dependencies."""
        result = bd.list(
            status='open',
            json=True
        )
        
        ready = []
        for task in result:
            # Check if dependencies are met
            deps_met = all(self._is_dependency_complete(dep) for dep in task.get('dependencies', []))
            if deps_met:
                ready.append(task)
        
        return ready
    
    def _find_suitable_agents(self, role, tags):
        """Find agents with matching role and skills."""
        # Get all registered agents from MCP Agent Mail
        agents = mcp.list_agents(project_key=self.project_key)
        
        suitable = []
        for agent in agents:
            agent_info = self._get_agent_info(agent['name'])
            
            # Check role preference
            preferred_roles = agent_info.get('preferred_roles', [])
            if role not in preferred_roles:
                continue
            
            # Check skill tags
            agent_skills = agent_info.get('skills', [])
            if not any(tag in agent_skills for tag in tags):
                continue
            
            suitable.append(agent['name'])
        
        return suitable
```

---

### 6. Beads CLI Enhancements

**New beads commands for context management:**

```bash
# Add context to a task
bd update TASK_ID --context '{"key": "value"}' --merge

# Add agent role
bd update TASK_ID --agent-role testing

# Add specialist tags
bd update TASK_ID --tags python,mcp,orchestrator

# Set estimated duration (minutes)
bd update TASK_ID --estimated-duration 60

# Add handoff instructions
bd update TASK_ID --handoff-instructions '{"next_role": "testing", "notes": "See logs"}'

# View full task with context
bd show TASK_ID --full

# List tasks by role
bd list --agent-role implementation

# List tasks by tag
bd list --tags testing

# List tasks ready for specific agent
bd ready --for-agent testing-specialist
```

---

### 7. MCP Agent Mail Handoff Messages

**Orchestrator sends handoff messages with full context:**

```python
async def send_handoff_message(self, from_agent, to_agent, task):
    """Send structured handoff message between agents."""
    
    message_content = {
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "type": "task_handoff",
        "from_agent": from_agent,
        "to_agent": to_agent,
        "task_id": task['id'],
        "task_title": task['title'],
        "subject": f"Handoff: {task['title']}",
        "handoff_type": self._determine_handoff_type(task),
        "context": {
            # From agent_context field
            "work_completed": task.get('agent_context', {}).get('work_completed', ''),
            "files_modified": task.get('agent_context', {}).get('files_modified', []),
            "implementation_notes": task.get('agent_context', {}).get('implementation_notes', ''),
            "previous_failures": task.get('agent_context', {}).get('previous_failures', []),
            
            # From handoff_instructions field
            "estimated_duration": task.get('handoff_instructions', {}).get('estimated_duration'),
            "test_command": task.get('handoff_instructions', {}).get('test_command'),
            "reproduction_steps": task.get('handoff_instructions', {}).get('reproduction_steps'),
            
            # Agent role specific
            "role": task.get('agent_role'),
            "required_skills": task.get('specialist_tags', []),
            "estimated_duration_minutes": task.get('estimated_duration')
        },
        "previous_attempts": task.get('agent_context', {}).get('attempts', 0),
        "urgency": self._determine_urgency(task)
    }
    
    await send_message(
        mcp_client=self.mcp_client,
        project_key=self.project_key,
        sender_name=self.agent_name,
        recipient_name=to_agent,
        content=message_content,
        importance=self._determine_importance(task)
    )
```

**Message types to implement:**
- `task_handoff`: Standard work handoff
- `test_failure_report`: Test failed, needs fixing
- `fix_complete`: Fix implemented, needs re-test
- `verification_request`: Please verify and approve

---

### 8. Context Preservation Strategy

**Key principle: Store context in beads, NOT agent memory**

**Implementation agent context:**
```bash
bd close .factory-abc123 --reason "Implementation complete"
bd update .factory-abc123 --agent-context '{
  "previous_agent": "implementation-specialist-GreenLake",
  "work_completed": "MCP client registration added to orchestrator",
  "files_modified": ["droids/orchestrator.md:465-480"],
  "test_command": "./test-orchestrator-mcp.sh",
  "implementation_notes": "Graceful degradation tested, works when MCP unavailable",
  "known_issues": [],
  "attempts": 0
}' --silent

# Orchestrator sees TEST task ready, sends handoff
# Testing agent receives message with full context
# Testing agent runs tests WITHOUT needing implementation context
```

**Test agent only stores:**
- Test results (pass/fail)
- Failure details if any
- Logs/output

**Total context size:** ~2KB vs 50KB+ for full implementation context

---

### 9. Agent Memory Management

**Agent sessions should be short-lived (atomic tasks only):**

```python
# Agent starts session
async def handle_task_assignment(msg):
    task_id = msg['content']['task_id']
    role = msg['content']['context']['role']
    
    # Claim task
    bd.update(task_id, status='in_progress')
    
    # Do the work (bounded by task size)
    if role == 'implementation':
        await do_implementation(msg)
    elif role == 'testing':
        await do_testing(msg)
    elif role == 'fixing':
        await do_fixing(msg)
    
    # Store results in beads
    bd.update(task_id, agent_context=build_context())
    
    # Signal completion via MCP message
    await send_completion_message(task_id)
    
    # END AGENT SESSION - context cleared
    # Agent doesn't need to remember anything
```

**Benefits:**
- Agent context never grows beyond single task
- New agent can pick up without history
- Full audit trail in beads
- No context window overflow

---

### 10. Implementation Roadmap

**Phase 1: Beads Schema Update (Week 1)**
- [ ] Add new fields to beads database schema
- [ ] Update `bd create` and `bd update` CLI commands
- [ ] Create `AGENT_ROLES.yaml` definition file
- [ ] Test new fields with sample tasks

**Phase 2: Task Creation Enhancement (Week 1-2)**
- [ ] Modify `create-beads-tasks.sh` to assign roles
- [ ] Update task generation to include estimated durations
- [ ] Add skill tags to all generated tasks
- [ ] Test role assignment on sample PRD

**Phase 3: Handoff Message Protocol (Week 2)**
- [ ] Define message formats in `MESSAGE_FORMATS.md`
- [ ] Create `HandoffManager` class in MCP client
- [ ] Implement message sending/receiving functions
- [ ] Write unit tests for handoff messages

**Phase 4: Orchestrator Routing Logic (Week 3)**
- [ ] Implement `EnhancedOrchestrator` class
- [ ] Add agent capability/skill matching
- [ ] Implement `route_next_task()` method
- [ ] Add routing tests with mock agents
- [ ] Integrate with existing orchestrator

**Phase 5: Agent Specialization (Week 3-4)**
- [ ] Create `AgentSpecialist` base class
- [ ] Implement `ImplementationAgent`
- [ ] Implement `TestingAgent`
- [ ] Implement `FixingAgent`
- [ ] Implement `VerificationAgent`
- [ ] Add agent registry and discovery

**Phase 6: Integration & Testing (Week 4)**
- [ ] End-to-end test: Implementation → Testing → Verification
- [ ] Test failure scenario: Implementation → Testing → Fixing → Testing
- [ ] Test handoff with multiple agents
- [ ] Verify context isolation (agents don't retain state)
- [ ] Performance testing: Context size stays bounded

**Phase 7: Documentation & Rollout (Week 5)**
- [ ] Update `INCREMENTAL_DEVELOPMENT_GUIDE.md`
- [ ] Create `AGENT_SPECIALIZATION.md` guide
- [ ] Add examples of explicit handoffs
- [ ] Train existing droids on new workflow
- [ ] Monitor first production usage

**Total Timeline:** 5 weeks
**Complexity:** Medium-High
**Risk:** Low (incremental, backwards compatible)

---

## Benefits

### 1. Preserved Agent Context
- Agents only see their atomic task (2-4 hours max)
- Context window never overflows
- No degradation over long sessions

### 2. Clear Accountability
- Each role explicit: who implements, who tests, who fixes
- Audit trail in beads shows handoffs
- Easier debugging (know who did what)

### 3. Load Balancing
- Multiple agents can specialize
- Work distributed across agent pool
- Handoffs enable parallel processing

### 4. Quality Assurance
- Testing is explicit phase, not optional
- Verification before proceeding
- Prevents "just ship it" mentality

### 5. Failure Recovery
- Tests catch issues early
- Fix tasks explicitly created
- Original implementation not reopened (clean history)

### 6. Agent Development
- Simpler agent design (single responsibility)
- Easy to add new specialist types
- Agents become interchangeable

---

## Example Workflow

```
Task 1.1: Detect operating mode (IMPLEMENTATION)
  ↓ IMPLEMENTATION COMPLETE
  ↓ [Orchestrator sends handoff message]
  ↓ Context stored in beads task
  ↓
TEST: Task 1.1 (TESTING)
  ↓ Test runs, PASSES
  ↓ [Testing agent updates beads with results]
  ↓
VERIFY: Task 1.1 (VERIFICATION)
  ↓ Verification complete
  ↓ [Approve and move to Task 1.2]
  ↓
Task 1.2: Register orchestrator (IMPLEMENTATION)
  ↓ Implementation continues...
```

**Failure scenario:**
```
Task 1.1: Detect operating mode (IMPLEMENTATION) ✓
TEST: Task 1.1 (TESTING) ✗ FAILS
  ↓ [Testing agent documents failure in beads]
  ↓ [Orchestrator creates FIX task]
  ↓ [Orchestrator sends handoff to fixing specialist]
  ↓
FIX: Task 1.1 (FIXING)
  ↓ Fixing agent investigates
  ↓ Implements fix
  ↓ Updates beads with fix details
  ↓
TEST: Task 1.1 Re-run (TESTING)
  ↓ Tests pass
  ↓
VERIFY: Task 1.1 (VERIFICATION) ✓
```

**Agent memory usage:**
- Implementation agent: 2KB (implementation context only)
- Testing agent: 1KB (test results only)
- Fixing agent: 2KB (investigation context only)
- Verification agent: 0.5KB (approval only)
- **Total: 5.5KB** vs 50KB+ in current monolithic approach

---

## Open Questions

1. **How do agents register their capabilities?**
   - Option A: Config file (AGENT_ROLES.yaml)
   - Option B: Self-registration with capability advert
   - Option C: Orchestrator assigns at startup

2. **What if no suitable agent available?**
   - Queue task and notify
   - Fallback to generalist agent
   - Wait and retry

3. **How to handle agent failures/errors?**
   - Escalate to human
   - Retry with different agent
   - Mark task as blocked

4. **Should context be encrypted?**
   - Some tasks may contain sensitive info
   - MCP Agent Mail supports secure channels

---

## Next Steps

**Immediate (This Week):**
1. Review this plan with team
2. Get consensus on approach
3. Create detailed tickets for Phase 1
4. Set up development branch

**Short-term (Next 2 Weeks):**
1. Implement beads schema changes
2. Create agent role definitions
3. Write handoff message specifications
4. Begin orchestrator enhancements

**Medium-term (3-5 Weeks):**
1. Full implementation and testing
2. Documentation updates
3. Rollout to production droids
4. Monitor and iterate

---

**Document Version:** 1.0  
**Author:** Agent Research & Design  
**Last Updated:** 2025-12-29
