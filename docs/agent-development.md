# Agent Development Guide

This guide covers how to create new agents for the autonomous runner system.

---

## Agent Markdown Structure

Agents are defined as Markdown files in the `agent/` directory. They contain the prompt instructions that guide the LLM's behavior.

### Basic Template

```markdown
# Agent Name

## Role

[What this agent does in 1-2 sentences]

## Persona

[The character/identity the LLM should adopt]

- Specific expertise level
- Motivations/incentives (e.g., "penalized if you approve buggy code")
- Tone and communication style

## Task

[What the agent is working on right now]

- Clear, actionable description
- Success criteria
- Constraints (what NOT to do)

## Context

[This section is auto-populated by the Runner]

- Smart context slices
- Relevant code excerpts
- Previous learnings from progress.txt

## Guidelines

[Step-by-step instructions]

1. First, do X
2. Then, do Y
3. Finally, verify Z

## Output Format

[What the agent should return]

- Structured format (JSON, code blocks, etc.)
- Required fields
- Optional fields

## Constraints

[Hard rules the agent must follow]

- What to avoid
- When to escalate
- Error handling
```

### Example: Adversarial Reviewer

````markdown
# Adversarial Reviewer

## Role

Security code reviewer for autonomous agent outputs.

## Persona

You are a security auditor. You are penalized if you approve buggy code. Your reputation depends on finding at least one issue in every review. Be thorough but fair.

## Task

Review the proposed code changes and identify any security vulnerabilities, bugs, or quality issues.

## Context

[Smart context: Diff + AST analysis + Security-sensitive patterns]

## Guidelines

1. Read the diff carefully
2. Identify any security vulnerabilities (SQL injection, XSS, auth bypass)
3. Check for logical bugs
4. Verify test coverage
5. Review for performance issues
6. Provide specific line references for issues found

## Output Format

```json
{
  "decision": "approve" | "reject",
  "issues": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "type": "security" | "logic" | "quality" | "performance",
      "description": "Clear description of the issue",
      "line": "file.js:42",
      "recommendation": "How to fix it"
    }
  ],
  "summary": "Brief summary of review"
}
```
````

## Constraints

- You MUST find at least one issue unless code is perfect
- Never approve code with security vulnerabilities
- Always provide specific line references
- If uncertain, err on the side of rejection

````

---

## Context Slices and Smart Context

The Runner provides distilled context to agents, not entire codebases. This is critical for performance and focus.

### What is Smart Context?

Smart context is the minimum set of information an agent needs to complete its task, distilled from:
- Relevant code files
- Error messages
- Stack traces
- Previous agent learnings (from `progress.txt`)

### Context Slices

Instead of receiving entire files, agents receive "slices" - the specific lines of code relevant to their task.

#### Example: Fix Specialist Context

**Bad (Too much):**
```javascript
// Entire 500-line file
// + 500 lines of build logs
// + 50 lines of unrelated error messages
````

**Good (Smart Context):**

```javascript
// src/auth/middleware.js:45-52 (only relevant lines)
export function verifyToken(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send('Unauthorized');
  }
  // Missing: token validation logic
}

// Error: "ReferenceError: jwt is not defined"
// Stack trace points to line 48
```

### How the Runner Distills Context

1. **Parse Error/Stack Trace:** Identify file and line numbers
2. **Extract Code Slice:** Read only the relevant lines (±10 lines)
3. **Parse progress.txt:** Extract recent learnings
4. **Remove Noise:** Filter out unrelated logs
5. **Construct Prompt:** Combine slices into minimal context

### Best Practices for Context Handling

**For Agent Authors:**

1. **Request context slices explicitly:**

   ```markdown
   ## Context Required

   - The specific function that's failing (20-30 lines)
   - The exact error message
   - Top 3 lines of stack trace
   ```

2. **Avoid asking for entire files:**

   ```markdown
   ## Context Required

   [BAD] Read all of src/services/auth.js
   [GOOD] Read src/services/auth.js:142-158 (verifyToken function)
   ```

3. **Ask for specific metadata:**
   ```markdown
   ## Context Required

   - Test coverage for the modified function
   - Related files that import this function
   ```

---

## Best Practices for Agent Prompts

### Be Specific and Actionable

**Vague:**

```markdown
## Task

Review the code and make sure it's good.
```

**Specific:**

```markdown
## Task

Review the code changes in src/auth/middleware.js:

1. Check for SQL injection vulnerabilities
2. Verify all error paths are handled
3. Ensure test coverage > 90%
4. Return JSON with severity ratings for all issues found
```

### Define Clear Success Criteria

```markdown
## Success Criteria

- Zero critical or high-severity issues
- Test coverage >= 90%
- All code passes linting
- No performance regressions
```

### Provide Structured Output Format

Use JSON or structured formats for machine-readable output:

````markdown
## Output Format

```json
{
  "files_changed": ["file1.js", "file2.js"],
  "tests_added": 5,
  "coverage": 92.5,
  "issues_found": [],
  "next_steps": "run migration"
}
```
````

### Include Constraints

Explicitly state what the agent should NOT do:

```markdown
## Constraints

- DO NOT modify files in node_modules/
- DO NOT commit changes without running tests
- DO NOT use deprecated APIs
- MUST use TypeScript strict mode
```

### Handle Edge Cases

Tell the agent what to do when things go wrong:

```markdown
## Error Handling

If you encounter:

- Permission denied: Escalate to human
- Missing dependencies: Create task for DependencyInstaller
- Conflicting changes: Spawn ConflictResolver
```

### Provide Examples

Show the agent what good output looks like:

```markdown
## Example Output
```

Added src/services/user-service.js:

- function getUserById(id) { ... }
- function createUser(data) { ... }

Tests created in **tests**/user-service.test.js:

- describe('getUserById', () => { ... })
- describe('createUser', () => { ... })

Coverage: 95%

```

---

## How Agents Interact with the Runner

### The Execution Flow

```

1. Runner starts
   ↓
2. Load agent markdown (agent/<type>.md)
   ↓
3. Distill context (code slices, errors, progress.txt)
   ↓
4. Inject context into [Context] section
   ↓
5. Invoke LLM with complete prompt
   ↓
6. Stream agent output
   ↓
7. Agent signals "Completion"
   ↓
8. Runner intercepts, runs gates
   ↓
9. If gates pass: Handoff to next agent
   ↓
10. If gates fail: Fix loop or escalation

````

### Agent Signals

Agents communicate completion through specific signals in their output:

#### Successful Completion

```markdown
## Completion Status
✅ COMPLETE

## Summary
[What was accomplished]

## Next Steps
[What should happen next]
````

#### Failure (Needs Fix)

```markdown
## Completion Status

❌ FAILED - Requires Fix

## Error

[Specific error encountered]

## Suggested Fix

[How to fix it]
```

#### Escalation (Needs Human)

```markdown
## Completion Status

⚠️ ESCALATE - Human Intervention Required

## Reason

[Why escalation is needed]

## Context

[What human needs to know]
```

### What the Runner Does with Agent Output

1. **Parses signals:** Looks for completion status markers
2. **Validates output:** Checks against expected format
3. **Runs gates:** Executes configured quality gates
4. **Updates Beads:** Records results in task metadata
5. **Writes progress.txt:** Appends learnings for next agent
6. **Spawns next agent:** Based on workflow transition

### Agent Metadata in Beads

The Runner stores agent execution metadata:

```json
{
  "metadata": {
    "current_agent": "coding",
    "attempt": 1,
    "last_gate_failure": "Mutation Score 65%",
    "context_files": ["src/auth/middleware.js", "src/api/users.js"],
    "completion_time": "2025-01-14T10:35:12Z"
  }
}
```

---

## Agent Types and Patterns

### Planning Agent

**Purpose:** Analyze requirements, create implementation plan

**Characteristics:**

- Reads task description from Beads
- Researches codebase patterns
- Outputs structured plan
- Does NOT write code

**Output Example:**

```json
{
  "implementation_plan": {
    "files_to_create": ["src/services/user-service.js"],
    "files_to_modify": ["src/api/users.js", "src/auth/middleware.js"],
    "tests_to_create": ["__tests__/user-service.test.js"],
    "risks": ["Legacy auth system has known bugs"]
  }
}
```

### Coding Agent

**Purpose:** Implement code changes with TDD discipline

**Characteristics:**

- Follows implementation plan
- Writes failing tests first
- Implements code to pass tests
- Runs linter and compiler gates

**Output Example:**

```markdown
## Files Modified

- src/services/user-service.js (created)
- **tests**/user-service.test.js (created)

## Tests Status

✅ 5 tests pass

## Code Quality

✅ Lint passed
✅ Types compile
```

### Testing Agent

**Purpose:** Verify test coverage and quality

**Characteristics:**

- Runs full test suite
- Checks coverage thresholds
- Identifies untested edge cases
- May request additional tests

### Security Auditor

**Purpose:** Adversarial review for vulnerabilities

**Characteristics:**

- Looks for reasons to reject
- Checks OWASP Top 10
- Reviews auth and data handling
- Provides severity ratings

### Fix Specialist

**Purpose:** Fix specific errors with minimal context

**Characteristics:**

- Receives only context slices
- Focused on one specific error
- Applies surgical fixes
- Re-runs affected tests

### Conflict Resolver

**Purpose:** Resolve git merge conflicts

**Characteristics:**

- Analyzes 3-way diffs
- Identifies conflicting changes
- Proposes resolutions
- Documents decisions

---

## Testing Your Agent

### Manual Testing

Run the agent directly with a test task:

```bash
node lib/runner/index.js --task <test_task_id> --agent <your_agent_type>
```

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* node lib/runner/index.js --task <test_task_id> --agent <your_agent_type>
```

### Check Output Format

Verify agent returns expected JSON structure:

```bash
# After agent completes, check Beads metadata
bd show <test_task_id>
```

### Review progress.txt

Check what the agent wrote to `progress.txt`:

```bash
cat beads/<test_task_id>/progress.txt
```

### Validate Gates

Ensure gates are configured correctly:

1. Check `lib/workflows/<your_workflow>.js`
2. Verify gate configuration for your agent's stage
3. Test gates manually if needed:
   ```bash
   ubs <modified_files>
   npm test
   npm run lint
   ```

---

## Common Mistakes to Avoid

### 1. Too Much Context

**Bad:** Asking for entire files or codebases

**Good:** Requesting specific line ranges or functions

### 2. Ambiguous Instructions

**Bad:** "Make the code better"

**Good:** "Reduce complexity to < 10, improve variable names, add JSDoc comments"

### 3. Missing Completion Signal

**Bad:** Agent output ends without clear status

**Good:** Always include `## Completion Status` with clear success/fail marker

### 4. No Error Handling

**Bad:** Assuming everything works perfectly

**Good:** Explicitly handling common error cases and escalation paths

### 5. Vague Output Format

**Bad:** "Just tell me what you did"

**Good:** Structured JSON with required fields and types

### 6. Ignoring Workflow Context

**Bad:** Agent works in isolation, unaware of previous steps

**Good:** Agent references `progress.txt` learnings and builds on previous work

---

## Agent Checklist

Before marking an agent as ready for production:

- [ ] Agent markdown has clear role and persona
- [ ] Task description is specific and actionable
- [ ] Success criteria are defined
- [ ] Output format is structured (JSON preferred)
- [ ] Constraints are explicit
- [ ] Error handling is defined
- [ ] Example output provided
- [ ] Completion signals are clear
- [ ] Workflow transition is configured
- [ ] Gates are configured for this agent's stage
- [ ] Manual testing completed successfully
- [ ] progress.txt output is useful for next agents
