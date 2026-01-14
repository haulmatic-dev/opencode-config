import { BeadsClient } from '../beads-client.mjs';
import {
  createSDKClient,
  createSession,
  endSession,
  invokeModel,
  logAgentAction,
} from '../sdk-client.js';
import { execAsync } from '../utils/exec.js';
import { workflow } from '../workflows/feature-dev.js';
import { parseArguments } from './args.mjs';
import { runGates } from './gates.js';
import { GuardrailException, getInterceptor } from './guardrails.js';
import { formatContextForPrompt, logProgress } from './progress.js';
import { checkNeedsRebase, performRebase } from './rebase.js';
import { distillSmartContext } from './smart-context.js';

let currentInterceptor = null;

async function initializeGuardrails(taskId) {
  currentInterceptor = getInterceptor(taskId);
  console.log(`[Guardrails] Initialized for task ${taskId}`);
}

async function checkTaskIrreversible(taskId) {
  try {
    const beadsClient = new BeadsClient();
    const task = await beadsClient.show(taskId);

    if (!task) {
      return { isIrreversible: false, canProceed: true };
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
      console.log(`[Workflow] Task ${taskId} is marked as IRREVERSIBLE`);

      if (!approvalGranted) {
        return {
          isIrreversible: true,
          canProceed: false,
          reason:
            'Irreversible action requires human approval. Set metadata.approval_granted to true to proceed.',
        };
      }

      console.log(`[Workflow] ✓ Irreversible task has approval granted`);
      return {
        isIrreversible: true,
        canProceed: true,
        reason: 'Irreversible action with human approval',
      };
    }

    return { isIrreversible: false, canProceed: true };
  } catch (error) {
    console.error(
      '[Workflow] Error checking irreversible status:',
      error.message,
    );
    return { isIrreversible: false, canProceed: true };
  }
}

async function _enforceGuardrails(filePath, operation) {
  try {
    if (operation === 'fileWrite') {
      currentInterceptor.checkFileWrite(filePath);
      console.log(`[Guardrails] ✓ File write allowed: ${filePath}`);
    } else if (operation === 'gitCommit') {
      currentInterceptor.checkGitCommit(filePath);
      console.log(`[Guardrails] ✓ Git commit allowed: ${filePath}`);
    } else if (operation === 'gitCheckout') {
      currentInterceptor.checkGitCheckout(filePath);
      console.log(`[Guardrails] ✓ Git checkout allowed: ${filePath}`);
    }
  } catch (error) {
    if (error instanceof GuardrailException) {
      console.error(`[Guardrails] ✗ ${error.message}`);
      throw error;
    }
  }
}

async function checkoutTaskBranch(taskId) {
  const branchName = `beads/task-${taskId}`;

  console.log(`[Branch] Checking out task branch: ${branchName}`);

  try {
    const checkResult = await execAsync('git branch --show-current');
    const currentBranch = checkResult.stdout.trim();

    if (currentBranch === branchName) {
      console.log(`[Branch] ✓ Already on branch: ${branchName}`);
      return { success: true, branch: branchName };
    }

    const branchListResult = await execAsync('git branch --list');
    const branchExists = branchListResult.stdout.includes(branchName);

    if (branchExists) {
      console.log(`[Branch] Branch exists, checking out: ${branchName}`);
      const checkoutResult = await execAsync(`git checkout ${branchName} 2>&1`);

      if (checkoutResult.exitCode !== 0) {
        console.error(
          `[Branch] ✗ Failed to checkout branch: ${checkoutResult.stderr}`,
        );
        return { success: false, error: checkoutResult.stderr };
      }

      console.log(`[Branch] ✓ Checked out existing branch: ${branchName}`);
      return { success: true, branch: branchName, created: false };
    }

    console.log(
      `[Branch] Branch does not exist, creating from main: ${branchName}`,
    );
    const createResult = await execAsync(
      `git checkout -b ${branchName} main 2>&1`,
    );

    if (createResult.exitCode !== 0) {
      console.error(
        `[Branch] ✗ Failed to create branch: ${createResult.stderr}`,
      );
      return { success: false, error: createResult.stderr };
    }

    console.log(`[Branch] ✓ Created and checked out branch: ${branchName}`);
    return { success: true, branch: branchName, created: true };
  } catch (error) {
    console.error(`[Branch] Error during branch checkout: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function executeWorkflow(taskId) {
  await initializeGuardrails(taskId);

  const beadsClient = new BeadsClient();
  let currentState = workflow.start;
  let iterations = 0;
  const maxIterations = 20;

  const irreversibleCheck = await checkTaskIrreversible(taskId);
  if (irreversibleCheck.isIrreversible && !irreversibleCheck.canProceed) {
    console.error(`[Workflow] ✗ Irreversible action blocked`);
    console.error(`[Workflow] Reason: ${irreversibleCheck.reason}`);
    await beadsClient.update(taskId, {
      status: 'blocked',
      notes: `Irreversible action blocked: ${irreversibleCheck.reason}`,
    });
    process.exit(1);
  }

  console.log(`[Workflow] Starting workflow: ${workflow.start}`);

  const branchCheckout = await checkoutTaskBranch(taskId);
  if (!branchCheckout.success) {
    console.error(`[Workflow] ✗ Failed to checkout task branch`);
    console.error(`[Workflow] Reason: ${branchCheckout.error}`);
    await beadsClient.update(taskId, {
      status: 'blocked',
      notes: `Failed to checkout task branch: ${branchCheckout.error}`,
    });
    process.exit(1);
  }

  while (currentState && iterations < maxIterations) {
    iterations++;
    console.log(`[Workflow] State ${iterations}: ${currentState}`);

    const stateConfig = workflow.transitions[currentState];
    if (!stateConfig) {
      console.error(`[Workflow] Invalid state: ${currentState}`);
      process.exit(1);
    }

    const result = await runAgent(
      taskId,
      stateConfig.config.agent,
      'feature-dev',
    );

    if (result.exitCode !== 0) {
      console.log(
        `[Workflow] Agent failed, transitioning to: ${stateConfig.onFail}`,
      );
      currentState = stateConfig.onFail;
    } else {
      if (stateConfig.gates && stateConfig.gates.length > 0) {
        console.log(
          `[Workflow] Running gates: ${stateConfig.gates.join(', ')}`,
        );
        const gateResults = await runGates(stateConfig.gates);

        const allPassed = gateResults.every((r) => r.passed);

        if (!allPassed) {
          console.log(
            `[Workflow] Gates failed, transitioning to: ${stateConfig.onFail}`,
          );
          currentState = stateConfig.onFail;
        } else {
          const context = { taskId, stage: currentState };
          await logProgress(taskId, currentState, context, { success: true });
          currentState = stateConfig.onSuccess;
        }
      } else {
        const context = { taskId, stage: currentState };
        await logProgress(taskId, currentState, context, { success: true });
        currentState = stateConfig.onSuccess;
      }
    }

    if (
      !currentState ||
      currentState === 'complete' ||
      currentState === 'human_escalation'
    ) {
      console.log(`[Workflow] Reached terminal state: ${currentState}`);
      const status = currentState === 'complete' ? 'closed' : 'blocked';
      await beadsClient.update(taskId, { status });
      break;
    }
  }
}

async function runAgent(taskId, agentType, workflowType) {
  console.log(`[Runner] Starting agent: ${agentType} for task: ${taskId}`);

  let sessionId = null;

  try {
    const beadsClient = new BeadsClient();
    const taskOutput = await beadsClient.show(taskId);

    if (!taskOutput) {
      throw new Error(`Task ${taskId} not found or inaccessible`);
    }

    const task = parseTaskOutput(taskOutput);
    console.log(`[Runner] Task: ${task.title}`);
    console.log(`[Runner] Description: ${task.description}`);

    const context = await distillSmartContext(taskId, task, agentType);
    console.log(
      `[Runner] Context size: ${JSON.stringify(context).length} chars`,
    );

    await createSDKClient();
    sessionId = await createSession(taskId, agentType, workflowType);

    console.log(`[Runner] Invoking agent: ${agentType}`);
    console.log(`[Runner] Workflow: ${workflowType}`);

    const promptContent = formatContextForPrompt(context);
    const response = await invokeModel(sessionId, promptContent, {
      model: 'claude-opus',
      temperature: 0.7,
    });

    await logAgentAction(sessionId, 'agent_execution', {
      agentType,
      workflowType,
      responseLength: response.content?.length || 0,
      model: response.model,
    });

    console.log(`[Runner] Agent execution complete`);
    console.log(
      `[Runner] Response length: ${response.content?.length || 0} chars`,
    );

    return { exitCode: 0, response };
  } catch (error) {
    if (error instanceof GuardrailException) {
      console.error(`[Runner] Guardrail violation: ${error.message}`);
      return { exitCode: 1, error, guardrailViolation: true };
    }
    console.error(`[Runner] Agent failed:`, error.message);

    if (sessionId) {
      await logAgentAction(sessionId, 'agent_error', {
        error: error.message,
        agentType,
        workflowType,
      });
    }

    return { exitCode: 1, error };
  } finally {
    if (sessionId) {
      await endSession(sessionId);
    }
  }
}

async function _distillContext(task) {
  return {
    taskId: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
  };
}

function parseTaskOutput(output) {
  const lines = output.trim().split('\n');
  const task = {
    id: '',
    title: '',
    description: '',
    priority: '0',
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('ID:')) {
      task.id = trimmed.replace('ID:', '').trim();
    } else if (trimmed.startsWith('Title:')) {
      task.title = trimmed.replace('Title:', '').trim();
    } else if (trimmed.startsWith('Description:')) {
      task.description = trimmed.replace('Description:', '').trim();
    } else if (trimmed.startsWith('Priority:')) {
      task.priority = trimmed.replace('Priority:', '').trim();
    }
  }

  return task;
}

async function main() {
  const args = parseArguments();

  if (args.workflow) {
    await executeWorkflow(args.task);
  } else {
    const result = await runAgent(args.task, args.agent, args.workflow);
    console.log(`[Runner] Exit code: ${result.exitCode}`);
    if (result.error) {
      console.error(`[Runner] Error details:`, result.error);
    }
    process.exit(result.exitCode);
  }
}

main().catch(console.error);
