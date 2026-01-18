#!/usr/bin/env node

/**
 * Headless Worker for Parallel Task Execution
 *
 * Uses the Parallel Task Coordinator for atomic task claiming
 * instead of PID-based race conditions.
 */

import {
  createParallelTaskCoordinator,
  MESSAGE_TYPES,
  WORKER_STATUS,
} from '../lib/parallel-task-coordinator/index.js';

const pid = process.pid;
const workerId = `headless-worker-${pid}`;

let coordinator = null;
let isShuttingDown = false;

/**
 * Log with worker prefix
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [Worker-${pid}] ${message}`, data);
}

/**
 * Sleep for a given duration
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Initialize the worker with the coordinator
 */
async function initialize() {
  log('info', 'Initializing headless worker...');

  coordinator = createParallelTaskCoordinator({
    coordinatorName: 'task-coordinator',
    logger: {
      info: log.bind(null, 'info'),
      warn: log.bind(null, 'warn'),
      error: log.bind(null, 'error'),
      debug: log.bind(null, 'debug'),
    },
  });

  await coordinator.start();

  log('info', 'Coordinator started, registering worker...');

  const registerResult = await coordinator.registerWorker(workerId, {
    pid,
    instance: `worker-${pid}`,
    capabilities: ['task-execution'],
  });

  if (!registerResult.success) {
    log('error', 'Failed to register worker', registerResult);
    process.exit(1);
  }

  log('info', `Worker registered: ${workerId}`);

  // Start heartbeat
  await startHeartbeat();

  return true;
}

/**
 * Start heartbeat to coordinator
 */
async function startHeartbeat() {
  log('info', 'Starting heartbeat...');

  await coordinator.sendHeartbeat(workerId);

  // Heartbeat interval (30 seconds)
  setInterval(async () => {
    if (isShuttingDown) return;

    try {
      await coordinator.sendHeartbeat(workerId);
      log('debug', 'Heartbeat sent');
    } catch (error) {
      log('warn', 'Heartbeat failed', { error: error.message });
    }
  }, 30000);
}

/**
 * Execute a single task
 */
async function executeTask(taskId) {
  log('info', `Executing task: ${taskId}`);

  try {
    // Get task details
    const { execSync } = await import('child_process');
    const taskOutput = execSync(`bd show ${taskId}`, { encoding: 'utf8' });

    log('info', `Task details retrieved for: ${taskId}`);

    // Simulate task execution
    await sleep(2000);

    // Try file reservations via MCP Agent Mail
    let reservationsMade = false;
    try {
      const { reserveFilePaths, getProjectKey } = await import(
        '../lib/mcp-agent-mail/mcp_agent_mail_client.js'
      );
      await reserveFilePaths({
        projectKey: getProjectKey(),
        agentName: workerId,
        paths: ['src/**/*', 'tests/**/*'],
        ttlSeconds: 3600,
      });
      log('info', 'File paths reserved via MCP');
      reservationsMade = true;
    } catch (error) {
      log('warn', 'MCP file reservations not available', {
        error: error.message,
      });
    }

    // Complete the task
    await coordinator.completeTask(workerId, taskId, { result: 'success' });

    log('info', `Task ${taskId} completed successfully`);

    // Release file reservations
    if (reservationsMade) {
      try {
        const { releaseFileReservations, getProjectKey } = await import(
          '../lib/mcp-agent-mail/mcp_agent_mail_client.js'
        );
        await releaseFileReservations({
          projectKey: getProjectKey(),
          agentName: workerId,
        });
        log('info', 'File paths released');
      } catch (error) {
        log('warn', 'Failed to release file reservations', {
          error: error.message,
        });
      }
    }

    return true;
  } catch (error) {
    log('error', `Task ${taskId} failed`, { error: error.message });

    // Fail the task
    await coordinator.failTask(workerId, taskId, error.message);

    return false;
  }
}

/**
 * Main worker loop
 */
async function main() {
  log('info', 'Headless worker starting...');

  await initialize();

  log('info', 'Entering main work loop...');

  while (!isShuttingDown) {
    try {
      // Try to claim a task
      const claimResult = await coordinator.claimTask(workerId, {
        capabilities: ['task-execution'],
        priority: 'normal',
        max_tasks: 1,
      });

      if (claimResult.success) {
        log('info', `Claimed task: ${claimResult.task_id}`);

        await executeTask(claimResult.task_id);
      } else {
        // No tasks available or claim failed
        if (claimResult.error === 'no_ready_tasks') {
          log('debug', 'No tasks available, waiting...');
          await sleep(5000);
        } else if (claimResult.error === 'worker_task_limit_reached') {
          log('debug', 'Task limit reached, waiting...');
          await sleep(5000);
        } else if (claimResult.error === 'claim_race_condition') {
          // Another worker claimed first, quick retry
          await sleep(100);
        } else {
          log('warn', `Claim failed: ${claimResult.error}`, claimResult);
          await sleep(5000);
        }
      }
    } catch (error) {
      log('error', 'Error in main loop', { error: error.message });
      await sleep(5000);
    }
  }

  log('info', 'Worker shutting down...');
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  if (isShuttingDown) return;

  isShuttingDown = true;
  log('info', `Received ${signal}, shutting down gracefully...`);

  try {
    if (coordinator) {
      await coordinator.unregisterWorker(workerId);
      log('info', 'Worker unregistered');

      await coordinator.stop();
      log('info', 'Coordinator stopped');
    }
  } catch (error) {
    log('error', 'Error during shutdown', { error: error.message });
  }

  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Unhandled rejection', { reason: String(reason) });
});

// Start the worker
main().catch((error) => {
  log('error', 'Worker failed to start', { error: error.message });
  process.exit(1);
});
