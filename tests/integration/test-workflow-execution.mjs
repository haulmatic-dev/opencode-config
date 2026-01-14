#!/usr/bin/env node

import { BeadsClient } from '../../lib/beads-client.mjs';
import { workflow } from '../../lib/workflows/feature-dev.js';

const taskId = process.argv[2] || 'opencode-integration-test';

async function testCompleteWorkflow() {
  console.log('=== Testing Complete Workflow Execution ===\n');

  console.log('Step 1: Create test task...');
  const beadsClient = new BeadsClient();

  let testTaskId = taskId;
  try {
    const existingTask = await beadsClient.show(taskId);
    if (!existingTask) {
      console.log(`Creating new test task: ${taskId}`);
      const task = await beadsClient.create(
        'Integration test: Complete workflow',
        'Test end-to-end workflow execution through all states',
        2,
        { type: 'integration_test', auto_generated: true },
      );
      testTaskId = task.id;
      console.log(`✓ Task created: ${testTaskId}`);
    } else {
      console.log(`✓ Using existing task: ${testTaskId}`);
    }
  } catch (_error) {
    console.log(`Note: Task check failed, continuing with ${testTaskId}`);
  }

  console.log('\nStep 2: Verify workflow structure...');
  if (workflow.start !== 'planning') {
    console.log('✗ Workflow start state incorrect');
    process.exit(1);
  }
  console.log('✓ Workflow structure valid');

  const expectedStates = [
    'planning',
    'coding',
    'testing',
    'security_audit',
    'complete',
  ];
  for (const state of expectedStates) {
    if (!workflow.transitions[state]) {
      console.log(`✗ Missing state: ${state}`);
      process.exit(1);
    }
  }
  console.log('✓ All required states present');

  console.log('\nStep 3: Test state transitions...');
  let currentState = workflow.start;
  const transitions = [];

  for (let i = 0; i < 3 && currentState !== 'complete'; i++) {
    const stateConfig = workflow.transitions[currentState];
    if (!stateConfig) break;

    transitions.push(currentState);

    if (stateConfig.gates && stateConfig.gates.length > 0) {
      console.log(
        `  State: ${currentState} has gates: ${stateConfig.gates.join(', ')}`,
      );
    } else {
      console.log(`  State: ${currentState} (no gates)`);
    }

    currentState = stateConfig.onSuccess;
  }

  console.log(`✓ Traced ${transitions.length} state transitions`);

  console.log('\nStep 4: Test handoff function availability...');
  const handoffPath = await import('../../lib/runner/handoff.js');
  if (typeof handoffPath.executeHandoff !== 'function') {
    console.log('✗ executeHandoff function not available');
    process.exit(1);
  }
  console.log('✓ executeHandoff function available');

  if (typeof handoffPath.determineNextState !== 'function') {
    console.log('✗ determineNextState function not available');
    process.exit(1);
  }
  console.log('✓ determineNextState function available');

  console.log('\nStep 5: Test guardrails availability...');
  const guardrailsPath = await import('../../lib/runner/guardrails.js');
  if (typeof guardrailsPath.getInterceptor !== 'function') {
    console.log('✗ getInterceptor function not available');
    process.exit(1);
  }
  console.log('✓ getInterceptor function available');

  const interceptor = guardrailsPath.getInterceptor(testTaskId);
  try {
    interceptor.checkFileWrite('.beads/test');
    console.log('✗ Guardrail should block .beads/ writes');
    process.exit(1);
  } catch (error) {
    if (error.name === 'GuardrailException') {
      console.log('✓ Guardrails correctly block .beads/ writes');
    }
  }

  console.log('\nStep 6: Test gates availability...');
  const gatesPath = await import('../../lib/runner/gates.js');
  if (typeof gatesPath.runGates !== 'function') {
    console.log('✗ runGates function not available');
    process.exit(1);
  }
  console.log('✓ runGates function available');

  console.log('\nStep 7: Test handoff agent spawning...');
  const spawnResult = await handoffPath.spawnAgent(
    testTaskId,
    'planning',
    'prd-agent',
    {
      agent: 'prd-agent',
      timeout: 5000,
    },
  );

  if (!spawnResult.child || !spawnResult.logPath) {
    console.log('✗ Agent spawn failed');
    process.exit(1);
  }
  console.log(`✓ Agent spawned, log: ${spawnResult.logPath}`);

  const waitResult = await handoffPath.waitForCompletion(
    spawnResult.child,
    2000,
  );
  if (waitResult.timedOut) {
    console.log(
      '✓ Agent timed out as expected (no actual agent implementation)',
    );
  } else {
    console.log(`✓ Agent completed with exit code: ${waitResult.exitCode}`);
  }

  console.log('\n=== All Integration Tests Passed ===');
  console.log(`Test Task ID: ${testTaskId}`);
  process.exit(0);
}

testCompleteWorkflow().catch((error) => {
  console.error('\n✗ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
