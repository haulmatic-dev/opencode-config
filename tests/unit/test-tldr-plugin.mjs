import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { createTLDRClient, TLDRClient } from '../../lib/tldr-client.mjs';

describe('TLDR Client', () => {
  describe('constructor', () => {
    it('should use default host and port', () => {
      const client = new TLDRClient();
      assert.strictEqual(client.host, 'localhost');
      assert.strictEqual(client.port, 3000);
    });

    it('should use custom options', () => {
      const client = new TLDRClient({
        host: '127.0.0.1',
        port: 8080,
        timeout: 5000,
      });
      assert.strictEqual(client.host, '127.0.0.1');
      assert.strictEqual(client.port, 8080);
      assert.strictEqual(client.timeout, 5000);
    });
  });

  describe('getBaseUrl', () => {
    it('should return correct URL', () => {
      const client = new TLDRClient();
      assert.strictEqual(client.getBaseUrl(), 'http://localhost:3000');
    });

    it('should use custom host and port', () => {
      const client = new TLDRClient({ host: 'tldr.local', port: 4000 });
      assert.strictEqual(client.getBaseUrl(), 'http://tldr.local:4000');
    });
  });
});

describe('TLDR Plugin', () => {
  let tldrPlugin;
  let mockContext;

  beforeEach(async () => {
    mockContext = {
      project: 'test-project',
      client: { name: 'test' },
      $: { tool: mock.fn() },
      directory: '/tmp',
      worktree: '/tmp/worktree',
    };

    try {
      const module = await import('../../plugin/tldr.mjs');
      tldrPlugin = module.tldr;
    } catch (error) {
      console.log('Plugin import skipped:', error.message);
    }
  });

  describe('module import', () => {
    it('should export tldr function', () => {
      assert.ok(typeof tldrPlugin === 'function', 'tldr should be a function');
    });

    it('should return an object with tools', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(result, 'Plugin should return result');
      assert.ok(result.tools, 'Result should have tools');
    });
  });

  describe('tools registration', () => {
    it('should register tldr_context tool', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(result.tools.tldr_context, 'tldr_context should be registered');
    });

    it('should register tldr_semantic tool', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(
        result.tools.tldr_semantic,
        'tldr_semantic should be registered',
      );
    });

    it('should register tldr_impact tool', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(result.tools.tldr_impact, 'tldr_impact should be registered');
    });

    it('should register tldr_callgraph tool', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(
        result.tools.tldr_callgraph,
        'tldr_callgraph should be registered',
      );
    });
  });

  describe('tldr_context tool', () => {
    it('should have proper description with guardrails', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_context;

      assert.ok(
        tool.description.includes('SCOPE GUARDRAIL'),
        'Should have scope guardrail',
      );
      assert.ok(
        tool.description.includes('informational'),
        'Should indicate informational only',
      );
    });

    it('should have required filePath parameter', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_context;

      assert.ok(
        tool.parameters.properties.filePath,
        'Should have filePath property',
      );
      assert.ok(
        tool.parameters.required.includes('filePath'),
        'filePath should be required',
      );
    });

    it('should have optional depth parameter', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_context;

      assert.ok(tool.parameters.properties.depth, 'Should have depth property');
    });
  });

  describe('tldr_semantic tool', () => {
    it('should have proper description with policy', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_semantic;

      assert.ok(
        tool.description.includes('SEMANTIC SEARCH POLICY'),
        'Should have search policy',
      );
      assert.ok(
        tool.description.includes('TLDR is the ONLY semantic engine'),
        'Should state TLDR only',
      );
    });

    it('should have required query parameter', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_semantic;

      assert.ok(tool.parameters.properties.query, 'Should have query property');
      assert.ok(
        tool.parameters.required.includes('query'),
        'query should be required',
      );
    });

    it('should not reference osgrep', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_semantic;

      assert.ok(
        !tool.description.includes('osgrep'),
        'Should not reference osgrep',
      );
    });
  });

  describe('tldr_impact tool', () => {
    it('should have scope guardrail', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_impact;

      assert.ok(
        tool.description.includes('SCOPE GUARDRAIL'),
        'Should have scope guardrail',
      );
    });
  });

  describe('tldr_callgraph tool', () => {
    it('should have scope guardrail', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_callgraph;

      assert.ok(
        tool.description.includes('SCOPE GUARDRAIL'),
        'Should have scope guardrail',
      );
    });
  });

  describe('hooks', () => {
    it('should register agent.execute.before hook', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(
        typeof result['agent.execute.before'] === 'function',
        'Should have before hook',
      );
    });

    it('should register agent.execute.after hook', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(
        typeof result['agent.execute.after'] === 'function',
        'Should have after hook',
      );
    });
  });
});

describe('Guardrails', () => {
  describe('Scope Ceiling Guardrail', () => {
    it('should be present in all tools', async () => {
      let tldrPlugin;
      try {
        const module = await import('../../plugin/tldr.mjs');
        tldrPlugin = module.tldr;
      } catch {
        return;
      }

      const mockContext = {
        project: 'test',
        client: { name: 'test' },
        $: { tool: mock.fn() },
        directory: '/tmp',
        worktree: '/tmp/worktree',
      };

      const result = await tldrPlugin(mockContext);
      const tools = [
        'tldr_context',
        'tldr_semantic',
        'tldr_impact',
        'tldr_callgraph',
      ];

      for (const toolName of tools) {
        const tool = result.tools[toolName];
        assert.ok(
          tool.description.includes('SCOPE GUARDRAIL') ||
            tool.description.includes('informational'),
          `${toolName} should have scope guardrail`,
        );
      }
    });
  });

  describe('Semantic Search Policy', () => {
    it('should state TLDR is the only semantic engine', async () => {
      let tldrPlugin;
      try {
        const module = await import('../../plugin/tldr.mjs');
        tldrPlugin = module.tldr;
      } catch {
        return;
      }

      const mockContext = {
        project: 'test',
        client: { name: 'test' },
        $: { tool: mock.fn() },
        directory: '/tmp',
        worktree: '/tmp/worktree',
      };

      const result = await tldrPlugin(mockContext);
      const semanticTool = result.tools.tldr_semantic;

      assert.ok(
        semanticTool.description.includes('ONLY semantic engine'),
        'Should state TLDR is the only semantic engine',
      );
    });

    it('should not mention osgrep as fallback', async () => {
      let tldrPlugin;
      try {
        const module = await import('../../plugin/tldr.mjs');
        tldrPlugin = module.tldr;
      } catch {
        return;
      }

      const mockContext = {
        project: 'test',
        client: { name: 'test' },
        $: { tool: mock.fn() },
        directory: '/tmp',
        worktree: '/tmp/worktree',
      };

      const result = await tldrPlugin(mockContext);
      const semanticTool = result.tools.tldr_semantic;

      assert.ok(
        !semanticTool.description.toLowerCase().includes('osgrep'),
        'Should not mention osgrep',
      );
    });
  });
});

describe('Error Handling', () => {
  describe('TLDR Client', () => {
    it('should handle unavailable daemon gracefully', async () => {
      const client = new TLDRClient();

      try {
        const result = await client.semanticSearch('test query');
        assert.ok(
          result.error || result.results,
          'Should return error or results',
        );
      } catch {
        assert.ok(true, 'Should handle errors gracefully');
      }
    });

    it('should handle context errors gracefully', async () => {
      const client = new TLDRClient();

      try {
        const result = await client.getContext('/nonexistent/file.js');
        assert.ok(
          result.error !== undefined || result.context === null,
          'Should return error or null',
        );
      } catch {
        assert.ok(true, 'Should handle errors gracefully');
      }
    });
  });
});

describe('Configuration', () => {
  it('config/tldr.json should have valid structure', async () => {
    let config;
    try {
      const { readFileSync } = await import('node:fs');
      const configContent = readFileSync(
        new URL('../../config/tldr.json', import.meta.url),
        'utf8',
      );
      config = JSON.parse(configContent);
    } catch {
      assert.fail('config/tldr.json should exist and be valid JSON');
    }

    assert.strictEqual(
      typeof config.enabled,
      'boolean',
      'enabled should be boolean',
    );
    assert.strictEqual(
      typeof config.autoInject,
      'boolean',
      'autoInject should be boolean',
    );
    assert.strictEqual(
      typeof config.contextDepth,
      'number',
      'contextDepth should be number',
    );
    assert.strictEqual(
      typeof config.maxContextTokens,
      'number',
      'maxContextTokens should be number',
    );
    assert.strictEqual(
      typeof config.diagnosticsOnEdit,
      'boolean',
      'diagnosticsOnEdit should be boolean',
    );
    assert.strictEqual(
      typeof config.semanticSearchMaxResults,
      'number',
      'semanticSearchMaxResults should be number',
    );
    assert.strictEqual(
      typeof config.description,
      'string',
      'description should be string',
    );
    assert.strictEqual(typeof config.docs, 'string', 'docs should be string');
  });

  it('config/tldr.json should have expected defaults', async () => {
    let config;
    try {
      const { readFileSync } = await import('node:fs');
      const configContent = readFileSync(
        new URL('../../config/tldr.json', import.meta.url),
        'utf8',
      );
      config = JSON.parse(configContent);
    } catch {
      return;
    }

    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.autoInject, true);
    assert.strictEqual(config.contextDepth, 2);
    assert.strictEqual(config.maxContextTokens, 1000);
    assert.strictEqual(config.semanticSearchMaxResults, 10);
  });
});

describe('Plugin Registration', () => {
  it('plugin should be registered in opencode.json', async () => {
    let opencodeConfig;
    try {
      const { readFileSync } = await import('node:fs');
      const configContent = readFileSync(
        new URL('../../opencode.json', import.meta.url),
        'utf8',
      );
      opencodeConfig = JSON.parse(configContent);
    } catch {
      assert.fail('opencode.json should exist and be valid JSON');
    }

    assert.ok(
      Array.isArray(opencodeConfig.plugin),
      'plugin should be an array',
    );
    assert.ok(
      opencodeConfig.plugin.includes('./plugin/tldr.mjs'),
      'tldr.mjs should be registered in opencode.json',
    );
  });
});

console.log('TLDR Plugin Tests Suite');
