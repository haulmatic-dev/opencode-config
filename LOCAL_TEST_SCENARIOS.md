# Local Test Scenarios

## Purpose
Create test scenarios to validate headless worker, PM2, and Beads integration

## Prerequisites
- PM2 installed globally
- Headless worker script created (`~/.config/opencode/bin/headless-worker.js`)
- Ecosystem configuration created (`~/.config/opencode/ecosystem.config.js`)
- Beads CLI working (`bd`)

## Test Scenarios

### Scenario 1: Basic Worker Execution

**Objective:** Verify worker can claim, execute, and complete tasks

**Steps:**
```bash
# Create test tasks
bd create --title="Test: Write unit tests" --type=task --priority=1 --description="Write unit tests for feature X"
bd create --title="Test: Implement feature" --type=task --priority=1 --description="Implement feature X"
bd create --title="Test: Run tests" --type=task --priority=1 --description="Run tests for feature X"

# Start PM2 with 1 worker
export PATH="/Users/buddhi/.nodenv/versions/22.20.0/bin:$PATH"
pm2 start ecosystem.config.js

# Monitor execution
pm2 logs --lines 50

# Expected behavior:
# 1. Worker claims first task
# 2. Worker reserves files (if MCP available)
# 3. Worker executes task (via opencode-task)
# 4. Worker releases files (if MCP available)
# 5. Worker exits
# 6. PM2 restarts worker
# 7. Worker claims next task

# After 5 minutes, check task status
bd list --status=closed

# Stop PM2
pm2 stop all
pm2 delete all
```

**Verification:**
- [ ] PM2 starts successfully
- [ ] Worker claims tasks from Beads
- [ ] Worker executes tasks
- [ ] Worker exits and PM2 restarts
- [ ] Tasks marked as closed in Beads

### Scenario 2: Worker Scaling

**Objective:** Verify PM2 can scale workers up/down

**Steps:**
```bash
# Start with 1 worker
export PATH="/Users/buddhi/.nodenv/versions/22.20.0/bin:$PATH"
pm2 start ecosystem.config.js
pm2 scale headless-swarm 1

# Create 5 tasks
for i in {1..5}; do
  bd create --title="Test: Task $i" --type=task --priority=1 --description="Test task $i"
done

# Monitor execution (should be slow with 1 worker)
pm2 logs --lines 20

# Scale to 4 workers
pm2 scale headless-swarm 4

# Monitor execution (should be faster with 4 workers)
pm2 logs --lines 20

# Scale down to 2 workers
pm2 scale headless-swarm 2

# Stop PM2
pm2 stop all
pm2 delete all
```

**Verification:**
- [ ] PM2 starts with 1 worker
- [ ] PM2 scales up to 4 workers
- [ ] PM2 scales down to 2 workers
- [ ] Multiple workers process tasks in parallel
- [ ] No duplicate task claims

### Scenario 3: Empty Task Queue

**Objective:** Verify worker exits gracefully when no tasks available

**Steps:**
```bash
# Ensure no ready tasks
bd list --status=open | grep "Ready work"

# Start PM2
export PATH="/Users/buddhi/.nodenv/versions/22.20.0/bin:$PATH"
pm2 start ecosystem.config.js

# Monitor logs (should see "No tasks available")
pm2 logs --lines 20

# Wait 5 seconds, check PM2 status
pm2 list

# Stop PM2
pm2 stop all
pm2 delete all
```

**Verification:**
- [ ] Worker detects no tasks
- [ ] Worker sleeps 5 seconds
- [ ] Worker exits gracefully
- [ ] PM2 restarts worker
- [ ] Worker checks again for tasks

### Scenario 4: Error Handling

**Objective:** Verify worker handles task failures correctly

**Steps:**
```bash
# Create a task that will fail (simulate with invalid command)
bd create --title="Test: Failing task" --type=task --priority=1 --description="Test task failure handling"

# Start PM2
export PATH="/Users/buddhi/.nodenv/versions/22.20.0/bin:$PATH"
pm2 start ecosystem.config.js

# Monitor logs
pm2 logs --lines 50

# Check if task marked as failed
bd list --status=closed | grep "Failing task"

# Stop PM2
pm2 stop all
pm2 delete all
```

**Verification:**
- [ ] Worker claims task
- [ ] Worker executes task
- [ ] Task fails (expected)
- [ ] Worker catches error
- [ ] Worker marks task as failed
- [ ] Worker exits gracefully
- [ ] PM2 restarts worker

### Scenario 5: Code Quality Checks

**Objective:** Verify linting and formatting work

**Steps:**
```bash
# Run lint check
npm run lint

# Run format check
npm run format:check

# Run format
npm run format

# Run lint fix
npm run lint:fix
```

**Verification:**
- [ ] ESLint runs without errors
- [ ] Prettier formats code
- [ ] Scripts in package.json work

## Success Criteria

All scenarios execute successfully:
- [ ] PM2 manages worker lifecycle
- [ ] Workers claim and complete tasks
- [ ] Workers exit and restart correctly
- [ ] Scaling works (1 → 4 → 2 workers)
- [ ] Empty queue handled gracefully
- [ ] Error handling works correctly
- [ ] Code quality tools work
- [ ] No manual intervention needed

## Next Steps

After all tests pass:
1. Implement test-specialist agent (Stage 1)
2. Implement code-reviewer agent (Stage 5)
3. Implement deployment-specialist agent (Stage 6)
4. Create GitHub Actions CI/CD pipeline
5. Set up monitoring stack (Prometheus, Grafana, Sentry)
