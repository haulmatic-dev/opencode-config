import { EventEmitter } from 'events';

/**
 * @typedef {Object} AgentRegistration
 * @property {string} agentId
 * @property {string} name
 * @property {string} endpoint
 * @property {Date} registeredAt
 */

/**
 * @typedef {Object} MailMessage
 * @property {string} messageId
 * @property {string} fromAgentId
 * @property {string} toAgentId
 * @property {string} subject
 * @property {string} body
 * @property {Date} sentAt
 * @property {Date} receivedAt
 * @property {Object} metadata
 */

/**
 * @typedef {Object} LatencyConfig
 * @property {number} min - Minimum latency in ms
 * @property {number} max - Maximum latency in ms
 */

/**
 * @typedef {Object} FaultConfig
 * @property {boolean} enabled - Whether fault injection is enabled
 * @property {number} errorRate - Probability of error (0-1)
 * @property {number} timeoutRate - Probability of timeout (0-1)
 * @property {string[]} errorTypes - Types of errors to inject
 */

/**
 * Mock MCP Agent Mail Server for integration testing
 * Simulates MCP protocol behavior with configurable latency and fault injection
 */
export class MockMCPAgentMailServer extends EventEmitter {
  /**
   * @param {Object} options
   * @param {LatencyConfig} [options.latency] - Latency configuration
   * @param {FaultConfig} [options.faults] - Fault injection configuration
   */
  constructor(options = {}) {
    super();
    this.latency = options.latency || { min: 50, max: 200 };
    this.faults = options.faults || {
      enabled: false,
      errorRate: 0,
      timeoutRate: 0,
      errorTypes: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
    };
    this.agents = new Map();
    this.messages = [];
    this.messageHistory = [];
    this.running = false;
    this.port = options.port || 3000;
  }

  /**
   * Start the mock server
   * @returns {Promise<void>}
   */
  async start() {
    this.running = true;
    this.emit('start', { port: this.port });
    return Promise.resolve();
  }

  /**
   * Stop the mock server
   * @returns {Promise<void>}
   */
  async stop() {
    this.running = false;
    this.emit('stop');
    return Promise.resolve();
  }

  /**
   * Simulate network latency with optional fault injection
   * @returns {Promise<void>}
   */
  async simulateNetwork() {
    if (!this.running) {
      throw new Error('Server not running');
    }

    const shouldFault =
      this.faults.enabled && Math.random() < this.faults.errorRate;
    const shouldTimeout =
      this.faults.enabled && Math.random() < this.faults.timeoutRate;

    if (shouldTimeout) {
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 100),
      );
    }

    if (shouldFault) {
      const errorType =
        this.faults.errorTypes[
          Math.floor(Math.random() * this.faults.errorTypes.length)
        ];
      const error = new Error(`Simulated ${errorType}`);
      error.code = errorType;
      throw error;
    }

    const delay =
      Math.random() * (this.latency.max - this.latency.min) + this.latency.min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Register a new agent with the mail server
   * @param {Object} params
   * @param {string} params.agentId - Unique agent identifier
   * @param {string} params.name - Agent name
   * @param {string} params.endpoint - Agent endpoint URL
   * @returns {Promise<AgentRegistration>}
   */
  async register_agent(params) {
    await this.simulateNetwork();

    const registration = {
      agentId: params.agentId,
      name: params.name,
      endpoint: params.endpoint,
      registeredAt: new Date(),
    };

    this.agents.set(params.agentId, registration);
    this.messageHistory.push({
      type: 'register_agent',
      params,
      timestamp: new Date(),
      success: true,
    });

    this.emit('agentRegistered', registration);
    return registration;
  }

  /**
   * Send a message from one agent to another
   * @param {Object} params
   * @param {string} params.fromAgentId - Sender agent ID
   * @param {string} params.toAgentId - Recipient agent ID
   * @param {string} params.subject - Message subject
   * @param {string} params.body - Message body
   * @param {Object} [params.metadata] - Optional message metadata
   * @returns {Promise<MailMessage>}
   */
  async send_message(params) {
    await this.simulateNetwork();

    if (!this.agents.has(params.fromAgentId)) {
      throw new Error(`Sender agent ${params.fromAgentId} not registered`);
    }

    if (!this.agents.has(params.toAgentId)) {
      throw new Error(`Recipient agent ${params.toAgentId} not registered`);
    }

    const message = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromAgentId: params.fromAgentId,
      toAgentId: params.toAgentId,
      subject: params.subject,
      body: params.body,
      sentAt: new Date(),
      receivedAt: new Date(),
      metadata: params.metadata || {},
    };

    this.messages.push(message);
    this.messageHistory.push({
      type: 'send_message',
      params,
      result: message,
      timestamp: new Date(),
      success: true,
    });

    this.emit('messageSent', message);
    return message;
  }

  /**
   * Fetch inbox messages for an agent
   * @param {Object} params
   * @param {string} params.agentId - Agent ID to fetch inbox for
   * @param {Object} [params.options] - Query options
   * @param {number} [params.options.limit] - Maximum messages to return
   * @param {string} [params.options.since] - ISO date string to fetch messages after
   * @returns {Promise<MailMessage[]>}
   */
  async fetch_inbox(params) {
    await this.simulateNetwork();

    if (!this.agents.has(params.agentId)) {
      throw new Error(`Agent ${params.agentId} not registered`);
    }

    let filtered = this.messages.filter((m) => m.toAgentId === params.agentId);

    if (params.options?.since) {
      const sinceDate = new Date(params.options.since);
      filtered = filtered.filter((m) => m.receivedAt >= sinceDate);
    }

    if (params.options?.limit) {
      filtered = filtered.slice(0, params.options.limit);
    }

    filtered.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

    this.messageHistory.push({
      type: 'fetch_inbox',
      params,
      result: filtered,
      timestamp: new Date(),
      success: true,
    });

    this.emit('inboxFetched', { agentId: params.agentId, messages: filtered });
    return filtered;
  }

  /**
   * Get all registered agents
   * @returns {AgentRegistration[]}
   */
  getRegisteredAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get all messages
   * @returns {MailMessage[]}
   */
  getMessages() {
    return [...this.messages];
  }

  /**
   * Get message history
   * @returns {Object[]}
   */
  getMessageHistory() {
    return [...this.messageHistory];
  }

  /**
   * Clear all data
   */
  clear() {
    this.agents.clear();
    this.messages = [];
    this.messageHistory = [];
  }

  /**
   * Configure latency simulation
   * @param {LatencyConfig} config
   */
  setLatency(config) {
    this.latency = { ...this.latency, ...config };
  }

  /**
   * Configure fault injection
   * @param {Partial<FaultConfig>} config
   */
  setFaults(config) {
    this.faults = { ...this.faults, ...config };
  }

  /**
   * Check if server is running
   * @returns {boolean}
   */
  isRunning() {
    return this.running;
  }
}

export default MockMCPAgentMailServer;
