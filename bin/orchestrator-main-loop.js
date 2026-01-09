#!/usr/bin/env node

/**
 * Orchestrator Main Loop - Continuous Background Process
 * 
 * Coordinates task execution by:
 * - Polling Beads for ready tasks
 * - Spawning headless workers via Parallel Agent Spawn Middleware
 * - Monitoring worker completions/failures
 * - Processing MCP Agent Mail messages
 * - Reporting periodic status (every 5 minutes)
 * - Handling user commands (pause/resume/stop)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const WorkerManager = require('../lib/parallel-agent-middleware');

// Configuration
const MAX_WORKERS = 6;
const POLL_INTERVAL = 5000; // 5 seconds
const STATUS_REPORT_INTERVAL = 300000; // 5 minutes
const MODE = process.env.ORCHESTRATOR_MODE || 'subprocess';
const LOG_DIR = path.join(__dirname, 'logs');
const COMMAND_FILE = '/tmp/orchestrator-command';

// Orchestrator State
const state = {
  running: false,
  paused: false,
  workers: new Map(),
  last_status_report: 0
};

// Worker Manager
const worker_manager = new WorkerManager({
  mode: MODE,
  maxWorkers: MAX_WORKERS,
  logDir: LOG_DIR
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function get_ready_tasks_from_beads() {
  try {
    const output = execSync('bd ready --json', { encoding: 'utf8' });
    const ready_tasks = JSON.parse(output);
    return ready_tasks;
  } catch (error) {
    if (error.stdout && error.stdout.includes('No ready work')) {
      return [];
    }
    console.error('[Orchestrator] Failed to fetch ready tasks:', error.message);
    return [];
  }
}

function determine_agent_type(task) {
  const labels = task.labels || [];
  
  if (labels.includes('backend')) return 'backend-specialist';
  if (labels.includes('frontend')) return 'frontend-specialist';
  if (labels.includes('testing')) return 'test-specialist';
  if (labels.includes('research')) return 'codebase-researcher';
  if (labels.includes('figma')) return 'figma-design-extractor';
  
  // Check task type
  if (task.type === 'bug') return 'general';
  if (task.type === 'feature') return labels.includes('backend') ? 'backend-specialist' : 'frontend-specialist';
  
  return 'general';
}

async function spawn_worker_via_middleware(task) {
  try {
    const worker = await worker_manager.spawn_headless_worker({
      agent_type: determine_agent_type(task),
      task_id: task.id,
      task_description: task.description,
      timeout: task.estimate || 600000
    });

    console.log(`[Orchestrator] Spawned worker ${worker.id} for task ${task.id}`);
    
    return worker;
  } catch (error) {
    console.error(`[Orchestrator] Failed to spawn worker for task ${task.id}:`, error.message);
    throw error;
  }
}

function handle_worker_completion(worker) {
  console.log(`[Orchestrator] ✅ Worker ${worker.id} completed task ${worker.task_id}`);
  state.workers.delete(worker.id);
}

function handle_worker_error(worker) {
  console.error(`[Orchestrator] ❌ Worker ${worker.id} failed task ${worker.task_id}`);
  state.workers.delete(worker.id);
}

function handle_worker_timeout(worker) {
  console.error(`[Orchestrator] ⏱️ Worker ${worker.id} timed out task ${worker.task_id}`);
  state.workers.delete(worker.id);
}

async function report_status_summary() {
  try {
    const ready_tasks = await get_ready_tasks_from_beads();
    
    const summary = {
      timestamp: new Date().toISOString(),
      running: state.running,
      paused: state.paused,
      active_workers: state.workers.size,
      worker_details: Array.from(state.workers.values()).map(w => ({
        id: w.id,
        task_id: w.task_id,
        status: w.status,
        uptime: w.started_at ? Date.now() - w.started_at : null
      })),
      total_ready_tasks: ready_tasks.length
    };

    console.log('\n=== ORCHESTRATOR STATUS ===');
    console.log(`Time: ${summary.timestamp}`);
    console.log(`Status: ${summary.running ? 'RUNNING' : 'STOPPED'} ${summary.paused ? '(PAUSED)' : ''}`);
    console.log(`Active Workers: ${summary.active_workers}/${MAX_WORKERS}`);
    console.log(`Ready Tasks: ${summary.total_ready_tasks}`);
    
    if (summary.active_workers > 0) {
      console.log('\nActive Workers:');
      summary.worker_details.forEach(w => {
        const uptime = w.uptime ? Math.floor(w.uptime / 1000) : 0;
        console.log(`  - ${w.task_id}: ${w.status} (${uptime}s)`);
      });
    }
    
    console.log('========================\n');
    
  } catch (error) {
    console.error('[Orchestrator] Failed to report status:', error.message);
  }
}

async function handle_user_commands() {
  try {
    if (!fs.existsSync(COMMAND_FILE)) {
      return;
    }

    const command = fs.readFileSync(COMMAND_FILE, 'utf8').trim();
    fs.unlinkSync(COMMAND_FILE);

    console.log(`[Orchestrator] Received command: ${command}`);

    switch (command) {
      case 'status':
        await report_status_summary();
        break;
      
      case 'pause':
        state.paused = true;
        console.log('[Orchestrator] ⏸️  Paused (will not spawn new workers)');
        break;
      
      case 'resume':
        state.paused = false;
        console.log('[Orchestrator] ▶️  Resumed (will spawn new workers)');
        break;
      
      case 'stop':
        state.running = false;
        console.log('[Orchestrator] 🛑  Stopping...');
        break;
      
      default:
        console.warn(`[Orchestrator] Unknown command: ${command}`);
        console.log('[Orchestrator] Available commands: status, pause, resume, stop');
    }

  } catch (error) {
    console.error('[Orchestrator] Failed to handle user command:', error.message);
  }
}

async function main_orchestration_loop() {
  console.log('[Orchestrator] Starting main orchestration loop...');
  console.log(`[Orchestrator] Mode: ${MODE}, Max Workers: ${MAX_WORKERS}`);
  
  state.running = true;
  state.last_status_report = Date.now();

  // Setup worker event handlers
  worker_manager.on('worker_complete', handle_worker_completion);
  worker_manager.on('worker_error', handle_worker_error);
  worker_manager.on('worker_timeout', handle_worker_timeout);

  while (state.running) {
    try {
      // Check for user commands
      await handle_user_commands();

      // If paused, just wait and continue
      if (state.paused) {
        await sleep(POLL_INTERVAL);
        continue;
      }

      // Step 1: Poll Beads for ready tasks
      const ready_tasks = await get_ready_tasks_from_beads();

      // Step 2: Spawn workers for ready tasks (respect maxWorkers)
      const available_slots = MAX_WORKERS - state.workers.size;
      const tasks_to_spawn = ready_tasks.slice(0, available_slots);
      
      for (const task of tasks_to_spawn) {
        const worker = await spawn_worker_via_middleware(task);
        state.workers.set(worker.id, worker);
      }

      // Step 3: Report status periodically (every 5 minutes)
      const now = Date.now();
      if (now - state.last_status_report > STATUS_REPORT_INTERVAL) {
        await report_status_summary();
        state.last_status_report = now;
      }

      // Sleep before next iteration
      await sleep(POLL_INTERVAL);

    } catch (error) {
      console.error('[Orchestrator] Orchestration loop error:', error.message);
      console.error('[Orchestrator] Stack:', error.stack);
      await sleep(10000); // Wait longer on error
    }
  }

  // Graceful shutdown
  console.log('[Orchestrator] Shutting down...');
  console.log(`[Orchestrator] Waiting for ${state.workers.size} active workers to complete...`);
  
  await worker_manager.shutdown();
  
  console.log('[Orchestrator] Shutdown complete');
  process.exit(0);
}

// Handle SIGTERM/SIGINT for graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Orchestrator] Received SIGTERM, shutting down...');
  state.running = false;
});

process.on('SIGINT', () => {
  console.log('[Orchestrator] Received SIGINT, shutting down...');
  state.running = false;
});

// Start orchestration
main_orchestration_loop().catch(error => {
  console.error('[Orchestrator] Fatal error:', error.message);
  console.error('[Orchestrator] Stack:', error.stack);
  process.exit(1);
});
