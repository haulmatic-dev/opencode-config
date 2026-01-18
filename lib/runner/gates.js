import { execAsync } from '../utils/exec.js';
import { gateCache } from './cache.js';
import { getGatesConfig, getTestPatterns, getThresholds } from './config.js';
import {
  classifyError,
  createMissingToolError,
  createRuntimeError,
  createTimeoutError,
  ErrorTypes,
  ExitCodes,
  formatErrorForOutput,
  getExitCodeForGateResult,
  QualityGateError,
} from './utils/errors.js';

console.log('Quality Gates');

export async function verifyMutation(filesModified) {
  console.log('[Gate: Mutation] Running mutation tests...');
  try {
    const { stdout: packages } = await execAsync(
      'npm list stryker 2>&1 || echo "not installed"',
    );
    if (packages.includes('not installed')) {
      throw createMissingToolError('stryker', {
        gate: 'mutation',
        suggestion: 'Run: npm install --save-dev @stryker-mutator/core',
      });
    }

    console.log('[Gate: Mutation] Executing stryker...');
    const mutationResult = await execAsync('npx stryker run 2>&1');

    const scoreMatch = mutationResult.stdout.match(
      /Mutation score:\s*(\d+\.?\d*)%/i,
    );
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

    const threshold = getThreshold('mutation');

    if (score < threshold) {
      return {
        passed: false,
        reason: `Mutation score ${score}% below ${threshold}% threshold`,
        details: { score, threshold },
        exitCode: ExitCodes.GATE_FAILED,
      };
    }

    console.log(`[Gate: Mutation] Mutation score: ${score}%`);
    return {
      passed: true,
      reason: `Mutation score ${score}% meets ${threshold}% threshold`,
      details: { score, threshold },
      exitCode: ExitCodes.SUCCESS,
    };
  } catch (error) {
    const errorInfo = classifyError(error);
    const formattedError = formatErrorForOutput(error);
    console.error(`[Gate: Mutation] Error: ${formattedError.message}`);
    console.error(
      `[Gate: Mutation] Remediation: ${formattedError.remediation}`,
    );
    return {
      passed: false,
      reason: `Mutation gate failed: ${formattedError.message}`,
      details: {
        error: formattedError.message,
        errorCode: formattedError.code,
      },
      exitCode: errorInfo.exitCode,
      error: true,
    };
  }
}

export async function verifyLint(filesModified) {
  console.log('[Gate: Lint] Running UBS and eslint...');
  try {
    console.log('[Gate: Lint] Executing UBS...');
    const ubsResult = await execAsync(
      'npm run ubs 2>&1 || echo "UBS not available"',
    );

    if (!ubsResult.stdout.includes('UBS not available')) {
      const hasCriticalIssues =
        ubsResult.stdout.includes('CRITICAL') ||
        ubsResult.stdout.includes('HIGH');

      if (hasCriticalIssues) {
        return {
          passed: false,
          reason: 'UBS found critical or high severity security issues',
          details: {
            ubsOutput: ubsResult.stdout.substring(0, 200),
          },
          exitCode: ExitCodes.GATE_FAILED,
        };
      }
    }

    console.log('[Gate: Lint] Executing eslint...');
    const eslintResult = await execAsync(
      'npm run lint 2>&1 || echo "ESLint not available"',
    );

    if (!eslintResult.stdout.includes('ESLint not available')) {
      if (eslintResult.exitCode !== 0) {
        const errorOutput = eslintResult.stderr || eslintResult.stdout;
        return {
          passed: false,
          reason: 'ESLint found errors or warnings',
          details: {
            exitCode: eslintResult.exitCode,
            errorOutput: errorOutput.substring(0, 500),
          },
          exitCode: ExitCodes.GATE_FAILED,
        };
      }
    }

    console.log('[Gate: Lint] Linting passed');
    return {
      passed: true,
      reason: 'No critical UBS issues, ESLint passed (or not available)',
      details: {
        ubsPassed: !ubsResult.stdout.includes('UBS not available'),
        eslintPassed: !eslintResult.stdout.includes('ESLint not available'),
      },
      exitCode: ExitCodes.SUCCESS,
    };
  } catch (error) {
    const errorInfo = classifyError(error);
    const formattedError = formatErrorForOutput(error);
    console.error(`[Gate: Lint] Error: ${formattedError.message}`);
    console.error(`[Gate: Lint] Remediation: ${formattedError.remediation}`);
    return {
      passed: false,
      reason: `Lint gate failed: ${formattedError.message}`,
      details: {
        error: formattedError.message,
        errorCode: formattedError.code,
      },
      exitCode: errorInfo.exitCode,
      error: true,
    };
  }
}

import { verifyTDD as verifyTDDStrict } from './gates/tdd-enforcer.js';

export async function verifyTDD(filesModified) {
  console.log('[Gate: TDD] Verifying test-driven development...');
  try {
    const result = await verifyTDDStrict(filesModified);
    return {
      ...result,
      exitCode: result.passed ? ExitCodes.SUCCESS : ExitCodes.GATE_FAILED,
    };
  } catch (error) {
    const errorInfo = classifyError(error);
    const formattedError = formatErrorForOutput(error);
    console.error(`[Gate: TDD] Error: ${formattedError.message}`);
    console.error(`[Gate: TDD] Remediation: ${formattedError.remediation}`);
    return {
      passed: false,
      reason: `TDD gate failed: ${formattedError.message}`,
      details: {
        error: formattedError.message,
        errorCode: formattedError.code,
      },
      exitCode: errorInfo.exitCode,
      error: true,
    };
  }
}

export async function runGates(gateNames, filesModified, options = {}) {
  const gatesConfig = getGatesConfig();
  const { parallel = true, timeoutMs = gatesConfig.timeout } = options;

  console.log(
    `[Gate] Running ${gateNames.length} gates: ${gateNames.join(', ')}`,
    parallel ? '(parallel mode)' : '(sequential mode)',
  );

  const gateFunctions = {
    tdd: verifyTDD,
    mutation: verifyMutation,
    lint: verifyLint,
  };

  if (!parallel) {
    return runGatesSequential(gateNames, filesModified, gateFunctions);
  }

  return runGatesParallel(gateNames, filesModified, gateFunctions, timeoutMs);
}

async function runGatesSequential(gateNames, filesModified, gateFunctions) {
  const results = [];

  for (const gateName of gateNames) {
    const result = await executeGate(
      gateName,
      gateFunctions[gateName],
      filesModified,
    );
    results.push(result);
  }

  return formatGateResults(results);
}

async function runGatesParallel(
  gateNames,
  filesModified,
  gateFunctions,
  timeoutMs,
) {
  const gatePromises = gateNames.map(async (gateName) => {
    const gateFn = gateFunctions[gateName];
    if (!gateFn) {
      return {
        name: gateName,
        passed: true,
        reason: `Unknown gate: ${gateName}, skipped`,
        skipped: true,
        exitCode: ExitCodes.SUCCESS,
      };
    }

    const promise = executeGate(gateName, gateFn, filesModified);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            createTimeoutError(gateName, timeoutMs, {
              suggestion: `Consider increasing timeout or optimizing the gate execution`,
            }),
          ),
        timeoutMs,
      ),
    );

    return Promise.race([promise, timeoutPromise]);
  });

  const results = await Promise.allSettled(gatePromises);

  const formattedResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const errorInfo = classifyError(result.reason);
    const formattedError = formatErrorForOutput(result.reason);
    return {
      name: gateNames[index],
      passed: false,
      reason: `Gate execution failed: ${formattedError.message}`,
      error: true,
      exitCode: errorInfo.exitCode,
      details: {
        errorCode: formattedError.code,
        remediation: formattedError.remediation,
      },
    };
  });

  return formatGateResults(formattedResults);
}

async function executeGate(gateName, gateFn, filesModified) {
  try {
    const cachedResult = await gateCache.get(gateName, filesModified);
    if (cachedResult) {
      return {
        name: gateName,
        ...cachedResult,
        cached: true,
      };
    }

    const result = await gateFn(filesModified);

    if (result.passed) {
      await gateCache.set(gateName, filesModified, result);
    }

    return {
      name: gateName,
      ...result,
      exitCode: result.exitCode ?? getExitCodeForGateResult(result),
    };
  } catch (error) {
    const errorInfo = classifyError(error);
    const formattedError = formatErrorForOutput(error);
    console.error(`[Gate] ${gateName} failed: ${formattedError.message}`);
    console.error(
      `[Gate] ${gateName} Remediation: ${formattedError.remediation}`,
    );
    return {
      name: gateName,
      passed: false,
      reason: formattedError.message,
      error: true,
      exitCode: errorInfo.exitCode,
      details: {
        errorCode: formattedError.code,
        remediation: formattedError.remediation,
      },
    };
  }
}

function formatGateResults(results) {
  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(
    `[Gate] Overall: ${allPassed ? 'All gates passed' : `${failedCount} gate(s) failed`}`,
  );
  console.log(`[Gate] Passed: ${passedCount}/${results.length}`);

  if (!allPassed) {
    const failedGates = results.filter((r) => !r.passed).map((r) => r.name);
    console.log(`[Gate] Failed gates: ${failedGates.join(', ')}`);

    const errors = results
      .filter((r) => !r.passed)
      .map((r) => ({
        gate: r.name,
        reason: r.reason,
        exitCode: r.exitCode,
        remediation: r.details?.remediation,
      }));
    console.log('[Gate] Error details:', JSON.stringify(errors, null, 2));
  }

  const exitCode = allPassed
    ? ExitCodes.SUCCESS
    : results.reduce(
        (max, r) => Math.max(max, r.exitCode || ExitCodes.GATE_FAILED),
        ExitCodes.GATE_FAILED,
      );

  return {
    results,
    allPassed,
    passedCount,
    failedCount,
    exitCode,
    summary: allPassed
      ? `All ${results.length} gates passed`
      : `${failedCount} gate(s) failed: ${results
          .filter((r) => !r.passed)
          .map((r) => r.name)
          .join(', ')}`,
  };
}

export function getThreshold(type) {
  const thresholds = getThresholds();
  return thresholds[type] ?? 80;
}

export function getConfiguredTestPatterns() {
  return getTestPatterns();
}
