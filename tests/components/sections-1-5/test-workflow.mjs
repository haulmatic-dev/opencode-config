#!/usr/bin/env node

import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const workflowPath = join(process.cwd(), 'lib/workflows/feature-dev.js');
const { workflow } = await import(workflowPath);

const testType = process.argv[2];

async function runTest() {
  try {
    if (testType === '4.1.1') {
      if (
        workflow.start === 'planning' &&
        workflow.transitions.planning.onSuccess === 'coding'
      ) {
        console.log('PASS: Planning to coding transition defined');
        process.exit(0);
      } else {
        console.log('FAIL: Workflow transitions incorrect');
        process.exit(1);
      }
    } else if (testType === '4.1.2') {
      const coding = workflow.transitions.coding;
      if (coding.onSuccess === 'testing' && coding.gates.includes('lint')) {
        console.log('PASS: Coding to testing with lint gate');
        process.exit(0);
      } else {
        console.log('FAIL: Coding transition incorrect');
        process.exit(1);
      }
    } else if (testType === '4.1.3') {
      const testing = workflow.transitions.testing;
      if (
        testing.onFail === 'coding_fix_loop' &&
        testing.gates.includes('tdd')
      ) {
        console.log('PASS: Testing to coding fix loop on failure');
        process.exit(0);
      } else {
        console.log('FAIL: Testing transition incorrect');
        process.exit(1);
      }
    } else if (testType === '4.1.4') {
      const complete = workflow.transitions.complete;
      if (complete.onSuccess === null && complete.onFail === null) {
        console.log('PASS: Complete is terminal state');
        process.exit(0);
      } else {
        console.log('FAIL: Complete should be terminal');
        process.exit(1);
      }
    } else if (testType === '4.1.5') {
      const human = workflow.transitions.human_escalation;
      if (human.onSuccess === null && human.onFail === null) {
        console.log('PASS: Human escalation is terminal state');
        process.exit(0);
      } else {
        console.log('FAIL: Human escalation should be terminal');
        process.exit(1);
      }
    } else if (testType === '4.2.1') {
      if (workflow.global.retryBudgets.security === 1) {
        console.log('PASS: Security retry budget is 1');
        process.exit(0);
      } else {
        console.log('FAIL: Security retry budget incorrect');
        process.exit(1);
      }
    } else if (testType === '4.2.2') {
      if (workflow.global.retryBudgets.lint === 3) {
        console.log('PASS: Lint retry budget is 3');
        process.exit(0);
      } else {
        console.log('FAIL: Lint retry budget incorrect');
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
