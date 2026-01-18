import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HotReloadManagerPath = path.resolve(
  __dirname,
  '../../lib/hot-reload-manager.js',
);
const { HotReloadManager } = await import(`file://${HotReloadManagerPath}`);

describe('HotReloadManager', () => {
  /** @type {string} */
  let tempDir;
  /** @type {string} */
  let configPath;
  /** @type {import('fs').Promises} */
  let fsPromises;

  beforeEach(async () => {
    tempDir = path.resolve(__dirname, '../temp-hot-reload-test-' + Date.now());
    await fs.promises.mkdir(tempDir, { recursive: true });
    configPath = path.join(tempDir, 'config.json');
    fsPromises = fs.promises;
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should initialize with config path', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      const manager = new HotReloadManager(configPath);
      expect(manager.configPath).toBe(path.resolve(configPath));
      expect(manager.currentConfig).toBeNull();
      expect(manager.pendingConfig).toBeNull();
    });

    it('should accept custom validation function', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      /** @param {object} c */
      const validateFn = (c) => (c.key ? null : 'Missing key');
      const manager = new HotReloadManager(configPath, validateFn);
      expect(manager.validateFn).toBe(validateFn);
    });
  });

  describe('loadConfig', () => {
    it('should load and return configuration', async () => {
      const testConfig = { database: { host: 'localhost', port: 5432 } };
      await fs.promises.writeFile(configPath, JSON.stringify(testConfig));
      const manager = new HotReloadManager(configPath);
      const loaded = await manager.loadConfig();
      expect(loaded).toEqual(testConfig);
      expect(manager.currentConfig).toEqual(testConfig);
    });

    it('should throw error for invalid JSON', async () => {
      await fs.promises.writeFile(configPath, '{invalid json}');
      const manager = new HotReloadManager(configPath);
      await expect(manager.loadConfig()).rejects.toThrow();
    });

    it('should throw error when validation fails', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      /** @param {object} c */
      const validateFn = () => 'Validation failed';
      const manager = new HotReloadManager(configPath, validateFn);
      await expect(manager.loadConfig()).rejects.toThrow(
        'Invalid configuration: Validation failed',
      );
    });
  });

  describe('file watching', () => {
    it('should start watching when startWatching is called', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      const manager = new HotReloadManager(configPath);
      manager.startWatching();
      expect(manager.watcher).not.toBeNull();
      manager.stopWatching();
    });

    it('should not create multiple watchers', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      const manager = new HotReloadManager(configPath);
      manager.startWatching();
      const firstWatcher = manager.watcher;
      manager.startWatching();
      expect(manager.watcher).toBe(firstWatcher);
      manager.stopWatching();
    });

    it('should stop watching and clear debounce timer', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      const manager = new HotReloadManager(configPath);
      manager.startWatching();
      manager.stopWatching();
      expect(manager.watcher).toBeNull();
      expect(manager.debounceTimer).toBeNull();
    });
  });

  describe('dual-config pattern', () => {
    it('should maintain currentConfig and pendingConfig', async () => {
      const initialConfig = { version: 1 };
      const updatedConfig = { version: 2 };
      await fs.promises.writeFile(configPath, JSON.stringify(initialConfig));
      const manager = new HotReloadManager(configPath);
      await manager.loadConfig();
      expect(manager.currentConfig).toEqual(initialConfig);
      expect(manager.pendingConfig).toBeNull();
      manager.pendingConfig = updatedConfig;
      expect(manager.pendingConfig).toEqual(updatedConfig);
      manager.currentConfig = manager.pendingConfig;
      manager.pendingConfig = null;
      expect(manager.currentConfig).toEqual(updatedConfig);
      expect(manager.pendingConfig).toBeNull();
    });

    it('should swap config on change after validation', async () => {
      const initialConfig = { count: 1 };
      const updatedConfig = { count: 2 };
      await fs.promises.writeFile(configPath, JSON.stringify(initialConfig));
      const manager = new HotReloadManager(configPath);
      await manager.loadConfig();
      const changeEvents = [];
      manager.on('change', (event) => changeEvents.push(event));
      await fs.promises.writeFile(configPath, JSON.stringify(updatedConfig));
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(changeEvents.length).toBeGreaterThanOrEqual(1);
      const lastEvent = changeEvents[changeEvents.length - 1];
      expect(lastEvent.previous).toEqual(initialConfig);
      expect(lastEvent.current).toEqual(updatedConfig);
      expect(manager.currentConfig).toEqual(updatedConfig);
    });
  });

  describe('validation before swap', () => {
    it('should emit config-invalid event when validation fails', async () => {
      const validConfig = { key: 'value' };
      const invalidConfig = { badKey: 'badValue' };
      await fs.promises.writeFile(configPath, JSON.stringify(validConfig));
      /** @param {object} c */
      const validateFn = (c) => (c.key ? null : 'Must have key property');
      const manager = new HotReloadManager(configPath, validateFn);
      await manager.loadConfig();
      const invalidEvents = [];
      manager.on('config-invalid', (error) => invalidEvents.push(error));
      await fs.promises.writeFile(configPath, JSON.stringify(invalidConfig));
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(invalidEvents.length).toBeGreaterThanOrEqual(1);
      expect(invalidEvents[0]).toBe('Must have key property');
    });

    it('should swap config only when validation passes', async () => {
      const validConfig = { count: 1 };
      const updatedConfig = { count: 100 };
      await fs.promises.writeFile(configPath, JSON.stringify(validConfig));
      /** @param {object} c */
      const validateFn = (c) => (c.count < 50 ? null : 'Count exceeds maximum');
      const manager = new HotReloadManager(configPath, validateFn);
      await manager.loadConfig();
      const changeEvents = [];
      const invalidEvents = [];
      manager.on('change', (event) => changeEvents.push(event));
      manager.on('config-invalid', (error) => invalidEvents.push(error));
      await fs.promises.writeFile(configPath, JSON.stringify(updatedConfig));
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(invalidEvents.length).toBeGreaterThanOrEqual(1);
      expect(changeEvents.length).toBe(0);
      expect(manager.currentConfig).toEqual(validConfig);
    });

    it('should allow valid config to swap', async () => {
      const validConfig = { count: 10 };
      const updatedConfig = { count: 20 };
      await fs.promises.writeFile(configPath, JSON.stringify(validConfig));
      /** @param {object} c */
      const validateFn = (c) => (c.count < 50 ? null : 'Count exceeds maximum');
      const manager = new HotReloadManager(configPath, validateFn);
      await manager.loadConfig();
      const changeEvents = [];
      manager.on('change', (event) => changeEvents.push(event));
      await fs.promises.writeFile(configPath, JSON.stringify(updatedConfig));
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(changeEvents.length).toBeGreaterThanOrEqual(1);
      expect(manager.currentConfig).toEqual(updatedConfig);
    });
  });

  describe('EventEmitter events', () => {
    it('should emit change event with previous and current config', async () => {
      const initialConfig = { setting: 'initial' };
      const updatedConfig = { setting: 'updated' };
      await fs.promises.writeFile(configPath, JSON.stringify(initialConfig));
      const manager = new HotReloadManager(configPath);
      await manager.loadConfig();
      /** @type {{ previous: object, current: object } | null} */
      let changeEvent = null;
      manager.on('change', (event) => {
        changeEvent = event;
      });
      await fs.promises.writeFile(configPath, JSON.stringify(updatedConfig));
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(changeEvent).not.toBeNull();
      expect(changeEvent.previous).toEqual(initialConfig);
      expect(changeEvent.current).toEqual(updatedConfig);
    });

    it('should emit error event on file read error', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      const manager = new HotReloadManager(configPath);
      manager.startWatching();
      /** @type {Error | null} */
      let errorEvent = null;
      manager.on('error', (err) => {
        errorEvent = err;
      });
      await fs.promises.unlink(configPath);
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(errorEvent).not.toBeNull();
      manager.stopWatching();
    });

    it('should emit config-invalid event with validation error message', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      /** @param {object} c */
      const validateFn = () => 'Custom validation error';
      const manager = new HotReloadManager(configPath, validateFn);
      await manager.loadConfig();
      /** @type {string | null} */
      let invalidEvent = null;
      manager.on('config-invalid', (error) => {
        invalidEvent = error;
      });
      await fs.promises.writeFile(configPath, JSON.stringify({ bad: 'data' }));
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(invalidEvent).toBe('Custom validation error');
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      await fs.promises.writeFile(configPath, 'not valid json');
      const manager = new HotReloadManager(configPath);
      /** @type {Error | null} */
      let errorEvent = null;
      manager.on('error', (err) => {
        errorEvent = err;
      });
      manager.startWatching();
      await fs.promises.writeFile(configPath, '{also invalid: json');
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(errorEvent).not.toBeNull();
      expect(errorEvent.message).toContain('Unexpected token');
      manager.stopWatching();
    });

    it('should throw on invalid config during reload', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      /** @param {object} c */
      const validateFn = () => 'Reload validation failed';
      const manager = new HotReloadManager(configPath, validateFn);
      await manager.loadConfig();
      await expect(manager.reload()).rejects.toThrow(
        'Invalid configuration: Reload validation failed',
      );
    });

    it('should handle multiple rapid changes with debouncing', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ version: 1 }));
      const manager = new HotReloadManager(configPath);
      await manager.loadConfig();
      const changeEvents = [];
      manager.on('change', (event) => changeEvents.push(event));
      manager.startWatching();
      for (let i = 2; i <= 5; i++) {
        await fs.promises.writeFile(configPath, JSON.stringify({ version: i }));
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(changeEvents.length).toBeGreaterThanOrEqual(1);
      manager.stopWatching();
    });
  });

  describe('reload', () => {
    it('should manually trigger reload and emit change event', async () => {
      const config = { setting: 'test' };
      await fs.promises.writeFile(configPath, JSON.stringify(config));
      const manager = new HotReloadManager(configPath);
      await manager.loadConfig();
      /** @type {{ previous: object, current: object } | null} */
      let changeEvent = null;
      manager.on('change', (event) => {
        changeEvent = event;
      });
      const reloaded = await manager.reload();
      expect(reloaded).toEqual(config);
      expect(changeEvent).not.toBeNull();
      expect(changeEvent.previous).toEqual(config);
      expect(changeEvent.current).toEqual(config);
    });

    it('should update currentConfig on reload', async () => {
      const config = { value: 123 };
      await fs.promises.writeFile(configPath, JSON.stringify(config));
      const manager = new HotReloadManager(configPath);
      await manager.loadConfig();
      const updated = await manager.reload();
      expect(manager.currentConfig).toEqual(updated);
    });
  });

  describe('getConfig', () => {
    it('should return null before config is loaded', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ key: 'value' }));
      const manager = new HotReloadManager(configPath);
      expect(manager.getConfig()).toBeNull();
    });

    it('should return loaded config', async () => {
      const config = { key: 'value' };
      await fs.promises.writeFile(configPath, JSON.stringify(config));
      const manager = new HotReloadManager(configPath);
      await manager.loadConfig();
      expect(manager.getConfig()).toEqual(config);
    });
  });
});
