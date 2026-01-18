#!/usr/bin/env node

import {
  analyzeTask,
  decomposeTask,
  detectDependencies,
  MAX_AC,
  MAX_FILES,
  MAX_HOURS,
  PHASE,
} from '../../lib/task-decomposition.js';

console.log('=== Task Decomposition Tests ===\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    return true;
  }
  throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    return true;
  }
  throw new Error(`${message}: expected ${expected}, got ${actual}`);
}

function assertArrayLength(arr, length, message) {
  if (arr.length === length) {
    return true;
  }
  throw new Error(
    `${message}: expected array length ${length}, got ${arr.length}`,
  );
}

function assertProperty(obj, prop, message) {
  if (prop in obj) {
    return true;
  }
  throw new Error(`${message}: property '${prop}' not found`);
}

const validTask = {
  id: 'task-1',
  title: 'Implement feature',
  description: 'Implement a new feature',
  files: ['src/utils.js'],
  acceptanceCriteria: ['Feature works', 'Tests pass', 'Docs updated'],
  complexity: 'medium',
};

const oversizedFileTask = {
  id: 'task-2',
  title: 'Refactor multiple files',
  description: 'Refactor many files',
  files: ['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js', 'src/e.js'],
  acceptanceCriteria: ['Code refactored'],
};

const oversizedACTask = {
  id: 'task-3',
  title: 'Add many acceptance criteria',
  description: 'Task with many AC',
  files: ['src/main.js'],
  acceptanceCriteria: [
    'Criterion 1',
    'Criterion 2',
    'Criterion 3',
    'Criterion 4',
    'Criterion 5',
  ],
};

const longDurationTask = {
  id: 'task-4',
  title: 'Large implementation',
  description: 'Complex implementation',
  files: ['src/main.js', 'src/core.js', 'src/utils.js'],
  acceptanceCriteria: ['Complete implementation', 'Integration tests'],
  complexity: 'high',
};

async function runTests() {
  console.log('--- analyzeTask Tests ---\n');

  try {
    console.log('Test 1: Atomic task is detected correctly');
    const result = analyzeTask(validTask);
    assert(result.isAtomic === true, 'Task should be atomic');
    assert(result.issues.length === 0, 'Should have no issues');
    assertArrayLength(result.suggestions, 0, 'Suggestions');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 2: Too many files detected');
    const result = analyzeTask(oversizedFileTask);
    assert(result.isAtomic === false, 'Task should not be atomic');
    assert(
      result.issues.some((i) => i.includes('Too many files')),
      'Should report file count issue',
    );
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 3: Too many acceptance criteria detected');
    const result = analyzeTask(oversizedACTask);
    assert(result.isAtomic === false, 'Task should not be atomic');
    assert(
      result.issues.some((i) => i.includes('Too many acceptance criteria')),
      'Should report AC count issue',
    );
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 4: Duration threshold enforced');
    const result = analyzeTask(longDurationTask);
    assert(result.isAtomic === false, 'Task should not be atomic');
    assert(
      result.issues.some((i) => i.includes('duration')),
      'Should report duration issue',
    );
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 5: Metrics returned correctly');
    const result = analyzeTask(validTask);
    assertProperty(result, 'metrics', 'Result');
    assertEqual(result.metrics.fileCount, 1, 'File count');
    assertEqual(result.metrics.acCount, 3, 'AC count');
    assert(result.metrics.estimatedHours > 0, 'Estimated hours');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 6: Research phase suggestion for requiresResearch');
    const researchTask = {
      id: 'task-5',
      title: 'Research new technology',
      description: 'Research and implement new tech',
      files: ['src/tech.js'],
      acceptanceCriteria: ['Research complete', 'Implementation done'],
      requiresResearch: true,
    };
    const result = analyzeTask(researchTask);
    assert(
      result.suggestions.some((s) => s.includes('research phase')),
      'Should suggest research phase separation',
    );
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 7: Constants are exported correctly');
    assertEqual(MAX_HOURS, 4, 'MAX_HOURS');
    assertEqual(MAX_FILES, 3, 'MAX_FILES');
    assertEqual(MAX_AC, 3, 'MAX_AC');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 8: PHASE enum is exported correctly');
    assertEqual(PHASE.RESEARCH, 'research', 'RESEARCH phase');
    assertEqual(PHASE.IMPLEMENTATION, 'implementation', 'IMPLEMENTATION phase');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  console.log('\n--- decomposeTask Tests ---\n');

  try {
    console.log('Test 9: Atomic task returns single subtask');
    const result = decomposeTask(validTask);
    assertArrayLength(result, 1, 'Result');
    assertEqual(result[0].title, validTask.title, 'Title preserved');
    assertEqual(result[0].phase, PHASE.IMPLEMENTATION, 'Default phase');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 10: Oversized task splits by files');
    const result = decomposeTask(oversizedFileTask);
    assert(result.length > 1, 'Should create multiple subtasks');
    assertEqual(result.length, 5, 'Should create 5 subtasks (one per file)');
    result.forEach((subtask) => {
      assertArrayLength(subtask.files, 1, 'Each subtask should have 1 file');
      assertProperty(subtask, 'parentTask', 'Subtask');
    });
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 11: Oversized task splits by criteria');
    const result = decomposeTask(oversizedACTask);
    assert(result.length > 1, 'Should create multiple subtasks');
    assertEqual(result.length, 2, 'Should create 2 subtasks');
    result.forEach((subtask) => {
      assert(
        subtask.acceptanceCriteria.length <= MAX_AC,
        'Each subtask should have <= 3 criteria',
      );
    });
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 12: Research task creates separate phases');
    const researchTask = {
      id: 'task-5',
      title: 'Research new technology',
      description: 'Research and implement new tech',
      files: ['src/tech.js', 'src/core.js', 'src/utils.js', 'src/api.js'],
      acceptanceCriteria: [
        'Research complete',
        'Implementation done',
        'Tests passing',
        'Documentation updated',
      ],
      requiresResearch: true,
    };
    const result = decomposeTask(researchTask);
    const researchSubtask = result.find((t) => t.phase === PHASE.RESEARCH);
    const implSubtask = result.find((t) => t.phase === PHASE.IMPLEMENTATION);
    assert(researchSubtask, 'Should have research subtask');
    assert(implSubtask, 'Should have implementation subtask');
    assertEqual(researchSubtask.phase, PHASE.RESEARCH, 'Research phase');
    assertEqual(implSubtask.phase, PHASE.IMPLEMENTATION, 'Impl phase');
    assert(
      implSubtask.dependsOn?.includes(researchSubtask.id),
      'Implementation should depend on research',
    );
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 13: Research task titles are prefixed correctly');
    const researchTask = {
      id: 'task-5',
      title: 'Research new technology',
      description: 'Research and implement new tech',
      files: ['src/tech.js', 'src/core.js', 'src/utils.js', 'src/api.js'],
      acceptanceCriteria: [
        'Research complete',
        'Implementation done',
        'Tests passing',
        'Documentation updated',
      ],
      requiresResearch: true,
    };
    const result = decomposeTask(researchTask);
    const researchSubtask = result.find((t) => t.phase === PHASE.RESEARCH);
    const implSubtask = result.find((t) => t.phase === PHASE.IMPLEMENTATION);
    assert(
      researchSubtask.title.startsWith('Research:'),
      'Research title should be prefixed',
    );
    assert(
      implSubtask.title.startsWith('Implement:'),
      'Implementation title should be prefixed',
    );
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  console.log('\n--- detectDependencies Tests ---\n');

  try {
    console.log('Test 14: Empty task has no dependencies');
    const task = { files: [] };
    const result = detectDependencies(task);
    assertEqual(result.length, 0, 'Should return empty array');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 15: Handles non-existent files gracefully');
    const task = { files: ['non-existent-file.js'] };
    const result = detectDependencies(task);
    assertEqual(result.length, 0, 'Should return empty array');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 16: Task with no files returns empty dependencies');
    const task = { title: 'No files task' };
    const result = detectDependencies(task);
    assertEqual(result.length, 0, 'Should return empty array');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  console.log('\n--- Edge Cases ---\n');

  try {
    console.log('Test 17: Task with no acceptance criteria is atomic');
    const minimalTask = {
      id: 'task-min',
      title: 'Minimal task',
      description: 'A minimal task',
    };
    const result = analyzeTask(minimalTask);
    assert(result.isAtomic === true, 'Should be atomic');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 18: Complexity affects duration estimate');
    const lowComplexityTask = {
      ...validTask,
      complexity: 'low',
    };
    const highComplexityTask = {
      ...validTask,
      complexity: 'high',
    };
    const lowResult = analyzeTask(lowComplexityTask);
    const highResult = analyzeTask(highComplexityTask);
    assert(
      highResult.metrics.estimatedHours > lowResult.metrics.estimatedHours,
      'High complexity should have longer duration',
    );
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 19: Subtask IDs are linked to parent');
    const result = decomposeTask(oversizedFileTask);
    result.forEach((subtask) => {
      assertEqual(
        subtask.parentTask,
        oversizedFileTask.id,
        'Subtask should reference parent',
      );
    });
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 20: File detection from acceptance criteria');
    const fileInACTask = {
      id: 'task-ac-file',
      title: 'Task with file in AC',
      description: 'Task description',
      acceptanceCriteria: [
        'Implement `src/specific-file.js` changes',
        'Update "lib/helper.js" documentation',
      ],
    };
    const files = [];
    for (const ac of fileInACTask.acceptanceCriteria) {
      const matches = ac.match(/[`'"](\S+\.\w+)[`'"]/g);
      if (matches) {
        for (const match of matches) {
          files.push(match.replace(/[`'"]/g, ''));
        }
      }
    }
    assertEqual(files.length, 2, 'Should extract 2 files from AC');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 21: Empty task is handled');
    const emptyTask = {};
    const result = analyzeTask(emptyTask);
    assertProperty(result, 'isAtomic', 'Result');
    assertProperty(result, 'issues', 'Result');
    assertProperty(result, 'suggestions', 'Result');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  try {
    console.log('\nTest 22: Preserves original task properties');
    const taskWithExtras = {
      id: 'task-extras',
      title: 'Task with extras',
      description: 'Description',
      files: ['src/main.js'],
      acceptanceCriteria: ['One criterion'],
      priority: 'high',
      tags: ['feature', 'urgent'],
      assignee: 'developer',
    };
    const result = decomposeTask(taskWithExtras);
    assertEqual(result[0].priority, 'high', 'Priority preserved');
    assertEqual(result[0].tags[0], 'feature', 'Tags preserved');
    assertEqual(result[0].assignee, 'developer', 'Assignee preserved');
    console.log('  ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed === 0) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
