/**
 * Acknowledgment Tracker
 *
 * Tracks message acknowledgments and enforces delivery guarantees.
 */

import config, { MESSAGE_STATUS } from './config.js';

/**
 * Create an acknowledgment tracker
 * @param {object} options - Options
 * @returns {object} Acknowledgment tracker instance
 */
export function createAcknowledgmentTracker(options = {}) {
  const {
    messagePersistence,
    acknowledgmentTimeoutMs = 60000, // 1 minute default
    logger = console,
  } = options;

  const pendingAcknowledgments = new Map();

  /**
   * Register a message expecting acknowledgment
   * @param {string} messageId - Message ID
   * @param {object} options - Registration options
   * @returns {Promise<object>} Registration result
   */
  async function register(messageId, options = {}) {
    const {
      sender,
      recipient,
      timeoutMs = acknowledgmentTimeoutMs,
      onTimeout,
    } = options;

    const pending = {
      messageId,
      sender,
      recipient,
      registeredAt: Date.now(),
      timeoutAt: Date.now() + timeoutMs,
      acknowledged: false,
      acknowledgedAt: null,
      onTimeout,
    };

    pendingAcknowledgments.set(messageId, pending);

    // Set timeout handler
    if (timeoutMs > 0) {
      setTimeout(async () => {
        const entry = pendingAcknowledgments.get(messageId);
        if (entry && !entry.acknowledged) {
          logger.warn(`[AckTracker] Acknowledgment timeout for ${messageId}`);

          if (onTimeout) {
            try {
              await onTimeout(entry);
            } catch (error) {
              logger.error('[AckTracker] onTimeout error', { error });
            }
          }

          pendingAcknowledgments.delete(messageId);
        }
      }, timeoutMs);
    }

    return { success: true, messageId, timeoutAt: pending.timeoutAt };
  }

  /**
   * Acknowledge a message
   * @param {string} messageId - Message ID
   * @param {string} acknowledgerId - ID of entity acknowledging
   * @returns {Promise<object>} Acknowledgment result
   */
  async function acknowledge(messageId, acknowledgerId) {
    const entry = pendingAcknowledgments.get(messageId);

    if (!entry) {
      return { success: false, error: 'message_not_found' };
    }

    if (entry.acknowledged) {
      return { success: false, error: 'already_acknowledged' };
    }

    if (entry.recipient && acknowledgerId !== entry.recipient) {
      return { success: false, error: 'not_recipient' };
    }

    entry.acknowledged = true;
    entry.acknowledgedAt = Date.now();

    // Update persistence if available
    if (messagePersistence) {
      await messagePersistence.acknowledge(messageId, acknowledgerId);
    }

    pendingAcknowledgments.delete(messageId);

    logger.debug(
      `[AckTracker] Message ${messageId} acknowledged by ${acknowledgerId}`,
    );

    return {
      success: true,
      messageId,
      acknowledgedBy: acknowledgerId,
      latencyMs: entry.acknowledgedAt - entry.registeredAt,
    };
  }

  /**
   * Check if a message is pending acknowledgment
   * @param {string} messageId - Message ID
   * @returns {Promise<boolean>} True if pending
   */
  async function isPending(messageId) {
    return pendingAcknowledgments.has(messageId);
  }

  /**
   * Get pending acknowledgments
   * @param {object} [filter] - Optional filter
   * @returns {Promise<Array>} List of pending acknowledgments
   */
  async function getPending(filter = {}) {
    let pending = Array.from(pendingAcknowledgments.values());

    if (filter.sender) {
      pending = pending.filter((p) => p.sender === filter.sender);
    }

    if (filter.recipient) {
      pending = pending.filter((p) => p.recipient === filter.recipient);
    }

    if (filter.overdue) {
      pending = pending.filter((p) => p.timeoutAt < Date.now());
    }

    return pending;
  }

  /**
   * Get acknowledgment statistics
   * @returns {Promise<object>} Statistics
   */
  async function getStats() {
    const pending = Array.from(pendingAcknowledgments.values());
    const overdue = pending.filter((p) => p.timeoutAt < Date.now());

    return {
      pending: pending.length,
      overdue: overdue.length,
      totalRegistered:
        pendingAcknowledgments.size + (await getAcknowledgedCount()),
    };
  }

  /**
   * Get count of acknowledged messages (from persistence)
   * @returns {Promise<number>} Count
   */
  async function getAcknowledgedCount() {
    if (!messagePersistence) {
      return 0;
    }

    const messages = await messagePersistence.getByStatus(
      MESSAGE_STATUS.ACKNOWLEDGED,
    );
    return messages.length;
  }

  /**
   * Cancel pending acknowledgment tracking
   * @param {string} messageId - Message ID
   * @returns {Promise<object>} Cancel result
   */
  async function cancel(messageId) {
    const deleted = pendingAcknowledgments.delete(messageId);

    return { success: deleted };
  }

  /**
   * Clear all pending acknowledgments
   * @returns {Promise<object>} Clear result
   */
  async function clear() {
    const count = pendingAcknowledgments.size;
    pendingAcknowledgments.clear();

    return { cleared: count };
  }

  /**
   * Close the tracker
   * @returns {Promise<void>}
   */
  async function close() {
    await clear();
  }

  return {
    register,
    acknowledge,
    isPending,
    getPending,
    getStats,
    cancel,
    clear,
    close,
  };
}

export default createAcknowledgmentTracker;
