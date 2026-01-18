/**
 * @fileoverview Real-time status updates via Server-Sent Events with Redis Pub/Sub
 * @module lib/status-stream
 */

import { createServer } from 'node:http';

let Redis = null;
try {
  Redis = (await import('ioredis')).default;
} catch {
  Redis = null;
}

/**
 * @typedef {Object} StatusEvent
 * @property {string} id - Unique event identifier
 * @property {string} type - Event type (e.g., 'status', 'progress', 'error')
 * @property {string} channel - Redis channel name
 * @property {Object} data - Event payload
 * @property {Date} timestamp - Event timestamp
 */

/**
 * @typedef {Object} StatusStreamOptions
 * @property {number} [port=3001] - HTTP server port for SSE
 * @property {string} [redisUrl] - Redis connection URL
 * @property {string} [channelPrefix='status:'] - Prefix for Redis channels
 * @property {number} [heartbeatInterval=30000] - Heartbeat interval in ms
 * @property {number} [retryInterval=3000] - Client retry interval in ms
 */

/** @enum {string} */
export const EventTypes = {
  STATUS: 'status',
  PROGRESS: 'progress',
  ERROR: 'error',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
};

let redisClient = null;
let redisSubscriber = null;

/**
 * Gets or creates the Redis client
 * @param {string} [redisUrl]
 * @returns {Redis|null}
 */
function getRedisClient(redisUrl) {
  if (!Redis) return null;
  if (!redisClient) {
    redisClient = redisUrl ? new Redis(redisUrl) : new Redis();
  }
  return redisClient;
}

/**
 * Gets or creates the Redis subscriber client
 * @param {string} [redisUrl]
 * @returns {Redis|null}
 */
function getRedisSubscriber(redisUrl) {
  if (!Redis) return null;
  if (!redisSubscriber) {
    redisSubscriber = redisUrl ? new Redis(redisUrl) : new Redis();
  }
  return redisSubscriber;
}

/**
 * StatusStream class for SSE with Redis Pub/Sub
 */
export class StatusStream {
  /**
   * @param {StatusStreamOptions} [options={}]
   */
  constructor(options = {}) {
    this.port = options.port ?? 3001;
    this.redisUrl = options.redisUrl;
    this.channelPrefix = options.channelPrefix ?? 'status:';
    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
    this.retryInterval = options.retryInterval ?? 3000;

    this.clients = new Map();
    this.server = null;
    this.publisher = null;
    this.subscriber = null;
    this.eventId = 0;
    this.heartbeatTimer = null;
  }

  /**
   * Initializes Redis connections and starts the HTTP server
   * @returns {Promise<void>}
   */
  async start() {
    this.publisher = getRedisClient(this.redisUrl);
    this.subscriber = getRedisSubscriber(this.redisUrl);

    if (this.subscriber) {
      await this.subscriber.subscribe(`${this.channelPrefix}*`);
      this.subscriber.on('message', this._handleRedisMessage.bind(this));
    }

    this.server = createServer(this._handleRequest.bind(this));
    await new Promise((resolve) => this.server.listen(this.port, resolve));

    this._startHeartbeat();
    const redisStatus = this.publisher
      ? 'Redis connected'
      : 'Redis not available';
    console.log(
      `[StatusStream] Server running on port ${this.port} (${redisStatus})`,
    );
  }

  /**
   * Stops the server and closes Redis connections
   * @returns {Promise<void>}
   */
  async stop() {
    this._stopHeartbeat();

    for (const [id, res] of this.clients) {
      this._closeClient(id, res);
    }
    this.clients.clear();

    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
    }

    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }

    if (redisSubscriber) {
      await redisSubscriber.quit();
      redisSubscriber = null;
    }
  }

  /**
   * Broadcasts a status event to all connected clients
   * @param {string} channel - Channel name (without prefix)
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @returns {Promise<void>}
   */
  async broadcast(channel, type, data) {
    const event = {
      id: ++this.eventId,
      type,
      channel: `${this.channelPrefix}${channel}`,
      data,
      timestamp: new Date(),
    };

    const message = JSON.stringify(event);
    const formatted = `id: ${event.id}\ntype: ${type}\ndata: ${message}\n\n`;

    for (const [_id, res] of this.clients) {
      this._sendEvent(res, formatted);
    }

    if (this.publisher) {
      await this.publisher.publish(`${this.channelPrefix}${channel}`, message);
    }
  }

  /**
   * Sends a status event to a specific client
   * @param {string} clientId - Client identifier
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  send(clientId, type, data) {
    const res = this.clients.get(clientId);
    if (!res) return;

    const event = {
      id: ++this.eventId,
      type,
      data,
      timestamp: new Date(),
    };

    const message = JSON.stringify(event);
    const formatted = `id: ${event.id}\ntype: ${type}\ndata: ${message}\n\n`;
    this._sendEvent(res, formatted);
  }

  /**
   * Gets the count of connected clients
   * @returns {number}
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Gets a list of connected client IDs
   * @returns {string[]}
   */
  getClientIds() {
    return Array.from(this.clients.keys());
  }

  /**
   * Handles incoming HTTP requests for SSE
   * @param {import('http').IncomingMessage} req
   * @param {import('http').ServerResponse} res
   * @private
   */
  _handleRequest(req, res) {
    if (req.url === '/events' && req.method === 'GET') {
      this._handleSSEConnection(req, res);
    } else if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', clients: this.clients.size }));
    } else if (req.url === '/stats' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          clients: this.clients.size,
          eventId: this.eventId,
        }),
      );
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  /**
   * Handles new SSE connection
   * @param {import('http').IncomingMessage} req
   * @param {import('http').ServerResponse} res
   * @private
   */
  _handleSSEConnection(req, res) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`retry: ${this.retryInterval}\n\n`);
    this._sendEvent(
      res,
      `type: connect\ndata: ${JSON.stringify({ clientId })}\n\n`,
    );

    this.clients.set(clientId, res);
    console.log(
      `[StatusStream] Client connected: ${clientId} (${this.clients.size} total)`,
    );

    req.on('close', () => {
      this._closeClient(clientId, res);
    });
  }

  /**
   * Handles incoming Redis messages
   * @param {string} channel - Redis channel
   * @param {string} message - Message payload
   * @private
   */
  _handleRedisMessage(_channel, message) {
    const formatted = `id: ${++this.eventId}\n${message}\n\n`;
    for (const [_id, res] of this.clients) {
      this._sendEvent(res, formatted);
    }
  }

  /**
   * Sends formatted event to client
   * @param {import('http').ServerResponse} res
   * @param {string} data - Formatted event data
   * @private
   */
  _sendEvent(res, data) {
    try {
      res.write(data);
    } catch (err) {
      console.error('[StatusStream] Error sending event:', err.message);
    }
  }

  /**
   * Closes a client connection
   * @param {string} clientId
   * @param {import('http').ServerResponse} res
   * @private
   */
  _closeClient(clientId, res) {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(
        `[StatusStream] Client disconnected: ${clientId} (${this.clients.size} remaining)`,
      );
      try {
        res.end();
      } catch (_err) {
        // Ignore close errors
      }
    }
  }

  /**
   * Starts heartbeat to keep connections alive
   * @private
   */
  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const beat = `: heartbeat\n\n`;
      for (const [_id, res] of this.clients) {
        this._sendEvent(res, beat);
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stops the heartbeat timer
   * @private
   */
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/**
 * Factory function to create and start a StatusStream instance
 * @param {StatusStreamOptions} [options]
 * @returns {Promise<StatusStream>}
 */
export async function createStatusStream(options = {}) {
  const stream = new StatusStream(options);
  await stream.start();
  return stream;
}

export default StatusStream;
