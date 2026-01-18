import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_WINDOW_SIZE = 100;
const DEFAULT_HISTORY_SIZE = 30;

class TimeSeriesBuffer {
  constructor(maxSize = DEFAULT_HISTORY_SIZE) {
    this.maxSize = maxSize;
    this.data = [];
  }

  push(value, timestamp = Date.now()) {
    this.data.push({ value, timestamp });
    if (this.data.length > this.maxSize) {
      this.data.shift();
    }
  }

  toArray() {
    return [...this.data];
  }

  clear() {
    this.data = [];
  }

  get latest() {
    return this.data.length > 0 ? this.data[this.data.length - 1] : null;
  }

  get average() {
    if (this.data.length === 0) return 0;
    const sum = this.data.reduce((acc, d) => acc + d.value, 0);
    return sum / this.data.length;
  }
}

class ParallelMetrics {
  constructor(options = {}) {
    this.windowSize = options.windowSize || DEFAULT_WINDOW_SIZE;
    this.historySize = options.historySize || DEFAULT_HISTORY_SIZE;
    this.filePath =
      options.filePath || path.join(__dirname, '../../.parallel-metrics.json');

    this.parallelExecutionRate = new TimeSeriesBuffer(this.historySize);
    this.avgParallelDepth = new TimeSeriesBuffer(this.historySize);
    this.conflictRate = new TimeSeriesBuffer(this.historySize);
    this.sequentialBlockers = new TimeSeriesBuffer(this.historySize);

    this.totalTasks = 0;
    this.parallelTasks = 0;
    this.sequentialTasks = 0;
    this.totalConflicts = 0;
    this.totalBlockers = 0;
    this.executionDepths = [];

    this.load();
  }

  recordExecution(options = {}) {
    const {
      parallel = false,
      depth = 1,
      conflicts = 0,
      blockers = 0,
    } = options;

    this.totalTasks++;

    if (parallel) {
      this.parallelTasks++;
    } else {
      this.sequentialTasks++;
    }

    if (depth > 0) {
      this.executionDepths.push(depth);
    }

    this.totalConflicts += conflicts;
    this.totalBlockers += blockers;

    const parallelRate =
      this.totalTasks > 0 ? (this.parallelTasks / this.totalTasks) * 100 : 0;

    const avgDepth =
      this.executionDepths.length > 0
        ? this.executionDepths.reduce((a, b) => a + b, 0) /
          this.executionDepths.length
        : 0;

    const conflictPer100 =
      this.totalTasks > 0 ? (this.totalConflicts / this.totalTasks) * 100 : 0;

    this.parallelExecutionRate.push(parallelRate);
    this.avgParallelDepth.push(avgDepth);
    this.conflictRate.push(conflictPer100);
    this.sequentialBlockers.push(this.totalBlockers);

    this.save();
  }

  getMetrics() {
    const parallelRate =
      this.totalTasks > 0 ? (this.parallelTasks / this.totalTasks) * 100 : 0;

    const avgDepth =
      this.executionDepths.length > 0
        ? this.executionDepths.reduce((a, b) => a + b, 0) /
          this.executionDepths.length
        : 0;

    const conflictPer100 =
      this.totalTasks > 0 ? (this.totalConflicts / this.totalTasks) * 100 : 0;

    return {
      parallelExecutionRate: parseFloat(parallelRate.toFixed(2)),
      avgParallelDepth: parseFloat(avgDepth.toFixed(2)),
      conflictRate: parseFloat(conflictPer100.toFixed(2)),
      sequentialBlockers: this.totalBlockers,
      totals: {
        tasks: this.totalTasks,
        parallel: this.parallelTasks,
        sequential: this.sequentialTasks,
        conflicts: this.totalConflicts,
        blockers: this.totalBlockers,
      },
    };
  }

  getHistory() {
    return {
      parallelExecutionRate: this.parallelExecutionRate.toArray(),
      avgParallelDepth: this.avgParallelDepth.toArray(),
      conflictRate: this.conflictRate.toArray(),
      sequentialBlockers: this.sequentialBlockers.toArray(),
    };
  }

  getTrends() {
    const history = this.getHistory();

    const calculateTrend = (series) => {
      if (series.length < 2) return { direction: 'stable', change: 0 };

      const recent = series.slice(-5);
      const older = series.slice(0, Math.min(5, series.length - 5));

      const recentAvg =
        recent.reduce((acc, d) => acc + d.value, 0) / recent.length;
      const olderAvg =
        older.length > 0
          ? older.reduce((acc, d) => acc + d.value, 0) / older.length
          : recentAvg;

      const change = recentAvg - olderAvg;
      const direction =
        change > 0.5 ? 'increasing' : change < -0.5 ? 'decreasing' : 'stable';

      return {
        direction,
        change: parseFloat(change.toFixed(2)),
        recentAvg: parseFloat(recentAvg.toFixed(2)),
        olderAvg: parseFloat(olderAvg.toFixed(2)),
      };
    };

    return {
      parallelExecutionRate: calculateTrend(history.parallelExecutionRate),
      avgParallelDepth: calculateTrend(history.avgParallelDepth),
      conflictRate: calculateTrend(history.conflictRate),
      sequentialBlockers: calculateTrend(history.sequentialBlockers),
    };
  }

  getInsights() {
    const metrics = this.getMetrics();
    const trends = this.getTrends();
    const insights = [];

    if (metrics.parallelExecutionRate < 25) {
      insights.push({
        type: 'warning',
        metric: 'parallelExecutionRate',
        message: 'Low parallel execution rate. Consider task dependencies.',
        suggestion: 'Review task dependencies to enable more parallel work.',
      });
    } else if (metrics.parallelExecutionRate > 75) {
      insights.push({
        type: 'success',
        metric: 'parallelExecutionRate',
        message: 'High parallel execution rate.',
        suggestion: 'Good task decomposition for parallelism.',
      });
    }

    if (trends.parallelExecutionRate.direction === 'decreasing') {
      insights.push({
        type: 'warning',
        metric: 'parallelExecutionRate',
        message: 'Parallel execution rate is trending down.',
        suggestion: 'Check for increasing sequential dependencies.',
      });
    }

    if (metrics.conflictRate > 5) {
      insights.push({
        type: 'warning',
        metric: 'conflictRate',
        message: `High conflict rate: ${metrics.conflictRate}%`,
        suggestion: 'Review file reservation patterns and task boundaries.',
      });
    }

    if (trends.conflictRate.direction === 'increasing') {
      insights.push({
        type: 'warning',
        metric: 'conflictRate',
        message: 'File conflicts are increasing.',
        suggestion: 'Consider splitting tasks to reduce file overlap.',
      });
    }

    if (metrics.sequentialBlockers > 10) {
      insights.push({
        type: 'info',
        metric: 'sequentialBlockers',
        message: `${metrics.sequentialBlockers} sequential blockers recorded.`,
        suggestion: 'Identify common blocking patterns.',
      });
    }

    return {
      metrics,
      trends,
      insights,
    };
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));

        this.totalTasks = data.totalTasks || 0;
        this.parallelTasks = data.parallelTasks || 0;
        this.sequentialTasks = data.sequentialTasks || 0;
        this.totalConflicts = data.totalConflicts || 0;
        this.totalBlockers = data.totalBlockers || 0;
        this.executionDepths = data.executionDepths || [];

        if (data.history) {
          for (const entry of data.history.parallelExecutionRate || []) {
            this.parallelExecutionRate.push(entry.value, entry.timestamp);
          }
          for (const entry of data.history.avgParallelDepth || []) {
            this.avgParallelDepth.push(entry.value, entry.timestamp);
          }
          for (const entry of data.history.conflictRate || []) {
            this.conflictRate.push(entry.value, entry.timestamp);
          }
          for (const entry of data.history.sequentialBlockers || []) {
            this.sequentialBlockers.push(entry.value, entry.timestamp);
          }
        }
      }
    } catch (error) {}
  }

  save() {
    const data = {
      totalTasks: this.totalTasks,
      parallelTasks: this.parallelTasks,
      sequentialTasks: this.sequentialTasks,
      totalConflicts: this.totalConflicts,
      totalBlockers: this.totalBlockers,
      executionDepths: this.executionDepths.slice(-this.windowSize),
      history: {
        parallelExecutionRate: this.parallelExecutionRate.toArray(),
        avgParallelDepth: this.avgParallelDepth.toArray(),
        conflictRate: this.conflictRate.toArray(),
        sequentialBlockers: this.sequentialBlockers.toArray(),
      },
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  reset() {
    this.totalTasks = 0;
    this.parallelTasks = 0;
    this.sequentialTasks = 0;
    this.totalConflicts = 0;
    this.totalBlockers = 0;
    this.executionDepths = [];

    this.parallelExecutionRate.clear();
    this.avgParallelDepth.clear();
    this.conflictRate.clear();
    this.sequentialBlockers.clear();

    this.save();
  }
}

let collectorInstance = null;

function getCollector(options = {}) {
  if (!collectorInstance) {
    collectorInstance = new ParallelMetrics(options);
  }
  return collectorInstance;
}

function resetCollector() {
  if (collectorInstance) {
    collectorInstance.reset();
  }
  collectorInstance = null;
}

export { ParallelMetrics, TimeSeriesBuffer, getCollector, resetCollector };
export default ParallelMetrics;
