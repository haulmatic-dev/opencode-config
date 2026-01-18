/**
 * Task Validator - Validates that tasks are atomic and appropriately sized.
 *
 * An atomic task should be:
 * - Small enough to complete in a single session (≤4 hours)
 * - Focused on a single responsibility
 * - Limited in scope (≤3 files)
 * - Clearly defined (≤3 acceptance criteria)
 */

const MAX_DURATION_HOURS = 4;
const MAX_FILES = 3;
const MAX_ACCEPTANCE_CRITERIA = 3;

/**
 * Validates a task for atomicity.
 *
 * @param {Object} task - The task to validate
 * @param {string} task.title - Task title
 * @param {string} [task.description] - Task description
 * @param {number} [task.estimatedHours] - Estimated duration in hours
 * @param {string[]} [task.files] - Array of file paths affected
 * @param {string[]} [task.acceptanceCriteria] - Array of acceptance criteria
 * @returns {Object} Validation result with valid, issues, and suggestions
 */
export function validate(task) {
  const issues = [];
  const suggestions = [];

  if (!task || typeof task !== 'object') {
    return {
      valid: false,
      issues: ['Task must be a valid object'],
      suggestions: [],
    };
  }

  const estimatedHours = task.estimatedHours ?? 0;
  const files = task.files ?? [];
  const acceptanceCriteria = task.acceptanceCriteria ?? [];

  if (estimatedHours > MAX_DURATION_HOURS) {
    issues.push(
      `Duration estimate (${estimatedHours}h) exceeds maximum (${MAX_DURATION_HOURS}h)`,
    );
    suggestions.push(
      'Consider breaking this into smaller tasks by feature or layer',
    );
  }

  if (files.length > MAX_FILES) {
    issues.push(`File count (${files.length}) exceeds maximum (${MAX_FILES})`);
    suggestions.push('Focus on a single file or feature area per task');
  }

  if (acceptanceCriteria.length > MAX_ACCEPTANCE_CRITERIA) {
    issues.push(
      `Acceptance criteria count (${acceptanceCriteria.length}) exceeds maximum (${MAX_ACCEPTANCE_CRITERIA})`,
    );
    suggestions.push(
      'Split into multiple focused tasks with clear, single outcomes',
    );
  }

  if (!task.title || task.title.trim().length === 0) {
    issues.push('Task title is required');
  }

  if (isMultiResponsibility(task)) {
    issues.push('Task may have multiple responsibilities');
    suggestions.push('Refactor to have one clear purpose');
  }

  const valid = issues.length === 0;

  return { valid, issues, suggestions };
}

/**
 * Checks if a task likely has multiple responsibilities based on keywords.
 *
 * @param {Object} task - The task to check
 * @returns {boolean} True if task appears to have multiple responsibilities
 */
function isMultiResponsibility(task) {
  const text = [task.title ?? '', task.description ?? '']
    .join(' ')
    .toLowerCase();

  const multiResponsibilityPatterns = [
    /\band\b.*\bor\b/,
    /create.*update.*delete/i,
    /fix.*and.*improve/i,
    /refactor.*and.*add/i,
    /api.*and.*ui/i,
    /frontend.*backend/i,
    /migration.*and.*feature/i,
  ];

  return multiResponsibilityPatterns.some((pattern) => pattern.test(text));
}

/**
 * Suggests potential subtask splits for a large task.
 *
 * @param {Object} task - The task to analyze
 * @returns {Object[]} Array of suggested subtasks
 */
export function suggestSplits(task) {
  const subtasks = [];

  if (!task || typeof task !== 'object') {
    return [];
  }

  const estimatedHours = task.estimatedHours ?? 0;
  const files = task.files ?? [];
  const acceptanceCriteria = task.acceptanceCriteria ?? [];

  if (estimatedHours > MAX_DURATION_HOURS) {
    const hoursPerTask = Math.ceil(estimatedHours / 2);

    for (let i = 1; i <= 2; i++) {
      subtasks.push({
        title: `${task.title} - Part ${i}`,
        description: `Part ${i} of the original task`,
        estimatedHours: Math.min(hoursPerTask, MAX_DURATION_HOURS),
        files: files.slice(0, MAX_FILES),
        acceptanceCriteria: acceptanceCriteria.slice(
          0,
          MAX_ACCEPTANCE_CRITERIA,
        ),
        type: 'split',
      });
    }
  }

  if (files.length > MAX_FILES) {
    const fileGroups = chunkArray(files, MAX_FILES);

    fileGroups.forEach((group, index) => {
      subtasks.push({
        title: `${task.title} - Files ${index + 1}`,
        description: `Handle files: ${group.join(', ')}`,
        estimatedHours: Math.min(
          Math.ceil(estimatedHours / fileGroups.length),
          MAX_DURATION_HOURS,
        ),
        files: group,
        acceptanceCriteria: acceptanceCriteria.slice(
          0,
          MAX_ACCEPTANCE_CRITERIA,
        ),
        type: 'split',
      });
    });
  }

  if (acceptanceCriteria.length > MAX_ACCEPTANCE_CRITERIA) {
    const criteriaGroups = chunkArray(
      acceptanceCriteria,
      MAX_ACCEPTANCE_CRITERIA,
    );

    criteriaGroups.forEach((group, index) => {
      subtasks.push({
        title: `${task.title} - Criteria ${index + 1}`,
        description: `Acceptance criteria: ${group.join('; ')}`,
        estimatedHours: Math.min(
          Math.ceil(estimatedHours / criteriaGroups.length),
          MAX_DURATION_HOURS,
        ),
        files: files.slice(0, MAX_FILES),
        acceptanceCriteria: group,
        type: 'split',
      });
    });
  }

  if (isMultiResponsibility(task)) {
    subtasks.push({
      title: `${task.title} - Core Implementation`,
      description: 'Core functionality without additional scope',
      estimatedHours: Math.min(estimatedHours / 2, MAX_DURATION_HOURS),
      files: files.slice(0, MAX_FILES),
      acceptanceCriteria: acceptanceCriteria.slice(0, MAX_ACCEPTANCE_CRITERIA),
      type: 'split',
    });

    subtasks.push({
      title: `${task.title} - Secondary Features`,
      description: 'Additional scope separated for focus',
      estimatedHours: Math.min(estimatedHours / 2, MAX_DURATION_HOURS),
      files: files.slice(0, MAX_FILES),
      acceptanceCriteria: [],
      type: 'split',
    });
  }

  return subtasks;
}

/**
 * Chunks an array into smaller arrays of specified size.
 *
 * @param {any[]} array - The array to chunk
 * @param {number} size - Maximum chunk size
 * @returns {any[]} Array of chunks
 */
function chunkArray(array, size) {
  if (!Array.isArray(array)) {
    return [];
  }

  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default {
  validate,
  suggestSplits,
};
