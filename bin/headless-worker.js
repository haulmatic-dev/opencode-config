#!/usr/bin/env node

/**
 * Headless Worker - Stateless worker for task execution
 * Uses Parallel Agent Spawn Middleware for worker lifecycle management
 */

const { execSync } = require('child_process');
const WorkerManager = require('../lib/parallel-agent-middleware');

const manager = new WorkerManager({ 
  mode: 'subprocess', 
  maxWorkers: 1,
  logDir: './logs'
});

async function runTask() {
  let taskReserved = false;
  let taskId = null;

  try {
    console.log('[Worker] Starting...');
    console.log('[Worker] Polling Beads for available tasks...');

    try {
      const readyOutput = execSync('bd ready --json', { encoding: 'utf8' }).trim();
      
      if (!readyOutput || readyOutput === '' || readyOutput === '[]') {
        console.log('[Worker] No tasks available, exiting...');
        return;
      }

      const tasks = JSON.parse(readyOutput);
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        console.log('[Worker] No tasks available, exiting...');
        return;
      }

      taskId = tasks[0].id;
      console.log(`[Worker] Claimed task: ${taskId} - ${tasks[0].title}`);

      console.log('[Worker] Reserving file paths via MCP...');
      execSync(`python3 -c "from mcp_agent_mail_client import reserve_file_paths; import asyncio; asyncio.run(reserve_file_paths(agent_name='headless-worker', paths=['src/**/*', 'tests/**/*'], ttl_seconds=3600))"`, { encoding: 'utf8' });
      taskReserved = true;

      console.log(`[Worker] Fetching task details: ${taskId}`);
      const taskDetails = execSync(`bd show ${taskId}`, { encoding: 'utf8' });
      console.log(taskDetails);
      
      console.log(`[Worker] Task ${taskId} completed (demonstration - no actual execution)`);
      execSync(`bd close ${taskId} --reason="Completed by headless worker (demo)"`, { encoding: 'utf8' });

    } catch (error) {
      if (error.stdout && error.stdout.includes('No ready work')) {
        console.log('[Worker] No tasks available, exiting...');
        return;
      }
      throw error;
    }

  } catch (error) {
    console.error(`[Worker] Error: ${error.message}`);
    console.error(`[Worker] Stack: ${error.stack}`);
    
    if (taskId) {
      console.log(`[Worker] Task ${taskId} failed`);
    }
    
    process.exit(1);

  } finally {
    if (taskReserved) {
      try {
        console.log('[Worker] Releasing file reservations...');
        execSync(`python3 -c "from mcp_agent_mail_client import release_file_reservations; import asyncio; asyncio.run(release_file_reservations(agent_name='headless-worker'))"`, { encoding: 'utf8' });
      } catch (error) {
        console.error('[Worker] Warning: Failed to release file reservations:', error.message);
      }
    }

    console.log('[Worker] Shutting down...');
    await manager.shutdown();
    process.exit(0);
  }
}

runTask();
