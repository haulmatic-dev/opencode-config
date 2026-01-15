import { statSync } from 'node:fs';
import { dirname, join } from 'node:path';

export class TLDRContextSelector {
  constructor(options = {}) {
    this.maxFiles = options.maxFiles || 3;
    this.maxContextTokens = options.maxContextTokens || 1000;
    this.priorityPatterns = [
      /^(src|lib|app|components|controllers|services|models)/,
      /^(tests?|spec|mocks)/,
      /^(docs?|documentation)/,
      /^(config|utils|helpers)/,
    ];
  }

  selectRelevantFiles(files, query) {
    if (!files || files.length === 0) {
      return [];
    }

    const scored = files.map((file) => {
      let score = 0;

      // Score based on query relevance
      const queryLower = query.toLowerCase();
      const fileLower = file.toLowerCase();

      if (fileLower.includes(queryLower)) {
        score += 10;
      }

      // Score based on path priority
      for (let i = 0; i < this.priorityPatterns.length; i++) {
        if (this.priorityPatterns[i].test(file)) {
          score += (this.priorityPatterns.length - i) * 5;
          break;
        }
      }

      // Prefer smaller files (likely more focused)
      try {
        const stats = statSync(file);
        const size = stats.size;
        if (size < 1000) score += 3;
        else if (size < 5000) score += 2;
        else if (size < 20000) score += 1;
      } catch {
        // File might not exist, ignore
      }

      return { file, score };
    });

    // Sort by score descending and take top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, this.maxFiles).map((s) => s.file);
  }

  prioritizeByDepth(files) {
    if (!files || files.length === 0) {
      return [];
    }

    return files
      .map((file) => {
        const depth = file.split('/').length;
        return { file, depth };
      })
      .sort((a, b) => a.depth - b.depth)
      .map((s) => s.file);
  }

  filterByExtension(
    files,
    extensions = [
      '.js',
      '.ts',
      '.py',
      '.java',
      '.cpp',
      '.c',
      '.h',
      '.rs',
      '.go',
    ],
  ) {
    if (!files || files.length === 0) {
      return [];
    }

    return files.filter((file) => {
      const ext = '.' + file.split('.').pop();
      return extensions.includes(ext);
    });
  }

  estimateContextSize(files) {
    let totalSize = 0;
    for (const file of files) {
      try {
        totalSize += statSync(file).size;
      } catch {
        // Ignore
      }
    }
    // Rough estimate: 4 chars per token
    return Math.ceil(totalSize / 4);
  }

  shouldAnalyze(filePath, lastAnalyzed = new Map()) {
    try {
      const stats = statSync(filePath);
      const mtime = stats.mtimeMs;
      const lastMtime = lastAnalyzed.get(filePath) || 0;

      if (mtime > lastMtime) {
        lastAnalyzed.set(filePath, mtime);
        return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  createContextPlan(files, query, tldrClient) {
    const relevantFiles = this.selectRelevantFiles(files, query);
    const prioritizedFiles = this.prioritizeByDepth(relevantFiles);
    const contextSize = this.estimateContextSize(prioritizedFiles);

    return {
      files: prioritizedFiles,
      estimatedTokens: contextSize,
      needsOptimization: contextSize > this.maxContextTokens,
      strategy: contextSize > this.maxContextTokens ? 'reduce' : 'full',
    };
  }

  optimizeForTokenLimit(context, maxTokens = this.maxContextTokens) {
    if (!context || !context.functions) {
      return context;
    }

    // Keep functions until we hit token limit
    const keptFunctions = [];
    let tokenCount = 0;

    for (const fn of context.functions) {
      const fnTokens = (fn.code || '').split(/\s+/).length;
      if (tokenCount + fnTokens <= maxTokens) {
        keptFunctions.push(fn);
        tokenCount += fnTokens;
      } else {
        break;
      }
    }

    return {
      ...context,
      functions: keptFunctions,
      optimization: {
        originalCount: context.functions?.length || 0,
        keptCount: keptFunctions.length,
        tokensUsed: tokenCount,
      },
    };
  }
}

export function createContextSelector(options = {}) {
  return new TLDRContextSelector(options);
}
