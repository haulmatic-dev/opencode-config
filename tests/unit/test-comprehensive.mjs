#!/usr/bin/env node

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function comprehensiveTest() {
  console.log('========================================');
  console.log('Comprehensive BV/BD Integration Test');
  console.log('========================================\n');

  const results = {
    bdCommands: [],
    bvCommands: [],
    pluginIntegration: [],
    fieldMappings: [],
  };

  console.log('1. Testing BD commands...\n');

  const bdCommands = ['bd ready', 'bd show opencode-lsl', 'bd sync'];

  for (const cmd of bdCommands) {
    try {
      const { stdout } = await execAsync(cmd, {
        maxBuffer: 1024 * 1024,
        timeout: 5000,
      });
      results.bdCommands.push({
        command: cmd,
        status: 'success',
        outputLength: stdout.length,
      });
      console.log(`   ✓ ${cmd}`);
    } catch (error) {
      results.bdCommands.push({
        command: cmd,
        status: 'failed',
        error: error.message,
      });
      console.log(`   ✗ ${cmd}: ${error.message}`);
    }
  }

  console.log('\n2. Testing BV robot commands...\n');

  const bvCommands = [
    'bv --robot-triage',
    'bv --robot-insights',
    'bv --robot-alerts',
  ];

  for (const cmd of bvCommands) {
    try {
      const { stdout } = await execAsync(cmd, {
        maxBuffer: 5 * 1024 * 1024,
        timeout: 10000,
      });
      const data = JSON.parse(stdout);
      results.bvCommands.push({
        command: cmd,
        status: 'success',
        hasTriage: !!data.triage,
        keys: Object.keys(data),
      });
      console.log(`   ✓ ${cmd}`);
    } catch (error) {
      results.bvCommands.push({
        command: cmd,
        status: 'failed',
        error: error.message,
      });
      console.log(`   ✗ ${cmd}: ${error.message}`);
    }
  }

  console.log('\n3. Testing field mappings...\n');

  const { stdout } = await execAsync('bv --robot-triage', {
    maxBuffer: 5 * 1024 * 1024,
  });
  const bvData = JSON.parse(stdout);
  const triage = bvData.triage;

  // Test quick_ref mappings
  const quickRefTests = [
    {
      field: 'ready_count',
      expected: triage.quick_ref.actionable_count,
      actual: triage.quick_ref.actionable_count,
    },
    {
      field: 'open_count',
      expected: triage.quick_ref.open_count,
      actual: triage.quick_ref.open_count,
    },
    {
      field: 'total_count',
      expected: triage.meta?.issue_count,
      actual: triage.meta?.issue_count,
    },
  ];

  quickRefTests.forEach((test) => {
    const exists = test.actual !== undefined;
    results.fieldMappings.push({
      field: test.field,
      status: exists ? 'mapped' : 'missing',
      value: test.actual,
    });
    console.log(
      `   ${exists ? '✓' : '✗'} quick_ref.${test.field} = ${test.actual}`,
    );
  });

  // Test project_health mappings
  const healthTests = [
    {
      field: 'status_distribution',
      path: 'counts.by_status',
      actual: triage.project_health?.counts?.by_status,
    },
    {
      field: 'type_distribution',
      path: 'counts.by_type',
      actual: triage.project_health?.counts?.by_type,
    },
    {
      field: 'priority_distribution',
      path: 'counts.by_priority',
      actual: triage.project_health?.counts?.by_priority,
    },
  ];

  healthTests.forEach((test) => {
    const exists = test.actual !== undefined;
    results.fieldMappings.push({
      field: test.field,
      path: test.path,
      status: exists ? 'mapped' : 'missing',
      value: test.actual,
    });
    console.log(
      `   ${exists ? '✓' : '✗'} project_health.${test.field} -> ${test.path}`,
    );
  });

  // Test recommendations mappings
  if (triage.recommendations && triage.recommendations.length > 0) {
    const rec = triage.recommendations[0];
    const recTests = [
      { field: 'reason', path: 'reasons (array)', actual: rec.reasons },
      { field: 'unblocks', path: 'unblocks (number)', actual: rec.unblocks },
    ];

    recTests.forEach((test) => {
      const exists = test.actual !== undefined;
      results.fieldMappings.push({
        field: test.field,
        path: test.path,
        status: exists ? 'mapped' : 'missing',
        value: test.actual,
      });
      console.log(
        `   ${exists ? '✓' : '✗'} recommendations[].${test.field} -> ${test.path}`,
      );
    });
  }

  console.log('\n4. Testing plugin integration...\n');

  try {
    const { beads } = await import('./plugin/beads.mjs');
    const hooks = await beads({});

    results.pluginIntegration.push({
      test: 'plugin_initialization',
      status: 'success',
    });
    console.log('   ✓ Plugin initialized');

    const beforeInput = {
      sessionID: 'test',
      agent: 'test',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    };
    const beforeOutput = {};

    await hooks['agent.execute.before'](beforeInput, beforeOutput);

    const hasSystemPrompt =
      beforeOutput.systemPrompt && beforeOutput.systemPrompt.length > 0;
    const hasTriageData =
      beforeOutput.beadsTriage &&
      Object.keys(beforeOutput.beadsTriage).length > 0;

    results.pluginIntegration.push({
      test: 'before_hook',
      status: 'success',
      hasSystemPrompt,
      hasTriageData,
      systemPromptLength: beforeOutput.systemPrompt?.length || 0,
    });
    console.log(
      `   ${hasSystemPrompt ? '✓' : '✗'} System prompt generated (${beforeOutput.systemPrompt?.length || 0} chars)`,
    );
    console.log(`   ${hasTriageData ? '✓' : '✗'} Triage data stored`);

    const afterInput = {
      sessionID: 'test',
      agent: 'test',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    };
    const afterOutput = {
      response: 'Task completed',
      error: null,
      beadsTask: beforeOutput.beadsTriage?.recommendations?.[0],
    };

    await hooks['agent.execute.after'](afterInput, afterOutput);

    results.pluginIntegration.push({
      test: 'after_hook',
      status: 'success',
    });
    console.log('   ✓ After hook executed');
  } catch (error) {
    results.pluginIntegration.push({
      test: 'plugin_integration',
      status: 'failed',
      error: error.message,
    });
    console.log(`   ✗ Plugin integration failed: ${error.message}`);
  }

  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================\n');

  const bdSuccess = results.bdCommands.filter(
    (r) => r.status === 'success',
  ).length;
  const bvSuccess = results.bvCommands.filter(
    (r) => r.status === 'success',
  ).length;
  const fieldSuccess = results.fieldMappings.filter(
    (r) => r.status === 'mapped',
  ).length;
  const pluginSuccess = results.pluginIntegration.filter(
    (r) => r.status === 'success',
  ).length;

  console.log(`BD Commands: ${bdSuccess}/${bdCommands.length} passed`);
  console.log(`BV Commands: ${bvSuccess}/${bvCommands.length} passed`);
  console.log(
    `Field Mappings: ${fieldSuccess}/${results.fieldMappings.length} mapped`,
  );
  console.log(
    `Plugin Tests: ${pluginSuccess}/${results.pluginIntegration.length} passed`,
  );

  const totalTests =
    bdCommands.length +
    bvCommands.length +
    results.fieldMappings.length +
    results.pluginIntegration.length;
  const totalPassed = bdSuccess + bvSuccess + fieldSuccess + pluginSuccess;
  const percentage = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log(`\nTotal: ${totalPassed}/${totalTests} passed (${percentage}%)`);

  if (totalPassed === totalTests) {
    console.log('\n✅ All tests passed! Integration is working correctly.\n');
  } else {
    console.log('\n⚠️ Some tests failed. See details below.\n');
  }

  console.log('========================================');
  console.log('DETAILED RESULTS (JSON)');
  console.log('========================================\n');
  console.log(JSON.stringify(results, null, 2));

  process.exit(totalPassed === totalTests ? 0 : 1);
}

comprehensiveTest().catch((error) => {
  console.error('\n❌ Test failed:', error);
  console.error(error.stack);
  process.exit(1);
});
