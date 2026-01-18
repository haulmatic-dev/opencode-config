#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const integrationTests = [
  {
    name: 'MCP Communication',
    script: 'tests/integration/test-mcp-communication.mjs',
  },
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

const isParallel = process.argv.includes('--parallel');
const isCoverage = process.argv.includes('--coverage');
const taskId =
  process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${test.name}`);
  console.log('='.repeat(60));

  const args = [test.script];
  if (taskId) {
    args.push(taskId);
  }

  const child = spawn('node', args, {
    stdio: 'inherit',
  });

  try {
    const [exitCode, signal] = await once(child, 'exit');
    return { success: exitCode === 0, exitCode, signal, name: test.name };
  } catch (error) {
    return { success: false, error: error.message, name: test.name };
  }
}

async function runTestsSequentially() {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of integrationTests) {
    const result = await runTest(test);
    results.push(result);

    if (result.success) {
      passed++;
      console.log(`✅ ${test.name}: PASSED`);
    } else {
      failed++;
      console.log(`❌ ${test.name}: FAILED (exit code ${result.exitCode})`);
    }
  }

  return { passed, failed, results };
}

async function runTestsInParallel() {
  console.log('\n🚀 Running tests in parallel...\n');

  const promises = integrationTests.map((test) => runTest(test));
  const results = await Promise.all(promises);

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.success) {
      passed++;
      console.log(`✅ ${result.name}: PASSED`);
    } else {
      failed++;
      console.log(`❌ ${result.name}: FAILED (exit code ${result.exitCode})`);
    }
  }

  return { passed, failed, results };
}

function generateCoverageReport(results) {
  const coverageDir = 'coverage/integration';
  if (!existsSync(coverageDir)) {
    mkdirSync(coverageDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    mode: 'integration',
    summary: {
      total: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
    tests: results.map((r) => ({
      name: r.name,
      status: r.success ? 'passed' : 'failed',
      exitCode: r.exitCode,
    })),
  };

  const reportPath = join(coverageDir, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Coverage report written to: ${reportPath}`);
}

async function main() {
  console.log(
    '\n╔═══════════════════════════════════════════════════════════╗',
  );
  console.log('║     opencode Integration Test Suite                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  if (isParallel) {
    console.log('\n⚡ Mode: Parallel Execution');
  }
  if (isCoverage) {
    console.log('\n📊 Mode: Coverage Enabled');
  }
  if (taskId) {
    console.log(`\n🔑 Using task ID: ${taskId}`);
  }

  const { passed, failed, results } = isParallel
    ? await runTestsInParallel()
    : await runTestsSequentially();

  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total: ${integrationTests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);

  if (isCoverage) {
    generateCoverageReport(results);
  }

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
