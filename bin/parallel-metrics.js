#!/usr/bin/env node

import { getCollector, resetCollector } from '../lib/parallel-metrics.js';

function showHelp() {
  console.log(`
Parallel Metrics CLI

USAGE:
    bin/parallel-metrics.js [OPTIONS]

OPTIONS:
    --metrics           Show current metrics
    --history           Show historical data
    --trends            Show trend analysis
    --insights          Show insights and recommendations
    --reset             Reset all metrics
    --help, -h          Show this help message

EXAMPLES:
    bin/parallel-metrics.js
    bin/parallel-metrics.js --metrics
    bin/parallel-metrics.js --trends
    bin/parallel-metrics.js --insights
    bin/parallel-metrics.js --reset
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

function showMetrics(collector) {
  const metrics = collector.getMetrics();

  console.log('\n=== Parallel Execution Metrics ===\n');

  console.log('Current Metrics:');
  console.log(
    `  Parallel Execution Rate: ${formatPercent(metrics.parallelExecutionRate)}`,
  );
  console.log(
    `  Avg Parallel Depth:      ${formatNumber(metrics.avgParallelDepth)}`,
  );
  console.log(
    `  Conflict Rate:           ${formatPercent(metrics.conflictRate)}`,
  );
  console.log(`  Sequential Blockers:     ${metrics.sequentialBlockers}`);
  console.log('');

  console.log('Totals:');
  console.log(`  Total Tasks:   ${metrics.totals.tasks}`);
  console.log(`  Parallel:      ${metrics.totals.parallel}`);
  console.log(`  Sequential:    ${metrics.totals.sequential}`);
  console.log(`  Conflicts:     ${metrics.totals.conflicts}`);
  console.log(`  Blockers:      ${metrics.totals.blockers}`);
  console.log('');
}

function showHistory(collector) {
  const history = collector.getHistory();

  console.log('\n=== Historical Data ===\n');

  const formatEntry = (entry, index) => {
    const date = new Date(entry.timestamp).toLocaleString();
    return `${String(index + 1).padStart(3)}. ${date}: ${formatNumber(entry.value)}`;
  };

  console.log('Parallel Execution Rate:');
  if (history.parallelExecutionRate.length === 0) {
    console.log('  No data');
  } else {
    history.parallelExecutionRate.forEach((entry, i) => {
      console.log(`  ${formatEntry(entry, i)}`);
    });
  }
  console.log('');

  console.log('Avg Parallel Depth:');
  if (history.avgParallelDepth.length === 0) {
    console.log('  No data');
  } else {
    history.avgParallelDepth.forEach((entry, i) => {
      console.log(`  ${formatEntry(entry, i)}`);
    });
  }
  console.log('');

  console.log('Conflict Rate:');
  if (history.conflictRate.length === 0) {
    console.log('  No data');
  } else {
    history.conflictRate.forEach((entry, i) => {
      console.log(`  ${formatEntry(entry, i)}`);
    });
  }
  console.log('');

  console.log('Sequential Blockers:');
  if (history.sequentialBlockers.length === 0) {
    console.log('  No data');
  } else {
    history.sequentialBlockers.forEach((entry, i) => {
      console.log(`  ${formatEntry(entry, i)}`);
    });
  }
  console.log('');
}

function showTrends(collector) {
  const trends = collector.getTrends();

  console.log('\n=== Trend Analysis ===\n');

  const formatTrend = (name, trend) => {
    const arrow =
      trend.direction === 'increasing'
        ? '↑'
        : trend.direction === 'decreasing'
          ? '↓'
          : '→';
    console.log(`${name}:`);
    console.log(`  Direction: ${trend.direction} ${arrow}`);
    console.log(
      `  Change:    ${trend.change >= 0 ? '+' : ''}${formatNumber(trend.change)}`,
    );
    console.log(`  Recent Avg: ${formatNumber(trend.recentAvg)}`);
    if (trend.olderAvg !== trend.recentAvg) {
      console.log(`  Older Avg:  ${formatNumber(trend.olderAvg)}`);
    }
    console.log('');
  };

  formatTrend('Parallel Execution Rate', trends.parallelExecutionRate);
  formatTrend('Avg Parallel Depth', trends.avgParallelDepth);
  formatTrend('Conflict Rate', trends.conflictRate);
  formatTrend('Sequential Blockers', trends.sequentialBlockers);
}

function showInsights(collector) {
  const { metrics, trends, insights } = collector.getInsights();

  console.log('\n=== Insights & Recommendations ===\n');

  console.log('Metrics Summary:');
  console.log(
    `  Parallel Execution: ${formatPercent(metrics.parallelExecutionRate)}`,
  );
  console.log(
    `  Avg Parallel Depth: ${formatNumber(metrics.avgParallelDepth)}`,
  );
  console.log(`  Conflict Rate:      ${formatPercent(metrics.conflictRate)}`);
  console.log(`  Sequential Blockers: ${metrics.sequentialBlockers}`);
  console.log('');

  if (insights.length === 0) {
    console.log('No specific insights at this time.');
    console.log('');
    return;
  }

  console.log('Insights:');
  for (const insight of insights) {
    const icon =
      insight.type === 'success' ? '✓' : insight.type === 'warning' ? '⚠' : 'ℹ';
    console.log(`  ${icon} ${insight.message}`);
    console.log(`    → ${insight.suggestion}`);
    console.log('');
  }
}

function parseArgs(args) {
  const result = {
    showMetrics: false,
    showHistory: false,
    showTrends: false,
    showInsights: false,
    reset: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--metrics') {
      result.showMetrics = true;
      i += 1;
    } else if (arg === '--history') {
      result.showHistory = true;
      i += 1;
    } else if (arg === '--trends') {
      result.showTrends = true;
      i += 1;
    } else if (arg === '--insights') {
      result.showInsights = true;
      i += 1;
    } else if (arg === '--reset') {
      result.reset = true;
      i += 1;
    } else {
      i += 1;
    }
  }

  if (
    !result.showMetrics &&
    !result.showHistory &&
    !result.showTrends &&
    !result.showInsights
  ) {
    result.showMetrics = true;
  }

  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const collector = getCollector();

  if (args.reset) {
    resetCollector();
    console.log('All parallel metrics reset.\n');
    return;
  }

  if (args.showMetrics) {
    showMetrics(collector);
  }

  if (args.showHistory) {
    showHistory(collector);
  }

  if (args.showTrends) {
    showTrends(collector);
  }

  if (args.showInsights) {
    showInsights(collector);
  }
}

main();
