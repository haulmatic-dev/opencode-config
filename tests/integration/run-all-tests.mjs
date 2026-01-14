#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { once } from 'node:events';

const integrationTests = [
  {
    name: 'Workflow Execution',
    script: 'tests/integration/test-workflow-execution.mjs',
  },
  {
    name: 'Handoff Between Agents',
    script: 'tests/integration/test-handoff-agents.mjs',
  },
  {
    name: 'Gates and Retry Loops',
    script: 'tests/integration/test-gates-retry.mjs',
  },
];

const taskId = process.argv[2];

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${test.name}`);
  console.log('='.repeat(60));

  const args = ['node', test.script];
  if (taskId) {
    args.push(taskId);
  }

  const child = spawn('node', [test.script, ...(taskId ? [taskId] : [])], {
    stdio: 'inherit',
  });

  try {
    const [exitCode, signal] = await once(child, 'exit');
    return { success: exitCode === 0, exitCode, signal };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log(
    '\n╔═══════════════════════════════════════════════════════════╗',
  );
  console.log('║     opencode Integration Test Suite                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  if (taskId) {
    console.log(`\nUsing task ID: ${taskId}`);
  }

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of integrationTests) {
    const result = await runTest(test);
    results.push({ ...test, ...result });

    if (result.success) {
      passed++;
      console.log(`✅ ${test.name}: PASSED`);
    } else {
      failed++;
      console.log(`❌ ${test.name}: FAILED (exit code ${result.exitCode})`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total: ${integrationTests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);

  if (failed === 0) {
    console.log('\n🎉 All integration tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check output above for details.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Test runner failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
