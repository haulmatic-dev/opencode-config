import crypto from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COORDINATOR_CACHE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  '.cache',
  'opencode',
  'coordinator',
);
const STATE_FILE = path.join(COORDINATOR_CACHE_DIR, 'state.json');
const TASKS_DIR = path.join(COORDINATOR_CACHE_DIR, 'tasks');
const LOCK_FILE = path.join(COORDINATOR_CACHE_DIR, 'lock');

class FileBasedCoordinator {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || COORDINATOR_CACHE_DIR;
    this.stateFile = options.stateFile || STATE_FILE;
    this.tasksDir = options.tasksDir || TASKS_DIR;
    this.lockFile = options.lockFile || LOCK_FILE;
    this.isRunning = false;
    this.coordinatorId =
      options.coordinatorId || `file-coordinator-${Date.now()}`;
    this.lockHandle = null;
  }

  async ensureDirectories() {
    await fsPromises.mkdir(this.cacheDir, { recursive: true });
    await fsPromises.mkdir(this.tasksDir, { recursive: true });
  }

  async acquireLock() {
    if (this.lockHandle) {
      return this.lockHandle;
    }

    const lockDir = this.lockFile + '.d';
    await fsPromises.mkdir(lockDir, { recursive: true });

    const lockId = crypto.randomUUID();
    const lockPath = path.join(lockDir, lockId);

    const startTime = Date.now();
    const timeout = 30000;

    while (Date.now() - startTime < timeout) {
      try {
        await fsPromises.writeFile(
          lockPath,
          JSON.stringify({
            coordinatorId: this.coordinatorId,
            timestamp: Date.now(),
          }),
          { flag: 'wx' },
        );
        this.lockHandle = lockPath;
        return lockPath;
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    throw new Error('Failed to acquire lock within timeout');
  }

  async releaseLock() {
    if (this.lockHandle) {
      try {
        await fsPromises.unlink(this.lockHandle);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('Error releasing lock:', error.message);
        }
      }
      this.lockHandle = null;
    }
  }

  async readState() {
    try {
      const data = await fsPromises.readFile(this.stateFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { tasks: {}, claims: {}, mode: 'file', version: 1 };
      }
      throw error;
    }
  }

  async writeState(state) {
    const tempFile = this.stateFile + '.tmp';
    await fsPromises.writeFile(tempFile, JSON.stringify(state, null, 2));
    await fsPromises.rename(tempFile, this.stateFile);
  }

  async start() {
    await this.ensureDirectories();
    await this.acquireLock();
    this.isRunning = true;
    return this;
  }

  async stop() {
    this.isRunning = false;
    await this.releaseLock();
  }

  async claimTask(taskId, workerId, options = {}) {
    if (!this.isRunning) {
      throw new Error('Coordinator is not running');
    }

    await this.acquireLock();
    try {
      const state = await this.readState();

      if (state.claims[taskId]) {
        const claim = state.claims[taskId];
        if (claim.workerId !== workerId) {
          if (options.force) {
            state.claims[taskId] = {
              workerId,
              claimedAt: Date.now(),
              expiresAt: Date.now() + (options.ttl || 300000),
              ttl: options.ttl || 300000,
            };
            await this.writeState(state);
            return { success: true, forced: true, taskId };
          }
          return { success: false, reason: 'Task already claimed', taskId };
        }
        claim.expiresAt = Date.now() + (options.ttl || 300000);
        claim.ttl = options.ttl || 300000;
        await this.writeState(state);
        return { success: true, renewed: true, taskId };
      }

      const taskFile = path.join(this.tasksDir, `${taskId}.json`);
      let taskData = null;
      try {
        const taskContent = await fsPromises.readFile(taskFile, 'utf-8');
        taskData = JSON.parse(taskContent);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      state.claims[taskId] = {
        workerId,
        claimedAt: Date.now(),
        expiresAt: Date.now() + (options.ttl || 300000),
        ttl: options.ttl || 300000,
        taskData,
      };

      await this.writeState(state);
      return { success: true, taskId };
    } finally {
      await this.releaseLock();
    }
  }

  async releaseTask(taskId, workerId) {
    if (!this.isRunning) {
      throw new Error('Coordinator is not running');
    }

    await this.acquireLock();
    try {
      const state = await this.readState();

      if (!state.claims[taskId]) {
        return { success: false, reason: 'Task not claimed', taskId };
      }

      const claim = state.claims[taskId];
      if (claim.workerId !== workerId) {
        return {
          success: false,
          reason: 'Task claimed by different worker',
          taskId,
        };
      }

      delete state.claims[taskId];
      await this.writeState(state);
      return { success: true, taskId };
    } finally {
      await this.releaseLock();
    }
  }

  async getStatus() {
    await this.acquireLock();
    try {
      const state = await this.readState();
      const now = Date.now();

      const activeClaims = Object.entries(state.claims).filter(
        ([_, claim]) => claim.expiresAt > now,
      );

      return {
        isRunning: this.isRunning,
        coordinatorId: this.coordinatorId,
        coordinatorName: 'FileBasedCoordinator',
        mode: 'file',
        tasks: {
          total: Object.keys(state.tasks || {}).length,
          available:
            Object.keys(state.tasks || {}).length - activeClaims.length,
          claimed: activeClaims.length,
          expired: Object.keys(state.claims || {}).length - activeClaims.length,
        },
        claims: {
          total: Object.keys(state.claims || {}).length,
          active: activeClaims.length,
          expired: Object.keys(state.claims || {}).length - activeClaims.length,
        },
        configuration: {
          cacheDir: this.cacheDir,
          stateFile: this.stateFile,
        },
        serverAvailable: false,
        serverStatus: 'unavailable',
        fileBasedActive: true,
      };
    } finally {
      await this.releaseLock();
    }
  }

  async addTask(taskId, taskData) {
    if (!this.isRunning) {
      throw new Error('Coordinator is not running');
    }

    await this.acquireLock();
    try {
      const state = await this.readState();

      const taskFile = path.join(this.tasksDir, `${taskId}.json`);
      await fsPromises.writeFile(taskFile, JSON.stringify(taskData, null, 2));

      state.tasks = state.tasks || {};
      state.tasks[taskId] = {
        addedAt: Date.now(),
        data: taskData,
      };

      await this.writeState(state);
      return { success: true, taskId };
    } finally {
      await this.releaseLock();
    }
  }

  async getTask(taskId) {
    if (!this.isRunning) {
      throw new Error('Coordinator is not running');
    }

    const taskFile = path.join(this.tasksDir, `${taskId}.json`);
    try {
      const content = await fsPromises.readFile(taskFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async listTasks(options = {}) {
    if (!this.isRunning) {
      throw new Error('Coordinator is not running');
    }

    await this.acquireLock();
    try {
      const state = await this.readState();
      const now = Date.now();

      const tasks = [];
      for (const [taskId, taskInfo] of Object.entries(state.tasks || {})) {
        const claim = state.claims[taskId];
        const isClaimed = claim && claim.expiresAt > now;

        if (options.claimed !== undefined) {
          if (options.claimed && !isClaimed) continue;
          if (!options.claimed && isClaimed) continue;
        }

        tasks.push({
          taskId,
          addedAt: taskInfo.addedAt,
          isClaimed,
          claimedBy: isClaimed ? claim.workerId : null,
          claimExpiresAt: isClaimed ? claim.expiresAt : null,
        });
      }

      return tasks;
    } finally {
      await this.releaseLock();
    }
  }

  async cleanupExpiredClaims() {
    await this.acquireLock();
    try {
      const state = await this.readState();
      const now = Date.now();
      let cleaned = 0;

      for (const [taskId, claim] of Object.entries(state.claims || {})) {
        if (claim.expiresAt < now) {
          delete state.claims[taskId];
          cleaned++;
        }
      }

      if (cleaned > 0) {
        await this.writeState(state);
      }

      return cleaned;
    } finally {
      await this.releaseLock();
    }
  }
}

function createFileBasedCoordinator(options = {}) {
  return new FileBasedCoordinator(options);
}

export { FileBasedCoordinator, createFileBasedCoordinator };
export default FileBasedCoordinator;
