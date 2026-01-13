#!/usr/bin/env node

import { GuardrailException, getInterceptor } from './lib/runner/guardrails.js';

async function testGuardrails() {
  console.log('Testing Guardrails Integration...\n');

  const taskId = 'opencode-5it';
  const interceptor = getInterceptor(taskId);

  console.log('1. Testing file write enforcement...');
  try {
    interceptor.checkFileWrite('lib/runner/index.js');
    console.log('   ✓ Valid file write allowed\n');
  } catch (error) {
    console.log(`   ✗ Unexpected error: ${error.message}\n`);
  }

  console.log('2. Testing .beads/ write protection...');
  try {
    interceptor.checkFileWrite('.beads/tasks.json');
    console.log('   ✗ .beads/ write should have been blocked\n');
  } catch (error) {
    if (error instanceof GuardrailException) {
      console.log(`   ✓ Correctly blocked: ${error.message}\n`);
    }
  }

  console.log('3. Testing git commit with task ID...');
  try {
    interceptor.checkGitCommit('opencode-5it: implement guardrails');
    console.log('   ✓ Valid commit message allowed\n');
  } catch (error) {
    console.log(`   ✗ Unexpected error: ${error.message}\n`);
  }

  console.log('4. Testing git commit without task ID...');
  try {
    interceptor.checkGitCommit('implement guardrails');
    console.log('   ✗ Commit without task ID should have been blocked\n');
  } catch (error) {
    if (error instanceof GuardrailException) {
      console.log(`   ✓ Correctly blocked: ${error.message}\n`);
    }
  }

  console.log('5. Testing forbidden branch checkout...');
  try {
    interceptor.checkGitCheckout('main');
    console.log('   ✗ Checkout to main should have been blocked\n');
  } catch (error) {
    if (error instanceof GuardrailException) {
      console.log(`   ✓ Correctly blocked: ${error.message}\n`);
    }
  }

  console.log('6. Testing allowed branch checkout...');
  try {
    interceptor.checkGitCheckout('beads/task-opencode-5it');
    console.log('   ✓ Task branch checkout allowed\n');
  } catch (error) {
    console.log(`   ✗ Unexpected error: ${error.message}\n`);
  }

  console.log('All tests completed!');
}

testGuardrails().catch(console.error);
