#!/usr/bin/env node

/**
 * BV Parallel Impact Analyzer
 *
 * Analyzes Beads tasks for parallel execution opportunities by examining
 * file-level impact and identifying conflicts between tasks.
 *
 * @module bv-parallel-impact
 */

/**
 * Analyzes tasks for parallel execution opportunities.
 *
 * @param {Object} options - Analysis options
 * @param {string[]} [options.tasks] - Specific task IDs to analyze
 * @param {Object} [options.filters] - Filters for selecting tasks
 * @returns {Promise<Object>} Analysis result with parallel candidates, conflicts, and execution plan
 */
export async function analyzeParallelExecution(options = {}) {
  const { tasks: taskIds, filters } = options;

  let tasks;
  if (taskIds && taskIds.length > 0) {
    const listResult = await beads_list({
      filters: JSON.stringify({ ids: taskIds }),
    });
    tasks = Array.isArray(listResult)
      ? listResult
      : [listResult].filter(Boolean);
  } else {
    const result = await beads_list({
      filters: JSON.stringify(filters || { status: 'open' }),
    });
    tasks = Array.isArray(result) ? result : [result].filter(Boolean);
  }

  if (tasks.length === 0) {
    return createEmptyResult();
  }

  const taskImpacts = await Promise.all(
    tasks.map(async (task) => {
      const files = task.files || extractFilesFromTask(task);
      try {
        const impact = await bv_impact({ filePaths: files });
        return {
          id: task.id,
          title: task.title,
          files,
          impact: impact || { affectedFiles: [], dependencies: [] },
        };
      } catch {
        return {
          id: task.id,
          title: task.title,
          files,
          impact: { affectedFiles: [], dependencies: [] },
        };
      }
    }),
  );

  const conflictMatrix = buildConflictMatrix(taskImpacts);
  const sequentialRequirements = identifySequentialRequirements(
    taskImpacts,
    conflictMatrix,
  );
  const parallelCandidates = findParallelCandidates(
    taskImpacts,
    conflictMatrix,
  );
  const executionPlan = generateExecutionPlan(
    parallelCandidates,
    sequentialRequirements,
  );

  return {
    parallel_candidates: parallelCandidates,
    sequential_requirements: sequentialRequirements,
    conflict_matrix: conflictMatrix,
    execution_plan: executionPlan,
    summary: {
      total_tasks: tasks.length,
      parallel_groups: parallelCandidates.length,
      sequential_chains: sequentialRequirements.length,
      max_parallelism: Math.max(
        ...parallelCandidates.map((g) => g.tasks.length),
        1,
      ),
    },
  };
}

/**
 * Extracts files from task description if not explicitly set.
 * @param {Object} task - Task object
 * @returns {string[]} Array of file paths
 */
function extractFilesFromTask(task) {
  const files = [];
  const desc = task.description || '';
  const match = desc.match(/files?:?\s*([^\n]+)/i);
  if (match) {
    const parts = match[1]
      .split(/[,;]/)
      .map((f) => f.trim())
      .filter(Boolean);
    files.push(...parts);
  }
  return files;
}

/**
 * Creates an empty result structure.
 * @returns {Object} Empty result structure
 */
function createEmptyResult() {
  return {
    parallel_candidates: [],
    sequential_requirements: [],
    conflict_matrix: {},
    execution_plan: [],
    summary: {
      total_tasks: 0,
      parallel_groups: 0,
      sequential_chains: 0,
      max_parallelism: 0,
    },
  };
}

/**
 * Builds a conflict matrix between tasks based on file overlap.
 * @param {Object[]} taskImpacts - Task impact data
 * @returns {Object} Conflict matrix keyed by task ID pairs
 */
function buildConflictMatrix(taskImpacts) {
  const matrix = {};

  for (let i = 0; i < taskImpacts.length; i++) {
    for (let j = i + 1; j < taskImpacts.length; j++) {
      const taskA = taskImpacts[i];
      const taskB = taskImpacts[j];

      const conflict = calculateFileConflict(taskA.files, taskB.files);

      if (conflict.hasConflict) {
        const key = `${taskA.id}::${taskB.id}`;
        matrix[key] = {
          task_a: taskA.id,
          task_b: taskB.id,
          shared_files: conflict.sharedFiles,
          conflict_type: conflict.type,
          severity: conflict.severity,
        };
      }
    }
  }

  return matrix;
}

/**
 * Calculates file conflict between two task file lists.
 * @param {string[]} filesA - Files from task A
 * @param {string[]} filesB - Files from task B
 * @returns {Object} Conflict analysis result
 */
function calculateFileConflict(filesA, filesB) {
  const setA = new Set(filesA);
  const setB = new Set(filesB);
  const sharedFiles = [...filesA].filter((f) => setB.has(f));

  if (sharedFiles.length === 0) {
    return { hasConflict: false };
  }

  const hasDirectConflict = sharedFiles.some((f) => {
    const ext = f.split('.').pop();
    return ['js', 'ts', 'py', 'go', 'rs'].includes(ext);
  });

  const hasConfigConflict = sharedFiles.some((f) =>
    [
      'package.json',
      'Cargo.toml',
      'requirements.txt',
      'go.mod',
      'pyproject.toml',
    ].includes(f.split('/').pop()),
  );

  let severity = 'low';
  let type = 'indirect';

  if (hasConfigConflict) {
    severity = 'high';
    type = 'configuration';
  } else if (hasDirectConflict) {
    severity = 'medium';
    type = 'direct';
  }

  return {
    hasConflict: true,
    sharedFiles,
    severity,
    type,
  };
}

/**
 * Identifies sequential requirements between tasks.
 * @param {Object[]} taskImpacts - Task impact data
 * @param {Object} conflictMatrix - Conflict matrix
 * @returns {Object[]} Array of sequential requirement definitions
 */
function identifySequentialRequirements(taskImpacts, conflictMatrix) {
  const requirements = [];
  const taskMap = new Map(taskImpacts.map((t) => [t.id, t]));

  for (const conflict of Object.values(conflictMatrix)) {
    if (conflict.severity === 'high' || conflict.type === 'configuration') {
      const taskA = taskMap.get(conflict.task_a);
      const taskB = taskMap.get(conflict.task_b);

      if (taskA && taskB) {
        const order = determineExecutionOrder(taskA, taskB);
        requirements.push({
          blocks: order.blocker,
          blocked: order.blocked,
          reason: `${conflict.type} conflict on ${conflict.shared_files.length} file(s): ${conflict.shared_files.join(', ')}`,
          shared_files: conflict.shared_files,
          severity: conflict.severity,
        });
      }
    }
  }

  return requirements;
}

/**
 * Determines execution order based on task characteristics.
 * @param {Object} taskA - First task
 * @param {Object} taskB - Second task
 * @returns {Object} Order with blocker and blocked task IDs
 */
function determineExecutionOrder(taskA, taskB) {
  const priorityA = taskA.priority || 0;
  const priorityB = taskB.priority || 0;

  if (priorityA !== priorityB) {
    return priorityA > priorityB
      ? { blocker: taskA.id, blocked: taskB.id }
      : { blocker: taskB.id, blocked: taskA.id };
  }

  const sizeA = taskA.files?.length || 0;
  const sizeB = taskB.files?.length || 0;

  return sizeA > sizeB
    ? { blocker: taskA.id, blocked: taskB.id }
    : { blocker: taskB.id, blocked: taskA.id };
}

/**
 * Finds tasks that can run in parallel.
 * @param {Object[]} taskImpacts - Task impact data
 * @param {Object} conflictMatrix - Conflict matrix
 * @returns {Object[]} Array of parallel candidate groups
 */
function findParallelCandidates(taskImpacts, conflictMatrix) {
  const groups = [];
  const assigned = new Set();

  const conflictPairs = new Map();
  for (const key of Object.keys(conflictMatrix)) {
    const [a, b] = key.split('::');
    if (!conflictPairs.has(a)) conflictPairs.set(a, new Set());
    if (!conflictPairs.has(b)) conflictPairs.set(b, new Set());
    conflictPairs.get(a).add(b);
    conflictPairs.get(b).add(a);
  }

  for (const task of taskImpacts) {
    if (assigned.has(task.id)) continue;

    const group = { tasks: [task.id], reason: 'Independent tasks' };
    assigned.add(task.id);

    const conflicts = conflictPairs.get(task.id) || new Set();

    for (const other of taskImpacts) {
      if (other.id === task.id || assigned.has(other.id)) continue;
      if (conflicts.has(other.id)) continue;

      group.tasks.push(other.id);
      assigned.add(other.id);
    }

    if (group.tasks.length > 1) {
      group.reason = `No file conflicts between tasks: ${group.tasks.join(', ')}`;
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Generates an optimal execution plan.
 * @param {Object[]} parallelCandidates - Groups of parallelizable tasks
 * @param {Object[]} sequentialRequirements - Sequential requirements
 * @returns {Object[]} Execution plan with phases
 */
function generateExecutionPlan(parallelCandidates, sequentialRequirements) {
  const plan = [];
  const taskToPhase = new Map();

  let phaseIndex = 0;

  for (const group of parallelCandidates) {
    let canRunNow = true;

    for (const taskId of group.tasks) {
      for (const req of sequentialRequirements) {
        if (req.blocked === taskId && !taskToPhase.has(req.blocker)) {
          canRunNow = false;
          break;
        }
      }
    }

    if (!canRunNow) continue;

    const phase = {
      phase: phaseIndex,
      parallel: group.tasks,
      description: `Run ${group.tasks.length} independent task(s) in parallel`,
    };

    for (const taskId of group.tasks) {
      taskToPhase.set(taskId, phaseIndex);
    }

    plan.push(phase);
    phaseIndex++;
  }

  for (const group of parallelCandidates) {
    if ([...group.tasks].every((id) => taskToPhase.has(id))) continue;

    const dependencies = [];
    for (const taskId of group.tasks) {
      for (const req of sequentialRequirements) {
        if (req.blocked === taskId) {
          dependencies.push(req.blocker);
        }
      }
    }

    const allDepsScheduled = dependencies.every((dep) => taskToPhase.has(dep));
    if (allDepsScheduled) {
      const phase = {
        phase: phaseIndex,
        parallel: group.tasks,
        description: `Run ${group.tasks.length} task(s) after dependencies complete`,
        depends_on: [...new Set(dependencies)],
      };

      for (const taskId of group.tasks) {
        taskToPhase.set(taskId, phaseIndex);
      }

      plan.push(phase);
      phaseIndex++;
    }
  }

  const unscheduled = [];
  for (const group of parallelCandidates) {
    for (const taskId of group.tasks) {
      if (!taskToPhase.has(taskId)) {
        unscheduled.push(taskId);
      }
    }
  }

  if (unscheduled.length > 0) {
    plan.push({
      phase: phaseIndex,
      parallel: unscheduled,
      description: 'Remaining unscheduled tasks',
      note: 'May have circular dependencies or missing data',
    });
  }

  return plan;
}

/**
 * CLI entry point for the analyzer.
 */
async function main() {
  const args = process.argv.slice(2);
  const taskIds = args.filter((arg) => !arg.startsWith('--'));
  const flags = args.filter((arg) => arg.startsWith('--'));

  const jsonOutput = flags.includes('--json');
  const helpFlag = flags.includes('--help') || flags.includes('-h');

  if (helpFlag) {
    console.log(`
BV Parallel Impact Analyzer

Analyzes Beads tasks for parallel execution opportunities.

Usage: node lib/bv-parallel-impact.js [taskIds...] [options]

Arguments:
  taskIds...          Specific task IDs to analyze (optional)

Options:
  --json              Output results as JSON
  --help, -h          Show this help message

Examples:
  node lib/bv-parallel-impact.js
  node lib/bv-parallel-impact.js task-1 task-2 task-3
  node lib/bv-parallel-impact.js --json
`);
    process.exit(0);
  }

  console.log(
    'Note: This module requires opencode tools (beads_list, bv_impact)',
  );
  console.log('Run from within opencode for full functionality.\n');

  try {
    const result = await analyzeParallelExecution({
      tasks: taskIds.length > 0 ? taskIds : undefined,
    });

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      displayResults(result);
    }
  } catch (error) {
    if (
      error.message.includes('beads_list') ||
      error.message.includes('bv_impact')
    ) {
      console.log('Unable to run: opencode tools not available.');
      console.log(
        'Import this module in an opencode agent for full functionality.',
      );
    } else {
      console.error('Error analyzing parallel execution:', error.message);
      process.exit(1);
    }
  }
}

/**
 * Displays analysis results in human-readable format.
 * @param {Object} result - Analysis result
 */
function displayResults(result) {
  console.log('\n=== Parallel Execution Analysis ===\n');

  console.log('Summary:');
  console.log(`  Total Tasks: ${result.summary.total_tasks}`);
  console.log(`  Parallel Groups: ${result.summary.parallel_groups}`);
  console.log(`  Sequential Chains: ${result.summary.sequential_chains}`);
  console.log(`  Max Parallelism: ${result.summary.max_parallelism}`);
  console.log('');

  console.log('Parallel Candidates:');
  if (result.parallel_candidates.length === 0) {
    console.log('  (none)');
  } else {
    for (const group of result.parallel_candidates) {
      console.log(`  - [${group.tasks.join(', ')}]`);
      console.log(`    ${group.reason}`);
    }
  }
  console.log('');

  if (result.sequential_requirements.length > 0) {
    console.log('Sequential Requirements:');
    for (const req of result.sequential_requirements) {
      console.log(`  - ${req.blocker} → ${req.blocked}`);
      console.log(`    Reason: ${req.reason}`);
    }
    console.log('');
  }

  console.log('Execution Plan:');
  if (result.execution_plan.length === 0) {
    console.log('  (no plan generated)');
  } else {
    for (const phase of result.execution_plan) {
      const deps = phase.depends_on
        ? ` (depends on: ${phase.depends_on.join(', ')})`
        : '';
      console.log(
        `  Phase ${phase.phase}: [${phase.parallel.join(', ')}]${deps}`,
      );
      console.log(`    ${phase.description}`);
    }
  }

  console.log('');
}

if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv[1] &&
  process.argv[1].includes('bv-parallel-impact')
) {
  main();
}
