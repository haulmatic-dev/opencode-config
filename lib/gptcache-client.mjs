import http from 'http';

export default class GPTCacheClient {
  constructor(host = '127.0.0.1', port = 8000) {
    this.host = host;
    this.port = port;
  }

  _request(path, data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: this.host,
        port: this.port,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async put(prompt, answer) {
    try {
      const result = await this._request('/put', { prompt, answer });
      return result;
    } catch (error) {
      console.error('GPTCache put error:', error.message);
      return null;
    }
  }

  async get(prompt) {
    try {
      const result = await this._request('/get', { prompt });
      return result;
    } catch (error) {
      console.error('GPTCache get error:', error.message);
      return null;
    }
  }

  async check() {
    try {
      const result = await this.get('');
      return true;
    } catch (error) {
      return false;
    }
  }
}
