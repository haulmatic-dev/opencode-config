/**
 * Unit tests for lib/tracing.js
 * Tests trace creation, span management, context propagation, and SQLite persistence.
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** @type {object} */
const { describe, it, before, after, beforeEach, afterEach } = await import(
  'mocha'
);
/** @type {object} */
const assert = await import('assert');

/** @type {object} */
const tracing = await import('../../lib/tracing.js');

/**
 * Generate a unique temp file path for test database
 * @returns {string} Path to temp database file
 */
function getTempDbPath() {
  return path.join(
    __dirname,
    '..',
    '..',
    'data',
    `test-tracing-${Date.now()}.db`,
  );
}

describe('lib/tracing.js', () => {
  /** @type {string} */
  let tempDbPath;

  before(async () => {
    tempDbPath = getTempDbPath();
    await tracing.initialize({ storagePath: tempDbPath });
  });

  after(async () => {
    await tracing.close();
  });

  describe('createTrace()', () => {
    it('should generate a unique trace ID', async () => {
      const trace = await tracing.createTrace();
      assert.ok(trace.id, 'Trace should have an ID');
      assert.ok(typeof trace.id === 'string', 'Trace ID should be a string');
      assert.ok(trace.id.length > 0, 'Trace ID should not be empty');
      assert.ok(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          trace.id,
        ),
        'Trace ID should be a valid UUID',
      );
    });

    it('should generate different trace IDs for each call', async () => {
      const trace1 = await tracing.createTrace();
      const trace2 = await tracing.createTrace();
      assert.notStrictEqual(trace1.id, trace2.id, 'Trace IDs should be unique');
    });

    it('should accept parentSpanId option', async () => {
      const parentTrace = await tracing.createTrace();
      const childTrace = await tracing.createTrace({
        parentSpanId: parentTrace.id,
      });
      assert.ok(childTrace.id, 'Child trace should have an ID');
    });

    it('should accept tags and metadata options', async () => {
      const trace = await tracing.createTrace({
        tags: { environment: 'test', version: '1.0' },
        metadata: { source: 'unit-test' },
      });
      assert.ok(trace.id, 'Trace should be created with options');
    });

    it('should return trace with all required methods', async () => {
      const trace = await tracing.createTrace();
      assert.strictEqual(
        typeof trace.startSpan,
        'function',
        'Should have startSpan method',
      );
      assert.strictEqual(
        typeof trace.inject,
        'function',
        'Should have inject method',
      );
      assert.strictEqual(
        typeof trace.extract,
        'function',
        'Should have extract method',
      );
      assert.strictEqual(
        typeof trace.getId,
        'function',
        'Should have getId method',
      );
      assert.strictEqual(
        typeof trace.getSpans,
        'function',
        'Should have getSpans method',
      );
      assert.strictEqual(
        typeof trace.finish,
        'function',
        'Should have finish method',
      );
    });
  });

  describe('startSpan()', () => {
    it('should create a span with required properties', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('test-span');

      assert.ok(span.id, 'Span should have an ID');
      assert.strictEqual(
        typeof span.id,
        'string',
        'Span ID should be a string',
      );
      assert.ok(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          span.id,
        ),
        'Span ID should be a valid UUID',
      );
      assert.strictEqual(
        span.name,
        'test-span',
        'Span should have correct name',
      );
      assert.strictEqual(span.traceId, trace.id, 'Span should reference trace');
      assert.ok(span.startTime, 'Span should have startTime');
      assert.strictEqual(
        span.ended,
        false,
        'Span should not be ended initially',
      );
    });

    it('should create different span IDs for each call', async () => {
      const trace = await tracing.createTrace();
      const span1 = await trace.startSpan('span-1');
      const span2 = await trace.startSpan('span-2');

      assert.notStrictEqual(span1.id, span2.id, 'Span IDs should be unique');
    });

    it('should accept parentSpanId option', async () => {
      const trace = await tracing.createTrace();
      const parentSpan = await trace.startSpan('parent-span');
      const childSpan = await trace.startSpan('child-span', {
        parentSpanId: parentSpan.id,
      });

      assert.strictEqual(
        childSpan.parentSpanId,
        parentSpan.id,
        'Child span should reference parent',
      );
    });

    it('should accept tags and metadata options', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('span-with-data', {
        tags: { component: 'test', type: 'unit' },
        metadata: { file: 'test-tracing.mjs' },
      });

      assert.strictEqual(span.name, 'span-with-data');
    });

    it('should track multiple spans in same trace', async () => {
      const trace = await tracing.createTrace();
      await trace.startSpan('span-1');
      await trace.startSpan('span-2');
      await trace.startSpan('span-3');

      const spans = await trace.getSpans();
      assert.strictEqual(spans.length, 3, 'Trace should have 3 spans');
    });
  });

  describe('span.end()', () => {
    it('should close the span and mark it as ended', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('ending-span');
      const result = await span.end();

      assert.strictEqual(span.ended, true, 'Span should be marked as ended');
      assert.ok(span.endTime, 'Span should have endTime');
      assert.ok(span.durationMs >= 0, 'Span should have duration');
      assert.strictEqual(
        result.spanId,
        span.id,
        'Result should contain span ID',
      );
      assert.strictEqual(
        result.traceId,
        trace.id,
        'Result should contain trace ID',
      );
      assert.strictEqual(
        result.name,
        'ending-span',
        'Result should contain span name',
      );
      assert.strictEqual(
        result.status,
        'ok',
        'Result should have default status',
      );
    });

    it('should calculate duration correctly', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('duration-test');
      const delay = 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
      const result = await span.end();

      assert.ok(
        result.durationMs >= delay,
        'Duration should be at least the delay',
      );
    });

    it('should accept status option', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('error-span');
      const result = await span.end({ status: 'error' });

      assert.strictEqual(
        result.status,
        'error',
        'Span should have error status',
      );
    });

    it('should accept additional tags and metadata', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('tagged-span', {
        tags: { initial: 'value' },
      });
      const result = await span.end({
        tags: { final: 'value' },
        metadata: { key: 'value' },
      });

      assert.strictEqual(result.status, 'ok');
    });

    it('should return error for double end', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('double-end');
      await span.end();
      const result = await span.end();

      assert.ok(result.error, 'Double end should return error');
      assert.strictEqual(result.error, 'Span already ended');
    });

    it('should persist span data to SQLite', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('persisted-span');
      await span.end({ status: 'ok', tags: { test: true } });

      const spans = await trace.getSpans();
      const persistedSpan = spans.find((s) => s.span_id === span.id);

      assert.ok(persistedSpan, 'Span should be persisted in database');
      assert.strictEqual(
        persistedSpan.status,
        'ok',
        'Persisted span should have correct status',
      );
    });
  });

  describe('trace.inject()', () => {
    it('should add trace context to message', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('inject-span');
      await span.end();

      const message = { type: 'test', payload: {} };
      const injected = trace.inject(message);

      assert.ok(
        injected.traceContext,
        'Injected message should have traceContext',
      );
      assert.strictEqual(
        injected.traceContext.traceId,
        trace.id,
        'Context should contain trace ID',
      );
      assert.ok(
        Array.isArray(injected.traceContext.spans),
        'Context should have spans array',
      );
    });

    it('should include span information in context', async () => {
      const trace = await tracing.createTrace();
      const span1 = await trace.startSpan('span-1');
      await span1.end();
      const span2 = await trace.startSpan('span-2');
      await span2.end();

      const message = {};
      const injected = trace.inject(message);

      assert.strictEqual(
        injected.traceContext.spans.length,
        2,
        'Context should contain both spans',
      );
      const spanIds = injected.traceContext.spans.map((s) => s.id);
      assert.ok(
        spanIds.includes(span1.id),
        'Context should include first span ID',
      );
      assert.ok(
        spanIds.includes(span2.id),
        'Context should include second span ID',
      );
    });

    it('should preserve original message properties', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('preserve-span');
      await span.end();

      const original = { type: 'test', count: 42, nested: { key: 'value' } };
      const injected = trace.inject(original);

      assert.strictEqual(
        injected.type,
        'test',
        'Original type should be preserved',
      );
      assert.strictEqual(
        injected.count,
        42,
        'Original count should be preserved',
      );
      assert.deepStrictEqual(
        injected.nested,
        { key: 'value' },
        'Nested objects should be preserved',
      );
    });

    it('should include parentSpanId in span info', async () => {
      const trace = await tracing.createTrace();
      const parentSpan = await trace.startSpan('parent');
      await parentSpan.end();
      const childSpan = await trace.startSpan('child', {
        parentSpanId: parentSpan.id,
      });
      await childSpan.end();

      const injected = trace.inject({});
      const childSpanInfo = injected.traceContext.spans.find(
        (s) => s.name === 'child',
      );

      assert.strictEqual(
        childSpanInfo.parentSpanId,
        parentSpan.id,
        'Child span should reference parent',
      );
    });
  });

  describe('trace.extract()', () => {
    it('should extract context from message with traceContext', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('extract-span');
      await span.end();

      const message = { traceContext: { traceId: trace.id, spans: [] } };
      const extracted = trace.extract(message);

      assert.ok(extracted, 'Should extract context');
      assert.strictEqual(
        extracted.traceId,
        trace.id,
        'Extracted context should have trace ID',
      );
    });

    it('should return null for message without traceContext', async () => {
      const trace = await tracing.createTrace();

      const emptyMessage = {};
      assert.strictEqual(
        trace.extract(emptyMessage),
        null,
        'Should return null for empty message',
      );

      const nullMessage = null;
      assert.strictEqual(
        trace.extract(nullMessage),
        null,
        'Should return null for null message',
      );
    });

    it('should return null for message with invalid traceContext', async () => {
      const trace = await tracing.createTrace();

      const invalidMessage = { traceContext: undefined };
      assert.strictEqual(
        trace.extract(invalidMessage),
        null,
        'Should return null for undefined context',
      );
    });

    it('should extract full context with spans', async () => {
      const trace = await tracing.createTrace();
      const span1 = await trace.startSpan('span-1');
      await span1.end();
      const span2 = await trace.startSpan('span-2');
      await span2.end();

      const message = trace.inject({});
      const extracted = trace.extract(message);

      assert.strictEqual(
        extracted.traceId,
        trace.id,
        'Should extract trace ID',
      );
      assert.strictEqual(
        extracted.spans.length,
        2,
        'Should extract spans array',
      );
    });
  });

  describe('SQLite persistence', () => {
    it('should persist trace to database', async () => {
      const freshDbPath = getTempDbPath();
      await tracing.initialize({ storagePath: freshDbPath });

      const trace = await tracing.createTrace({
        tags: { persistence: 'test' },
      });
      await tracing.close();

      await tracing.initialize({ storagePath: freshDbPath });
      const newTrace = await tracing.createTrace({ parentSpanId: trace.id });
      assert.strictEqual(
        newTrace.id.length > 0,
        true,
        'New trace should be created',
      );
      await tracing.close();
    });

    it('should persist spans with all fields', async () => {
      const freshDbPath = getTempDbPath();
      await tracing.initialize({ storagePath: freshDbPath });

      const trace = await tracing.createTrace();
      const span = await trace.startSpan('full-persistence', {
        tags: { component: 'test' },
        metadata: { test: 'data' },
      });
      await span.end({ status: 'ok' });

      const spans = await trace.getSpans();
      const persistedSpan = spans.find((s) => s.name === 'full-persistence');

      assert.strictEqual(
        persistedSpan.name,
        'full-persistence',
        'Span name should persist',
      );
      assert.strictEqual(
        persistedSpan.status,
        'ok',
        'Span status should persist',
      );
      assert.ok(persistedSpan.duration_ms > 0, 'Duration should persist');

      const tags = JSON.parse(persistedSpan.tags);
      assert.strictEqual(tags.component, 'test', 'Tags should persist');
      await tracing.close();
    });

    it('should handle multiple traces in database', async () => {
      const freshDbPath = getTempDbPath();
      await tracing.initialize({ storagePath: freshDbPath });

      const trace1 = await tracing.createTrace();
      await trace1.startSpan('span-1');
      await trace1.finish();

      const trace2 = await tracing.createTrace();
      await trace2.startSpan('span-2');
      await trace2.finish();

      const spans1 = await trace1.getSpans();
      const spans2 = await trace2.getSpans();

      assert.strictEqual(spans1.length, 1, 'First trace should have 1 span');
      assert.strictEqual(spans2.length, 1, 'Second trace should have 1 span');
      assert.notStrictEqual(
        spans1[0].trace_id,
        spans2[0].trace_id,
        'Spans should belong to different traces',
      );
      await tracing.close();
    });

    it('should support trace finish operation', async () => {
      const trace = await tracing.createTrace();
      await trace.startSpan('span-1');
      await trace.startSpan('span-2');
      const result = await trace.finish();

      assert.strictEqual(
        result.traceId,
        trace.id,
        'Result should contain trace ID',
      );
      assert.strictEqual(
        result.spanCount,
        2,
        'Result should have correct span count',
      );
      assert.ok(result.totalDurationMs >= 0, 'Result should have duration');
    });
  });

  describe('trace.getId()', () => {
    it('should return the trace ID', async () => {
      const trace = await tracing.createTrace();
      assert.strictEqual(
        trace.getId(),
        trace.id,
        'getId() should return trace ID',
      );
    });
  });

  describe('trace.getSpans()', () => {
    it('should return all spans for the trace', async () => {
      const trace = await tracing.createTrace();
      const span1 = await trace.startSpan('span-1');
      const span2 = await trace.startSpan('span-2');
      await span1.end();
      await span2.end();

      const spans = await trace.getSpans();

      assert.strictEqual(spans.length, 2, 'Should return all spans');
      assert.ok(spans[0].span_id, 'Spans should have span_id');
      assert.ok(spans[0].trace_id, 'Spans should have trace_id');
      assert.strictEqual(
        spans[0].trace_id,
        trace.id,
        'Spans should belong to correct trace',
      );
    });

    it('should parse JSON tags and metadata', async () => {
      const trace = await tracing.createTrace();
      const span = await trace.startSpan('json-span', {
        tags: { key: 'value' },
        metadata: { nested: { deep: true } },
      });
      await span.end();

      const spans = await trace.getSpans();
      const parsedSpan = spans.find((s) => s.name === 'json-span');

      assert.deepStrictEqual(
        parsedSpan.tags,
        { key: 'value' },
        'Tags should be parsed JSON',
      );
      assert.deepStrictEqual(
        parsedSpan.metadata,
        { nested: { deep: true } },
        'Metadata should be parsed JSON',
      );
    });

    it('should return empty array for trace with no spans', async () => {
      const trace = await tracing.createTrace();
      const spans = await trace.getSpans();

      assert.ok(Array.isArray(spans), 'Should return array');
      assert.strictEqual(spans.length, 0, 'Should return empty array');
    });
  });

  describe('continueTrace()', () => {
    it('should continue a trace from extracted context', async () => {
      const originalTrace = await tracing.createTrace();
      const span = await originalTrace.startSpan('original-span');
      await span.end();

      const context = originalTrace.inject({});
      const continuedTrace = await tracing.continueTrace(context);

      assert.strictEqual(
        continuedTrace.originalTraceId,
        originalTrace.id,
        'Should reference original trace',
      );
      assert.strictEqual(
        continuedTrace.continued,
        true,
        'Should be marked as continued',
      );
    });

    it('should allow creating new spans on continued trace', async () => {
      const originalTrace = await tracing.createTrace();
      const context = originalTrace.inject({});
      const continuedTrace = await tracing.continueTrace(context);

      const newSpan = await continuedTrace.startSpan('continued-span');
      await newSpan.end();

      const spans = await continuedTrace.getSpans();
      assert.strictEqual(
        spans.length,
        1,
        'Continued trace should have new span',
      );
      assert.strictEqual(
        spans[0].name,
        'continued-span',
        'New span should be on continued trace',
      );
    });
  });
});
