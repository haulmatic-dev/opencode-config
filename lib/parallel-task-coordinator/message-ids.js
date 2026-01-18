/**
 * Message ID Generator
 *
 * Generates unique message IDs with optional prefixing.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Message ID generator options
 */
const options = {
  prefix: '',
  includeTimestamp: false,
  includeRandom: true,
};

/**
 * Set generator options
 * @param {object} opts - Options to set
 */
export function setOptions(opts) {
  Object.assign(options, opts);
}

/**
 * Generate a unique message ID
 * @param {object} [opts] - Generation options
 * @returns {string} Unique message ID
 */
export function generateMessageId(opts = {}) {
  const {
    prefix = options.prefix,
    includeTimestamp = options.includeTimestamp,
    includeRandom = options.includeRandom,
  } = opts;

  const parts = [];

  if (prefix) {
    parts.push(prefix);
  }

  if (includeTimestamp) {
    parts.push(Date.now().toString(36));
  }

  if (includeRandom) {
    parts.push(uuidv4().replace(/-/g, '').substring(0, 8));
  } else {
    parts.push(uuidv4());
  }

  return parts.join('-');
}

/**
 * Generate a correlation ID for request/response tracing
 * @returns {string} Correlation ID
 */
export function generateCorrelationId() {
  return `corr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parse a message ID to extract components
 * @param {string} messageId - Message ID to parse
 * @returns {object} Parsed components
 */
export function parseMessageId(messageId) {
  const parts = messageId.split('-');

  return {
    prefix: parts[0] || null,
    timestamp: parts[1] || null,
    random: parts.slice(2).join('-') || null,
    original: messageId,
  };
}

/**
 * Validate a message ID format
 * @param {string} messageId - Message ID to validate
 * @returns {boolean} True if valid
 */
export function isValidMessageId(messageId) {
  if (!messageId || typeof messageId !== 'string') {
    return false;
  }

  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(messageId)) {
    return true;
  }

  // Check for prefixed format
  if (messageId.includes('-')) {
    return true;
  }

  return false;
}

export default {
  generateMessageId,
  generateCorrelationId,
  parseMessageId,
  isValidMessageId,
  setOptions,
};
