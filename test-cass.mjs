#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testCassMemory() {
  console.log('Testing Cass Memory Integration...\n');

  try {
    console.log('1. Checking if cm is installed...');
    const { stdout: whichCm } = await execAsync('which cm');
    console.log('   ✓ cm found at:', whichCm.trim());

    console.log('\n2. Testing cm context command...');
    const { stdout: contextOutput } = await execAsync('cm context "test task" --json --limit 1');
    const contextData = JSON.parse(contextOutput);
    console.log('   ✓ cm context works, success:', contextData.success);
    console.log('   - relevantBullets:', contextData.data?.relevantBullets?.length || 0);
    console.log('   - antiPatterns:', contextData.data?.antiPatterns?.length || 0);
    console.log('   - historySnippets:', contextData.data?.historySnippets?.length || 0);

    console.log('\n3. Checking plugin file...');
    const { stdout: lsPlugin } = await execAsync('ls -lh plugin/cass.mjs');
    console.log('   ✓ plugin/cass.mjs exists');
    console.log('   ', lsPlugin.trim());

    console.log('\n4. Checking config file...');
    const { stdout: catConfig } = await execAsync('cat cass_config.json');
    console.log('   ✓ cass_config.json exists');
    console.log('   ', catConfig.trim());

    console.log('\n5. Checking cm status...');
    const { stdout: statusOutput } = await execAsync('cm doctor --json');
    const statusData = JSON.parse(statusOutput);
    console.log('   ✓ cm status retrieved');

    if (statusData.health) {
      console.log('   Health:', statusData.health);
    }

    console.log('\n✅ All tests passed!');
    console.log('\nIntegration Summary:');
    console.log('- Plugin: plugin/cass.mjs');
    console.log('- Config: cass_config.json');
    console.log('- Agent Hooks: agent.execute.before (inject context), agent.execute.after (record outcome)');
    console.log('- Commands: cm context, cm mark, cm outcome');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testCassMemory();
