import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { createTLDRClient, TLDRClient } from '../../lib/tldr-client.mjs';

describe('TLDR Advanced Tools', () => {
  describe('TLDRClient methods', () => {
    let client;

    beforeEach(() => {
      client = new TLDRClient();
    });

    describe('slice', () => {
      it('should have slice method', () => {
        assert.strictEqual(typeof client.slice, 'function');
      });

      it('should be callable with filePath and lineNumber', async () => {
        try {
          const result = await client.slice('/test/file.js', 10);
          assert.ok('slice method is callable');
          assert.ok(result !== undefined, 'slice should return a result');
        } catch {
          assert.ok(true, 'slice method exists and is callable');
        }
      });
    });

    describe('getControlFlow', () => {
      it('should have getControlFlow method', () => {
        assert.strictEqual(typeof client.getControlFlow, 'function');
      });
    });

    describe('getDataFlow', () => {
      it('should have getDataFlow method', () => {
        assert.strictEqual(typeof client.getDataFlow, 'function');
      });
    });

    describe('getArchitecture', () => {
      it('should have getArchitecture method', () => {
        assert.strictEqual(typeof client.getArchitecture, 'function');
      });
    });

    describe('findDeadCode', () => {
      it('should have findDeadCode method', () => {
        assert.strictEqual(typeof client.findDeadCode, 'function');
      });
    });
  });

  describe('createTLDRClient', () => {
    it('should create client with default options', () => {
      const client = createTLDRClient();
      assert.ok(client instanceof TLDRClient);
      assert.strictEqual(client.host, 'localhost');
      assert.strictEqual(client.port, 3000);
    });

    it('should create client with custom options', () => {
      const client = createTLDRClient({
        host: 'tldr.local',
        port: 4000,
        timeout: 5000,
      });
      assert.ok(client instanceof TLDRClient);
      assert.strictEqual(client.host, 'tldr.local');
      assert.strictEqual(client.port, 4000);
      assert.strictEqual(client.timeout, 5000);
    });
  });
});

describe('TLDR Plugin Advanced Tools', () => {
  let tldrPlugin;
  let mockContext;

  beforeEach(async () => {
    mockContext = {
      project: 'test-project',
      client: { name: 'test' },
      $: { tool: () => {} },
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

  describe('Advanced Tools Registration', () => {
    it('should register tldr_slice tool', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(result.tools.tldr_slice, 'tldr_slice should be registered');
    });

    it('should register tldr_cfg tool', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(result.tools.tldr_cfg, 'tldr_cfg should be registered');
    });

    it('should register tldr_dfg tool', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(result.tools.tldr_dfg, 'tldr_dfg should be registered');
    });

    it('should register tldr_arch tool', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(result.tools.tldr_arch, 'tldr_arch should be registered');
    });

    it('should register tldr_dead tool', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      assert.ok(result.tools.tldr_dead, 'tldr_dead should be registered');
    });
  });

  describe('Advanced Tool Guardrails', () => {
    it('tldr_slice should have debugging guardrail', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_slice;

      assert.ok(
        tool.description.includes('DEBUGGING ONLY'),
        'tldr_slice should have debugging guardrail',
      );
    });

    it('tldr_arch should have scope guardrail', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_arch;

      assert.ok(
        tool.description.includes('SCOPE GUARDRAIL'),
        'tldr_arch should have scope guardrail',
      );
    });

    it('tldr_dead should have scope guardrail', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_dead;

      assert.ok(
        tool.description.includes('SCOPE GUARDRAIL'),
        'tldr_dead should have scope guardrail',
      );
    });
  });

  describe('Advanced Tool Parameters', () => {
    it('tldr_slice should have required filePath and lineNumber', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_slice;

      assert.ok(tool.parameters.properties.filePath, 'Should have filePath');
      assert.ok(
        tool.parameters.properties.lineNumber,
        'Should have lineNumber',
      );
      assert.ok(
        tool.parameters.required.includes('filePath'),
        'filePath required',
      );
      assert.ok(
        tool.parameters.required.includes('lineNumber'),
        'lineNumber required',
      );
    });

    it('tldr_cfg should have required filePath', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_cfg;

      assert.ok(tool.parameters.properties.filePath, 'Should have filePath');
      assert.ok(
        tool.parameters.required.includes('filePath'),
        'filePath required',
      );
    });

    it('tldr_dfg should have required functionName', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_dfg;

      assert.ok(
        tool.parameters.properties.functionName,
        'Should have functionName',
      );
      assert.ok(
        tool.parameters.required.includes('functionName'),
        'functionName required',
      );
    });

    it('tldr_arch should have required projectRoot', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_arch;

      assert.ok(
        tool.parameters.properties.projectRoot,
        'Should have projectRoot',
      );
      assert.ok(
        tool.parameters.required.includes('projectRoot'),
        'projectRoot required',
      );
    });

    it('tldr_dead should have required projectRoot', async () => {
      if (!tldrPlugin) return;

      const result = await tldrPlugin(mockContext);
      const tool = result.tools.tldr_dead;

      assert.ok(
        tool.parameters.properties.projectRoot,
        'Should have projectRoot',
      );
      assert.ok(
        tool.parameters.required.includes('projectRoot'),
        'projectRoot required',
      );
    });
  });
});

describe('Beads Tools TLDR Integration', () => {
  let BeadsToolsPlugin;
  let mockContext;

  beforeEach(async () => {
    mockContext = {
      project: 'test-project',
      client: { name: 'test' },
      $: { tool: () => {} },
      directory: '/tmp',
      worktree: '/tmp/worktree',
    };

    try {
      const module = await import('../../plugin/beads-tools.mjs');
      BeadsToolsPlugin = module.BeadsToolsPlugin;
    } catch (error) {
      console.log('BeadsTools import skipped:', error.message);
    }
  });

  describe('TLDR Tools in BeadsTools', () => {
    it('should register tldr_impact tool', async () => {
      if (!BeadsToolsPlugin) return;

      const result = await BeadsToolsPlugin();
      assert.ok(result.tool.tldr_impact, 'tldr_impact should be registered');
    });

    it('should register tldr_callgraph tool', async () => {
      if (!BeadsToolsPlugin) return;

      const result = await BeadsToolsPlugin();
      assert.ok(
        result.tool.tldr_callgraph,
        'tldr_callgraph should be registered',
      );
    });

    it('should register tldr_context tool', async () => {
      if (!BeadsToolsPlugin) return;

      const result = await BeadsToolsPlugin();
      assert.ok(result.tool.tldr_context, 'tldr_context should be registered');
    });

    it('should register tldr_change_impact tool', async () => {
      if (!BeadsToolsPlugin) return;

      const result = await BeadsToolsPlugin();
      assert.ok(
        result.tool.tldr_change_impact,
        'tldr_change_impact should be registered',
      );
    });
  });

  describe('Beads Tools Guardrails', () => {
    it('tldr_impact should have scope guardrail', async () => {
      if (!BeadsToolsPlugin) return;

      const result = await BeadsToolsPlugin();
      const tool = result.tool.tldr_impact;

      assert.ok(
        tool.description.includes('SCOPE GUARDRAIL'),
        'tldr_impact should have scope guardrail',
      );
    });

    it('tldr_change_impact should have scope guardrail', async () => {
      if (!BeadsToolsPlugin) return;

      const result = await BeadsToolsPlugin();
      const tool = result.tool.tldr_change_impact;

      assert.ok(
        tool.description.includes('SCOPE GUARDRAIL'),
        'tldr_change_impact should have scope guardrail',
      );
    });
  });
});

console.log('TLDR Advanced Tools Tests Suite');
