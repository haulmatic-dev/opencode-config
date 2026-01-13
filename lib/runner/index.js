import { BeadsClient } from '../beads-client.mjs';
import { workflow } from '../workflows/feature-dev.js';
import { parseArguments } from './args.mjs';
import { runGates } from './gates.js';
import { GuardrailException, getInterceptor } from './guardrails.js';
import { logProgress } from './progress.js';

let currentInterceptor = null;

async function initializeGuardrails(taskId) {
  currentInterceptor = getInterceptor(taskId);
  console.log(`[Guardrails] Initialized for task ${taskId}`);
}

async function enforceGuardrails(filePath, operation) {
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

async function executeWorkflow(taskId) {
  await initializeGuardrails(taskId);

  const beadsClient = new BeadsClient();
  let currentState = workflow.start;
  let iterations = 0;
  const maxIterations = 20;

  console.log(`[Workflow] Starting workflow: ${workflow.start}`);

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

  try {
    const beadsClient = new BeadsClient();
    const taskOutput = await beadsClient.show(taskId);

    if (!taskOutput) {
      throw new Error(`Task ${taskId} not found or inaccessible`);
    }

    const task = parseTaskOutput(taskOutput);
    console.log(`[Runner] Task: ${task.title}`);
    console.log(`[Runner] Description: ${task.description}`);

    const context = await distillContext(task);
    console.log(
      `[Runner] Context size: ${JSON.stringify(context).length} chars`,
    );

    console.log(`[Runner] Invoking agent: ${agentType}`);
    console.log(`[Runner] Workflow: ${workflowType}`);
    console.log(`[Runner] Simulating agent execution...`);

    console.log(`[Runner] Agent execution complete`);

    return { exitCode: 0 };
  } catch (error) {
    if (error instanceof GuardrailException) {
      console.error(`[Runner] Guardrail violation: ${error.message}`);
      return { exitCode: 1, error, guardrailViolation: true };
    }
    console.error(`[Runner] Agent failed:`, error.message);
    return { exitCode: 1, error };
  }
}

async function distillContext(task) {
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
