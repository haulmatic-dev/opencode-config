/**
 * Parallel Task Coordinator Configuration
 *
 * Centralized configuration for parallel task enforcement system.
 * Modify these values to tune behavior for your environment.
 */

export const MESSAGE_STATUS = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  ACKNOWLEDGED: 'acknowledged',
  FAILED: 'failed',
  DEAD_LETTER: 'dead_letter',
};

export const WORKER_STATUS = {
  REGISTERED: 'registered',
  ACTIVE: 'active',
  STALE: 'stale',
  OFFLINE: 'offline',
};

export const MESSAGE_TYPES = {
  CLAIM_TASK: 'CLAIM_TASK',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  HEARTBEAT: 'HEARTBEAT',
  TASK_COMPLETE: 'TASK_COMPLETE',
  TASK_FAILED: 'TASK_FAILED',
  RELEASE_CLAIM: 'RELEASE_CLAIM',
  ACKNOWLEDGMENT: 'ACKNOWLEDGMENT',
};

export const PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

export const config = {
  /**
   * Heartbeat interval for workers (milliseconds)
   * Workers must send heartbeats to be considered alive.
   * @type {number}
   * @default 30000 (30 seconds)
   */
  HEARTBEAT_INTERVAL_MS: 30000,

  /**
   * Time after which a worker is considered stale (milliseconds)
   * If no heartbeat received within this time, worker is marked stale.
   * @type {number}
   * @default 120000 (2 minutes)
   */
  STALE_THRESHOLD_MS: 120000,

  /**
   * Maximum retry attempts for failed messages
   * @type {number}
   * @default 3
   */
  RETRY_MAX_ATTEMPTS: 3,

  /**
   * Exponential backoff intervals for retries (milliseconds)
   * Used as [1000, 2000, 4000] for first, second, third retry.
   * @type {number[]}
   */
  RETRY_BACKOFF_MS: [1000, 2000, 4000],

  /**
   * Enable dead letter handling for failed messages
   * @type {boolean}
   * @default true
   */
  DEAD_LETTER_ENABLED: true,

  /**
   * Coordinator instance name
   */
  COORDINATOR_NAME: 'task-coordinator',

  /**
   * SQLite database path for message persistence
   */
  DATABASE_PATH: `${process.env.HOME}/.mcp-agent-mail/messages.db`,

  /**
   * Poll interval for coordinator services (milliseconds)
   */
  POLL_INTERVAL_MS: 5000,

  /**
   * Log level
   */
  LOG_LEVEL: process.env.DEBUG ? 'debug' : 'info',
};

/**
 * Get configuration value by key
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Configuration value
 */
export function getConfig(key, defaultValue = null) {
  if (key in config) {
    return config[key];
  }
  return defaultValue;
}

/**
 * Create configuration from environment variables
 * @returns {object} Configuration object with env overrides
 */
export function createConfigFromEnv() {
  return {
    HEARTBEAT_INTERVAL_MS: parseInt(
      process.env.PTC_HEARTBEAT_INTERVAL_MS || config.HEARTBEAT_INTERVAL_MS,
    ),
    STALE_THRESHOLD_MS: parseInt(
      process.env.PTC_STALE_THRESHOLD_MS || config.STALE_THRESHOLD_MS,
    ),
    RETRY_MAX_ATTEMPTS: parseInt(
      process.env.PTC_RETRY_MAX_ATTEMPTS || config.RETRY_MAX_ATTEMPTS,
    ),
    DEAD_LETTER_ENABLED: process.env.PTC_DEAD_LETTER_ENABLED !== 'false',
    LOG_LEVEL: process.env.PTC_LOG_LEVEL || config.LOG_LEVEL,
  };
}

export default config;
