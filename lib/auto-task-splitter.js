import { BeadsClient } from './beads-client.mjs';

const beadsClient = new BeadsClient();

export const FailureType = {
  TEST: 'test',
  LINT: 'lint',
  SECURITY: 'security',
};

/**
 * Splits a task automatically when quality gate failures occur.
 * Creates focused subtasks based on failure type and links them to the original task.
 *
 * @param {Object} params - Parameters for task splitting
 * @param {string} params.originalTaskId - ID of the original task that failed
 * @param {string} params.failureType - Type of failure (test, lint, security)
 * @param {string} [params.details] - Additional details about the failure
 * @param {string[]} [params.affectedFiles] - List of affected files for lint issues
 * @returns {Promise<Object>} Result with created task IDs
 */
export async function splitOnFailure({
  originalTaskId,
  failureType,
  details = '',
  affectedFiles = [],
}) {
  const results = { investigation: null, fix: null };

  switch (failureType) {
    case FailureType.TEST:
      Object.assign(results, await handleTestFailure(originalTaskId, details));
      break;

    case FailureType.LINT:
      results.fix = await handleLintFailure(
        originalTaskId,
        details,
        affectedFiles,
      );
      break;

    case FailureType.SECURITY:
      results.fix = await handleSecurityFailure(originalTaskId, details);
      break;

    default:
      throw new Error(`Unknown failure type: ${failureType}`);
  }

  return results;
}

/**
 * Handles test failure by creating investigation and fix tasks.
 *
 * @param {string} originalTaskId - Original task ID
 * @param {string} details - Test failure details
 * @returns {Promise<Object>} Created task IDs
 */
async function handleTestFailure(originalTaskId, details) {
  const investigationTask = await beadsClient.create({
    title: `Investigate test failure in ${originalTaskId}`,
    description: `Root cause analysis for quality gate failure.\n\nDetails: ${details}`,
    type: 'investigation',
    priority: 1,
    labels: ['investigation', 'quality-gate'],
    deps: [originalTaskId],
  });

  const fixTask = await beadsClient.create({
    title: `Fix test failure from ${originalTaskId}`,
    description: `Implement fix for failing tests.\n\nOriginal task: ${originalTaskId}\n\nDetails: ${details}`,
    type: 'fix',
    priority: 1,
    labels: ['test-fix', 'quality-gate'],
    deps: [originalTaskId, investigationTask],
  });

  await beadsClient.depAdd(fixTask, investigationTask, 'blocks');

  return { investigation: investigationTask, fix: fixTask };
}

/**
 * Handles lint failure by creating a fix task with affected files.
 *
 * @param {string} originalTaskId - Original task ID
 * @param {string} details - Lint failure details
 * @param {string[]} affectedFiles - List of files with lint issues
 * @returns {Promise<string>} Created fix task ID
 */
async function handleLintFailure(originalTaskId, details, affectedFiles) {
  const filesList =
    affectedFiles.length > 0
      ? `\n\nAffected files:\n${affectedFiles.map((f) => `- ${f}`).join('\n')}`
      : '';

  const fixTask = await beadsClient.create({
    title: `Fix lint issues from ${originalTaskId}`,
    description: `Resolve lint failures in quality gate.\n\nDetails: ${details}${filesList}`,
    type: 'fix',
    priority: 2,
    labels: ['lint-fix', 'quality-gate'],
    deps: [originalTaskId],
  });

  return fixTask;
}

/**
 * Handles security failure by creating a security fix task.
 *
 * @param {string} originalTaskId - Original task ID
 * @param {string} details - Security failure details
 * @returns {Promise<string>} Created security fix task ID
 */
async function handleSecurityFailure(originalTaskId, details) {
  const fixTask = await beadsClient.create({
    title: `[SECURITY] Fix security vulnerability from ${originalTaskId}`,
    description: `Address security issue detected in quality gate.\n\nDetails: ${details}\n\nOriginal task: ${originalTaskId}`,
    type: 'fix',
    priority: 1,
    labels: ['security', 'security-fix', 'quality-gate'],
    deps: [originalTaskId],
  });

  return fixTask;
}

export default {
  FailureType,
  splitOnFailure,
};
