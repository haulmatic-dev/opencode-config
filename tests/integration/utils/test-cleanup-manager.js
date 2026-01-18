/**
 * Test Cleanup Manager
 * Manages cleanup of test resources and handles graceful shutdown
 */

const cleanupFunctions = new Map();
const trackedResources = new Map();
const tempFiles = new Set();
let cleanupPerformed = false;

/**
 * Register a cleanup function to be called during cleanup
 * @param {Function} fn - Cleanup function to register
 * @returns {string} - Registration ID
 */
export function registerCleanup(fn) {
  const id = `cleanup_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  cleanupFunctions.set(id, fn);
  return id;
}

/**
 * Track a resource with its cleanup function
 * @param {string} resource - Resource identifier
 * @param {Function} cleanupFn - Function to clean up the resource
 */
export function track(resource, cleanupFn) {
  trackedResources.set(resource, cleanupFn);
}

/**
 * Register a temporary file for cleanup
 * @param {string} filePath - Path to temporary file
 */
export function registerTempFile(filePath) {
  tempFiles.add(filePath);
}

/**
 * Clean up all registered resources
 * @returns {Promise<void>}
 */
export async function cleanupAll() {
  if (cleanupPerformed) {
    return;
  }

  cleanupPerformed = true;

  const errors = [];

  for (const [resource, cleanupFn] of trackedResources) {
    try {
      await cleanupFn();
      trackedResources.delete(resource);
    } catch (error) {
      errors.push({ resource, error });
    }
  }

  for (const [id, fn] of cleanupFunctions) {
    try {
      await fn();
      cleanupFunctions.delete(id);
    } catch (error) {
      errors.push({ cleanupId: id, error });
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Cleanup failed with ${errors.length} error(s): ${errors.map((e) => e.error?.message || e.error).join(', ')}`,
    );
  }
}

/**
 * Clean up orphaned temporary files
 * @returns {Promise<string[]>} - List of removed file paths
 */
export async function cleanupOrphaned() {
  const removed = [];

  for (const filePath of tempFiles) {
    try {
      const { stat, unlink } = await import('fs/promises');
      try {
        await stat(filePath);
        await unlink(filePath);
        removed.push(filePath);
        tempFiles.delete(filePath);
      } catch {
        // File doesn't exist or already cleaned up
        tempFiles.delete(filePath);
      }
    } catch (error) {
      // Skip files that can't be accessed
    }
  }

  return removed;
}

/**
 * Handle process signals for graceful cleanup
 */
export function setupSignalHandlers() {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];

  for (const signal of signals) {
    process.on(signal, async () => {
      try {
        await cleanupAll();
        await cleanupOrphaned();
      } finally {
        process.exit(0);
      }
    });
  }
}

/**
 * Reset the cleanup manager state (useful for testing)
 */
export function reset() {
  cleanupPerformed = false;
}

/**
 * Check if cleanup has been performed
 * @returns {boolean}
 */
export function isCleanupPerformed() {
  return cleanupPerformed;
}

export default {
  registerCleanup,
  track,
  registerTempFile,
  cleanupAll,
  cleanupOrphaned,
  setupSignalHandlers,
  reset,
  isCleanupPerformed,
};
