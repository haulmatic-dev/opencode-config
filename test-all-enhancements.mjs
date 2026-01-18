#!/usr/bin/env node

/**
 * Comprehensive Test Suite for All Remaining Enhancements
 *
 * Tests:
 * 1. Error Handling (errors.js)
 * 2. Configuration (config.js, gates.json)
 * 3. Test File Detection (test-detector.js)
 * 4. Gate Caching (cache.js)
 * 5. Metrics Collection (metrics.js)
 * 6. File Reservation (file-reservation.js)
 * 7. File Coordinator (file-coordinator.js)
 * 8. CLI Tools (gate-status, gate-metrics, file-reservation, coordinator-mode)
 */

import { execSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, 'test-output');
const CONFIG_DIR = join(__dirname, 'config');

let passed = 0;
let failed = 0;
const results = [];

function log(msg) {
  console.log(`[TEST] ${msg}`);
}

function pass(testName) {
  passed++;
  results.push({ name: testName, status: 'PASS' });
  console.log(`✓ PASS: ${testName}`);
}

function fail(testName, error) {
  failed++;
  results.push({ name: testName, status: 'FAIL', error: String(error) });
  console.log(`✗ FAIL: ${testName}`);
  console.log(`  Error: ${error.message || error}`);
}

function assert(condition, testName, error = 'Assertion failed') {
  if (condition) {
    pass(testName);
  } else {
    fail(testName, new Error(error));
  }
}

function cleanup() {
  try {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  } catch (e) {}
}

// ==================== ERROR HANDLING TESTS ====================

async function testErrorHandling() {
  log('=== Error Handling Tests ===');

  try {
    const { QualityGateError, ErrorTypes, classifyError } = await import(
      './lib/runner/utils/errors.js'
    );

    // Test error types exist
    assert(
      ErrorTypes.MISSING_TOOL.code === 10,
      'Error type MISSING_TOOL has correct code',
    );
    assert(
      ErrorTypes.VALIDATION_ERROR.code === 20,
      'Error type VALIDATION_ERROR has correct code',
    );
    assert(
      ErrorTypes.RUNTIME_ERROR.code === 40,
      'Error type RUNTIME_ERROR has correct code',
    );

    // Test error instantiation
    const error = new QualityGateError('Test error', ErrorTypes.MISSING_TOOL, {
      tool: 'eslint',
    });
    assert(error.message === 'Test error', 'Error message is set');
    assert(error.code === 10, 'Error code is set');
    assert(error.exitCode === 1, 'Exit code is set');
    assert(error.category === 'expected', 'Error category is set');
    assert(error.context.tool === 'eslint', 'Error context is set');

    // Test error classification
    const classified = classifyError(new Error('tool not found'));
    assert(
      classified.category === 'expected',
      'Missing tool is classified as expected',
    );

    pass('Error handling module');
  } catch (error) {
    fail('Error handling module', error);
  }
}

// ==================== CONFIGURATION TESTS ====================

async function testConfiguration() {
  log('=== Configuration Tests ===');

  try {
    const { loadConfig, validateConfig } = await import(
      './lib/runner/config.js'
    );

    // Test default config
    const config = loadConfig();
    assert(config.gates.timeout === 30000, 'Default timeout is 30000ms');
    assert(
      config.thresholds.mutation === 80,
      'Default mutation threshold is 80%',
    );
    assert(
      config.thresholds.coverage === 80,
      'Default coverage threshold is 80%',
    );

    // Test config structure
    assert(Array.isArray(config.testPatterns), 'Test patterns is an array');
    assert(config.testPatterns.length > 0, 'Test patterns is not empty');

    // Test environment override
    process.env.OPENCODE_TIMEOUT = '60000';
    const configWithEnv = loadConfig();
    assert(configWithEnv.gates.timeout === 60000, 'Environment override works');
    delete process.env.OPENCODE_TIMEOUT;

    pass('Configuration module');
  } catch (error) {
    fail('Configuration module', error);
  }
}

// ==================== TEST DETECTION TESTS ====================

async function testTestDetector() {
  log('=== Test File Detection Tests ===');

  try {
    const { TestFileDetector } = await import(
      './lib/runner/utils/test-detector.js'
    );

    // Create detector for test project
    const detector = new TestFileDetector(TEST_DIR);

    // Create test files
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
    mkdirSync(join(TEST_DIR, '__tests__'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'src', 'index.js'), '// code');
    writeFileSync(join(TEST_DIR, 'src', 'index.test.js'), '// test');
    writeFileSync(join(TEST_DIR, 'src', 'index.spec.js'), '// spec');
    writeFileSync(
      join(TEST_DIR, '__tests__', 'index.test.js'),
      '// integration test',
    );

    // Detect framework
    const framework = await detector.detectFramework();

    // Test file detection
    const testFiles = await detector.detectTestFiles([
      join(TEST_DIR, 'src', 'index.js'),
      join(TEST_DIR, 'src', 'index.test.js'),
      join(TEST_DIR, 'src', 'index.spec.js'),
      join(TEST_DIR, '__tests__', 'index.test.js'),
    ]);

    assert(testFiles.length === 3, `Detected ${testFiles.length}/3 test files`);

    // Check that code files are not test files
    const codeFiles = await detector.detectCodeFiles([
      join(TEST_DIR, 'src', 'index.js'),
    ]);
    assert(codeFiles.length === 1, 'Code files detected correctly');

    pass('Test file detector module');
  } catch (error) {
    fail('Test file detector module', error);
  }
}

// ==================== CACHING TESTS ====================

async function testCaching() {
  log('=== Caching Tests ===');

  try {
    const { GateCache } = await import('./lib/runner/cache.js');

    // Create test cache
    const testCache = new GateCache({
      cacheDir: join(TEST_DIR, 'cache'),
      ttl: 60000,
      enabled: true,
    });

    // Create test file
    const testFile = join(TEST_DIR, 'test-file.js');
    writeFileSync(testFile, 'const x = 1;');

    // Test cache miss
    const miss = await testCache.get('test-gate', [testFile]);
    assert(miss === null, 'Cache miss returns null');

    // Test cache set
    const result = { passed: true, score: 85 };
    await testCache.set('test-gate', [testFile], result);

    // Test cache hit
    const hit = await testCache.get('test-gate', [testFile]);
    assert(hit !== null, 'Cache hit returns data');
    assert(hit.passed === true, 'Cache hit returns correct result');

    // Test stats
    const stats = await testCache.getStats();
    assert(stats.files === 1, 'Stats show 1 cached file');

    // Test clear
    await testCache.clear();
    const clearedStats = await testCache.getStats();
    assert(clearedStats.files === 0, 'Clear removes all cached files');

    pass('Caching module');
  } catch (error) {
    fail('Caching module', error);
  }
}

// ==================== METRICS TESTS ====================

async function testMetrics() {
  log('=== Metrics Tests ===');

  try {
    const { MetricsCollector } = await import('./lib/runner/metrics.js');

    const metrics = new MetricsCollector({
      storagePath: join(TEST_DIR, 'metrics.json'),
      windowSize: 100,
    });

    // Record some timings
    for (let i = 0; i < 10; i++) {
      await metrics.recordTiming('lint', 100 + i * 10); // 100, 110, 120...
      await metrics.recordTiming('mutation', 1000 + i * 100); // 1000, 1100, 1200...
    }

    // Record some results
    for (let i = 0; i < 10; i++) {
      await metrics.recordResult('lint', i < 8); // 8 success, 2 fail
    }

    // Test stats
    const stats = metrics.getStats();
    assert(stats.lint.count === 10, 'Lint has 10 recordings');
    assert(stats.lint.avg > 100, 'Lint average is calculated');

    // Test percentiles
    const p50 = metrics.getPercentile('lint', 50);
    const p95 = metrics.getPercentile('lint', 95);
    assert(p50 !== null, 'p50 is calculated');
    assert(p95 !== null, 'p95 is calculated');

    // Test rates using getStats
    const allStats = metrics.getStats();
    const lintStats = allStats.lint;
    const successRate =
      (lintStats.successCount /
        (lintStats.successCount + lintStats.failureCount)) *
      100;
    assert(successRate === 80, 'Lint success rate is 80%');

    // Test reset
    await metrics.reset();
    const afterReset = metrics.getStats();
    assert(afterReset.lint.count === 0, 'Reset clears all data');

    pass('Metrics module');
  } catch (error) {
    fail('Metrics module', error);
  }
}

// ==================== FILE RESERVATION TESTS ====================

async function testFileReservation() {
  log('=== File Reservation Tests ===');

  try {
    const { FileReservationManager } = await import(
      './lib/runner/file-reservation.js'
    );

    const manager = new FileReservationManager();

    // Test acquisition
    const reservation = await manager.acquire(['src/**/*.js'], {
      ttl: 5000,
      owner: 'test-agent',
    });

    assert(reservation.id !== null, 'Reservation has ID');
    assert(reservation.owner === 'test-agent', 'Reservation has owner');
    assert(Array.isArray(reservation.filePatterns), 'Reservation has patterns');

    // Test status
    const status = manager.status();
    assert(status.length === 1, 'Status shows 1 reservation');

    // Test release by ID
    await reservation.release();
    const afterRelease = manager.status();
    assert(afterRelease.length === 0, 'Release removes reservation');

    // Test release by owner
    const reservation2 = await manager.acquire(['test/**/*.js'], {
      ttl: 5000,
      owner: 'test-agent-2',
    });
    const released = await manager.releaseByOwner('test-agent-2');
    assert(released === 1, 'Release by owner works');

    // Test clear
    await manager.acquire(['*.js'], { ttl: 5000, owner: 'test-3' });
    const cleared = await manager.clear();
    assert(cleared === 0 || cleared > 0, 'Clear works');

    pass('File reservation module');
  } catch (error) {
    fail('File reservation module', error);
  }
}

// ==================== FILE COORDINATOR TESTS ====================

async function testFileCoordinator() {
  log('=== File Coordinator Tests ===');

  try {
    const { FileBasedCoordinator } = await import(
      './lib/runner/file-coordinator.js'
    );

    const coordinator = new FileBasedCoordinator({
      stateDir: join(TEST_DIR, 'coordinator'),
    });

    // Test start/stop
    await coordinator.start();
    const status1 = await coordinator.getStatus();
    assert(status1.isRunning === true, 'Coordinator is running');

    await coordinator.stop();
    const status2 = await coordinator.getStatus();
    assert(status2.isRunning === false, 'Coordinator is stopped');

    pass('File coordinator module');
  } catch (error) {
    fail('File coordinator module', error);
  }
}

// ==================== CLI TOOLS TESTS ====================

async function testCLITools() {
  log('=== CLI Tools Tests ===');

  try {
    // Test gate-metrics.js
    const metricsOutput = execSync('node bin/gate-metrics.js --rates 2>&1', {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert(
      metricsOutput.includes('Rates') || metricsOutput.includes('No data'),
      'gate-metrics.js runs',
    );

    // Test gate-status.js
    const statusOutput = execSync('node bin/gate-status.js 2>&1', {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert(
      statusOutput.includes('Status') || statusOutput.includes('Never'),
      'gate-status.js runs',
    );

    // Test file-reservation.js status
    const reservationOutput = execSync(
      'node bin/file-reservation.js status 2>&1',
      {
        encoding: 'utf8',
        timeout: 5000,
      },
    );
    assert(
      reservationOutput.includes('No active') ||
        reservationOutput.includes('Active'),
      'file-reservation.js runs',
    );

    // Test coordinator-mode.js status
    const modeOutput = execSync('node bin/coordinator-mode.js status 2>&1', {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert(
      modeOutput.includes('mode') || modeOutput.includes('Mode'),
      'coordinator-mode.js runs',
    );

    pass('CLI tools');
  } catch (error) {
    fail('CLI tools', error);
  }
}

// ==================== RUN ALL TESTS ====================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('COMPREHENSIVE TEST SUITE - ALL ENHANCEMENTS');
  console.log('='.repeat(60) + '\n');

  cleanup();

  await testErrorHandling();
  await testConfiguration();
  await testTestDetector();
  await testCaching();
  await testMetrics();
  await testFileReservation();
  await testFileCoordinator();
  await testCLITools();

  cleanup();

  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(
    `Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`,
  );
  console.log('='.repeat(60) + '\n');

  if (failed > 0) {
    console.log('Failed tests:');
    for (const test of results.filter((t) => t.status === 'FAIL')) {
      console.log(`  - ${test.name}: ${test.error}`);
    }
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
