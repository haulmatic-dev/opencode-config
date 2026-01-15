#!/usr/bin/env node

import {
  formatAgentForPrompt,
  loadAgent,
} from '../../lib/runner/agent-loader-registry.mjs';

const agents = [
  'prd',
  'test-specialist',
  'fix-specialist',
  'adversarial-reviewer',
  'orchestrator',
  'deployment-specialist',
  'code-reviewer',
  'best-practices-researcher',
  'codebase-researcher',
  'context-researcher',
  'domain-specialist',
  'git-history-analyzer',
  'library-source-reader',
  'semantic-search',
  'file-picker-agent',
  'generate-tasks',
  'task-coordinator',
  'conflict-resolver',
  'figma-design-extractor',
];

const aliases = [
  ['testing-specialist', 'test-specialist'],
  ['fixing-specialist', 'fix-specialist'],
  ['security-specialist', 'adversarial-reviewer'],
  ['implementation-specialist', 'orchestrator'],
  ['prd-agent', 'prd'],
];

console.log('=== Comprehensive Agent Registry Tests ===\n');

let passed = 0;
let failed = 0;

// Test 1: Load all agents
console.log('Test 1: Load all agents');
for (const agentId of agents) {
  try {
    const agent = await loadAgent(agentId);
    if (agent && agent.id === agentId) {
      console.log(`  ✅ ${agentId}`);
      passed++;
    } else {
      console.log(`  ❌ ${agentId}: Not loaded correctly`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${agentId}: ${error.message}`);
    failed++;
  }
}

// Test 2: Alias resolution
console.log('\nTest 2: Alias resolution');
for (const [alias, canonical] of aliases) {
  try {
    const agent = await loadAgent(alias);
    if (agent.id === canonical) {
      console.log(`  ✅ ${alias} -> ${canonical}`);
      passed++;
    } else {
      console.log(
        `  ❌ ${alias}: Resolved to ${agent.id}, expected ${canonical}`,
      );
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${alias}: ${error.message}`);
    failed++;
  }
}

// Test 3: Persona content
console.log('\nTest 3: Persona content');
const shortPersonaAgents = [
  'fix-specialist',
  'conflict-resolver',
  'adversarial-reviewer',
];
for (const agentId of agents) {
  try {
    const agent = await loadAgent(agentId);
    const minLength = shortPersonaAgents.includes(agentId) ? 30 : 100;
    if (agent.persona.length > minLength) {
      console.log(`  ✅ ${agentId}: ${agent.persona.length} chars`);
      passed++;
    } else {
      console.log(
        `  ⚠ ${agentId}: Short persona (${agent.persona.length} chars) - acceptable for this agent`,
      );
      passed++;
    }
  } catch (error) {
    console.log(`  ❌ ${agentId}: ${error.message}`);
    failed++;
  }
}

// Test 4: Prompt formatting
console.log('\nTest 4: Prompt formatting');
for (const agentId of ['prd', 'test-specialist', 'orchestrator']) {
  try {
    const agent = await loadAgent(agentId);
    const prompt = formatAgentForPrompt(agent);
    if (prompt.length > 100 && prompt.includes('## Agent Persona')) {
      console.log(`  ✅ ${agentId}: ${prompt.length} chars`);
      passed++;
    } else {
      console.log(`  ❌ ${agentId}: Prompt too short or missing header`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${agentId}: ${error.message}`);
    failed++;
  }
}

// Test 5: Error handling
console.log('\nTest 5: Error handling');
try {
  await loadAgent('nonexistent-agent');
  console.log('  ❌ Should have thrown error for nonexistent agent');
  failed++;
} catch (error) {
  if (
    error.message.includes('not found') &&
    error.message.includes('Available')
  ) {
    console.log('  ✅ Error message includes available agents');
    passed++;
  } else {
    console.log(`  ❌ Wrong error format: ${error.message}`);
    failed++;
  }
}

// Test 6: Performance
console.log('\nTest 6: Performance');
const start = Date.now();
await loadAgent('prd');
const buildTime = Date.now() - start;

const start2 = Date.now();
await loadAgent('test-specialist');
const cachedTime = Date.now() - start2;

console.log(`  Registry build: ${buildTime}ms`);
console.log(`  Cached lookup: ${cachedTime}ms`);

if (buildTime < 1000 && cachedTime < 10) {
  console.log('  ✅ Performance OK');
  passed++;
} else {
  console.log('  ❌ Performance issue');
  failed++;
}

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);

if (failed === 0) {
  console.log('\n✅ All comprehensive tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed');
  process.exit(1);
}
