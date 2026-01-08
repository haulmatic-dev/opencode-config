#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { beads } from './plugin/beads.mjs';

const execAsync = promisify(exec);

async function testFixedIntegration() {
  console.log('========================================');
  console.log('Testing Fixed BV/BD Integration');
  console.log('========================================\n');

  const issues = [];

  console.log('1. Testing plugin initialization...');
  const mockInput = {
    project: {},
    client: {},
    $: {},
    directory: process.cwd(),
    worktree: null
  };

  let hooks;
  try {
    hooks = await beads(mockInput);
    console.log('   ✓ Plugin initialized');
  } catch (error) {
    issues.push({
      type: 'plugin_init',
      severity: 'critical',
      description: 'Plugin initialization failed',
      error: error.message
    });
    console.log('   ✗ Plugin initialization failed:', error.message);
  }

  console.log('\n2. Testing agent.execute.before hook...');
  const beforeInput = {
    sessionID: 'test-session',
    agent: 'test-agent',
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Test' }]
  };

  const beforeOutput = {};

  if (hooks && hooks['agent.execute.before']) {
    try {
      await hooks['agent.execute.before'](beforeInput, beforeOutput);
      console.log('   ✓ Hook executed');

      if (!beforeOutput.systemPrompt) {
        issues.push({
          type: 'system_prompt',
          severity: 'high',
          description: 'No system prompt generated',
          fix: 'Check formatRecommendations method'
        });
        console.log('   ✗ No system prompt generated');
      } else {
        console.log('   ✓ System prompt generated');
        const lines = beforeOutput.systemPrompt.split('\n');
        console.log(`   - ${lines.length} lines, ${beforeOutput.systemPrompt.length} chars`);

        // Check for expected sections
        const hasQuickRef = beforeOutput.systemPrompt.includes('Quick Reference');
        const hasRecommendations = beforeOutput.systemPrompt.includes('Recommended Tasks');
        const hasQuickWins = beforeOutput.systemPrompt.includes('Quick Wins');
        const hasProjectHealth = beforeOutput.systemPrompt.includes('Project Health');

        console.log('\n   Checking system prompt sections:');
        console.log(`     - Quick Reference: ${hasQuickRef ? '✓' : '✗'}`);
        console.log(`     - Recommended Tasks: ${hasRecommendations ? '✓' : '✗'}`);
        console.log(`     - Quick Wins: ${hasQuickWins ? '✓' : '✗'}`);
        console.log(`     - Project Health: ${hasProjectHealth ? '✓' : '✗'}`);

        if (!hasQuickRef || !hasRecommendations) {
          issues.push({
            type: 'missing_sections',
            severity: 'high',
            description: 'Missing expected sections in system prompt',
            sections: {
              quick_ref: hasQuickRef,
              recommendations: hasRecommendations,
              quick_wins: hasQuickWins,
              project_health: hasProjectHealth
            }
          });
        }
      }

      if (!beforeOutput.beadsTriage) {
        issues.push({
          type: 'triage_data',
          severity: 'high',
          description: 'No triage data stored in output'
        });
        console.log('   ✗ No triage data stored');
      } else {
        console.log('   ✓ Triage data stored');
      }
    } catch (error) {
      issues.push({
        type: 'hook_execution',
        severity: 'critical',
        description: 'agent.execute.before hook failed',
        error: error.message
      });
      console.log('   ✗ Hook execution failed:', error.message);
    }
  }

  console.log('\n3. Testing agent.execute.after hook (success)...');
  const afterSuccessInput = {
    sessionID: 'test-session',
    agent: 'test-agent',
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Test' }]
  };

  const afterSuccessOutput = {
    response: 'Task completed',
    error: null,
    beadsTask: beforeOutput.beadsTriage?.recommendations?.[0]
  };

  if (hooks && hooks['agent.execute.after']) {
    try {
      await hooks['agent.execute.after'](afterSuccessInput, afterSuccessOutput);
      console.log('   ✓ Hook executed (success)');
    } catch (error) {
      issues.push({
        type: 'after_hook',
        severity: 'high',
        description: 'agent.execute.after hook failed',
        error: error.message
      });
      console.log('   ✗ Hook execution failed:', error.message);
    }
  }

  console.log('\n4. Testing agent.execute.after hook (error)...');
  const afterErrorInput = {
    sessionID: 'test-session',
    agent: 'test-agent',
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Test' }]
  };

  const afterErrorOutput = {
    response: null,
    error: 'Task failed',
    beadsTask: beforeOutput.beadsTriage?.recommendations?.[0]
  };

  if (hooks && hooks['agent.execute.after']) {
    try {
      await hooks['agent.execute.after'](afterErrorInput, afterErrorOutput);
      console.log('   ✓ Hook executed (error)');
    } catch (error) {
      issues.push({
        type: 'after_hook_error',
        severity: 'medium',
        description: 'agent.execute.after hook failed on error',
        error: error.message
      });
      console.log('   ✗ Hook execution failed:', error.message);
    }
  }

  console.log('\n========================================');
  console.log('ISSUES SUMMARY');
  console.log('========================================\n');

  if (issues.length === 0) {
    console.log('✅ No issues found! Plugin is working correctly.\n');
    console.log('System prompt preview:');
    console.log('---');
    console.log(beforeOutput.systemPrompt?.substring(0, 500) || 'No system prompt');
    console.log('...\n');
  } else {
    console.log(`Found ${issues.length} issues:\n`);

    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    const medium = issues.filter(i => i.severity === 'medium');

    if (critical.length > 0) {
      console.log('🔴 CRITICAL:');
      critical.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.description}`);
        if (issue.error) console.log(`     Error: ${issue.error}`);
        console.log('');
      });
    }

    if (high.length > 0) {
      console.log('🟠 HIGH:');
      high.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.description}`);
        if (issue.fix) console.log(`     Fix: ${issue.fix}`);
        console.log('');
      });
    }

    if (medium.length > 0) {
      console.log('🟡 MEDIUM:');
      medium.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.description}`);
        if (issue.error) console.log(`     Error: ${issue.error}`);
        console.log('');
      });
    }
  }

  console.log('========================================');
  console.log('JSON OUTPUT');
  console.log('========================================\n');
  console.log(JSON.stringify(issues, null, 2));

  process.exit(issues.length > 0 ? 1 : 0);
}

testFixedIntegration().catch(error => {
  console.error('\n❌ Test failed:', error);
  console.error(error.stack);
  process.exit(1);
});
