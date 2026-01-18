#!/usr/bin/env node

/**
 * Parallel Task Coordinator CLI
 *
 * CLI tool for managing the parallel task coordinator system.
 *
 * Usage:
 *   node bin/parallel-coordinator.js status          - Show coordinator status
 *   node bin/parallel-coordinator.js workers         - List registered workers
 *   node bin/parallel-coordinator.js dead-letters    - List dead letters
 *   node bin/parallel-coordinator.js retry <id>      - Retry a dead letter
 *   node bin/parallel-coordinator.js retry --all     - Retry all pending dead letters
 *   node bin/parallel-coordinator.js retry --filter type=XXX - Filtered retry
 *   node bin/parallel-coordinator.js retry --dry-run - Preview retry without executing
 *   node bin/parallel-coordinator.js resolve <id>    - Mark dead letter resolved
 *   node bin/parallel-coordinator.js stats           - Show statistics
 *   node bin/parallel-coordinator.js stats --trends  - Show failure trends
 */

import {
  createDeadLetter,
  createParallelTaskCoordinator,
  createWorkerRegistry,
} from '../lib/parallel-task-coordinator/index.js';

const args = process.argv.slice(2);
const command = args[0] || 'status';

const WORKERS_DB = `${process.env.HOME}/.mcp-agent-mail/workers.db`;
const MESSAGES_DB = `${process.env.HOME}/.mcp-agent-mail/messages.db`;
const DEAD_LETTERS_DB = `${process.env.HOME}/.mcp-agent-mail/dead-letters.db`;

async function status() {
  console.log('\n=== Parallel Task Coordinator Status ===\n');

  try {
    const coordinator = createParallelTaskCoordinator();
    await coordinator.start();

    const status = await coordinator.getStatus();

    console.log('Coordinator:', status.isRunning ? 'Running' : 'Stopped');
    console.log('Name:', status.coordinatorName);
    console.log('');
    console.log('Workers:');
    console.log('  Total:', status.workers.total);
    console.log('  Active:', status.workers.active);
    console.log('  Stale:', status.workers.stale);
    console.log('  Offline:', status.workers.offline);
    console.log('');
    console.log('Messages:');
    console.log('  Total:', status.messages.total);
    console.log('  Pending:', status.messages.pending);
    console.log('  Delivered:', status.messages.delivered);
    console.log('  Acknowledged:', status.messages.acknowledged);
    console.log('  Failed:', status.messages.failed);
    console.log('');
    console.log('Configuration:');
    console.log(
      '  Heartbeat Interval:',
      status.config.heartbeatIntervalMs + 'ms',
    );
    console.log('  Stale Threshold:', status.config.staleThresholdMs + 'ms');
    console.log('  Max Retries:', status.config.retryMaxAttempts);
    console.log('  Dead Letter Enabled:', status.config.deadLetterEnabled);

    await coordinator.stop();
  } catch (error) {
    console.error('Error getting status:', error.message);
  }
}

async function workers() {
  console.log('\n=== Registered Workers ===\n');

  try {
    const { default: sqlite3 } = await import('better-sqlite3');
    const db = new sqlite3(WORKERS_DB);

    const stmt = db.prepare(
      'SELECT * FROM workers ORDER BY last_heartbeat DESC',
    );
    const rows = stmt.all();

    if (rows.length === 0) {
      console.log('No workers registered.');
    } else {
      for (const row of rows) {
        const lastHeartbeat = new Date(row.last_heartbeat).toLocaleString();
        const capabilities = JSON.parse(row.capabilities || '[]').join(', ');

        console.log(`ID: ${row.id}`);
        console.log(`  Name: ${row.name}`);
        console.log(`  PID: ${row.pid}`);
        console.log(`  Status: ${row.status}`);
        console.log(`  Capabilities: ${capabilities || 'none'}`);
        console.log(`  Last Heartbeat: ${lastHeartbeat}`);
        console.log('');
      }
    }

    db.close();
  } catch (error) {
    console.error('Error listing workers:', error.message);
  }
}

async function deadLetters() {
  console.log('\n=== Dead Letters ===\n');

  try {
    const { default: sqlite3 } = await import('better-sqlite3');
    const db = new sqlite3(DEAD_LETTERS_DB);

    const stmt = db.prepare(
      'SELECT * FROM dead_letters ORDER BY failed_at DESC LIMIT 50',
    );
    const rows = stmt.all();

    if (rows.length === 0) {
      console.log('No dead letters.');
    } else {
      for (const row of rows) {
        const failedAt = new Date(row.failed_at).toLocaleString();
        const content = JSON.parse(row.content);

        console.log(`ID: ${row.id}`);
        console.log(`  Original: ${row.original_message_id}`);
        console.log(`  From: ${row.sender} → ${row.recipient}`);
        console.log(`  Type: ${row.type}`);
        console.log(`  Error: ${row.error}`);
        console.log(`  Failed: ${failedAt}`);
        console.log(`  Retries: ${row.retry_count}`);
        console.log(`  Resolved: ${row.resolved ? 'Yes' : 'No'}`);
        if (row.resolution) {
          console.log(`  Resolution: ${row.resolution}`);
        }
        console.log('');
      }
    }

    db.close();
  } catch (error) {
    console.error('Error listing dead letters:', error.message);
  }
}

async function retry(deadLetterId) {
  console.log(`\n=== Retrying Dead Letter: ${deadLetterId} ===\n`);

  try {
    const deadLetter = createDeadLetter();
    await deadLetter.initialize();

    const message = await deadLetter.retry(deadLetterId);

    if (message) {
      console.log('Retrying message...');
      console.log('Type:', message.type);
      console.log('From:', message.sender);
      console.log('To:', message.recipient);
      console.log('Retry count:', message.retry_count);
      console.log('\nMessage queued for retry.');
    } else {
      console.error('Dead letter not found or already resolved.');
    }

    await deadLetter.close();
  } catch (error) {
    console.error('Error retrying dead letter:', error.message);
  }
}

async function retryAll(dryRun = false) {
  console.log('\n=== Retrying All Pending Dead Letters ===\n');

  try {
    const { default: sqlite3 } = await import('better-sqlite3');
    const db = new sqlite3(DEAD_LETTERS_DB);

    const stmt = db.prepare(
      'SELECT * FROM dead_letters WHERE resolved = 0 ORDER BY failed_at ASC',
    );
    const rows = stmt.all();

    if (rows.length === 0) {
      console.log('No pending dead letters to retry.');
      db.close();
      return;
    }

    console.log(`Found ${rows.length} pending dead letter(s).\n`);

    const deadLetter = createDeadLetter();
    await deadLetter.initialize();

    let successCount = 0;
    let failCount = 0;

    for (const row of rows) {
      if (dryRun) {
        console.log(`[DRY-RUN] Would retry: ${row.id} (${row.type})`);
        successCount++;
      } else {
        const message = await deadLetter.retry(row.id);
        if (message) {
          console.log(`Retried: ${row.id} (${row.type})`);
          successCount++;
        } else {
          console.log(`Failed to retry: ${row.id}`);
          failCount++;
        }
      }
    }

    await deadLetter.close();
    db.close();

    console.log(
      `\n${dryRun ? '[DRY-RUN] ' : ''}Total: ${rows.length} | Retried: ${successCount} | Failed: ${failCount}`,
    );
  } catch (error) {
    console.error('Error retrying all dead letters:', error.message);
  }
}

async function retryFiltered(filterStr, dryRun = false) {
  const filterParts = filterStr.split('=');
  const filterType = filterParts[0];
  const filterValue = filterParts[1];

  if (filterType !== 'type' || !filterValue) {
    console.error('Error: Invalid filter format. Use: type=XXX');
    return;
  }

  console.log(`\n=== Retrying Dead Letters with filter: ${filterStr} ===\n`);

  try {
    const { default: sqlite3 } = await import('better-sqlite3');
    const db = new sqlite3(DEAD_LETTERS_DB);

    const stmt = db.prepare(
      'SELECT * FROM dead_letters WHERE resolved = 0 AND type = ? ORDER BY failed_at ASC',
    );
    const rows = stmt.all(filterValue);

    if (rows.length === 0) {
      console.log(`No pending dead letters matching filter: ${filterStr}`);
      db.close();
      return;
    }

    console.log(`Found ${rows.length} matching dead letter(s).\n`);

    const deadLetter = createDeadLetter();
    await deadLetter.initialize();

    let successCount = 0;
    let failCount = 0;

    for (const row of rows) {
      if (dryRun) {
        console.log(`[DRY-RUN] Would retry: ${row.id} (${row.type})`);
        successCount++;
      } else {
        const message = await deadLetter.retry(row.id);
        if (message) {
          console.log(`Retried: ${row.id} (${row.type})`);
          successCount++;
        } else {
          console.log(`Failed to retry: ${row.id}`);
          failCount++;
        }
      }
    }

    await deadLetter.close();
    db.close();

    console.log(
      `\n${dryRun ? '[DRY-RUN] ' : ''}Total: ${rows.length} | Retried: ${successCount} | Failed: ${failCount}`,
    );
  } catch (error) {
    console.error('Error retrying filtered dead letters:', error.message);
  }
}

async function retryDryRun(filterStr) {
  if (filterStr) {
    await retryFiltered(filterStr, true);
  } else {
    await retryAll(true);
  }
}

async function resolve(deadLetterId, resolution = 'skipped') {
  console.log(`\n=== Resolving Dead Letter: ${deadLetterId} ===\n`);

  try {
    const deadLetter = createDeadLetter();
    await deadLetter.initialize();

    const result = await deadLetter.resolve(deadLetterId, resolution);

    if (result.success) {
      console.log('Dead letter resolved.');
    } else {
      console.error('Failed to resolve dead letter.');
    }

    await deadLetter.close();
  } catch (error) {
    console.error('Error resolving dead letter:', error.message);
  }
}

async function stats() {
  console.log('\n=== Coordinator Statistics ===\n');

  try {
    const { default: sqlite3 } = await import('better-sqlite3');

    // Messages stats
    if (MESSAGES_DB) {
      try {
        const msgDb = new sqlite3(MESSAGES_DB);
        const msgStmt = msgDb.prepare(
          'SELECT status, COUNT(*) as count FROM messages GROUP BY status',
        );
        const msgRows = msgStmt.all();

        console.log('Messages:');
        for (const row of msgRows) {
          console.log(`  ${row.status}: ${row.count}`);
        }
        msgDb.close();
      } catch (e) {
        console.log('  Messages DB not available');
      }
    }

    // Workers stats
    try {
      const workerDb = new sqlite3(WORKERS_DB);
      const workerStmt = workerDb.prepare(
        'SELECT status, COUNT(*) as count FROM workers GROUP BY status',
      );
      const workerRows = workerDb.all();

      console.log('\nWorkers:');
      for (const row of workerRows) {
        console.log(`  ${row.status}: ${row.count}`);
      }
      workerDb.close();
    } catch (e) {
      console.log('  Workers DB not available');
    }

    // Dead letters stats
    try {
      const dlDb = new sqlite3(DEAD_LETTERS_DB);
      const dlStmt = dlDb.prepare(
        'SELECT resolved, COUNT(*) as count FROM dead_letters GROUP BY resolved',
      );
      const dlRows = dlDb.all();

      console.log('\nDead Letters:');
      for (const row of dlRows) {
        const status = row.resolved ? 'Resolved' : 'Pending';
        console.log(`  ${status}: ${row.count}`);
      }
      dlDb.close();
    } catch (e) {
      console.log('  Dead letters DB not available');
    }
  } catch (error) {
    console.error('Error getting statistics:', error.message);
  }
}

async function statsTrends() {
  console.log('\n=== Failure Trends ===\n');

  try {
    const { default: sqlite3 } = await import('better-sqlite3');
    const db = new sqlite3(DEAD_LETTERS_DB);

    // Failures by type
    const typeStmt = db.prepare(
      'SELECT type, COUNT(*) as count FROM dead_letters GROUP BY type ORDER BY count DESC',
    );
    const typeRows = typeStmt.all();

    console.log('Failures by Type:');
    if (typeRows.length === 0) {
      console.log('  No data');
    } else {
      for (const row of typeRows) {
        console.log(`  ${row.type}: ${row.count}`);
      }
    }

    // Failures by day (last 7 days)
    const dateStmt = db.prepare(`
      SELECT DATE(failed_at) as date, COUNT(*) as count
      FROM dead_letters
      WHERE failed_at >= datetime('now', '-7 days')
      GROUP BY DATE(failed_at)
      ORDER BY date ASC
    `);
    const dateRows = dateStmt.all();

    console.log('\nFailures by Day (Last 7 Days):');
    if (dateRows.length === 0) {
      console.log('  No data');
    } else {
      for (const row of dateRows) {
        console.log(`  ${row.date}: ${row.count}`);
      }
    }

    // Error messages
    const errorStmt = db.prepare(`
      SELECT error, COUNT(*) as count
      FROM dead_letters
      GROUP BY error
      ORDER BY count DESC
      LIMIT 5
    `);
    const errorRows = errorStmt.all();

    console.log('\nTop Error Messages:');
    if (errorRows.length === 0) {
      console.log('  No data');
    } else {
      for (const row of errorRows) {
        const truncatedError =
          row.error.length > 60
            ? row.error.substring(0, 60) + '...'
            : row.error;
        console.log(`  ${truncatedError}: ${row.count}`);
      }
    }

    db.close();
  } catch (error) {
    console.error('Error getting trends:', error.message);
  }
}

async function help() {
  console.log(`
Parallel Task Coordinator CLI

Usage: node bin/parallel-coordinator.js <command>

Commands:
  status              Show coordinator status and configuration
  workers             List all registered workers
  dead-letters        List all dead letters
  retry <id>          Retry a dead letter
  retry --all         Retry all pending dead letters
  retry --filter type=XXX  Retry dead letters matching filter
  retry --dry-run     Preview retry without executing
  resolve <id> [type] Mark a dead letter as resolved (type: retried, skipped, escalated)
  stats               Show message and worker statistics
  stats --trends      Show failure trends over time
  help                Show this help message

Examples:
  node bin/parallel-coordinator.js status
  node bin/parallel-coordinator.js dead-letters
  node bin/parallel-coordinator.js retry dl-uuid-123
  node bin/parallel-coordinator.js retry --all
  node bin/parallel-coordinator.js retry --filter type=task-failed
  node bin/parallel-coordinator.js retry --dry-run
  node bin/parallel-coordinator.js stats --trends
`);
}

// Main
(async () => {
  switch (command) {
    case 'status':
      await status();
      break;
    case 'workers':
      await workers();
      break;
    case 'dead-letters':
      await deadLetters();
      break;
    case 'retry':
      if (args.includes('--all')) {
        await retryAll(args.includes('--dry-run'));
      } else if (args.includes('--dry-run')) {
        const filterIndex = args.indexOf('--filter');
        if (filterIndex !== -1 && args[filterIndex + 1]) {
          await retryDryRun(args[filterIndex + 1]);
        } else {
          await retryDryRun();
        }
      } else if (args.includes('--filter')) {
        const filterIndex = args.indexOf('--filter');
        if (args[filterIndex + 1]) {
          await retryFiltered(args[filterIndex + 1], false);
        } else {
          console.error('Error: --filter requires a value (e.g., type=XXX)');
          process.exit(1);
        }
      } else if (args[1]) {
        await retry(args[1]);
      } else {
        console.error(
          'Error: Dead letter ID required or use --all, --filter, or --dry-run',
        );
        console.error('Usage: node bin/parallel-coordinator.js retry <id>');
        console.error('       node bin/parallel-coordinator.js retry --all');
        console.error(
          '       node bin/parallel-coordinator.js retry --filter type=XXX',
        );
        console.error(
          '       node bin/parallel-coordinator.js retry --dry-run',
        );
        process.exit(1);
      }
      break;
    case 'resolve':
      if (!args[1]) {
        console.error('Error: Dead letter ID required');
        console.error(
          'Usage: node bin/parallel-coordinator.js resolve <id> [type]',
        );
        process.exit(1);
      }
      await resolve(args[1], args[2] || 'skipped');
      break;
    case 'stats':
      if (args.includes('--trends')) {
        await statsTrends();
      } else {
        await stats();
      }
      break;
    case 'help':
    default:
      await help();
  }
})();
