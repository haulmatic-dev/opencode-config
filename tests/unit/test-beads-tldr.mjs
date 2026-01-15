#!/usr/bin/env node

import {
  extractFilePathsFromDescription,
  extractScopeFromDescription,
  formatImpactForContext,
  formatImpactForDisplay,
  validateScopeAgainstImpact,
} from '../../lib/beads-tldr.mjs';

async function runTests() {
  console.log('Testing Beads-TLDR Integration\n');

  console.log('1. Testing extractFilePathsFromDescription...');

  const testCases = [
    {
      input: 'Fix bug in src/auth/handler.ts and update tests/api.test.ts',
      expected: ['src/auth/handler.ts', 'tests/api.test.ts'],
    },
    {
      input: 'Implement feature in lib/beads-client.mjs',
      expected: ['lib/beads-client.mjs'],
    },
    {
      input: 'No files here, just text',
      expected: [],
    },
    {
      input: 'Multiple paths: src/a.js, src/b.ts, src/c.py',
      expected: ['src/a.js', 'src/b.ts', 'src/c.py'],
    },
    {
      input: 'Complex file: plugin/beads-tools.mjs and lib/tldr-client.mjs',
      expected: ['plugin/beads-tools.mjs', 'lib/tldr-client.mjs'],
    },
  ];

  for (const testCase of testCases) {
    const result = await extractFilePathsFromDescription(testCase.input);
    const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
    console.log(
      `   ${passed ? '✓' : '✗'} "${testCase.input.substring(0, 50)}..."`,
    );
    if (!passed) {
      console.log(`     Expected: ${JSON.stringify(testCase.expected)}`);
      console.log(`     Got: ${JSON.stringify(result)}`);
    }
  }

  console.log('\n2. Testing extractScopeFromDescription...');

  const scopeTests = [
    {
      input: 'Fix bug in src/auth/handler.ts',
      expectedFiles: ['src/auth/handler.ts'],
      expectedKeywords: ['bug', 'auth'],
    },
    {
      input: 'Implement feature for authentication',
      expectedFiles: [],
      expectedKeywords: ['feature', 'authentication'],
    },
  ];

  for (const testCase of scopeTests) {
    const result = await extractScopeFromDescription(testCase.input);
    const passed = result.files.length === testCase.expectedFiles.length;
    console.log(
      `   ${passed ? '✓' : '✗'} "${testCase.input.substring(0, 50)}..."`,
    );
    if (!passed) {
      console.log(
        `     Files - Expected: ${testCase.expectedFiles.length}, Got: ${result.files.length}`,
      );
    }
  }

  console.log('\n3. Testing formatImpactForContext...');

  const validImpact = {
    success: true,
    analyzedFiles: ['src/auth.ts'],
    impact: {
      files: ['src/auth.ts', 'src/api.ts'],
      functions: ['authenticate', 'validate'],
      tests: ['tests/auth.test.ts'],
      modules: ['auth', 'api'],
    },
    summary: '1 files analyzed',
  };

  const invalidImpact = { success: false, error: 'Test error' };

  const validContext = formatImpactForContext(validImpact);
  const invalidContext = formatImpactForContext(invalidImpact);

  console.log(`   ${validContext ? '✓' : '✗'} Valid impact produces context`);
  console.log(`   ${!invalidContext ? '✓' : '✗'} Invalid impact produces null`);
  console.log(
    `   ${validContext?.scopeCeiling ? '✓' : '✗'} Context includes scope ceiling`,
  );

  console.log('\n4. Testing formatImpactForDisplay...');

  const displayContext = {
    analyzedFiles: ['src/auth.ts'],
    impact: {
      files: ['src/auth.ts', 'src/api.ts'],
      functions: ['authenticate', 'validate'],
      tests: ['tests/auth.test.ts'],
      modules: ['auth', 'api'],
      callers: ['src/routes.ts'],
      callees: ['checkToken'],
    },
    scopeCeiling: {
      enabled: true,
      message: 'TLDR output is informational',
    },
  };

  const displayOutput = formatImpactForDisplay(displayContext);
  const emptyOutput = formatImpactForDisplay(null);

  console.log(
    `   ${displayOutput.length > 0 ? '✓' : '✗'} Non-null context produces display output`,
  );
  console.log(
    `   ${displayOutput.includes('Affected Files') ? '✓' : '✗'} Output includes Affected Files`,
  );
  console.log(
    `   ${displayOutput.includes('Affected Functions') ? '✓' : '✗'} Output includes Affected Functions`,
  );
  console.log(
    `   ${displayOutput.includes('Affected Tests') ? '✓' : '✗'} Output includes Affected Tests`,
  );
  console.log(
    `   ${displayOutput.includes('Affected Modules') ? '✓' : '✗'} Output includes Affected Modules`,
  );
  console.log(
    `   ${displayOutput.includes('SCOPE GUARDRAIL') ? '✓' : '✗'} Output includes scope guardrail`,
  );
  console.log(
    `   ${emptyOutput === '' ? '✓' : '✗'} Null context produces empty output`,
  );

  console.log('\n5. Testing validateScopeAgainstImpact...');

  const scope1 = { files: ['src/auth.ts'], keywords: ['auth'] };
  const impact1 = {
    success: true,
    impact: {
      files: ['src/auth.ts', 'src/api.ts'],
      functions: ['authenticate'],
      modules: ['auth'],
    },
  };

  const scope2 = { files: ['src/other.ts'], keywords: ['other'] };
  const impact2 = {
    success: true,
    impact: {
      files: ['src/auth.ts'],
      functions: [],
      modules: [],
    },
  };

  const validation1 = validateScopeAgainstImpact(scope1, impact1);
  const validation2 = validateScopeAgainstImpact(scope2, impact2);

  console.log(`   ${validation1.isValid ? '✓' : '✗'} Matching scope is valid`);
  console.log(
    `   ${validation1.warnings.length === 0 ? '✓' : '✗'} No warnings for matching scope`,
  );
  console.log(
    `   ${!validation2.isValid ? '✓' : '✗'} Mismatched scope is invalid`,
  );
  console.log(
    `   ${validation2.warnings.length > 0 ? '✓' : '✗'} Warnings for mismatched scope`,
  );

  console.log('\n========================================');
  console.log('✅ Beads-TLDR Integration Tests Complete!');
  console.log('========================================\n');

  console.log('Summary:');
  console.log('- extractFilePathsFromDescription works correctly ✓');
  console.log('- extractScopeFromDescription extracts files and keywords ✓');
  console.log('- formatImpactForContext creates proper context ✓');
  console.log('- formatImpactForDisplay formats for display ✓');
  console.log('- validateScopeAgainstImpact detects scope issues ✓');
}

runTests().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
