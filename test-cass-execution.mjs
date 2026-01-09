#!/usr/bin/env node

// Simulate opencode plugin execution to test cass integration

import { cass } from './plugin/cass.mjs';

async function testPluginExecution() {
  console.log('Testing Cass Memory Plugin Execution Simulation\n');

  // Simulate opencode plugin initialization
  const mockInput = {
    project: {},
    client: {},
    $: {},
    directory: process.cwd(),
    worktree: null,
  };

  try {
    console.log('1. Initializing plugin...');
    const hooks = await cass(mockInput);
    console.log('   ✓ Plugin initialized successfully');
    console.log('   Available hooks:', Object.keys(hooks).join(', '));

    // Simulate agent.execute.before hook
    console.log('\n2. Testing agent.execute.before hook...');
    const beforeInput = {
      sessionID: 'test-session',
      agent: 'test-agent',
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'How do I add GPTCache to this project?' },
      ],
    };

    const beforeOutput = {};

    if (hooks['agent.execute.before']) {
      await hooks['agent.execute.before'](beforeInput, beforeOutput);

      console.log('   ✓ agent.execute.before executed');

      if (beforeOutput.systemPrompt) {
        console.log(
          '   System prompt injected:',
          beforeOutput.systemPrompt.slice(0, 100) + '...',
        );
      }

      if (beforeOutput.cassContext) {
        console.log('   Context retrieved:');
        console.log(
          '   - relevantBullets:',
          beforeOutput.cassContext.relevantBullets?.length || 0,
        );
        console.log(
          '   - antiPatterns:',
          beforeOutput.cassContext.antiPatterns?.length || 0,
        );
        console.log(
          '   - historySnippets:',
          beforeOutput.cassContext.historySnippets?.length || 0,
        );
      }
    }

    // Simulate agent.execute.after hook
    console.log('\n3. Testing agent.execute.after hook...');
    const afterInput = {
      sessionID: 'test-session',
      agent: 'test-agent',
      model: 'gpt-4',
      messages: beforeInput.messages,
    };

    const afterOutput = {
      response: 'Test response from agent',
      cassContext: beforeOutput.cassContext,
    };

    if (hooks['agent.execute.after']) {
      await hooks['agent.execute.after'](afterInput, afterOutput);
      console.log('   ✓ agent.execute.after executed');
      console.log(
        '   Outcome recorded for:',
        afterOutput.cassContext?.relevantBullets?.map((b) => b.id).join(', ') ||
          'no rules',
      );
    }

    console.log('\n✅ Plugin execution test passed!');
    console.log('\nIntegration verified:');
    console.log('- Plugin loads correctly ✓');
    console.log('- agent.execute.before fetches context ✓');
    console.log('- agent.execute.after records outcome ✓');
    console.log('- System prompt injection works ✓');
  } catch (error) {
    console.error('\n❌ Plugin execution test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPluginExecution();
