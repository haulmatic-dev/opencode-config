/**
 * Priority Queue with Escalation
 *
 * Manages message priority and auto-escalation for critical messages.
 */

import config, { PRIORITY } from './config.js';

/**
 * Create a priority queue
 * @param {object} options - Queue options
 * @returns {object} Priority queue instance
 */
export function createPriorityQueue(options = {}) {
  const { logger = console } = options;

  // Priority buckets (lower index = higher priority)
  const queues = {
    [PRIORITY.CRITICAL]: [],
    [PRIORITY.HIGH]: [],
    [PRIORITY.NORMAL]: [],
    [PRIORITY.LOW]: [],
  };

  const escalationTimers = new Map();
  const processedCount = {
    [PRIORITY.CRITICAL]: 0,
    [PRIORITY.HIGH]: 0,
    [PRIORITY.NORMAL]: 0,
    [PRIORITY.LOW]: 0,
  };

  /**
   * Add a message to the queue
   * @param {object} message - Message to enqueue
   * @returns {Promise<object>} Enqueue result
   */
  async function enqueue(message) {
    const priority = mapImportanceToPriority(message.importance);

    queues[priority].push({
      message,
      enqueuedAt: Date.now(),
      priority,
    });

    logger.debug(
      `[PriorityQueue] Enqueued message ${message.id} with priority ${priority}`,
    );

    // Set escalation timer for critical messages
    if (priority === PRIORITY.CRITICAL) {
      scheduleEscalation(message);
    }

    return { success: true, position: queues[priority].length, priority };
  }

  /**
   * Dequeue the highest priority message
   * @returns {Promise<object|null>} Next message or null if empty
   */
  async function dequeue() {
    // Check from highest to lowest priority
    for (const priority of [
      PRIORITY.CRITICAL,
      PRIORITY.HIGH,
      PRIORITY.NORMAL,
      PRIORITY.LOW,
    ]) {
      if (queues[priority].length > 0) {
        const item = queues[priority].shift();
        processedCount[priority]++;

        logger.debug(
          `[PriorityQueue] Dequeued message ${item.message.id} from priority ${priority}`,
        );

        // Cancel escalation timer if exists
        const timerKey = `${item.message.id}:${priority}`;
        if (escalationTimers.has(timerKey)) {
          clearTimeout(escalationTimers.get(timerKey));
          escalationTimers.delete(timerKey);
        }

        return item;
      }
    }

    return null;
  }

  /**
   * Peek at the next message without removing it
   * @returns {Promise<object|null>} Next message or null
   */
  async function peek() {
    for (const priority of [
      PRIORITY.CRITICAL,
      PRIORITY.HIGH,
      PRIORITY.NORMAL,
      PRIORITY.LOW,
    ]) {
      if (queues[priority].length > 0) {
        return queues[priority][0];
      }
    }
    return null;
  }

  /**
   * Get queue length by priority
   * @returns {Promise<object>} Lengths by priority
   */
  async function getLengths() {
    return {
      [PRIORITY.CRITICAL]: queues[PRIORITY.CRITICAL].length,
      [PRIORITY.HIGH]: queues[PRIORITY.HIGH].length,
      [PRIORITY.NORMAL]: queues[PRIORITY.NORMAL].length,
      [PRIORITY.LOW]: queues[PRIORITY.LOW].length,
      total: Object.values(queues).reduce((sum, q) => sum + q.length, 0),
    };
  }

  /**
   * Map importance string to priority number
   * @param {string} importance - Importance level
   * @returns {number} Priority number
   */
  function mapImportanceToPriority(importance) {
    const mapping = {
      critical: PRIORITY.CRITICAL,
      high: PRIORITY.HIGH,
      normal: PRIORITY.NORMAL,
      low: PRIORITY.LOW,
    };

    return mapping[importance] || PRIORITY.NORMAL;
  }

  /**
   * Schedule escalation for a critical message
   * @param {object} message - Message to escalate
   */
  function scheduleEscalation(message) {
    const timerKey = `${message.id}:${PRIORITY.CRITICAL}`;

    // Critical: escalate after 30 seconds
    const escalationDelay = 30000;

    const timer = setTimeout(() => {
      logger.warn(`[PriorityQueue] Escalating critical message: ${message.id}`);

      // Move to all workers (broadcast)
      // This would trigger a notification to all registered workers
      // Implementation depends on notification system

      escalationTimers.delete(timerKey);
    }, escalationDelay);

    escalationTimers.set(timerKey, timer);
  }

  /**
   * Remove a specific message from the queue
   * @param {string} messageId - Message ID to remove
   * @returns {Promise<object>} Removal result
   */
  async function remove(messageId) {
    for (const priority of [
      PRIORITY.CRITICAL,
      PRIORITY.HIGH,
      PRIORITY.NORMAL,
      PRIORITY.LOW,
    ]) {
      const index = queues[priority].findIndex(
        (item) => item.message.id === messageId,
      );

      if (index !== -1) {
        const item = queues[priority].splice(index, 1)[0];

        // Cancel escalation timer
        const timerKey = `${messageId}:${priority}`;
        if (escalationTimers.has(timerKey)) {
          clearTimeout(escalationTimers.get(timerKey));
          escalationTimers.delete(timerKey);
        }

        return { success: true, priority, message: item.message };
      }
    }

    return { success: false, error: 'message_not_found' };
  }

  /**
   * Get messages by priority level
   * @param {number} priority - Priority level
   * @returns {Promise<Array>} Messages at this priority
   */
  async function getByPriority(priority) {
    return queues[priority] || [];
  }

  /**
   * Clear the queue
   * @param {number} [priority] - Optional priority to clear (clears all if not specified)
   * @returns {Promise<object>} Clear result
   */
  async function clear(priority = null) {
    if (priority !== null) {
      const count = queues[priority].length;
      queues[priority] = [];
      return { cleared: count, priority };
    }

    const total = Object.values(queues).reduce((sum, q) => sum + q.length, 0);

    for (const priority of Object.keys(queues)) {
      queues[priority] = [];
    }

    // Clear all escalation timers
    for (const [key, timer] of escalationTimers) {
      clearTimeout(timer);
    }
    escalationTimers.clear();

    return { cleared: total };
  }

  /**
   * Get queue statistics
   * @returns {Promise<object>} Statistics
   */
  async function getStats() {
    const lengths = await getLengths();

    return {
      ...lengths,
      processed: processedCount,
      escalationTimers: escalationTimers.size,
    };
  }

  /**
   * Check if queue is empty
   * @returns {Promise<boolean>} True if empty
   */
  async function isEmpty() {
    return Object.values(queues).every((q) => q.length === 0);
  }

  /**
   * Close the priority queue
   * @returns {Promise<void>}
   */
  async function close() {
    // Clear all escalation timers
    for (const [key, timer] of escalationTimers) {
      clearTimeout(timer);
    }
    escalationTimers.clear();

    // Clear all queues
    for (const priority of Object.keys(queues)) {
      queues[priority] = [];
    }
  }

  return {
    enqueue,
    dequeue,
    peek,
    getLengths,
    remove,
    getByPriority,
    clear,
    getStats,
    isEmpty,
    close,
  };
}

export default createPriorityQueue;
