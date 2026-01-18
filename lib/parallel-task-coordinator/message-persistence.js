/**
 * Message Persistence
 *
 * Stores messages in SQLite for durability.
 * Tracks message status (pending, delivered, acknowledged, failed).
 */

import config, { MESSAGE_STATUS } from './config.js';

/**
 * Create a message persistence layer
 * @param {object} options - Persistence options
 * @returns {object} Persistence instance
 */
export function createMessagePersistence(options = {}) {
  const {
    storagePath = `${process.env.HOME}/.mcp-agent-mail/messages.db`,
    logger = console,
  } = options;

  let db = null;

  /**
   * Initialize the persistence layer
   * @returns {Promise<void>}
   */
  async function initialize() {
    const { default: sqlite3 } = await import('better-sqlite3');

    db = new sqlite3(storagePath);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        content TEXT NOT NULL,
        importance TEXT DEFAULT 'normal',
        type TEXT,
        status TEXT DEFAULT 'pending',
        correlation_id TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        delivered_at INTEGER,
        acknowledged_at INTEGER,
        retry_count INTEGER DEFAULT 0,
        dead_letter INTEGER DEFAULT 0,
        error TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
      CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient);
      CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
      CREATE INDEX IF NOT EXISTS idx_messages_correlation ON messages(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    `);

    logger.info(`[MessagePersistence] Initialized at ${storagePath}`);
  }

  /**
   * Store an outgoing message
   * @param {object} message - Message to store
   * @returns {Promise<object>} Store result
   */
  async function storeOutgoing(message) {
    const stmt = db.prepare(`
      INSERT INTO messages (id, sender, recipient, content, importance, type, status, correlation_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      message.sender,
      message.recipient,
      JSON.stringify(message),
      message.importance || 'normal',
      message.type,
      MESSAGE_STATUS.PENDING,
      message.correlation_id || null,
      message.timestamp || Date.now(),
    );

    return { success: true, message_id: message.id };
  }

  /**
   * Mark a message as delivered
   * @param {string} messageId - Message ID
   * @returns {Promise<object>} Update result
   */
  async function markDelivered(messageId) {
    const stmt = db.prepare(`
      UPDATE messages 
      SET status = ?, delivered_at = unixepoch()
      WHERE id = ?
    `);

    const result = stmt.run(MESSAGE_STATUS.DELIVERED, messageId);

    return { success: result.changes > 0 };
  }

  /**
   * Acknowledge a message
   * @param {string} messageId - Message ID
   * @param {string} recipientId - Recipient acknowledging
   * @returns {Promise<object>} Ack result
   */
  async function acknowledge(messageId, recipientId) {
    const stmt = db.prepare(`
      UPDATE messages 
      SET status = ?, acknowledged_at = unixepoch()
      WHERE id = ? AND recipient = ?
    `);

    const result = stmt.run(
      MESSAGE_STATUS.ACKNOWLEDGED,
      messageId,
      recipientId,
    );

    return { success: result.changes > 0 };
  }

  /**
   * Mark a message as failed
   * @param {string} messageId - Message ID
   * @param {string} error - Error message
   * @returns {Promise<object>} Update result
   */
  async function markFailed(messageId, error) {
    const stmt = db.prepare(`
      UPDATE messages 
      SET status = ?, error = ?, retry_count = retry_count + 1
      WHERE id = ?
    `);

    const result = stmt.run(MESSAGE_STATUS.FAILED, error, messageId);

    return { success: result.changes > 0 };
  }

  /**
   * Mark a message as dead letter
   * @param {string} messageId - Message ID
   * @param {string} error - Error message
   * @returns {Promise<object>} Update result
   */
  async function markDeadLetter(messageId, error) {
    const stmt = db.prepare(`
      UPDATE messages 
      SET status = ?, dead_letter = 1, error = ?
      WHERE id = ?
    `);

    const result = stmt.run(MESSAGE_STATUS.DEAD_LETTER, error, messageId);

    return { success: result.changes > 0 };
  }

  /**
   * Get a message by ID
   * @param {string} messageId - Message ID
   * @returns {Promise<object|null>} Message or null
   */
  async function get(messageId) {
    const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
    const row = stmt.get(messageId);

    if (!row) return null;

    return {
      ...row,
      content: JSON.parse(row.content),
    };
  }

  /**
   * Get messages by status
   * @param {string} status - Message status
   * @param {number} [limit=100] - Max messages to return
   * @returns {Promise<Array>} List of messages
   */
  async function getByStatus(status, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE status = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);

    const rows = stmt.all(status, limit);

    return rows.map((row) => ({
      ...row,
      content: JSON.parse(row.content),
    }));
  }

  /**
   * Get messages by sender
   * @param {string} senderId - Sender ID
   * @param {number} [limit=100] - Max messages
   * @returns {Promise<Array>} List of messages
   */
  async function getBySender(senderId, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE sender = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);

    const rows = stmt.all(senderId, limit);

    return rows.map((row) => ({
      ...row,
      content: JSON.parse(row.content),
    }));
  }

  /**
   * Get messages by recipient
   * @param {string} recipientId - Recipient ID
   * @param {number} [limit=100] - Max messages
   * @returns {Promise<Array>} List of messages
   */
  async function getByRecipient(recipientId, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE recipient = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);

    const rows = stmt.all(recipientId, limit);

    return rows.map((row) => ({
      ...row,
      content: JSON.parse(row.content),
    }));
  }

  /**
   * Get pending messages for retry
   * @param {number} [limit=100] - Max messages
   * @returns {Promise<Array>} List of pending messages
   */
  async function getPendingForRetry(limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE status = ? AND retry_count < ?
      ORDER BY created_at ASC 
      LIMIT ?
    `);

    const rows = stmt.all(
      MESSAGE_STATUS.FAILED,
      config.RETRY_MAX_ATTEMPTS,
      limit,
    );

    return rows.map((row) => ({
      ...row,
      content: JSON.parse(row.content),
    }));
  }

  /**
   * Get messages by correlation ID
   * @param {string} correlationId - Correlation ID
   * @returns {Promise<Array>} List of messages
   */
  async function getByCorrelation(correlationId) {
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE correlation_id = ? 
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(correlationId);

    return rows.map((row) => ({
      ...row,
      content: JSON.parse(row.content),
    }));
  }

  /**
   * Get message statistics
   * @returns {Promise<object>} Statistics
   */
  async function getStats() {
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM messages 
      GROUP BY status
    `);

    const rows = stmt.all();

    const stats = {
      total: 0,
      pending: 0,
      delivered: 0,
      acknowledged: 0,
      failed: 0,
      dead_letter: 0,
    };

    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }

    // Get average processing time
    const timeStmt = db.prepare(`
      SELECT AVG(acknowledged_at - delivered_at) as avg_processing_time
      FROM messages 
      WHERE acknowledged_at IS NOT NULL AND delivered_at IS NOT NULL
    `);

    const timeResult = timeStmt.get();
    stats.avgProcessingTimeMs = timeResult?.avg_processing_time || 0;

    return stats;
  }

  /**
   * Clean up old messages
   * @param {number} olderThanDays - Delete messages older than this many days
   * @returns {Promise<object>} Cleanup result
   */
  async function cleanup(olderThanDays = 30) {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const stmt = db.prepare(`
      DELETE FROM messages 
      WHERE created_at < ? AND status IN ('acknowledged', 'dead_letter')
    `);

    const result = stmt.run(cutoff);

    logger.info(
      `[MessagePersistence] Cleaned up ${result.changes} old messages`,
    );

    return { deleted: result.changes };
  }

  /**
   * Close the persistence layer
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
    storeOutgoing,
    markDelivered,
    acknowledge,
    markFailed,
    markDeadLetter,
    get,
    getByStatus,
    getBySender,
    getByRecipient,
    getPendingForRetry,
    getByCorrelation,
    getStats,
    cleanup,
    close,
  };
}

export default createMessagePersistence;
