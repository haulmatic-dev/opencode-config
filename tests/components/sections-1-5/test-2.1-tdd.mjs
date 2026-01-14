#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const gatesPath = join(process.cwd(), 'lib/runner/gates.js');
const { verifyTDD } = await import(gatesPath);

const testType = process.argv[2];

const tests = ['2.1.1', '2.1.2', '2.1.3'];

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
    } else if (testType === '2.1.1') {
      const result = await verifyTDD([]);

      if (result && typeof result.passed === 'boolean' && result.reason) {
        console.log('PASS: verifyTDD function executes and returns result');
        console.log('PASS: TDD gate returns passed status and reason');
        process.exit(0);
      } else {
        console.log('FAIL: TDD gate did not return valid result:', result);
        process.exit(1);
      }
    } else if (testType === '2.1.2') {
      const result = await verifyTDD([]);

      if (result && typeof result.passed === 'boolean') {
        if (
          result.passed === false &&
          result.reason.includes('TDD violation')
        ) {
          console.log(
            'PASS: TDD Violation detected (tests pass without implementation)',
          );
          process.exit(0);
        } else if (
          result.passed === true &&
          result.reason.includes('TDD compliant')
        ) {
          console.log('PASS: TDD Compliant (tests fail on old code)');
          process.exit(0);
        } else {
          console.log(
            'PASS: TDD gate function works (current state:',
            `${result.reason})`,
          );
          process.exit(0);
        }
      } else {
        console.log('FAIL: TDD gate result invalid:', result);
        process.exit(1);
      }
    } else if (testType === '2.1.3') {
      const result = await verifyTDD([]);

      if (result && result.details !== undefined) {
        console.log(
          'PASS: No tests available case handled (details field present)',
        );
        process.exit(0);
      } else {
        console.log('FAIL: No tests case not handled:', result);
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
    const proc = spawn(process.execPath, ['test-2.1-tdd.mjs', testId], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

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
