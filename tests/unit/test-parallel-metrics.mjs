import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ParallelMetrics,
  resetCollector,
  TimeSeriesBuffer,
} from '../../lib/parallel-metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_METRICS_PATH = path.join(
  __dirname,
  '../../.test-parallel-metrics.json',
);

/**
 * Unit tests for parallel-metrics.js
 * @namespace ParallelMetricsTests
 */

describe('TimeSeriesBuffer', () => {
  /** @type {TimeSeriesBuffer} */
  let buffer;

  beforeEach(() => {
    buffer = new TimeSeriesBuffer(5);
  });

  describe('push()', () => {
    it('should push values with timestamps', () => {
      buffer.push(10, 1000);
      buffer.push(20, 2000);

      const arr = buffer.toArray();
      assert.strictEqual(arr.length, 2);
      assert.strictEqual(arr[0].value, 10);
      assert.strictEqual(arr[0].timestamp, 1000);
      assert.strictEqual(arr[1].value, 20);
      assert.strictEqual(arr[1].timestamp, 2000);
    });

    it('should maintain max size by removing oldest entries', () => {
      for (let i = 0; i < 7; i++) {
        buffer.push(i);
      }

      const arr = buffer.toArray();
      assert.strictEqual(arr.length, 5);
      assert.strictEqual(arr[0].value, 2);
      assert.strictEqual(arr[4].value, 6);
    });

    it('should use current timestamp when not provided', () => {
      const before = Date.now();
      buffer.push(42);
      const after = Date.now();

      const latest = buffer.latest;
      assert.strictEqual(latest.value, 42);
      assert.ok(latest.timestamp >= before && latest.timestamp <= after);
    });
  });

  describe('latest getter', () => {
    it('should return null for empty buffer', () => {
      assert.strictEqual(buffer.latest, null);
    });

    it('should return last pushed value', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      assert.strictEqual(buffer.latest.value, 3);
    });
  });

  describe('average getter', () => {
    it('should return 0 for empty buffer', () => {
      assert.strictEqual(buffer.average, 0);
    });

    it('should calculate correct average', () => {
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);

      assert.strictEqual(buffer.average, 20);
    });

    it('should handle single value', () => {
      buffer.push(100);
      assert.strictEqual(buffer.average, 100);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.clear();

      assert.strictEqual(buffer.toArray().length, 0);
      assert.strictEqual(buffer.latest, null);
      assert.strictEqual(buffer.average, 0);
    });
  });
});

describe('ParallelMetrics', () => {
  /** @type {ParallelMetrics} */
  let metrics;

  const createMetricsPath = () => TEST_METRICS_PATH;

  beforeEach(() => {
    resetCollector();
    if (fs.existsSync(createMetricsPath())) {
      fs.unlinkSync(createMetricsPath());
    }
    metrics = new ParallelMetrics({
      windowSize: 100,
      historySize: 30,
      filePath: createMetricsPath(),
    });
  });

  afterEach(() => {
    if (fs.existsSync(createMetricsPath())) {
      fs.unlinkSync(createMetricsPath());
    }
  });

  describe('recordExecution()', () => {
    it('should track parallel task execution', () => {
      metrics.recordExecution({ parallel: true, depth: 3 });

      const result = metrics.getMetrics();
      assert.strictEqual(result.totals.tasks, 1);
      assert.strictEqual(result.totals.parallel, 1);
      assert.strictEqual(result.totals.sequential, 0);
    });

    it('should track sequential task execution', () => {
      metrics.recordExecution({ parallel: false, depth: 1 });

      const result = metrics.getMetrics();
      assert.strictEqual(result.totals.tasks, 1);
      assert.strictEqual(result.totals.parallel, 0);
      assert.strictEqual(result.totals.sequential, 1);
    });

    it('should track execution depth', () => {
      metrics.recordExecution({ parallel: true, depth: 5 });
      metrics.recordExecution({ parallel: true, depth: 3 });

      const result = metrics.getMetrics();
      assert.strictEqual(result.avgParallelDepth, 4);
    });

    it('should track conflicts', () => {
      metrics.recordExecution({ parallel: true, conflicts: 2 });
      metrics.recordExecution({ parallel: false, conflicts: 1 });

      const result = metrics.getMetrics();
      assert.strictEqual(result.totals.conflicts, 3);
      assert.strictEqual(result.conflictRate, 50);
    });

    it('should track blockers', () => {
      metrics.recordExecution({ parallel: true, blockers: 5 });

      const result = metrics.getMetrics();
      assert.strictEqual(result.totals.blockers, 5);
      assert.strictEqual(result.sequentialBlockers, 5);
    });

    it('should calculate parallel execution rate', () => {
      metrics.recordExecution({ parallel: true });
      metrics.recordExecution({ parallel: true });
      metrics.recordExecution({ parallel: false });

      const result = metrics.getMetrics();
      assert.strictEqual(result.parallelExecutionRate, 66.67);
    });

    it('should use default values when options not provided', () => {
      metrics.recordExecution();

      const result = metrics.getMetrics();
      assert.strictEqual(result.totals.tasks, 1);
      assert.strictEqual(result.parallelExecutionRate, 0);
      assert.strictEqual(result.avgParallelDepth, 1);
    });

    it('should update time series buffers', () => {
      metrics.recordExecution({ parallel: true, depth: 2 });

      const history = metrics.getHistory();
      assert.ok(history.parallelExecutionRate.length > 0);
      assert.ok(history.avgParallelDepth.length > 0);
    });
  });

  describe('getMetrics()', () => {
    it('should return all metrics structure', () => {
      const result = metrics.getMetrics();

      assert.ok('parallelExecutionRate' in result);
      assert.ok('avgParallelDepth' in result);
      assert.ok('conflictRate' in result);
      assert.ok('sequentialBlockers' in result);
      assert.ok('totals' in result);
      assert.ok('tasks' in result.totals);
      assert.ok('parallel' in result.totals);
      assert.ok('sequential' in result.totals);
      assert.ok('conflicts' in result.totals);
      assert.ok('blockers' in result.totals);
    });

    it('should return zeros when no tasks recorded', () => {
      const result = metrics.getMetrics();

      assert.strictEqual(result.parallelExecutionRate, 0);
      assert.strictEqual(result.avgParallelDepth, 0);
      assert.strictEqual(result.conflictRate, 0);
      assert.strictEqual(result.sequentialBlockers, 0);
      assert.strictEqual(result.totals.tasks, 0);
    });

    it('should handle edge case with no execution depths', () => {
      metrics.recordExecution({ depth: 0 });

      const result = metrics.getMetrics();
      assert.strictEqual(result.avgParallelDepth, 0);
    });

    it('should round values to 2 decimal places', () => {
      metrics.recordExecution({ parallel: true, depth: 3 });
      metrics.recordExecution({ parallel: true, depth: 3 });
      metrics.recordExecution({ parallel: true, depth: 3 });

      const result = metrics.getMetrics();
      assert.strictEqual(result.parallelExecutionRate, 100);
      assert.strictEqual(result.avgParallelDepth, 3);
    });
  });

  describe('getHistory()', () => {
    it('should return all time series data', () => {
      metrics.recordExecution({ parallel: true });

      const history = metrics.getHistory();

      assert.ok(Array.isArray(history.parallelExecutionRate));
      assert.ok(Array.isArray(history.avgParallelDepth));
      assert.ok(Array.isArray(history.conflictRate));
      assert.ok(Array.isArray(history.sequentialBlockers));
    });

    it('should return entries with value and timestamp', () => {
      metrics.recordExecution({ parallel: true });

      const history = metrics.getHistory();
      const entry = history.parallelExecutionRate[0];

      assert.ok('value' in entry);
      assert.ok('timestamp' in entry);
    });

    it('should return empty arrays when no data', () => {
      const history = metrics.getHistory();

      assert.strictEqual(history.parallelExecutionRate.length, 0);
      assert.strictEqual(history.avgParallelDepth.length, 0);
    });
  });

  describe('getTrends()', () => {
    it('should return trend structure for each metric', () => {
      metrics.recordExecution({ parallel: true });

      const trends = metrics.getTrends();

      assert.ok('parallelExecutionRate' in trends);
      assert.ok('avgParallelDepth' in trends);
      assert.ok('conflictRate' in trends);
      assert.ok('sequentialBlockers' in trends);
    });

    it('should return stable direction for single data point', () => {
      metrics.recordExecution({ parallel: true });

      const trends = metrics.getTrends();
      const trend = trends.parallelExecutionRate;

      assert.strictEqual(trend.direction, 'stable');
      assert.strictEqual(trend.change, 0);
    });

    it('should detect increasing trend', () => {
      for (let i = 0; i < 10; i++) {
        metrics.recordExecution({ parallel: i < 8 });
      }

      const trends = metrics.getTrends();
      assert.strictEqual(trends.parallelExecutionRate.direction, 'increasing');
    });

    it('should detect decreasing trend', () => {
      for (let i = 0; i < 10; i++) {
        metrics.recordExecution({ parallel: i >= 2 });
      }

      const trends = metrics.getTrends();
      assert.strictEqual(trends.parallelExecutionRate.direction, 'decreasing');
    });

    it('should calculate change value', () => {
      for (let i = 0; i < 10; i++) {
        metrics.recordExecution({ parallel: true, depth: i + 1 });
      }

      const trends = metrics.getTrends();
      assert.ok('change' in trends.parallelExecutionRate);
      assert.ok('recentAvg' in trends.parallelExecutionRate);
      assert.ok('olderAvg' in trends.parallelExecutionRate);
    });

    it('should include recent and older averages', () => {
      for (let i = 0; i < 10; i++) {
        metrics.recordExecution({ parallel: true, depth: 10 - i });
      }

      const trends = metrics.getTrends();
      const trend = trends.avgParallelDepth;

      assert.strictEqual(trend.recentAvg, trend.olderAvg);
    });
  });

  describe('getInsights()', () => {
    it('should return metrics, trends, and insights', () => {
      const result = metrics.getInsights();

      assert.ok('metrics' in result);
      assert.ok('trends' in result);
      assert.ok('insights' in result);
      assert.ok(Array.isArray(result.insights));
    });

    it('should warn when parallel execution rate is low', () => {
      for (let i = 0; i < 20; i++) {
        metrics.recordExecution({ parallel: false });
      }

      const result = metrics.getInsights();
      const warning = result.insights.find(
        (i) => i.metric === 'parallelExecutionRate' && i.type === 'warning',
      );

      assert.ok(warning);
      assert.ok(warning.message.includes('Low parallel execution'));
    });

    it('should indicate success when parallel execution rate is high', () => {
      for (let i = 0; i < 20; i++) {
        metrics.recordExecution({ parallel: true });
      }

      const result = metrics.getInsights();
      const success = result.insights.find(
        (i) => i.metric === 'parallelExecutionRate' && i.type === 'success',
      );

      assert.ok(success);
      assert.ok(success.message.includes('High parallel execution'));
    });

    it('should warn when parallel execution rate is decreasing', () => {
      for (let i = 0; i < 10; i++) {
        metrics.recordExecution({ parallel: true });
      }
      for (let i = 0; i < 5; i++) {
        metrics.recordExecution({ parallel: false });
      }

      const result = metrics.getInsights();
      const warning = result.insights.find(
        (i) =>
          i.metric === 'parallelExecutionRate' &&
          i.message.includes('trending down'),
      );

      assert.ok(warning);
    });

    it('should warn when conflict rate is high', () => {
      metrics.recordExecution({ parallel: true, conflicts: 10 });
      metrics.recordExecution({ parallel: true, conflicts: 10 });
      metrics.recordExecution({ parallel: true, conflicts: 10 });
      metrics.recordExecution({ parallel: true, conflicts: 10 });

      const result = metrics.getInsights();
      const warning = result.insights.find(
        (i) => i.metric === 'conflictRate' && i.type === 'warning',
      );

      assert.ok(warning);
    });

    it('should warn when conflict rate is increasing', () => {
      for (let i = 0; i < 5; i++) {
        metrics.recordExecution({ parallel: true, conflicts: i });
      }

      const result = metrics.getInsights();
      const warning = result.insights.find(
        (i) => i.metric === 'conflictRate' && i.message.includes('increasing'),
      );

      assert.ok(warning);
    });

    it('should provide info when sequential blockers are high', () => {
      for (let i = 0; i < 15; i++) {
        metrics.recordExecution({ blockers: 1 });
      }

      const result = metrics.getInsights();
      const info = result.insights.find(
        (i) => i.metric === 'sequentialBlockers' && i.type === 'info',
      );

      assert.ok(info);
    });

    it('should return empty insights when metrics are healthy', () => {
      for (let i = 0; i < 50; i++) {
        metrics.recordExecution({ parallel: true, conflicts: 0, blockers: 0 });
      }

      const result = metrics.getInsights();
      assert.strictEqual(result.insights.length, 0);
    });
  });

  describe('History tracking', () => {
    it('should accumulate history across multiple executions', () => {
      for (let i = 0; i < 5; i++) {
        metrics.recordExecution({ parallel: i % 2 === 0, depth: i + 1 });
      }

      const history = metrics.getHistory();
      assert.strictEqual(history.parallelExecutionRate.length, 5);
      assert.strictEqual(history.avgParallelDepth.length, 5);
    });

    it('should limit history size', () => {
      const smallMetrics = new ParallelMetrics({
        historySize: 3,
        filePath: createMetricsPath(),
      });

      for (let i = 0; i < 10; i++) {
        smallMetrics.recordExecution({ parallel: true });
      }

      const history = smallMetrics.getHistory();
      assert.strictEqual(history.parallelExecutionRate.length, 3);
    });

    it('should persist history after save/load', () => {
      metrics.recordExecution({ parallel: true, depth: 5 });

      const newMetrics = new ParallelMetrics({ filePath: createMetricsPath() });
      const history = newMetrics.getHistory();

      assert.ok(history.parallelExecutionRate.length > 0);
    });
  });

  describe('reset()', () => {
    it('should clear all metrics', () => {
      metrics.recordExecution({ parallel: true, conflicts: 2, blockers: 3 });
      metrics.reset();

      const result = metrics.getMetrics();
      assert.strictEqual(result.totals.tasks, 0);
      assert.strictEqual(result.totals.parallel, 0);
      assert.strictEqual(result.totals.conflicts, 0);
      assert.strictEqual(result.parallelExecutionRate, 0);
    });

    it('should clear history buffers', () => {
      metrics.recordExecution({ parallel: true });
      metrics.reset();

      const history = metrics.getHistory();
      assert.strictEqual(history.parallelExecutionRate.length, 0);
    });

    it('should clear execution depths', () => {
      metrics.recordExecution({ parallel: true, depth: 10 });
      metrics.reset();

      const result = metrics.getMetrics();
      assert.strictEqual(result.avgParallelDepth, 0);
    });
  });

  describe('getCollector()', () => {
    it('should return singleton instance', () => {
      const collector1 = metrics;
      metrics.recordExecution({ parallel: true });

      const collector2 = metrics.constructor._instance || null;
      assert.strictEqual(collector1, collector2);
    });
  });

  describe('resetCollector()', () => {
    it('should reset singleton instance', () => {
      const collector1 = getCollector({ filePath: createMetricsPath() });
      collector1.recordExecution({ parallel: true });

      resetCollector();

      const collector2 = getCollector({ filePath: createMetricsPath() });
      const result = collector2.getMetrics();
      assert.strictEqual(result.totals.tasks, 0);
    });
  });
});
