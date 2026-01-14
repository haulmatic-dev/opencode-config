#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const progressPath = join(process.cwd(), 'lib/runner/progress.js');
const { logProgress, readProgressLog } = await import(progressPath);

const testType = process.argv[2];

const tests = ['1.5.1', '1.5.2'];

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
    } else if (testType === '1.5.1') {
      const context = {
        taskId: 'opencode-test-success',
        stage: 'planning',
        optimizationHints: ['hint1'],
      };
      const result = { success: true, output: 'test output' };

      await logProgress('opencode-test-success', 'planning', context, result);

      const logs = await readProgressLog('opencode-test-success');

      if (
        Array.isArray(logs) &&
        logs.length > 0 &&
        logs[0].taskId === 'opencode-test-success'
      ) {
        console.log('PASS: Success logging creates and reads logs');
        process.exit(0);
      } else {
        console.log('FAIL: Progress logging failed:', logs);
        process.exit(1);
      }
    } else if (testType === '1.5.2') {
      const context = {
        taskId: 'opencode-test-read',
        stage: 'coding',
        optimizationHints: ['hint2'],
      };
      const result = { success: true, output: 'test output 2' };

      await logProgress('opencode-test-read', 'coding', context, result);

      const logs = await readProgressLog('opencode-test-read');

      if (Array.isArray(logs) && logs.length > 0) {
        const log = logs[0];
        if (
          log.taskId === 'opencode-test-read' &&
          log.stage === 'coding' &&
          log.result.success === true
        ) {
          console.log('PASS: Read progress logs returns correct task data');
          process.exit(0);
        } else {
          console.log('FAIL: Progress log data incorrect:', log);
          process.exit(1);
        }
      } else {
        console.log('FAIL: Progress logs not read correctly:', logs);
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
      ['test-1.5-progress-logging.mjs', testId],
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
