#!/usr/bin/env node

import {
  formatAgentForPrompt,
  loadAgent,
} from '../../lib/runner/agent-loader-registry.mjs';

console.log('=== Agent Registry Tests ===\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Valid ID
  try {
    console.log('Test 1: Valid canonical ID (test-specialist)');
    const agent1 = await loadAgent('test-specialist');
    if (agent1 && agent1.id === 'test-specialist') {
      console.log('  ✅ PASSED: Agent loaded correctly');
      console.log(`     ID: ${agent1.id}`);
      console.log(`     Aliases: ${agent1.aliases.join(', ') || 'none'}`);
      console.log(`     Persona length: ${agent1.persona.length} chars`);
      passed++;
    } else {
      console.log('  ❌ FAILED: Agent data invalid');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 2: Valid alias
  try {
    console.log(
      '\nTest 2: Valid alias (testing-specialist -> test-specialist)',
    );
    const agent2 = await loadAgent('testing-specialist');
    if (agent2 && agent2.id === 'test-specialist') {
      console.log('  ✅ PASSED: Alias resolved correctly');
      console.log(`     Requested: testing-specialist`);
      console.log(`     Resolved to: ${agent2.id}`);
      passed++;
    } else {
      console.log('  ❌ FAILED: Alias resolution incorrect');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 3: Another alias (prd-agent -> prd)
  try {
    console.log('\nTest 3: Another alias (prd-agent -> prd)');
    const agent3 = await loadAgent('prd-agent');
    if (agent3 && agent3.id === 'prd') {
      console.log('  ✅ PASSED: Alias resolved correctly');
      console.log(`     Requested: prd-agent`);
      console.log(`     Resolved to: ${agent3.id}`);
      passed++;
    } else {
      console.log('  ❌ FAILED: Alias resolution incorrect');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }

  // Test 4: Invalid ID
  try {
    console.log('\nTest 4: Invalid ID (should throw error)');
    await loadAgent('fake-agent-that-does-not-exist');
    console.log('  ❌ FAILED: Should have thrown error');
    failed++;
  } catch (error) {
    if (
      error.message.includes('not found') ||
      error.message.includes('Unknown agent')
    ) {
      console.log('  ✅ PASSED: Error thrown correctly');
      console.log(`     Error message: ${error.message}`);
      passed++;
    } else {
      console.log(`  ❌ FAILED: Wrong error: ${error.message}`);
      failed++;
    }
  }

  // Test 5: Format for prompt
  try {
    console.log('\nTest 5: Format agent for prompt');
    const agent4 = await loadAgent('test-specialist');
    const formatted = formatAgentForPrompt(agent4);
    if (formatted && formatted.length > 0) {
      console.log('  ✅ PASSED: Agent formatted for prompt');
      console.log(`     Formatted length: ${formatted.length} chars`);
      console.log(`     First 200 chars: ${formatted.substring(0, 200)}`);
      passed++;
    } else {
      console.log('  ❌ FAILED: Agent formatting incorrect (empty)');
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
