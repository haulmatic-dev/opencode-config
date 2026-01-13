import { exec as execAsync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const AUDIT_LOG_PATH = '.beads/audit-log.json';

async function ensureAuditLogExists() {
  try {
    await fs.access(AUDIT_LOG_PATH);
  } catch {
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify([], null, 2));
  }
}

export async function logOperation(
  operation,
  branch,
  details = {},
  result = {},
) {
  await ensureAuditLogExists();

  const entry = {
    timestamp: new Date().toISOString(),
    operation,
    branch,
    details,
    result,
  };

  const log = await getAuditLog();
  log.push(entry);

  await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(log, null, 2));
}

export async function getAuditLog() {
  await ensureAuditLogExists();

  const content = await fs.readFile(AUDIT_LOG_PATH, 'utf-8');
  return JSON.parse(content);
}
