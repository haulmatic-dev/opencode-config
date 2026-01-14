import { execAsync } from '../utils/exec.js';

export async function checkNeedsRebase(taskId, targetBranch = 'origin/main') {
  console.log(`[Rebase] Checking if rebase is needed for task: ${taskId}`);

  try {
    const currentBranchResult = await execAsync('git branch --show-current');
    const currentBranch = currentBranchResult.stdout.trim();

    console.log(`[Rebase] Current branch: ${currentBranch}`);
    console.log(`[Rebase] Target branch: ${targetBranch}`);

    const fetchResult = await execAsync(`git fetch ${targetBranch} 2>&1`);
    if (fetchResult.exitCode !== 0) {
      console.error('[Rebase] Fetch failed:', fetchResult.stderr);
      return { needsRebase: false, error: 'fetch_failed' };
    }

    const aheadResult = await execAsync(
      `git rev-list --count ${currentBranch}..${targetBranch} 2>&1`,
    );

    const commitsAhead = parseInt(aheadResult.stdout.trim(), 10);

    if (Number.isNaN(commitsAhead)) {
      console.warn('[Rebase] Could not determine commit count');
      return { needsRebase: false, commitsAhead: 0 };
    }

    console.log(`[Rebase] Commits ahead on target: ${commitsAhead}`);

    if (commitsAhead > 0) {
      console.log('[Rebase] ⚠ Rebase needed - main has new commits');
      return {
        needsRebase: true,
        commitsAhead,
        currentBranch,
        targetBranch,
      };
    }

    console.log('[Rebase] ✓ No rebase needed');
    return {
      needsRebase: false,
      commitsAhead: 0,
      currentBranch,
    };
  } catch (error) {
    console.error('[Rebase] Error checking rebase status:', error.message);
    return { needsRebase: false, error: error.message };
  }
}

export async function performRebase(taskId, targetBranch = 'origin/main') {
  console.log(`[Rebase] Performing rebase for task: ${taskId}`);

  try {
    const statusResult = await execAsync('git status --porcelain');
    if (statusResult.stdout.trim()) {
      console.error('[Rebase] ✗ Working directory has uncommitted changes');
      return {
        success: false,
        error: 'Working directory has uncommitted changes',
        needsStash: true,
      };
    }

    console.log(`[Rebase] Starting rebase against: ${targetBranch}`);
    const rebaseResult = await execAsync(`git rebase ${targetBranch} 2>&1`);

    if (rebaseResult.exitCode !== 0) {
      console.error('[Rebase] ✗ Rebase failed');
      const hasConflicts =
        rebaseResult.stdout.includes('CONFLICT') ||
        rebaseResult.stderr.includes('CONFLICT');

      if (hasConflicts) {
        console.log('[Rebase] Conflicts detected, spawning ConflictResolver');
        return {
          success: false,
          hasConflicts: true,
          output: rebaseResult.stdout,
          needsConflictResolution: true,
        };
      }

      return {
        success: false,
        error: rebaseResult.stderr || rebaseResult.stdout,
      };
    }

    console.log('[Rebase] ✓ Rebase successful');

    const logResult = await execAsync('git log --oneline -1');
    console.log(`[Rebase] Latest commit: ${logResult.stdout.trim()}`);

    return {
      success: true,
      commitHash: logResult.stdout.trim(),
    };
  } catch (error) {
    console.error('[Rebase] Error during rebase:', error.message);

    try {
      await execAsync('git rebase --abort');
      console.log('[Rebase] Rebase aborted');
    } catch {}

    return {
      success: false,
      error: error.message,
    };
  }
}

export async function abortRebase() {
  console.log('[Rebase] Aborting current rebase...');

  try {
    const result = await execAsync('git rebase --abort');
    if (result.exitCode === 0) {
      console.log('[Rebase] ✓ Rebase aborted successfully');
      return { success: true };
    }

    return {
      success: false,
      error: result.stderr,
    };
  } catch (error) {
    console.error('[Rebase] Error aborting rebase:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function continueRebase() {
  console.log('[Rebase] Continuing rebase...');

  try {
    const statusResult = await execAsync('git status --porcelain');
    if (statusResult.stdout.trim()) {
      console.error('[Rebase] ✗ Uncommitted changes detected');
      return {
        success: false,
        error: 'Uncommitted changes present, cannot continue',
      };
    }

    const result = await execAsync('git rebase --continue');
    if (result.exitCode === 0) {
      console.log('[Rebase] ✓ Rebase continued successfully');
      return { success: true };
    }

    return {
      success: false,
      error: result.stderr,
    };
  } catch (error) {
    console.error('[Rebase] Error continuing rebase:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function updateRebaseMetadata(taskId, rebaseStatus) {
  try {
    const { BeadsClient } = await import('../beads-client.mjs');
    const beadsClient = new BeadsClient();

    const task = await beadsClient.show(taskId);
    let metadata = {};

    if (task?.metadata) {
      if (typeof task.metadata === 'string') {
        try {
          metadata = JSON.parse(task.metadata);
        } catch {
          metadata = {};
        }
      } else {
        metadata = task.metadata;
      }
    }

    metadata.rebase_status = rebaseStatus;
    metadata.rebase_updated_at = new Date().toISOString();

    await beadsClient.update(taskId, {
      metadata: JSON.stringify(metadata),
    });

    console.log(`[Rebase] Metadata updated for task: ${taskId}`);
    return { success: true };
  } catch (error) {
    console.error('[Rebase] Error updating metadata:', error.message);
    return { success: false, error: error.message };
  }
}
