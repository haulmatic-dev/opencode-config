/**
 * Worker Registry
 *
 * Tracks registered workers, their metadata, and heartbeats.
 * Enables detection of stale/offline workers.
 */

import { v4 as uuidv4 } from 'uuid';
import config, { WORKER_STATUS } from './config.js';

export const WORKER_REGISTRY_EVENTS = {
  REGISTERED: 'registered',
  UNREGISTERED: 'unregistered',
  HEARTBEAT_RECEIVED: 'heartbeat_received',
  MARKED_STALE: 'marked_stale',
  MARKED_ACTIVE: 'marked_active',
};

/**
 * Create a worker registry instance
 * @param {object} options - Registry options
 * @returns {object} Worker registry instance
 */
export function createWorkerRegistry(options = {}) {
  const {
    storagePath = `${process.env.HOME}/.mcp-agent-mail/workers.db`,
    logger = console,
  } = options;

  let db = null;
  const workers = new Map();
  const eventListeners = new Map();

  /**
   * Initialize the registry
   * @returns {Promise<void>}
   */
  async function initialize() {
    const { default: sqlite3 } = await import('better-sqlite3');

    db = new sqlite3(storagePath);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pid INTEGER,
        instance TEXT,
        capabilities TEXT,
        status TEXT DEFAULT 'registered',
        last_heartbeat INTEGER,
        registered_at INTEGER DEFAULT (unixepoch()),
        metadata TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
      CREATE INDEX IF NOT EXISTS idx_workers_last_heartbeat ON workers(last_heartbeat);
    `);

    // Load existing workers from DB
    const stmt = db.prepare('SELECT * FROM workers');
    const rows = stmt.all();

    for (const row of rows) {
      workers.set(row.id, {
        id: row.id,
        name: row.name,
        pid: row.pid,
        instance: row.instance,
        capabilities: JSON.parse(row.capabilities || '[]'),
        status: row.status,
        lastHeartbeat: row.last_heartbeat,
        registeredAt: row.registered_at,
        metadata: JSON.parse(row.metadata || '{}'),
      });
    }

    logger.info(`[WorkerRegistry] Initialized with ${workers.size} workers`);
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  function emit(event, data) {
    const listeners = eventListeners.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        logger.error(`[WorkerRegistry] Event listener error for ${event}`, {
          error,
        });
      }
    }
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  function on(event, callback) {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, []);
    }
    eventListeners.get(event).push(callback);
  }

  /**
   * Register a worker
   * @param {string} workerId - Unique worker identifier
   * @param {object} metadata - Worker metadata
   * @returns {Promise<object>} Registration result
   */
  async function register(workerId, metadata = {}) {
    const now = Date.now();

    const worker = {
      id: workerId,
      name: metadata.name || workerId,
      pid: metadata.pid || null,
      instance: metadata.instance || null,
      capabilities: metadata.capabilities || [],
      status: WORKER_STATUS.ACTIVE,
      lastHeartbeat: now,
      registeredAt: now,
      metadata: metadata.metadata || {},
    };

    // Upsert into database
    const stmt = db.prepare(`
      INSERT INTO workers (id, name, pid, instance, capabilities, status, last_heartbeat, registered_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        pid = excluded.pid,
        instance = excluded.instance,
        capabilities = excluded.capabilities,
        status = excluded.status,
        last_heartbeat = excluded.last_heartbeat,
        metadata = excluded.metadata
    `);

    stmt.run(
      worker.id,
      worker.name,
      worker.pid,
      worker.instance,
      JSON.stringify(worker.capabilities),
      worker.status,
      worker.lastHeartbeat,
      worker.registeredAt,
      JSON.stringify(worker.metadata),
    );

    workers.set(workerId, worker);

    emit(WORKER_REGISTRY_EVENTS.REGISTERED, { worker });

    return { success: true, worker };
  }

  /**
   * Unregister a worker
   * @param {string} workerId - Worker ID to unregister
   * @returns {Promise<object>} Unregistration result
   */
  async function unregister(workerId) {
    const worker = workers.get(workerId);

    if (!worker) {
      return { success: false, error: 'worker_not_found' };
    }

    const stmt = db.prepare('DELETE FROM workers WHERE id = ?');
    stmt.run(workerId);

    workers.delete(workerId);

    emit(WORKER_REGISTRY_EVENTS.UNREGISTERED, { workerId });

    return { success: true };
  }

  /**
   * Update worker heartbeat
   * @param {string} workerId - Worker ID
   * @returns {Promise<object>} Update result
   */
  async function updateHeartbeat(workerId) {
    const worker = workers.get(workerId);

    if (!worker) {
      return { success: false, error: 'worker_not_found' };
    }

    const now = Date.now();

    const stmt = db.prepare(`
      UPDATE workers 
      SET last_heartbeat = ?, status = 'active'
      WHERE id = ?
    `);

    stmt.run(now, workerId);

    worker.lastHeartbeat = now;
    worker.status = WORKER_STATUS.ACTIVE;
    workers.set(workerId, worker);

    emit(WORKER_REGISTRY_EVENTS.HEARTBEAT_RECEIVED, { workerId });

    return { success: true };
  }

  /**
   * Update worker status
   * @param {string} workerId - Worker ID
   * @param {string} status - New status
   * @returns {Promise<object>} Update result
   */
  async function updateStatus(workerId, status) {
    const worker = workers.get(workerId);

    if (!worker) {
      return { success: false, error: 'worker_not_found' };
    }

    const stmt = db.prepare('UPDATE workers SET status = ? WHERE id = ?');
    stmt.run(status, workerId);

    worker.status = status;
    workers.set(workerId, worker);

    emit(
      status === WORKER_STATUS.STALE
        ? WORKER_REGISTRY_EVENTS.MARKED_STALE
        : WORKER_REGISTRY_EVENTS.MARKED_ACTIVE,
      { workerId, status },
    );

    return { success: true };
  }

  /**
   * Find stale workers (no heartbeat within threshold)
   * @param {number} thresholdMs - Time threshold in milliseconds
   * @returns {Promise<Array>} List of stale workers
   */
  async function findStaleWorkers(thresholdMs) {
    const cutoff = Date.now() - thresholdMs;

    const stmt = db.prepare(`
      SELECT * FROM workers 
      WHERE status = 'active' AND last_heartbeat < ?
    `);

    const rows = stmt.all(cutoff);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      pid: row.pid,
      instance: row.instance,
      capabilities: JSON.parse(row.capabilities || '[]'),
      status: row.status,
      lastHeartbeat: row.last_heartbeat,
      registeredAt: row.registered_at,
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  }

  /**
   * Get a worker by ID
   * @param {string} workerId - Worker ID
   * @returns {Promise<object|null>} Worker or null
   */
  async function get(workerId) {
    return workers.get(workerId) || null;
  }

  /**
   * List all workers
   * @param {object} [filter] - Optional filter
   * @returns {Promise<Array>} List of workers
   */
  async function list(filter = {}) {
    let result = Array.from(workers.values());

    if (filter.status) {
      result = result.filter((w) => w.status === filter.status);
    }

    return result;
  }

  /**
   * Get worker count by status
   * @returns {Promise<object>} Counts by status
   */
  async function getCounts() {
    const counts = {
      [WORKER_STATUS.REGISTERED]: 0,
      [WORKER_STATUS.ACTIVE]: 0,
      [WORKER_STATUS.STALE]: 0,
      [WORKER_STATUS.OFFLINE]: 0,
    };

    for (const worker of workers.values()) {
      counts[worker.status] = (counts[worker.status] || 0) + 1;
    }

    return counts;
  }

  /**
   * Close the registry
   * @returns {Promise<void>}
   */
  async function close() {
    if (db) {
      db.close();
      db = null;
    }
    workers.clear();
  }

  return {
    initialize,
    register,
    unregister,
    updateHeartbeat,
    updateStatus,
    findStaleWorkers,
    get,
    list,
    getCounts,
    on,
    close,
  };
}

export default createWorkerRegistry;
