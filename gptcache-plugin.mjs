import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cacheMiddleware = null;

async function loadCacheMiddleware() {
  const middlewarePath = path.join(__dirname, 'lib', 'gptcache-middleware.js');
  const module = await import(middlewarePath);
  return module.default;
}

async function createDefaultCacheMiddleware() {
  const GPTCacheClient = await import('./lib/gptcache-client.js');
  
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
          console.log('[GPTCache] Cache HIT');
          return {
            cached: true,
            content: result.answer
          };
        }
        
        console.log('[GPTCache] Cache MISS');
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
        console.log('[GPTCache] Response cached');
      } catch (error) {
        console.error('[GPTCache] Error caching response:', error.message);
      }
    }
  }

  return GPTCacheMiddleware;
}

export const gptcachePlugin = async (input) => {
  const { project, directory, client } = input;
  
  const configPath = path.join(__dirname, 'gptcache_config.json');
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

  console.log('[GPTCache Plugin] Initialized');
  console.log('[GPTCache] Cache is', config.enabled ? 'ENABLED' : 'DISABLED');

  return {
    'chat.message': async (input, output) => {
      const { sessionID, agent, model, message, variant } = input;
      const { message: userMessage, parts } = output;
      
      console.log('[GPTCache] chat.message called - agent:', agent, 'model:', model?.modelID);
    },
    
    'chat.params': async (input, output) => {
      const { sessionID, agent, model, provider, message } = input;
      
      console.log('[GPTCache] chat.params called - message count:', message?.length);
    },
    
    'agent.execute.before': async (input, output) => {
      console.log('[GPTCache] agent.execute.before called');
      const { sessionID, agent, model, messages } = input;
      
      if (!cacheMiddleware || !config.enabled || !model) {
        console.log('[GPTCache] Skipping - cache disabled or no model');
        return;
      }
      
      console.log('[GPTCache] Checking cache for agent:', agent, 'model:', model.modelID);
      
      const cached = await cacheMiddleware.getCachedResponse(model, messages);
      
      if (cached && cached.cached) {
        console.log('[GPTCache] ✓ Cache HIT - returning cached response');
        output.response = cached.content;
        output.cached = true;
      }
    },
    
    'agent.execute.after': async (input, output) => {
      console.log('[GPTCache] agent.execute.after called');
      const { sessionID, agent, model, messages } = input;
      const { response, error } = output;
      
      if (!cacheMiddleware || !config.enabled || !model || error) {
        console.log('[GPTCache] Skipping - cache disabled, no model, or error:', error?.message);
        return;
      }
      
      if (!response) {
        console.log('[GPTCache] No response to cache');
        return;
      }
      
      await cacheMiddleware.cacheResponse(model, messages, response);
      console.log('[GPTCache] Response cached for agent:', agent);
    }
  };
};
