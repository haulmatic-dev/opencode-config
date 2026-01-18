import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.resolve(__dirname, '../../config/gates.json');

const DEFAULTS = {
  gates: {
    timeout: 300000,
    failOnMissingTools: true,
    continueOnError: false,
  },
  thresholds: {
    mutation: 80,
    coverage: 80,
    maxDuration: 600000,
  },
  testPatterns: [
    '**/*.test.js',
    '**/*.spec.js',
    '**/tests/**/*.js',
    '**/__tests__/**/*.js',
  ],
  ignorePatterns: [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    'coverage/**',
  ],
};

const ENV_OVERRIDES = {
  GATES_TIMEOUT: 'gates.timeout',
  GATES_FAIL_ON_MISSING_TOOLS: 'gates.failOnMissingTools',
  GATES_CONTINUE_ON_ERROR: 'gates.continueOnError',
  GATES_THRESHOLD_MUTATION: 'thresholds.mutation',
  GATES_THRESHOLD_COVERAGE: 'thresholds.coverage',
  GATES_THRESHOLD_MAX_DURATION: 'thresholds.maxDuration',
};

function validateConfig(config) {
  const errors = [];

  if (config.gates) {
    if (typeof config.gates.timeout !== 'number' || config.gates.timeout < 0) {
      errors.push('gates.timeout must be a non-negative number');
    }
    if (typeof config.gates.failOnMissingTools !== 'boolean') {
      errors.push('gates.failOnMissingTools must be a boolean');
    }
    if (typeof config.gates.continueOnError !== 'boolean') {
      errors.push('gates.continueOnError must be a boolean');
    }
  }

  if (config.thresholds) {
    if (
      typeof config.thresholds.mutation !== 'number' ||
      config.thresholds.mutation < 0 ||
      config.thresholds.mutation > 100
    ) {
      errors.push('thresholds.mutation must be a number between 0 and 100');
    }
    if (
      typeof config.thresholds.coverage !== 'number' ||
      config.thresholds.coverage < 0 ||
      config.thresholds.coverage > 100
    ) {
      errors.push('thresholds.coverage must be a number between 0 and 100');
    }
    if (
      typeof config.thresholds.maxDuration !== 'number' ||
      config.thresholds.maxDuration < 0
    ) {
      errors.push('thresholds.maxDuration must be a non-negative number');
    }
  }

  if (config.testPatterns && !Array.isArray(config.testPatterns)) {
    errors.push('testPatterns must be an array');
  }

  if (config.ignorePatterns && !Array.isArray(config.ignorePatterns)) {
    errors.push('ignorePatterns must be an array');
  }

  return errors;
}

function applyEnvOverrides(config) {
  for (const [envKey, configPath] of Object.entries(ENV_OVERRIDES)) {
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      const keys = configPath.split('.');
      let current = config;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      const finalKey = keys[keys.length - 1];
      if (finalKey === 'failOnMissingTools' || finalKey === 'continueOnError') {
        current[finalKey] = envValue === 'true' || envValue === '1';
      } else if (typeof current[finalKey] === 'number') {
        current[finalKey] = parseFloat(envValue);
      } else {
        current[finalKey] = envValue;
      }
    }
  }
  return config;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (Array.isArray(source[key])) {
      result[key] = [...source[key]];
    } else if (
      source[key] instanceof Object &&
      key in target &&
      target[key] instanceof Object
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

let cachedConfig = null;
let configLoadError = null;

export function loadConfig() {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  try {
    let config = { ...DEFAULTS };

    if (fs.existsSync(CONFIG_PATH)) {
      const fileContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const fileConfig = JSON.parse(fileContent);
      config = deepMerge(config, fileConfig);
    }

    config = applyEnvOverrides(config);

    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      configLoadError = new Error(
        `Configuration validation failed: ${validationErrors.join('; ')}`,
      );
      console.warn(`[Config] Warning: ${configLoadError.message}`);
    }

    cachedConfig = config;
    return cachedConfig;
  } catch (error) {
    configLoadError = error;
    console.warn(
      `[Config] Warning: Failed to load config, using defaults: ${error.message}`,
    );
    cachedConfig = DEFAULTS;
    return cachedConfig;
  }
}

export function getConfig() {
  const { config } = loadConfig();
  return config;
}

export function getGatesConfig() {
  const config = getConfig();
  return config.gates;
}

export function getThresholds() {
  const config = getConfig();
  return config.thresholds;
}

export function getTestPatterns() {
  const config = getConfig();
  return config.testPatterns;
}

export function getIgnorePatterns() {
  const config = getConfig();
  return config.ignorePatterns;
}

export function getThreshold(type) {
  const thresholds = getThresholds();
  return thresholds[type];
}

export function resetConfig() {
  cachedConfig = null;
  configLoadError = null;
}

export default {
  loadConfig,
  getConfig,
  getGatesConfig,
  getThresholds,
  getTestPatterns,
  getIgnorePatterns,
  getThreshold,
  resetConfig,
};
