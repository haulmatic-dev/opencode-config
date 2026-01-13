import { BeadsClient } from './beads-client.mjs';

export async function unblockDependentTasks(rootTaskId, beadsClient) {
  const allTasks = await beadsClient.list();
  const blockedTasks = allTasks.filter((t) =>
    t.dependencies.some((dep) => dep.depends_on_id === rootTaskId),
  );

  const results = [];

  for (const task of blockedTasks) {
    try {
      await beadsClient.depRemove(task.id, rootTaskId);
      console.log(`[Compactor] Unblocked: ${task.id} -> ${rootTaskId}`);

      results.push({
        taskId: task.id,
        status: 'unblocked',
        rootCause: rootTaskId,
      });
    } catch (error) {
      console.error(`[Compactor] Failed to unblock ${task.id}:`, error);
    }
  }

  return results;
}

export async function cascadeStatusUpdates(rootTaskId, newStatus, beadsClient) {
  const dependentTasks = await getDependentTasks(rootTaskId, beadsClient);

  const results = [];

  for (const task of dependentTasks) {
    try {
      await beadsClient.update(task.id, { status: newStatus });
      console.log(`[Compactor] Updated ${task.id} to: ${newStatus}`);

      results.push({
        taskId: task.id,
        oldStatus: task.status,
        newStatus,
      });
    } catch (error) {
      console.error(`[Compactor] Failed to update ${task.id}:`, error);
    }
  }

  return results;
}

export async function getDependentTasks(taskId, beadsClient) {
  const allTasks = await beadsClient.list();
  const dependents = allTasks.filter((t) =>
    t.dependencies.some((dep) => dep.issue_id === taskId),
  );

  return dependents;
}

export async function runCompaction(resolvedTaskId, beadsClient) {
  console.log(`[Compactor] Running compaction for: ${resolvedTaskId}`);

  await cascadeStatusUpdates(resolvedTaskId, 'ready', beadsClient);
  await unblockDependentTasks(resolvedTaskId, beadsClient);

  console.log(`[Compactor] Compaction complete`);
}
