#!/usr/bin/env node

import { GateCache } from '../lib/runner/cache.js';
import { MetricsCollector } from '../lib/runner/metrics.js';

const metrics = new MetricsCollector();
const cache = new GateCache();

function formatDuration(ms) {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

async function main() {
  const cacheStats = await cache.getStats();
  const allStats = metrics.getStats();
  const overallStatus = metrics.getOverallStatus();
  const gateIds = metrics.getAllGateIds();

  const hasGates = gateIds.length > 0;
  const allPassed =
    hasGates &&
    gateIds.every((id) => {
      const stats = allStats[id];
      return stats && stats.failureCount === 0;
    });

  let statusText;
  if (!hasGates) {
    statusText = '○ No runs recorded';
  } else if (allPassed) {
    statusText = '✓ All passed';
  } else {
    statusText = '✗ Some failed';
  }

  console.log('=== Quality Gates Status ===');
  console.log(`Last Run: ${formatDate(overallStatus.lastRun)}`);
  console.log(`Status: ${statusText}`);
  console.log('');

  if (hasGates) {
    const maxGateNameLen = Math.max(...gateIds.map((id) => id.length));
    console.log('Gates:');
    for (const gateId of gateIds) {
      const stats = allStats[gateId];
      const lastTiming = stats.count > 0 ? stats.avg : 0;
      const status = stats.failureCount === 0 ? '✓' : '✗';
      const paddedName = gateId.padEnd(maxGateNameLen);
      console.log(`  ${paddedName}:  ${status} ${formatDuration(lastTiming)}`);
    }
  } else {
    console.log('Gates: (no runs recorded)');
  }

  console.log('');
  console.log(`Cache: ${cacheStats.hitRate?.toFixed(0) || 0}% hit rate`);

  let overallSuccessRate = 0;
  let totalSuccess = 0;
  let totalRuns = 0;

  if (hasGates) {
    for (const gateId of gateIds) {
      const stats = allStats[gateId];
      if (stats) {
        totalSuccess += stats.successCount;
        totalRuns += stats.successCount + stats.failureCount;
      }
    }
    overallSuccessRate = totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0;
  }

  console.log(`Success Rate: ${overallSuccessRate.toFixed(0)}% (last 24h)`);
}

main().catch(console.error);
