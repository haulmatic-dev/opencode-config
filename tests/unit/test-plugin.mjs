#!/usr/bin/env node
// Test script for setup plugin

import { setup } from '../../plugin/setup.mjs';

async function testPlugin() {
  console.log('Testing setup plugin...\n');

  try {
    // Simulate opencode plugin initialization
    const hooks = await setup({
      project: null,
      client: null,
      $: null,
      directory: process.cwd(),
      worktree: null,
    });

    console.log('✓ Plugin initialized\n');

    // Test session.start
    if (hooks['session.start']) {
      console.log('Testing session.start hook...');
      const result = await hooks['session.start']();
      console.log('✓ session.start hook works\n');
    } else {
      console.log('✗ session.start hook not found\n');
      process.exit(1);
    }

    // Test chat.message
    if (hooks['chat.message']) {
      console.log('Testing chat.message hook...');
      const result = await hooks['chat.message'](
        {
          message: 'workspace',
        },
        {},
      );
      console.log('✓ chat.message hook works\n');
    } else {
      console.log('✗ chat.message hook not found\n');
      process.exit(1);
    }

    console.log('All plugin tests passed! ✓');
    console.log('\nPlugin hooks available:');
    console.log('  - session.start: Check setup status on session start');
    console.log('  - chat.message: Auto-prompt when setup needed');
    console.log(
      '\nNote: Slash commands like /setup are not supported by opencode plugins.',
    );
    console.log('Users run setup commands directly in their terminal.');
    console.log('\nPlugin configuration: setup_config.json');
  } catch (error) {
    console.error(`✗ Plugin test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

testPlugin();
