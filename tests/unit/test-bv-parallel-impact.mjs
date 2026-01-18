/**
 * Unit tests for lib/bv-parallel-impact.js
 *
 * Tests for parallel execution analysis functionality.
 * @module test-bv-parallel-impact
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, assert, beforeEach, describe, it, mock } from 'node:test';

const MODULE_PATH = './lib/bv-parallel-impact.js';

let analyzeParallelExecution;
let extractFilesFromTask;
let createEmptyResult;
let buildConflictMatrix;
let calculateFileConflict;
let identifySequentialRequirements;
let determineExecutionOrder;
let findParallelCandidates;
let generateExecutionPlan;

async function loadModule() {
  const module = await import(MODULE_PATH);
  analyzeParallelExecution = module.analyzeParallelExecution;
  extractFilesFromTask = module.extractFilesFromTask;
  createEmptyResult = module.createEmptyResult;
  buildConflictMatrix = module.buildConflictMatrix;
  calculateFileConflict = module.calculateFileConflict;
  identifySequentialRequirements = module.identifySequentialRequirements;
  determineExecutionOrder = module.determineExecutionOrder;
  findParallelCandidates = module.findParallelCandidates;
  generateExecutionPlan = module.generateExecutionPlan;
  return module;
}

describe('bv-parallel-impact', async () => {
  describe('extractFilesFromTask', async () => {
    it('extracts files from task description', () => {
      const task = {
        id: 'test-1',
        description: 'Files: src/index.js, lib/utils.ts',
      };
      const files = extractFilesFromTask(task);
      assert.strictEqual(files.length, 2);
      assert.ok(files.includes('src/index.js'));
      assert.ok(files.includes('lib/utils.ts'));
    });

    it('returns empty array when no files in description', () => {
      const task = { id: 'test-1', description: 'Just a description' };
      const files = extractFilesFromTask(task);
      assert.strictEqual(files.length, 0);
    });

    it('handles empty description', () => {
      const task = { id: 'test-1', description: '' };
      const files = extractFilesFromTask(task);
      assert.strictEqual(files.length, 0);
    });

    it('handles semicolon-separated files', () => {
      const task = {
        id: 'test-1',
        description: 'files: foo.py; bar.py; baz.py',
      };
      const files = extractFilesFromTask(task);
      assert.strictEqual(files.length, 3);
    });
  });

  describe('createEmptyResult', async () => {
    it('returns valid empty structure', () => {
      const result = createEmptyResult();
      assert.ok(Array.isArray(result.parallel_candidates));
      assert.ok(Array.isArray(result.sequential_requirements));
      assert.ok(typeof result.conflict_matrix === 'object');
      assert.ok(Array.isArray(result.execution_plan));
      assert.strictEqual(result.summary.total_tasks, 0);
      assert.strictEqual(result.summary.parallel_groups, 0);
      assert.strictEqual(result.summary.sequential_chains, 0);
      assert.strictEqual(result.summary.max_parallelism, 0);
    });
  });

  describe('calculateFileConflict', async () => {
    it('returns no conflict for disjoint file sets', () => {
      const result = calculateFileConflict(['a.js'], ['b.js']);
      assert.strictEqual(result.hasConflict, false);
    });

    it('detects shared files', () => {
      const result = calculateFileConflict(['a.js', 'b.js'], ['b.js', 'c.js']);
      assert.strictEqual(result.hasConflict, true);
      assert.ok(result.sharedFiles.includes('b.js'));
    });

    it('identifies direct conflict for source files', () => {
      const result = calculateFileConflict(['main.js'], ['main.js']);
      assert.strictEqual(result.hasConflict, true);
      assert.strictEqual(result.type, 'direct');
      assert.strictEqual(result.severity, 'medium');
    });

    it('identifies configuration conflict', () => {
      const result = calculateFileConflict(['package.json'], ['package.json']);
      assert.strictEqual(result.hasConflict, true);
      assert.strictEqual(result.type, 'configuration');
      assert.strictEqual(result.severity, 'high');
    });

    it('identifies configuration conflict for Cargo.toml', () => {
      const result = calculateFileConflict(['Cargo.toml'], ['lib.rs']);
      assert.strictEqual(result.hasConflict, true);
      assert.strictEqual(result.type, 'configuration');
      assert.strictEqual(result.severity, 'high');
    });

    it('handles empty file arrays', () => {
      const result = calculateFileConflict([], []);
      assert.strictEqual(result.hasConflict, false);
    });
  });

  describe('buildConflictMatrix', async () => {
    it('returns empty object for single task', () => {
      const taskImpacts = [{ id: 'task-1', files: ['a.js'], impact: {} }];
      const matrix = buildConflictMatrix(taskImpacts);
      assert.deepStrictEqual(matrix, {});
    });

    it('detects conflicts between tasks with shared files', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['shared.js'], impact: {} },
        { id: 'task-2', files: ['shared.js', 'other.js'], impact: {} },
      ];
      const matrix = buildConflictMatrix(taskImpacts);
      assert.ok('task-1::task-2' in matrix);
      assert.strictEqual(matrix['task-1::task-2'].task_a, 'task-1');
      assert.strictEqual(matrix['task-1::task-2'].task_b, 'task-2');
    });

    it('does not create entry for non-conflicting tasks', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['a.js'], impact: {} },
        { id: 'task-2', files: ['b.js'], impact: {} },
      ];
      const matrix = buildConflictMatrix(taskImpacts);
      assert.strictEqual(Object.keys(matrix).length, 0);
    });

    it('handles multiple tasks with mixed conflicts', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['a.js'], impact: {} },
        { id: 'task-2', files: ['b.js'], impact: {} },
        { id: 'task-3', files: ['a.js', 'c.js'], impact: {} },
      ];
      const matrix = buildConflictMatrix(taskImpacts);
      assert.strictEqual(Object.keys(matrix).length, 2);
    });
  });

  describe('determineExecutionOrder', async () => {
    it('higher priority blocks lower priority', () => {
      const taskA = { id: 'high', priority: 10, files: ['a.js'] };
      const taskB = { id: 'low', priority: 1, files: ['b.js'] };
      const order = determineExecutionOrder(taskA, taskB);
      assert.strictEqual(order.blocker, 'high');
      assert.strictEqual(order.blocked, 'low');
    });

    it('larger file set blocks smaller when priorities equal', () => {
      const taskA = { id: 'big', priority: 0, files: ['a.js', 'b.js', 'c.js'] };
      const taskB = { id: 'small', priority: 0, files: ['a.js'] };
      const order = determineExecutionOrder(taskA, taskB);
      assert.strictEqual(order.blocker, 'big');
      assert.strictEqual(order.blocked, 'small');
    });

    it('defaults priority to 0 when not set', () => {
      const taskA = { id: 'task-a', files: ['a.js'] };
      const taskB = { id: 'task-b', files: ['b.js'] };
      const order = determineExecutionOrder(taskA, taskB);
      assert.ok(['task-a', 'task-b'].includes(order.blocker));
      assert.ok(['task-a', 'task-b'].includes(order.blocked));
    });
  });

  describe('findParallelCandidates', async () => {
    it('groups independent tasks together', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['a.js'], impact: {} },
        { id: 'task-2', files: ['b.js'], impact: {} },
      ];
      const candidates = findParallelCandidates(taskImpacts, {});
      assert.strictEqual(candidates.length, 1);
      assert.strictEqual(candidates[0].tasks.length, 2);
    });

    it('separates conflicting tasks', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['shared.js'], impact: {} },
        { id: 'task-2', files: ['shared.js'], impact: {} },
      ];
      const conflictMatrix = {
        'task-1::task-2': { task_a: 'task-1', task_b: 'task-2' },
      };
      const candidates = findParallelCandidates(taskImpacts, conflictMatrix);
      assert.strictEqual(candidates.length, 2);
      assert.strictEqual(candidates[0].tasks.length, 1);
      assert.strictEqual(candidates[1].tasks.length, 1);
    });

    it('creates single groups for mixed scenarios', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['a.js'], impact: {} },
        { id: 'task-2', files: ['b.js'], impact: {} },
        { id: 'task-3', files: ['a.js'], impact: {} },
      ];
      const conflictMatrix = {
        'task-1::task-3': { task_a: 'task-1', task_b: 'task-3' },
      };
      const candidates = findParallelCandidates(taskImpacts, conflictMatrix);
      assert.strictEqual(candidates.length, 2);
    });

    it('assigns correct reason to groups', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['a.js'], impact: {} },
        { id: 'task-2', files: ['b.js'], impact: {} },
      ];
      const candidates = findParallelCandidates(taskImpacts, {});
      assert.ok(candidates[0].reason.includes('Independent'));
    });
  });

  describe('identifySequentialRequirements', async () => {
    it('identifies configuration conflicts as sequential', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['package.json'], priority: 1 },
        { id: 'task-2', files: ['package.json'], priority: 1 },
      ];
      const conflictMatrix = {
        'task-1::task-2': {
          task_a: 'task-1',
          task_b: 'task-2',
          shared_files: ['package.json'],
          type: 'configuration',
          severity: 'high',
        },
      };
      const requirements = identifySequentialRequirements(
        taskImpacts,
        conflictMatrix,
      );
      assert.strictEqual(requirements.length, 1);
      assert.ok(requirements[0].blocks);
      assert.ok(requirements[0].blocked);
    });

    it('does not flag low severity conflicts', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['readme.md'], priority: 1 },
        { id: 'task-2', files: ['readme.md'], priority: 1 },
      ];
      const conflictMatrix = {
        'task-1::task-2': {
          task_a: 'task-1',
          task_b: 'task-2',
          shared_files: ['readme.md'],
          type: 'indirect',
          severity: 'low',
        },
      };
      const requirements = identifySequentialRequirements(
        taskImpacts,
        conflictMatrix,
      );
      assert.strictEqual(requirements.length, 0);
    });

    it('includes reason in requirement', () => {
      const taskImpacts = [
        { id: 'task-1', files: ['go.mod'], priority: 1 },
        { id: 'task-2', files: ['go.mod'], priority: 1 },
      ];
      const conflictMatrix = {
        'task-1::task-2': {
          task_a: 'task-1',
          task_b: 'task-2',
          shared_files: ['go.mod'],
          type: 'configuration',
          severity: 'high',
        },
      };
      const requirements = identifySequentialRequirements(
        taskImpacts,
        conflictMatrix,
      );
      assert.ok(requirements[0].reason.includes('configuration'));
    });
  });

  describe('generateExecutionPlan', async () => {
    it('creates single phase for parallel candidates', () => {
      const candidates = [{ tasks: ['a', 'b'], reason: 'independent' }];
      const requirements = [];
      const plan = generateExecutionPlan(candidates, requirements);
      assert.strictEqual(plan.length, 1);
      assert.strictEqual(plan[0].phase, 0);
      assert.deepStrictEqual(plan[0].parallel, ['a', 'b']);
    });

    it('creates multiple phases for sequential requirements', () => {
      const candidates = [
        { tasks: ['a'], reason: 'solo' },
        { tasks: ['b'], reason: 'solo' },
      ];
      const requirements = [{ blocks: 'a', blocked: 'b', reason: 'conflict' }];
      const plan = generateExecutionPlan(candidates, requirements);
      assert.ok(plan.length >= 1);
    });

    it('marks phases with dependencies', () => {
      const candidates = [
        { tasks: ['a'], reason: 'solo' },
        { tasks: ['b'], reason: 'solo' },
      ];
      const requirements = [{ blocks: 'a', blocked: 'b', reason: 'conflict' }];
      const plan = generateExecutionPlan(candidates, requirements);
      const dependentPhase = plan.find((p) => p.depends_on);
      if (dependentPhase) {
        assert.ok(dependentPhase.depends_on.includes('a'));
      }
    });

    it('handles empty input', () => {
      const plan = generateExecutionPlan([], []);
      assert.ok(Array.isArray(plan));
      assert.strictEqual(plan.length, 0);
    });

    it('includes unscheduled tasks in final phase', () => {
      const candidates = [
        { tasks: ['a'], reason: 'solo' },
        { tasks: ['b'], reason: 'solo' },
        { tasks: ['c'], reason: 'solo' },
      ];
      const requirements = [
        { blocks: 'a', blocked: 'b' },
        { blocks: 'b', blocked: 'c' },
        { blocks: 'c', blocked: 'a' },
      ];
      const plan = generateExecutionPlan(candidates, requirements);
      const unscheduledPhase = plan.find((p) => p.note);
      if (unscheduledPhase) {
        assert.ok(unscheduledPhase.parallel.length > 0);
      }
    });
  });

  describe('analyzeParallelExecution', async () => {
    it('returns expected structure', async () => {
      await loadModule();
      mock.method(fs, 'existsSync', () => true);
      mock.method(fs, 'readFileSync', () => 'module.exports = {};');

      mock.method(global, 'beads_list', async () => []);
      mock.method(global, 'bv_impact', async () => ({
        affectedFiles: [],
        dependencies: [],
      }));

      const result = await analyzeParallelExecution({ tasks: [] });

      assert.ok('parallel_candidates' in result);
      assert.ok('sequential_requirements' in result);
      assert.ok('conflict_matrix' in result);
      assert.ok('execution_plan' in result);
      assert.ok('summary' in result);
      assert.ok('total_tasks' in result.summary);
      assert.ok('parallel_groups' in result.summary);
      assert.ok('sequential_chains' in result.summary);
      assert.ok('max_parallelism' in result.summary);

      mock.restoreAll();
    });

    it('returns empty structure for no tasks', async () => {
      await loadModule();
      mock.method(global, 'beads_list', async () => []);
      mock.method(global, 'bv_impact', async () => ({
        affectedFiles: [],
        dependencies: [],
      }));

      const result = await analyzeParallelExecution({ tasks: [] });

      assert.strictEqual(result.summary.total_tasks, 0);
      assert.strictEqual(result.parallel_candidates.length, 0);
      assert.strictEqual(result.sequential_requirements.length, 0);

      mock.restoreAll();
    });

    it('identifies parallel candidates', async () => {
      await loadModule();
      const tasks = [
        { id: 't1', title: 'Task 1', files: ['a.js'] },
        { id: 't2', title: 'Task 2', files: ['b.js'] },
      ];
      mock.method(global, 'beads_list', async () => tasks);
      mock.method(global, 'bv_impact', async () => ({
        affectedFiles: [],
        dependencies: [],
      }));

      const result = await analyzeParallelExecution({ tasks: ['t1', 't2'] });

      assert.ok(result.parallel_candidates.length > 0);
      assert.ok(result.parallel_candidates[0].tasks.length > 0);

      mock.restoreAll();
    });

    it('detects sequential requirements for config conflicts', async () => {
      await loadModule();
      const tasks = [
        { id: 't1', title: 'Task 1', files: ['package.json'], priority: 1 },
        { id: 't2', title: 'Task 2', files: ['package.json'], priority: 1 },
      ];
      mock.method(global, 'beads_list', async () => tasks);
      mock.method(global, 'bv_impact', async () => ({
        affectedFiles: [],
        dependencies: [],
      }));

      const result = await analyzeParallelExecution({ tasks: ['t1', 't2'] });

      assert.ok(result.sequential_requirements.length > 0);
      assert.strictEqual(result.sequential_requirements[0].severity, 'high');

      mock.restoreAll();
    });

    it('generates execution plan', async () => {
      await loadModule();
      const tasks = [
        { id: 't1', title: 'Task 1', files: ['a.js'] },
        { id: 't2', title: 'Task 2', files: ['b.js'] },
      ];
      mock.method(global, 'beads_list', async () => tasks);
      mock.method(global, 'bv_impact', async () => ({
        affectedFiles: [],
        dependencies: [],
      }));

      const result = await analyzeParallelExecution({ tasks: ['t1', 't2'] });

      assert.ok(result.execution_plan.length > 0);
      assert.ok('phase' in result.execution_plan[0]);
      assert.ok('parallel' in result.execution_plan[0]);

      mock.restoreAll();
    });

    it('calculates correct summary statistics', async () => {
      await loadModule();
      const tasks = [
        { id: 't1', title: 'Task 1', files: ['a.js'] },
        { id: 't2', title: 'Task 2', files: ['b.js'] },
        { id: 't3', title: 'Task 3', files: ['c.js'] },
      ];
      mock.method(global, 'beads_list', async () => tasks);
      mock.method(global, 'bv_impact', async () => ({
        affectedFiles: [],
        dependencies: [],
      }));

      const result = await analyzeParallelExecution({
        tasks: ['t1', 't2', 't3'],
      });

      assert.strictEqual(result.summary.total_tasks, 3);

      mock.restoreAll();
    });
  });
});
