/**
 * Parallel Agent Spawn Middleware
 * 
 * Shared middleware for spawning headless opencode workers via PM2 or subprocess.
 * Provides a unified API for agent orchestration and worker lifecycle management.
 * 
 * @module parallel-agent-middleware
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs').promises;

class WorkerManager {
  constructor(options = {}) {
    this.workers = new Map();
    this.mode = options.mode || 'subprocess'; // 'pm2' or 'subprocess'
    this.maxWorkers = options.maxWorkers || 6;
    this.defaultTimeout = options.defaultTimeout || 600000; // 10 minutes
    this.maxRetries = options.maxRetries || 3;
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.eventListeners = new Map();
  }

  spawn_headless_worker({ agent_type, task_id, task_description, timeout, retry_count = 0 }) {
    return new Promise(async (resolve, reject) => {
      const worker_id = `${agent_type}-${task_id}-${Date.now()}`;
      const workerTimeout = timeout || this.defaultTimeout;

      const worker = {
        id: worker_id,
        agent_type,
        task_id,
        task_description,
        pid: null,
        status: 'pending',
        started_at: null,
        completed_at: null,
        exit_code: null,
        memory_usage: 0,
        timeout: workerTimeout,
        retry_count,
        process: null
      };

      try {
        await fs.mkdir(this.logDir, { recursive: true });

        const logFile = path.join(this.logDir, `${worker_id}.log`);
        const errFile = path.join(this.logDir, `${worker_id}.err`);

        const worker_process = spawn('opencode', [
          '--agent', agent_type,
          '--task', task_id,
          '--description', task_description,
          '--headless',
          '--timeout', workerTimeout.toString()
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false
        });

        worker.pid = worker_process.pid;
        worker.process = worker_process;
        worker.status = 'running';
        worker.started_at = Date.now();

        const logStream = await fs.open(logFile, 'w');
        const errStream = await fs.open(errFile, 'w');

        worker_process.stdout.pipe(logStream.createWriteStream());
        worker_process.stderr.pipe(errStream.createWriteStream());

        worker_process.on('close', (code, signal) => {
          worker.exit_code = code;
          worker.completed_at = Date.now();
          worker.status = code === 0 ? 'completed' : 'failed';
          worker.process = null;
          this.emit('worker_complete', worker);
          resolve(worker);
        });

        worker_process.on('error', (error) => {
          worker.status = 'failed';
          worker.completed_at = Date.now();
          worker.error = error;
          worker.process = null;
          this.emit('worker_error', worker);
          reject(error);
        });

        const timeoutTimer = setTimeout(() => {
          if (worker.status === 'running') {
            worker_process.kill('SIGTERM');
            worker.status = 'timeout';
            worker.completed_at = Date.now();
            worker.process = null;
            this.emit('worker_timeout', worker);
            resolve(worker);
          }
        }, workerTimeout);

        worker.timeout_timer = timeoutTimer;
        this.workers.set(worker_id, worker);
        this.emit('worker_started', worker);
        resolve(worker);

      } catch (error) {
        worker.status = 'failed';
        worker.completed_at = Date.now();
        worker.error = error;
        this.emit('worker_error', worker);
        reject(error);
      }
    });
  }

  wait_for_completion(worker_or_workers, timeout) {
    const workers = Array.isArray(worker_or_workers) ? worker_or_workers : [worker_or_workers];
    const maxTimeout = timeout || Math.max(...workers.map(w => w.timeout));
    
    return Promise.allSettled(workers.map(worker => {
      return new Promise((resolve, reject) => {
        if (worker.status === 'completed' || worker.status === 'failed' || worker.status === 'timeout') {
          resolve(worker);
          return;
        }

        const checkInterval = setInterval(() => {
          if (worker.status === 'completed' || worker.status === 'failed' || worker.status === 'timeout') {
            clearInterval(checkInterval);
            resolve(worker);
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (worker.status === 'running') {
            worker.status = 'timeout';
            worker.completed_at = Date.now();
            if (worker.process) {
              worker.process.kill('SIGTERM');
            }
            resolve(worker);
          }
        }, maxTimeout);
      });
    }));
  }

  monitor_workers(pollInterval = 5000) {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.monitorInterval = setInterval(() => {
      for (const [worker_id, worker] of this.workers) {
        if (worker.status !== 'running' || !worker.process) continue;

        try {
          const memory_usage = process.memoryUsage();
          worker.memory_usage = memory_usage.heapUsed / 1024 / 1024; // MB

          if (worker.memory_usage > 1000) { // 1GB limit
            this.emit('worker_memory_warning', worker);
          }

        } catch (error) {
          this.emit('worker_monitor_error', { worker_id, error });
        }
      }
    }, pollInterval);

    this.emit('monitor_started');
  }

  cleanup_workers(worker_ids) {
    const workers_to_cleanup = worker_ids 
      ? worker_ids.map(id => this.workers.get(id)).filter(w => w)
      : Array.from(this.workers.values()).filter(w => 
          w.status !== 'running' && w.status !== 'pending'
        );

    const cleanup_results = [];

    for (const worker of workers_to_cleanup) {
      if (worker.timeout_timer) {
        clearTimeout(worker.timeout_timer);
      }

      if (worker.process && worker.status === 'running') {
        try {
          process.kill(worker.pid, 'SIGTERM');
          
          setTimeout(() => {
            try {
              process.kill(worker.pid, 'SIGKILL');
            } catch (error) {
            }
          }, 5000);

        } catch (error) {
          this.emit('cleanup_error', { worker, error });
        }
      }

      this.workers.delete(worker.id);
      cleanup_results.push({ worker_id: worker.id, success: true });
      this.emit('worker_cleaned_up', worker);
    }

    return cleanup_results;
  }

  get_worker_status(worker_id) {
    const worker = this.workers.get(worker_id);
    if (!worker) {
      return null;
    }

    return {
      id: worker.id,
      status: worker.status,
      pid: worker.pid,
      exit_code: worker.exit_code,
      memory_usage: worker.memory_usage,
      started_at: worker.started_at,
      completed_at: worker.completed_at,
      uptime: worker.started_at ? Date.now() - worker.started_at : null,
      agent_type: worker.agent_type,
      task_id: worker.task_id,
      retry_count: worker.retry_count
    };
  }

  get_all_workers_status() {
    return Array.from(this.workers.values()).map(worker => this.get_worker_status(worker.id));
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  async spawn_parallel_workers(workers_config) {
    if (workers_config.length > this.maxWorkers) {
      throw new Error(`Cannot spawn ${workers_config.length} workers. Maximum is ${this.maxWorkers}`);
    }

    const workers = [];
    for (const config of workers_config) {
      try {
        const worker = await this.spawn_headless_worker(config);
        workers.push(worker);
      } catch (error) {
        this.emit('spawn_error', { config, error });
        throw error;
      }
    }

    return workers;
  }

  async shutdown() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    const running_workers = Array.from(this.workers.values())
      .filter(w => w.status === 'running');

    for (const worker of running_workers) {
      if (worker.process) {
        try {
          process.kill(worker.pid, 'SIGTERM');
          setTimeout(() => {
            try {
              process.kill(worker.pid, 'SIGKILL');
            } catch (error) {
            }
          }, 5000);
        } catch (error) {
        }
      }
    }

    this.workers.clear();
    this.eventListeners.clear();
    this.emit('shutdown_complete');
  }
}

module.exports = WorkerManager;
