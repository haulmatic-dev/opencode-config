import fs from 'fs';
import path from 'path';

let cacheMiddleware = null;

async function createDefaultCacheMiddleware() {
  const GPTCacheClient = await import('../lib/gptcache-client.js');
  
  class GPTCacheMiddleware {
    constructor(options = {}) {
      this.enabled = options.enabled !== false;
      this.client = new GPTCacheClient.default(options.host, options.port);
      this.cacheKeyPrefix = options.cacheKeyPrefix || 'opencode';
    }

    async getCachedResponse(model, messages) {
      if (!this.enabled) return null;

      try {
        const prompt = messages
          .filter(m => m.role === 'user')
          .map(m => m.content)
          .join('\n');
        
        const result = await this.client.get(prompt);
        
        if (result && result.answer) {
          return {
            cached: true,
            content: result.answer
          };
        }
        return null;
      } catch (error) {
        console.error('[GPTCache] Error getting cached response:', error.message);
        return null;
      }
    }

    async cacheResponse(model, messages, response) {
      if (!this.enabled) return;

      try {
        const prompt = messages
          .filter(m => m.role === 'user')
          .map(m => m.content)
          .join('\n');
        
        const answer = typeof response === 'string' 
          ? response 
          : JSON.stringify(response);
        
        await this.client.put(prompt, answer);
      } catch (error) {
        console.error('[GPTCache] Error caching response:', error.message);
      }
    }
  }

  return GPTCacheMiddleware;
}

export const gptcache = async ({ project, client, $, directory, worktree }) => {
  const configPath = path.join(__dirname, '..', 'gptcache_config.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configContent);
  
  if (!cacheMiddleware) {
    const GPTCacheMiddleware = await createDefaultCacheMiddleware();
    cacheMiddleware = new GPTCacheMiddleware({
      enabled: config.enabled,
      host: '127.0.0.1',
      port: 8000,
      cacheKeyPrefix: 'opencode'
    });
  }

  return {
    'chat.message': async (input, output) => {
      const { sessionID, agent, model, message, variant } = input;
      const { message: userMessage, parts } = output;
    },
    
    'chat.params': async (input, output) => {
      const { sessionID, agent, model, provider, message } = input;
    },
    
    'agent.execute.before': async (input, output) => {
      const { sessionID, agent, model, messages } = input;
      
      if (!cacheMiddleware || !config.enabled || !model) {
        return;
      }
      
      const cached = await cacheMiddleware.getCachedResponse(model, messages);
      
      if (cached && cached.cached) {
        output.response = cached.content;
        output.cached = true;
      }
    },
    
    'agent.execute.after': async (input, output) => {
      const { sessionID, agent, model, messages } = input;
      const { response, error } = output;
      
      if (!cacheMiddleware || !config.enabled || !model || error) {
        return;
      }
      
      if (!response) {
        return;
      }
      
      await cacheMiddleware.cacheResponse(model, messages, response);
    }
  };
};
