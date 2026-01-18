import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_HOURS = 4;
const MAX_FILES = 3;
const MAX_AC = 3;

const PHASE = {
  RESEARCH: 'research',
  IMPLEMENTATION: 'implementation',
};

function extractFiles(task) {
  const files = new Set();

  if (task.files) {
    for (const file of task.files) {
      files.add(file);
    }
  }

  if (task.acceptanceCriteria) {
    for (const ac of task.acceptanceCriteria) {
      const matches = ac.match(/[`'"](\S+\.\w+)[`'"]/g);
      if (matches) {
        for (const match of matches) {
          files.add(match.replace(/[`'"]/g, ''));
        }
      }
    }
  }

  return Array.from(files);
}

function estimateDuration(task) {
  const files = extractFiles(task);
  const acCount = task.acceptanceCriteria?.length || 0;
  const complexity = task.complexity || 'medium';

  const complexityMultipliers = {
    low: 0.5,
    medium: 1,
    high: 2,
  };

  const baseHours = files.length * 0.5 + acCount * 0.75;
  const adjustedHours = baseHours * (complexityMultipliers[complexity] || 1);

  return Math.ceil(adjustedHours);
}

function analyzeTaskInternal(task) {
  const issues = [];
  const suggestions = [];

  const files = extractFiles(task);
  const acCount = task.acceptanceCriteria?.length || 0;
  const estimatedHours = estimateDuration(task);

  if (files.length > MAX_FILES) {
    issues.push(`Too many files: ${files.length} (max: ${MAX_FILES})`);
    suggestions.push('Split into multiple tasks by file or module');
  }

  if (acCount > MAX_AC) {
    issues.push(`Too many acceptance criteria: ${acCount} (max: ${MAX_AC})`);
    suggestions.push('Split into multiple tasks with 3 or fewer criteria each');
  }

  if (estimatedHours > MAX_HOURS) {
    issues.push(
      `Estimated duration exceeds ${MAX_HOURS} hours: ~${estimatedHours} hours`,
    );
    suggestions.push('Break down into smaller, focused tasks');
  }

  if (task.requiresResearch && !task.phase) {
    suggestions.push('Consider separating research phase from implementation');
  }

  const isAtomic = issues.length === 0;

  return {
    isAtomic,
    issues,
    suggestions,
    metrics: {
      fileCount: files.length,
      acCount,
      estimatedHours,
    },
  };
}

function detectDependenciesInternal(task) {
  const dependencies = [];
  const files = extractFiles(task);

  for (const file of files) {
    const resolvedPath = path.resolve(process.cwd(), file);

    if (fs.existsSync(resolvedPath)) {
      try {
        const content = fs.readFileSync(resolvedPath, 'utf-8');

        const importPatterns = [
          /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
          /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
          /from\s+['"]([^'"]+)['"]/g,
        ];

        for (const pattern of importPatterns) {
          let match;
          match = pattern.exec(content);
          while (match !== null) {
            const importedFile = match[1];
            if (
              !importedFile.startsWith('.') &&
              !importedFile.startsWith('/')
            ) {
              continue;
            }

            let resolvedImport;
            if (importedFile.startsWith('.')) {
              resolvedImport = path.resolve(
                path.dirname(resolvedPath),
                importedFile,
              );
            } else {
              resolvedImport = importedFile;
            }

            const dependency = {
              file: file,
              dependsOn: resolvedImport,
              type: 'import',
            };

            const exists = dependencies.some(
              (d) =>
                d.file === dependency.file &&
                d.dependsOn === dependency.dependsOn,
            );

            if (!exists && fs.existsSync(resolvedImport)) {
              dependencies.push(dependency);
            }

            match = pattern.exec(content);
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return dependencies;
}

function splitByFiles(task) {
  const files = extractFiles(task);
  const subtasks = [];

  for (const file of files) {
    const subtask = {
      ...task,
      title: `${task.title} - ${path.basename(file)}`,
      description: `${task.description}\n\nFocus: ${file}`,
      files: [file],
      acceptanceCriteria:
        task.acceptanceCriteria?.filter(
          (ac) => ac.includes(file) || ac.includes(path.basename(file)),
        ) || [],
      parentTask: task.id,
      phase: task.phase || PHASE.IMPLEMENTATION,
    };

    if (subtask.acceptanceCriteria.length === 0) {
      subtask.acceptanceCriteria = ['Implement changes to ' + file];
    }

    subtasks.push(subtask);
  }

  return subtasks;
}

function splitByCriteria(task) {
  const criteria = task.acceptanceCriteria || [];
  const subtasks = [];

  for (let i = 0; i < criteria.length; i += MAX_AC) {
    const chunk = criteria.slice(i, i + MAX_AC);
    const subtask = {
      ...task,
      title: `${task.title} (Part ${Math.floor(i / MAX_AC) + 1})`,
      description: `${task.description}\n\nCriteria ${i + 1} to ${Math.min(i + MAX_AC, criteria.length)} of ${criteria.length}`,
      acceptanceCriteria: chunk,
      parentTask: task.id,
      phase: task.phase || PHASE.IMPLEMENTATION,
    };

    subtasks.push(subtask);
  }

  return subtasks;
}

function createResearchTask(task) {
  return {
    ...task,
    id: task.id ? `${task.id}-research` : undefined,
    title: `Research: ${task.title}`,
    description: `Research phase for: ${task.description}\n\nInvestigate:\n- Existing patterns in codebase\n- Required dependencies\n- Technical approach`,
    files: task.files?.slice(0, MAX_FILES) || [],
    acceptanceCriteria: [
      'Document findings and recommendations',
      'Identify implementation approach',
      'List required dependencies',
    ],
    parentTask: task.id,
    phase: PHASE.RESEARCH,
    requiresResearch: true,
  };
}

function createImplementationTask(task, researchTaskId) {
  return {
    ...task,
    id: task.id ? `${task.id}-impl` : undefined,
    title: `Implement: ${task.title}`,
    description: `Implementation phase for: ${task.description}`,
    parentTask: researchTaskId,
    phase: PHASE.IMPLEMENTATION,
    dependsOn: researchTaskId ? [researchTaskId] : [],
  };
}

function decomposeTaskInternal(task) {
  const analysis = analyzeTaskInternal(task);
  const subtasks = [];

  if (analysis.isAtomic) {
    return [
      {
        ...task,
        phase: task.phase || PHASE.IMPLEMENTATION,
        metrics: analysis.metrics,
      },
    ];
  }

  if (task.requiresResearch && !task.phase) {
    const researchTask = createResearchTask(task);
    const implTask = createImplementationTask(task, researchTask.id);

    subtasks.push(researchTask);

    const implAnalysis = analyzeTaskInternal(implTask);
    if (implAnalysis.isAtomic) {
      subtasks.push(implTask);
    } else {
      subtasks.push(...decomposeTaskInternal(implTask));
    }

    return subtasks;
  }

  if (analysis.metrics.fileCount > MAX_FILES) {
    return splitByFiles(task);
  }

  if (analysis.metrics.acCount > MAX_AC) {
    return splitByCriteria(task);
  }

  const files = extractFiles(task);
  const criteria = task.acceptanceCriteria || [];

  const perFileCriteria = Math.ceil(criteria.length / files.length);

  if (perFileCriteria > MAX_AC) {
    return splitByFiles(task);
  }

  return splitByCriteria(task);
}

export function analyzeTask(task) {
  return analyzeTaskInternal(task);
}

export function decomposeTask(task) {
  return decomposeTaskInternal(task);
}

export function detectDependencies(task) {
  return detectDependenciesInternal(task);
}

export { PHASE, MAX_HOURS, MAX_FILES, MAX_AC };

export default {
  analyzeTask,
  decomposeTask,
  detectDependencies,
  PHASE,
  MAX_HOURS,
  MAX_FILES,
  MAX_AC,
};
