const GPTCacheMiddleware = require('./lib/gptcache-middleware');

let cacheMiddleware = null;

async function gptcachePlugin(input) {
  const { project, directory, client } = input;
  
  const config = require('./gptcache_config.json');
  
  cacheMiddleware = new GPTCacheMiddleware({
    enabled: config.enabled,
    host: '127.0.0.1',
    port: 8000,
    cacheKeyPrefix: 'opencode'
  });

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
}

module.exports = gptcachePlugin;
