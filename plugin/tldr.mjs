import { exec } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { promisify } from 'node:util';
import { createContextSelector } from '../lib/tldr-context-selector.mjs';

const execAsync = promisify(exec);

const DEFAULT_CONTEXT = `# Project Context
- This is an opencode project with TLDR semantic code analysis enabled
- TLDR provides structured code context (AST, call graph, imports) for files
- Use tldr_context to get context for any file you need to understand
- Use tldr_semantic to search code semantically when you need to find related code
- Use tldr_impact to understand what code might be affected by changes

## Scope Guardrails
- TLDR output is informational only
- Do NOT expand task scope based on TLDR findings without creating a new Beads task
- If you discover the scope is larger than expected, document findings and stop
`;

class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }
}

class TLDRClient {
  constructor() {
    this.pythonPath =
      process.env.TLDR_PYTHON ||
      '/Users/buddhi/.pyenv/versions/3.11.0/bin/python';
    this.tldrPath =
      process.env.TLDR_PATH || '/Users/buddhi/.pyenv/versions/3.11.0/bin/tldr';
    this.timeout = 15000;
  }

  async isAvailable() {
    try {
      const { stdout } = await execAsync(`${this.tldrPath} --version`, {
        timeout: 5000,
      });
      return stdout.includes('tldr');
    } catch {
      return false;
    }
  }

  async healthCheck() {
    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} daemon status 2>&1 || echo '{"status":"unavailable"}'`,
        { timeout: this.timeout },
      );
      return stdout.includes('Status:')
        ? { status: 'running' }
        : { status: 'unavailable', details: stdout };
    } catch (error) {
      return { status: 'unavailable', error: error.message };
    }
  }

  async ensureDaemon() {
    const status = await this.healthCheck();
    if (status.status !== 'running') {
      await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} daemon start`,
        {
          timeout: 10000,
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  async getContext(filePath, options = {}) {
    await this.ensureDaemon();
    const depth = options.depth || 2;
    const maxTokens = options.maxTokens || 1000;

    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} context "${filePath}" --project . --depth ${depth} 2>&1`,
        { timeout: this.timeout },
      );
      return this.parseTLDROutput(stdout, { context: null });
    } catch (error) {
      console.error('[TLDR] Error getting context:', error.message);
      return { error: error.message, context: null };
    }
  }

  async semanticSearch(query, options = {}) {
    await this.ensureDaemon();
    const maxResults = options.maxResults || 10;

    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} semantic "${query.replace(/"/g, '\\"')}" . --max-results ${maxResults} 2>&1`,
        { timeout: this.timeout },
      );
      return this.parseTLDROutput(stdout, { results: [] });
    } catch (error) {
      console.error('[TLDR] Error in semantic search:', error.message);
      return { error: error.message, results: [] };
    }
  }

  async getCallGraph(functionName, options = {}) {
    await this.ensureDaemon();
    const depth = options.depth || 2;

    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} impact "${functionName}" . --depth ${depth} 2>&1`,
        { timeout: this.timeout },
      );
      return this.parseTLDROutput(stdout, { callers: [], callees: [] });
    } catch (error) {
      console.error('[TLDR] Error getting call graph:', error.message);
      return { error: error.message, callers: [], callees: [] };
    }
  }

  async getImpact(filePath, options = {}) {
    await this.ensureDaemon();
    const depth = options.depth || 2;

    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} impact "${filePath}" . --depth ${depth} 2>&1`,
        { timeout: this.timeout },
      );
      return this.parseTLDROutput(stdout, { impact: null });
    } catch (error) {
      console.error('[TLDR] Error getting impact:', error.message);
      return { error: error.message, impact: null };
    }
  }

  async getSlice(filePath, functionName, line, options = {}) {
    await this.ensureDaemon();
    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} slice "${filePath}" "${functionName}" ${line} 2>&1`,
        { timeout: this.timeout },
      );
      return this.parseTLDROutput(stdout, { slice: null });
    } catch (error) {
      console.error('[TLDR] Error getting slice:', error.message);
      return { error: error.message, slice: null };
    }
  }

  async getCFG(filePath, functionName, options = {}) {
    await this.ensureDaemon();
    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} cfg "${filePath}" "${functionName}" 2>&1`,
        { timeout: this.timeout },
      );
      return this.parseTLDROutput(stdout, { cfg: null });
    } catch (error) {
      console.error('[TLDR] Error getting CFG:', error.message);
      return { error: error.message, cfg: null };
    }
  }

  async getDFG(filePath, functionName, options = {}) {
    await this.ensureDaemon();
    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} dfg "${filePath}" "${functionName}" 2>&1`,
        { timeout: this.timeout },
      );
      return this.parseTLDROutput(stdout, { dfg: null });
    } catch (error) {
      console.error('[TLDR] Error getting DFG:', error.message);
      return { error: error.message, dfg: null };
    }
  }

  async getArchitecture(path, options = {}) {
    await this.ensureDaemon();
    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} arch "${path}" 2>&1`,
        { timeout: this.timeout },
      );
      return this.parseTLDROutput(stdout, { arch: null });
    } catch (error) {
      console.error('[TLDR] Error getting architecture:', error.message);
      return { error: error.message, arch: null };
    }
  }

  async findDeadCode(path, options = {}) {
    await this.ensureDaemon();
    try {
      const { stdout } = await execAsync(
        `cd /Users/buddhi/.config/opencode && ${this.tldrPath} dead "${path}" 2>&1`,
        { timeout: this.timeout },
      );
      return this.parseTLDROutput(stdout, { dead: null });
    } catch (error) {
      console.error('[TLDR] Error finding dead code:', error.message);
      return { error: error.message, dead: null };
    }
  }

  parseTLDROutput(stdout, fallback) {
    const text = stdout.trim();
    if (!text) return fallback;

    try {
      return JSON.parse(text);
    } catch {
      return { text, ...fallback };
    }
  }
}

class TLDRMiddleware {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.client = new TLDRClient();
    this.contextDepth = options.contextDepth || 2;
    this.maxContextTokens = options.maxContextTokens || 1000;
    this.autoInject = options.autoInject !== false;
    this.semanticSearchMaxResults = options.semanticSearchMaxResults || 10;
    this.contextCache = new LRUCache(50);
    this.contextSelector = createContextSelector({
      maxFiles: options.maxInjectFiles || 5,
      maxContextTokens: this.maxContextTokens,
    });
    this.scopeCeilingFiles = options.scopeCeilingFiles || 10;
    this.scopeCeilingTokens = options.scopeCeilingTokens || 5000;
    this.logger = options.logger || console;
  }

  async isDaemonAvailable() {
    return await this.client.isAvailable();
  }

  async getContextForFile(filePath) {
    if (!this.enabled) return null;

    try {
      const context = await this.client.getContext(filePath, {
        depth: this.contextDepth,
        maxTokens: this.maxContextTokens,
      });

      if (context && !context.error) {
        return context;
      }

      return null;
    } catch (error) {
      console.error('[TLDRMiddleware] Error getting context:', error.message);
      return null;
    }
  }

  async semanticSearch(query) {
    if (!this.enabled) return { results: [], error: 'TLDR disabled' };

    try {
      const results = await this.client.semanticSearch(query, {
        maxResults: this.semanticSearchMaxResults,
      });

      if (results && !results.error) {
        return results;
      }

      return { results: [], error: results?.error || 'Unknown error' };
    } catch (error) {
      return { results: [], error: error.message };
    }
  }

  formatContextAsSystemPrompt(context) {
    if (!context) return '';

    const parts = [];

    if (context.functions && context.functions.length > 0) {
      parts.push('## Code Structure (from TLDR)\n');
      context.functions.slice(0, 10).forEach((fn) => {
        parts.push(
          `- ${fn.name} (${fn.type}) at line ${fn.line}: ${fn.signature || ''}`,
        );
      });
      parts.push('');
    }

    if (context.imports && context.imports.length > 0) {
      parts.push('## Imports\n');
      context.imports.slice(0, 5).forEach((imp) => {
        parts.push(`- ${imp}`);
      });
      parts.push('');
    }

    if (context.callGraph && context.callGraph.length > 0) {
      parts.push('## Call Graph (top level)\n');
      context.callGraph.slice(0, 5).forEach((cg) => {
        parts.push(
          `- ${cg.function} calls: ${cg.callees?.join(', ') || 'none'}`,
        );
      });
      parts.push('');
    }

    return parts.join('\n');
  }

  async getCachedContext(filePath) {
    const cached = this.contextCache.get(filePath);
    if (cached) {
      this.logger.log(`[TLDR] Cache hit: ${filePath}`);
      return cached;
    }

    const context = await this.getContextForFile(filePath);
    if (context) {
      this.contextCache.set(filePath, context);
    }
    return context;
  }

  isBinaryFile(filePath) {
    const binaryExtensions = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.bmp',
      '.ico',
      '.webp',
      '.pdf',
      '.zip',
      '.gz',
      '.tar',
      '.tgz',
      '.7z',
      '.rar',
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.class',
      '.jar',
      '.mp3',
      '.mp4',
      '.avi',
      '.mkv',
      '.wav',
      '.flac',
      '.db',
      '.sqlite',
      '.mdb',
    ];
    const ext = '.' + filePath.split('.').pop().toLowerCase();
    return binaryExtensions.includes(ext);
  }

  async extractFilePaths(
    messageContent,
    baseDir = '/Users/buddhi/.config/opencode',
  ) {
    const filePaths = [];
    const filePattern =
      /["']([^"']+\.(js|ts|py|java|cpp|c|h|rs|go|rb|php|swift|kotlin))["']/g;
    const globPattern = /["']([^"']*[*?][^"']*)["']/g;

    let match;
    while ((match = filePattern.exec(messageContent)) !== null) {
      let filePath = match[1];
      if (!filePath.startsWith('/')) {
        filePath = `${baseDir}/${filePath}`;
      }
      filePaths.push({ path: filePath, type: 'direct' });
    }

    while ((match = globPattern.exec(messageContent)) !== null) {
      const pattern = match[1];
      if (pattern.includes('*') || pattern.includes('?')) {
        try {
          const matches = this.simpleGlob(pattern, baseDir);
          for (const m of matches.slice(0, 50)) {
            filePaths.push({ path: m, type: 'glob' });
          }
        } catch (err) {
          this.logger.warn(
            `[TLDR] Glob pattern failed: ${pattern}`,
            err.message,
          );
        }
      }
    }

    return filePaths;
  }

  simpleGlob(pattern, baseDir) {
    const results = [];
    const normalizedPattern = pattern.replace(/\\/g, '/');
    const parts = normalizedPattern.split('/');
    let currentDir = baseDir;

    if (pattern.startsWith('/')) {
      currentDir = '/';
      parts[0] = '';
    }

    const prefixLen = pattern.startsWith('/') ? 1 : 0;
    const searchParts = parts.slice(prefixLen, -1);
    const filePattern = parts[parts.length - 1];

    if (searchParts.length > 0) {
      let searchDir = searchParts.join('/');
      if (!pattern.startsWith('/')) {
        searchDir = `${baseDir}/${searchDir}`;
      }
      if (existsSync(searchDir) && lstatSync(searchDir).isDirectory()) {
        currentDir = searchDir;
      } else {
        return results;
      }
    }

    if (!existsSync(currentDir) || !lstatSync(currentDir).isDirectory()) {
      return results;
    }

    const regex = this.globToRegex(filePattern);

    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && regex.test(entry.name)) {
          results.push(join(currentDir, entry.name));
        }
      }
    } catch {
      return results;
    }

    return results;
  }

  globToRegex(pattern) {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`, 'i');
  }

  filterValidFiles(fileReferences) {
    const valid = [];
    const warnings = [];

    for (const ref of fileReferences) {
      if (!existsSync(ref.path)) {
        warnings.push(`File not found: ${ref.path}`);
        continue;
      }

      if (this.isBinaryFile(ref.path)) {
        warnings.push(`Skipping binary file: ${ref.path}`);
        continue;
      }

      try {
        const stats = statSync(ref.path);
        if (stats.size > 100000) {
          warnings.push(`Large file (>100KB), will use summary: ${ref.path}`);
        }
        valid.push(ref);
      } catch (err) {
        warnings.push(`Error accessing ${ref.path}: ${err.message}`);
      }
    }

    return { valid, warnings };
  }

  async selectAndPrioritizeFiles(fileReferences, messages) {
    const query = this.buildQueryFromMessages(messages);
    const files = fileReferences.map((r) => r.path);

    const selected = this.contextSelector.selectRelevantFiles(files, query);
    const prioritized = this.contextSelector.prioritizeByDepth(selected);

    if (prioritized.length > this.scopeCeilingFiles) {
      this.logger.warn(
        `[TLDR] Scope ceiling: ${prioritized.length} files, limiting to ${this.scopeCeilingFiles}`,
      );
      return prioritized.slice(0, this.scopeCeilingFiles);
    }

    return prioritized;
  }

  buildQueryFromMessages(messages) {
    const userMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' ');
    const query = userMessages.slice(0, 500);
    return query.replace(/["'<>]/g, ' ');
  }

  estimateContextSize(contexts) {
    let totalSize = 0;
    for (const ctx of contexts) {
      if (ctx.functions) {
        for (const fn of ctx.functions) {
          totalSize += (fn.code || '').length;
        }
      }
    }
    return Math.ceil(totalSize / 4);
  }

  async getContextWithFallback(filePath) {
    try {
      const context = await this.getCachedContext(filePath);
      if (context) return { success: true, context, fallback: null };

      const directContext = await this.getContextForFile(filePath);
      if (directContext) {
        return { success: true, context: directContext, fallback: null };
      }

      return {
        success: false,
        context: null,
        fallback: 'Manual code review required - TLDR unavailable',
      };
    } catch (error) {
      this.logger.error(`[TLDR] Context error for ${filePath}:`, error.message);
      return {
        success: false,
        context: null,
        fallback: `Error: ${error.message}`,
      };
    }
  }
}

let middleware = null;

const tldr = async ({
  project: _project,
  client: _client,
  $: _$,
  directory: _directory,
  worktree: _worktree,
}) => {
  const configPath = new URL('../config/tldr.json', import.meta.url);
  let config = { enabled: true };

  try {
    const configContent = readFileSync(configPath, 'utf8');
    config = JSON.parse(configContent);
  } catch (_e) {
    console.log('[TLDR] No config found, using defaults');
  }

  if (!middleware) {
    middleware = new TLDRMiddleware({
      enabled: config.enabled,
      contextDepth: config.contextDepth || 2,
      maxContextTokens: config.maxContextTokens || 1000,
      autoInject: config.autoInject !== false,
      semanticSearchMaxResults: config.semanticSearchMaxResults || 10,
    });
  }

  const daemonAvailable = await middleware.isDaemonAvailable();
  if (!daemonAvailable && config.enabled) {
    console.log(
      '[TLDR] Daemon not available - semantic search will alert users',
    );
  }

  return {
    tools: {
      tldr_context: {
        description: `Extract structured code context (AST, call graph, imports) for a file.

⚠️ SCOPE GUARDRAIL: This tool reveals dependencies but does NOT authorize scope expansion.
If impact shows more affected code than your task scope:
1. STOP work
2. Create new Beads task with findings
3. Wait for task approval before proceeding

TLDR output is informational, not permissive.`,
        parameters: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to file to analyze',
            },
            depth: {
              type: 'number',
              description: 'Call graph depth (1-5)',
              default: 2,
            },
            maxTokens: {
              type: 'number',
              description: 'Max tokens for context',
              default: 1000,
            },
          },
          required: ['filePath'],
        },
        fn: async ({ filePath, depth = 2, maxTokens = 1000 }) => {
          const result = await middleware.getContextForFile(filePath);
          if (result) {
            return {
              success: true,
              context: result,
              formatted: middleware.formatContextAsSystemPrompt(result),
            };
          }
          return { success: false, error: 'Failed to get context', filePath };
        },
      },

      tldr_semantic: {
        description: `Semantic code search using TLDR embeddings (bge-large-en-v1.5).

⚠️ SCOPE GUARDRAIL: This tool reveals dependencies but does NOT authorize scope expansion.
If impact shows more affected code than your task scope:
1. STOP work
2. Create new Beads task with findings
3. Wait for task approval before proceeding

⚠️ SEMANTIC SEARCH POLICY: TLDR is the ONLY semantic engine available.

If TLDR daemon is unavailable:
- Alert user that semantic search is unavailable
- Fall back to grep with clear warning
- Never attempt other semantic search tools

TLDR output is informational, not permissive.`,
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: {
              type: 'number',
              description: 'Max results',
              default: 10,
            },
          },
          required: ['query'],
        },
        fn: async ({ query, maxResults = 10 }) => {
          const result = await middleware.semanticSearch(query);
          if (result.results && result.results.length > 0) {
            return {
              success: true,
              results: result.results,
              count: result.results.length,
            };
          }
          return {
            success: false,
            error: result.error || 'No results found',
            query,
            fallback: 'Use grep as last resort',
          };
        },
      },

      tldr_impact: {
        description: `Analyze impact of changes to a file (callers, callees, tests).

⚠️ SCOPE GUARDRAIL: This tool reveals dependencies but does NOT authorize scope expansion.
If impact analysis shows more affected code than your task scope:
1. STOP work
2. Create new Beads task with findings
3. Wait for task approval before proceeding

TLDR output is informational, not permissive.`,
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to file' },
            depth: {
              type: 'number',
              description: 'Analysis depth',
              default: 2,
            },
          },
          required: ['filePath'],
        },
        fn: async ({ filePath, depth = 2 }) => {
          try {
            const impact = await middleware.client.getImpact(filePath, {
              depth,
            });
            if (impact && !impact.error) {
              return { success: true, impact };
            }
            return {
              success: false,
              error: impact?.error || 'Failed to get impact',
              filePath,
            };
          } catch (error) {
            return { success: false, error: error.message, filePath };
          }
        },
      },

      tldr_callgraph: {
        description: `Get call graph for a function (who calls it, what it calls).

⚠️ SCOPE GUARDRAIL: This tool reveals dependencies but does NOT authorize scope expansion.
If call graph shows more affected code than your task scope:
1. STOP work
2. Create new Beads task with findings
3. Wait for task approval before proceeding

TLDR output is informational, not permissive.`,
        parameters: {
          type: 'object',
          properties: {
            functionName: { type: 'string', description: 'Function name' },
            depth: { type: 'number', description: 'Call depth', default: 2 },
            direction: {
              type: 'string',
              enum: ['callers', 'callees', 'both'],
              default: 'both',
            },
          },
          required: ['functionName'],
        },
        fn: async ({ functionName, depth = 2, direction = 'both' }) => {
          try {
            const graph = await middleware.client.getCallGraph(functionName, {
              depth,
              direction,
            });
            if (graph && !graph.error) {
              return { success: true, callGraph: graph };
            }
            return {
              success: false,
              error: graph?.error || 'Failed to get call graph',
              functionName,
            };
          } catch (error) {
            return { success: false, error: error.message, functionName };
          }
        },
      },

      tldr_slice: {
        description: `Program slicing - shows only code that affects a specific line. Killer feature for debugging.

⚠️ SCOPE GUARDRAIL: Program slicing is for DEBUGGING ONLY.
Allowed uses:
- Debugging existing defects
- Understanding control/data flow within task scope

PROHIBITED uses:
- Justifying refactors
- Architectural changes
- Cross-module edits
- Any behavior change outside active task`,
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to file' },
            lineNumber: {
              type: 'number',
              description: 'Line number to slice from',
            },
            criterion: {
              type: 'string',
              enum: ['data', 'control', 'both'],
              default: 'data',
            },
          },
          required: ['filePath', 'lineNumber'],
        },
        fn: async ({ filePath, lineNumber, criterion = 'data' }) => {
          try {
            const slice = await middleware.client.slice(filePath, lineNumber, {
              criterion,
            });
            if (slice && !slice.error) {
              return { success: true, slice };
            }
            return {
              success: false,
              error: slice?.error || 'Failed to get slice',
              filePath,
              lineNumber,
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
              filePath,
              lineNumber,
            };
          }
        },
      },

      tldr_cfg: {
        description: `Get control flow graph for a file or function. Shows branches, loops, and complexity.

⚠️ SCOPE GUARDRAIL: This tool reveals structure but does NOT authorize scope expansion.
If CFG shows more complexity than expected:
1. Document findings
2. Do not expand task scope without approval`,
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to file' },
          },
          required: ['filePath'],
        },
        fn: async ({ filePath }) => {
          try {
            const cfg = await middleware.client.getControlFlow(filePath);
            if (cfg && !cfg.error) {
              return { success: true, controlFlow: cfg };
            }
            return {
              success: false,
              error: cfg?.error || 'Failed to get control flow',
              filePath,
            };
          } catch (error) {
            return { success: false, error: error.message, filePath };
          }
        },
      },

      tldr_dfg: {
        description: `Get data flow analysis for a function. Tracks variable definitions and uses.

⚠️ SCOPE GUARDRAIL: This tool reveals data dependencies but does NOT authorize scope expansion.
Use for understanding variable flows within task scope only.`,
        parameters: {
          type: 'object',
          properties: {
            functionName: { type: 'string', description: 'Function name' },
          },
          required: ['functionName'],
        },
        fn: async ({ functionName }) => {
          try {
            const dfg = await middleware.client.getDataFlow(functionName);
            if (dfg && !dfg.error) {
              return { success: true, dataFlow: dfg };
            }
            return {
              success: false,
              error: dfg?.error || 'Failed to get data flow',
              functionName,
            };
          } catch (error) {
            return { success: false, error: error.message, functionName };
          }
        },
      },

      tldr_arch: {
        description: `Get architecture layer analysis for a project. Shows module dependencies and architecture violations.

⚠️ SCOPE GUARDRAIL: This tool reveals architectural structure but does NOT authorize refactoring.
If violations are found:
1. Document them
2. Do not fix without explicit task approval`,
        parameters: {
          type: 'object',
          properties: {
            projectRoot: {
              type: 'string',
              description: 'Project root directory',
            },
          },
          required: ['projectRoot'],
        },
        fn: async ({ projectRoot }) => {
          try {
            const arch = await middleware.client.getArchitecture(projectRoot);
            if (arch && !arch.error) {
              return { success: true, architecture: arch };
            }
            return {
              success: false,
              error: arch?.error || 'Failed to get architecture',
              projectRoot,
            };
          } catch (error) {
            return { success: false, error: error.message, projectRoot };
          }
        },
      },

      tldr_dead: {
        description: `Find dead code in a project. Detects unreachable functions, unused variables, and uncalled code.

⚠️ SCOPE GUARDRAIL: This tool reveals dead code but does NOT authorize removal.
If dead code is found:
1. Document findings
2. Do not remove without explicit task approval`,
        parameters: {
          type: 'object',
          properties: {
            projectRoot: {
              type: 'string',
              description: 'Project root directory',
            },
          },
          required: ['projectRoot'],
        },
        fn: async ({ projectRoot }) => {
          try {
            const deadCode = await middleware.client.findDeadCode(projectRoot);
            if (deadCode && !deadCode.error) {
              return { success: true, deadCode };
            }
            return {
              success: false,
              error: deadCode?.error || 'Failed to find dead code',
              projectRoot,
            };
          } catch (error) {
            return { success: false, error: error.message, projectRoot };
          }
        },
      },
    },

    'agent.execute.before': async (input, output) => {
      const { model, messages, session_id } = input;

      if (!middleware || !config.enabled || !model) {
        middleware?.logger?.log(
          '[TLDR] Hook skipped: middleware disabled or no model',
        );
        return;
      }

      middleware.logger.log(
        `[TLDR] Hook executing for session ${session_id || 'unknown'}`,
      );

      try {
        const allFileRefs = [];
        for (const msg of messages) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            const refs = await middleware.extractFilePaths(msg.content);
            allFileRefs.push(...refs);
          }
        }

        const { valid, warnings } = middleware.filterValidFiles(allFileRefs);

        if (warnings.length > 0) {
          middleware.logger.log('[TLDR] File extraction warnings:', warnings);
        }

        if (valid.length === 0) {
          middleware.logger.log(
            '[TLDR] No valid file references found, using default context',
          );
          output.systemPrompt = DEFAULT_CONTEXT;
          output.tldrContext = { default: true };
          return;
        }

        const prioritizedFiles = await middleware.selectAndPrioritizeFiles(
          valid,
          messages,
        );

        middleware.logger.log(
          `[TLDR] Selected ${prioritizedFiles.length} files for context injection`,
        );

        const contextResults = await Promise.all(
          prioritizedFiles.map((f) => middleware.getContextWithFallback(f)),
        );

        const validContexts = [];
        const fallbacks = [];

        for (const result of contextResults) {
          if (result.success && result.context) {
            validContexts.push(result.context);
          } else if (result.fallback) {
            fallbacks.push(result.fallback);
          }
        }

        if (validContexts.length === 0) {
          middleware.logger.warn(
            '[TLDR] All context lookups failed, using default',
          );
          output.systemPrompt = DEFAULT_CONTEXT;
          output.tldrContext = { default: true, fallbacks };
          return;
        }

        const combinedContext = mergeContexts(validContexts);
        const estimatedTokens = middleware.estimateContextSize(validContexts);

        if (estimatedTokens > middleware.scopeCeilingTokens) {
          middleware.logger.warn(
            `[TLDR] Context exceeds scope ceiling (${estimatedTokens} > ${middleware.scopeCeilingTokens}), optimizing`,
          );
          const optimized = middleware.contextSelector.optimizeForTokenLimit(
            combinedContext,
            middleware.scopeCeilingTokens,
          );
          combinedContext.functions = optimized.functions;
        }

        const systemPrompt =
          middleware.formatContextAsSystemPrompt(combinedContext);

        if (systemPrompt) {
          output.systemPrompt =
            systemPrompt +
            (fallbacks.length > 0
              ? `\n\n## Context Warnings\n${fallbacks.join('\n')}`
              : '');
          output.tldrContext = {
            ...combinedContext,
            files: prioritizedFiles,
            estimatedTokens,
            fallbacks,
          };
          middleware.logger.log(
            `[TLDR] Injected context for ${prioritizedFiles.length} files (${estimatedTokens} tokens)`,
          );
        }
      } catch (error) {
        middleware.logger.error('[TLDR] Hook error:', error.message);
        output.systemPrompt = DEFAULT_CONTEXT;
        output.tldrContext = { default: true, error: error.message };
      }
    },

    'agent.execute.after': async (input, output) => {
      if (!middleware || !config.enabled) {
        return;
      }

      const modifiedFiles = output.modifiedFiles || [];
      if (modifiedFiles.length === 0) {
        return;
      }

      if (config.diagnosticsOnEdit) {
        console.log(
          '[TLDR] Running shift-left diagnostics on modified files...',
        );

        const impacts = await Promise.all(
          modifiedFiles
            .slice(0, 5)
            .map((f) =>
              middleware.client.getImpact(f, { depth: 2 }).catch(() => null),
            ),
        );

        const issues = impacts.filter((i) => i && !i.error && i.impact);
        if (issues.length > 0) {
          console.log('[TLDR] Diagnostics results:');
          issues.forEach((impact, idx) => {
            const file = modifiedFiles[idx];
            const callers = impact.impact.callers?.length || 0;
            const tests = impact.impact.tests?.length || 0;
            console.log(
              `  ${file}: ${callers} callers, ${tests} tests affected`,
            );
          });
        }
      }
    },
  };
};

function extractRelevantFiles(messages) {
  const files = [];
  const filePattern = /["']([^"']*\.(js|ts|py|java|cpp|c|h|rs|go|rb))["']/g;

  messages.forEach((m) => {
    if (m.role === 'user' || m.role === 'assistant') {
      let match;
      while ((match = filePattern.exec(m.content)) !== null) {
        if (!files.includes(match[1])) {
          files.push(match[1]);
        }
      }
    }
  });

  return files;
}

function mergeContexts(contexts) {
  const merged = {
    functions: [],
    imports: [],
    callGraph: [],
  };

  contexts.forEach((ctx) => {
    if (ctx.functions) {
      merged.functions.push(...ctx.functions);
    }
    if (ctx.imports) {
      merged.imports.push(...ctx.imports);
    }
    if (ctx.callGraph) {
      merged.callGraph.push(...ctx.callGraph);
    }
  });

  const seen = new Set();
  merged.functions = merged.functions.filter((f) => {
    if (seen.has(f.name)) return false;
    seen.add(f.name);
    return true;
  });

  return merged;
}

export { tldr };
