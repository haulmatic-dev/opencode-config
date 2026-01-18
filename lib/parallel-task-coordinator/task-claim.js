/**
 * Task Claim Manager
 *
 * Manages atomic task claiming to prevent race conditions.
 * Replaces PID-based delays with proper distributed locking.
 */

import config, { MESSAGE_STATUS, MESSAGE_TYPES } from './config.js';

/**
 * Create a task claim manager
 * @param {object} options - Claim options
 * @returns {object} Task claim instance
 */
export function createTaskClaim(options = {}) {
  const {
    messagePersistence,
    workerRegistry,
    storagePath = `${process.env.HOME}/.mcp-agent-mail/task-claims.db`,
    logger = console,
  } = options;

  let db = null;
  const pendingClaims = new Map(); // In-memory cache for fast lookups

  /**
   * Initialize the claim manager
   * @returns {Promise<void>}
   */
  async function initialize() {
    const { default: sqlite3 } = await import('better-sqlite3');

    db = new sqlite3(storagePath);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_claims (
        task_id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        claimed_at INTEGER DEFAULT (unixepoch()),
        completed_at INTEGER,
        metadata TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_task_claims_worker ON task_claims(worker_id);
      CREATE INDEX IF NOT EXISTS idx_task_claims_status ON task_claims(status);
    `);

    // Load pending claims into memory
    const stmt = db.prepare('SELECT * FROM task_claims WHERE status = ?');
    const rows = stmt.all('active');

    for (const row of rows) {
      pendingClaims.set(row.task_id, {
        taskId: row.task_id,
        workerId: row.worker_id,
        status: row.status,
        claimedAt: row.claimed_at,
        metadata: JSON.parse(row.metadata || '{}'),
      });
    }

    logger.info(
      `[TaskClaim] Initialized with ${pendingClaims.size} active claims`,
    );
  }

  /**
   * Attempt to atomically claim a task
   * @param {object} message - Claim message from worker
   * @returns {Promise<object>} Claim result
   */
  async function claim(message) {
    const { payload } = message;
    const { worker_id, capabilities, priority, max_tasks } = payload;

    // Check if worker already has too many tasks
    const workerClaims = await getWorkerClaims(worker_id);
    if (workerClaims.length >= (max_tasks || 1)) {
      return {
        success: false,
        error: 'worker_task_limit_reached',
        current_tasks: workerClaims.length,
        max_tasks: max_tasks || 1,
      };
    }

    // Try to claim a ready task from Beads
    const readyOutput = await getReadyTasks();

    if (!readyOutput || readyOutput.includes('No ready work')) {
      return {
        success: false,
        error: 'no_ready_tasks',
        message: 'No tasks available to claim',
      };
    }

    // Extract first task ID
    const taskIdMatch = readyOutput.match(/opencode-\w+/);
    if (!taskIdMatch) {
      return {
        success: false,
        error: 'could_not_parse_task_id',
        message: 'Could not extract task ID from ready output',
      };
    }

    const taskId = taskIdMatch[0];

    // Check if already claimed in memory cache
    if (pendingClaims.has(taskId)) {
      return {
        success: false,
        error: 'task_already_claimed',
        message: 'Task already claimed by another worker',
      };
    }

    // Try to atomically claim the task
    const claimResult = await atomicClaim(taskId, worker_id);

    if (claimResult.success) {
      // Successfully claimed - update message status
      if (messagePersistence) {
        await messagePersistence.storeOutgoing({
          ...message,
          status: MESSAGE_STATUS.DELIVERED,
        });
      }

      return {
        success: true,
        task_id: taskId,
        worker_id: worker_id,
        claimed_at: Date.now(),
      };
    }

    // Claim failed (race condition) - try next task
    return {
      success: false,
      error: 'claim_race_condition',
      message: 'Task was claimed by another worker',
    };
  }

  /**
   * Perform atomic claim in database
   * @param {string} taskId - Task ID to claim
   * @param {string} workerId - Worker claiming
   * @returns {Promise<object>} Claim result
   */
  async function atomicClaim(taskId, workerId) {
    // Use a transaction for atomicity
    const transaction = db.transaction(() => {
      // Check if already claimed (any status - including completed)
      const checkStmt = db.prepare(
        'SELECT * FROM task_claims WHERE task_id = ?',
      );
      const existing = checkStmt.get(taskId);

      if (existing) {
        return { success: false, error: 'already_claimed' };
      }

      // Insert new claim
      const insertStmt = db.prepare(`
        INSERT INTO task_claims (task_id, worker_id, status, metadata)
        VALUES (?, ?, 'active', ?)
      `);

      insertStmt.run(
        taskId,
        workerId,
        JSON.stringify({ capabilities: [], priority: 'normal' }),
      );

      return { success: true };
    });

    try {
      const result = transaction();

      if (result.success) {
        // Update in-memory cache
        pendingClaims.set(taskId, {
          taskId,
          workerId,
          status: 'active',
          claimedAt: Date.now(),
          metadata: {},
        });

        logger.info(`[TaskClaim] Task ${taskId} claimed by ${workerId}`);

        return { success: true, taskId, workerId };
      }

      return result;
    } catch (error) {
      logger.error('[TaskClaim] Atomic claim failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Release a task claim
   * @param {string} taskId - Task ID to release
   * @param {string} workerId - Worker releasing
   * @returns {Promise<object>} Release result
   */
  async function release(taskId, workerId) {
    const claim = pendingClaims.get(taskId);

    if (!claim) {
      return { success: false, error: 'claim_not_found' };
    }

    if (claim.workerId !== workerId) {
      return { success: false, error: 'not_owner' };
    }

    const stmt = db.prepare(`
      UPDATE task_claims 
      SET status = 'completed', completed_at = unixepoch()
      WHERE task_id = ? AND worker_id = ?
    `);

    const result = stmt.run(taskId, workerId);

    if (result.changes > 0) {
      pendingClaims.delete(taskId);
      logger.info(`[TaskClaim] Task ${taskId} released by ${workerId}`);
      return { success: true };
    }

    return { success: false, error: 'update_failed' };
  }

  /**
   * Get claims for a worker
   * @param {string} workerId - Worker ID
   * @returns {Promise<Array>} List of task claims
   */
  async function getWorkerClaims(workerId) {
    const stmt = db.prepare(
      'SELECT * FROM task_claims WHERE worker_id = ? AND status = ?',
    );
    const rows = stmt.all(workerId, 'active');

    return rows.map((row) => ({
      taskId: row.task_id,
      workerId: row.worker_id,
      status: row.status,
      claimedAt: row.claimed_at,
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  }

  /**
   * Get tasks abandoned by a worker (worker went stale)
   * @param {string} workerId - Worker ID
   * @returns {Promise<Array>} List of abandoned tasks
   */
  async function getAbandonedTasks(workerId) {
    const stmt = db.prepare(
      'SELECT * FROM task_claims WHERE worker_id = ? AND status = ?',
    );
    const rows = stmt.all(workerId, 'active');

    return rows.map((row) => ({
      taskId: row.task_id,
      workerId: row.worker_id,
      claimedAt: row.claimed_at,
    }));
  }

  /**
   * Mark a task for reassignment
   * @param {string} taskId - Task ID
   * @returns {Promise<object>} Result
   */
  async function markForReassignment(taskId) {
    const stmt = db.prepare('DELETE FROM task_claims WHERE task_id = ?');
    const result = stmt.run(taskId);

    pendingClaims.delete(taskId);

    logger.info(`[TaskClaim] Task ${taskId} marked for reassignment`);

    return { success: result.changes > 0 };
  }

  /**
   * Get ready tasks from Beads
   * @returns {Promise<string>} Ready tasks output
   */
  async function getReadyTasks() {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('bd ready', { encoding: 'utf8' });
      return output;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all active claims
   * @returns {Promise<Array>} List of active claims
   */
  async function getActiveClaims() {
    return Array.from(pendingClaims.values());
  }

  /**
   * Get claim statistics
   * @returns {Promise<object>} Statistics
   */
  async function getStats() {
    const stmt = db.prepare(
      'SELECT status, COUNT(*) as count FROM task_claims GROUP BY status',
    );
    const rows = stmt.all();

    const stats = {
      total: 0,
      active: 0,
      completed: 0,
      abandoned: 0,
    };

    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }

    return stats;
  }

  /**
   * Close the claim manager
   * @returns {Promise<void>}
   */
  async function close() {
    if (db) {
      db.close();
      db = null;
    }
    pendingClaims.clear();
  }

  return {
    initialize,
    claim,
    release,
    getWorkerClaims,
    getAbandonedTasks,
    markForReassignment,
    getActiveClaims,
    getStats,
    close,
  };
}

export default createTaskClaim;
