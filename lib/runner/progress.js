import { appendFile as fsAppend, readFile as fsRead } from 'node:fs/promises';
import { join } from 'node:path';

export async function logProgress(taskId, stage, context, result) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    taskId,
    stage,
    contextSize: JSON.stringify(context).length,
    optimizationHints: context.optimizationHints || [],
    result: result,
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    await fsAppend(join(process.cwd(), 'progress.txt'), logLine);
  } catch (error) {
    console.error('[Progress] Failed to append to progress.txt:', error);
  }
}

export async function readProgressLog(taskId) {
  try {
    const content = await fsRead(join(process.cwd(), 'progress.txt'), 'utf-8');
    const lines = content.split('\n');

    const relevantLogs = lines
      .filter((line) => line.includes(taskId))
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return relevantLogs;
  } catch (error) {
    return [];
  }
}
