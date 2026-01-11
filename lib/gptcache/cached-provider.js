const GPTCacheMiddleware = require('./lib/gptcache-middleware');

const cacheMiddleware = new GPTCacheMiddleware({
  enabled: true,
  host: '127.0.0.1',
  port: 8000,
  cacheKeyPrefix: 'opencode'
});

async function createCachedProvider(baseProvider) {
  return {
    ...baseProvider,
    async chat(messages, options = {}) {
      const model = options.model || 'default';
      
      const cached = await cacheMiddleware.getCachedResponse(model, messages);
      
      if (cached) {
        return cached.content;
      }
      
      const response = await baseProvider.chat(messages, options);
      await cacheMiddleware.cacheResponse(model, messages, response);
      
      return response;
    },
    
    async stream(messages, options = {}) {
      const model = options.model || 'default';
      
      const cached = await cacheMiddleware.getCachedResponse(model, messages);
      
      if (cached) {
        return cached.content;
      }
      
      const stream = await baseProvider.stream(messages, options);
      
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        yield chunk;
      }
      
      await cacheMiddleware.cacheResponse(model, messages, fullResponse);
    }
  };
}

module.exports = {
  createCachedProvider,
  cacheMiddleware
};
