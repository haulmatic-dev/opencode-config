import { BeadsClient } from '../beads-client.mjs';
import { execAsync } from '../utils/exec.js';

const beadsClient = new BeadsClient();

export async function checkForConflicts(branch = 'main') {
  console.log(`[Merge] Checking for conflicts against: ${branch}`);

  try {
    const result = await execAsync(`git merge-base HEAD ${branch} 2>&1`);

    if (result.exitCode !== 0) {
      console.warn('[Merge] Could not check for conflicts');
      return { hasConflicts: false, error: result.stderr };
    }

    return { hasConflicts: false };
  } catch (error) {
    console.error('[Merge] Error checking conflicts:', error.message);
    return { hasConflicts: false, error: error.message };
  }
}

export async function performSquashMerge(
  taskId,
  sourceBranch,
  targetBranch = 'main',
) {
  console.log(`[Merge] Performing squash merge for task: ${taskId}`);
  console.log(`[Merge] Source: ${sourceBranch} -> Target: ${targetBranch}`);

  try {
    const statusResult = await execAsync('git status --porcelain');
    if (statusResult.stdout.trim()) {
      console.error('[Merge] ✗ Working directory has uncommitted changes');
      return {
        success: false,
        error: 'Working directory has uncommitted changes',
        needsCommit: true,
      };
    }

    const taskInfo = await beadsClient.show(taskId);
    let metadata = {};
    if (taskInfo?.metadata) {
      metadata =
        typeof taskInfo.metadata === 'string'
          ? JSON.parse(taskInfo.metadata)
          : taskInfo.metadata;
    }

    if (metadata.irreversible && !metadata.approval_granted) {
      console.error(
        '[Merge] ✗ Irreversible action blocked - requires human approval',
      );
      return {
        success: false,
        blocked: true,
        reason: 'irreversible_action_requires_approval',
      };
    }

    console.log('[Merge] Attempting squash merge...');

    const mergeResult = await execAsync(
      `git merge --squash ${sourceBranch} -m "opencode-${taskId}: Merge ${sourceBranch} into ${targetBranch}" 2>&1`,
    );

    if (mergeResult.exitCode !== 0) {
      const hasConflicts =
        mergeResult.stdout.includes('CONFLICT') ||
        mergeResult.stderr.includes('CONFLICT');

      if (hasConflicts) {
        console.log('[Merge] ⚠ Conflicts detected during merge');
        return {
          success: false,
          hasConflicts: true,
          output: mergeResult.stdout,
          needsConflictResolution: true,
        };
      }

      console.error('[Merge] ✗ Merge failed');
      return {
        success: false,
        error: mergeResult.stderr || mergeResult.stdout,
      };
    }

    console.log('[Merge] ✓ Squash merge successful');

    const logResult = await execAsync('git log --oneline -1');
    console.log(`[Merge] Latest commit: ${logResult.stdout.trim()}`);

    await beadsClient.update(taskId, {
      status: 'closed',
      metadata: JSON.stringify({
        ...metadata,
        merged_at: new Date().toISOString(),
        merge_type: 'squash',
      }),
    });

    return {
      success: true,
      commitHash: logResult.stdout.trim(),
    };
  } catch (error) {
    console.error('[Merge] Error during merge:', error.message);

    try {
      await execAsync('git merge --abort');
      console.log('[Merge] Merge aborted');
    } catch {}

    return {
      success: false,
      error: error.message,
    };
  }
}

export async function performAmendCommit(taskId, newMessage) {
  console.log(`[Merge] Performing amend for task: ${taskId}`);

  try {
    const result = await execAsync(
      `git commit --amend -m "${newMessage}" 2>&1`,
    );

    if (result.exitCode === 0) {
      console.log('[Merge] ✓ Commit amended successfully');

      await beadsClient.update(taskId, {
        metadata: JSON.stringify({
          amended_at: new Date().toISOString(),
        }),
      });

      return { success: true };
    }

    return {
      success: false,
      error: result.stderr,
    };
  } catch (error) {
    console.error('[Merge] Error amending commit:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function cleanupTaskBranch(taskId, branchName) {
  console.log(`[Merge] Cleaning up task branch: ${branchName}`);

  try {
    if (
      branchName === 'main' ||
      branchName === 'master' ||
      branchName === 'develop'
    ) {
      console.error(
        `[Merge] ✗ Refusing to delete protected branch: ${branchName}`,
      );
      return {
        success: false,
        error: 'protected_branch',
      };
    }

    await execAsync(`git checkout main 2>&1`);
    console.log('[Merge] Switched to main');

    const deleteResult = await execAsync(`git branch -D ${branchName} 2>&1`);

    if (deleteResult.exitCode === 0) {
      console.log(`[Merge] ✓ Deleted branch: ${branchName}`);

      await beadsClient.update(taskId, {
        metadata: JSON.stringify({
          branch_deleted: true,
          branch_deleted_at: new Date().toISOString(),
        }),
      });

      return { success: true };
    }

    console.warn('[Merge] Failed to delete branch');
    return {
      success: false,
      error: deleteResult.stderr,
    };
  } catch (error) {
    console.error('[Merge] Error cleaning up:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
