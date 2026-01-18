/**
 * Heartbeat Manager
 *
 * Handles worker heartbeats with automatic timeout detection.
 */

import config, { WORKER_STATUS } from './config.js';

/**
 * Create a heartbeat manager
 * @param {object} options - Options
 * @returns {object} Heartbeat manager instance
 */
export function createHeartbeatManager(options = {}) {
  const {
    workerRegistry,
    heartbeatIntervalMs = config.HEARTBEAT_INTERVAL_MS,
    staleThresholdMs = config.STALE_THRESHOLD_MS,
    logger = console,
  } = options;

  const heartbeatIntervals = new Map();
  let isRunning = false;

  async function startHeartbeat(workerId, heartbeatFn) {
    if (heartbeatIntervals.has(workerId)) {
      return { success: false, error: 'heartbeat_already_running' };
    }

    try {
      await heartbeatFn();
    } catch (error) {
      logger.warn(`[Heartbeat] Initial heartbeat failed for ${workerId}`, {
        error,
      });
    }

    const intervalId = setInterval(async () => {
      if (!isRunning) return;

      try {
        await heartbeatFn();
        logger.debug(`[Heartbeat] Sent heartbeat for ${workerId}`);
      } catch (error) {
        logger.error(`[Heartbeat] Failed for ${workerId}`, { error });
      }
    }, heartbeatIntervalMs);

    heartbeatIntervals.set(workerId, {
      intervalId,
      heartbeatFn,
      startedAt: Date.now(),
    });

    return { success: true, workerId, intervalMs: heartbeatIntervalMs };
  }

  async function stopHeartbeat(workerId) {
    const entry = heartbeatIntervals.get(workerId);

    if (!entry) {
      return { success: false, error: 'heartbeat_not_running' };
    }

    clearInterval(entry.intervalId);
    heartbeatIntervals.delete(workerId);

    return { success: true, workerId };
  }

  async function stopAll() {
    for (const [workerId, entry] of heartbeatIntervals) {
      clearInterval(entry.intervalId);
    }
    heartbeatIntervals.clear();
    isRunning = false;
  }

  async function startAll() {
    isRunning = true;
  }

  async function getStatus() {
    const status = [];

    for (const [workerId, entry] of heartbeatIntervals) {
      status.push({
        workerId,
        running: true,
        startedAt: entry.startedAt,
        intervalMs: heartbeatIntervalMs,
      });
    }

    return status;
  }

  function isHeartbeatActive(workerId) {
    return heartbeatIntervals.has(workerId);
  }

  function getActiveCount() {
    return heartbeatIntervals.size;
  }

  async function close() {
    await stopAll();
  }

  return {
    startHeartbeat,
    stopHeartbeat,
    stopAll,
    startAll,
    getStatus,
    isHeartbeatActive,
    getActiveCount,
    close,
  };
}

export default createHeartbeatManager;
