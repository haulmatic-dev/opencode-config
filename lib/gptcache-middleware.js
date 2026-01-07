const GPTCacheClient = require('./gptcache-client');

class GPTCacheMiddleware {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.cache = new GPTCacheClient(options.host, options.port);
    this.cacheKeyPrefix = options.cacheKeyPrefix || 'opencode';
  }

  _generateCacheKey(model, messages) {
    const prompt = messages
      .map(m => `${m.role}:${m.content}`)
      .join('\n');
    return `${this.cacheKeyPrefix}:${model}:${Buffer.from(prompt).toString('base64')}`;
  }

  async getCachedResponse(model, messages) {
    if (!this.enabled) return null;

    try {
      const prompt = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n');
      
      const result = await this.cache.get(prompt);
      
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
      
      await this.cache.put(prompt, answer);
      console.log('[GPTCache] Response cached');
    } catch (error) {
      console.error('[GPTCache] Error caching response:', error.message);
    }
  }

  async wrap(model, messages, llmCall) {
    const cached = await this.getCachedResponse(model, messages);
    
    if (cached) {
      return cached.content;
    }

    const response = await llmCall();
    await this.cacheResponse(model, messages, response);
    
    return response;
  }
}

module.exports = GPTCacheMiddleware;
