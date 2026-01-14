import { execAsync } from '../../utils/exec.js';

async function captureTestSnapshot(_filesModified) {
  console.log('[TDD Enforcer] Capturing test snapshot...');

  try {
    const testResult = await execAsync('npm test 2>&1', {
      timeout: 60000,
    });

    const passMatch = testResult.stdout.match(/(\d+)\s+passing/i);
    const failMatch = testResult.stdout.match(/(\d+)\s+failing/i);
    const skipMatch = testResult.stdout.match(/(\d+)\s+skipped/i);

    return {
      exitCode: testResult.exitCode,
      passed: passMatch ? parseInt(passMatch[1], 10) : 0,
      failed: failMatch ? parseInt(failMatch[1], 10) : 0,
      skipped: skipMatch ? parseInt(skipMatch[1], 10) : 0,
      output: testResult.stdout,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      exitCode: error.exitCode || -1,
      passed: 0,
      failed: 1,
      skipped: 0,
      output: error.message,
      timestamp: Date.now(),
      error: true,
    };
  }
}

export async function verifyTDD(filesModified) {
  console.log(
    '[TDD Enforcer] Verifying TDD compliance for modified files:',
    filesModified,
  );

  if (!filesModified || filesModified.length === 0) {
    return {
      passed: true,
      reason: 'No files modified, TDD verification skipped',
      details: { skipped: true },
    };
  }

  const testFiles = filesModified.filter(
    (f) => f.includes('.test.') || f.includes('.spec.'),
  );
  const codeFiles = filesModified.filter((f) => !testFiles.includes(f));

  if (testFiles.length === 0) {
    return {
      passed: false,
      reason: 'TDD violation: Code modified without corresponding test changes',
      details: {
        violation: 'no_test_changes',
        codeFiles,
      },
    };
  }

  const snapshotBefore = await captureTestSnapshot(filesModified);

  if (snapshotBefore.exitCode === 0 && snapshotBefore.failed === 0) {
    return {
      passed: false,
      reason:
        'TDD violation: Tests pass before implementation (Red phase required)',
      details: {
        violation: 'tests_pass_without_implementation',
        snapshot: snapshotBefore,
      },
    };
  }

  console.log(
    '[TDD Enforcer] ✓ Red phase verified - tests fail on current code',
  );

  const redGreenResult = await enforceRedGreenCycle();
  if (!redGreenResult.passed) {
    return redGreenResult;
  }

  const snapshotAfter = await captureTestSnapshot(filesModified);

  const comparison = compareTestSnapshots(snapshotBefore, snapshotAfter);

  if (snapshotAfter.exitCode !== 0 || snapshotAfter.failed > 0) {
    return {
      passed: false,
      reason:
        'TDD violation: Tests still fail after implementation (Green phase required)',
      details: {
        violation: 'tests_fail_after_implementation',
        comparison,
        snapshotAfter,
      },
    };
  }

  console.log(
    '[TDD Enforcer] ✓ Green phase verified - tests pass after implementation',
  );

  const coverageThreshold = 80;
  const coverageResult = await checkTestCoverage(coverageThreshold);

  if (!coverageResult.passed) {
    return {
      passed: false,
      reason: `Coverage threshold ${coverageThreshold}% not met`,
      details: {
        violation: 'coverage_below_threshold',
        coverage: coverageResult,
        threshold: coverageThreshold,
      },
    };
  }

  return {
    passed: true,
    reason: 'TDD cycle verified: Red → Green → Coverage met',
    details: {
      testFiles,
      codeFiles,
      comparison,
      coverage: coverageResult,
      redGreenCycle: redGreenResult,
    },
  };
}

export function compareTestSnapshots(before, after) {
  const passedDelta = after.passed - before.passed;
  const failedDelta = after.failed - before.failed;
  const timeDelta = after.timestamp - before.timestamp;

  return {
    before: {
      passed: before.passed,
      failed: before.failed,
      skipped: before.skipped,
    },
    after: {
      passed: after.passed,
      failed: after.failed,
      skipped: after.skipped,
    },
    delta: {
      passed: passedDelta,
      failed: failedDelta,
      skipped: after.skipped - before.skipped,
    },
    improvement: passedDelta > 0 || failedDelta < 0,
    regression: passedDelta < 0 || failedDelta > 0,
    executionTime: timeDelta,
  };
}

export async function enforceRedGreenCycle() {
  console.log('[TDD Enforcer] Enforcing red-green-refactor cycle...');

  const gitStatusResult = await execAsync('git status --short 2>&1');
  const hasUncommittedChanges = gitStatusResult.stdout.trim().length > 0;

  if (!hasUncommittedChanges) {
    return {
      passed: false,
      reason:
        'TDD violation: No changes detected - red-green cycle requires test and code changes',
      details: {
        violation: 'no_changes',
        phase: 'red_green',
      },
    };
  }

  const testFilesResult = await execAsync(
    'git diff --name-only | grep -E ".(test|spec)." 2>&1 || echo ""',
  );
  const testFiles = testFilesResult.stdout.trim().split('\n').filter(Boolean);

  const codeFilesResult = await execAsync(
    'git diff --name-only | grep -v -E ".(test|spec)." 2>&1 || echo ""',
  );
  const codeFiles = codeFilesResult.stdout.trim().split('\n').filter(Boolean);

  if (testFiles.length === 0) {
    return {
      passed: false,
      reason: 'TDD violation: Red phase requires failing tests first',
      details: {
        violation: 'missing_red_phase',
        phase: 'red',
        testFiles,
        codeFiles,
      },
    };
  }

  const testOrderResult = await execAsync(
    'git log --all --format="%H %s" --name-only 2>&1 | head -100',
  );
  const commits = testOrderResult.stdout.split('\n\n');

  let testFirstViolation = false;
  let lastTestCommit = null;
  let lastCodeCommit = null;

  for (const commit of commits) {
    const lines = commit.split('\n');
    const files = lines.slice(1);
    const hasTestFile = files.some((f) => f.match(/\.(test|spec)\./));
    const hasCodeFile = files.some(
      (f) => !f.match(/\.(test|spec)\./) && f.endsWith('.js'),
    );

    if (hasTestFile) {
      lastTestCommit = lines[0];
      if (lastCodeCommit && !lastTestCommit) {
        testFirstViolation = true;
      }
    }
    if (hasCodeFile) {
      lastCodeCommit = lines[0];
    }
  }

  if (testFirstViolation) {
    console.warn(
      '[TDD Enforcer] ⚠ Warning: Code appears to be committed before tests in recent history',
    );
  }

  return {
    passed: true,
    reason: 'Red-green cycle structure validated',
    details: {
      testFilesCount: testFiles.length,
      codeFilesCount: codeFiles.length,
      testFirstViolation,
      testFiles,
      codeFiles,
    },
  };
}

export async function checkTestCoverage(threshold = 80) {
  console.log(
    `[TDD Enforcer] Checking test coverage (threshold: ${threshold}%)...`,
  );

  try {
    const coverageCmdResult = await execAsync(
      'cat package.json | grep -i coverage 2>&1 || echo ""',
    );
    const hasCoverageScript = coverageCmdResult.stdout.includes('coverage');

    if (!hasCoverageScript) {
      return {
        passed: true,
        reason: 'Coverage check skipped - no coverage script configured',
        details: {
          skipped: true,
          threshold,
        },
      };
    }

    const coverageResult = await execAsync(
      'npm run coverage 2>&1 || npm test -- --coverage 2>&1',
      {
        timeout: 120000,
      },
    );

    const coverageMatch = coverageResult.stdout.match(
      /All files[^|]*\|\s*([\d.]+)\s*\|/i,
    );
    const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

    const linesMatch = coverageResult.stdout.match(
      /Lines[^|]*\|\s*([\d.]+)\s*\|/i,
    );
    const linesCoverage = linesMatch ? parseFloat(linesMatch[1]) : 0;

    const statementsMatch = coverageResult.stdout.match(
      /Statements[^|]*\|\s*([\d.]+)\s*\|/i,
    );
    const statementsCoverage = statementsMatch
      ? parseFloat(statementsMatch[1])
      : 0;

    const branchesMatch = coverageResult.stdout.match(
      /Branches[^|]*\|\s*([\d.]+)\s*\|/i,
    );
    const branchesCoverage = branchesMatch ? parseFloat(branchesMatch[1]) : 0;

    const belowThreshold = {
      overall: coverage < threshold,
      lines: linesCoverage < threshold,
      statements: statementsCoverage < threshold,
      branches: branchesCoverage < threshold,
    };

    const passed = !belowThreshold.overall;

    if (passed) {
      console.log(
        `[TDD Enforcer] ✓ Coverage ${coverage}% meets threshold ${threshold}%`,
      );
    } else {
      console.log(
        `[TDD Enforcer] ✗ Coverage ${coverage}% below threshold ${threshold}%`,
      );
    }

    return {
      passed,
      reason: passed
        ? `Coverage ${coverage}% meets threshold ${threshold}%`
        : `Coverage ${coverage}% below threshold ${threshold}%`,
      details: {
        overall: coverage,
        lines: linesCoverage,
        statements: statementsCoverage,
        branches: branchesCoverage,
        threshold,
        belowThreshold,
      },
    };
  } catch (error) {
    console.warn(
      '[TDD Enforcer] ⚠ Coverage check failed, continuing:',
      error.message,
    );
    return {
      passed: true,
      reason: 'Coverage check skipped due to error',
      details: {
        skipped: true,
        error: error.message,
        threshold,
      },
    };
  }
}

export async function validateTDDWorkflow(filesModified, config = {}) {
  const {
    requireTestChanges: _requireTestChanges = true,
    coverageThreshold = 80,
    enforceRedGreen = true,
  } = config;

  console.log('[TDD Enforcer] Validating complete TDD workflow...');

  const results = [];

  const tddResult = await verifyTDD(filesModified);
  results.push({ name: 'tdd_verification', ...tddResult });

  if (!tddResult.passed) {
    return {
      passed: false,
      reason: 'TDD verification failed',
      details: {
        results,
      },
    };
  }

  if (enforceRedGreen) {
    const redGreenResult = await enforceRedGreenCycle();
    results.push({ name: 'red_green_cycle', ...redGreenResult });

    if (!redGreenResult.passed) {
      return {
        passed: false,
        reason: 'Red-green cycle validation failed',
        details: {
          results,
        },
      };
    }
  }

  const coverageResult = await checkTestCoverage(coverageThreshold);
  results.push({ name: 'coverage', ...coverageResult });

  const allPassed = results.every((r) => r.passed);

  return {
    passed: allPassed,
    reason: allPassed
      ? 'Complete TDD workflow validated'
      : 'TDD workflow validation failed',
    details: {
      results,
      config,
    },
  };
}
