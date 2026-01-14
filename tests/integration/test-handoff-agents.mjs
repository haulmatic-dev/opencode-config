#!/usr/bin/env node

import { workflow } from '../../lib/workflows/feature-dev.js';

const taskId = process.argv[2] || 'opencode-integration-test';

async function testHandoffBetweenAgents() {
  console.log('=== Testing Handoff Between Agents ===\n');

  console.log('Step 1: Verify workflow agent assignments...');
  const agentAssignments = {
    planning: 'prd-agent',
    coding: 'implementation-specialist',
    testing: 'testing-specialist',
    security_audit: 'security-specialist',
    coding_fix_loop: 'fixing-specialist',
  };

  for (const [state, expectedAgent] of Object.entries(agentAssignments)) {
    const stateConfig = workflow.transitions[state];
    if (!stateConfig) {
      console.log(`✗ Missing state: ${state}`);
      process.exit(1);
    }
    if (stateConfig.config.agent !== expectedAgent) {
      console.log(
        `✗ Wrong agent for ${state}: expected ${expectedAgent}, got ${stateConfig.config.agent}`,
      );
      process.exit(1);
    }
    console.log(`✓ ${state} → ${expectedAgent}`);
  }

  console.log('\nStep 2: Test next state determination with gate failures...');
  const handoffPath = await import('../../lib/runner/handoff.js');

  const successResult = handoffPath.determineNextState('coding', [
    { name: 'lint', passed: true },
    { name: 'compile', passed: true },
  ]);

  if (successResult.nextState !== 'testing' || successResult.failed) {
    console.log('✗ Success transition incorrect:', successResult);
    process.exit(1);
  }
  console.log('✓ Gates pass → testing state');

  const failResult = handoffPath.determineNextState('testing', [
    { name: 'tdd', passed: false },
  ]);

  if (failResult.nextState !== 'coding_fix_loop' || !failResult.failed) {
    console.log('✗ Failure transition incorrect:', failResult);
    process.exit(1);
  }
  console.log('✓ Gates fail → coding_fix_loop state');

  console.log('\nStep 3: Test agent spawning with different agents...');
  const agents = [
    'prd-agent',
    'implementation-specialist',
    'testing-specialist',
  ];

  for (const agent of agents) {
    try {
      const spawnResult = await handoffPath.spawnAgent(
        taskId,
        'planning',
        agent,
        {
          agent,
          timeout: 1000,
        },
      );

      if (!spawnResult.child) {
        console.log(`✗ Failed to spawn ${agent}`);
        process.exit(1);
      }

      const waitResult = await handoffPath.waitForCompletion(
        spawnResult.child,
        1000,
      );

      console.log(
        `✓ ${agent} spawned and monitored (exit: ${waitResult.exitCode}, timeout: ${waitResult.timedOut})`,
      );
    } catch (error) {
      console.log(`✗ Agent spawn error for ${agent}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\nStep 4: Test handoff iteration loop...');
  let currentState = workflow.start;
  let iterations = 0;
  const maxIterations = 5;

  while (
    currentState &&
    currentState !== 'complete' &&
    currentState !== 'human_escalation' &&
    iterations < maxIterations
  ) {
    iterations++;
    const stateConfig = workflow.transitions[currentState];

    if (!stateConfig) {
      console.log(`✗ Invalid state: ${currentState}`);
      process.exit(1);
    }

    console.log(
      `  Iteration ${iterations}: ${currentState} → ${stateConfig.onSuccess}`,
    );
    currentState = stateConfig.onSuccess;
  }

  if (iterations < 4) {
    console.log(`✗ Too few iterations: ${iterations}`);
    process.exit(1);
  }
  console.log(`✓ Handoff loop traced ${iterations} states`);

  console.log('\n=== All Handoff Tests Passed ===');
  process.exit(0);
}

testHandoffBetweenAgents().catch((error) => {
  console.error('\n✗ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
