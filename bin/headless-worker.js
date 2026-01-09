#!/usr/bin/env node

const { execSync } = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    console.error(`Command failed: ${cmd}`);
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. Poll Beads for available tasks
const readyOutput = run('bd ready');
if (!readyOutput || readyOutput.includes('No ready work')) {
  console.log('No tasks available, sleeping 5s then exiting');
  setTimeout(() => process.exit(0), 5000);
  return;
}

// 2. Extract task_id from output
const taskId = readyOutput.match(/opencode-\w+/)?.[0];
if (!taskId) {
  console.error('Could not extract task ID from output');
  process.exit(1);
}

console.log(`Claimed task: ${taskId}`);
run(`bd update ${taskId} --status in_progress`);

// 3. Reserve file paths via MCP
try {
  run(`python3 -c "import asyncio; from mcp_agent_mail_client import reserve_file_paths, get_project_key; asyncio.run(reserve_file_paths(project_key=get_project_key(), agent_name='headless-worker', paths=['src/**/*', 'tests/**/*'], ttl_seconds=3600))"`);
} catch (error) {
  console.log('File reservation denied, retrying...');
  for (let i = 0; i < 3; i++) {
    try {
      setTimeout(() => {}, 5000);
      run(`python3 -c "import asyncio; from mcp_agent_mail_client import reserve_file_paths, get_project_key; asyncio.run(reserve_file_paths(project_key=get_project_key(), agent_name='headless-worker', paths=['src/**/*', 'tests/**/*'], ttl_seconds=3600))"`);
      break;
    } catch (retryError) {
      if (i === 2) {
        console.log('Reservation failed after 3 retries, exiting');
        run(`bd update ${taskId} --status open`);
        process.exit(1);
      }
    }
  }
}

// 4. Execute task using opencode
try {
  run(`opencode-task ${taskId}`);

  // 5. On success - complete task
  run(`bd close ${taskId} --reason="Completed"`);
  console.log(`Task ${taskId} completed successfully`);
} catch (error) {
  // 6. On failure - mark as failed
  console.error(`Task ${taskId} failed: ${error.message}`);
  run(`bd close ${taskId} --reason="Failed: ${error.message}"`);
}

// 7. Release file reservations via MCP
try {
  run(`python3 -c "import asyncio; from mcp_agent_mail_client import release_file_reservations, get_project_key; asyncio.run(release_file_reservations(project_key=get_project_key(), agent_name='headless-worker'))"`);
} catch (error) {
  console.warn('Warning: Could not release file reservations:', error.message);
}

// 8. Exit -> PM2 restarts -> claims next task
console.log('Worker exiting, PM2 will restart');
process.exit(0);
