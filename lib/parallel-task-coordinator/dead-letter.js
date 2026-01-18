/**
 * Dead Letter Handler
 *
 * Stores and manages failed messages that cannot be delivered.
 * Provides CLI tools for viewing and retrying dead letters.
 */

import config, { MESSAGE_STATUS } from './config.js';

/**
 * Create a dead letter handler
 * @param {object} options - Handler options
 * @returns {object} Dead letter handler instance
 */
export function createDeadLetter(options = {}) {
  const {
    messagePersistence,
    storagePath = `${process.env.HOME}/.mcp-agent-mail/dead-letters.db`,
    logger = console,
  } = options;

  let db = null;

  /**
   * Initialize the dead letter handler
   * @returns {Promise<void>}
   */
  async function initialize() {
    const { default: sqlite3 } = await import('better-sqlite3');

    db = new sqlite3(storagePath);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS dead_letters (
        id TEXT PRIMARY KEY,
        original_message_id TEXT,
        sender TEXT,
        recipient TEXT,
        content TEXT NOT NULL,
        importance TEXT DEFAULT 'normal',
        type TEXT,
        error TEXT,
        failed_at INTEGER DEFAULT (unixepoch()),
        retry_count INTEGER DEFAULT 0,
        resolved INTEGER DEFAULT 0,
        resolved_at INTEGER,
        resolution TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_dead_letters_resolved ON dead_letters(resolved);
      CREATE INDEX IF NOT EXISTS idx_dead_letters_failed ON dead_letters(failed_at);
      CREATE INDEX IF NOT EXISTS idx_dead_letters_sender ON dead_letters(sender);
    `);

    logger.info(`[DeadLetter] Initialized at ${storagePath}`);
  }

  /**
   * Store a failed message as dead letter
   * @param {object} message - Original message
   * @param {string} error - Error that caused failure
   * @returns {Promise<object>} Store result
   */
  async function store(message, error) {
    const stmt = db.prepare(`
      INSERT INTO dead_letters (
        id, original_message_id, sender, recipient, content, 
        importance, type, error, failed_at, retry_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deadLetterId = `dl-${message.id}`;

    stmt.run(
      deadLetterId,
      message.id,
      message.sender,
      message.recipient,
      JSON.stringify(message),
      message.importance || 'normal',
      message.type,
      error,
      Date.now(),
      message.retry_count || 0,
    );

    // Mark original message as dead letter
    if (messagePersistence) {
      await messagePersistence.markDeadLetter(message.id, error);
    }

    logger.warn(`[DeadLetter] Stored dead letter: ${deadLetterId}`, {
      originalMessageId: message.id,
      error,
    });

    return { success: true, dead_letter_id: deadLetterId };
  }

  /**
   * Get a dead letter by ID
   * @param {string} deadLetterId - Dead letter ID
   * @returns {Promise<object|null>} Dead letter or null
   */
  async function get(deadLetterId) {
    const stmt = db.prepare('SELECT * FROM dead_letters WHERE id = ?');
    const row = stmt.get(deadLetterId);

    if (!row) return null;

    return {
      ...row,
      content: JSON.parse(row.content),
    };
  }

  /**
   * Get all dead letters
   * @param {object} [options] - Query options
   * @returns {Promise<Array>} List of dead letters
   */
  async function list(options = {}) {
    const { unresolved = false, limit = 100, offset = 0, sender } = options;

    let query = 'SELECT * FROM dead_letters';
    const params = [];

    const conditions = [];

    if (unresolved) {
      conditions.push('resolved = 0');
    }

    if (sender) {
      conditions.push('sender = ?');
      params.push(sender);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY failed_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map((row) => ({
      ...row,
      content: JSON.parse(row.content),
    }));
  }

  /**
   * Get dead letters due for retry
   * @param {number} [limit=100] - Max results
   * @returns {Promise<Array>} List of retryable dead letters
   */
  async function getDueForRetry(limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM dead_letters 
      WHERE resolved = 0 
      AND (next_retry_at IS NULL OR next_retry_at <= unixepoch() * 1000)
      ORDER BY failed_at ASC 
      LIMIT ?
    `);

    const rows = stmt.all(limit);

    return rows.map((row) => ({
      ...row,
      content: JSON.parse(row.content),
    }));
  }

  /**
   * Mark dead letter as resolved
   * @param {string} deadLetterId - Dead letter ID
   * @param {string} resolution - Resolution type ('retried', 'skipped', 'escalated')
   * @returns {Promise<object>} Update result
   */
  async function resolve(deadLetterId, resolution = 'skipped') {
    const stmt = db.prepare(`
      UPDATE dead_letters 
      SET resolved = 1, resolved_at = unixepoch(), resolution = ?
      WHERE id = ?
    `);

    const result = stmt.run(resolution, deadLetterId);

    logger.info(`[DeadLetter] Resolved: ${deadLetterId} as ${resolution}`);

    return { success: result.changes > 0 };
  }

  /**
   * Update retry count
   * @param {string} deadLetterId - Dead letter ID
   * @param {number} retryCount - New retry count
   * @returns {Promise<object>} Update result
   */
  async function updateRetryCount(deadLetterId, retryCount) {
    const stmt = db.prepare(`
      UPDATE dead_letters 
      SET retry_count = ?
      WHERE id = ?
    `);

    const result = stmt.run(retryCount, deadLetterId);

    return { success: result.changes > 0 };
  }

  /**
   * Schedule retry for a dead letter
   * @param {string} deadLetterId - Dead letter ID
   * @param {number} delayMs - Delay in milliseconds
   * @returns {Promise<object>} Update result
   */
  async function scheduleRetry(deadLetterId, delayMs) {
    const nextRetryAt = Date.now() + delayMs;

    const stmt = db.prepare(`
      UPDATE dead_letters 
      SET next_retry_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(nextRetryAt, deadLetterId);

    return { success: result.changes > 0 };
  }

  /**
   * Get dead letter statistics
   * @returns {Promise<object>} Statistics
   */
  async function getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM dead_letters');
    const unresolvedStmt = db.prepare(
      'SELECT COUNT(*) as count FROM dead_letters WHERE resolved = 0',
    );
    const resolvedStmt = db.prepare(
      'SELECT COUNT(*) as count FROM dead_letters WHERE resolved = 1',
    );
    const byResolutionStmt = db.prepare(`
      SELECT resolution, COUNT(*) as count 
      FROM dead_letters 
      WHERE resolved = 1 
      GROUP BY resolution
    `);

    const total = totalStmt.get().count;
    const unresolved = unresolvedStmt.get().count;
    const resolved = resolvedStmt.get().count;
    const byResolution = byResolutionStmt.all();

    return {
      total,
      unresolved,
      resolved,
      resolutionBreakdown: byResolution.reduce((acc, r) => {
        acc[r.resolution] = r.count;
        return acc;
      }, {}),
    };
  }

  /**
   * Retry a dead letter (returns message for re-sending)
   * @param {string} deadLetterId - Dead letter ID
   * @returns {Promise<object|null>} Message to retry or null
   */
  async function retry(deadLetterId) {
    const deadLetter = await get(deadLetterId);

    if (!deadLetter) {
      return null;
    }

    if (deadLetter.resolved) {
      logger.warn(
        `[DeadLetter] Cannot retry resolved dead letter: ${deadLetterId}`,
      );
      return null;
    }

    // Update retry count
    await updateRetryCount(deadLetterId, deadLetter.retry_count + 1);

    // Return the original message content
    return {
      ...deadLetter.content,
      retry_count: deadLetter.retry_count + 1,
    };
  }

  /**
   * Batch resolve dead letters
   * @param {Array<string>} deadLetterIds - IDs to resolve
   * @param {string} resolution - Resolution type
   * @returns {Promise<object>} Batch result
   */
  async function batchResolve(deadLetterIds, resolution = 'skipped') {
    const stmt = db.prepare(`
      UPDATE dead_letters 
      SET resolved = 1, resolved_at = unixepoch(), resolution = ?
      WHERE id = ?
    `);

    let resolved = 0;

    for (const id of deadLetterIds) {
      const result = stmt.run(resolution, id);
      resolved += result.changes;
    }

    return { resolved, total: deadLetterIds.length };
  }

  /**
   * Export dead letters for analysis
   * @param {object} [options] - Export options
   * @returns {Promise<string>} JSON export
   */
  async function exportData(options = {}) {
    const { unresolved = true } = options;

    const deadLetters = await list({ unresolved, limit: 10000 });

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        count: deadLetters.length,
        deadLetters,
      },
      null,
      2,
    );
  }

  /**
   * Close the dead letter handler
   * @returns {Promise<void>}
   */
  async function close() {
    if (db) {
      db.close();
      db = null;
    }
  }

  return {
    initialize,
    store,
    get,
    list,
    getDueForRetry,
    resolve,
    updateRetryCount,
    scheduleRetry,
    getStats,
    retry,
    batchResolve,
    exportData,
    close,
  };
}

export default createDeadLetter;
