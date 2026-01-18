/**
 * Test Fixture Registry
 * Centralized fixture creation and cleanup for integration tests
 */

const fixtures = new Map();

/**
 * Creates a test database fixture
 * @param {string} name - Unique identifier for the database
 * @returns {Promise<object>} Database fixture object
 */
export async function createTestDatabase(name) {
  if (fixtures.has(`db:${name}`)) {
    return fixtures.get(`db:${name}`);
  }

  const db = {
    name,
    tables: [],
    connected: false,
    async connect() {
      this.connected = true;
      return this;
    },
    async disconnect() {
      this.connected = false;
    },
  };

  fixtures.set(`db:${name}`, db);
  return db;
}

/**
 * Creates a mock MCP server fixture
 * @param {object} config - Server configuration
 * @param {string} config.name - Server name
 * @param {number} config.port - Server port
 * @returns {Promise<object>} MCP server fixture
 */
export async function createMockMCPServer(config) {
  const key = `mcp:${config.name}:${config.port}`;
  if (fixtures.has(key)) {
    return fixtures.get(key);
  }

  const server = {
    ...config,
    running: false,
    handlers: new Map(),
    async start() {
      this.running = true;
      return this;
    },
    async stop() {
      this.running = false;
    },
    registerHandler(name, fn) {
      this.handlers.set(name, fn);
    },
  };

  fixtures.set(key, server);
  return server;
}

/**
 * Creates a worker cluster fixture
 * @param {number} count - Number of workers in the cluster
 * @returns {Promise<object>} Worker cluster fixture
 */
export async function createWorkerCluster(count) {
  const key = `cluster:${count}`;
  if (fixtures.has(key)) {
    return fixtures.get(key);
  }

  const workers = Array.from({ length: count }, (_, i) => ({
    id: i,
    status: 'idle',
    async start() {
      this.status = 'running';
    },
    async stop() {
      this.status = 'stopped';
    },
  }));

  const cluster = {
    workers,
    size: count,
    async startAll() {
      await Promise.all(workers.map((w) => w.start()));
    },
    async stopAll() {
      await Promise.all(workers.map((w) => w.stop()));
    },
  };

  fixtures.set(key, cluster);
  return cluster;
}

/**
 * Creates a test workflow fixture
 * @param {string} name - Workflow name
 * @returns {Promise<object>} Workflow fixture
 */
export async function createTestWorkflow(name) {
  const key = `workflow:${name}`;
  if (fixtures.has(key)) {
    return fixtures.get(key);
  }

  const workflow = {
    name,
    steps: [],
    status: 'created',
    addStep(step) {
      this.steps.push(step);
    },
    async execute() {
      this.status = 'running';
      return this;
    },
  };

  fixtures.set(key, workflow);
  return workflow;
}

/**
 * Cleans up all registered fixtures
 * @returns {Promise<void>}
 */
export async function cleanup() {
  for (const [key, fixture] of fixtures) {
    if (typeof fixture.disconnect === 'function') {
      await fixture.disconnect();
    }
    if (typeof fixture.stop === 'function') {
      await fixture.stop();
    }
    if (typeof fixture.stopAll === 'function') {
      await fixture.stopAll();
    }
    fixtures.delete(key);
  }
}

/**
 * Registers a fixture manually
 * @param {string} key - Unique fixture key
 * @param {object} fixture - Fixture object
 */
export function registerFixture(key, fixture) {
  fixtures.set(key, fixture);
}

/**
 * Gets a registered fixture
 * @param {string} key - Fixture key
 * @returns {object|undefined} Fixture or undefined
 */
export function getFixture(key) {
  return fixtures.get(key);
}

export default {
  createTestDatabase,
  createMockMCPServer,
  createWorkerCluster,
  createTestWorkflow,
  cleanup,
  registerFixture,
  getFixture,
};
