/**
 * Unit tests for lib/task-clustering.js
 * Tests task clustering functionality for parallel execution optimization.
 */

import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { clusterTasks } from '../../lib/task-clustering.js';

describe('task-clustering', () => {
  describe('clusterTasks()', () => {
    it('should return empty result for empty tasks array', async () => {
      const result = await clusterTasks([]);
      assert.deepStrictEqual(result.clusters, []);
      assert.deepStrictEqual(result.dependencies, []);
      assert.deepStrictEqual(result.executionPlan, []);
      assert.strictEqual(result.metrics.totalTasks, 0);
      assert.strictEqual(result.metrics.estimatedSpeedup, 1);
    });

    it('should return empty result for null tasks', async () => {
      const result = await clusterTasks(null);
      assert.deepStrictEqual(result.clusters, []);
      assert.strictEqual(result.metrics.totalTasks, 0);
    });

    it('should return empty result for undefined tasks', async () => {
      const result = await clusterTasks(undefined);
      assert.deepStrictEqual(result.clusters, []);
      assert.strictEqual(result.metrics.totalTasks, 0);
    });

    it('should group independent tasks into same cluster', async () => {
      const tasks = [
        { id: 'task-1', title: 'Update README', files: ['README.md'] },
        { id: 'task-2', title: 'Fix typo', files: ['README.md'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.clusters.length > 0);
      const cluster = result.clusters[0];
      assert.ok(cluster.tasks.length >= 1);
    });

    it('should respect maxClusterSize option', async () => {
      const tasks = [
        { id: 'task-1', title: 'Task 1', files: ['file1.js'] },
        { id: 'task-2', title: 'Task 2', files: ['file2.js'] },
        { id: 'task-3', title: 'Task 3', files: ['file3.js'] },
        { id: 'task-4', title: 'Task 4', files: ['file4.js'] },
        { id: 'task-5', title: 'Task 5', files: ['file5.js'] },
      ];

      const result = await clusterTasks(tasks, {
        maxClusterSize: 2,
        useImpactAnalysis: false,
      });

      for (const cluster of result.clusters) {
        assert.ok(cluster.tasks.length <= 2);
      }
    });

    it('should disable impact analysis when useImpactAnalysis is false', async () => {
      const tasks = [
        { id: 'task-1', title: 'Task 1', files: ['src/a.js'] },
        { id: 'task-2', title: 'Task 2', files: ['src/b.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });
      assert.ok(result.clusters.length > 0);
      assert.ok(result.dependencies.length >= 0);
    });

    it('should include metrics in result', async () => {
      const tasks = [
        { id: 'task-1', title: 'Task 1', files: ['a.js'] },
        { id: 'task-2', title: 'Task 2', files: ['b.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok('totalTasks' in result.metrics);
      assert.ok('totalClusters' in result.metrics);
      assert.ok('parallelizable' in result.metrics);
      assert.ok('estimatedSpeedup' in result.metrics);
      assert.strictEqual(result.metrics.totalTasks, 2);
    });

    it('should extract files from task description', async () => {
      const tasks = [
        {
          id: 'task-1',
          title: 'Modify files',
          description: 'Files: src/index.js, src/utils.js',
        },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });
      assert.ok(result.clusters.length > 0);
    });

    it('should create clusters with parallelizable flag', async () => {
      const tasks = [
        { id: 't1', title: 'Task 1', files: ['a.js'] },
        { id: 't2', title: 'Task 2', files: ['b.js'] },
        { id: 't3', title: 'Task 3', files: ['c.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      const parallelClusters = result.clusters.filter((c) => c.parallelizable);
      assert.ok(parallelClusters.length > 0);
    });

    it('should include task details in cluster', async () => {
      const tasks = [
        { id: 't1', title: 'Task 1', files: ['a.js'], priority: 1 },
        { id: 't2', title: 'Task 2', files: ['b.js'], priority: 2 },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.clusters[0].taskDetails);
      assert.strictEqual(result.clusters[0].taskDetails.length, 2);
    });

    it('should include cluster ID in result', async () => {
      const tasks = [{ id: 'task-1', title: 'Task 1', files: ['a.js'] }];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.clusters[0].id);
      assert.ok(result.clusters[0].id.startsWith('cluster-'));
    });

    it('should include reason in cluster', async () => {
      const tasks = [{ id: 'task-1', title: 'Task 1', files: ['a.js'] }];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.clusters[0].reason);
      assert.ok(result.clusters[0].reason.length > 0);
    });
  });

  describe('clusterTasks() - sequential dependencies', () => {
    it('should return empty dependencies for non-conflicting tasks', async () => {
      const tasks = [
        { id: 't1', files: ['a.js'] },
        { id: 't2', files: ['b.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });
      assert.deepStrictEqual(result.dependencies, []);
    });

    it('should identify dependencies for tasks sharing files', async () => {
      const tasks = [
        { id: 't1', files: ['shared.js'], priority: 1 },
        { id: 't2', files: ['shared.js'], priority: 2 },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.strictEqual(result.dependencies.length, 1);
      assert.ok('after' in result.dependencies[0]);
      assert.ok('before' in result.dependencies[0]);
      assert.ok('reason' in result.dependencies[0]);
    });

    it('should prioritize higher priority task as blocker', async () => {
      const tasks = [
        { id: 'low-priority', files: ['file.js'], priority: 1 },
        { id: 'high-priority', files: ['file.js'], priority: 10 },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.strictEqual(result.dependencies[0].after, 'high-priority');
      assert.strictEqual(result.dependencies[0].before, 'low-priority');
    });

    it('should use file count for ordering when priorities equal', async () => {
      const tasks = [
        { id: 'small', files: ['file.js'], priority: 5 },
        {
          id: 'large',
          files: ['file.js', 'file2.js', 'file3.js'],
          priority: 5,
        },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.strictEqual(result.dependencies[0].after, 'large');
      assert.strictEqual(result.dependencies[0].before, 'small');
    });
  });

  describe('clusterTasks() - execution plan', () => {
    it('should return empty plan for no clusters', async () => {
      const result = await clusterTasks([]);
      assert.deepStrictEqual(result.executionPlan, []);
    });

    it('should create phases for each cluster', async () => {
      const tasks = [
        { id: 't1', files: ['a.js'] },
        { id: 't2', files: ['b.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.executionPlan.length >= 1);
    });

    it('should include phase numbers in plan', async () => {
      const tasks = [
        { id: 't1', files: ['a.js'] },
        { id: 't2', files: ['b.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      for (let i = 0; i < result.executionPlan.length; i++) {
        assert.strictEqual(result.executionPlan[i].phase, i);
      }
    });

    it('should mark parallel phases correctly', async () => {
      const tasks = [
        { id: 't1', files: ['a.js'] },
        { id: 't2', files: ['b.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      const parallelPhase = result.executionPlan.find((p) => p.parallel);
      assert.ok(parallelPhase);
    });

    it('should include description in each phase', async () => {
      const tasks = [{ id: 't1', files: ['a.js'] }];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      for (const step of result.executionPlan) {
        assert.ok(step.description.length > 0);
      }
    });

    it('should include tasks in each phase', async () => {
      const tasks = [
        { id: 't1', files: ['a.js'] },
        { id: 't2', files: ['b.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      for (const step of result.executionPlan) {
        assert.ok(step.tasks.length > 0);
      }
    });
  });

  describe('clusterTasks() - speedup calculation', () => {
    it('should return speedup of 1 for single task', async () => {
      const tasks = [{ id: 't1', files: ['a.js'] }];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.strictEqual(result.metrics.estimatedSpeedup, 1);
    });

    it('should calculate speedup for parallel tasks', async () => {
      const tasks = [
        { id: 't1', files: ['a.js'] },
        { id: 't2', files: ['b.js'] },
        { id: 't3', files: ['c.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.metrics.estimatedSpeedup > 1);
    });

    it('should calculate parallelizable cluster count', async () => {
      const tasks = [
        { id: 't1', files: ['a.js'] },
        { id: 't2', files: ['b.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.metrics.parallelizable >= 0);
    });
  });

  describe('clusterTasks() - edge cases', () => {
    it('should handle single task with priority', async () => {
      const tasks = [
        { id: 't1', title: 'Task', files: ['a.js'], priority: 100 },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.strictEqual(result.clusters.length, 1);
      assert.strictEqual(result.metrics.totalTasks, 1);
    });

    it('should handle tasks with empty files array', async () => {
      const tasks = [
        { id: 't1', files: [] },
        { id: 't2', files: [] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.clusters.length > 0);
    });

    it('should handle tasks with duplicate file paths', async () => {
      const tasks = [
        { id: 't1', files: ['a.js', 'a.js'] },
        { id: 't2', files: ['b.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.clusters.length > 0);
    });

    it('should handle tasks with special characters in files', async () => {
      const tasks = [
        { id: 't1', files: ['src/components/Button.jsx'] },
        { id: 't2', files: ['src/utils/helpers.ts'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.clusters.length > 0);
    });
  });

  describe('clusterTasks() - integration scenarios', () => {
    it('should cluster completely independent tasks', async () => {
      const tasks = [
        { id: 'docs', title: 'Update docs', files: ['README.md'] },
        { id: 'tests', title: 'Add tests', files: ['test.js'] },
        { id: 'config', title: 'Update config', files: ['config.yaml'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.strictEqual(result.clusters.length, 1);
      assert.strictEqual(result.clusters[0].tasks.length, 3);
      assert.strictEqual(result.executionPlan.length, 1);
      assert.ok(result.executionPlan[0].parallel);
    });

    it('should separate tasks with file conflicts', async () => {
      const tasks = [
        { id: 'api', title: 'API changes', files: ['api.js', 'types.ts'] },
        { id: 'ui', title: 'UI changes', files: ['ui.js', 'types.ts'] },
        { id: 'docs', title: 'Documentation', files: ['README.md'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.ok(result.clusters.length >= 2);
      assert.ok(result.dependencies.length > 0);
    });

    it('should handle mixed priority tasks', async () => {
      const tasks = [
        { id: 'low', title: 'Low priority', files: ['file.js'], priority: 1 },
        {
          id: 'high',
          title: 'High priority',
          files: ['file.js'],
          priority: 10,
        },
        {
          id: 'independent',
          title: 'Independent',
          files: ['other.js'],
          priority: 5,
        },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      const highFirstDep = result.dependencies.find((d) => d.after === 'high');
      assert.ok(highFirstDep);
      assert.strictEqual(highFirstDep.before, 'low');
    });

    it('should respect maxClusterSize of 1', async () => {
      const tasks = [
        { id: 't1', files: ['a.js'] },
        { id: 't2', files: ['b.js'] },
        { id: 't3', files: ['c.js'] },
      ];

      const result = await clusterTasks(tasks, {
        maxClusterSize: 1,
        useImpactAnalysis: false,
      });

      for (const cluster of result.clusters) {
        assert.strictEqual(cluster.tasks.length, 1);
      }
    });

    it('should calculate correct metrics for multiple clusters', async () => {
      const tasks = [
        { id: 't1', files: ['a.js'] },
        { id: 't2', files: ['a.js'] },
        { id: 't3', files: ['b.js'] },
        { id: 't4', files: ['c.js'] },
      ];

      const result = await clusterTasks(tasks, { useImpactAnalysis: false });

      assert.strictEqual(result.metrics.totalTasks, 4);
      assert.strictEqual(result.metrics.totalClusters, result.clusters.length);
    });
  });
});
