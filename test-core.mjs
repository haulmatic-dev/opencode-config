#!/usr/bin/env node

/**
 * Core Functionality Tests for All Enhancements
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, 'test-output');

let passed = 0;
let failed = 0;

function log(msg) {
  console.log(`[TEST] ${msg}`);
}
function pass(name) {
  passed++;
  console.log(`✓ PASS: ${name}`);
}
function fail(name, error) {
  failed++;
  console.log(`✗ FAIL: ${name}: ${error}`);
}
function assert(cond, name, error = 'Assertion failed') {
  cond ? pass(name) : fail(name, error);
}

async function testCoreFunctionality() {
  console.log('\n=== CORE FUNCTIONALITY TESTS ===\n');

  // Clean up
  try {
    rmSync(TEST_DIR, { recursive: true });
  } catch (e) {}
  mkdirSync(TEST_DIR, { recursive: true });

  // Test 1: Error types exist
  try {
    const { ErrorTypes, classifyError, QualityGateError } = await import(
      './lib/runner/utils/errors.js'
    );
    assert(ErrorTypes.MISSING_TOOL, 'ErrorTypes.MISSING_TOOL exists');
    assert(ErrorTypes.VALIDATION_ERROR, 'ErrorTypes.VALIDATION_ERROR exists');
    assert(ErrorTypes.RUNTIME_ERROR, 'ErrorTypes.RUNTIME_ERROR exists');

    // Test classification
    const result = classifyError(new Error('tool not found'));
    assert(result.code === 'MISSING_TOOL', 'classifyError works');

    // Test error creation
    const err = new QualityGateError('MISSING_TOOL', { tool: 'test' });
    assert(err.code === 'MISSING_TOOL', 'QualityGateError code works');
    assert(err.context.tool === 'test', 'QualityGateError context works');

    pass('Error handling module');
  } catch (e) {
    fail('Error handling module', e);
  }

  // Test 2: Configuration loads
  try {
    const { loadConfig } = await import('./lib/runner/config.js');
    const config = loadConfig();
    assert(config.gates?.timeout > 0, 'Config has timeout');
    assert(config.thresholds?.mutation > 0, 'Config has mutation threshold');
    assert(Array.isArray(config.testPatterns), 'Config has testPatterns');
    pass('Configuration module');
  } catch (e) {
    fail('Configuration module', e);
  }

  // Test 3: Test detector works
  try {
    const { TestFileDetector } = await import(
      './lib/runner/utils/test-detector.js'
    );
    const detector = new TestFileDetector(TEST_DIR);
    assert(
      detector.detectFramework !== undefined,
      'TestDetector has detectFramework',
    );
    assert(detector.isTestFile !== undefined, 'TestDetector has isTestFile');
    pass('Test file detector module');
  } catch (e) {
    fail('Test file detector module', e);
  }

  // Test 4: Cache works
  try {
    const { GateCache } = await import('./lib/runner/cache.js');
    const cache = new GateCache({
      cacheDir: join(TEST_DIR, 'cache'),
      enabled: true,
    });

    const testFile = join(TEST_DIR, 'test.js');
    writeFileSync(testFile, 'test content');

    // Test miss
    const miss = await cache.get('test', [testFile]);
    assert(miss === null, 'Cache miss returns null');

    // Test set
    await cache.set('test', [testFile], { passed: true });

    // Test hit
    const hit = await cache.get('test', [testFile]);
    assert(hit?.passed === true, 'Cache hit returns data');

    // Test stats
    const stats = await cache.getStats();
    assert(typeof stats.files === 'number', 'Cache stats works');

    await cache.clear();
    pass('Caching module');
  } catch (e) {
    fail('Caching module', e);
  }

  // Test 5: Metrics works
  try {
    const { MetricsCollector } = await import('./lib/runner/metrics.js');
    const metrics = new MetricsCollector({
      storagePath: join(TEST_DIR, 'metrics.json'),
    });

    await metrics.recordTiming('lint', 100);
    await metrics.recordTiming('lint', 200);
    await metrics.recordResult('lint', true);
    await metrics.recordResult('lint', false);

    const stats = metrics.getStats();
    assert(stats.lint?.avg > 0, 'Metrics average works');
    assert(metrics.getPercentile('lint', 50) !== null, 'Percentile works');

    await metrics.reset();
    pass('Metrics module');
  } catch (e) {
    fail('Metrics module', e);
  }

  // Test 6: File reservation works
  try {
    const { FileReservationManager } = await import(
      './lib/runner/file-reservation.js'
    );
    const manager = new FileReservationManager();

    const res = await manager.acquire(['*.js'], { owner: 'test', ttl: 5000 });
    assert(res.id, 'Reservation has ID');
    assert(res.owner === 'test', 'Reservation has owner');

    const status = manager.status();
    assert(status.length >= 0, 'Status works');

    await res.release();
    pass('File reservation module');
  } catch (e) {
    fail('File reservation module', e);
  }

  // Test 7: File coordinator works
  try {
    const { FileBasedCoordinator } = await import(
      './lib/runner/file-coordinator.js'
    );
    const coord = new FileBasedCoordinator({
      stateDir: join(TEST_DIR, 'coordinator'),
    });

    await coord.start();
    const status = await coord.getStatus();
    assert(status.isRunning === true, 'Coordinator starts');

    await coord.stop();
    const status2 = await coord.getStatus();
    assert(status2.isRunning === false, 'Coordinator stops');

    pass('File coordinator module');
  } catch (e) {
    fail('File coordinator module', e);
  }

  // Test 8: CLI tools
  try {
    const statusOut = execSync('node bin/gate-status.js', {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert(
      statusOut.includes('Status') || statusOut.includes('Never'),
      'gate-status.js works',
    );

    pass('CLI tools');
  } catch (e) {
    fail('CLI tools', e);
  }

  // Cleanup
  try {
    rmSync(TEST_DIR, { recursive: true });
  } catch (e) {}

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`TOTAL: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`RATE: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

testCoreFunctionality().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
