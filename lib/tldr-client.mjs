import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class TLDRClient {
  constructor(options = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 3000;
    this.timeout = options.timeout || 10000;
  }

  getBaseUrl() {
    return `http://${this.host}:${this.port}`;
  }

  async isAvailable() {
    try {
      const cmd = `curl -s -o /dev/null -w "%{http_code}" ${this.getBaseUrl()}/health 2>/dev/null || echo "000"`;
      const { stdout } = await execAsync(cmd, { timeout: 2000 });
      return stdout.trim() === '200';
    } catch {
      return false;
    }
  }

  async healthCheck() {
    try {
      const cmd = `curl -s ${this.getBaseUrl()}/health`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      return { status: 'unavailable', error: error.message };
    }
  }

  async getContext(filePath, options = {}) {
    const depth = options.depth || 2;
    const maxTokens = options.maxTokens || 1000;

    try {
      const cmd = `curl -s -X POST ${this.getBaseUrl()}/context \\
        -H "Content-Type: application/json" \\
        -d '{"file":"${filePath}","depth":${depth},"max_tokens":${maxTokens}}'`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[TLDR Client] Error getting context:', error.message);
      return { error: error.message, context: null };
    }
  }

  async semanticSearch(query, options = {}) {
    const maxResults = options.maxResults || 10;

    try {
      const cmd = `curl -s -X POST ${this.getBaseUrl()}/semantic \\
        -H "Content-Type: application/json" \\
        -d '{"query":"${query.replace(/"/g, '\\"')}","max_results":${maxResults}}'`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[TLDR Client] Error in semantic search:', error.message);
      return { error: error.message, results: [] };
    }
  }

  async getCallGraph(functionName, options = {}) {
    const depth = options.depth || 2;
    const direction = options.direction || 'both';

    try {
      const cmd = `curl -s -X POST ${this.getBaseUrl()}/callgraph \\
        -H "Content-Type: application/json" \\
        -d '{"function":"${functionName}","depth":${depth},"direction":"${direction}}'`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[TLDR Client] Error getting call graph:', error.message);
      return { error: error.message, callers: [], callees: [] };
    }
  }

  async getImpact(filePath, options = {}) {
    const depth = options.depth || 2;

    try {
      const cmd = `curl -s -X POST ${this.getBaseUrl()}/impact \\
        -H "Content-Type: application/json" \\
        -d '{"file":"${filePath}","depth":${depth}}'`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[TLDR Client] Error getting impact:', error.message);
      return { error: error.message, impact: null };
    }
  }

  async getControlFlow(filePath, options = {}) {
    try {
      const cmd = `curl -s -X POST ${this.getBaseUrl()}/controlflow \\
        -H "Content-Type: application/json" \\
        -d '{"file":"${filePath}"}'`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[TLDR Client] Error getting control flow:', error.message);
      return { error: error.message, controlFlow: null };
    }
  }

  async getDataFlow(functionName, options = {}) {
    try {
      const cmd = `curl -s -X POST ${this.getBaseUrl()}/dataflow \\
        -H "Content-Type: application/json" \\
        -d '{"function":"${functionName}"}'`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[TLDR Client] Error getting data flow:', error.message);
      return { error: error.message, dataFlow: null };
    }
  }

  async slice(filePath, lineNumber, options = {}) {
    const criterion = options.criterion || 'data';

    try {
      const cmd = `curl -s -X POST ${this.getBaseUrl()}/slice \\
        -H "Content-Type: application/json" \\
        -d '{"file":"${filePath}","line":${lineNumber},"criterion":"${criterion}"}'`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[TLDR Client] Error getting slice:', error.message);
      return { error: error.message, slice: null };
    }
  }

  async getArchitecture(projectRoot, options = {}) {
    try {
      const cmd = `curl -s -X POST ${this.getBaseUrl()}/architecture \\
        -H "Content-Type: application/json" \\
        -d '{"project":"${projectRoot}"}'`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[TLDR Client] Error getting architecture:', error.message);
      return { error: error.message, architecture: null };
    }
  }

  async findDeadCode(projectRoot, options = {}) {
    try {
      const cmd = `curl -s -X POST ${this.getBaseUrl()}/deadcode \\
        -H "Content-Type: application/json" \\
        -d '{"project":"${projectRoot}"}'`;
      const { stdout } = await execAsync(cmd, { timeout: this.timeout });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[TLDR Client] Error finding dead code:', error.message);
      return { error: error.message, deadCode: null };
    }
  }
}

export function createTLDRClient(options = {}) {
  return new TLDRClient(options);
}
