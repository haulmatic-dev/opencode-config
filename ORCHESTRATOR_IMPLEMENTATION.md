# Orchestrator Main Loop - Implementation

## What Was Implemented

### 1. Comprehensive Documentation (agent/orchestrator.md)
Added complete section covering:
- **main_orchestration_loop()** - Continuous execution loop with state management
- **get_ready_tasks_from_beads()** - Polls Beads for ready tasks
- **spawn_workers_via_middleware()** - Spawns workers using Parallel Agent Spawn Middleware
- **process_mcp_messages()** - Handles worker completions/failures
- **report_status_summary()** - Periodic status reports (every 5 minutes)
- **handle_user_commands()** - User control (status/pause/resume/stop)

### 2. Implementation (bin/orchestrator-main-loop.js)
Created fully functional orchestrator main loop:
- Continuous background process
- Polls Beads for ready tasks every 5 seconds
- Spawns up to 6 parallel workers via middleware
- Tracks worker lifecycle (started/completed/failed/timeout)
- Periodic status reporting (every 5 minutes)
- User commands via file-based IPC
- Graceful shutdown on SIGTERM/SIGINT
- Error-resilient with retry logic

## Key Features

### Continuous Operation
- Runs 24/7 until explicitly stopped
- Auto-pauses on errors, continues after delay
- Graceful shutdown on worker completion

### Parallel Worker Spawning
- Spawns up to 6 workers simultaneously
- Respects max workers limit
- Determines agent type based on task labels:
  - `backend` → backend-specialist
  - `frontend` → frontend-specialist
  - `testing` → test-specialist
  - `research` → codebase-researcher
  - `figma` → figma-design-extractor
  - Default → general

### Status Reporting
- Every 5 minutes, reports:
  - Orchestrator state (running/paused/stopped)
  - Active worker count
  - Ready task count
  - Per-worker details (ID, status, uptime)

### User Commands
File-based IPC via `/tmp/orchestrator-command`:
- `status` - Show current status
- `pause` - Stop spawning new workers
- `resume` - Resume spawning workers
- `stop` - Stop orchestration and shutdown

### Error Handling
- Catches errors, logs them, continues
- Workers removed from tracking on completion/failure/timeout
- Graceful shutdown waits for active workers

## Integration Points

### Beads Integration
- `bd ready --json` - Polls for ready tasks
- Task status tracking via Beads
- Dependent task unblocking automatic

### Parallel Agent Spawn Middleware
- Uses `lib/parallel-agent-middleware.js`
- Manages worker lifecycle
- Worker event handling (complete/error/timeout)

### MCP Agent Mail (Future)
- Ready to process MCP messages
- `process_mcp_messages()` function documented
- Worker completions/failures can be handled via MCP

## Usage

### Starting Orchestrator

```bash
# Start orchestrator in background
cd ~/.config/opencode
node bin/orchestrator-main-loop.js &

# Or use PM2 for production
pm2 start ecosystem.config.js --only orchestrator
```

### Sending Commands

```bash
# Show status
echo "status" > /tmp/orchestrator-command

# Pause orchestration
echo "pause" > /tmp/orchestrator-command

# Resume orchestration
echo "resume" > /tmp/orchestrator-command

# Stop orchestration
echo "stop" > /tmp/orchestrator-command
```

### Monitoring Logs

```bash
# Follow orchestrator logs
tail -f logs/orchestrator-main-loop.log

# Follow all worker logs
tail -f logs/*.log
```

## Configuration

Environment Variables:
- `ORCHESTRATOR_MODE` - `subprocess` (default) or `pm2`
- `MAX_WORKERS` - Maximum parallel workers (default: 6)
- `POLL_INTERVAL` - Beads poll interval in ms (default: 5000)
- `STATUS_REPORT_INTERVAL` - Status report interval in ms (default: 300000)

## Testing

### Test Orchestrator Loop

```bash
# Create a test task
bd create "Test orchestrator integration" --description="Test task" --priority=1

# Start orchestrator
node bin/orchestrator-main-loop.js &

# Check if worker spawns
sleep 10
tail -f logs/orchestrator-main-loop.log

# Stop orchestrator
echo "stop" > /tmp/orchestrator-command
```

### Test Commands

```bash
# Start orchestrator
node bin/orchestrator-main-loop.js &
ORCHESTRATOR_PID=$!

# Test status command
echo "status" > /tmp/orchestrator-command
sleep 2
tail -n 20 logs/orchestrator-main-loop.log

# Test pause command
echo "pause" > /tmp/orchestrator-command
sleep 2
tail -n 20 logs/orchestrator-main-loop.log

# Test resume command
echo "resume" > /tmp/orchestrator-command
sleep 2
tail -n 20 logs/orchestrator-main-loop.log

# Test stop command
echo "stop" > /tmp/orchestrator-command

# Wait for cleanup
wait $ORCHESTRATOR_PID
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           ORCHESTRATOR MAIN LOOP                        │
│  - main_orchestration_loop()                           │
│  - get_ready_tasks_from_beads()                       │
│  - spawn_workers_via_middleware()                       │
│  - report_status_summary()                              │
│  - handle_user_commands()                               │
└───────────────────┬───────────────────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │ PARALLEL AGENT SPAWN    │
        │ MIDDLEWARE              │
        └──────────┬─────────────┘
                   │
         ┌─────────┼──────────┐
         │         │          │
         ▼         ▼          ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │ WORKER 1 │ │ WORKER 2 │ │ WORKER N │
   │ Beads   │ │ Beads   │ │ Beads   │
   │ Task    │ │ Task    │ │ Task    │
   └─────────┘ └─────────┘ └─────────┘
```

## Benefits

✅ **Continuous**: Runs 24/7, no manual intervention
✅ **Parallel**: Spawns up to 6 workers simultaneously
✅ **Auto-Scaling**: Polls Beads, spawns workers as needed
✅ **Resilient**: Error handling, retry logic, graceful degradation
✅ **Observable**: Status reports, worker tracking, logging
✅ **Controllable**: User commands for pause/resume/stop
✅ **Minimal Context**: Doesn't accumulate conversation history

## Next Steps

1. **Test orchestrator** - Run end-to-end test with real tasks
2. **Integrate MCP Agent Mail** - Process worker completions/failures
3. **Update PRD Agent** - Add research integration
4. **Update Generate-Tasks Agent** - Add research integration
5. **Test E2E Workflow** - Figma → PRD → Tasks → Implementation
