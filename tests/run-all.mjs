#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { once } from 'node:events';

async function runAllTests() {
  console.log(
    '\n╔═══════════════════════════════════════════════════════════╗',
  );
  console.log('║     opencode Test Suite Summary                          ║');
  console.log(
    '╚═══════════════════════════════════════════════════════════╝\n',
  );

  const testSuites = [
    {
      name: 'Integration Tests',
      command: 'npm',
      args: ['run', 'test:integration'],
    },
    {
      name: 'Guardrails Test',
      command: 'npm',
      args: ['run', 'test:guardrails'],
    },
    {
      name: 'Handoff Runner Test',
      command: 'npm',
      args: ['run', 'test:handoff-runner'],
    },
  ];

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const suite of testSuites) {
    console.log(`\nRunning: ${suite.name}...`);
    const child = spawn(suite.command, suite.args, { stdio: 'inherit' });

    try {
      const [exitCode, signal] = await once(child, 'exit');
      const success = exitCode === 0;

      results.push({ suite: suite.name, success, exitCode, signal });

      if (success) {
        passed++;
        console.log(`✅ ${suite.name}: PASSED`);
      } else {
        failed++;
        console.log(`❌ ${suite.name}: FAILED (exit code ${exitCode})`);
      }
    } catch (error) {
      results.push({ suite: suite.name, success: false, error: error.message });
      failed++;
      console.log(`❌ ${suite.name}: ERROR - ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Overall Test Summary');
  console.log('='.repeat(60));
  console.log(`Total suites: ${testSuites.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);

  if (failed === 0) {
    console.log('\n🎉 All test suites passed!');
    console.log('\nTest Coverage:');
    console.log('  • Workflow execution and state transitions');
    console.log('  • Handoff between agents');
    console.log('  • Quality gates and retry loops');
    console.log('  • Guardrails enforcement');
    console.log('  • Beads client integration');
    process.exit(0);
  } else {
    console.log(
      '\n❌ Some test suites failed. Check output above for details.',
    );
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error('\n❌ Test runner failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
