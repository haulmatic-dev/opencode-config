import { BeadsClient } from '../beads-client.mjs';

const beadsClient = new BeadsClient();

export async function compactGraph() {
  console.log('[Compaction] Starting graph compaction...');

  try {
    const allTasks = await beadsClient.list({ status: 'open', limit: 100 });

    const openTasks = allTasks.filter((t) => t.status === 'open');
    console.log(`[Compaction] Found ${openTasks.length} open tasks`);

    const fingerprintGroups = new Map();

    for (const task of openTasks) {
      const metadata = task.metadata
        ? typeof task.metadata === 'string'
          ? JSON.parse(task.metadata)
          : task.metadata
        : {};

      if (metadata.fingerprint) {
        const fp = metadata.fingerprint;
        if (!fingerprintGroups.has(fp)) {
          fingerprintGroups.set(fp, []);
        }
        fingerprintGroups.get(fp).push(task.id);
      }
    }

    console.log(
      `[Compaction] Found ${fingerprintGroups.size} fingerprint groups`,
    );

    let unblockedCount = 0;

    for (const [fingerprint, taskIds] of fingerprintGroups) {
      const hasRootCause = taskIds.some((id) => {
        const task = allTasks.find((t) => t.id === id);
        const metadata = task?.metadata
          ? typeof task.metadata === 'string'
            ? JSON.parse(task.metadata)
            : task.metadata
          : {};
        return metadata.is_root_cause === true;
      });

      if (hasRootCause) {
        console.log(
          `[Compaction] Fingerprint ${fingerprint.substring(0, 8)}... has root cause, unblocking ${taskIds.length} tasks`,
        );

        for (const taskId of taskIds) {
          const task = allTasks.find((t) => t.id === taskId);
          if (task && task.status === 'blocked') {
            await beadsClient.update(taskId, { status: 'open' });
            unblockedCount++;
            console.log(`[Compaction] ✓ Unblocked: ${taskId}`);
          }
        }
      }
    }

    console.log(`[Compaction] ✓ Unblocked ${unblockedCount} tasks`);
    return { unblockedCount };
  } catch (error) {
    console.error('[Compaction] Error:', error.message);
    return { error: error.message };
  }
}

export async function compactGraphForRootCause(rootTaskId) {
  console.log(`[Compaction] Compacting graph for root cause: ${rootTaskId}`);

  try {
    const rootTask = await beadsClient.show(rootTaskId);
    if (!rootTask) {
      console.warn(`[Compaction] Root task not found: ${rootTaskId}`);
      return { error: 'task_not_found' };
    }

    const rootMetadata = rootTask.metadata
      ? typeof rootTask.metadata === 'string'
        ? JSON.parse(rootTask.metadata)
        : rootTask.metadata
      : {};
    const fingerprint = rootMetadata.fingerprint;

    if (!fingerprint) {
      console.warn(`[Compaction] Root task has no fingerprint`);
      return { error: 'no_fingerprint' };
    }

    const allTasks = await beadsClient.list({ limit: 100 });

    const dependentTasks = allTasks.filter((t) => {
      const metadata = t.metadata
        ? typeof t.metadata === 'string'
          ? JSON.parse(t.metadata)
          : t.metadata
        : {};
      return (
        metadata.fingerprint === fingerprint &&
        t.id !== rootTaskId &&
        t.status === 'blocked'
      );
    });

    console.log(`[Compaction] Found ${dependentTasks.length} dependent tasks`);

    let unblockedCount = 0;

    for (const task of dependentTasks) {
      await beadsClient.update(task.id, { status: 'open' });
      unblockedCount++;
      console.log(`[Compaction] ✓ Unblocked: ${task.id}`);
    }

    await beadsClient.update(rootTaskId, {
      metadata: JSON.stringify({
        ...rootMetadata,
        graph_compacted: true,
        compacted_at: new Date().toISOString(),
      }),
    });

    console.log(
      `[Compaction] ✓ Unblocked ${unblockedCount} tasks for root cause ${rootTaskId}`,
    );
    return { unblockedCount, dependentTasks };
  } catch (error) {
    console.error('[Compaction] Error:', error.message);
    return { error: error.message };
  }
}
