/**
 * Parallel Task Coordinator
 *
 * Central module for coordinating parallel task execution using MCP Agent Mail.
 * Replaces PID-based race conditions with proper distributed coordination.
 *
 * Features:
 * - Atomic task claiming via MCP Agent Mail messages
 * - Worker heartbeat registration and monitoring
 * - Message persistence with SQLite
 * - Dead letter handling
 * - Priority and escalation support
 */

import { v4 as uuidv4 } from 'uuid';
import CircuitBreaker, { States } from '../circuit-breaker.js';
import {
  close as closeTracing,
  createTrace,
  initialize as initTracing,
} from '../tracing.js';
import config, {
  getConfig,
  MESSAGE_STATUS,
  MESSAGE_TYPES,
  PRIORITY,
  WORKER_STATUS,
} from './config.js';
import { createDeadLetter } from './dead-letter.js';
import { createMessagePersistence } from './message-persistence.js';
import { createPriorityQueue } from './priority.js';
import { createTaskClaim } from './task-claim.js';
import {
  createWorkerRegistry,
  WORKER_REGISTRY_EVENTS,
} from './worker-registry.js';

export {
  config,
  getConfig,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  WORKER_STATUS,
  PRIORITY,
};

/**
 * Message structure for the parallel task coordinator
 * @typedef {Object} Message
 * @property {string} id - Unique message identifier (UUID)
 * @property {string} type - Message type (CLAIM_TASK, HEARTBEAT, etc.)
 * @property {string} version - Protocol version
 * @property {number} timestamp - Unix timestamp
 * @property {string} sender - Sender worker ID
 * @property {string} recipient - Recipient worker/coordinator ID
 * @property {string} importance - Message priority level
 * @property {object} payload - Type-specific content
 * @property {string} [correlation_id] - For request/response tracing
 */

/**
 * Create a Parallel Task Coordinator instance
 * @param {object} options - Coordinator options
 * @returns {object} Coordinator instance
 */
export function createParallelTaskCoordinator(options = {}) {
  const {
    coordinatorName = config.COORDINATOR_NAME,
    workerRegistry = createWorkerRegistry(),
    messagePersistence = createMessagePersistence(),
    deadLetter = createDeadLetter({ messagePersistence }),
    priorityQueue = createPriorityQueue(),
    taskClaim = createTaskClaim({ messagePersistence, workerRegistry }),
    logger = console,
  } = options;

  let isRunning = false;
  let pollInterval = null;

  const taskTraces = new Map();

  const circuitBreaker = new CircuitBreaker({
    failureThreshold: config.CIRCUIT_BREAKER_FAILURE_THRESHOLD ?? 5,
    resetTimeout: config.CIRCUIT_BREAKER_RESET_TIMEOUT ?? 30000,
  });

  /**
   * Log a message with the configured log level
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Message to log
   * @param {object} [data] - Additional data
   */
  function log(level, message, data = {}) {
    const logLevel = getConfig('LOG_LEVEL', 'info');
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };

    if (levels[level] >= levels[logLevel]) {
      logger[level](`[Coordinator] ${message}`, data);
    }
  }

  /**
   * Generate a unique message ID
   * @returns {string} UUID
   */
  function generateMessageId() {
    return uuidv4();
  }

  /**
   * Create a message envelope
   * @param {string} type - Message type
   * @param {string} sender - Sender ID
   * @param {string} recipient - Recipient ID
   * @param {object} payload - Message payload
   * @param {string} [importance='normal'] - Message importance
   * @param {string} [correlationId] - Correlation ID
   * @returns {Message} Message envelope
   */
  function createMessage(
    type,
    sender,
    recipient,
    payload,
    importance = 'normal',
    correlationId = null,
    traceId = null,
  ) {
    return {
      id: generateMessageId(),
      type,
      version: '1.0',
      timestamp: Date.now(),
      sender,
      recipient,
      importance,
      payload,
      correlation_id: correlationId,
      trace_id: traceId,
    };
  }

  /**
   * Register a worker with the coordinator
   * @param {string} workerId - Unique worker identifier
   * @param {object} metadata - Worker metadata
   * @returns {Promise<object>} Registration result
   */
  async function registerWorker(workerId, metadata = {}) {
    log('info', `Registering worker: ${workerId}`, { metadata });

    const registration = await workerRegistry.register(workerId, {
      name: workerId,
      pid: metadata.pid,
      instance: metadata.instance,
      capabilities: metadata.capabilities || ['task-execution'],
      ...metadata,
    });

    return registration;
  }

  /**
   * Unregister a worker from the coordinator
   * @param {string} workerId - Worker ID to unregister
   * @returns {Promise<object>} Unregistration result
   */
  async function unregisterWorker(workerId) {
    log('info', `Unregistering worker: ${workerId}`);
    return workerRegistry.unregister(workerId);
  }

  /**
   * Send a message through the coordinator
   * @param {Message} message - Message to send
   * @returns {Promise<object>} Send result
   */
  async function sendMessage(message) {
    log('debug', `Sending message: ${message.type}`, {
      from: message.sender,
      to: message.recipient,
    });

    return circuitBreaker.execute(async () => {
      await messagePersistence.storeOutgoing(message);

      await priorityQueue.enqueue(message);

      if (
        message.retry_count > 0 &&
        message.retry_count >= config.RETRY_MAX_ATTEMPTS
      ) {
        await deadLetter.store(
          message,
          `Max retries exceeded (${config.RETRY_MAX_ATTEMPTS})`,
        );
        return {
          success: false,
          error: 'max_retries_exceeded',
          dead_letter: true,
        };
      }

      return { success: true, message_id: message.id };
    });
  }

  /**
   * Claim a task atomically
   * @param {string} workerId - Worker claiming the task
   * @param {object} options - Claim options
   * @returns {Promise<object>} Claim result
   */
  async function claimTask(workerId, options = {}) {
    const trace = await createTrace({ tags: { workerId, taskType: 'claim' } });
    const traceId = trace.id;

    const message = createMessage(
      MESSAGE_TYPES.CLAIM_TASK,
      workerId,
      coordinatorName,
      {
        worker_id: workerId,
        capabilities: options.capabilities || ['task-execution'],
        priority: options.priority || 'normal',
        max_tasks: options.max_tasks || 1,
      },
      'high',
      null,
      traceId,
    );

    const span = await trace.startSpan('claimTask', { tags: { workerId } });
    const result = await circuitBreaker.execute(() => taskClaim.claim(message));
    await span.end({ tags: { success: result.success } });

    return { ...result, traceId };
  }

  /**
   * Acknowledge receipt of a message
   * @param {string} messageId - Message ID to acknowledge
   * @param {string} recipientId - Recipient acknowledging
   * @returns {Promise<object>} Acknowledgment result
   */
  async function acknowledgeMessage(messageId, recipientId) {
    return messagePersistence.acknowledge(messageId, recipientId);
  }

  /**
   * Send a heartbeat from a worker
   * @param {string} workerId - Worker sending heartbeat
   * @returns {Promise<object>} Heartbeat result
   */
  async function sendHeartbeat(workerId) {
    const message = createMessage(
      MESSAGE_TYPES.HEARTBEAT,
      workerId,
      coordinatorName,
      { timestamp: Date.now() },
      'low',
    );

    return workerRegistry.updateHeartbeat(workerId);
  }

  /**
   * Complete a task
   * @param {string} workerId - Worker completing the task
   * @param {string} taskId - Task ID completed
   * @param {object} result - Task result
   * @returns {Promise<object>} Completion result
   */
  async function completeTask(workerId, taskId, result = {}) {
    let traceId = null;
    const trace = taskTraces.get(taskId);
    if (trace) {
      traceId = trace.id;
      const span = await trace.startSpan('completeTask', {
        tags: { workerId, taskId },
      });
      await span.end({
        tags: { success: true, resultKeys: Object.keys(result) },
      });
    }

    const message = createMessage(
      MESSAGE_TYPES.TASK_COMPLETE,
      workerId,
      coordinatorName,
      { task_id: taskId, result },
      'normal',
      null,
      traceId,
    );

    await taskClaim.release(taskId, workerId);

    const sendResult = await sendMessage(message);

    if (trace) {
      await trace.finish();
      taskTraces.delete(taskId);
    }

    return sendResult;
  }

  /**
   * Fail a task
   * @param {string} workerId - Worker failing the task
   * @param {string} taskId - Task ID failed
   * @param {string} error - Error message
   * @returns {Promise<object>} Failure result
   */
  async function failTask(workerId, taskId, error) {
    let traceId = null;
    const trace = taskTraces.get(taskId);
    if (trace) {
      traceId = trace.id;
      const span = await trace.startSpan('failTask', {
        tags: { workerId, taskId },
      });
      await span.end({ status: 'error', tags: { error: String(error) } });
    }

    const message = createMessage(
      MESSAGE_TYPES.TASK_FAILED,
      workerId,
      coordinatorName,
      { task_id: taskId, error: String(error) },
      'high',
      null,
      traceId,
    );

    await taskClaim.release(taskId, workerId);

    const sendResult = await sendMessage(message);

    if (trace) {
      await trace.finish();
      taskTraces.delete(taskId);
    }

    return sendResult;
  }

  /**
   * Start the coordinator
   * @returns {Promise<void>}
   */
  async function start() {
    if (isRunning) {
      log('warn', 'Coordinator already running');
      return;
    }

    log('info', 'Starting Parallel Task Coordinator...');

    await initTracing({ logger });

    await workerRegistry.initialize();
    await messagePersistence.initialize();
    await taskClaim.initialize();

    if (config.DEAD_LETTER_ENABLED) {
      await deadLetter.initialize();
    }

    pollInterval = setInterval(async () => {
      try {
        const staleWorkers = await workerRegistry.findStaleWorkers(
          config.STALE_THRESHOLD_MS,
        );

        for (const worker of staleWorkers) {
          log('warn', `Worker marked stale: ${worker.id}`, worker);
          await workerRegistry.updateStatus(worker.id, WORKER_STATUS.STALE);

          const abandonedTasks = await taskClaim.getAbandonedTasks(worker.id);
          for (const task of abandonedTasks) {
            log('info', `Reassigning abandoned task: ${task.task_id}`);
            await taskClaim.markForReassignment(task.task_id);
          }
        }

        if (config.DEAD_LETTER_ENABLED) {
          const dueDeadLetters = await deadLetter.getDueForRetry();
          for (const deadLetterMsg of dueDeadLetters) {
            log('info', `Retrying dead letter: ${deadLetterMsg.id}`);
            await retryDeadLetter(deadLetterMsg);
          }
        }
      } catch (error) {
        log('error', 'Error in coordinator poll loop', {
          error: error.message,
        });
      }
    }, config.POLL_INTERVAL_MS);

    isRunning = true;
    log('info', 'Parallel Task Coordinator started');
  }

  /**
   * Stop the coordinator
   * @returns {Promise<void>}
   */
  async function stop() {
    if (!isRunning) {
      log('warn', 'Coordinator not running');
      return;
    }

    log('info', 'Stopping Parallel Task Coordinator...');

    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }

    await messagePersistence.close();

    await closeTracing();

    isRunning = false;
    log('info', 'Parallel Task Coordinator stopped');
  }

  /**
   * Retry a dead letter message
   * @param {object} deadLetterMsg - Dead letter to retry
   * @returns {Promise<object>} Retry result
   */
  async function retryDeadLetter(deadLetterMsg) {
    const originalMessage = JSON.parse(deadLetterMsg.content);
    const retryCount = (originalMessage.retry_count || 0) + 1;

    const retryMessage = {
      ...originalMessage,
      retry_count: retryCount,
      timestamp: Date.now(),
    };

    await deadLetter.updateRetryCount(deadLetterMsg.id, retryCount);

    return sendMessage(retryMessage);
  }

  /**
   * Get coordinator status
   * @returns {Promise<object>} Status object
   */
  async function getStatus() {
    const workers = await workerRegistry.list();
    const stats = await messagePersistence.getStats();

    return {
      isRunning,
      coordinatorName,
      workers: {
        total: workers.length,
        active: workers.filter((w) => w.status === WORKER_STATUS.ACTIVE).length,
        stale: workers.filter((w) => w.status === WORKER_STATUS.STALE).length,
        offline: workers.filter((w) => w.status === WORKER_STATUS.OFFLINE)
          .length,
      },
      messages: stats,
      circuitBreaker: {
        state: circuitBreaker.getState(),
        stats: circuitBreaker.getStats(),
      },
      config: {
        heartbeatIntervalMs: config.HEARTBEAT_INTERVAL_MS,
        staleThresholdMs: config.STALE_THRESHOLD_MS,
        retryMaxAttempts: config.RETRY_MAX_ATTEMPTS,
        deadLetterEnabled: config.DEAD_LETTER_ENABLED,
      },
    };
  }

  async function getTraceByTaskId(taskId) {
    const trace = taskTraces.get(taskId);
    if (trace) {
      const spans = await trace.getSpans();
      return {
        traceId: trace.id,
        spans,
      };
    }
    return null;
  }

  return {
    // Lifecycle
    start,
    stop,
    getStatus,

    // Worker management
    registerWorker,
    unregisterWorker,
    sendHeartbeat,

    // Task management
    claimTask,
    completeTask,
    failTask,

    // Message handling
    sendMessage,
    acknowledgeMessage,

    // Tracing
    getTraceByTaskId,

    // Access to sub-modules (for testing/customization)
    workerRegistry,
    messagePersistence,
    deadLetter,
    priorityQueue,
    taskClaim,
    circuitBreaker,

    // Constants
    MESSAGE_TYPES,
    MESSAGE_STATUS,
    WORKER_STATUS,
    PRIORITY,
    States,
    config,
  };
}

/**
 * Create and export a default coordinator instance
 */
export const coordinator = createParallelTaskCoordinator();

export default {
  createParallelTaskCoordinator,
  coordinator,
  config,
  getConfig,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  WORKER_STATUS,
  PRIORITY,
  States,
};
