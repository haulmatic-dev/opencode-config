#!/usr/bin/env node

import {
  checkForIrreversibleAction,
  IrreversibleActionError,
  validateTaskMetadata,
} from '../../plugin/stop-relay.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.log(`✗ ${message}`);
    failed++;
  }
}

function assertThrows(fn, expectedError, message) {
  try {
    fn();
    console.log(`✗ ${message} - expected error not thrown`);
    failed++;
  } catch (error) {
    if (expectedError && !(error instanceof expectedError)) {
      console.log(`✗ ${message} - wrong error type`);
      failed++;
    } else {
      console.log(`✓ ${message}`);
      passed++;
    }
  }
}

async function testRelayGateIntegration() {
  console.log('Testing Relay Gate Integration...\n');

  try {
    console.log('1. Test irreversible action detection - Git force push');
    assertThrows(
      () =>
        checkForIrreversibleAction(
          'git push',
          ['--force', 'origin'],
          {},
          { irreversible: true },
        ),
      IrreversibleActionError,
      'git push --force should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'git push --force origin main',
          [],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'git push --force in command should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'git push',
          ['--force-with-lease'],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'git push --force-with-lease should throw IrreversibleActionError',
    );

    console.log('\n2. Test irreversible action detection - SQL DROP TABLE');
    assertThrows(
      () =>
        checkForIrreversibleAction(
          'psql',
          ['-c', 'DROP TABLE users;'],
          {},
          { irreversible: true },
        ),
      IrreversibleActionError,
      'DROP TABLE command should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'DROP TABLE users;',
          [],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'DROP TABLE in command should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'drop table products',
          [],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'DROP TABLE lowercase should throw IrreversibleActionError',
    );

    console.log('\n3. Test irreversible action detection - SQL DROP DATABASE');
    assertThrows(
      () =>
        checkForIrreversibleAction(
          'psql',
          ['-c', 'DROP DATABASE production;'],
          {},
          { irreversible: true },
        ),
      IrreversibleActionError,
      'DROP DATABASE command should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'DROP DATABASE testdb;',
          [],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'DROP DATABASE in command should throw IrreversibleActionError',
    );

    console.log('\n4. Test irreversible action detection - SQL DELETE FROM');
    assertThrows(
      () =>
        checkForIrreversibleAction(
          'psql',
          ['-c', 'DELETE FROM users;'],
          {},
          { irreversible: true },
        ),
      IrreversibleActionError,
      'DELETE FROM command should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'DELETE FROM logs WHERE date < 2024;',
          [],
          {},
          { irreversible: true },
        ),
      IrreversibleActionError,
      'DELETE FROM with condition should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'delete from temp_table',
          [],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'DELETE FROM lowercase should throw IrreversibleActionError',
    );

    console.log('\n5. Test irreversible action detection - .beads/ directory');
    assertThrows(
      () =>
        checkForIrreversibleAction(
          'rm',
          ['-rf', '.beads/'],
          {},
          { irreversible: true },
        ),
      IrreversibleActionError,
      'Operations on .beads/ should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'mv',
          ['.beads/issues.jsonl', '/tmp'],
          {},
          { irreversible: true },
        ),
      IrreversibleActionError,
      'Moving .beads/ files should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'echo "test" > .beads/test.txt',
          [],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'Writing to .beads/ should throw IrreversibleActionError',
    );

    console.log('\n6. Test safe operations - Normal git commands');
    checkForIrreversibleAction('git status', [], {}, {});
    assert(true, 'git status should pass through without error');

    checkForIrreversibleAction('git log', [], {}, {});
    assert(true, 'git log should pass through without error');

    checkForIrreversibleAction('git diff', ['HEAD', 'main'], {}, {});
    assert(true, 'git diff should pass through without error');

    checkForIrreversibleAction('git commit', ['-m', 'test'], {}, {});
    assert(true, 'git commit should pass through without error');

    console.log('\n7. Test safe operations - SQL SELECT queries');
    checkForIrreversibleAction('psql', ['-c', 'SELECT * FROM users;'], {}, {});
    assert(true, 'SELECT query should pass through without error');

    checkForIrreversibleAction('SELECT count(*) FROM orders;', [], {}, {});
    assert(true, 'SELECT in command should pass through without error');

    console.log('\n8. Test safe operations - Other safe file operations');
    checkForIrreversibleAction('ls', ['-la'], {}, {});
    assert(true, 'ls command should pass through without error');

    checkForIrreversibleAction('cat', ['README.md'], {}, {});
    assert(true, 'cat command should pass through without error');

    checkForIrreversibleAction('mkdir', ['test-dir'], {}, {});
    assert(true, 'mkdir command should pass through without error');

    console.log('\n9. Test task metadata validation - Valid metadata');
    const result1 = validateTaskMetadata({
      irreversible: true,
      requires_human_approval: true,
    });
    assert(
      result1.valid === true && result1.warnings.length === 0,
      'Valid metadata with irreversible=true, requires_human_approval=true should pass',
    );

    const result2 = validateTaskMetadata({
      irreversible: false,
      requires_human_approval: false,
    });
    assert(
      result2.valid === true && result2.warnings.length === 0,
      'Valid metadata with both flags false should pass',
    );

    const result3 = validateTaskMetadata({
      requires_human_approval: true,
    });
    assert(
      result3.valid === true && result3.warnings.length === 0,
      'Valid metadata with only requires_human_approval should pass',
    );

    console.log('\n10. Test task metadata validation - Invalid metadata');
    const result4 = validateTaskMetadata({
      irreversible: true,
      requires_human_approval: false,
    });
    assert(
      result4.valid === false &&
        result4.warnings.includes(
          'Irreversible flag set but requires_human_approval is false',
        ),
      'Invalid metadata with irreversible=true, requires_human_approval=false should fail',
    );

    console.log('\n11. Test task metadata validation - Empty metadata');
    const result5 = validateTaskMetadata(null);
    assert(
      result5.valid === true && result5.warnings.length === 0,
      'Null metadata should pass',
    );

    const result6 = validateTaskMetadata(undefined);
    assert(
      result6.valid === true && result6.warnings.length === 0,
      'Undefined metadata should pass',
    );

    const result7 = validateTaskMetadata({});
    assert(
      result7.valid === true && result7.warnings.length === 0,
      'Empty object metadata should pass',
    );

    console.log('\n12. Test IrreversibleActionError properties');
    try {
      checkForIrreversibleAction(
        'git push',
        ['--force'],
        {},
        {
          irreversible: true,
        },
      );
      assert(false, 'Should have thrown error');
    } catch (error) {
      assert(
        error instanceof IrreversibleActionError,
        'Error should be instance of IrreversibleActionError',
      );
      assert(
        error.name === 'IrreversibleActionError',
        'Error name should be IrreversibleActionError',
      );
      assert(
        error.operation === 'git force push',
        'Error should contain operation name',
      );
      assert(
        error.message.includes('DANGEROUS'),
        'Error message should include DANGEROUS',
      );
      assert(
        error.message.includes('human approval'),
        'Error message should mention human approval',
      );
    }

    console.log('\n13. Test operations without irreversible flag');
    checkForIrreversibleAction('git push', ['--force'], {}, {});
    assert(true, 'git push --force without irreversible flag should pass');

    checkForIrreversibleAction('DROP TABLE test;', [], {}, {});
    assert(true, 'DROP TABLE without irreversible flag should pass');

    checkForIrreversibleAction('DELETE FROM logs;', [], {}, {});
    assert(true, 'DELETE FROM without irreversible flag should pass');

    checkForIrreversibleAction('rm -rf .beads/', [], {}, {});
    assert(true, '.beads/ operations without irreversible flag should pass');

    console.log('\n14. Test edge cases - SQL DROP SCHEMA');
    assertThrows(
      () =>
        checkForIrreversibleAction(
          'DROP SCHEMA public;',
          [],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'DROP SCHEMA should throw IrreversibleActionError',
    );

    console.log('\n15. Test edge cases - Pattern matching in args');
    assertThrows(
      () =>
        checkForIrreversibleAction(
          'psql',
          ['-c', 'DROP TABLE users;'],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'Pattern in args should be detected',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'git',
          ['push', '--force', 'origin'],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'Pattern split across args should be detected',
    );

    console.log('\n16. Test edge cases - Multiple patterns in command');
    assertThrows(
      () =>
        checkForIrreversibleAction(
          'git push --force origin && DROP TABLE users',
          [],
          {},
          { irreversible: true },
        ),
      IrreversibleActionError,
      'Multiple dangerous patterns should trigger error',
    );

    console.log('\n17. Test boundary conditions - Empty command and args');
    checkForIrreversibleAction('', [], {}, {});
    assert(true, 'Empty command should pass');

    checkForIrreversibleAction('git', [], {}, {});
    assert(true, 'Command with no args should pass');

    console.log('\n18. Test boundary conditions - Partial matches');
    checkForIrreversibleAction('forcepush', [], {}, {});
    assert(true, 'Partial match "forcepush" should not trigger');

    checkForIrreversibleAction('droptable', [], {}, {});
    assert(true, 'Partial match "droptable" should not trigger');

    checkForIrreversibleAction('.beads_backup', [], {}, {});
    assert(true, 'Partial match ".beads_backup" should not trigger');

    console.log('\n19. Test metadata with additional fields');
    const result8 = validateTaskMetadata({
      irreversible: true,
      requires_human_approval: true,
      priority: 1,
      assignee: 'user@example.com',
      tags: ['important'],
    });
    assert(
      result8.valid === true && result8.warnings.length === 0,
      'Metadata with additional fields should pass validation',
    );

    console.log('\n20. Test all SQL DROP variants');
    assertThrows(
      () =>
        checkForIrreversibleAction(
          'DROP SCHEMA marketing CASCADE;',
          [],
          {},
          { irreversible: true },
        ),
      IrreversibleActionError,
      'DROP SCHEMA should throw IrreversibleActionError',
    );

    assertThrows(
      () =>
        checkForIrreversibleAction(
          'drop table if exists users',
          [],
          {},
          {
            irreversible: true,
          },
        ),
      IrreversibleActionError,
      'DROP TABLE with IF EXISTS should throw IrreversibleActionError',
    );

    console.log('\n✅ All tests completed!');
    console.log(`\nResults: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testRelayGateIntegration();
