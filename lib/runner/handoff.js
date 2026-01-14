import { createHash } from 'node:crypto';
import { BeadsClient } from '../beads-client.mjs';
import { workflow } from '../workflows/feature-dev.js';
import { compactGraphForRootCause } from './compaction.js';
import {
  checkForConflicts,
  cleanupTaskBranch,
  performSquashMerge,
} from './merge.js';
import {
  abortRebase,
  checkNeedsRebase,
  performRebase,
  updateRebaseMetadata,
} from './rebase.js';

const beadsClient = new BeadsClient();

export async function checkIrreversibleAction(taskId) {
  try {
    const task = await beadsClient.show(taskId);
    if (!task) {
      console.warn(`[Irreversible] Task not found: ${taskId}`);
      return { isIrreversible: false };
    }

    let metadata = null;
    if (task.metadata) {
      if (typeof task.metadata === 'string') {
        try {
          metadata = JSON.parse(task.metadata);
        } catch {
          metadata = {};
        }
      } else {
        metadata = task.metadata;
      }
    }

    const isIrreversible = metadata?.irreversible === true;
    const approvalGranted = metadata?.approval_granted === true;

    if (isIrreversible) {
      console.log(`[Irreversible] Task ${taskId} is marked as IRREVERSIBLE`);

      if (!approvalGranted) {
        console.warn(
          `[Irreversible] ⚠ Auto-merge BLOCKED - requires manual approval`,
        );
        return {
          isIrreversible: true,
          canMerge: false,
          reason: 'Irreversible action requires human approval',
          requiresApproval: true,
        };
      } else {
        console.log(`[Irreversible] ✓ Approval granted, merge allowed`);
        return {
          isIrreversible: true,
          canMerge: true,
          reason: 'Irreversible action with human approval',
        };
      }
    }

    return { isIrreversible: false, canMerge: true };
  } catch (error) {
    console.error(
      `[Irreversible] Error checking irreversible status:`,
      error.message,
    );
    return { isIrreversible: false, canMerge: true };
  }
}

async function updateBeadsStatus(taskId, status, metadata = {}) {
  console.log(`[Relay] Updating task ${taskId} to: ${status}`);
  try {
    const updates = { status };

    if (metadata.current_agent) {
      updates.notes = JSON.stringify({
        current_agent: metadata.current_agent,
        attempt: metadata.attempt,
        last_gate_failure: metadata.last_gate_failure,
        updated_at: new Date().toISOString(),
      });
    }

    await beadsClient.update(taskId, updates);
    console.log(`[Relay] ✓ Task updated`);
  } catch (error) {
    console.error(`[Relay] ✗ Failed to update task:`, error.message);
    throw error;
  }
}

export { updateBeadsStatus };

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function spawnAgent(
  taskId,
  _agentType,
  nextAgent,
  _workflowConfig,
) {
  const logDir = join(__dirname, '../../logs');

  try {
    mkdirSync(logDir, { recursive: true });
  } catch (_err) {}

  const logPath = join(logDir, `${taskId}-${nextAgent}-${Date.now()}.log`);
  const logStream = createWriteStream(logPath);

  console.log(`[Relay] Spawning agent: ${nextAgent} (PID will be logged)`);

  const child = spawn(
    'node',
    [
      join(__dirname, 'index.js'),
      '--task',
      taskId,
      '--agent',
      nextAgent,
      '--workflow',
      'feature-dev',
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, AGENT_TYPE: nextAgent, NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    },
  );

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  return { child, logPath };
}

export async function waitForCompletion(childProcess, timeoutMs) {
  const controller = new AbortController();

  if (timeoutMs) {
    console.log(`[Relay] Setting timeout: ${timeoutMs}ms`);
    setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const [exitCode, signal] = await once(childProcess, 'exit', {
      signal: controller.signal,
    });

    if (signal) {
      console.log(`[Relay] Process terminated by signal: ${signal}`);
      return {
        exitCode: null,
        signal,
        timedOut: signal.name === 'AbortError',
        error: signal.name === 'AbortError' ? 'timeout' : 'terminated',
      };
    }

    console.log(`[Relay] Process exited with code: ${exitCode}`);
    return {
      exitCode,
      signal: null,
      timedOut: false,
      error: exitCode !== 0 ? `Exit code ${exitCode}` : null,
    };
  } catch (err) {
    console.error('[Relay] Error waiting for process:', err.message);
    return {
      exitCode: null,
      signal: null,
      timedOut: true,
      error: err.message,
    };
  }
}

export function determineNextState(currentState, gateResults = []) {
  console.log(
    `[Relay] Determining next state from: ${currentState}, gates: ${gateResults.length}`,
  );

  const stateConfig = workflow.transitions[currentState];

  if (!stateConfig) {
    throw new Error(`Invalid workflow state: ${currentState}`);
  }

  const gatesFailed = gateResults.some((r) => !r.passed);

  if (gatesFailed) {
    const failedGates = gateResults
      .filter((r) => !r.passed)
      .map((r) => r.name)
      .join(', ');
    console.log(`[Relay] Gates failed: ${failedGates}`);

    return {
      nextState: stateConfig.onFail,
      failed: true,
      reason: `Gates failed: ${failedGates}`,
      gateResults,
    };
  }

  console.log(
    `[Relay] All gates passed, transitioning to: ${stateConfig.onSuccess}`,
  );

  return {
    nextState: stateConfig.onSuccess,
    failed: false,
    reason: 'All gates passed',
    gateResults,
  };
}

export async function handleAgentFailure(
  taskId,
  currentState,
  error,
  exitCode,
  signal,
) {
  console.log(
    `[Relay] Handling agent failure for task: ${taskId}, state: ${currentState}`,
  );

  const beadsClient = new BeadsClient();

  const fingerprintData = `${taskId}:${currentState}:${error.name}:${error.stack?.substring(0, 200) || ''}`;
  const fingerprint = createHash('sha256')
    .update(fingerprintData)
    .digest('hex');

  console.log(`[Relay] Failure fingerprint: ${fingerprint}`);

  const existingTasks = await beadsClient.list({
    status: 'open',
    limit: 50,
  });

  const existingFixTask = existingTasks.find(
    (t) => t.title.includes('FIX') && t.description.includes(fingerprint),
  );

  if (existingFixTask) {
    console.log(`[Relay] Found existing fix task: ${existingFixTask.id}`);

    await beadsClient.update(taskId, {
      status: 'blocked',
      notes: `Waiting for fix task: ${existingFixTask.id}`,
    });

    return {
      existingFixTaskId: existingFixTask.id,
      action: 'linked_to_existing_fix',
    };
  }

  const task = await beadsClient.show(taskId);

  if (!task) {
    console.log(`[Relay] Task not found: ${taskId}, cannot create fix task`);
    return {
      error: 'task_not_found',
      taskId,
    };
  }

  const attempts = task.metadata?.attempts?.[currentState] || 0;
  const maxRetries = workflow.global.retryBudgets?.[currentState] || 3;

  if (attempts >= maxRetries) {
    console.log(
      `[Relay] Max retries (${maxRetries}) exceeded for state: ${currentState}`,
    );
    await beadsClient.update(taskId, {
      status: 'human_escalation',
      notes: `Max retries exceeded. Manual intervention required.`,
    });

    return {
      maxRetriesExceeded: true,
      attempts,
      maxRetries,
    };
  }

  const fixTaskTitle = `FIX: ${taskId} failed in state: ${currentState}`;
  const fixTaskDescription = `
 Task ${taskId} failed in state: ${currentState}
 
 Error: ${error.message}
 Exit Code: ${exitCode}
 Signal: ${signal || 'none'}
 
 Fingerprint: ${fingerprint}
 
 Failed State: ${currentState}
 Current Attempts: ${attempts + 1} / ${maxRetries}
 
 Agent: Implement fix and retry the workflow from state: ${currentState}.
   `.trim();

  const fixTask = await beadsClient.create(
    fixTaskTitle,
    fixTaskDescription,
    0,
    {
      type: 'fix',
      agent_role: 'fixing',
      metadata: JSON.stringify({
        original_task: taskId,
        failed_state: currentState,
        fingerprint: fingerprint,
        auto_generated: true,
      }),
    },
  );

  console.log(`[Relay] Created fix task: ${fixTask.id}`);

  await beadsClient.depAdd(taskId, fixTask.id, 'blocking');
  console.log(`[Relay] Linked task ${taskId} blocked by ${fixTask.id}`);

  await beadsClient.update(taskId, {
    status: 'retrying',
    notes: `Created fix task: ${fixTask.id}, waiting for resolution`,
  });

  return {
    fixTaskId: fixTask.id,
    action: 'created_fix_task',
    fingerprint,
  };
}

export async function executeHandoff(taskId, currentState = workflow.start) {
  console.log(
    `[Relay] Starting handoff for task: ${taskId}, current state: ${currentState}`,
  );

  let iterations = 0;
  const maxIterations = 20;

  while (currentState && iterations < maxIterations) {
    iterations++;
    console.log(`[Relay] Iteration ${iterations}: State = ${currentState}`);

    const rebaseCheck = await checkNeedsRebase(taskId);
    if (rebaseCheck.needsRebase) {
      console.log(`[Relay] Performing reactive rebase...`);
      const rebaseResult = await performRebase(taskId);

      await updateRebaseMetadata(taskId, {
        attempted: true,
        success: rebaseResult.success,
        hasConflicts: rebaseResult.hasConflicts,
      });

      if (!rebaseResult.success) {
        if (rebaseResult.hasConflicts) {
          console.log(
            `[Relay] Rebase conflicts detected, spawning ConflictResolver`,
          );
          await beadsClient.update(taskId, {
            status: 'blocked',
            notes: 'Rebase conflicts detected, requires manual resolution',
          });
          return {
            finalState: 'blocked',
            iterations,
            error: 'rebase_conflicts',
          };
        }

        console.error(`[Relay] ✗ Rebase failed: ${rebaseResult.error}`);
        const abortResult = await abortRebase();
        if (abortResult.success) {
          console.log('[Relay] Rebase aborted');
        }

        await beadsClient.update(taskId, {
          status: 'blocked',
          notes: `Rebase failed: ${rebaseResult.error}`,
        });
        return {
          finalState: 'blocked',
          iterations,
          error: 'rebase_failed',
        };
      }

      console.log(`[Relay] ✓ Rebase successful`);
    }

    const stateConfig = workflow.transitions[currentState];
    if (!stateConfig) {
      console.error(`[Relay] Invalid state: ${currentState}`);
      throw new Error(`Invalid workflow state: ${currentState}`);
    }

    const result = await spawnAgent(
      taskId,
      currentState,
      stateConfig.config.agent,
      stateConfig.config,
    );
    const { exitCode, error } = await waitForCompletion(
      result.child,
      stateConfig.config.timeout,
    );

    if (exitCode !== 0 || error) {
      console.log(
        `[Relay] Agent failed (exit: ${exitCode}, error: ${error ? error.message : 'none'})`,
      );
      currentState = stateConfig.onFail;
      continue;
    }

    if (stateConfig.gates && stateConfig.gates.length > 0) {
      console.log(`[Relay] Running gates: ${stateConfig.gates.join(', ')}`);
      const { runGates } = await import('./gates.js');
      const gateResults = await runGates(stateConfig.gates);

      const allPassed = gateResults.every((r) => r.passed);

      if (!allPassed) {
        console.log(
          `[Relay] Gates failed, transitioning to: ${stateConfig.onFail}`,
        );
        currentState = stateConfig.onFail;
        continue;
      }
    }

    console.log(
      `[Relay] Agent + gates passed, transitioning to: ${stateConfig.onSuccess}`,
    );
    currentState = stateConfig.onSuccess;

    if (
      !currentState ||
      currentState === 'complete' ||
      currentState === 'human_escalation'
    ) {
      if (currentState === 'complete') {
        const irreversibleCheck = await checkIrreversibleAction(taskId);

        if (irreversibleCheck.isIrreversible && !irreversibleCheck.canMerge) {
          console.log(`[Relay] Blocking merge for irreversible action`);
          await beadsClient.update(taskId, {
            status: 'blocked',
            notes: `Irreversible action requires manual approval. Set metadata.approval_granted to true to proceed.`,
          });
          return {
            finalState: 'blocked',
            iterations,
            error: 'irreversible_action_blocked',
          };
        }

        console.log(`[Relay] Triggering graph compaction for completed task`);
        const compactionResult = await compactGraphForRootCause(taskId);
        console.log(`[Relay] Compaction result:`, compactionResult);

        console.log(`[Relay] Performing squash-on-green merge`);
        const currentBranchResult = await (
          await import('../utils/exec.js')
        ).execAsync('git branch --show-current');
        const taskBranch = currentBranchResult.stdout.trim();

        const conflictCheck = await checkForConflicts('main');
        if (conflictCheck.hasConflicts) {
          console.warn(`[Relay] ⚠ Conflicts detected, blocking merge`);
          await beadsClient.update(taskId, {
            status: 'blocked',
            notes: 'Merge conflicts detected, manual resolution required',
          });
          return {
            finalState: currentState,
            iterations,
            error: 'merge_conflicts',
          };
        }

        const mergeResult = await performSquashMerge(taskId, taskBranch);
        if (!mergeResult.success) {
          console.error(`[Relay] ✗ Squash merge failed: ${mergeResult.error}`);
          await beadsClient.update(taskId, {
            status: 'blocked',
            notes: `Squash merge failed: ${mergeResult.error}`,
          });
          return {
            finalState: currentState,
            iterations,
            error: 'merge_failed',
          };
        }

        console.log(
          `[Relay] ✓ Squash merge successful: ${mergeResult.commitHash}`,
        );

        const cleanupResult = await cleanupTaskBranch(taskBranch);
        if (cleanupResult.success) {
          console.log(`[Relay] ✓ Task branch cleaned up`);
        }
      }

      const status = currentState === 'complete' ? 'closed' : 'blocked';
      console.log(
        `[Relay] Reached terminal state: ${currentState}, setting task status to: ${status}`,
      );
      await beadsClient.update(taskId, { status });
      console.log(`[Relay] ✓ Handoff complete`);
      return { finalState: currentState, iterations };
    }
  }

  console.warn(`[Relay] Max iterations (${maxIterations}) reached`);
  return {
    finalState: currentState,
    iterations,
    error: 'max_iterations_exceeded',
  };
}
