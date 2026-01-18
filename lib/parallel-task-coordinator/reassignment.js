/**
 * Task Reassignment
 *
 * Handles reassignment of tasks from stale/dead workers back to the pool.
 */

import config from './config.js';

/**
 * Create a task reassignment handler
 * @param {object} options - Options
 * @returns {object} Reassignment handler instance
 */
export function createTaskReassignment(options = {}) {
  const { taskClaim, workerRegistry, logger = console } = options;

  const reassignmentHistory = [];

  /**
   * Reassign all tasks from a stale worker
   * @param {string} workerId - Stale worker ID
   * @returns {Promise<object>} Reassignment result
   */
  async function reassignFromWorker(workerId) {
    if (!taskClaim) {
      return { success: false, error: 'no_task_claim_manager' };
    }

    const abandonedTasks = await taskClaim.getAbandonedTasks(workerId);

    if (abandonedTasks.length === 0) {
      return { success: true, reassigned: 0, message: 'No abandoned tasks' };
    }

    const results = {
      reassigned: 0,
      failed: 0,
      tasks: [],
    };

    for (const task of abandonedTasks) {
      const result = await taskClaim.markForReassignment(task.taskId);

      if (result.success) {
        results.reassigned++;
        results.tasks.push({
          taskId: task.taskId,
          status: 'reassigned',
          previousWorker: workerId,
        });

        reassignmentHistory.push({
          taskId: task.taskId,
          fromWorker: workerId,
          reassignedAt: Date.now(),
          status: 'success',
        });
      } else {
        results.failed++;
        results.tasks.push({
          taskId: task.taskId,
          status: 'failed',
          error: result.error,
        });

        reassignmentHistory.push({
          taskId: task.taskId,
          fromWorker: workerId,
          reassignedAt: Date.now(),
          status: 'failed',
          error: result.error,
        });
      }
    }

    logger.info(
      `[TaskReassignment] Reassigned ${results.reassigned} tasks from ${workerId}`,
    );

    return {
      success: true,
      workerId,
      ...results,
    };
  }

  /**
   * Reassign a specific task
   * @param {string} taskId - Task ID to reassign
   * @param {string} [reason] - Reason for reassignment
   * @returns {Promise<object>} Reassignment result
   */
  async function reassignTask(taskId, reason = 'manual') {
    if (!taskClaim) {
      return { success: false, error: 'no_task_claim_manager' };
    }

    const result = await taskClaim.markForReassignment(taskId);

    if (result.success) {
      reassignmentHistory.push({
        taskId,
        reassignedAt: Date.now(),
        reason,
        status: 'success',
      });
    }

    return result;
  }

  /**
   * Get reassignment history
   * @param {object} [options] - Query options
   * @returns {Promise<Array>} History entries
   */
  async function getHistory(options = {}) {
    const { limit = 100, workerId } = options;

    let history = reassignmentHistory;

    if (workerId) {
      history = history.filter((h) => h.fromWorker === workerId);
    }

    return history.slice(-limit);
  }

  /**
   * Get reassignment statistics
   * @returns {Promise<object>} Statistics
   */
  async function getStats() {
    const total = reassignmentHistory.length;
    const successful = reassignmentHistory.filter(
      (h) => h.status === 'success',
    ).length;
    const failed = reassignmentHistory.filter(
      (h) => h.status === 'failed',
    ).length;

    const byReason = reassignmentHistory.reduce((acc, h) => {
      const reason = h.reason || 'stale_worker';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      successful,
      failed,
      successRate:
        total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : 'N/A',
      byReason,
    };
  }

  /**
   * Clear reassignment history
   * @returns {Promise<object>} Clear result
   */
  async function clearHistory() {
    const count = reassignmentHistory.length;
    reassignmentHistory.length = 0;

    return { success: true, cleared: count };
  }

  /**
   * Close the reassignment handler
   * @returns {Promise<void>}
   */
  async function close() {
    reassignmentHistory.length = 0;
  }

  return {
    reassignFromWorker,
    reassignTask,
    getHistory,
    getStats,
    clearHistory,
    close,
  };
}

export default createTaskReassignment;
