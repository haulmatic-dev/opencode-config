#!/usr/bin/env node

import { MetricsCollector } from '../lib/runner/metrics.js';

function showHelp() {
  console.log(`
Gate Metrics CLI

USAGE:
    bin/gate-metrics.js [OPTIONS]

OPTIONS:
    --gate <ID>           Show metrics for specific gate
    --percentiles         Show timing percentiles
    --rates               Show success/failure rates
    --reset               Reset all metrics
    --reset-gate <ID>     Reset metrics for specific gate
    --delete-gate <ID>    Delete metrics for specific gate
    --all                 Show all metrics (default)
    --help, -h            Show this help message

EXAMPLES:
    bin/gate-metrics.js
    bin/gate-metrics.js --gate lint
    bin/gate-metrics.js --percentiles
    bin/gate-metrics.js --reset
`);
}

function formatNumber(num) {
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return num.toFixed(2);
}

function formatPercent(rate) {
  return `${rate.toFixed(2)}%`;
}

function printTable(headers, rows) {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((row) => String(row[i]).length)),
  );

  const separator =
    '+' + colWidths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
  const headerRow =
    '| ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + ' |';

  console.log(separator);
  console.log(headerRow);
  console.log(separator);

  for (const row of rows) {
    const rowStr =
      '| ' +
      row.map((cell, i) => String(cell).padEnd(colWidths[i])).join(' | ') +
      ' |';
    console.log(rowStr);
  }

  console.log(separator);
}

function showAllMetrics(collector) {
  const stats = collector.getStats();
  const gateIds = collector.getAllGateIds();

  if (gateIds.length === 0) {
    console.log('\nNo gate metrics collected yet.\n');
    return;
  }

  console.log('\n=== Gate Metrics ===\n');

  const headers = [
    'Gate',
    'Count',
    'Avg (ms)',
    'Min (ms)',
    'Max (ms)',
    'Success',
    'Failure',
    'Success Rate',
  ];
  const rows = [];

  for (const gateId of gateIds) {
    const gateStats = stats[gateId];
    rows.push([
      gateId,
      gateStats.count,
      formatNumber(gateStats.avg),
      formatNumber(gateStats.min),
      formatNumber(gateStats.max),
      gateStats.successCount,
      gateStats.failureCount,
      formatPercent(gateStats.successRate),
    ]);
  }

  printTable(headers, rows);
  console.log();
}

function showPercentiles(collector) {
  const stats = collector.getStats();
  const gateIds = collector.getAllGateIds();

  if (gateIds.length === 0) {
    console.log('\nNo gate metrics collected yet.\n');
    return;
  }

  console.log('\n=== Timing Percentiles ===\n');

  const headers = ['Gate', 'Count', 'p50 (ms)', 'p95 (ms)', 'p99 (ms)'];
  const rows = [];

  for (const gateId of gateIds) {
    const gateStats = stats[gateId];
    rows.push([
      gateId,
      gateStats.count,
      formatNumber(gateStats.p50),
      formatNumber(gateStats.p95),
      formatNumber(gateStats.p99),
    ]);
  }

  printTable(headers, rows);
  console.log();
}

function showRates(collector) {
  const stats = collector.getStats();
  const gateIds = collector.getAllGateIds();

  if (gateIds.length === 0) {
    console.log('\nNo gate metrics collected yet.\n');
    return;
  }

  console.log('\n=== Success/Failure Rates ===\n');

  const headers = [
    'Gate',
    'Total',
    'Success',
    'Failure',
    'Success Rate',
    'Failure Rate',
  ];
  const rows = [];

  for (const gateId of gateIds) {
    const gateStats = stats[gateId];
    rows.push([
      gateId,
      gateStats.successCount + gateStats.failureCount,
      gateStats.successCount,
      gateStats.failureCount,
      formatPercent(gateStats.successRate),
      formatPercent(gateStats.failureRate),
    ]);
  }

  printTable(headers, rows);
  console.log();
}

function showGateMetrics(collector, gateId) {
  const stats = collector.getStats(gateId);

  if (!stats || !stats[gateId]) {
    console.log(`\nNo metrics found for gate: ${gateId}\n`);
    return;
  }

  const gateStats = stats[gateId];

  console.log(`\n=== Metrics for Gate: ${gateId} ===\n`);
  console.log(`Count:        ${gateStats.count}`);
  console.log(`Avg:          ${formatNumber(gateStats.avg)} ms`);
  console.log(`Min:          ${formatNumber(gateStats.min)} ms`);
  console.log(`Max:          ${formatNumber(gateStats.max)} ms`);
  console.log(`p50:          ${formatNumber(gateStats.p50)} ms`);
  console.log(`p95:          ${formatNumber(gateStats.p95)} ms`);
  console.log(`p99:          ${formatNumber(gateStats.p99)} ms`);
  console.log(`Success:      ${gateStats.successCount}`);
  console.log(`Failure:      ${gateStats.failureCount}`);
  console.log(`Success Rate: ${formatPercent(gateStats.successRate)}`);
  console.log(`Failure Rate: ${formatPercent(gateStats.failureRate)}`);
  console.log();
}

function parseArgs(args) {
  const result = {
    gate: null,
    showPercentiles: false,
    showRates: false,
    reset: false,
    resetGate: null,
    deleteGate: null,
    showAll: true,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--gate' && i + 1 < args.length) {
      result.gate = args[i + 1];
      result.showAll = false;
      i += 2;
    } else if (arg === '--percentiles') {
      result.showPercentiles = true;
      result.showAll = false;
      i += 1;
    } else if (arg === '--rates') {
      result.showRates = true;
      result.showAll = false;
      i += 1;
    } else if (arg === '--reset') {
      result.reset = true;
      i += 1;
    } else if (arg === '--reset-gate' && i + 1 < args.length) {
      result.resetGate = args[i + 1];
      i += 2;
    } else if (arg === '--delete-gate' && i + 1 < args.length) {
      result.deleteGate = args[i + 1];
      i += 2;
    } else if (arg === '--all') {
      result.showAll = true;
      i += 1;
    } else {
      i += 1;
    }
  }

  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const collector = new MetricsCollector();

  if (args.reset) {
    collector.reset();
    console.log('All metrics reset.\n');
    return;
  }

  if (args.resetGate) {
    collector.reset(args.resetGate);
    console.log(`Metrics reset for gate: ${args.resetGate}\n`);
    return;
  }

  if (args.deleteGate) {
    collector.delete(args.deleteGate);
    console.log(`Metrics deleted for gate: ${args.deleteGate}\n`);
    return;
  }

  if (args.showAll) {
    showAllMetrics(collector);
    showPercentiles(collector);
    showRates(collector);
  } else if (args.gate) {
    showGateMetrics(collector, args.gate);
  } else if (args.showPercentiles) {
    showPercentiles(collector);
  } else if (args.showRates) {
    showRates(collector);
  }
}

main();
