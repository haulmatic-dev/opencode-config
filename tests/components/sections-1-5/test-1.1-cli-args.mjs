#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const argsPath = join(process.cwd(), 'lib/runner/args.mjs');
const { parseArguments } = await import(argsPath);

const testType = process.argv[2];

const tests = ['1.1.1', '1.1.2', '1.1.3'];

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
    } else if (testType === '1.1.1') {
      const originalExit = process.exit;
      const originalError = console.error;

      let errorOutput = '';
      let exitCalled = false;
      let _exitCode = 0;

      process.exit = (code) => {
        exitCalled = true;
        _exitCode = code;
      };

      console.error = (...args) => {
        errorOutput += `${args.join(' ')}\n`;
      };

      const originalArgs = process.argv.slice();
      process.argv = ['node', 'args.mjs'];

      try {
        parseArguments();
      } catch (_error) {}

      process.argv = originalArgs;
      process.exit = originalExit;
      console.error = originalError;

      if (
        exitCalled &&
        errorOutput.includes('--task') &&
        errorOutput.includes('required')
      ) {
        console.log('PASS: Missing --task argument triggers error');
        process.exit(0);
      } else {
        console.log('FAIL: Expected error for missing --task');
        process.exit(1);
      }
    } else if (testType === '1.1.2') {
      const originalArgs = process.argv.slice();
      process.argv = [
        'node',
        'args.mjs',
        '--task',
        'opencode-abc',
        '--agent',
        'fix-specialist',
      ];

      try {
        const parsed = parseArguments();

        process.argv = originalArgs;

        if (
          parsed.task === 'opencode-abc' &&
          parsed.agent === 'fix-specialist' &&
          parsed.workflow === 'feature-dev'
        ) {
          console.log('PASS: Valid arguments parsed correctly');
          process.exit(0);
        } else {
          console.log('FAIL: Arguments not parsed correctly:', parsed);
          process.exit(1);
        }
      } catch (error) {
        process.argv = originalArgs;
        console.log('FAIL: Unexpected error:', error.message);
        process.exit(1);
      }
    } else if (testType === '1.1.3') {
      const originalArgs = process.argv.slice();
      process.argv = [
        'node',
        'args.mjs',
        '--task',
        'opencode-abc',
        '--agent',
        'fix-specialist',
        '--workflow',
        'migration',
      ];

      try {
        const parsed = parseArguments();

        process.argv = originalArgs;

        if (
          parsed.task === 'opencode-abc' &&
          parsed.agent === 'fix-specialist' &&
          parsed.workflow === 'migration'
        ) {
          console.log('PASS: Workflow parameter parsed correctly');
          process.exit(0);
        } else {
          console.log('FAIL: Workflow parameter not parsed correctly:', parsed);
          process.exit(1);
        }
      } catch (error) {
        process.argv = originalArgs;
        console.log('FAIL: Unexpected error:', error.message);
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
    const proc = spawn(process.execPath, ['test-1.1-cli-args.mjs', testId], {
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
