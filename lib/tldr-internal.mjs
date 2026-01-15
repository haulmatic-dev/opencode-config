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
import { createContextSelector } from './tldr-context-selector.mjs';

const execAsync = promisify(exec);

export class LRUCache {
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

export class TLDRClient {
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
      return stdout.includes('running')
        ? { status: 'running' }
        : { status: 'unavailable', details: stdout };
    } catch (error) {
      return { status: 'unavailable', error: error.message };
    }
  }

  async getContext(filePath, options = {}) {
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

export class TLDRMiddleware {
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
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );

    const searchDir = (dir) => {
      if (!existsSync(dir)) return;

      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          try {
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
              if (
                !entry.startsWith('.') &&
                entry !== 'node_modules' &&
                entry !== '.git'
              ) {
                searchDir(fullPath);
              }
            } else if (regex.test(entry)) {
              results.push(fullPath);
            }
          } catch {
            // Skip inaccessible files
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    searchDir(baseDir);
    return results;
  }

  globToRegex(pattern) {
    const regexStr = pattern
      .replace(/\//g, '\\/')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    return new RegExp(`^${regexStr}$`);
  }

  filterValidFiles(files) {
    const valid = [];
    const warnings = [];

    for (const { path, type } of files) {
      if (!path || typeof path !== 'string') {
        continue;
      }

      if (!existsSync(path)) {
        warnings.push(`File not found: ${path}`);
        continue;
      }

      try {
        const stat = statSync(path);
        if (stat.isDirectory()) {
          continue;
        }

        if (this.isBinaryFile(path)) {
          warnings.push(`Skipping binary file: ${path}`);
          continue;
        }

        const sizeKB = stat.size / 1024;
        if (sizeKB > 100) {
          warnings.push(
            `Large file (${Math.round(sizeKB)}KB): ${path} - may be slow to process`,
          );
        }

        valid.push({ path, type });
      } catch (error) {
        warnings.push(`Error accessing ${path}: ${error.message}`);
      }
    }

    return { valid, warnings };
  }

  async selectAndPrioritizeFiles(fileReferences, messages) {
    const query = this.buildQueryFromMessages(messages);
    const files = fileReferences.map((r) =>
      typeof r === 'string' ? r : r.path,
    );

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
    if (!messages || messages.length === 0) return '';

    const userMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' ');

    return userMessages.slice(0, 500).replace(/["'<>]/g, ' ');
  }

  estimateContextSize(contexts) {
    if (!contexts) return 0;

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

  async getContextWithFallback(filePath, messages) {
    if (!this.enabled) {
      return { context: null, fallback: 'TLDR disabled in config' };
    }

    const fallbacks = [];

    // Check if file exists
    if (!existsSync(filePath)) {
      return {
        context: null,
        fallback: `File not found: ${filePath}`,
      };
    }

    // Check if binary
    if (this.isBinaryFile(filePath)) {
      return {
        context: null,
        fallback: `Skipping binary file: ${filePath}`,
      };
    }

    // Try to get context
    const context = await this.getCachedContext(filePath);

    if (!context || context.error) {
      fallbacks.push(
        `TLDR context failed: ${context?.error || 'unknown error'}`,
      );

      // Fallback to reading file directly
      try {
        const content = readFileSync(filePath, 'utf8');
        const lines = content.split('\n').slice(0, 100).join('\n');
        return {
          context: {
            raw: lines,
            error: 'TLDR unavailable - using raw content',
          },
          fallback: 'Used raw file content (TLDR daemon may be down)',
        };
      } catch (readError) {
        return {
          context: null,
          fallback: `Could not read file: ${readError.message}`,
        };
      }
    }

    return { context, fallbacks };
  }
}
