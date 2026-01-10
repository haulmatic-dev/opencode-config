#!/usr/bin/env node
/**
 * OpenCode wrapper - runs session-start.sh before opencode
 * Usage: node opencode-wrapper.js [opencode args...]
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOOKS_DIR = path.join(__dirname, '../hooks');
const SESSION_START_HOOK = path.join(HOOKS_DIR, 'session-start.sh');
const MAIN_OPENCODE = path.join(
  process.env.HOME,
  '.opencode',
  'bin',
  'opencode',
);

async function runSessionStart() {
  if (!existsSync(SESSION_START_HOOK)) {
    return;
  }

  return new Promise((resolve, reject) => {
    const child = spawn('bash', [SESSION_START_HOOK], {
      stdio: 'inherit',
      env: { ...process.env, FORCE_HOOK: 'true' },
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', reject);
  });
}

async function runOpencode(args) {
  if (!existsSync(MAIN_OPENCODE)) {
    console.error('❌ opencode binary not found at:', MAIN_OPENCODE);
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(MAIN_OPENCODE, args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      if (code !== null) resolve(code);
    });

    child.on('error', reject);
  });
}

// Main execution
(async () => {
  const opencodeArgs = process.argv.slice(2);

  try {
    // Run session-start hook first
    await runSessionStart();

    // Then run opencode with original arguments
    const exitCode = await runOpencode(opencodeArgs);

    process.exit(exitCode);
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
})();
