#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const guardrailsPath = join(process.cwd(), 'lib/runner/guardrails.js');
const { getInterceptor, GuardrailException } = await import(guardrailsPath);

const testType = process.argv[2];

const tests = ['1.2.1', '1.2.2'];

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
    } else if (testType === '1.2.1') {
      const consoleSpy = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleSpy.push(args.join(' '));
      };

      const interceptor = getInterceptor('opencode-test-123');

      console.log = originalLog;

      if (
        interceptor instanceof Object &&
        interceptor.taskId === 'opencode-test-123'
      ) {
        console.log('PASS: Guardrails initialized with task ID');
        process.exit(0);
      } else {
        console.log('FAIL: Guardrail interceptor not properly initialized');
        process.exit(1);
      }
    } else if (testType === '1.2.2') {
      const interceptor = getInterceptor(null);

      try {
        interceptor.checkFileWrite('src/index.js');
        console.log('FAIL: Should throw GuardrailException for no task ID');
        process.exit(1);
      } catch (error) {
        if (
          error instanceof GuardrailException &&
          error.rule === 'no_task_id'
        ) {
          console.log('PASS: GuardrailException thrown with no_task_id rule');
          process.exit(0);
        } else {
          console.log('FAIL: Wrong exception:', error);
          process.exit(1);
        }
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
      ['test-1.2-guardrails-init.mjs', testId],
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
