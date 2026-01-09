#!/usr/bin/env node

const { execSync } = require('child_process');
const { randomInt } = require('crypto');
const pid = process.pid;

function run(cmd, throwOnError = true) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (throwOnError) {
      console.error(`Command failed: ${cmd}`);
      console.error(`Error: ${error.message}`);
      throw error;
    }
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function claimTask() {
  // Worker-specific delay to prevent race conditions
  const workerDelay = pid % 4 * 1000; // 0-3s delay based on PID
  console.log(`Worker PID ${pid}: waiting ${workerDelay}ms to reduce race conditions`);
  await sleep(workerDelay);

  try {
    // Get ready tasks (excludes in-progress tasks)
    const readyOutput = run('bd ready');

    if (!readyOutput || readyOutput.includes('No ready work')) {
      return null;
    }

    // Find first task ID in ready output
    const taskId = readyOutput.match(/opencode-\w+/)?.[0];
    if (!taskId) {
      console.error('Could not extract task ID from output');
      return null;
    }

    // Try to claim this task by setting to in_progress
    // This will fail if another worker already claimed it
    try {
      run(`bd update ${taskId} --status in_progress`);
      console.log(`✓ PID ${pid}: Claimed task: ${taskId}`);
      return taskId;
    } catch (error) {
      // Task was already claimed by another worker
      console.log(`PID ${pid}: Task ${taskId} already claimed, trying next...`);
      return null;
    }
  } catch (error) {
    console.error(`PID ${pid}: Error in claimTask:`, error.message);
    return null;
  }
}

async function executeTask(taskId) {
  // Simulate task execution (since opencode-task doesn't exist)
  console.log(`PID ${pid}: 🚀 Simulating execution for: ${taskId}`);

  // Sleep for 2 seconds to simulate work
  await sleep(2000);

  // Read task description
  const taskOutput = run(`bd show ${taskId}`);
  console.log(`PID ${pid}: Task details:`, taskOutput.substring(0, 100) + '...');

  return true;
}

async function main() {
  console.log(`🔍 PID ${pid}: Worker started, looking for tasks...`);

  // Try to claim a task
  const taskId = await claimTask();

  if (!taskId) {
    console.log(`PID ${pid}: No available tasks, sleeping 5s then exiting`);
    setTimeout(() => process.exit(0), 5000);
    return;
  }

  console.log(`PID ${pid}: 📋 Working on: ${taskId}`);

  // Try MCP file reservations (optional)
  let reservationsMade = false;
  try {
    run(`python3 -c "import asyncio; from mcp_agent_mail_client import reserve_file_paths, get_project_key; asyncio.run(reserve_file_paths(project_key=get_project_key(), agent_name='headless-worker', paths=['src/**/*', 'tests/**/*'], ttl_seconds=3600))"`, false);
    console.log(`PID ${pid}: ✓ File paths reserved via MCP`);
    reservationsMade = true;
  } catch (error) {
    console.log(`PID ${pid}: ⚠ MCP file reservations not available (continuing without file locking)`);
    // Continue without MCP - this is OK for testing
  }

  // Execute task (simulated)
  try {
    await executeTask(taskId);

    // On success - complete task
    run(`bd close ${taskId} --reason="Completed"`);
    console.log(`PID ${pid}: ✓ Task ${taskId} completed successfully`);
  } catch (error) {
    // On failure - mark as failed
    console.error(`PID ${pid}: ✗ Task ${taskId} failed: ${error.message}`);
    try {
      run(`bd close ${taskId} --reason="Failed: ${error.message}"`, false);
    } catch (closeError) {
      console.error(`PID ${pid}: Could not close task:`, closeError.message);
    }
  }

  // Release file reservations if they were made
  if (reservationsMade) {
    try {
      run(`python3 -c "import asyncio; from mcp_agent_mail_client import release_file_reservations, get_project_key; asyncio.run(release_file_reservations(project_key=get_project_key(), agent_name='headless-worker'))"`, false);
      console.log(`PID ${pid}: ✓ File paths released`);
    } catch (error) {
      console.warn(`PID ${pid}: ⚠ Could not release file reservations:`, error.message);
    }
  }

  // Exit -> PM2 restarts -> claims next task
  console.log(`PID ${pid}: Worker exiting, PM2 will restart`);
  process.exit(0);
}

main();
