/**
 * @fileoverview Circuit Breaker Pattern Implementation
 * @module lib/circuit-breaker
 */

/**
 * @typedef {('CLOSED' | 'OPEN' | 'HALF_OPEN')} CircuitState
 */

/**
 * @typedef {Object} CircuitStats
 * @property {number} failureCount - Number of consecutive failures
 * @property {number} successCount - Number of successful calls in HALF_OPEN state
 * @property {Date|null} lastFailure - Timestamp of the last failure
 */

/**
 * @typedef {Object} CircuitBreakerOptions
 * @property {number} [failureThreshold=5] - Number of failures before opening circuit
 * @property {number} [resetTimeout=30000] - Time in ms before attempting half-open state
 * @property {number} [halfOpenCalls=3] - Number of calls allowed in half-open state
 */

export const States = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

/**
 * CircuitBreaker class implementing the circuit breaker pattern
 */
export class CircuitBreaker {
  /**
   * @param {CircuitBreakerOptions} [options={}]
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.halfOpenCalls = options.halfOpenCalls ?? 3;

    this.state = States.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailure = null;
    this.halfOpenAttemptedCalls = 0;
    this.openedAt = null;
  }

  /**
   * Executes the provided function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Result of the function call
   * @throws {Error} If circuit is open or function throws
   */
  async execute(fn) {
    if (this.state === States.OPEN) {
      const now = Date.now();
      if (now - this.openedAt >= this.resetTimeout) {
        this._transitionTo(States.HALF_OPEN);
      } else {
        throw new Error('Circuit is open');
      }
    }

    if (this.state === States.HALF_OPEN) {
      if (this.halfOpenAttemptedCalls >= this.halfOpenCalls) {
        throw new Error('Circuit is half-open and call limit reached');
      }
      this.halfOpenAttemptedCalls++;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  /**
   * Gets the current state of the circuit breaker
   * @returns {CircuitState} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Gets current statistics of the circuit breaker
   * @returns {CircuitStats} Current statistics
   */
  getStats() {
    return {
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailure: this.lastFailure,
    };
  }

  /**
   * Transitions to a new state and handles state-specific logic
   * @param {CircuitState} newState - State to transition to
   * @private
   */
  _transitionTo(newState) {
    this.state = newState;

    if (newState === States.OPEN) {
      this.openedAt = Date.now();
    } else if (newState === States.HALF_OPEN) {
      this.halfOpenAttemptedCalls = 0;
      this.successCount = 0;
    } else if (newState === States.CLOSED) {
      this.failureCount = 0;
      this.openedAt = null;
    }
  }

  /**
   * Handles successful execution
   * @private
   */
  _onSuccess() {
    if (this.state === States.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenCalls) {
        this._transitionTo(States.CLOSED);
      }
    } else if (this.state === States.CLOSED) {
      this.failureCount = 0;
    }
  }

  /**
   * Handles failed execution
   * @param {Error} error - The error that occurred
   * @private
   */
  _onFailure(error) {
    this.lastFailure = new Date();

    if (this.state === States.HALF_OPEN) {
      this._transitionTo(States.OPEN);
    } else if (this.state === States.CLOSED) {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this._transitionTo(States.OPEN);
      }
    }
  }
}

export default CircuitBreaker;
