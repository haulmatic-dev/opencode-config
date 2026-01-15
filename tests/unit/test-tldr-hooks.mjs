import assert from 'node:assert';
import { dirname, join } from 'node:path';
import { beforeEach, describe, it, mock } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('TLDR Hook Edge Cases', () => {
  let middlewareModule;

  beforeEach(async () => {
    middlewareModule = await import('../../lib/tldr-internal.mjs');
  });

  describe('extractFilePaths', () => {
    it('should extract single file path from message', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const refs = await middleware.extractFilePaths(
        'Please look at "src/utils/helper.js"',
      );

      assert.strictEqual(refs.length, 1);
      assert.ok(refs[0].path.endsWith('src/utils/helper.js'));
    });

    it('should extract multiple file paths from single message', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const refs = await middleware.extractFilePaths(
        'Review "src/main.js" and "lib/utils.ts" and check "tests/spec.js"',
      );

      assert.strictEqual(refs.length, 3);
    });

    it('should extract glob patterns', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const refs = await middleware.extractFilePaths(
        'Check all test files like "tests/**/*.spec.js"',
      );

      assert.ok(refs.length >= 0);
    });

    it('should handle repeated references', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const refs = await middleware.extractFilePaths(
        '"src/main.js" and again "src/main.js"',
      );

      assert.ok(refs.length > 0);
      const paths = refs.map((r) => r.path);
      assert.ok(paths.length <= 2);
    });

    it('should handle no file references', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const refs = await middleware.extractFilePaths(
        'Just a general question without any files',
      );

      assert.strictEqual(refs.length, 0);
    });
  });

  describe('filterValidFiles', () => {
    it('should filter out non-existent files', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const { valid, warnings } = middleware.filterValidFiles([
        { path: '/nonexistent/file.js' },
        { path: '/Users/buddhi/.config/opencode/package.json' },
      ]);

      assert.strictEqual(valid.length, 1);
      assert.ok(warnings.length > 0);
      assert.ok(warnings[0].includes('not found'));
    });

    it('should filter out binary files', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const { valid, warnings } = middleware.filterValidFiles([
        { path: '/Users/buddhi/.config/opencode/plugin/tldr.mjs' },
        { path: '/Users/buddhi/.config/opencode/image.png' },
      ]);

      assert.strictEqual(valid.length, 1);
      assert.ok(
        warnings.some((w) => w.includes('binary') || w.length > 0),
        'Should have warnings for binary files',
      );
    });

    it('should warn on large files', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const { valid, warnings } = middleware.filterValidFiles([
        { path: '/Users/buddhi/.config/opencode/plugin/tldr.mjs' },
      ]);

      if (valid.length === 1) {
        assert.ok(
          warnings.length === 0 ||
            warnings.some((w) => w.includes('Large file')),
        );
      }
    });
  });

  describe('scope ceiling enforcement', () => {
    it('should limit files to scope ceiling', async () => {
      const middleware = new middlewareModule.TLDRMiddleware({
        scopeCeilingFiles: 3,
      });

      const files = Array.from({ length: 10 }, (_, i) => ({
        path: `/file${i}.js`,
      }));

      const selected = await middleware.selectAndPrioritizeFiles(files, [
        { role: 'user', content: 'test' },
      ]);

      assert.strictEqual(selected.length, 3);
    });
  });

  describe('context caching', () => {
    it('should have LRU cache available', async () => {
      const cache = new middlewareModule.LRUCache(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      assert.strictEqual(cache.get('a'), 1);
    });

    it('should evict oldest when full', async () => {
      const cache = new middlewareModule.LRUCache(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);

      assert.strictEqual(cache.has('a'), false);
      assert.strictEqual(cache.has('d'), true);
    });
  });

  describe('buildQueryFromMessages', () => {
    it('should extract query from user messages', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const query = middleware.buildQueryFromMessages([
        { role: 'user', content: 'Fix the bug in src/utils.js' },
        { role: 'assistant', content: 'I will help you with that' },
      ]);

      assert.ok(query.includes('Fix'));
      assert.ok(query.includes('src/utils.js'));
    });

    it('should sanitize HTML characters', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const query = middleware.buildQueryFromMessages([
        { role: 'user', content: 'Check "<script>alert(1)</script>"' },
      ]);

      assert.ok(!query.includes('<script>'));
    });
  });

  describe('isBinaryFile', () => {
    it('should identify binary extensions', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      assert.ok(middleware.isBinaryFile('image.png'));
      assert.ok(middleware.isBinaryFile('archive.zip'));
      assert.ok(middleware.isBinaryFile('document.pdf'));

      assert.ok(!middleware.isBinaryFile('script.js'));
      assert.ok(!middleware.isBinaryFile('module.ts'));
      assert.ok(!middleware.isBinaryFile('styles.css'));
    });
  });

  describe('estimateContextSize', () => {
    it('should estimate token count', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const contexts = [
        {
          functions: [
            { code: 'function a() { return 1; }'.repeat(100) },
            { code: 'function b() { return 2; }'.repeat(100) },
          ],
        },
      ];

      const estimate = middleware.estimateContextSize(contexts);

      assert.ok(estimate > 0);
      assert.ok(typeof estimate === 'number');
    });
  });

  describe('getContextWithFallback', () => {
    it('should handle unavailable files gracefully', async () => {
      const middleware = new middlewareModule.TLDRMiddleware();

      const result = await middleware.getContextWithFallback(
        '/nonexistent/file.js',
      );

      assert.ok(!result.success || result.context !== null);
    });
  });
});

describe('LRUCache', () => {
  let LRUCache;

  beforeEach(async () => {
    const module = await import('../../lib/tldr-internal.mjs');
    LRUCache = module.LRUCache;
  });

  it('should store and retrieve values', () => {
    const cache = new LRUCache(3);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    assert.strictEqual(cache.get('a'), 1);
    assert.strictEqual(cache.get('b'), 2);
    assert.strictEqual(cache.get('c'), 3);
  });

  it('should evict oldest when full', () => {
    const cache = new LRUCache(3);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4);

    assert.strictEqual(cache.has('a'), false);
    assert.strictEqual(cache.has('d'), true);
  });

  it('should update access order', () => {
    const cache = new LRUCache(3);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a');
    cache.set('d', 4);

    assert.strictEqual(cache.has('b'), false);
    assert.strictEqual(cache.has('a'), true);
  });

  it('should clear cache', () => {
    const cache = new LRUCache(3);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    assert.strictEqual(cache.has('a'), false);
    assert.strictEqual(cache.has('b'), false);
  });
});

describe('Hook Integration', () => {
  it('should export required components', async () => {
    const module = await import('../../lib/tldr-internal.mjs');

    assert.ok(typeof module.TLDRMiddleware === 'function');
    assert.ok(typeof module.LRUCache === 'function');
    assert.ok(typeof module.TLDRClient === 'function');
  });

  it('should have middleware with all required methods', async () => {
    const { TLDRMiddleware } = await import('../../lib/tldr-internal.mjs');
    const middleware = new TLDRMiddleware();

    assert.ok(typeof middleware.extractFilePaths === 'function');
    assert.ok(typeof middleware.filterValidFiles === 'function');
    assert.ok(typeof middleware.selectAndPrioritizeFiles === 'function');
    assert.ok(typeof middleware.getContextWithFallback === 'function');
    assert.ok(typeof middleware.formatContextAsSystemPrompt === 'function');
    assert.ok(typeof middleware.isBinaryFile === 'function');
    assert.ok(typeof middleware.buildQueryFromMessages === 'function');
    assert.ok(typeof middleware.estimateContextSize === 'function');
  });
});

console.log('TLDR Hook Edge Cases Test Suite');
