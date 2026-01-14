import { readFile as fsRead } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execAsync } from '../utils/exec.js';

const DEFAULT_CONTEXT_SIZE = 20;
const MAX_STACK_FRAMES = 5;

export async function distillSmartContext(taskId, task, agentType) {
  const context = {
    taskId,
    task: {
      title: task.title,
      description: task.description,
      priority: task.priority,
    },
    agentType,
    optimizationHints: [],
    relevantFiles: [],
    errors: [],
    codeSlices: [],
    diffAnalysis: null,
    astAnalysis: null,
    conflictData: null,
    rebaseState: null,
  };

  try {
    const progressLogs = await readProgressLog(taskId);

    for (const log of progressLogs) {
      if (log.result?.errors) {
        for (const error of log.result.errors) {
          const formatted = formatErrorForAgent(error);
          context.errors.push(formatted);

          if (error.stack?.includes('at')) {
            const slices = sliceStackTrace(
              error.stack,
              log.result.sourceFiles || [],
            );
            context.codeSlices.push(...slices);
            context.relevantFiles.push(...slices.map((s) => s.filePath));
          }
        }
      }

      if (log.optimizationHints && log.optimizationHints.length > 0) {
        context.optimizationHints.push(...log.optimizationHints);
      }
    }

    context.relevantFiles = [...new Set(context.relevantFiles)];

    if (agentType === 'adversarial-reviewer') {
      const diffAnalysis = await analyzeDiff(taskId);
      context.diffAnalysis = diffAnalysis;

      const astAnalysis = await analyzeASTChanges(context.relevantFiles);
      context.astAnalysis = astAnalysis;

      context.relevantFiles = diffAnalysis.changedFiles.map((f) => ({
        path: f,
        diff: diffAnalysis.fileDiffs[f],
        astAnalysis: astAnalysis[f],
      }));
    }

    if (agentType === 'conflict-resolver') {
      const conflictData = await extractConflictData();
      context.conflictData = conflictData;

      const rebaseState = await getRebaseState();
      context.rebaseState = rebaseState;
    }

    const totalSize = JSON.stringify(context).length;
    if (totalSize > 10000) {
      context.optimizationHints.push('Context truncated to fit prompt limits');
      context.codeSlices = context.codeSlices.slice(0, 3);
      if (context.diffAnalysis) {
        context.diffAnalysis = truncateDiff(context.diffAnalysis);
      }
    }
  } catch (error) {
    console.error('[SmartContext] Failed to distill context:', error.message);
  }

  return context;
}

export function sliceStackTrace(stackTrace, sourceFiles = []) {
  const slices = [];
  const lines = stackTrace.split('\n');

  for (const line of lines) {
    if (!line.trim().startsWith('at ')) continue;

    const match =
      line.match(/\(([^:]+):(\d+):(\d+)\)/) ||
      line.match(/at\s+([^:]+):(\d+):(\d+)/);
    if (!match) continue;

    const filePath = match[1];
    const lineNumber = parseInt(match[2], 10);

    if (lineNumber < 1) continue;

    const isRelevant =
      sourceFiles.length === 0 || sourceFiles.some((f) => filePath.endsWith(f));

    if (
      (isRelevant && filePath.endsWith('.js')) ||
      filePath.endsWith('.mjs') ||
      filePath.endsWith('.ts')
    ) {
      const slice = extractContextSlice(
        filePath,
        lineNumber,
        DEFAULT_CONTEXT_SIZE,
      );
      if (slice) {
        slices.push({
          filePath,
          lineNumber,
          content: slice.content,
          startLine: slice.startLine,
          endLine: slice.endLine,
        });
      }
    }

    if (slices.length >= MAX_STACK_FRAMES) break;
  }

  return slices;
}

export function formatErrorForAgent(error) {
  if (typeof error === 'string') {
    return {
      message: error,
      type: 'Error',
      suggestion: 'Review the code for potential issues',
    };
  }

  if (error instanceof Error) {
    const formatted = {
      message: error.message,
      type: error.name || 'Error',
    };

    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 10);
      formatted.stack = stackLines.join('\n');

      const firstFrame = stackLines.find((l) => l.includes('at '));
      if (firstFrame) {
        const match =
          firstFrame.match(/\(([^:]+):(\d+):(\d+)\)/) ||
          firstFrame.match(/at\s+([^:]+):(\d+):(\d+)/);
        if (match) {
          formatted.location = {
            file: match[1],
            line: parseInt(match[2], 10),
            column: parseInt(match[3], 10),
          };
        }
      }
    }

    formatted.suggestion = getSuggestionForError(error.message, error.name);
    return formatted;
  }

  return {
    message: String(error),
    type: 'Unknown',
    suggestion: 'Review the error details',
  };
}

export async function extractContextSlice(
  filePath,
  lineNumber,
  contextSize = DEFAULT_CONTEXT_SIZE,
) {
  try {
    const absolutePath = resolve(process.cwd(), filePath);
    const content = await fsRead(absolutePath, 'utf-8');
    const lines = content.split('\n');

    if (lineNumber > lines.length) {
      return null;
    }

    const halfSize = Math.floor(contextSize / 2);
    const startLine = Math.max(1, lineNumber - halfSize);
    const endLine = Math.min(lines.length, lineNumber + halfSize);
    const actualStartIndex = startLine - 1;
    const actualEndIndex = endLine;

    const slice = lines.slice(actualStartIndex, actualEndIndex);

    const errorLineIndex = lineNumber - startLine;
    const highlighted = slice.map((line, idx) => {
      if (idx === errorLineIndex) {
        return `${startLine + idx} >>> ${line}`;
      }
      return `${startLine + idx}     ${line}`;
    });

    return {
      content: highlighted.join('\n'),
      startLine,
      endLine,
      errorLineNumber: lineNumber,
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(
        `[SmartContext] Failed to read ${filePath}:`,
        error.message,
      );
    }
    return null;
  }
}

async function readProgressLog(taskId) {
  try {
    const content = await fsRead(
      resolve(process.cwd(), 'progress.txt'),
      'utf-8',
    );
    const lines = content.split('\n');

    return lines
      .filter((line) => line.trim() && line.includes(taskId))
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (_error) {
    return [];
  }
}

function getSuggestionForError(message, errorType) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('cannot read')) {
    return 'Check if the object or property is defined before accessing it';
  }
  if (lowerMessage.includes('is not a function')) {
    return 'Verify the object type and ensure the method exists';
  }
  if (lowerMessage.includes('module not found')) {
    return 'Check if the required module is installed and imported correctly';
  }
  if (lowerMessage.includes('permission denied')) {
    return 'Verify file permissions and access rights';
  }
  if (lowerMessage.includes('syntax error')) {
    return 'Check for typos, missing brackets, or invalid syntax';
  }
  if (errorType === 'TypeError') {
    return 'Check data types and ensure values match expected formats';
  }
  if (errorType === 'ReferenceError') {
    return 'Ensure variables are declared before use';
  }

  return 'Review the error and stack trace for debugging clues';
}

async function analyzeDiff(_taskId) {
  try {
    const result = await execAsync('git diff HEAD 2>&1');
    if (result.exitCode !== 0) {
      return { changedFiles: [], fileDiffs: {}, diffOutput: '' };
    }

    const diffOutput = result.stdout;
    const changedFiles = [];
    const fileDiffs = {};
    const lines = diffOutput.split('\n');
    let currentFile = null;
    let currentDiff = [];

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          fileDiffs[currentFile] = currentDiff.join('\n');
        }
        const match = line.match(/b\/(.+)$/);
        currentFile = match ? match[1] : null;
        changedFiles.push(currentFile);
        currentDiff = [line];
      } else if (currentFile) {
        currentDiff.push(line);
      }
    }

    if (currentFile) {
      fileDiffs[currentFile] = currentDiff.join('\n');
    }

    return {
      changedFiles,
      fileDiffs,
      diffOutput: diffOutput.substring(0, 5000),
      securitySensitivePatterns: identifySecurityPatterns(diffOutput),
    };
  } catch (error) {
    console.error('[SmartContext] Failed to analyze diff:', error.message);
    return { changedFiles: [], fileDiffs: {}, diffOutput: '' };
  }
}

function identifySecurityPatterns(diff) {
  const patterns = {
    hardcodedSecrets: [],
    sqlInjection: [],
    commandInjection: [],
    xss: [],
    authIssues: [],
  };

  const lines = diff.split('\n');
  lines.forEach((line) => {
    if (line.startsWith('+')) {
      if (
        /password\s*=\s*['"][^'"]+['"]/.test(line) ||
        /api[_-]?key\s*=\s*['"][^'"]+['"]/.test(line) ||
        /secret\s*=\s*['"][^'"]+['"]/.test(line)
      ) {
        patterns.hardcodedSecrets.push(line);
      }
      if (
        /query\([^)]*\+/.test(line) ||
        /execute\([^)]*\+/.test(line) ||
        /\$\{.*\}/.test(line)
      ) {
        patterns.sqlInjection.push(line);
      }
      if (/(exec|spawn|eval)\([^)]*\+/.test(line)) {
        patterns.commandInjection.push(line);
      }
      if (/(innerHTML|outerHTML)\s*=/.test(line)) {
        patterns.xss.push(line);
      }
      if (/(auth|login|authenticate).*\b(bypass|skip|disable)\b/.test(line)) {
        patterns.authIssues.push(line);
      }
    }
  });

  return patterns;
}

async function analyzeASTChanges(files) {
  const astAnalysis = {};

  for (const file of files) {
    try {
      const absolutePath = resolve(process.cwd(), file);
      const content = await fsRead(absolutePath, 'utf-8');

      astAnalysis[file] = {
        structuralChanges: extractStructuralChanges(content),
        functionChanges: extractFunctionChanges(content),
        importChanges: extractImportChanges(content),
      };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(
          `[SmartContext] Failed to analyze AST for ${file}:`,
          error.message,
        );
      }
      astAnalysis[file] = {
        error: 'Failed to analyze',
      };
    }
  }

  return astAnalysis;
}

function extractStructuralChanges(content) {
  const changes = {
    classesAdded: (content.match(/^\s*class\s+\w+/gm) || []).length,
    functionsAdded: (content.match(/^\s*(async\s+)?function\s+\w+/gm) || [])
      .length,
    arrowFunctionsAdded: (content.match(/=>/g) || []).length,
  };

  return changes;
}

function extractFunctionChanges(content) {
  const functions = [];
  const functionRegex = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm;
  let match;

  do {
    match = functionRegex.exec(content);
    if (match) {
      functions.push(match[1]);
    }
  } while (match);

  return { functionNames: functions };
}

function extractImportChanges(content) {
  const imports = [];
  const importRegex = /^import\s+.*from\s+['"](.+?)['"]/gm;
  let match;

  do {
    match = importRegex.exec(content);
    if (match) {
      imports.push(match[1]);
    }
  } while (match);

  return { imports };
}

function truncateDiff(diffAnalysis) {
  if (!diffAnalysis) return null;

  const truncated = {
    ...diffAnalysis,
    diffOutput: diffAnalysis.diffOutput?.substring(0, 2000) || '',
    fileDiffs: {},
  };

  const fileCount = Math.min(Object.keys(diffAnalysis.fileDiffs).length, 5);

  for (const [file, diff] of Object.entries(diffAnalysis.fileDiffs).slice(
    0,
    fileCount,
  )) {
    truncated.fileDiffs[file] = diff.substring(0, 500);
  }

  return truncated;
}

async function extractConflictData() {
  try {
    const statusResult = await execAsync('git status --porcelain 2>&1');
    if (statusResult.exitCode !== 0) {
      return null;
    }

    const conflictedFiles = statusResult.stdout
      .split('\n')
      .filter((line) => line.trim()?.startsWith('UU'))
      .map((line) => line.trim().substring(3));

    if (conflictedFiles.length === 0) {
      return null;
    }

    const conflictData = {};
    const threeWayDiff = {};

    for (const file of conflictedFiles) {
      try {
        const absolutePath = resolve(process.cwd(), file);
        const content = await fsRead(absolutePath, 'utf-8');

        const conflictMarkers = extractConflictMarkers(content);
        const threeWay = await extractThreeWayDiff(file);

        conflictData[file] = conflictMarkers;
        threeWayDiff[file] = threeWay;
      } catch (error) {
        console.error(
          `[SmartContext] Failed to read conflicted file ${file}:`,
          error.message,
        );
      }
    }

    return {
      conflictedFiles,
      conflictMarkers: conflictData,
      threeWayDiff,
    };
  } catch (error) {
    console.error(
      '[SmartContext] Failed to extract conflict data:',
      error.message,
    );
    return null;
  }
}

function extractConflictMarkers(content) {
  const lines = content.split('\n');
  const markers = {
    head: [],
    incoming: [],
    conflicts: [],
  };

  let inConflict = false;
  let _conflictStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('<<<<<<<')) {
      inConflict = true;
      _conflictStart = i;
      markers.conflicts.push({ start: i, line });
    } else if (line.startsWith('=======') && inConflict) {
      markers.conflicts[markers.conflicts.length - 1].separator = i;
    } else if (line.startsWith('>>>>>>>') && inConflict) {
      inConflict = false;
      markers.conflicts[markers.conflicts.length - 1].end = i;
    }
  }

  return markers;
}

async function extractThreeWayDiff(file) {
  try {
    const result = await execAsync(
      `git diff --ours --theirs --base ${file} 2>&1`,
    );
    if (result.exitCode !== 0) {
      return { hunks: [] };
    }

    const diffOutput = result.stdout;
    const hunks = [];

    const hunkRegex = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/gm;
    let match;

    do {
      match = hunkRegex.exec(diffOutput);
      if (match) {
        hunks.push({
          startLine: parseInt(match[3], 10),
          linesRemoved: match[2] ? parseInt(match[2], 10) : 1,
          linesAdded: match[4] ? parseInt(match[4], 10) : 1,
        });
      }
    } while (match);

    return { hunks, diffOutput: diffOutput.substring(0, 2000) };
  } catch (error) {
    console.error(
      `[SmartContext] Failed to extract 3-way diff for ${file}:`,
      error.message,
    );
    return { hunks: [] };
  }
}

async function getRebaseState() {
  try {
    const branchResult = await execAsync('git branch --show-current 2>&1');
    const currentBranch = branchResult.stdout.trim();

    const rebaseDir = resolve(process.cwd(), '.git/rebase-merge');
    const isRebasing = await fsRead(rebaseDir).catch(() => null);

    if (!isRebasing) {
      return null;
    }

    const ontoContent = await fsRead(resolve(rebaseDir, 'onto'), 'utf-8');
    const targetBranch = ontoContent.trim();

    return {
      currentBranch,
      targetBranch,
      hasConflicts: true,
      isRebasing: true,
    };
  } catch (error) {
    console.error('[SmartContext] Failed to get rebase state:', error.message);
    return null;
  }
}
