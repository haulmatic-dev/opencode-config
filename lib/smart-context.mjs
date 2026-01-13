import { spawn } from 'node:child_process';

export async function extractStackFrames(stackTrace, options = {}) {
  const maxFrames = options.maxFrames || 10;
  const infrastructurePatterns = [
    /node_modules/,
    /\.mjs:\d+/,
    /\/usr\/lib/,
    /\/opt\/homebrew/,
  ];

  const lines = stackTrace.split('\n');
  const frames = [];

  for (const line of lines) {
    const match = line.match(/at (.+):(\d+):/);
    if (!match) continue;

    const frame = match[1];
    if (infrastructurePatterns.some((p) => frame.match(p))) continue;

    frames.push({
      function: match[0],
      line: parseInt(match[2]),
      code: frame.trim().substring(0, 100),
    });

    if (frames.length >= maxFrames) break;
  }

  return frames.slice(0, maxFrames);
}

export async function extractMinimalContext(error, maxContextSize = 2000) {
  const stackMatch = error.stack?.match(/Error:\s*(.+)/) || [error];
  const stackTrace = stackMatch[1];

  if (!stackTrace) {
    return { error, frames: [] };
  }

  const frames = await extractStackFrames(stackTrace, { maxFrames: 5 });

  return {
    error: stackMatch[0],
    frames: frames.map((f) => ({
      file: f.code.split(':')[0],
      line: f.line,
      snippet: f.code.substring(0, 50),
    })),
    totalChars: JSON.stringify(frames).length,
  };
}

export async function optimizeContextForAgent(context, agentType) {
  const agentContextPreferences = {
    'fix-specialist': { maxFrames: 3, maxSnippetLength: 30 },
    'adversarial-reviewer': { maxFrames: 15, maxSnippetLength: 200 },
    'conflict-resolver': { maxFrames: 10, maxSnippetLength: 150 },
  };

  const prefs = agentContextPreferences[agentType] || {
    maxFrames: 10,
    maxSnippetLength: 100,
  };

  return context.frames.slice(0, prefs.maxFrames);
}
