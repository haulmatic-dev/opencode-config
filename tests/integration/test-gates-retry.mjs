#!/usr/bin/env node

import {
  runGates,
  verifyLint,
  verifyMutation,
  verifyTDD,
} from '../../lib/runner/gates.js';
import {
  CommandInterceptor,
  GuardrailException,
  getInterceptor,
} from '../../lib/runner/guardrails.js';
import { workflow } from '../../lib/workflows/feature-dev.js';

async function testGateFailuresAndRetryLoops() {
  console.log('=== Testing Gate Failures and Retry Loops ===\n');

  console.log('Step 1: Test individual gate functions...');
  const tddResult = await verifyTDD([]);
  console.log(
    `  TDD gate: ${tddResult.passed ? 'PASS' : 'FAIL/SKIP'} - ${tddResult.reason}`,
  );

  const lintResult = await verifyLint([]);
  console.log(
    `  Lint gate: ${lintResult.passed ? 'PASS' : 'FAIL/SKIP'} - ${lintResult.reason}`,
  );

  const mutationResult = await verifyMutation([]);
  console.log(
    `  Mutation gate: ${mutationResult.passed ? 'PASS' : 'FAIL/SKIP'} - ${mutationResult.reason}`,
  );

  console.log('\nStep 2: Test multiple gates execution...');
  const gateNames = ['tdd', 'lint', 'mutation'];
  const results = await runGates(gateNames, []);

  console.log(`  Executed ${results.length} gates:`);
  for (const result of results) {
    console.log(
      `    - ${result.name}: ${result.passed ? 'PASS' : 'FAIL'} - ${result.reason}`,
    );
  }

  console.log('\nStep 3: Test gate failure handling...');
  const handoffPath = await import('../../lib/runner/handoff.js');

  const failedGates = [
    { name: 'tdd', passed: false, reason: 'Tests fail' },
    { name: 'mutation', passed: true, reason: 'Score OK' },
  ];

  const failResult = handoffPath.determineNextState('testing', failedGates);
  if (!failResult.failed || failResult.nextState !== 'coding_fix_loop') {
    console.log('✗ Gate failure handling incorrect:', failResult);
    process.exit(1);
  }
  console.log(`✓ Gate failures trigger ${failResult.nextState} state`);

  console.log('\nStep 4: Test guardrail exceptions...');
  const interceptor = getInterceptor('test-task');

  const guardrailTests = [
    {
      name: 'File write to .beads/',
      fn: () => interceptor.checkFileWrite('.beads/test.json'),
      shouldFail: true,
      rule: 'no_beads_write',
    },
    {
      name: 'File write without task ID',
      fn: () => {
        const noTaskInterceptor = new CommandInterceptor(null);
        return noTaskInterceptor.checkFileWrite('src/index.js');
      },
      shouldFail: true,
      rule: 'no_task_id',
    },
    {
      name: 'Valid file write',
      fn: () => interceptor.checkFileWrite('src/index.js'),
      shouldFail: false,
    },
    {
      name: 'Commit without task ID',
      fn: () => interceptor.checkGitCommit('fix bug'),
      shouldFail: true,
      rule: 'no_task_id_in_commit',
    },
    {
      name: 'Commit with task ID',
      fn: () => interceptor.checkGitCommit('opencode-123: fix bug'),
      shouldFail: false,
    },
    {
      name: 'Checkout to main',
      fn: () => interceptor.checkGitCheckout('main'),
      shouldFail: true,
      rule: 'forbidden_branch',
    },
    {
      name: 'Checkout to task branch',
      fn: () => interceptor.checkGitCheckout('beads/task-test-task'),
      shouldFail: false,
    },
  ];

  for (const test of guardrailTests) {
    try {
      test.fn();
      if (test.shouldFail) {
        console.log(`✗ ${test.name}: Should have thrown GuardrailException`);
        process.exit(1);
      }
      console.log(`✓ ${test.name}: Allowed`);
    } catch (error) {
      if (!test.shouldFail) {
        console.log(`✗ ${test.name}: Unexpected error:`, error.message);
        process.exit(1);
      }
      if (!(error instanceof GuardrailException)) {
        console.log(`✗ ${test.name}: Wrong exception type:`, error.name);
        process.exit(1);
      }
      if (test.rule && error.rule !== test.rule) {
        console.log(
          `✗ ${test.name}: Wrong rule: expected ${test.rule}, got ${error.rule}`,
        );
        process.exit(1);
      }
      console.log(`✓ ${test.name}: Blocked (${error.rule})`);
    }
  }

  console.log('\nStep 5: Test workflow retry budgets...');
  const budgetTests = [
    { state: 'security', expected: 1 },
    { state: 'lint', expected: 3 },
    { state: 'compile', expected: 2 },
    { state: 'test', expected: 3 },
    { state: 'tdd', expected: 3 },
  ];

  for (const test of budgetTests) {
    const budget = workflow.global.retryBudgets[test.state];
    if (budget !== test.expected) {
      console.log(
        `✗ ${test.state} retry budget: expected ${test.expected}, got ${budget}`,
      );
      process.exit(1);
    }
    console.log(`✓ ${test.state} retry budget: ${budget} attempts`);
  }

  console.log('\nStep 6: Simulate gate failure retry loop...');
  const handoffPath2 = await import('../../lib/runner/handoff.js');

  const testTaskId = `opencode-test-retry-${Date.now()}`;
  console.log(`  Simulating retry loop for task: ${testTaskId}`);

  const _mockError = new Error('Test error for retry simulation');
  const _currentState = 'testing';
  const _exitCode = 1;
  const _signal = null;

  const handleAgentFailure = handoffPath2.handleAgentFailure;
  if (typeof handleAgentFailure !== 'function') {
    console.log('✗ handleAgentFailure not available');
    process.exit(1);
  }

  console.log(
    '✓ handleAgentFailure function available (actual Beads interaction skipped)',
  );

  console.log('\n=== All Gate and Retry Tests Passed ===');
  process.exit(0);
}

testGateFailuresAndRetryLoops().catch((error) => {
  console.error('\n✗ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
