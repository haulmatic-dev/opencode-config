#!/usr/bin/env node

import {
  clearAll,
  forceRelease,
  getAllReservations,
  getStatus,
  isReserved,
  release,
  reserve,
  stopCleanup,
} from '../../lib/file-reservation.js';

console.log('=== File Reservation Tests ===\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  clearAll();

  // Test 1: Reserve a file
  try {
    console.log('Test 1: Reserve a file');
    const result = reserve('/path/to/file.js', 'owner1', 1000);
    if (
      result &&
      result.filePath === '/path/to/file.js' &&
      result.owner === 'owner1'
    ) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: Reservation not created correctly');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 2: isReserved returns true for reserved file
  try {
    console.log('\nTest 2: isReserved returns true for reserved file');
    if (isReserved('/path/to/file.js') === true) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected true for reserved file');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 3: isReserved returns false for non-reserved file
  try {
    console.log('\nTest 3: isReserved returns false for non-reserved file');
    if (isReserved('/path/to/other.js') === false) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected false for non-reserved file');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 4: getStatus returns correct status
  try {
    console.log('\nTest 4: getStatus returns correct status');
    const status = getStatus('/path/to/file.js');
    if (
      status &&
      status.filePath === '/path/to/file.js' &&
      status.owner === 'owner1' &&
      status.remaining > 0
    ) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: Status not correct');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 5: Cannot reserve already reserved file
  try {
    console.log('\nTest 5: Cannot reserve already reserved file');
    const result = reserve('/path/to/file.js', 'owner2', 1000);
    if (result === null) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: Should not allow double reservation');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 6: Release reservation by owner
  try {
    console.log('\nTest 6: Release reservation by owner');
    release('/path/to/file.js', 'owner1');
    if (isReserved('/path/to/file.js') === false) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: File should not be reserved after release');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 7: Wrong owner cannot release
  try {
    console.log('\nTest 7: Wrong owner cannot release');
    reserve('/path/to/file2.js', 'owner1', 1000);
    const result = release('/path/to/file2.js', 'wrong-owner');
    if (result === false && isReserved('/path/to/file2.js') === true) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: Wrong owner should not be able to release');
      failed++;
    }
    forceRelease('/path/to/file2.js');
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 8: TTL expiration
  try {
    console.log('\nTest 8: TTL expiration');
    reserve('/path/to/expire.js', 'owner1', 50);
    await new Promise((resolve) => setTimeout(resolve, 60));
    if (isReserved('/path/to/expire.js') === false) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: File should be expired after TTL');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 9: getAllReservations returns all reservations
  try {
    console.log('\nTest 9: getAllReservations returns all reservations');
    clearAll();
    reserve('/path/a.js', 'owner1', 1000);
    reserve('/path/b.js', 'owner2', 1000);
    const all = getAllReservations();
    if (all.length === 2) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Expected 2 reservations, got ${all.length}`);
      failed++;
    }
    clearAll();
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 10: getStatus returns null for non-reserved file
  try {
    console.log('\nTest 10: getStatus returns null for non-reserved file');
    const status = getStatus('/nonexistent.js');
    if (status === null) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected null for non-reserved file');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  stopCleanup();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
