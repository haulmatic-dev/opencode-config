/**
 * Parallel Task Coordinator
 *
 * A comprehensive system for coordinating parallel task execution
 * using MCP Agent Mail infrastructure.
 *
 * @module parallel-task-coordinator
 */

// Acknowledgment tracking
export { createAcknowledgmentTracker } from './acknowledgment.js';
// Config (from config.js)
export {
  config as configObj,
  default as ptcConfig,
  getConfig,
} from './config.js';
// Core coordination (from coordination.js - includes getConfig)
export {
  config,
  coordinator,
  createParallelTaskCoordinator,
  MESSAGE_STATUS,
  MESSAGE_TYPES,
  PRIORITY,
  WORKER_STATUS,
} from './coordination.js';

// Dead letter handling
export { createDeadLetter } from './dead-letter.js';

// Heartbeat management
export { createHeartbeatManager } from './heartbeat.js';

// Message utilities
export {
  generateCorrelationId,
  generateMessageId,
  isValidMessageId,
  parseMessageId,
} from './message-ids.js';

// Message persistence
export { createMessagePersistence } from './message-persistence.js';

// Priority queue
export { createPriorityQueue } from './priority.js';

// Task reassignment
export { createTaskReassignment } from './reassignment.js';

// Retry logic
export { createRetryHandler } from './retry.js';

// Stale worker detection
export { createStaleDetector } from './stale-detection.js';

// Task claiming
export { createTaskClaim } from './task-claim.js';

// Worker management
export {
  createWorkerRegistry,
  WORKER_REGISTRY_EVENTS,
} from './worker-registry.js';
