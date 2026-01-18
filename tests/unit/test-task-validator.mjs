/**
 * Unit tests for lib/task-validator.js
 * @module test-task-validator
 */

import { suggestSplits, validate } from '../../lib/task-validator.js';

/**
 * Asserts that a condition is true.
 * @param {boolean} condition - Condition to assert
 * @param {string} message - Assertion message
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Asserts that two values are equal.
 * @param {any} actual - Actual value
 * @param {any} expected - Expected value
 * @param {string} message - Assertion message
 */
function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

/**
 * Asserts that an array has the expected length.
 * @param {any[]} array - Array to check
 * @param {number} length - Expected length
 * @param {string} message - Assertion message
 */
function assertLength(array, length, message) {
  if (!Array.isArray(array) || array.length !== length) {
    throw new Error(
      `${message}: expected length ${length}, got ${array?.length ?? 'not an array'}`,
    );
  }
}

/**
 * Asserts that an array is empty.
 * @param {any[]} array - Array to check
 * @param {string} message - Assertion message
 */
function assertEmpty(array, message) {
  assertLength(array, 0, message);
}

/**
 * Asserts that an array is not empty.
 * @param {any[]} array - Array to check
 * @param {string} message - Assertion message
 */
function assertNotEmpty(array, message) {
  assert(array.length > 0, `${message}: expected non-empty array`);
}

/**
 * Test runner for task-validator tests.
 */
export function runTests() {
  const results = { passed: 0, failed: 0, tests: [] };

  /**
   * Helper to run a single test.
   * @param {string} name - Test name
   * @param {() => void} fn - Test function
   */
  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: 'passed' });
      console.log(`  ✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message });
      console.log(`  ✗ ${name}: ${error.message}`);
    }
  }

  console.log('\nTask Validator Tests\n');

  // === validate() tests ===

  console.log('validate()');

  test('returns valid:true for minimal valid task', () => {
    const task = { title: 'Test task' };
    const result = validate(task);
    assert(result.valid === true, 'Task should be valid');
    assertEmpty(result.issues, 'Issues should be empty');
    assertEmpty(result.suggestions, 'Suggestions should be empty');
  });

  test('returns valid:true for fully compliant task', () => {
    const task = {
      title: 'Implement feature',
      description: 'Add new functionality',
      estimatedHours: 2,
      files: ['src/index.js'],
      acceptanceCriteria: ['Feature works', 'Tests pass'],
    };
    const result = validate(task);
    assert(result.valid === true, 'Task should be valid');
    assertEmpty(result.issues, 'Issues should be empty');
  });

  test('returns valid:false for null task', () => {
    const result = validate(null);
    assert(result.valid === false, 'Null task should be invalid');
    assert(
      result.issues.includes('Task must be a valid object'),
      'Should report invalid task',
    );
  });

  test('returns valid:false for non-object task', () => {
    const result = validate('string');
    assert(result.valid === false, 'String task should be invalid');
    assert(
      result.issues.includes('Task must be a valid object'),
      'Should report invalid task',
    );
  });

  test('detects duration exceeding threshold', () => {
    const task = { title: 'Large task', estimatedHours: 8 };
    const result = validate(task);
    assert(result.valid === false, 'Task with 8h estimate should be invalid');
    assert(
      result.issues.some((i) => i.includes('Duration estimate')),
      'Should report duration issue',
    );
    assert(result.suggestions.length > 0, 'Should provide duration suggestion');
  });

  test('accepts duration at exact threshold', () => {
    const task = { title: 'Boundary task', estimatedHours: 4 };
    const result = validate(task);
    assert(result.valid === true, 'Task with 4h estimate should be valid');
  });

  test('detects file count exceeding threshold', () => {
    const task = {
      title: 'Multi-file task',
      files: ['a.js', 'b.js', 'c.js', 'd.js'],
    };
    const result = validate(task);
    assert(result.valid === false, 'Task with 4 files should be invalid');
    assert(
      result.issues.some((i) => i.includes('File count')),
      'Should report file count issue',
    );
  });

  test('accepts file count at exact threshold', () => {
    const task = { title: 'Boundary task', files: ['a.js', 'b.js', 'c.js'] };
    const result = validate(task);
    assert(result.valid === true, 'Task with 3 files should be valid');
  });

  test('detects AC count exceeding threshold', () => {
    const task = {
      title: 'Complex task',
      acceptanceCriteria: ['AC1', 'AC2', 'AC3', 'AC4'],
    };
    const result = validate(task);
    assert(result.valid === false, 'Task with 4 ACs should be invalid');
    assert(
      result.issues.some((i) => i.includes('Acceptance criteria')),
      'Should report AC count issue',
    );
  });

  test('accepts AC count at exact threshold', () => {
    const task = {
      title: 'Boundary task',
      acceptanceCriteria: ['AC1', 'AC2', 'AC3'],
    };
    const result = validate(task);
    assert(result.valid === true, 'Task with 3 ACs should be valid');
  });

  test('detects missing title', () => {
    const task = { description: 'No title task' };
    const result = validate(task);
    assert(result.valid === false, 'Task without title should be invalid');
    assert(
      result.issues.includes('Task title is required'),
      'Should report missing title',
    );
  });

  test('detects empty title', () => {
    const task = { title: '' };
    const result = validate(task);
    assert(result.valid === false, 'Task with empty title should be invalid');
  });

  test('detects whitespace-only title', () => {
    const task = { title: '   ' };
    const result = validate(task);
    assert(
      result.valid === false,
      'Task with whitespace title should be invalid',
    );
  });

  test('detects "and or" multi-responsibility pattern', () => {
    const task = { title: 'Implement A and then B or C' };
    const result = validate(task);
    assert(
      result.valid === false,
      'Task with "and" and "or" should be invalid',
    );
    assert(
      result.issues.includes('Task may have multiple responsibilities'),
      'Should report multi-responsibility',
    );
  });

  test('detects "api and ui" multi-responsibility pattern', () => {
    const task = { title: 'Fix API and UI bugs' };
    const result = validate(task);
    assert(result.valid === false, 'Task with "api and ui" should be invalid');
  });

  test('detects "frontend and backend" pattern', () => {
    const task = { title: 'Update frontend and backend' };
    const result = validate(task);
    assert(
      result.valid === false,
      'Task with "frontend and backend" should be invalid',
    );
  });

  test('detects "create and update and delete" pattern', () => {
    const task = { title: 'Create, update, and delete functionality' };
    const result = validate(task);
    assert(
      result.valid === false,
      'Task with create/update/delete should be invalid',
    );
  });

  test('ignores title without multi-responsibility patterns', () => {
    const task = { title: 'Implement user authentication' };
    const result = validate(task);
    assert(result.valid === true, 'Simple task should be valid');
  });

  test('handles missing optional fields gracefully', () => {
    const task = { title: 'Minimal task' };
    const result = validate(task);
    assert(result.valid === true, 'Minimal task should be valid');
  });

  test('combines multiple issues and suggestions', () => {
    const task = {
      title: 'Huge task',
      estimatedHours: 10,
      files: ['a.js', 'b.js', 'c.js', 'd.js', 'e.js'],
      acceptanceCriteria: ['1', '2', '3', '4', '5'],
    };
    const result = validate(task);
    assert(
      result.valid === false,
      'Task with multiple issues should be invalid',
    );
    assert(result.issues.length >= 3, 'Should report multiple issues');
    assert(
      result.suggestions.length >= 3,
      'Should provide multiple suggestions',
    );
  });

  // === suggestSplits() tests ===

  console.log('\nsuggestSplits()');

  test('returns empty array for null task', () => {
    const result = suggestSplits(null);
    assertEmpty(result, 'Null task should return empty array');
  });

  test('returns empty array for non-object', () => {
    const result = suggestSplits('string');
    assertEmpty(result, 'String should return empty array');
  });

  test('returns empty array for already atomic task', () => {
    const task = { title: 'Small task', estimatedHours: 2 };
    const result = suggestSplits(task);
    assertEmpty(result, 'Atomic task should return empty array');
  });

  test('suggests duration-based splits for long task', () => {
    const task = { title: 'Big feature', estimatedHours: 10 };
    const result = suggestSplits(task);
    assert(result.length > 0, 'Long task should have splits');
    assert(
      result.every((s) => s.type === 'split'),
      'All splits should have type "split"',
    );
    assert(
      result.every((s) => s.title.includes('Part')),
      'Duration splits should include "Part"',
    );
  });

  test('duration splits respect max hours per task', () => {
    const task = { title: 'Huge feature', estimatedHours: 16 };
    const result = suggestSplits(task);
    result.forEach((split) => {
      assert(
        split.estimatedHours <= 4,
        `Split estimated hours should be <= 4, got ${split.estimatedHours}`,
      );
    });
  });

  test('suggests file-based splits for many files', () => {
    const task = {
      title: 'Refactor project',
      files: ['a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js'],
    };
    const result = suggestSplits(task);
    assert(result.length > 0, 'Task with many files should have splits');
    assert(
      result.every((s) => s.files.length <= 3),
      'Each split should have <= 3 files',
    );
  });

  test('file splits include correct files in each', () => {
    const task = {
      title: 'Update files',
      files: ['a.js', 'b.js', 'c.js', 'd.js'],
    };
    const result = suggestSplits(task);
    const allFiles = new Set(result.flatMap((s) => s.files));
    const originalFiles = new Set(task.files);
    assertEquals(
      allFiles.size,
      originalFiles.size,
      'All original files should be in splits',
    );
  });

  test('suggests AC-based splits for many criteria', () => {
    const task = {
      title: 'Complex feature',
      acceptanceCriteria: ['AC1', 'AC2', 'AC3', 'AC4', 'AC5', 'AC6', 'AC7'],
    };
    const result = suggestSplits(task);
    assert(result.length > 0, 'Task with many ACs should have splits');
    result.forEach((split) => {
      assert(
        split.acceptanceCriteria.length <= 3,
        'Each split should have <= 3 ACs',
      );
    });
  });

  test('AC splits contain all original criteria', () => {
    const task = {
      title: 'Feature with ACs',
      acceptanceCriteria: ['A', 'B', 'C', 'D', 'E'],
    };
    const result = suggestSplits(task);
    const allAC = new Set(result.flatMap((s) => s.acceptanceCriteria));
    const originalAC = new Set(task.acceptanceCriteria);
    assertEquals(
      allAC.size,
      originalAC.size,
      'All original ACs should be in splits',
    );
  });

  test('suggests split for multi-responsibility task', () => {
    const task = { title: 'Implement API and UI' };
    const result = suggestSplits(task);
    assert(result.length > 0, 'Multi-responsibility task should have splits');
    assert(
      result.some((s) => s.title.includes('Core Implementation')),
      'Should have core implementation split',
    );
    assert(
      result.some((s) => s.title.includes('Secondary')),
      'Should have secondary features split',
    );
  });

  test('returns multiple types of splits when applicable', () => {
    const task = {
      title: 'Huge multi-responsibility task',
      estimatedHours: 12,
      files: ['a.js', 'b.js', 'c.js', 'd.js'],
      acceptanceCriteria: ['1', '2', '3', '4', '5'],
    };
    const result = suggestSplits(task);
    assert(result.length > 0, 'Complex task should have multiple split types');
  });

  test('split tasks include original title', () => {
    const task = { title: 'Original Feature', estimatedHours: 8 };
    const result = suggestSplits(task);
    assert(
      result.every((s) => s.title.includes('Original Feature')),
      'All splits should reference original title',
    );
  });

  test('split tasks preserve non-null description', () => {
    const task = {
      title: 'Task',
      description: 'Original description',
      estimatedHours: 8,
    };
    const result = suggestSplits(task);
    assert(
      result.every((s) => s.description),
      'Splits should have descriptions',
    );
  });

  // === Edge cases ===

  console.log('\nEdge cases');

  test('handles zero values correctly', () => {
    const task = {
      title: 'Zero task',
      estimatedHours: 0,
      files: [],
      acceptanceCriteria: [],
    };
    const result = validate(task);
    assert(result.valid === true, 'Task with zero values should be valid');
  });

  test('handles empty arrays correctly', () => {
    const task = { title: 'Empty task', files: [], acceptanceCriteria: [] };
    const result = validate(task);
    assert(result.valid === true, 'Task with empty arrays should be valid');
  });

  test('handles very large numbers', () => {
    const task = { title: 'Huge', estimatedHours: 1000 };
    const result = validate(task);
    assert(
      result.valid === false,
      'Task with very large estimate should be invalid',
    );
  });

  test('handles many files', () => {
    const task = {
      title: 'Massive',
      files: Array.from({ length: 100 }, (_, i) => `file${i}.js`),
    };
    const result = validate(task);
    assert(result.valid === false, 'Task with 100 files should be invalid');
  });

  test('handles many acceptance criteria', () => {
    const task = {
      title: 'Complex',
      acceptanceCriteria: Array.from({ length: 50 }, (_, i) => `AC${i}`),
    };
    const result = validate(task);
    assert(result.valid === false, 'Task with 50 ACs should be invalid');
  });

  test('suggestSplits handles empty arrays', () => {
    const task = { title: 'Task', files: [], acceptanceCriteria: [] };
    const result = suggestSplits(task);
    assertEmpty(result, 'Task with empty arrays should have no splits');
  });

  test('suggestSplits handles zero estimated hours', () => {
    const task = { title: 'Task', estimatedHours: 0 };
    const result = suggestSplits(task);
    assertEmpty(result, 'Task with 0 hours should have no splits');
  });

  test('title with numbers is not multi-responsibility', () => {
    const task = { title: 'Fix issue #123 and update docs' };
    const result = validate(task);
    assert(
      result.valid === true,
      'Task with issue number and "and" should be valid',
    );
  });

  test('description contributes to multi-responsibility detection', () => {
    const task = {
      title: 'Update feature',
      description: 'This requires changes to both frontend and backend',
    };
    const result = validate(task);
    assert(
      result.valid === false,
      'Multi-responsibility in description should be detected',
    );
  });

  // Summary
  console.log(
    `\nResults: ${results.passed} passed, ${results.failed} failed\n`,
  );

  return results;
}

// Run tests if executed directly
if (process.argv[1]?.endsWith('test-task-validator.mjs')) {
  runTests();
}
