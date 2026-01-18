/**
 * Task Clustering - Maximizes parallelization through intelligent task clustering.
 *
 * Groups tasks by file impact, clusters independent tasks, identifies sequential
 * dependencies, and generates optimized execution order.
 *
 * @module task-clustering
 */

/**
 * Clusters tasks for optimal parallel execution.
 *
 * @param {Object[]} tasks - Array of tasks to cluster
 * @param {Object} [options] - Clustering options
 * @param {number} [options.maxClusterSize=4] - Maximum tasks per cluster
 * @param {boolean} [options.useImpactAnalysis=true] - Use bv_impact for analysis
 * @returns {Promise<Object>} Clustered result with clusters, dependencies, and execution plan
 */
export async function clusterTasks(tasks, options = {}) {
  const { maxClusterSize = 4, useImpactAnalysis = true } = options;

  if (!tasks || tasks.length === 0) {
    return createEmptyResult();
  }

  const taskData = await Promise.all(
    tasks.map(async (task) => {
      const files = task.files || extractFilesFromTask(task);
      let impact = { affectedFiles: [], dependencies: [] };

      if (useImpactAnalysis && files.length > 0) {
        try {
          impact = await bv_impact({ filePaths: files });
        } catch {
          impact = { affectedFiles: files, dependencies: [] };
        }
      }

      return {
        id: task.id,
        title: task.title,
        files,
        impact,
        priority: task.priority || 0,
      };
    }),
  );

  const clusters = buildClusters(taskData, maxClusterSize);
  const dependencies = findSequentialDependencies(taskData);
  const executionPlan = generateExecutionPlan(clusters, dependencies);

  return {
    clusters,
    dependencies,
    executionPlan,
    metrics: {
      totalTasks: tasks.length,
      totalClusters: clusters.length,
      parallelizable: clusters.filter((c) => c.parallelizable).length,
      estimatedSpeedup: calculateSpeedup(clusters, dependencies),
    },
  };
}

/**
 * Extracts file paths from task if not explicitly provided.
 *
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
 * Builds clusters of tasks based on file overlap analysis.
 *
 * @param {Object[]} taskData - Analyzed task data
 * @param {number} maxClusterSize - Maximum cluster size
 * @returns {Object[]} Array of task clusters
 */
function buildClusters(taskData, maxClusterSize) {
  const clusters = [];
  const assigned = new Set();

  const conflictMap = buildConflictMap(taskData);

  const independentTasks = taskData.filter((t) => !conflictMap.has(t.id));
  const dependentTasks = taskData.filter((t) => conflictMap.has(t.id));

  for (const task of independentTasks) {
    if (assigned.has(task.id)) continue;

    const cluster = createCluster(
      [task],
      taskData,
      conflictMap,
      maxClusterSize,
    );
    clusters.push(cluster);
    for (const t of cluster.tasks) {
      assigned.add(t);
    }
  }

  for (const task of dependentTasks) {
    if (assigned.has(task.id)) continue;

    const cluster = createCluster(
      [task],
      taskData,
      conflictMap,
      maxClusterSize,
    );
    clusters.push(cluster);
    for (const t of cluster.tasks) {
      assigned.add(t);
    }
  }

  return clusters;
}

/**
 * Creates a single cluster from compatible tasks.
 *
 * @param {Object[]} initialTasks - Starting tasks for cluster
 * @param {Object[]} allTasks - All available tasks
 * @param {Map} conflictMap - Task conflict mapping
 * @param {number} maxClusterSize - Maximum cluster size
 * @returns {Object} Cluster object
 */
function createCluster(initialTasks, allTasks, conflictMap, maxClusterSize) {
  const clusterTasks = [...initialTasks];
  const clusterFiles = new Set();

  for (const t of initialTasks) {
    for (const f of t.files) {
      clusterFiles.add(f);
    }
  }

  for (const task of allTasks) {
    if (clusterTasks.length >= maxClusterSize) break;
    if (assigned.has(task.id, clusterTasks)) continue;
    if (hasConflict(task, clusterTasks, conflictMap)) continue;

    clusterTasks.push(task);
    for (const f of task.files) {
      clusterFiles.add(f);
    }
  }

  return {
    id: `cluster-${clusterTasks.map((t) => t.id).join('-')}`,
    tasks: clusterTasks.map((t) => t.id),
    taskDetails: clusterTasks,
    files: [...clusterFiles],
    parallelizable: clusterTasks.length > 1,
    reason:
      clusterTasks.length > 1
        ? `Independent tasks sharing no files: ${clusterTasks.map((t) => t.id).join(', ')}`
        : `Single task (may have dependencies)`,
  };
}

/**
 * Checks if a task is already in the cluster.
 *
 * @param {Object} task - Task to check
 * @param {Object[]} clusterTasks - Tasks in cluster
 * @returns {boolean} True if already assigned
 */
function assignedHas(task, clusterTasks) {
  return clusterTasks.some((t) => t.id === task.id);
}

/**
 * Checks if a task conflicts with cluster tasks.
 *
 * @param {Object} task - Task to check
 * @param {Object[]} clusterTasks - Tasks in cluster
 * @param {Map} conflictMap - Conflict mapping
 * @returns {boolean} True if conflict exists
 */
function hasConflict(task, clusterTasks, conflictMap) {
  const conflicts = conflictMap.get(task.id) || new Set();
  return clusterTasks.some((t) => conflicts.has(t.id));
}

/**
 * Builds a conflict map between tasks based on file overlap.
 *
 * @param {Object[]} taskData - Task data to analyze
 * @returns {Map} Map of task ID to conflicting task IDs
 */
function buildConflictMap(taskData) {
  const conflictMap = new Map();

  for (let i = 0; i < taskData.length; i++) {
    conflictMap.set(taskData[i].id, new Set());

    for (let j = i + 1; j < taskData.length; j++) {
      const overlap = getFileOverlap(taskData[i].files, taskData[j].files);

      if (overlap.length > 0) {
        conflictMap.get(taskData[i].id).add(taskData[j].id);
        conflictMap.set(
          taskData[j].id,
          new Set([...(conflictMap.get(taskData[j].id) || []), taskData[i].id]),
        );
      }
    }
  }

  return conflictMap;
}

/**
 * Gets overlapping files between two file lists.
 *
 * @param {string[]} filesA - First file list
 * @param {string[]} filesB - Second file list
 * @returns {string[]} Overlapping files
 */
function getFileOverlap(filesA, filesB) {
  const setB = new Set(filesB);
  return filesA.filter((f) => setB.has(f));
}

/**
 * Finds sequential dependencies between tasks.
 *
 * @param {Object[]} taskData - Task data to analyze
 * @returns {Object[]} Array of dependency definitions
 */
function findSequentialDependencies(taskData) {
  const dependencies = [];
  const conflictMap = buildConflictMap(taskData);

  for (const [taskId, conflicts] of conflictMap) {
    for (const conflictingId of conflicts) {
      const task = taskData.find((t) => t.id === taskId);
      const conflicting = taskData.find((t) => t.id === conflictingId);

      if (task && conflicting) {
        const order = determineOrder(task, conflicting);

        dependencies.push({
          after: order.blocker,
          before: order.blocked,
          reason: `Shared files: ${getFileOverlap(task.files, conflicting.files).join(', ')}`,
        });
      }
    }
  }

  return dependencies;
}

/**
 * Determines execution order between two tasks.
 *
 * @param {Object} taskA - First task
 * @param {Object} taskB - Second task
 * @returns {Object} Order with blocker and blocked task IDs
 */
function determineOrder(taskA, taskB) {
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
 * Generates optimized execution plan from clusters and dependencies.
 *
 * @param {Object[]} clusters - Task clusters
 * @param {Object[]} dependencies - Sequential dependencies
 * @returns {Object[]} Execution phases
 */
function generateExecutionPlan(clusters, dependencies) {
  const plan = [];
  const taskCluster = new Map();
  const completed = new Set();

  clusters.forEach((cluster) => {
    cluster.tasks.forEach((taskId) => {
      taskCluster.set(taskId, cluster.id);
    });
  });

  let phase = 0;
  let progress = true;

  while (progress && completed.size < clusters.length) {
    progress = false;

    for (const cluster of clusters) {
      if (completed.has(cluster.id)) continue;

      const blocked = dependencies.some(
        (dep) =>
          dep.before === cluster.tasks[0] &&
          !completed.has(taskCluster.get(dep.after)),
      );

      if (blocked) continue;

      plan.push({
        phase,
        clusters: [cluster.id],
        tasks: cluster.tasks,
        parallel: cluster.parallelizable,
        description: cluster.parallelizable
          ? `Run ${cluster.tasks.length} tasks in parallel`
          : `Run task ${cluster.tasks[0]}`,
      });

      completed.add(cluster.id);
      progress = true;
    }

    phase++;
  }

  const remaining = clusters.filter((c) => !completed.has(c.id));
  if (remaining.length > 0) {
    plan.push({
      phase,
      clusters: remaining.map((c) => c.id),
      tasks: remaining.flatMap((c) => c.tasks),
      parallel: false,
      description: 'Remaining tasks (may have circular dependencies)',
    });
  }

  return plan;
}

/**
 * Calculates estimated speedup from clustering.
 *
 * @param {Object[]} clusters - Task clusters
 * @param {Object[]} dependencies - Sequential dependencies
 * @returns {number} Estimated speedup factor
 */
function calculateSpeedup(clusters, dependencies) {
  const sequentialCount = dependencies.length;
  const parallelClusters = clusters.filter((c) => c.parallelizable).length;

  if (clusters.length === 0) return 1;

  const baseTime = clusters.length;
  const parallelTime = parallelClusters + (clusters.length - parallelClusters);

  return Math.round((baseTime / parallelTime) * 100) / 100;
}

/**
 * Creates empty result structure.
 *
 * @returns {Object} Empty result
 */
function createEmptyResult() {
  return {
    clusters: [],
    dependencies: [],
    executionPlan: [],
    metrics: {
      totalTasks: 0,
      totalClusters: 0,
      parallelizable: 0,
      estimatedSpeedup: 1,
    },
  };
}

export default {
  clusterTasks,
};
