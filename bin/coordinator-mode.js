#!/usr/bin/env node

/**
 * Coordinator Mode CLI
 *
 * CLI tool for managing coordinator mode (server/file-based fallback).
 *
 * Usage:
 *   node bin/coordinator-mode.js status        - Show current mode
 *   node bin/coordinator-mode.js switch file   - Switch to file-based mode
 *   node bin/coordinator-mode.js switch server - Switch to server mode
 *   node bin/coordinator-mode.js health        - Check both modes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFileBasedCoordinator } from '../lib/runner/file-coordinator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  '.config',
  'opencode',
  'coordinator-mode.json',
);
const SERVER_AVAILABILITY_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  '.mcp-agent-mail',
  '.server-available',
);

async function readConfig() {
  try {
    const data = await fs.promises.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { mode: 'server' };
    }
    throw error;
  }
}

async function writeConfig(config) {
  const configDir = path.dirname(CONFIG_FILE);
  await fs.promises.mkdir(configDir, { recursive: true });
  await fs.promises.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function checkServerAvailability() {
  const serverUrl = process.env.MCP_AGENT_MAIL_URL || 'http://localhost:3000';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${serverUrl}/health`, {
      signal: controller.signal,
      method: 'GET',
    });

    clearTimeout(timeout);

    if (response.ok) {
      return { available: true, url: serverUrl, status: 'healthy' };
    }
    return { available: false, url: serverUrl, status: 'unhealthy' };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { available: false, url: serverUrl, status: 'timeout' };
    }
    return {
      available: false,
      url: serverUrl,
      status: 'unreachable',
      error: error.message,
    };
  }
}

async function checkFileCoordinatorHealth() {
  try {
    const coordinator = createFileBasedCoordinator();
    await coordinator.start();
    const status = await coordinator.getStatus();
    await coordinator.stop();
    return {
      available: true,
      status: 'healthy',
      coordinatorId: status.coordinatorId,
      tasks: status.tasks,
      claims: status.claims,
    };
  } catch (error) {
    return {
      available: false,
      status: 'unhealthy',
      error: error.message,
    };
  }
}

async function status() {
  console.log('\n=== Coordinator Mode Status ===\n');

  const config = await readConfig();
  console.log(
    'Current Mode:',
    config.mode === 'file' ? 'File-based' : 'Server',
  );

  const serverHealth = await checkServerAvailability();
  console.log('\nServer Mode:');
  console.log(
    '  Status:',
    serverHealth.available ? 'Available' : 'Unavailable',
  );
  if (serverHealth.url) {
    console.log('  URL:', serverHealth.url);
  }
  console.log('  Health:', serverHealth.status);

  const fileHealth = await checkFileCoordinatorHealth();
  console.log('\nFile-based Mode:');
  console.log('  Status:', fileHealth.available ? 'Available' : 'Unavailable');
  console.log('  Health:', fileHealth.status);
  if (fileHealth.tasks) {
    console.log('  Tasks:', fileHealth.tasks.total || 0);
    console.log('  Claims:', fileHealth.claims?.active || 0);
  }

  console.log('\nConfiguration:');
  console.log('  Config File:', CONFIG_FILE);
}

async function switchMode(targetMode) {
  if (targetMode !== 'file' && targetMode !== 'server') {
    console.error('Error: Mode must be "file" or "server"');
    console.error('Usage: node bin/coordinator-mode.js switch <file|server>');
    process.exit(1);
  }

  console.log(
    `\n=== Switching to ${targetMode === 'file' ? 'File-based' : 'Server'} Mode ===\n`,
  );

  if (targetMode === 'file') {
    const fileHealth = await checkFileCoordinatorHealth();
    if (!fileHealth.available) {
      console.error('Error: File-based coordinator is not available');
      console.error('Health check failed:', fileHealth.status);
      if (fileHealth.error) {
        console.error('Error:', fileHealth.error);
      }
      process.exit(1);
    }
  }

  if (targetMode === 'server') {
    const serverHealth = await checkServerAvailability();
    if (!serverHealth.available) {
      console.error('Error: Server is not available');
      console.error('Server status:', serverHealth.status);
      if (serverHealth.error) {
        console.error('Error:', serverHealth.error);
      }
      console.error(
        '\nNote: Server may be down. You can still switch to server mode,',
      );
      console.error('but tasks will fail until the server is available.');
      console.error('Use "file" mode for offline operation.');
    }
  }

  const config = await readConfig();
  config.mode = targetMode;
  config.lastSwitchAt = Date.now();
  await writeConfig(config);

  console.log(
    `✓ Switched to ${targetMode === 'file' ? 'file-based' : 'server'} mode`,
  );

  if (targetMode === 'server' && !(await checkServerAvailability()).available) {
    console.log('\n⚠️  Warning: Server is currently unavailable.');
    console.log('   Tasks will fail until the server is running.');
    console.log('   Consider using "file" mode for offline operation.');
  }
}

async function health() {
  console.log('\n=== Coordinator Health Check ===\n');

  const [serverHealth, fileHealth] = await Promise.all([
    checkServerAvailability(),
    checkFileCoordinatorHealth(),
  ]);

  console.log('Server Mode:');
  console.log('  Available:', serverHealth.available ? '✓' : '✗');
  console.log('  Status:', serverHealth.status);
  if (serverHealth.url) {
    console.log('  URL:', serverHealth.url);
  }
  if (serverHealth.error) {
    console.log('  Error:', serverHealth.error);
  }

  console.log('\nFile-based Mode:');
  console.log('  Available:', fileHealth.available ? '✓' : '✗');
  console.log('  Status:', fileHealth.status);
  if (fileHealth.coordinatorId) {
    console.log('  Coordinator ID:', fileHealth.coordinatorId);
  }
  if (fileHealth.tasks) {
    console.log('  Total Tasks:', fileHealth.tasks.total);
    console.log('  Available Tasks:', fileHealth.tasks.available);
    console.log('  Active Claims:', fileHealth.claims?.active);
  }
  if (fileHealth.error) {
    console.log('  Error:', fileHealth.error);
  }

  const config = await readConfig();
  console.log(
    '\nCurrent Mode:',
    config.mode === 'file' ? 'File-based' : 'Server',
  );

  if (serverHealth.available && fileHealth.available) {
    console.log(
      '\n✓ Both modes are healthy. System can handle SPOF scenarios.',
    );
  } else if (!serverHealth.available && fileHealth.available) {
    console.log(
      '\n⚠️  Server is unavailable. File-based mode will be used as fallback.',
    );
  } else if (serverHealth.available && !fileHealth.available) {
    console.log(
      '\n⚠️  File-based mode is unavailable. Server mode will be used.',
    );
  } else {
    console.log('\n✗ Neither mode is available. System may be degraded.');
  }
}

async function help() {
  console.log(`
Coordinator Mode CLI

Usage: node bin/coordinator-mode.js <command>

Commands:
  status              Show current coordinator mode and health
  switch <mode>       Switch to file-based or server mode (file|server)
  health              Check health of both modes
  help                Show this help message

Examples:
  node bin/coordinator-mode.js status
  node bin/coordinator-mode.js switch file
  node bin/coordinator-mode.js switch server
  node bin/coordinator-mode.js health

Notes:
  - Server mode requires MCP Agent Mail server to be running
  - File-based mode works offline using local JSON files
  - Use "switch file" for SPOF mitigation when server is down
  - Configuration is stored in ~/.config/opencode/coordinator-mode.json
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  switch (command) {
    case 'status':
      await status();
      break;
    case 'switch':
      if (!args[1]) {
        console.error('Error: Mode required');
        console.error(
          'Usage: node bin/coordinator-mode.js switch <file|server>',
        );
        process.exit(1);
      }
      await switchMode(args[1]);
      break;
    case 'health':
      await health();
      break;
    case 'help':
    default:
      await help();
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
