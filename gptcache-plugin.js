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
}

module.exports = gptcachePlugin;
