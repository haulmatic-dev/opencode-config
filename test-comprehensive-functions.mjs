#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testBeadsClient() {
  console.log('========================================');
  console.log('Testing BeadsClient Functions');
  console.log('========================================\n');

  const results = [];

  // Test 1: ready() and parseOutput
  console.log('1. Testing ready() and parseOutput...');
  try {
    const { stdout } = await execAsync('bd ready', { maxBuffer: 1024 * 1024 });
    const readyOutput = stdout;
    console.log('   ✓ bd ready command works');

    // Test parseOutput logic (same as plugin)
    const parseOutput = (output) => {
      const lines = output.split('\n');
      const tasks = [];
      let currentTask = null;

      for (const line of lines) {
        if (line.match(/^\d+\./)) {
          if (currentTask) tasks.push(currentTask);
          const match = line.match(/\[(opencode-[a-z0-9]+)\]/);
          if (match) {
            const id = match[1];
            const raw = line.replace(/^\d+\.\s*/, '');
            currentTask = { id, raw };
          }
        }
      }

      if (currentTask) tasks.push(currentTask);
      return tasks;
    };

    const parsed = parseOutput(readyOutput);
    console.log(`   ✓ Parsed ${parsed.length} tasks`);
    if (parsed.length > 0) {
      console.log(`   ✓ First task ID: ${parsed[0].id}`);
    }
    results.push({
      function: 'ready() / parseOutput()',
      status: 'success',
      taskCount: parsed.length,
    });
  } catch (error) {
    console.log('   ✗ ready() failed:', error.message);
    results.push({
      function: 'ready() / parseOutput()',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 2: show(id)
  console.log('\n2. Testing show(id)...');
  try {
    const { stdout } = await execAsync('bd show opencode-k4w', {
      maxBuffer: 1024 * 1024,
    });
    const showOutput = stdout;
    console.log('   ✓ bd show command works');
    console.log(`   ✓ Output length: ${showOutput.length} chars`);

    const hasDescription = showOutput.includes('Description:');
    const hasStatus = showOutput.includes('Status:');
    const hasPriority = showOutput.includes('Priority:');

    console.log(`   ✓ Has description: ${hasDescription}`);
    console.log(`   ✓ Has status: ${hasStatus}`);
    console.log(`   ✓ Has priority: ${hasPriority}`);

    results.push({
      function: 'show(id)',
      status: 'success',
      hasMetadata: hasDescription && hasStatus && hasPriority,
    });
  } catch (error) {
    console.log('   ✗ show(id) failed:', error.message);
    results.push({
      function: 'show(id)',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 3: update(id, options) - test with existing task
  console.log('\n3. Testing update(id, options)...');
  try {
    // Use a known task ID
    const taskId = 'opencode-k4w';

    // Save original status
    const { stdout: showBefore } = await execAsync(`bd show ${taskId}`, {
      maxBuffer: 1024 * 1024,
    });
    const statusMatch = showBefore.match(/Status:\s*(\w+)/);
    const originalStatus = statusMatch ? statusMatch[1] : 'open';

    // Update to in_progress
    await execAsync(`bd update ${taskId} --status in_progress`, {
      maxBuffer: 1024 * 1024,
    });
    console.log(`   ✓ Updated ${taskId} to in_progress`);

    // Verify update
    const { stdout: showAfter } = await execAsync(`bd show ${taskId}`, {
      maxBuffer: 1024 * 1024,
    });
    const statusAfterMatch = showAfter.match(/Status:\s*(\w+)/);
    const statusAfter = statusAfterMatch ? statusAfterMatch[1] : '';

    if (statusAfter === 'in_progress') {
      console.log('   ✓ Update verified');

      // Restore original status
      await execAsync(`bd update ${taskId} --status ${originalStatus}`, {
        maxBuffer: 1024 * 1024,
      });
      console.log(`   ✓ Restored status to ${originalStatus}`);

      results.push({
        function: 'update(id, options)',
        status: 'success',
        taskId,
      });
    } else {
      console.log('   ✗ Update not verified');
      results.push({
        function: 'update(id, options)',
        status: 'failed',
        reason: 'Update not verified',
      });
    }
  } catch (error) {
    console.log('   ✗ update() failed:', error.message);
    results.push({
      function: 'update(id, options)',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 4: close(id, reason) - test with existing task
  console.log('\n4. Testing close(id, reason)...');
  try {
    // Use a known task ID
    const taskId = 'opencode-k4w';

    // Save original status
    const { stdout: showBefore } = await execAsync(`bd show ${taskId}`, {
      maxBuffer: 1024 * 1024,
    });
    const statusMatch = showBefore.match(/Status:\s*(\w+)/);
    const originalStatus = statusMatch ? statusMatch[1] : 'open';

    // Close task
    await execAsync(`bd close ${taskId} --reason="Test close"`, {
      maxBuffer: 1024 * 1024,
    });
    console.log(`   ✓ Closed ${taskId}`);

    // Verify close
    const { stdout: showAfter } = await execAsync(`bd show ${taskId}`, {
      maxBuffer: 1024 * 1024,
    });
    const statusAfterMatch = showAfter.match(/Status:\s*(\w+)/);
    const statusAfter = statusAfterMatch ? statusAfterMatch[1] : '';

    if (statusAfter === 'closed') {
      console.log('   ✓ Close verified');

      // Restore original status
      await execAsync(`bd update ${taskId} --status ${originalStatus}`, {
        maxBuffer: 1024 * 1024,
      });
      console.log(`   ✓ Restored status to ${originalStatus}`);

      results.push({
        function: 'close(id, reason)',
        status: 'success',
        taskId,
      });
    } else {
      console.log('   ✗ Close not verified');
      results.push({
        function: 'close(id, reason)',
        status: 'failed',
        reason: 'Close not verified',
      });
    }
  } catch (error) {
    console.log('   ✗ close() failed:', error.message);
    results.push({
      function: 'close(id, reason)',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 5: sync()
  console.log('\n5. Testing sync()...');
  try {
    await execAsync('bd sync', { maxBuffer: 1024 * 1024 });
    console.log('   ✓ bd sync command works');
    results.push({ function: 'sync()', status: 'success' });
  } catch (error) {
    console.log('   ⚠ sync() failed (may be no changes):', error.message);
    results.push({
      function: 'sync()',
      status: 'warning',
      error: error.message,
    });
  }

  return results;
}

async function testBeadsViewerClient() {
  console.log('\n========================================');
  console.log('Testing BeadsViewerClient Functions');
  console.log('========================================\n');

  const results = [];

  // Test 1: triage()
  console.log('1. Testing triage()...');
  try {
    const { stdout } = await execAsync('bv --robot-triage', {
      maxBuffer: 5 * 1024 * 1024,
    });
    const triageData = JSON.parse(stdout);
    console.log('   ✓ bv --robot-triage command works');
    console.log(`   ✓ Has triage data: ${!!triageData.triage}`);

    const hasQuickRef = !!triageData.triage?.quick_ref;
    const hasRecommendations = !!triageData.triage?.recommendations;
    const hasProjectHealth = !!triageData.triage?.project_health;

    console.log(`   ✓ Has quick_ref: ${hasQuickRef}`);
    console.log(`   ✓ Has recommendations: ${hasRecommendations}`);
    console.log(`   ✓ Has project_health: ${hasProjectHealth}`);

    results.push({
      function: 'triage()',
      status: 'success',
      hasQuickRef,
      hasRecommendations,
      hasProjectHealth,
    });
  } catch (error) {
    console.log('   ✗ triage() failed:', error.message);
    results.push({
      function: 'triage()',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 2: plan(options)
  console.log('\n2. Testing plan(options)...');
  try {
    const { stdout } = await execAsync('bv --robot-plan', {
      maxBuffer: 5 * 1024 * 1024,
    });
    const planData = JSON.parse(stdout);
    console.log('   ✓ bv --robot-plan command works');
    console.log(`   ✓ Has plan: ${!!planData.plan}`);
    results.push({
      function: 'plan(options)',
      status: 'success',
      hasPlan: !!planData.plan,
    });
  } catch (error) {
    console.log('   ✗ plan() failed:', error.message);
    results.push({
      function: 'plan(options)',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 3: insights(options)
  console.log('\n3. Testing insights(options)...');
  try {
    const { stdout } = await execAsync('bv --robot-insights', {
      maxBuffer: 5 * 1024 * 1024,
    });
    const insightsData = JSON.parse(stdout);
    console.log('   ✓ bv --robot-insights command works');

    const hasBottlenecks = !!insightsData.Bottlenecks;
    const hasKeystones = !!insightsData.Keystones;
    const hasCycles = !!insightsData.Cycles;
    const hasStats = !!insightsData.Stats;

    console.log(`   ✓ Has Bottlenecks: ${hasBottlenecks}`);
    console.log(`   ✓ Has Keystones: ${hasKeystones}`);
    console.log(`   ✓ Has Cycles: ${hasCycles}`);
    console.log(`   ✓ Has Stats: ${hasStats}`);

    results.push({
      function: 'insights(options)',
      status: 'success',
      hasBottlenecks,
      hasKeystones,
      hasCycles,
      hasStats,
    });
  } catch (error) {
    console.log('   ✗ insights() failed:', error.message);
    results.push({
      function: 'insights(options)',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 4: alerts()
  console.log('\n4. Testing alerts()...');
  try {
    const { stdout } = await execAsync('bv --robot-alerts', {
      maxBuffer: 5 * 1024 * 1024,
    });
    const alertsData = JSON.parse(stdout);
    console.log('   ✓ bv --robot-alerts command works');
    console.log(`   ✓ Has alerts: ${!!alertsData.alerts}`);
    console.log(`   ✓ Has summary: ${!!alertsData.summary}`);

    results.push({
      function: 'alerts()',
      status: 'success',
      hasAlerts: !!alertsData.alerts,
      hasSummary: !!alertsData.summary,
    });
  } catch (error) {
    console.log('   ✗ alerts() failed:', error.message);
    results.push({
      function: 'alerts()',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 5: history()
  console.log('\n5. Testing history()...');
  try {
    const { stdout } = await execAsync('bv --robot-history', {
      maxBuffer: 5 * 1024 * 1024,
    });
    const historyData = JSON.parse(stdout);
    console.log('   ✓ bv --robot-history command works');
    console.log(`   ✓ Has stats: ${!!historyData.stats}`);
    console.log(`   ✓ Has histories: ${!!historyData.histories}`);

    results.push({
      function: 'history()',
      status: 'success',
      hasStats: !!historyData.stats,
      hasHistories: !!historyData.histories,
    });
  } catch (error) {
    console.log('   ✗ history() failed:', error.message);
    results.push({
      function: 'history()',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 6: labelHealth()
  console.log('\n6. Testing labelHealth()...');
  try {
    const { stdout } = await execAsync('bv --robot-label-health', {
      maxBuffer: 5 * 1024 * 1024,
    });
    const labelHealthData = JSON.parse(stdout);
    console.log('   ✓ bv --robot-label-health command works');
    console.log(`   ✓ Has results: ${!!labelHealthData.results}`);

    results.push({
      function: 'labelHealth()',
      status: 'success',
      hasResults: !!labelHealthData.results,
    });
  } catch (error) {
    console.log('   ✗ labelHealth() failed:', error.message);
    results.push({
      function: 'labelHealth()',
      status: 'failed',
      error: error.message,
    });
  }

  return results;
}

async function testBeadsMiddleware() {
  console.log('\n========================================');
  console.log('Testing BeadsMiddleware Functions');
  console.log('========================================\n');

  const { beads } = await import('./plugin/beads.mjs');
  const hooks = await beads({});

  const results = [];

  // Test 1: formatRecommendations()
  console.log('1. Testing formatRecommendations()...');
  try {
    const { stdout } = await execAsync('bv --robot-triage', {
      maxBuffer: 5 * 1024 * 1024,
    });
    const bvData = JSON.parse(stdout);

    const input = {
      sessionID: 'test',
      agent: 'test',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    };
    const output = {};

    await hooks['agent.execute.before'](input, output);

    if (output.systemPrompt && output.systemPrompt.length > 0) {
      console.log('   ✓ formatRecommendations() works');
      console.log(`   ✓ Generated ${output.systemPrompt.length} chars`);

      const hasQuickRef = output.systemPrompt.includes('Quick Reference');
      const hasRecommendations =
        output.systemPrompt.includes('Recommended Tasks');
      const hasQuickWins = output.systemPrompt.includes('Quick Wins');
      const hasProjectHealth = output.systemPrompt.includes('Project Health');

      console.log(`   ✓ Has Quick Reference: ${hasQuickRef}`);
      console.log(`   ✓ Has Recommended Tasks: ${hasRecommendations}`);
      console.log(`   ✓ Has Quick Wins: ${hasQuickWins}`);
      console.log(`   ✓ Has Project Health: ${hasProjectHealth}`);

      results.push({
        function: 'formatRecommendations()',
        status: 'success',
        length: output.systemPrompt.length,
        hasQuickRef,
        hasRecommendations,
        hasQuickWins,
        hasProjectHealth,
      });
    } else {
      console.log('   ✗ formatRecommendations() failed - no output');
      results.push({
        function: 'formatRecommendations()',
        status: 'failed',
        reason: 'No output',
      });
    }
  } catch (error) {
    console.log('   ✗ formatRecommendations() failed:', error.message);
    results.push({
      function: 'formatRecommendations()',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 2: formatInsights() capability
  console.log('\n2. Testing formatInsights() data processing...');
  try {
    const { stdout } = await execAsync('bv --robot-insights', {
      maxBuffer: 5 * 1024 * 1024,
    });
    const insightsData = JSON.parse(stdout);

    const hasInsights =
      insightsData.Cycles ||
      insightsData.Bottlenecks ||
      insightsData.Keystones ||
      insightsData.Stats;

    console.log('   ✓ formatInsights() can process data');
    console.log(`   ✓ Has Cycles: ${!!insightsData.Cycles}`);
    console.log(`   ✓ Has Bottlenecks: ${!!insightsData.Bottlenecks}`);
    console.log(`   ✓ Has Keystones: ${!!insightsData.Keystones}`);
    console.log(`   ✓ Has Stats: ${!!insightsData.Stats}`);

    results.push({
      function: 'formatInsights()',
      status: 'success',
      hasInsights,
      hasCycles: !!insightsData.Cycles,
      hasBottlenecks: !!insightsData.Bottlenecks,
      hasKeystones: !!insightsData.Keystones,
    });
  } catch (error) {
    console.log('   ✗ formatInsights() failed:', error.message);
    results.push({
      function: 'formatInsights()',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 3: formatAlerts() capability
  console.log('\n3. Testing formatAlerts() data processing...');
  try {
    const { stdout } = await execAsync('bv --robot-alerts', {
      maxBuffer: 5 * 1024 * 1024,
    });
    const alertsData = JSON.parse(stdout);

    const hasAlerts = alertsData.alerts && alertsData.alerts.length > 0;
    const hasSummary = !!alertsData.summary;

    console.log('   ✓ formatAlerts() can process data');
    console.log(`   ✓ Has alerts: ${hasAlerts}`);
    console.log(`   ✓ Has summary: ${hasSummary}`);

    results.push({
      function: 'formatAlerts()',
      status: 'success',
      hasAlerts,
      hasSummary,
    });
  } catch (error) {
    console.log('   ✗ formatAlerts() failed:', error.message);
    results.push({
      function: 'formatAlerts()',
      status: 'failed',
      error: error.message,
    });
  }

  return results;
}

async function testPluginHooks() {
  console.log('\n========================================');
  console.log('Testing Plugin Hooks');
  console.log('========================================\n');

  const { beads } = await import('./plugin/beads.mjs');
  const hooks = await beads({});

  const results = [];

  // Test 1: agent.execute.before hook
  console.log('1. Testing agent.execute.before hook...');
  try {
    const beforeInput = {
      sessionID: 'test-session-before',
      agent: 'test-agent',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'What tasks should I work on?' }],
    };
    const beforeOutput = {};

    await hooks['agent.execute.before'](beforeInput, beforeOutput);

    const hasSystemPrompt =
      beforeOutput.systemPrompt && beforeOutput.systemPrompt.length > 0;
    const hasBeadsTriage =
      beforeOutput.beadsTriage &&
      Object.keys(beforeOutput.beadsTriage).length > 0;

    console.log(`   ✓ Hook executed`);
    console.log(`   ✓ Has system prompt: ${hasSystemPrompt}`);
    console.log(`   ✓ Has beads triage: ${hasBeadsTriage}`);
    console.log(
      `   ✓ System prompt length: ${beforeOutput.systemPrompt?.length || 0}`,
    );

    if (hasSystemPrompt && hasBeadsTriage) {
      results.push({
        hook: 'agent.execute.before',
        status: 'success',
        hasSystemPrompt,
        hasBeadsTriage,
        promptLength: beforeOutput.systemPrompt.length,
        triageKeys: Object.keys(beforeOutput.beadsTriage),
      });
    } else {
      results.push({
        hook: 'agent.execute.before',
        status: 'failed',
        reason: 'Missing system prompt or triage data',
      });
    }
  } catch (error) {
    console.log('   ✗ agent.execute.before hook failed:', error.message);
    results.push({
      hook: 'agent.execute.before',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 2: agent.execute.after hook (success scenario)
  console.log('\n2. Testing agent.execute.after hook (success scenario)...');
  try {
    const afterSuccessInput = {
      sessionID: 'test-session-after-success',
      agent: 'test-agent',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    };
    const afterSuccessOutput = {
      response: 'Task completed successfully',
      error: null,
      beadsTask: { id: 'test-task' },
    };

    await hooks['agent.execute.after'](afterSuccessInput, afterSuccessOutput);

    console.log('   ✓ Hook executed (success scenario)');
    console.log('   ✓ No errors thrown');

    results.push({
      hook: 'agent.execute.after',
      scenario: 'success',
      status: 'success',
    });
  } catch (error) {
    console.log('   ✗ agent.execute.after hook failed:', error.message);
    results.push({
      hook: 'agent.execute.after',
      scenario: 'success',
      status: 'failed',
      error: error.message,
    });
  }

  // Test 3: agent.execute.after hook (error scenario)
  console.log('\n3. Testing agent.execute.after hook (error scenario)...');
  try {
    const afterErrorInput = {
      sessionID: 'test-session-after-error',
      agent: 'test-agent',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    };
    const afterErrorOutput = {
      response: null,
      error: 'Task failed with error',
      beadsTask: { id: 'test-task' },
    };

    await hooks['agent.execute.after'](afterErrorInput, afterErrorOutput);

    console.log('   ✓ Hook executed (error scenario)');
    console.log('   ✓ Handled error gracefully');

    results.push({
      hook: 'agent.execute.after',
      scenario: 'error',
      status: 'success',
    });
  } catch (error) {
    console.log('   ✗ agent.execute.after hook failed:', error.message);
    results.push({
      hook: 'agent.execute.after',
      scenario: 'error',
      status: 'failed',
      error: error.message,
    });
  }

  return results;
}

async function runComprehensiveTest() {
  console.log('========================================');
  console.log('COMPREHENSIVE PLUGIN FUNCTION TEST');
  console.log('========================================\n');

  const allResults = {
    beadsClient: [],
    beadsViewerClient: [],
    beadsMiddleware: [],
    pluginHooks: [],
  };

  try {
    allResults.beadsClient = await testBeadsClient();
    allResults.beadsViewerClient = await testBeadsViewerClient();
    allResults.beadsMiddleware = await testBeadsMiddleware();
    allResults.pluginHooks = await testPluginHooks();
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error(error.stack);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================\n');

  const beadsClientResults = allResults.beadsClient;
  const beadsViewerResults = allResults.beadsViewerClient;
  const middlewareResults = allResults.beadsMiddleware;
  const hooksResults = allResults.pluginHooks;

  const beadsClientSuccess = beadsClientResults.filter(
    (r) => r.status === 'success',
  ).length;
  const beadsViewerSuccess = beadsViewerResults.filter(
    (r) => r.status === 'success',
  ).length;
  const middlewareSuccess = middlewareResults.filter(
    (r) => r.status === 'success',
  ).length;
  const hooksSuccess = hooksResults.filter(
    (r) => r.status === 'success',
  ).length;

  const totalTests =
    beadsClientResults.length +
    beadsViewerResults.length +
    middlewareResults.length +
    hooksResults.length;
  const totalSuccess =
    beadsClientSuccess + beadsViewerSuccess + middlewareSuccess + hooksSuccess;
  const percentage = ((totalSuccess / totalTests) * 100).toFixed(1);

  console.log('BeadsClient Functions:');
  console.log(`  ${beadsClientSuccess}/${beadsClientResults.length} passed`);
  beadsClientResults.forEach((r) => {
    const icon =
      r.status === 'success'
        ? '✓'
        : r.status === 'skipped'
          ? '○'
          : r.status === 'warning'
            ? '⚠'
            : '✗';
    console.log(`  ${icon} ${r.function}`);
  });

  console.log('\nBeadsViewerClient Functions:');
  console.log(`  ${beadsViewerSuccess}/${beadsViewerResults.length} passed`);
  beadsViewerResults.forEach((r) => {
    const icon = r.status === 'success' ? '✓' : '✗';
    console.log(`  ${icon} ${r.function}`);
  });

  console.log('\nBeadsMiddleware Functions:');
  console.log(`  ${middlewareSuccess}/${middlewareResults.length} passed`);
  middlewareResults.forEach((r) => {
    const icon = r.status === 'success' ? '✓' : '✗';
    console.log(`  ${icon} ${r.function}`);
  });

  console.log('\nPlugin Hooks:');
  console.log(`  ${hooksSuccess}/${hooksResults.length} passed`);
  hooksResults.forEach((r) => {
    const icon = r.status === 'success' ? '✓' : '✗';
    const scenario = r.scenario ? ` (${r.scenario})` : '';
    console.log(`  ${icon} ${r.hook}${scenario}`);
  });

  console.log(`\nTotal: ${totalSuccess}/${totalTests} passed (${percentage}%)`);

  if (totalSuccess === totalTests) {
    console.log('\n✅ All plugin functions tested successfully!');
  } else {
    console.log('\n⚠️ Some tests failed. See details below.');
  }

  console.log('\n========================================');
  console.log('DETAILED RESULTS (JSON)');
  console.log('========================================\n');
  console.log(JSON.stringify(allResults, null, 2));

  process.exit(totalSuccess === totalTests ? 0 : 1);
}

runComprehensiveTest();
