import { appendFile as fsAppend, readFile as fsRead } from 'node:fs/promises';
import { join } from 'node:path';

export async function logProgress(taskId, stage, context, result) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    taskId,
    stage,
    stageCompletion: result?.success ? 'completed' : 'failed',
    contextSize: JSON.stringify(context).length,
    optimizationHints: context.optimizationHints || [],
    errorsEncountered: result?.errors || [],
    codeSlices: context.codeSlices || [],
    relevantFiles: context.relevantFiles || [],
    result: result,
  };

  const logLine = `${JSON.stringify(logEntry)}\n`;

  try {
    await fsAppend(join(process.cwd(), 'progress.txt'), logLine);
    console.log(
      `[Progress] Logged stage completion: ${stage} for task ${taskId}`,
    );
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
  } catch (_error) {
    return [];
  }
}

export function formatContextForPrompt(context) {
  if (!context) {
    return '';
  }

  const sections = [];

  if (context.task) {
    sections.push(`Task: ${context.task.title}`);
    sections.push(`Description: ${context.task.description}`);
    sections.push(`Priority: ${context.task.priority}`);
  }

  if (context.instructions) {
    sections.push(`Instructions: ${context.instructions}`);
  }

  if (context.errors && context.errors.length > 0) {
    sections.push(
      `Previous Errors:\n${context.errors.map((e) => `- ${e.message} (${e.type})`).join('\n')}`,
    );
  }

  if (context.optimizationHints && context.optimizationHints.length > 0) {
    sections.push(
      `Optimization Hints:\n${context.optimizationHints.map((h) => `- ${h}`).join('\n')}`,
    );
  }

  if (context.codeSlices && context.codeSlices.length > 0) {
    sections.push(
      `Relevant Code Slices:\n${context.codeSlices
        .map((s) => `- ${s.filePath}:${s.lineNumber}\n${s.content}`)
        .join('\n\n')}`,
    );
  }

  if (context.relevantFiles && context.relevantFiles.length > 0) {
    const filePaths = context.relevantFiles
      .map((f) => (typeof f === 'string' ? f : f.path))
      .join(', ');
    sections.push(`Relevant Files: ${filePaths}`);
  }

  if (context.codebaseContext) {
    sections.push(`Codebase Context: ${context.codebaseContext}`);
  }

  if (context.diffAnalysis) {
    sections.push(
      `Diff Analysis: ${JSON.stringify(context.diffAnalysis, null, 2).substring(0, 500)}...`,
    );
  }

  return sections.join('\n\n');
}
