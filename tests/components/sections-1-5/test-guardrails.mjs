#!/usr/bin/env node

import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const guardrailsPath = join(process.cwd(), 'lib/runner/guardrails.js');
const { getInterceptor, GuardrailException } = await import(guardrailsPath);

const testType = process.argv[2];

async function runTest() {
  try {
    if (testType === '3.1.1') {
      const interceptor = getInterceptor('test-task');
      try {
        interceptor.checkFileWrite('.beads/test.json');
        console.log('FAIL: Should throw GuardrailException');
        process.exit(1);
      } catch (error) {
        if (
          error instanceof GuardrailException &&
          error.rule === 'no_beads_write'
        ) {
          console.log('PASS: .beads/ write denied with correct exception');
          process.exit(0);
        } else {
          console.log('FAIL: Wrong exception:', error);
          process.exit(1);
        }
      }
    } else if (testType === '3.1.2') {
      const interceptor = getInterceptor(null);
      try {
        interceptor.checkFileWrite('src/index.js');
        console.log('FAIL: Should throw GuardrailException');
        process.exit(1);
      } catch (error) {
        if (
          error instanceof GuardrailException &&
          error.rule === 'no_task_id'
        ) {
          console.log('PASS: File write without task ID denied');
          process.exit(0);
        } else {
          console.log('FAIL: Wrong exception:', error);
          process.exit(1);
        }
      }
    } else if (testType === '3.1.3') {
      const interceptor = getInterceptor('test-task');
      try {
        interceptor.checkFileWrite('src/index.js');
        console.log('PASS: File write allowed with task ID');
        process.exit(0);
      } catch (error) {
        console.log('FAIL: Should not throw exception:', error.message);
        process.exit(1);
      }
    } else if (testType === '3.2.1') {
      const interceptor = getInterceptor('test-task');
      try {
        interceptor.checkGitCommit('Add feature');
        console.log('FAIL: Should throw GuardrailException');
        process.exit(1);
      } catch (error) {
        if (
          error instanceof GuardrailException &&
          error.rule === 'no_task_id_in_commit'
        ) {
          console.log('PASS: Commit without task ID denied');
          process.exit(0);
        } else {
          console.log('FAIL: Wrong exception:', error);
          process.exit(1);
        }
      }
    } else if (testType === '3.2.2') {
      const interceptor = getInterceptor('test-task');
      try {
        interceptor.checkGitCommit('test-task: Add feature');
        console.log('PASS: Commit with task ID allowed');
        process.exit(0);
      } catch (error) {
        console.log('FAIL: Should not throw exception:', error.message);
        process.exit(1);
      }
    } else if (testType === '3.3.1') {
      const interceptor = getInterceptor('test-task');
      try {
        interceptor.checkGitCheckout('main');
        console.log('FAIL: Should throw GuardrailException');
        process.exit(1);
      } catch (error) {
        if (
          error instanceof GuardrailException &&
          error.rule === 'forbidden_branch'
        ) {
          console.log('PASS: Checkout to main denied');
          process.exit(0);
        } else {
          console.log('FAIL: Wrong exception:', error);
          process.exit(1);
        }
      }
    } else if (testType === '3.3.2') {
      const interceptor = getInterceptor('test-task');
      try {
        interceptor.checkGitCheckout('develop');
        console.log('FAIL: Should throw GuardrailException');
        process.exit(1);
      } catch (error) {
        if (
          error instanceof GuardrailException &&
          error.rule === 'forbidden_branch'
        ) {
          console.log('PASS: Checkout to develop denied');
          process.exit(0);
        } else {
          console.log('FAIL: Wrong exception:', error);
          process.exit(1);
        }
      }
    } else if (testType === '3.3.3') {
      const interceptor = getInterceptor('test-task');
      try {
        interceptor.checkGitCheckout('beads/task-test');
        console.log('PASS: Checkout to task branch allowed');
        process.exit(0);
      } catch (error) {
        console.log('FAIL: Should not throw exception:', error.message);
        process.exit(1);
      }
    } else {
      console.log('Unknown test type:', testType);
      process.exit(1);
    }
  } catch (error) {
    console.log('FAIL: Unexpected error:', error.message);
    process.exit(1);
  }
}

runTest();
