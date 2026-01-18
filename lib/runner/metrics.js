import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_WINDOW_SIZE = 1000;

class CircularBuffer {
  constructor(size) {
    this.size = size;
    this.buffer = new Array(size);
    this.head = 0;
    this.length = 0;
  }

  push(value) {
    this.buffer[this.head] = value;
    this.head = (this.head + 1) % this.size;
    if (this.length < this.size) {
      this.length++;
    }
  }

  toArray() {
    const result = new Array(this.length);
    for (let i = 0; i < this.length; i++) {
      const index = (this.head - this.length + i + this.size) % this.size;
      result[i] = this.buffer[index];
    }
    return result;
  }

  clear() {
    this.buffer = new Array(this.size);
    this.head = 0;
    this.length = 0;
  }
}

class GateMetrics {
  constructor(windowSize = DEFAULT_WINDOW_SIZE) {
    this.timings = new CircularBuffer(windowSize);
    this.results = new CircularBuffer(windowSize);
    this.successCount = 0;
    this.failureCount = 0;
    this.totalCount = 0;
  }

  recordTiming(duration) {
    this.timings.push(duration);
  }

  recordResult(success) {
    this.results.push(success);
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }
    this.totalCount++;
  }

  getPercentile(percentile) {
    const values = this.timings.toArray().sort((a, b) => a - b);
    if (values.length === 0) {
      return 0;
    }
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  getStats() {
    const timings = this.timings.toArray();
    const sortedTimings = timings.slice().sort((a, b) => a - b);
    const sum = timings.reduce((acc, val) => acc + val, 0);
    const avg = timings.length > 0 ? sum / timings.length : 0;
    const min = sortedTimings[0] || 0;
    const max = sortedTimings[sortedTimings.length - 1] || 0;
    const p50 = this.getPercentile(50);
    const p95 = this.getPercentile(95);
    const p99 = this.getPercentile(99);
    const successRate =
      this.totalCount > 0 ? (this.successCount / this.totalCount) * 100 : 0;
    const failureRate =
      this.totalCount > 0 ? (this.failureCount / this.totalCount) * 100 : 0;

    return {
      count: timings.length,
      avg,
      min,
      max,
      p50,
      p95,
      p99,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate,
      failureRate,
    };
  }

  reset() {
    this.timings.clear();
    this.results.clear();
    this.successCount = 0;
    this.failureCount = 0;
    this.totalCount = 0;
  }
}

class MetricsCollector {
  constructor(options = {}) {
    this.windowSize = options.windowSize || DEFAULT_WINDOW_SIZE;
    this.gates = new Map();
    this.lastRun = null;
    this.lastRunStatus = null;
    this.filePath =
      options.filePath || path.join(__dirname, '../../.gate-metrics.json');
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        this.windowSize = data.windowSize || this.windowSize;
        this.lastRun = data.lastRun || null;
        this.lastRunStatus = data.lastRunStatus || null;
        if (data.gates) {
          for (const [gateId, gateData] of Object.entries(data.gates)) {
            const metrics = new GateMetrics(this.windowSize);
            if (gateData.timings) {
              for (const t of gateData.timings) {
                metrics.recordTiming(t);
              }
            }
            metrics.successCount = gateData.successCount || 0;
            metrics.failureCount = gateData.failureCount || 0;
            metrics.totalCount = gateData.totalCount || 0;
            this.gates.set(gateId, metrics);
          }
        }
      }
    } catch (error) {}
  }

  save() {
    const data = {
      windowSize: this.windowSize,
      lastRun: this.lastRun,
      lastRunStatus: this.lastRunStatus,
      gates: {},
    };
    for (const [gateId, metrics] of this.gates) {
      data.gates[gateId] = {
        timings: metrics.timings.toArray(),
        successCount: metrics.successCount,
        failureCount: metrics.failureCount,
        totalCount: metrics.totalCount,
      };
    }
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  getOrCreateGate(gateId) {
    if (!this.gates.has(gateId)) {
      this.gates.set(gateId, new GateMetrics(this.windowSize));
    }
    return this.gates.get(gateId);
  }

  recordTiming(gateId, duration) {
    const metrics = this.getOrCreateGate(gateId);
    metrics.recordTiming(duration);
    this.lastRun = new Date().toISOString();
    this.save();
  }

  recordResult(gateId, success) {
    const metrics = this.getOrCreateGate(gateId);
    metrics.recordResult(success);
    this.lastRun = new Date().toISOString();
    this.lastRunStatus = success ? 'passed' : 'failed';
    this.save();
  }

  getPercentile(gateId, percentile) {
    const metrics = this.gates.get(gateId);
    if (!metrics) {
      return 0;
    }
    return metrics.getPercentile(percentile);
  }

  getStats(gateId) {
    if (gateId) {
      const metrics = this.gates.get(gateId);
      if (!metrics) {
        return null;
      }
      return { [gateId]: metrics.getStats() };
    }

    const stats = {};
    for (const [id, metrics] of this.gates) {
      stats[id] = metrics.getStats();
    }
    return stats;
  }

  getAllGateIds() {
    return Array.from(this.gates.keys());
  }

  reset(gateId) {
    if (gateId) {
      const metrics = this.gates.get(gateId);
      if (metrics) {
        metrics.reset();
        this.save();
      }
    } else {
      this.gates.clear();
      this.save();
    }
  }

  delete(gateId) {
    if (this.gates.has(gateId)) {
      this.gates.delete(gateId);
      this.save();
    }
  }

  setRunStatus(status) {
    this.lastRun = new Date().toISOString();
    this.lastRunStatus = status;
    this.save();
  }

  getOverallStatus() {
    return {
      lastRun: this.lastRun,
      status: this.lastRunStatus,
    };
  }
}

export { MetricsCollector, GateMetrics, CircularBuffer };
