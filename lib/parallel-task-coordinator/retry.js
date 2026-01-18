/**
 * Retry Logic
 *
 * Implements exponential backoff retry with jitter.
 */

import config from './config.js';

/**
 * Create a retry handler
 * @param {object} options - Options
 * @returns {object} Retry handler instance
 */
export function createRetryHandler(options = {}) {
  const {
    maxAttempts = config.RETRY_MAX_ATTEMPTS,
    backoffMs = config.RETRY_BACKOFF_MS,
    maxBackoffMs = 30000,
    jitterFactor = 0.2, // 20% jitter
    logger = console,
  } = options;

  const retryHistory = [];

  /**
   * Calculate backoff delay for a given attempt
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  function calculateBackoff(attempt) {
    const baseDelay = backoffMs[attempt] || backoffMs[backoffMs.length - 1];

    // Apply exponential increase beyond configured delays
    const exponentialMultiplier = 2 ** (attempt - (backoffMs.length - 1));
    const adjustedDelay =
      attempt >= backoffMs.length
        ? baseDelay * exponentialMultiplier
        : baseDelay;

    // Cap at max backoff
    const cappedDelay = Math.min(adjustedDelay, maxBackoffMs);

    // Add jitter
    const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);

    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Check if should retry based on attempt count
   * @param {number} attempt - Current attempt
   * @returns {boolean} True if should retry
   */
  function shouldRetry(attempt) {
    return attempt < maxAttempts;
  }

  /**
   * Execute a function with retry
   * @param {Function} fn - Async function to execute
   * @param {object} options - Retry options
   * @returns {Promise<object>} Retry result
   */
  async function execute(fn, options = {}) {
    const { onRetry, onSuccess, onFinalError, context = {} } = options;

    let lastError = null;
    let attempt = 0;
    const startTime = Date.now();

    while (shouldRetry(attempt)) {
      try {
        const result = await fn(attempt);

        const retryEntry = {
          context,
          attempt: attempt + 1,
          success: true,
          durationMs: Date.now() - startTime,
          timestamp: Date.now(),
        };

        retryHistory.push(retryEntry);

        if (onSuccess) {
          try {
            await onSuccess(result, retryEntry);
          } catch (error) {
            logger.error('[Retry] onSuccess error', { error });
          }
        }

        return {
          success: true,
          result,
          attempts: attempt + 1,
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error;

        const retryEntry = {
          context,
          attempt: attempt + 1,
          success: false,
          error: error.message,
          durationMs: Date.now() - startTime,
          timestamp: Date.now(),
        };

        retryHistory.push(retryEntry);

        if (attempt < maxAttempts - 1) {
          const delay = calculateBackoff(attempt);

          logger.debug(
            `[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms`,
            {
              error: error.message,
            },
          );

          if (onRetry) {
            try {
              await onRetry(error, attempt, delay);
            } catch (retryError) {
              logger.error('[Retry] onRetry error', { error: retryError });
            }
          }

          await sleep(delay);
        }

        attempt++;
      }
    }

    // Final failure
    const finalResult = {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: attempt,
      durationMs: Date.now() - startTime,
      maxAttempts,
    };

    if (onFinalError) {
      try {
        await onFinalError(finalResult);
      } catch (error) {
        logger.error('[Retry] onFinalError error', { error });
      }
    }

    logger.warn(`[Retry] All ${attempt} attempts failed`, {
      error: finalResult.error,
    });

    return finalResult;
  }

  /**
   * Sleep for a given duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry history
   * @param {object} [filter] - Query options
   * @returns {Array} History entries
   */
  function getHistory(filter = {}) {
    let history = retryHistory;

    if (filter.context) {
      // Filter by context keys
      for (const [key, value] of Object.entries(filter.context)) {
        history = history.filter((h) => h.context[key] === value);
      }
    }

    if (filter.success !== undefined) {
      history = history.filter((h) => h.success === filter.success);
    }

    if (filter.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * Get retry statistics
   * @returns {object} Statistics
   */
  function getStats() {
    const total = retryHistory.length;
    const successful = retryHistory.filter((h) => h.success).length;
    const failed = total - successful;

    const attemptsBySuccess = retryHistory.reduce((acc, h) => {
      const key = h.success ? 'success' : 'failed';
      if (!acc[key]) acc[key] = [];
      acc[key].push(h.attempt);
      return acc;
    }, {});

    const avgAttemptsSuccess = attemptsBySuccess.success?.length
      ? attemptsBySuccess.success.reduce((a, b) => a + b, 0) /
        attemptsBySuccess.success.length
      : 0;

    const avgAttemptsFailed = attemptsBySuccess.failed?.length
      ? attemptsBySuccess.failed.reduce((a, b) => a + b, 0) /
        attemptsBySuccess.failed.length
      : 0;

    return {
      total,
      successful,
      failed,
      successRate:
        total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : 'N/A',
      avgAttemptsOnSuccess: avgAttemptsSuccess.toFixed(2),
      avgAttemptsOnFailed: avgAttemptsFailed.toFixed(2),
    };
  }

  /**
   * Clear retry history
   * @returns {object} Clear result
   */
  function clearHistory() {
    const count = retryHistory.length;
    retryHistory.length = 0;

    return { cleared: count };
  }

  /**
   * Close the retry handler
   * @returns {Promise<void>}
   */
  async function close() {
    clearHistory();
  }

  return {
    execute,
    calculateBackoff,
    shouldRetry,
    getHistory,
    getStats,
    clearHistory,
    close,
  };
}

export default createRetryHandler;
