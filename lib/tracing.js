/**
 * Lightweight Distributed Tracing
 *
 * Provides trace ID generation, span management, context propagation,
 * and SQLite persistence for distributed tracing.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db = null;
let traceStmt = null;
let spanStmt = null;
let getTraceStmt = null;
let getSpansStmt = null;

/**
 * Initialize the tracing database
 * @param {object} options - Configuration options
 * @param {string} [options.storagePath] - Path to SQLite database
 * @param {object} [options.logger] - Logger instance
 * @returns {Promise<void>}
 */
export async function initialize(options = {}) {
  const { default: sqlite3 } = await import('better-sqlite3');

  const {
    storagePath = path.join(__dirname, '..', '..', 'data', 'tracing.db'),
    logger = console,
  } = options;

  const fs = await import('fs');
  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new sqlite3(storagePath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      trace_id TEXT PRIMARY KEY,
      parent_span_id TEXT,
      started_at INTEGER DEFAULT (unixepoch()),
      finished_at INTEGER,
      tags TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS spans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL,
      span_id TEXT NOT NULL,
      parent_span_id TEXT,
      name TEXT NOT NULL,
      started_at INTEGER DEFAULT (unixepoch()),
      finished_at INTEGER,
      duration_ms REAL,
      status TEXT DEFAULT 'ok',
      tags TEXT,
      metadata TEXT,
      FOREIGN KEY (trace_id) REFERENCES traces(trace_id)
    );

    CREATE INDEX IF NOT EXISTS idx_spans_trace ON spans(trace_id);
    CREATE INDEX IF NOT EXISTS idx_spans_parent ON spans(parent_span_id);
  `);

  traceStmt = db.prepare(`
    INSERT INTO traces (trace_id, parent_span_id, tags, metadata)
    VALUES (?, ?, ?, ?)
  `);

  spanStmt = db.prepare(`
    INSERT INTO spans (trace_id, span_id, parent_span_id, name, started_at, tags, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  getTraceStmt = db.prepare('SELECT * FROM traces WHERE trace_id = ?');
  getSpansStmt = db.prepare(
    'SELECT * FROM spans WHERE trace_id = ? ORDER BY started_at ASC',
  );

  logger.info(`[Tracing] Initialized at ${storagePath}`);
}

/**
 * Generate a unique trace ID
 * @returns {Promise<string>} Trace ID
 */
async function generateTraceId() {
  const { v4: uuidv4 } = await import('uuid');
  return uuidv4();
}

/**
 * Generate a unique span ID
 * @returns {Promise<string>} Span ID
 */
async function generateSpanId() {
  const { v4: uuidv4 } = await import('uuid');
  return uuidv4();
}

/**
 * Create a new trace
 * @param {object} [options] - Trace options
 * @param {string} [options.parentSpanId] - Parent span ID for linked traces
 * @param {object} [options.tags] - Tags to attach to trace
 * @param {object} [options.metadata] - Metadata to attach to trace
 * @returns {Promise<object>} Trace object with methods
 */
export async function createTrace(options = {}) {
  if (!db) {
    await initialize();
  }

  const { parentSpanId, tags = {}, metadata = {} } = options;

  const traceId = await generateTraceId();

  traceStmt.run(
    traceId,
    parentSpanId || null,
    JSON.stringify(tags),
    JSON.stringify(metadata),
  );

  const spans = [];

  /**
   * Start a new span within this trace
   * @param {string} name - Span name
   * @param {object} [spanOptions] - Span options
   * @param {string} [spanOptions.parentSpanId] - Parent span ID
   * @param {object} [spanOptions.tags] - Tags for span
   * @param {object} [spanOptions.metadata] - Metadata for span
   * @returns {Promise<object>} Span object with end method
   */
  async function startSpan(name, spanOptions = {}) {
    const {
      parentSpanId: spanParentId,
      tags: spanTags = {},
      metadata: spanMetadata = {},
    } = spanOptions;

    const spanId = await generateSpanId();
    const startTime = Date.now();

    spanStmt.run(
      traceId,
      spanId,
      spanParentId || null,
      name,
      startTime,
      JSON.stringify(spanTags),
      JSON.stringify(spanMetadata),
    );

    const span = {
      id: spanId,
      name,
      traceId,
      parentSpanId: spanParentId || null,
      startTime,
      ended: false,

      /**
       * End this span
       * @param {object} [endOptions] - End options
       * @param {string} [endOptions.status] - Span status (ok, error)
       * @param {object} [endOptions.tags] - Additional tags
       * @param {object} [endOptions.metadata] - Additional metadata
       * @returns {Promise<object>} Span result
       */
      async end(endOptions = {}) {
        if (span.ended) {
          return { error: 'Span already ended' };
        }

        const {
          status = 'ok',
          tags: endTags = {},
          metadata: endMetadata = {},
        } = endOptions;
        const endTime = Date.now();
        const durationMs = endTime - span.startTime;

        const finalTags = { ...spanTags, ...endTags };
        const finalMetadata = { ...spanMetadata, ...endMetadata };

        const updateStmt = db.prepare(`
          UPDATE spans
          SET finished_at = ?, duration_ms = ?, status = ?, tags = ?, metadata = ?
          WHERE span_id = ?
        `);

        updateStmt.run(
          endTime,
          durationMs,
          status,
          JSON.stringify(finalTags),
          JSON.stringify(finalMetadata),
          spanId,
        );

        span.ended = true;
        span.endTime = endTime;
        span.durationMs = durationMs;
        span.status = status;

        return {
          spanId,
          traceId,
          name,
          durationMs,
          status,
        };
      },
    };

    spans.push(span);
    return span;
  }

  /**
   * Inject trace context into a message for propagation
   * @param {object} message - Message to inject context into
   * @returns {object} Message with trace context
   */
  function inject(message) {
    return {
      ...message,
      traceContext: {
        traceId,
        spans: spans.map((s) => ({
          id: s.id,
          name: s.name,
          parentSpanId: s.parentSpanId,
        })),
      },
    };
  }

  /**
   * Extract trace context from a message
   * @param {object} message - Message to extract from
   * @returns {object|null} Trace context or null
   */
  function extract(message) {
    if (!message || !message.traceContext) {
      return null;
    }
    return message.traceContext;
  }

  /**
   * Get the trace ID
   * @returns {string} Trace ID
   */
  function getId() {
    return traceId;
  }

  /**
   * Get all spans for this trace
   * @returns {Promise<Array>} List of spans
   */
  async function getSpans() {
    const rows = getSpansStmt.all(traceId);
    return rows.map((row) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    }));
  }

  /**
   * Finish the trace
   * @returns {Promise<object>} Trace result
   */
  async function finish() {
    const updateStmt = db.prepare(
      'UPDATE traces SET finished_at = unixepoch() WHERE trace_id = ?',
    );
    updateStmt.run(traceId);

    const traceSpans = await getSpans();
    const totalDuration =
      traceSpans.length > 0
        ? Math.max(...traceSpans.map((s) => s.durationMs || 0))
        : 0;

    return {
      traceId,
      spanCount: spans.length,
      totalDurationMs: totalDuration,
    };
  }

  return {
    id: traceId,
    startSpan,
    inject,
    extract,
    getId,
    getSpans,
    finish,
  };
}

/**
 * Continue a trace from extracted context
 * @param {object} traceContext - Extracted trace context
 * @param {object} [options] - Additional options
 * @returns {Promise<object>} Continued trace
 */
export async function continueTrace(traceContext, options = {}) {
  const { tags = {}, metadata = {} } = options;

  if (!db) {
    await initialize();
  }

  const { traceId } = traceContext;

  const existingTrace = getTraceStmt.get(traceId);

  if (!existingTrace) {
    traceStmt.run(
      traceId,
      null,
      JSON.stringify({ continued: true, ...tags }),
      JSON.stringify({ continuedAt: Date.now(), ...metadata }),
    );
  }

  const trace = await createTrace({ parentSpanId: null, tags, metadata });

  return {
    ...trace,
    continued: true,
    originalTraceId: traceId,
  };
}

/**
 * Close the tracing database connection
 * @returns {Promise<void>}
 */
export async function close() {
  if (db) {
    db.close();
    db = null;
    traceStmt = null;
    spanStmt = null;
    getTraceStmt = null;
    getSpansStmt = null;
  }
}

export default {
  initialize,
  createTrace,
  continueTrace,
  close,
};
