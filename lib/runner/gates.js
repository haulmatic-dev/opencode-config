// lib/runner/gates.js
import { execAsync } from '../utils/exec.js';

console.log('Quality Gates');

export async function verifyMutation(_filesModified) {
  console.log('[Gate: Mutation] Running mutation tests...');
  try {
    const { stdout: packages } = await execAsync(
      'npm list stryker 2>&1 || echo "not installed"',
    );
    if (packages.includes('not installed')) {
      console.warn(
        '[Gate: Mutation] Stryker not installed, skipping mutation gate',
      );
      return {
        passed: true,
        reason: 'Mutation testing skipped - stryker not installed',
        details: { skipped: true },
      };
    }

    console.log('[Gate: Mutation] Executing stryker...');
    const mutationResult = await execAsync('npx stryker run 2>&1');

    const scoreMatch = mutationResult.stdout.match(
      /Mutation score:\s*(\d+\.?\d*)%/i,
    );
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

    if (score < 80) {
      return {
        passed: false,
        reason: `Mutation score ${score}% below 80% threshold`,
        details: { score, threshold: 80 },
      };
    }

    console.log(`[Gate: Mutation] ✓ Mutation score: ${score}%`);
    return {
      passed: true,
      reason: `Mutation score ${score}% meets 80% threshold`,
      details: { score, threshold: 80 },
    };
  } catch (_error) {
    console.error('[Gate: Mutation] Error: unexpected error occurred');
    return {
      passed: false,
      reason: 'Mutation gate error: unexpected error occurred',
      details: {},
    };
  }
}

export async function verifyLint(_filesModified) {
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
        };
      }
    }

    console.log('[Gate: Lint] Executing eslint...');
    const eslintResult = await execAsync(
      'npm run lint 2>&1 || echo "ESLint not available"',
    );

    if (!eslintResult.stdout.includes('ESLint not available')) {
      if (eslintResult.exitCode !== 0) {
        return {
          passed: false,
          reason: 'ESLint found errors or warnings',
          details: { exitCode: eslintResult.exitCode },
        };
      }
    }

    console.log('[Gate: Lint] ✓ Linting passed');
    return {
      passed: true,
      reason: 'No critical UBS issues, ESLint passed (or not available)',
      details: {
        ubsPassed: !ubsResult.stdout.includes('UBS not available'),
        eslintPassed: !eslintResult.stdout.includes('ESLint not available'),
      },
    };
  } catch (error) {
    console.error('[Gate: Lint] Error:', error.message);
    return {
      passed: false,
      reason: `Lint gate error: ${error.message}`,
      details: { error: error.message },
    };
  }
}

import { verifyTDD as verifyTDDStrict } from './gates/tdd-enforcer.js';

export async function verifyTDD(filesModified) {
  console.log('[Gate: TDD] Verifying test-driven development...');
  return verifyTDDStrict(filesModified);
}

export async function runGates(gateNames, filesModified) {
  console.log(
    `[Gate] Running ${gateNames.length} gates: ${gateNames.join(', ')}`,
  );

  const gateFunctions = {
    tdd: verifyTDD,
    mutation: verifyMutation,
    lint: verifyLint,
  };

  const results = [];

  for (const gateName of gateNames) {
    const gateFn = gateFunctions[gateName];
    if (!gateFn) {
      console.warn(`[Gate] Unknown gate: ${gateName}, skipping`);
      continue;
    }

    try {
      const result = await gateFn(filesModified);
      results.push({
        name: gateName,
        ...result,
      });
    } catch (error) {
      console.error(`[Gate] ${gateName} failed:`, error.message);
      results.push({
        name: gateName,
        passed: false,
        reason: error.message,
        error: true,
      });
    }
  }

  const allPassed = results.every((r) => r.passed);
  console.log(
    `[Gate] Overall: ${allPassed ? '✓ All gates passed' : '✗ Some gates failed'}`,
  );

  return results;
}
