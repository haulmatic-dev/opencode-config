import chokidar from 'chokidar';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';

/**
 * Manages hot-reloading of configuration files with validation and dual-config pattern.
 */
export class HotReloadManager extends EventEmitter {
  /**
   * @param {string} configPath - Path to the configuration file.
   * @param {Function} [validateFn] - Optional validation function that returns error message or null if valid.
   */
  constructor(configPath, validateFn = null) {
    super();
    this.configPath = path.resolve(configPath);
    this.validateFn = validateFn;
    this.currentConfig = null;
    this.pendingConfig = null;
    this.watcher = null;
    this.debounceTimer = null;
    this.debounceMs = 100;
  }

  /**
   * Loads the initial configuration from disk.
   * @returns {Promise<object>} The loaded configuration.
   */
  async loadConfig() {
    const raw = await fs.promises.readFile(this.configPath, 'utf-8');
    const config = JSON.parse(raw);
    const validationError = this.validateConfig(config);
    if (validationError) {
      throw new Error(`Invalid configuration: ${validationError}`);
    }
    this.currentConfig = config;
    return this.currentConfig;
  }

  /**
   * Starts watching the configuration file for changes.
   */
  startWatching() {
    if (this.watcher) {
      return;
    }
    this.watcher = chokidar.watch(this.configPath, { persistent: true });
    this.watcher.on('change', () => this.handleFileChange());
    this.watcher.on('error', (err) => {
      this.emit('error', err);
    });
  }

  /**
   * Stops watching the configuration file.
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Handles file change events with debouncing.
   */
  handleFileChange() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(async () => {
      try {
        const raw = await fs.promises.readFile(this.configPath, 'utf-8');
        const config = JSON.parse(raw);
        const validationError = this.validateConfig(config);
        if (validationError) {
          this.emit('config-invalid', validationError);
          return;
        }
        this.pendingConfig = config;
        const previousConfig = this.currentConfig;
        this.currentConfig = this.pendingConfig;
        this.pendingConfig = null;
        this.emit('change', {
          previous: previousConfig,
          current: this.currentConfig,
        });
      } catch (err) {
        this.emit('error', err);
      }
    }, this.debounceMs);
  }

  /**
   * Validates the configuration.
   * @param {object} config - Configuration object to validate.
   * @returns {string|null} Error message if invalid, null otherwise.
   */
  validateConfig(config) {
    if (typeof this.validateFn === 'function') {
      return this.validateFn(config);
    }
    return null;
  }

  /**
   * Manually triggers a reload of the configuration.
   * @returns {Promise<object>} The reloaded configuration.
   */
  async reload() {
    const raw = await fs.promises.readFile(this.configPath, 'utf-8');
    const config = JSON.parse(raw);
    const validationError = this.validateConfig(config);
    if (validationError) {
      throw new Error(`Invalid configuration: ${validationError}`);
    }
    const previousConfig = this.currentConfig;
    this.currentConfig = config;
    this.emit('change', {
      previous: previousConfig,
      current: this.currentConfig,
    });
    return this.currentConfig;
  }

  /**
   * Gets the current configuration.
   * @returns {object|null} The current configuration or null if not loaded.
   */
  getConfig() {
    return this.currentConfig;
  }
}

export default HotReloadManager;
