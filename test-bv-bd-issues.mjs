#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testBVBDSIntegration() {
  console.log('========================================');
  console.log('Testing BV and BD Integration Issues');
  console.log('========================================\n');

  const issues = [];

  console.log('1. Testing bd commands...');
  try {
    const { stdout } = await execAsync('bd ready', { maxBuffer: 1024 * 1024 });
    console.log('   ✓ bd ready works');
    const taskLines = stdout.split('\n').filter(l => l.trim());
    console.log(`   - Found ${taskLines.length} tasks`);
  } catch (error) {
    issues.push({
      type: 'bd_command',
      severity: 'critical',
      description: 'bd ready command failed',
      error: error.message
    });
    console.log('   ✗ bd ready failed:', error.message);
  }

  console.log('\n2. Testing bv --robot-triage...');
  try {
    const { stdout } = await execAsync('bv --robot-triage', { maxBuffer: 5 * 1024 * 1024 });
    const bvData = JSON.parse(stdout);
    console.log('   ✓ bv --robot-triage works');

    // Check top-level structure
    console.log('   - Top-level keys:', Object.keys(bvData));
    
    if (!bvData.triage) {
      issues.push({
        type: 'bv_structure',
        severity: 'critical',
        description: 'Missing .triage key in bv output',
        location: 'bv --robot-triage',
        expected: '.triage object',
        actual: Object.keys(bvData)
      });
      console.log('   ✗ Missing .triage key');
    }

    const triage = bvData.triage;
    if (triage) {
      console.log('\n   Checking .triage structure:');
      console.log('   - Triage keys:', Object.keys(triage));

      // Check quick_ref structure
      if (triage.quick_ref) {
        console.log('\n   Checking .quick_ref:');
        console.log('   - Keys:', Object.keys(triage.quick_ref));
        
        if (!triage.quick_ref.ready_count) {
          issues.push({
            type: 'field_mismatch',
            severity: 'high',
            description: 'quick_ref missing ready_count field',
            location: 'bv --robot-triage .triage.quick_ref',
            expected: 'ready_count',
            actual: Object.keys(triage.quick_ref),
            replacement: 'Use open_count or actionable_count instead'
          });
          console.log('   ✗ Missing ready_count (plugin expects this)');
        }

        if (!triage.quick_ref.total_count) {
          issues.push({
            type: 'field_mismatch',
            severity: 'high',
            description: 'quick_ref missing total_count field',
            location: 'bv --robot-triage .triage.quick_ref',
            expected: 'total_count',
            actual: Object.keys(triage.quick_ref),
            replacement: 'Use meta.issue_count or open_count + closed_count'
          });
          console.log('   ✗ Missing total_count (plugin expects this)');
        }
      }

      // Check recommendations structure
      if (triage.recommendations && triage.recommendations.length > 0) {
        const firstRec = triage.recommendations[0];
        console.log('\n   Checking .recommendations[0]:');
        console.log('   - Keys:', Object.keys(firstRec));

        if (typeof firstRec.unblocks === 'number') {
          issues.push({
            type: 'field_mismatch',
            severity: 'medium',
            description: 'recommendations[].unblocks is number, plugin expects array',
            location: 'bv --robot-triage .triage.recommendations[]',
            expected: 'unblocks: [] (array)',
            actual: `unblocks: ${firstRec.unblocks} (number)`,
            fix: 'Change plugin to use unblocks.length || 0'
          });
          console.log('   ✗ unblocks is number, plugin expects array');
        }

        if (!firstRec.reason && firstRec.reasons) {
          issues.push({
            type: 'field_mismatch',
            severity: 'medium',
            description: 'recommendations[].reason field missing, reasons array exists',
            location: 'bv --robot-triage .triage.recommendations[]',
            expected: 'reason (string)',
            actual: 'reasons (array)',
            fix: 'Use reasons?.join(", ") or reasons[0]'
          });
          console.log('   ✗ Missing reason field, has reasons array instead');
        }

        if (!firstRec.commands) {
          issues.push({
            type: 'field_mismatch',
            severity: 'low',
            description: 'recommendations[].commands field missing',
            location: 'bv --robot-triage .triage.recommendations[]',
            expected: 'commands: { claim: "bd update ... }"',
            actual: 'undefined',
            fix: 'Generate commands from issue data'
          });
          console.log('   ✗ Missing commands.claim field');
        }
      }

      // Check quick_wins structure
      if (triage.quick_wins && triage.quick_wins.length > 0) {
        const firstWin = triage.quick_wins[0];
        console.log('\n   Checking .quick_wins[0]:');
        console.log('   - Keys:', Object.keys(firstWin));

        if (!firstWin.impact && firstWin.reason) {
          issues.push({
            type: 'field_mismatch',
            severity: 'medium',
            description: 'quick_wins[].impact field missing, reason field exists',
            location: 'bv --robot-triage .triage.quick_wins[]',
            expected: 'impact (string)',
            actual: 'reason (string)',
            fix: 'Rename reason to impact or use reason as impact'
          });
          console.log('   ✗ Missing impact field, has reason instead');
        }

        if (!firstWin.command) {
          issues.push({
            type: 'field_mismatch',
            severity: 'low',
            description: 'quick_wins[].command field missing',
            location: 'bv --robot-triage .triage.quick_wins[]',
            expected: 'command: "bd update ..."',
            actual: 'undefined',
            fix: 'Generate commands from issue data'
          });
          console.log('   ✗ Missing command field');
        }
      }

      // Check blockers_to_clear
      if (triage.blockers_to_clear === null || triage.blockers_to_clear.length === 0) {
        console.log('\n   Checking .blockers_to_clear:');
        console.log('   - Empty or null (no blockers in current project)');
      }

      // Check project_health structure
      if (triage.project_health) {
        console.log('\n   Checking .project_health:');
        console.log('   - Keys:', Object.keys(triage.project_health));

        if (!triage.project_health.status_distribution) {
          issues.push({
            type: 'field_mismatch',
            severity: 'medium',
            description: 'project_health.status_distribution missing',
            location: 'bv --robot-triage .triage.project_health',
            expected: 'status_distribution: { open: N, closed: M, ... }',
            actual: 'undefined',
            fix: 'Use counts.by_status instead'
          });
          console.log('   ✗ Missing status_distribution');
        }

        if (!triage.project_health.type_distribution) {
          issues.push({
            type: 'field_mismatch',
            severity: 'medium',
            description: 'project_health.type_distribution missing',
            location: 'bv --robot-triage .triage.project_health',
            expected: 'type_distribution: { epic: N, task: M, ... }',
            actual: 'undefined',
            fix: 'Use counts.by_type instead'
          });
          console.log('   ✗ Missing type_distribution');
        }

        if (!triage.project_health.priority_distribution) {
          issues.push({
            type: 'field_mismatch',
            severity: 'medium',
            description: 'project_health.priority_distribution missing',
            location: 'bv --robot-triage .triage.project_health',
            expected: 'priority_distribution: { "1": N, "2": M, ... }',
            actual: 'undefined',
            fix: 'Use counts.by_priority instead'
          });
          console.log('   ✗ Missing priority_distribution');
        }
      }

      // Check for success field
      if (bvData.success === undefined) {
        issues.push({
          type: 'test_issue',
          severity: 'low',
          description: 'Test script checks for success field that does not exist',
          location: 'test-beads.mjs',
          expected: 'success: true/false',
          actual: 'undefined',
          fix: 'Remove success field check from test'
        });
        console.log('\n   Note: No "success" field in bv output');
      }
    }
  } catch (error) {
    issues.push({
      type: 'bv_command',
      severity: 'critical',
      description: 'bv --robot-triage command failed',
      error: error.message
    });
    console.log('   ✗ bv --robot-triage failed:', error.message);
  }

  console.log('\n========================================');
  console.log('ISSUES SUMMARY');
  console.log('========================================\n');

  if (issues.length === 0) {
    console.log('✅ No issues found!\n');
  } else {
    console.log(`Found ${issues.length} issues:\n`);

    // Group by severity
    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    const medium = issues.filter(i => i.severity === 'medium');
    const low = issues.filter(i => i.severity === 'low');

    if (critical.length > 0) {
      console.log('🔴 CRITICAL:');
      critical.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.description}`);
        if (issue.error) console.log(`     Error: ${issue.error}`);
        if (issue.location) console.log(`     Location: ${issue.location}`);
        console.log('');
      });
    }

    if (high.length > 0) {
      console.log('🟠 HIGH:');
      high.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.description}`);
        if (issue.location) console.log(`     Location: ${issue.location}`);
        if (issue.expected) console.log(`     Expected: ${issue.expected}`);
        if (issue.actual) console.log(`     Actual: ${issue.actual}`);
        if (issue.replacement) console.log(`     Replacement: ${issue.replacement}`);
        if (issue.fix) console.log(`     Fix: ${issue.fix}`);
        console.log('');
      });
    }

    if (medium.length > 0) {
      console.log('🟡 MEDIUM:');
      medium.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.description}`);
        if (issue.location) console.log(`     Location: ${issue.location}`);
        if (issue.expected) console.log(`     Expected: ${issue.expected}`);
        if (issue.actual) console.log(`     Actual: ${issue.actual}`);
        if (issue.fix) console.log(`     Fix: ${issue.fix}`);
        console.log('');
      });
    }

    if (low.length > 0) {
      console.log('🟢 LOW:');
      low.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.description}`);
        if (issue.location) console.log(`     Location: ${issue.location}`);
        if (issue.fix) console.log(`     Fix: ${issue.fix}`);
        console.log('');
      });
    }
  }

  // Print JSON output for programmatic use
  console.log('\n========================================');
  console.log('JSON OUTPUT (for automation)');
  console.log('========================================\n');
  console.log(JSON.stringify(issues, null, 2));

  process.exit(issues.length > 0 ? 1 : 0);
}

testBVBDSIntegration().catch(error => {
  console.error('\n❌ Test failed:', error);
  console.error(error.stack);
  process.exit(1);
});
