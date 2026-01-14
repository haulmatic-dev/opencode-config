#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const gatesPath = join(process.cwd(), 'lib/runner/gates.js');
const { verifyLint } = await import(gatesPath);

const testType = process.argv[2];

const tests = ['2.3.1', '2.3.2', '2.3.3', '2.3.4'];

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
    } else if (testType === '2.3.1') {
      const result = await verifyLint([]);

      if (result.passed === true || result.reason?.includes('not available')) {
        console.log(
          'PASS: UBS available, no critical issues (or not available)',
        );
        process.exit(0);
      } else {
        console.log('FAIL: Lint gate logic incorrect:', result);
        process.exit(1);
      }
    } else if (testType === '2.3.2') {
      const result = await verifyLint([]);

      if (result.passed === false && result.reason?.includes('critical')) {
        console.log('PASS: UBS critical issues detected');
        process.exit(0);
      } else {
        console.log('FAIL: Critical issues not detected:', result);
        process.exit(1);
      }
    } else if (testType === '2.3.3') {
      const result = await verifyLint([]);

      if (result.passed === true || result.reason?.includes('not available')) {
        console.log('PASS: UBS not available handled gracefully');
        process.exit(0);
      } else {
        console.log('FAIL: UBS not available case not handled:', result);
        process.exit(1);
      }
    } else if (testType === '2.3.4') {
      const result = await verifyLint([]);

      if (result.passed === false && result.reason?.includes('ESLint')) {
        console.log('PASS: ESLint errors detected');
        process.exit(0);
      } else {
        console.log('FAIL: ESLint errors not detected:', result);
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
    const proc = spawn(process.execPath, ['test-2.3-lint.mjs', testId], {
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
