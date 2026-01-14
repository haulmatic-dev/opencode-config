import { exec } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

class CassMemoryClient {
  constructor() {
    this.enabled = true;
  }

  async getContext(task, options = {}) {
    if (!this.enabled) {
      return { relevantBullets: [], antiPatterns: [], historySnippets: [] };
    }

    try {
      const limit = options.limit || 5;
      const cmd = `cm context "${task}" --json --limit ${limit}`;
      const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024 });
      const result = JSON.parse(stdout);

      if (result.success && result.data) {
        return result.data;
      }

      return { relevantBullets: [], antiPatterns: [], historySnippets: [] };
    } catch (error) {
      console.error('[CassMemory] Error getting context:', error.message);
      return { relevantBullets: [], antiPatterns: [], historySnippets: [] };
    }
  }

  async markHelpful(bulletId, reason = '') {
    try {
      const cmd = reason
        ? `cm mark ${bulletId} --helpful --reason "${reason}"`
        : `cm mark ${bulletId} --helpful`;
      await execAsync(cmd);
    } catch (error) {
      console.error('[CassMemory] Error marking helpful:', error.message);
    }
  }

  async markHarmful(bulletId, reason = '') {
    try {
      const cmd = reason
        ? `cm mark ${bulletId} --harmful --reason "${reason}"`
        : `cm mark ${bulletId} --harmful`;
      await execAsync(cmd);
    } catch (error) {
      console.error('[CassMemory] Error marking harmful:', error.message);
    }
  }

  async recordOutcome(status, ruleIds) {
    try {
      const rules = ruleIds.join(' ');
      const cmd = `cm outcome ${status} ${rules}`;
      await execAsync(cmd);
    } catch (error) {
      console.error('[CassMemory] Error recording outcome:', error.message);
    }
  }
}

class CassMemoryMiddleware {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.client = new CassMemoryClient();
    this.contextLimit = options.contextLimit || 5;
    this.autoInject = options.autoInject !== false;
  }

  async getContextForMessages(messages) {
    if (!this.enabled) return null;

    try {
      const task = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join('\n')
        .slice(0, 500);

      const context = await this.client.getContext(task, {
        limit: this.contextLimit,
      });

      if (
        context &&
        (context.relevantBullets.length > 0 ||
          context.antiPatterns.length > 0 ||
          context.historySnippets.length > 0)
      ) {
        return context;
      }

      return null;
    } catch (error) {
      console.error(
        '[CassMemoryMiddleware] Error getting context:',
        error.message,
      );
      return null;
    }
  }

  formatContextAsSystemPrompt(context) {
    if (!context) return '';

    const parts = [];

    if (context.relevantBullets && context.relevantBullets.length > 0) {
      parts.push('## Relevant Rules (from cass_memory)\n');
      context.relevantBullets.forEach((bullet, idx) => {
        parts.push(`${idx + 1}. [${bullet.id}] ${bullet.content}`);
      });
      parts.push('');
    }

    if (context.antiPatterns && context.antiPatterns.length > 0) {
      parts.push('## Anti-Patterns to Avoid (from cass_memory)\n');
      context.antiPatterns.forEach((pattern, idx) => {
        parts.push(`${idx + 1}. [${pattern.id}] ${pattern.content}`);
      });
      parts.push('');
    }

    if (context.historySnippets && context.historySnippets.length > 0) {
      parts.push('## Similar Past Sessions (from cass_memory)\n');
      context.historySnippets.slice(0, 3).forEach((snippet, idx) => {
        parts.push(
          `${idx + 1}. ${snippet.title || 'Session'}: ${snippet.snippet?.slice(0, 200) || ''}...`,
        );
      });
      parts.push('');
    }

    return parts.join('\n');
  }
}

let middleware = null;

export const cass = async ({
  project: _project,
  client: _client,
  $: _$,
  directory: _directory,
  worktree: _worktree,
}) => {
  const configPath = new URL('../config/cass.json', import.meta.url);
  let config = { enabled: true };

  try {
    const configContent = readFileSync(configPath, 'utf8');
    config = JSON.parse(configContent);
  } catch (_e) {
    console.log('[CassMemory] No config found, using defaults');
  }

  if (!middleware) {
    middleware = new CassMemoryMiddleware({
      enabled: config.enabled,
      contextLimit: config.contextLimit || 5,
      autoInject: config.autoInject !== false,
    });
  }

  return {
    'agent.execute.before': async (input, output) => {
      const { model, messages } = input;

      if (!middleware || !config.enabled || !model) {
        return;
      }

      const context = await middleware.getContextForMessages(messages);

      if (context && middleware.autoInject) {
        const systemPrompt = middleware.formatContextAsSystemPrompt(context);

        if (systemPrompt) {
          output.systemPrompt = systemPrompt;
          output.cassContext = context;
        }
      }
    },

    'agent.execute.after': async (_input, output) => {
      const { error } = output;

      if (!middleware || !config.enabled) {
        return;
      }

      const context = output.cassContext;

      if (!context) return;

      if (error) {
        if (context.relevantBullets.length > 0) {
          const ruleIds = context.relevantBullets.map((b) => b.id);
          await middleware.client.recordOutcome('failed', ruleIds);
        }
        return;
      }

      if (context.relevantBullets.length > 0) {
        const ruleIds = context.relevantBullets.map((b) => b.id);
        await middleware.client.recordOutcome('success', ruleIds);
      }
    },
  };
};
