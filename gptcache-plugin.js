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
    'chat.params': async (input, output) => {
      const { agent, model, provider, message } = input;
      
      if (cacheMiddleware && config.enabled) {
        console.log('[GPTCache] Monitoring chat request for model:', model.modelID);
      }
    },
    
    'chat.message': async (input, output) => {
      const { sessionID, model, message, variant } = input;
      
      if (!model) return;
      
      const { message: userMessage, parts } = output;
      
      if (cacheMiddleware && config.enabled) {
        console.log('[GPTCache] Could cache this request for model:', model.modelID);
      }
    }
  };
}

module.exports = {
  gptcachePlugin,
  cacheMiddleware: () => cacheMiddleware
};
