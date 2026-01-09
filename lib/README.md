# Parallel Agent Spawn Middleware

Shared middleware for spawning headless opencode workers via PM2 or subprocess. Provides a unified API for agent orchestration and worker lifecycle management.

## Features

- **Unified API** - Single interface for spawning workers via PM2 or subprocess
- **Worker Lifecycle Management** - Automatic tracking of worker state (pending, running, completed, failed, timeout)
- **Health Monitoring** - Track memory usage, uptime, and worker status
- **Event System** - Listen to worker lifecycle events (started, completed, failed, timeout)
- **Error Handling** - Automatic retry logic with configurable max retries
- **Graceful Shutdown** - Clean termination of running workers with kill timeout
- **Logging** - Automatic log file creation for each worker

## Installation

```bash
npm install
```

The middleware is located at `lib/parallel-agent-middleware.js`.

## Quick Start

```javascript
const WorkerManager = require('./lib/parallel-agent-middleware');

const manager = new WorkerManager({ mode: 'subprocess', maxWorkers: 4 });

async function runExample() {
  const worker = await manager.spawn_headless_worker({
    agent_type: 'general',
    task_id: 'example-task-123',
    task_description: 'Example task description',
    timeout: 60000 // 1 minute
  });

  console.log('Worker spawned:', worker.id);
  console.log('PID:', worker.pid);
  console.log('Status:', worker.status);

  const results = await manager.wait_for_completion([worker]);
  console.log('Worker completed:', results);

  manager.cleanup_workers([worker.id]);
  await manager.shutdown();
}

runExample().catch(console.error);
```

## API Reference

### WorkerManager(options)

Creates a new worker manager instance.

**Options:**
- `mode` (string): 'pm2' or 'subprocess' (default: 'subprocess')
- `maxWorkers` (number): Maximum number of parallel workers (default: 6)
- `defaultTimeout` (number): Default timeout in milliseconds (default: 600000)
- `maxRetries` (number): Maximum retry attempts (default: 3)
- `logDir` (string): Directory for log files (default: './logs')

### spawn_headless_worker(config)

Spawns a new headless worker.

**Config:**
- `agent_type` (string): Type of agent to spawn
- `task_id` (string): Task identifier
- `task_description` (string): Description of the task
- `timeout` (number, optional): Timeout in milliseconds
- `retry_count` (number, optional): Current retry attempt (default: 0)

**Returns:** Promise resolving to worker object with:
- `id` (string): Unique worker ID
- `pid` (number): Process ID
- `status` (string): 'pending', 'running', 'completed', 'failed', or 'timeout'
- `started_at` (number): Unix timestamp
- `completed_at` (number): Unix timestamp
- `exit_code` (number): Process exit code
- `memory_usage` (number): Memory usage in MB

### wait_for_completion(workers, timeout)

Waits for workers to complete.

**Parameters:**
- `workers` (object or array): Worker object or array of workers
- `timeout` (number, optional): Maximum wait time in milliseconds

**Returns:** Promise resolving to array of worker objects with completion status.

### monitor_workers(pollInterval)

Starts monitoring workers for health and memory usage.

**Parameters:**
- `pollInterval` (number, optional): Poll interval in milliseconds (default: 5000)

**Events:**
- 'worker_memory_warning': Emits when worker exceeds 1GB memory
- 'worker_monitor_error': Emits on monitoring errors

### cleanup_workers(workerIds)

Cleans up completed/failed workers.

**Parameters:**
- `workerIds` (array, optional): Array of worker IDs to cleanup. If not provided, cleans up all non-running workers.

**Returns:** Array of cleanup results with worker_id and success status.

### get_worker_status(workerId)

Gets status of a single worker.

**Parameters:**
- `workerId` (string): Worker ID to query

**Returns:** Worker status object or null if not found.

### get_all_workers_status()

Gets status of all workers.

**Returns:** Array of worker status objects.

### spawn_parallel_workers(workers_config)

Spawns multiple workers in parallel.

**Parameters:**
- `workers_config` (array): Array of worker config objects

**Returns:** Promise resolving to array of spawned worker objects.

**Throws:** Error if worker count exceeds maxWorkers.

### shutdown()

Gracefully shuts down all running workers and cleans up resources.

**Returns:** Promise that resolves when shutdown is complete.

## Event System

The middleware emits events for worker lifecycle changes:

```javascript
manager.on('worker_started', (worker) => {
  console.log('Worker started:', worker.id);
});

manager.on('worker_complete', (worker) => {
  console.log('Worker completed:', worker.id);
});

manager.on('worker_error', (worker) => {
  console.error('Worker error:', worker.id, worker.error);
});

manager.on('worker_timeout', (worker) => {
  console.warn('Worker timeout:', worker.id);
});

manager.on('worker_memory_warning', (worker) => {
  console.warn('Worker memory warning:', worker.id);
});

manager.on('cleanup_error', ({ worker, error }) => {
  console.error('Cleanup error:', worker.id, error);
});

manager.on('shutdown_complete', () => {
  console.log('All workers shut down');
});
```

## Spawning Multiple Workers

```javascript
const workers = await manager.spawn_parallel_workers([
  {
    agent_type: 'codebase-researcher',
    task_id: 'research-architecture',
    task_description: 'Analyze architecture patterns',
    timeout: 300000
  },
  {
    agent_type: 'git-history-analyzer',
    task_id: 'analyze-history',
    task_description: 'Analyze git history',
    timeout: 300000
  },
  {
    agent_type: 'file-picker-agent',
    task_id: 'find-files',
    task_description: 'Find relevant files',
    timeout: 300000
  }
]);

console.log(`Spawned ${workers.length} workers in parallel`);

const results = await manager.wait_for_completion(workers);
console.log('All workers completed:', results);

manager.cleanup_workers(workers.map(w => w.id));
```

## Headless Worker Integration

The headless worker script (`bin/headless-worker.js`) uses the middleware:

```javascript
const WorkerManager = require('../lib/parallel-agent-middleware');

const manager = new WorkerManager({ 
  mode: 'subprocess', 
  maxWorkers: 1,
  logDir: './logs'
});

async function runTask() {
  const taskId = await fetchReadyTask();
  
  console.log(`[Worker] Claimed task: ${taskId}`);
  
  await executeTask(taskId);
  
  await manager.shutdown();
}

runTask();
```

## PM2 vs Subprocess

The middleware supports both PM2 and subprocess modes:

**PM2 Mode (Production):**
```javascript
const manager = new WorkerManager({ 
  mode: 'pm2',
  maxWorkers: 8 
});
```

**Subprocess Mode (Development):**
```javascript
const manager = new WorkerManager({ 
  mode: 'subprocess',
  maxWorkers: 4 
});
```

## Troubleshooting

### Worker Not Starting

Check if opencode command is available:
```bash
which opencode
opencode --version
```

### Worker Timeout

Increase timeout in worker config:
```javascript
const worker = await manager.spawn_headless_worker({
  agent_type: 'general',
  task_id: 'task-123',
  timeout: 600000 // 10 minutes
});
```

### Memory Issues

Worker is automatically killed if memory exceeds 1GB. Monitor memory warnings:
```javascript
manager.on('worker_memory_warning', (worker) => {
  console.warn('Worker using too much memory:', worker.memory_usage);
});
```

### Cleanup Issues

Force cleanup with kill timeout:
```javascript
manager.cleanup_workers([worker.id]);

// Manual cleanup
process.kill(worker.pid, 'SIGTERM');
setTimeout(() => {
  process.kill(worker.pid, 'SIGKILL');
}, 5000);
```

## Testing

Run unit tests:
```bash
node test-middleware.js
```

## License

MIT
