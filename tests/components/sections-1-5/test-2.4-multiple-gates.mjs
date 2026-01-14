#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const gatesPath = join(process.cwd(), 'lib/runner/gates.js');
const { runGates } = await import(gatesPath);

const testType = process.argv[2];

const tests = ['2.4.1', '2.4.2', '2.4.3'];

async function runTest() {
  try {
    if (testType === 'all') {
      let passed = 0;
      let failed = 0;

      for (const test of tests) {
        const result = await runSingleTest(test);
        if (result) passed++;
        else failed++;
      }

      console.log(`\n${passed}/${tests.length} tests passed`);
      process.exit(failed > 0 ? 1 : 0);
    } else if (testType === '2.4.1') {
      const results = await runGates(['tdd', 'mutation', 'lint'], []);

      const allPassed =
        Array.isArray(results) && results.every((r) => r.passed);

      if (allPassed) {
        console.log('PASS: All gates pass');
        process.exit(0);
      } else {
        console.log('FAIL: Not all gates passed:', results);
        process.exit(1);
      }
    } else if (testType === '2.4.2') {
      const results = await runGates(['tdd', 'mutation', 'lint'], []);

      const oneFailed =
        Array.isArray(results) && results.some((r) => !r.passed || r.error);

      if (oneFailed) {
        console.log('PASS: One gate fails detected');
        process.exit(0);
      } else {
        console.log('FAIL: Failed gate not detected:', results);
        process.exit(1);
      }
    } else if (testType === '2.4.3') {
      const results = await runGates(['tdd', 'unknown_gate', 'lint'], []);

      const unknownHandled =
        Array.isArray(results) &&
        results.some((r) => r.name === 'unknown_gate');

      if (unknownHandled) {
        console.log('PASS: Unknown gate handled gracefully');
        process.exit(0);
      } else {
        console.log('FAIL: Unknown gate not handled:', results);
        process.exit(1);
      }
    } else {
      console.log('Unknown test type:', testType);
      console.log('Available tests:', tests.join(', '));
      process.exit(1);
    }
  } catch (error) {
    console.log('FAIL: Unexpected error:', error.message);
    process.exit(1);
  }
}

async function runSingleTest(testId) {
  return new Promise((resolve) => {
    const proc = spawn(
      process.execPath,
      ['test-2.4-multiple-gates.mjs', testId],
      {
        cwd: process.cwd(),
        stdio: 'pipe',
      },
    );

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      console.log(output.trim());
      resolve(code === 0);
    });
  });
}

runTest();
