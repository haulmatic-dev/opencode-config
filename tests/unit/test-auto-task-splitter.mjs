/**
 * @fileoverview Unit tests for auto-task-splitter.js
 * @module tests/unit/test-auto-task-splitter
 */

import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

/**
 * @typedef {Object} MockBeadsClient
 * @property {Function} create
 * @property {Function} depAdd
 */

/** @type {MockBeadsClient} */
let mockBeadsClient;

/** @type {import('../../lib/auto-task-splitter.js')} */
let autoTaskSplitter;

beforeEach(async () => {
  mockBeadsClient = {
    create: mock.fn(
      async (data) =>
        `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ),
    depAdd: mock.fn(async () => {}),
  };

  const beadsClientModule = await import('../../lib/beads-client.mjs');
  const originalClient = beadsClientModule.BeadsClient;

  /** @type {import('../../lib/auto-task-splitter.js')} */
  const module = await import('../../lib/auto-task-splitter.mjs');
  autoTaskSplitter = module;

  Object.defineProperty(
    await import('../../lib/auto-task-splitter.mjs'),
    'beadsClient',
    {
      value: mockBeadsClient,
      writable: true,
    },
  );
});

afterEach(() => {
  mock.restoreAll();
});

describe('splitOnFailure', () => {
  describe('failure type routing', () => {
    it('should route TEST failure to handleTestFailure', async () => {
      const result = await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-001',
        failureType: 'test',
        details: 'Test xyz failed',
      });

      assert.ok(result.investigation, 'Should create investigation task');
      assert.ok(result.fix, 'Should create fix task');
      assert.strictEqual(mockBeadsClient.create.mock.calls.length, 2);
    });

    it('should route LINT failure to handleLintFailure', async () => {
      const result = await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-002',
        failureType: 'lint',
        details: 'Lint error in src/file.js',
        affectedFiles: ['src/file.js'],
      });

      assert.strictEqual(result.investigation, null);
      assert.ok(result.fix, 'Should create fix task');
      assert.strictEqual(mockBeadsClient.create.mock.calls.length, 1);
    });

    it('should route SECURITY failure to handleSecurityFailure', async () => {
      const result = await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-003',
        failureType: 'security',
        details: 'Vulnerability detected in dependency xyz',
      });

      assert.strictEqual(result.investigation, null);
      assert.ok(result.fix, 'Should create fix task');
      assert.strictEqual(mockBeadsClient.create.mock.calls.length, 1);
    });

    it('should throw error for unknown failure type', async () => {
      await assert.rejects(async () => {
        await autoTaskSplitter.splitOnFailure({
          originalTaskId: 'task-004',
          failureType: 'unknown',
          details: 'Some failure',
        });
      }, /Unknown failure type: unknown/);
    });
  });

  describe('TEST failure handling', () => {
    it('should create investigation and fix tasks', async () => {
      const result = await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-005',
        failureType: 'test',
        details: 'Assertion failed in test_foo',
      });

      assert.ok(result.investigation);
      assert.ok(result.fix);
      assert.notStrictEqual(result.investigation, result.fix);
    });

    it('should create investigation task with correct properties', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-006',
        failureType: 'test',
        details: 'Failing test details',
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const investigationCall = createCalls.find(
        (call) => call.arguments[0].type === 'investigation',
      );

      assert.ok(investigationCall, 'Should create investigation task');
      assert.strictEqual(
        investigationCall.arguments[0].title,
        'Investigate test failure in task-006',
      );
      assert.strictEqual(investigationCall.arguments[0].priority, 1);
      assert.deepStrictEqual(investigationCall.arguments[0].labels, [
        'investigation',
        'quality-gate',
      ]);
      assert.ok(
        investigationCall.arguments[0].description.includes(
          'Failing test details',
        ),
      );
    });

    it('should create fix task with correct properties', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-007',
        failureType: 'test',
        details: 'Test xyz failed',
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls.find(
        (call) => call.arguments[0].type === 'fix',
      );

      assert.ok(fixCall, 'Should create fix task');
      assert.strictEqual(
        fixCall.arguments[0].title,
        'Fix test failure from task-007',
      );
      assert.strictEqual(fixCall.arguments[0].priority, 1);
      assert.deepStrictEqual(fixCall.arguments[0].labels, [
        'test-fix',
        'quality-gate',
      ]);
    });
  });

  describe('LINT failure handling', () => {
    it('should create fix task with affected files', async () => {
      const result = await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-008',
        failureType: 'lint',
        details: 'Line too long',
        affectedFiles: ['src/foo.js', 'src/bar.js'],
      });

      assert.ok(result.fix);

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls[0];

      assert.ok(fixCall.arguments[0].description.includes('src/foo.js'));
      assert.ok(fixCall.arguments[0].description.includes('src/bar.js'));
    });

    it('should create lint fix task with correct priority', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-009',
        failureType: 'lint',
        details: 'Unused variable',
        affectedFiles: ['src/utils.js'],
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls[0];

      assert.strictEqual(fixCall.arguments[0].priority, 2);
      assert.deepStrictEqual(fixCall.arguments[0].labels, [
        'lint-fix',
        'quality-gate',
      ]);
    });

    it('should handle empty affected files list', async () => {
      const result = await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-010',
        failureType: 'lint',
        details: 'Parsing error',
        affectedFiles: [],
      });

      assert.ok(result.fix);

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls[0];

      assert.ok(!fixCall.arguments[0].description.includes('Affected files'));
    });
  });

  describe('SECURITY failure handling', () => {
    it('should create fix task with priority 1', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-011',
        failureType: 'security',
        details: 'SQL injection vulnerability',
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls[0];

      assert.strictEqual(fixCall.arguments[0].priority, 1);
    });

    it('should create security fix task with security labels', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-012',
        failureType: 'security',
        details: 'XSS vulnerability in template',
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls[0];

      assert.deepStrictEqual(fixCall.arguments[0].labels, [
        'security',
        'security-fix',
        'quality-gate',
      ]);
    });

    it('should include SECURITY prefix in title', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-013',
        failureType: 'security',
        details: 'CSRF vulnerability',
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls[0];

      assert.ok(fixCall.arguments[0].title.startsWith('[SECURITY]'));
    });
  });

  describe('dependency linking', () => {
    it('should link investigation task to original task', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-014',
        failureType: 'test',
        details: 'Test failure',
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const investigationCall = createCalls.find(
        (call) => call.arguments[0].type === 'investigation',
      );

      assert.deepStrictEqual(investigationCall.arguments[0].deps, ['task-014']);
    });

    it('should link test fix task to original task and investigation', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-015',
        failureType: 'test',
        details: 'Test failure',
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls.find(
        (call) =>
          call.arguments[0].type === 'fix' &&
          call.arguments[0].title.startsWith('Fix test'),
      );

      assert.ok(fixCall.arguments[0].deps.includes('task-015'));
      assert.ok(fixCall.arguments[0].deps.length >= 2);
    });

    it('should link lint fix task to original task', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-016',
        failureType: 'lint',
        details: 'Lint error',
        affectedFiles: ['src/file.js'],
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls[0];

      assert.deepStrictEqual(fixCall.arguments[0].deps, ['task-016']);
    });

    it('should link security fix task to original task', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-017',
        failureType: 'security',
        details: 'Security issue',
      });

      const createCalls = mockBeadsClient.create.mock.calls;
      const fixCall = createCalls[0];

      assert.deepStrictEqual(fixCall.arguments[0].deps, ['task-017']);
    });

    it('should call depAdd to link fix to investigation', async () => {
      await autoTaskSplitter.splitOnFailure({
        originalTaskId: 'task-018',
        failureType: 'test',
        details: 'Test failure',
      });

      assert.strictEqual(mockBeadsClient.depAdd.mock.calls.length, 1);
    });
  });

  describe('FailureType enum', () => {
    it('should export TEST failure type', () => {
      assert.strictEqual(autoTaskSplitter.FailureType.TEST, 'test');
    });

    it('should export LINT failure type', () => {
      assert.strictEqual(autoTaskSplitter.FailureType.LINT, 'lint');
    });

    it('should export SECURITY failure type', () => {
      assert.strictEqual(autoTaskSplitter.FailureType.SECURITY, 'security');
    });
  });
});
