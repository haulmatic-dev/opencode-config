#!/usr/bin/env node

import { BeadsClient } from './lib/beads-client.mjs';
import { GuardrailException, getInterceptor } from './lib/runner/guardrails.js';

async function testGuardrails() {
  console.log('Testing Guardrails Integration...\n');

  const taskId = process.argv[2] || 'opencode-integration-test';
  const beadsClient = new BeadsClient();

  console.log('1. Verifying task exists...');
  try {
    const task = await beadsClient.show(taskId);
    if (!task) {
      console.log(`   ⚠ Task ${taskId} not found, creating test task...`);
      const newTask = await beadsClient.create(
        'Guardrails integration test',
        'Test guardrail enforcement with actual Beads task',
        2,
      );
      console.log(`   ✓ Created test task: ${newTask.id}`);
    } else {
      console.log(`   ✓ Task found: ${task.id}`);
    }
  } catch (error) {
    console.log(`   ⚠ Task check skipped: ${error.message}`);
  }

  const interceptor = getInterceptor(taskId);

  console.log('2. Testing file write enforcement...');
  try {
    interceptor.checkFileWrite('lib/runner/index.js');
    console.log('   ✓ Valid file write allowed\n');
  } catch (error) {
    console.log(`   ✗ Unexpected error: ${error.message}\n`);
    process.exit(1);
  }

  console.log('3. Testing .beads/ write protection...');
  try {
    interceptor.checkFileWrite('.beads/tasks.json');
    console.log('   ✗ .beads/ write should have been blocked\n');
    process.exit(1);
  } catch (error) {
    if (error instanceof GuardrailException) {
      console.log(`   ✓ Correctly blocked: ${error.message}\n`);
    } else {
      console.log(`   ✗ Wrong exception type: ${error.name}\n`);
      process.exit(1);
    }
  }

  console.log('4. Testing git commit with task ID...');
  try {
    interceptor.checkGitCommit(`${taskId}: implement guardrails`);
    console.log('   ✓ Valid commit message allowed\n');
  } catch (error) {
    console.log(`   ✗ Unexpected error: ${error.message}\n`);
    process.exit(1);
  }

  console.log('5. Testing git commit without task ID...');
  try {
    interceptor.checkGitCommit('implement guardrails');
    console.log('   ✗ Commit without task ID should have been blocked\n');
    process.exit(1);
  } catch (error) {
    if (error instanceof GuardrailException) {
      console.log(`   ✓ Correctly blocked: ${error.message}\n`);
    } else {
      console.log(`   ✗ Wrong exception type: ${error.name}\n`);
      process.exit(1);
    }
  }

  console.log('6. Testing forbidden branch checkout...');
  try {
    interceptor.checkGitCheckout('main');
    console.log('   ✗ Checkout to main should have been blocked\n');
    process.exit(1);
  } catch (error) {
    if (error instanceof GuardrailException) {
      console.log(`   ✓ Correctly blocked: ${error.message}\n`);
    } else {
      console.log(`   ✗ Wrong exception type: ${error.name}\n`);
      process.exit(1);
    }
  }

  console.log('7. Testing allowed branch checkout...');
  try {
    interceptor.checkGitCheckout(`beads/task-${taskId}`);
    console.log('   ✓ Task branch checkout allowed\n');
  } catch (error) {
    console.log(`   ✗ Unexpected error: ${error.message}\n`);
    process.exit(1);
  }

  console.log('8. Testing file write without task ID...');
  const { CommandInterceptor } = await import('./lib/runner/guardrails.js');
  const noTaskInterceptor = new CommandInterceptor(null);
  try {
    noTaskInterceptor.checkFileWrite('src/index.js');
    console.log('   ✗ File write without task ID should have been blocked\n');
    process.exit(1);
  } catch (error) {
    if (error instanceof GuardrailException && error.rule === 'no_task_id') {
      console.log(`   ✓ Correctly blocked: ${error.message}\n`);
    } else {
      console.log(`   ✗ Wrong exception: ${error.message}\n`);
      process.exit(1);
    }
  }

  console.log('✅ All guardrails tests passed!');
  process.exit(0);
}

testGuardrails().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
