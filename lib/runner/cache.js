import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CACHE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.cache',
  'opencode',
  'gates',
);
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

export class GateCache {
  constructor(options = {}) {
    this.cacheDir =
      options.cacheDir || process.env.OPENCODE_GATES_CACHE || DEFAULT_CACHE_DIR;
    this.ttl = options.ttl || DEFAULT_TTL;
    this.enabled = options.enabled !== false;
    this.hitCount = 0;
    this.missCount = 0;
    this._ensureCacheDir();
  }

  _ensureCacheDir() {
    if (this.enabled && !fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  _getFileHash(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  _generateFilesHash(files) {
    if (!files || files.length === 0) {
      return 'no-files';
    }
    const hashes = files
      .map((f) => this._getFileHash(f))
      .filter((h) => h !== null)
      .sort();
    return crypto.createHash('sha256').update(hashes.join('')).digest('hex');
  }

  _getCacheKey(gateName, files) {
    const filesHash = this._generateFilesHash(files);
    return `${gateName}-${filesHash}`;
  }

  _getCachePath(cacheKey) {
    return path.join(this.cacheDir, `${cacheKey}.json`);
  }

  async get(gateName, files, strategy = 'default') {
    if (!this.enabled) {
      return null;
    }

    try {
      const cacheKey = this._getCacheKey(gateName, files);
      const cachePath = this._getCachePath(cacheKey);

      if (!fs.existsSync(cachePath)) {
        this.missCount++;
        return null;
      }

      const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));

      if (data.strategy !== strategy) {
        this.missCount++;
        return null;
      }

      const now = Date.now();
      const expiresAt = data.timestamp + this.ttl;

      if (now > expiresAt) {
        fs.unlinkSync(cachePath);
        this.missCount++;
        return null;
      }

      this.hitCount++;
      console.log(`[Cache] HIT for gate: ${gateName}`);
      return data.result;
    } catch (error) {
      console.warn(`[Cache] Read error: ${error.message}`);
      this.missCount++;
      return null;
    }
  }

  async set(gateName, files, result, strategy = 'default') {
    if (!this.enabled) {
      return;
    }

    try {
      const cacheKey = this._getCacheKey(gateName, files);
      const cachePath = this._getCachePath(cacheKey);

      const data = {
        cacheKey,
        gateName,
        strategy,
        timestamp: Date.now(),
        files: files || [],
        result,
      };

      fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
      console.log(`[Cache] SET for gate: ${gateName}`);
    } catch (error) {
      console.warn(`[Cache] Write error: ${error.message}`);
    }
  }

  async invalidate(gateName, files) {
    try {
      const cacheKey = this._getCacheKey(gateName, files);
      const cachePath = this._getCachePath(cacheKey);

      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
        console.log(`[Cache] INVALIDATED for gate: ${gateName}`);
      }
    } catch (error) {
      console.warn(`[Cache] Invalidate error: ${error.message}`);
    }
  }

  async clear() {
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(this.cacheDir, file));
          }
        }
        console.log('[Cache] CLEARED');
      }
    } catch (error) {
      console.warn(`[Cache] Clear error: ${error.message}`);
    }
  }

  async getStats() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return { size: 0, files: 0 };
      }

      const files = fs
        .readdirSync(this.cacheDir)
        .filter((f) => f.endsWith('.json'));
      let totalSize = 0;

      for (const file of files) {
        const stat = fs.statSync(path.join(this.cacheDir, file));
        totalSize += stat.size;
      }

      const total = this.hitCount + this.missCount;
      const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;

      return {
        size: totalSize,
        files: files.length,
        dir: this.cacheDir,
        hitCount: this.hitCount,
        missCount: this.missCount,
        hitRate,
      };
    } catch (error) {
      return { size: 0, files: 0, error: error.message };
    }
  }
}

export const gateCache = new GateCache();
