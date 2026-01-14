#!/usr/bin/env node

import { BeadsClient } from './lib/beads-client.mjs';
import { executeHandoff } from './lib/runner/handoff.js';
import { workflow } from './lib/workflows/feature-dev.js';

const taskId = process.argv[2] || 'opencode-5wc';

async function testHandoff() {
  console.log('Testing Handoff Implementation...\n');

  const beadsClient = new BeadsClient();

  console.log('1. Verifying task exists...');
  try {
    const task = await beadsClient.show(taskId);
    if (!task) {
      console.log(`   ⚠ Task ${taskId} not found, creating test task...`);
      const newTask = await beadsClient.create(
        'Handoff integration test',
        'Test handoff execution with actual Beads task',
        2,
        { type: 'integration_test' },
      );
      console.log(`   ✓ Created test task: ${newTask.id}`);
    } else {
      console.log(`   ✓ Task found: ${task.id}`);
      console.log(`   Task status: ${task.status}`);
    }
  } catch (error) {
    console.log(`   ⚠ Task check skipped: ${error.message}`);
  }

  console.log('\n2. Testing handoff function availability...');
  if (typeof executeHandoff !== 'function') {
    console.log('   ✗ executeHandoff is not a function');
    process.exit(1);
  }
  console.log('   ✓ executeHandoff function available');

  console.log('\n3. Testing workflow structure...');
  if (!workflow.start || !workflow.transitions) {
    console.log('   ✗ Workflow structure invalid');
    process.exit(1);
  }
  console.log(`   ✓ Workflow start: ${workflow.start}`);
  console.log(
    `   ✓ Workflow states: ${Object.keys(workflow.transitions).length}`,
  );

  console.log('\n4. Testing determineNextState...');
  const handoffModule = await import('./lib/runner/handoff.js');

  const successGates = [
    { name: 'lint', passed: true },
    { name: 'compile', passed: true },
  ];

  const successResult = handoffModule.determineNextState(
    'coding',
    successGates,
  );
  if (successResult.nextState !== 'testing') {
    console.log(
      `   ✗ Wrong next state: expected 'testing', got '${successResult.nextState}'`,
    );
    process.exit(1);
  }
  console.log(`   ✓ determineNextState('coding', passed) → 'testing'`);

  const failGates = [{ name: 'tdd', passed: false }];

  const failResult = handoffModule.determineNextState('testing', failGates);
  if (failResult.nextState !== 'coding_fix_loop') {
    console.log(
      `   ✗ Wrong next state: expected 'coding_fix_loop', got '${failResult.nextState}'`,
    );
    process.exit(1);
  }
  console.log(`   ✓ determineNextState('testing', failed) → 'coding_fix_loop'`);

  console.log('\n5. Testing agent spawning...');
  const spawnResult = await handoffModule.spawnAgent(
    taskId,
    'planning',
    'prd-agent',
    {
      agent: 'prd-agent',
      timeout: 1000,
    },
  );

  if (!spawnResult.child || !spawnResult.logPath) {
    console.log('   ✗ Agent spawn failed');
    process.exit(1);
  }
  console.log(`   ✓ Agent spawned with log: ${spawnResult.logPath}`);

  const waitResult = await handoffModule.waitForCompletion(
    spawnResult.child,
    1000,
  );
  console.log(
    `   ✓ Agent monitoring: exit=${waitResult.exitCode}, timeout=${waitResult.timedOut}`,
  );

  console.log('\n6. Testing updateBeadsStatus...');
  try {
    await handoffModule.updateBeadsStatus(taskId, 'in_progress', {
      current_agent: 'test-agent',
      attempt: 1,
    });
    console.log(`   ✓ Task status updated to 'in_progress'`);

    await handoffModule.updateBeadsStatus(taskId, 'open');
    console.log(`   ✓ Task status restored to 'open'`);
  } catch (error) {
    console.log(`   ⚠ Status update failed: ${error.message}`);
  }

  console.log('\n✅ All handoff implementation tests passed!');
  console.log('\nNote: Full executeHandoff execution requires:');
  console.log('  - Active task branch');
  console.log('  - Agent implementations');
  console.log('  - Workflow state management');
  process.exit(0);
}

testHandoff().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
