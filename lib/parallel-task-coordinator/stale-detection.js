/**
 * Stale Worker Detection
 *
 * Detects workers that haven't sent heartbeats within the threshold
 * and triggers reassignment of their tasks.
 */

import config, { WORKER_STATUS } from './config.js';

/**
 * Create a stale worker detector
 * @param {object} options - Options
 * @returns {object} Stale detector instance
 */
export function createStaleDetector(options = {}) {
  const {
    workerRegistry,
    staleThresholdMs = config.STALE_THRESHOLD_MS,
    pollIntervalMs = config.POLL_INTERVAL_MS,
    logger = console,
  } = options;

  let pollInterval = null;
  let isRunning = false;
  let onStaleCallback = null;

  /**
   * Set callback for when a worker is marked stale
   * @param {function} callback - Callback function(worker)
   */
  function onStale(callback) {
    onStaleCallback = callback;
  }

  /**
   * Check for stale workers
   * @returns {Promise<Array>} List of stale workers
   */
  async function check() {
    if (!workerRegistry) {
      logger.warn('[StaleDetector] No worker registry provided');
      return [];
    }

    const staleWorkers =
      await workerRegistry.findStaleWorkers(staleThresholdMs);

    for (const worker of staleWorkers) {
      logger.warn(`[StaleDetector] Marking worker as stale: ${worker.id}`);

      await workerRegistry.updateStatus(worker.id, WORKER_STATUS.STALE);

      if (onStaleCallback) {
        try {
          await onStaleCallback(worker);
        } catch (error) {
          logger.error('[StaleDetector] onStale callback error', { error });
        }
      }
    }

    return staleWorkers;
  }

  /**
   * Start automatic stale detection
   * @returns {Promise<object>} Start result
   */
  async function start() {
    if (isRunning) {
      return { success: false, error: 'already_running' };
    }

    isRunning = true;

    pollInterval = setInterval(async () => {
      try {
        await check();
      } catch (error) {
        logger.error('[StaleDetector] Poll error', { error });
      }
    }, pollIntervalMs);

    logger.info('[StaleDetector] Started stale detection');

    return { success: true, pollIntervalMs };
  }

  /**
   * Stop automatic stale detection
   * @returns {Promise<object>} Stop result
   */
  async function stop() {
    if (!isRunning) {
      return { success: false, error: 'not_running' };
    }

    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }

    isRunning = false;
    logger.info('[StaleDetector] Stopped stale detection');

    return { success: true };
  }

  /**
   * Get stale detector status
   * @returns {Promise<object>} Status object
   */
  async function getStatus() {
    return {
      isRunning,
      pollIntervalMs,
      staleThresholdMs,
      hasCallback: onStaleCallback !== null,
    };
  }

  /**
   * Close the stale detector
   * @returns {Promise<void>}
   */
  async function close() {
    await stop();
  }

  return {
    check,
    start,
    stop,
    getStatus,
    onStale,
    close,
  };
}

export default createStaleDetector;
