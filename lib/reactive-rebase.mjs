import { exec as execAsync } from 'node:child_process';
import { logOperation } from './git-audit.mjs';

function execWithCheck(command, noForceCheck = false) {
  if (!noForceCheck && command.includes('--force')) {
    throw new Error('Force flag detected in git command');
  }
  return execAsync(command);
}

export async function checkNeedsRebase() {
  const result = await execAsync('git branch --show-current');
  const branch = result.stdout.trim();

  try {
    await execAsync('git fetch origin main');
    const countResult = await execAsync(
      'git rev-list --count origin/main...HEAD',
    );
    const commitsAhead = parseInt(countResult.stdout.trim());

    if (commitsAhead > 0) {
      await logOperation(
        'checkNeedsRebase',
        branch,
        { commitsAhead },
        { needsRebase: true },
      );
      return {
        needsRebase: true,
        commitsAhead,
      };
    }

    await logOperation('checkNeedsRebase', branch, {}, { needsRebase: false });
    return { needsRebase: false };
  } catch (error) {
    console.error('[Rebase] Error checking for rebase:', error);
    await logOperation(
      'checkNeedsRebase',
      branch,
      { error: error.message },
      { needsRebase: false, error: true },
    );
    return { needsRebase: false };
  }
}

export async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupBranch = `backup-${timestamp}`;

  await execWithCheck(`git checkout -b ${backupBranch}`);
  console.log(`[Rebase] Created backup branch: ${backupBranch}`);
  await logOperation('createBackup', backupBranch, {});
}

export async function performRebase() {
  const result = await execAsync('git branch --show-current');
  const branch = result.stdout.trim();

  try {
    await execWithCheck('git rebase origin/main');
    console.log('[Rebase] Successfully rebased onto origin/main');
    await logOperation('performRebase', branch, {}, { success: true });
    return { success: true };
  } catch (error) {
    console.error('[Rebase] Rebase failed:', error);

    try {
      await execWithCheck(`git rebase --abort`, true);
    } catch (e) {}

    await logOperation(
      'performRebase',
      branch,
      { error: error.message },
      { success: false },
    );
    return { success: false, error: error.message };
  }
}

async function getRepoInfo() {
  const result = await execAsync('git remote get-url origin');
  const url = result.stdout.trim();

  const sshMatch = url.match(/git@github\.com:([^/]+)\/(.+)\.git/);
  const httpsMatch = url.match(/https:\/\/github\.com\/([^/]+)\/(.+)\.git/);

  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

  throw new Error('Unable to parse GitHub repository URL');
}

export async function validateBranchProtection() {
  const result = await execAsync('git branch --show-current');
  const currentBranch = result.stdout.trim();

  if (['main', 'develop', 'master'].includes(currentBranch)) {
    await logOperation(
      'validateBranchProtection',
      currentBranch,
      { reason: 'protected_branch_name' },
      { protected: true },
    );
    return {
      protected: true,
      branch: currentBranch,
      reason: 'protected_branch_name',
    };
  }

  try {
    const { owner, repo } = await getRepoInfo();

    try {
      await execAsync(
        `gh api /repos/${owner}/${repo}/branches/${currentBranch}/protection`,
      );
      await logOperation(
        'validateBranchProtection',
        currentBranch,
        { reason: 'api_protected' },
        { protected: true },
      );
      return {
        protected: true,
        branch: currentBranch,
        reason: 'api_protected',
      };
    } catch (apiError) {
      await logOperation(
        'validateBranchProtection',
        currentBranch,
        { reason: 'api_unprotected' },
        { protected: false },
      );
      return { protected: false };
    }
  } catch (error) {
    console.error('[Rebase] Error checking branch protection:', error);
    await logOperation(
      'validateBranchProtection',
      currentBranch,
      { error: error.message },
      { protected: false, error: true },
    );
    return { protected: false };
  }
}

export async function checkPRStatus() {
  const result = await execAsync('git branch --show-current');
  const currentBranch = result.stdout.trim();

  try {
    const { owner, repo } = await getRepoInfo();

    const prResult = await execAsync(
      `gh api /repos/${owner}/${repo}/pulls?head=${owner}:${currentBranch}`,
    );
    const prs = JSON.parse(prResult.stdout);

    if (prs.length === 0) {
      await logOperation(
        'checkPRStatus',
        currentBranch,
        { reason: 'no_pr' },
        { canRebase: true },
      );
      return { canRebase: true, reason: 'no_pr' };
    }

    const pr = prs[0];
    const sha = pr.head.sha;

    const statusResult = await execAsync(
      `gh api /repos/${owner}/${repo}/commits/${sha}/status`,
    );
    const status = JSON.parse(statusResult.stdout);

    if (status.state !== 'success') {
      await logOperation(
        'checkPRStatus',
        currentBranch,
        { reason: 'ci_failing', state: status.state },
        { canRebase: false },
      );
      return { canRebase: false, reason: 'ci_failing', state: status.state };
    }

    const reviewResult = await execAsync(
      `gh api /repos/${owner}/${repo}/pulls/${pr.number}/reviews`,
    );
    const reviews = JSON.parse(reviewResult.stdout);

    const pendingReviews = reviews.filter((r) => r.state === 'APPROVED').length;
    const requiredReviews = 1;

    if (pendingReviews < requiredReviews) {
      await logOperation(
        'checkPRStatus',
        currentBranch,
        {
          reason: 'reviews_pending',
          pending: pendingReviews,
          required: requiredReviews,
        },
        { canRebase: false },
      );
      return {
        canRebase: false,
        reason: 'reviews_pending',
        pending: pendingReviews,
        required: requiredReviews,
      };
    }

    await logOperation(
      'checkPRStatus',
      currentBranch,
      { reason: 'all_checks_passed' },
      { canRebase: true },
    );
    return { canRebase: true, reason: 'all_checks_passed' };
  } catch (error) {
    console.error('[Rebase] Error checking PR status:', error);
    await logOperation(
      'checkPRStatus',
      currentBranch,
      { error: error.message },
      { canRebase: true, error: true },
    );
    return { canRebase: true, error: true };
  }
}
