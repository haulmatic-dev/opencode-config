#!/usr/bin/env node

import { CircuitBreaker, States } from '../../lib/circuit-breaker.js';

console.log('=== Circuit Breaker Tests ===\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Initial state is CLOSED
  try {
    console.log('Test 1: Initial state is CLOSED');
    const cb = new CircuitBreaker();
    if (cb.getState() === States.CLOSED) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Expected CLOSED, got ${cb.getState()}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 2: Successful calls don't change state
  try {
    console.log('\nTest 2: Successful calls keep state CLOSED');
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    await cb.execute(async () => 'success');
    if (cb.getState() === States.CLOSED) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Expected CLOSED, got ${cb.getState()}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 3: State transitions to OPEN after threshold exceeded
  try {
    console.log('\nTest 3: State transitions to OPEN after threshold exceeded');
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('fail');
        });
      } catch (e) {}
    }
    if (cb.getState() === States.OPEN) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Expected OPEN, got ${cb.getState()}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 4: Calls fail when circuit is OPEN
  try {
    console.log('\nTest 4: Calls fail when circuit is OPEN');
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('fail');
        });
      } catch (e) {}
    }
    let threwError = false;
    try {
      await cb.execute(async () => 'should not execute');
    } catch (e) {
      threwError = true;
    }
    if (threwError) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: Should have thrown error');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 5: State transitions to HALF_OPEN after timeout
  try {
    console.log('\nTest 5: State transitions to HALF_OPEN after timeout');
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 10 });
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('fail');
        });
      } catch (e) {}
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
    await cb.execute(async () => 'test');
    if (cb.getState() === States.HALF_OPEN) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Expected HALF_OPEN, got ${cb.getState()}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 6: HALF_OPEN transitions to CLOSED on success
  try {
    console.log('\nTest 6: HALF_OPEN transitions to CLOSED on success');
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 10,
      halfOpenCalls: 2,
    });
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('fail');
        });
      } catch (e) {}
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
    await cb.execute(async () => 'success');
    await cb.execute(async () => 'success');
    if (cb.getState() === States.CLOSED) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Expected CLOSED, got ${cb.getState()}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 7: HALF_OPEN transitions to OPEN on failure
  try {
    console.log('\nTest 7: HALF_OPEN transitions to OPEN on failure');
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 10 });
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('fail');
        });
      } catch (e) {}
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
    try {
      await cb.execute(async () => {
        throw new Error('fail');
      });
    } catch (e) {}
    if (cb.getState() === States.OPEN) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Expected OPEN, got ${cb.getState()}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 8: getStats returns correct values
  try {
    console.log('\nTest 8: getStats returns correct values');
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    try {
      await cb.execute(async () => {
        throw new Error('fail1');
      });
    } catch (e) {}
    try {
      await cb.execute(async () => {
        throw new Error('fail2');
      });
    } catch (e) {}
    const stats = cb.getStats();
    if (
      stats.failureCount === 2 &&
      stats.successCount === 0 &&
      stats.lastFailure !== null
    ) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Stats incorrect: ${JSON.stringify(stats)}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 9: Failure count resets on success in CLOSED state
  try {
    console.log('\nTest 9: Failure count resets on success in CLOSED state');
    const cb = new CircuitBreaker({ failureThreshold: 5 });
    try {
      await cb.execute(async () => {
        throw new Error('fail');
      });
    } catch (e) {}
    await cb.execute(async () => 'success');
    const stats = cb.getStats();
    if (stats.failureCount === 0) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(
        `  ❌ FAILED: Expected failureCount 0, got ${stats.failureCount}`,
      );
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 10: Custom options are applied
  try {
    console.log('\nTest 10: Custom options are applied');
    const cb = new CircuitBreaker({
      failureThreshold: 10,
      resetTimeout: 5000,
      halfOpenCalls: 5,
    });
    if (
      cb.failureThreshold === 10 &&
      cb.resetTimeout === 5000 &&
      cb.halfOpenCalls === 5
    ) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: Custom options not applied correctly');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 11: Half-open call limit is enforced
  try {
    console.log('\nTest 11: Half-open call limit is enforced');
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 10,
      halfOpenCalls: 2,
    });
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('fail');
        });
      } catch (e) {}
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
    await cb.execute(async () => 'success');
    let threwOnSecondCall = false;
    try {
      await cb.execute(async () => 'should fail');
    } catch (e) {
      threwOnSecondCall = true;
    }
    if (threwOnSecondCall && cb.getState() === States.OPEN) {
      console.log('  ✅ PASSED');
      passed++;
    } else if (!threwOnSecondCall && cb.getState() === States.CLOSED) {
      console.log(
        '  ✅ PASSED (transitioned to CLOSED after success threshold)',
      );
      passed++;
    } else {
      console.log(
        `  ❌ FAILED: threw=${threwOnSecondCall}, state=${cb.getState()}`,
      );
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 12: Function return value is preserved
  try {
    console.log('\nTest 12: Function return value is preserved');
    const cb = new CircuitBreaker();
    const result = await cb.execute(async () => ({ key: 'value' }));
    if (result && result.key === 'value') {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Return value not preserved: ${result}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Summary
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
