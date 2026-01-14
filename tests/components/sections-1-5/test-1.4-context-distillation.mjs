#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const smartContextPath = join(process.cwd(), 'lib/smart-context.mjs');
const { extractMinimalContext, optimizeContextForAgent } = await import(
  smartContextPath
);

const testType = process.argv[2];

const tests = ['1.4.1', '1.4.2'];

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
    } else if (testType === '1.4.1') {
      const error = new Error('Test error with stack');
      error.stack =
        'Error: Test error\n    at testFunction (/path/to/file.js:10:5)\n    at main (/path/to/main.js:20:10)';

      const context = await extractMinimalContext(error);

      if (context?.error && Array.isArray(context.frames)) {
        console.log('PASS: Basic context extraction works');
        process.exit(0);
      } else {
        console.log('FAIL: Context extraction failed:', context);
        process.exit(1);
      }
    } else if (testType === '1.4.2') {
      const error = new Error('Test error');
      error.stack =
        'Error: Test error\n    at testFunction (/path/to/file.js:10:5)';

      const context = await extractMinimalContext(error, 1000);

      if (
        context &&
        typeof context.totalChars === 'number' &&
        context.totalChars <= 2000
      ) {
        console.log('PASS: Context size limits respected');
        process.exit(0);
      } else {
        console.log('FAIL: Context size not limited:', context.totalChars);
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
      ['test-1.4-context-distillation.mjs', testId],
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
