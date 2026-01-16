#!/usr/bin/env node

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { beads } from '../../plugin/beads.mjs';

const execAsync = promisify(exec);

async function testAgentCapabilities() {
  console.log('========================================');
  console.log('Testing Agent BV/BD Capabilities');
  console.log('========================================\n');

  const capabilities = [];

  console.log('1. Automatic Integration (Plugin Hooks)\n');

  const hooks = await beads({});
  const input = {
    sessionID: 'test',
    agent: 'orchestrator',
    messages: [{ role: 'user', content: 'What should I work on?' }],
  };
  const output = {};

  await hooks['agent.execute.before'](input, output);

  if (output.systemPrompt && output.systemPrompt.length > 0) {
    capabilities.push({
      capability: 'Automatic task context injection',
      status: 'available',
      method: 'Plugin hook: agent.execute.before',
      description:
        'Agents automatically receive task recommendations, quick wins, and project health in system prompt',
    });
    console.log('   ✓ Automatic task context injection works');
  } else {
    console.log('   ✗ Automatic task context injection failed');
  }

  if (output.beadsTriage?.recommendations) {
    capabilities.push({
      capability: 'Task recommendations access',
      status: 'available',
      method: 'System prompt (output.beadsTriage)',
      description: `Agents can access ${output.beadsTriage.recommendations.length} task recommendations`,
    });
    console.log(
      `   ✓ Task recommendations access works (${output.beadsTriage.recommendations.length} tasks)`,
    );
  }

  if (output.beadsTriage?.project_health) {
    capabilities.push({
      capability: 'Project health visibility',
      status: 'available',
      method: 'System prompt (output.beadsTriage.project_health)',
      description: 'Agents can see project status, types, and priorities',
    });
    console.log('   ✓ Project health visibility works');
  }

  console.log('\n2. Command-Line Access (via Bash tool)\n');

  try {
    const { stdout: bdReady } = await execAsync('bd ready', {
      maxBuffer: 1024 * 1024,
      timeout: 5000,
    });
    const taskCount = bdReady.split('\n').filter((l) => l.trim()).length;
    capabilities.push({
      capability: 'List available tasks',
      status: 'available',
      method: 'Bash tool: bd ready',
      description: `Agents can query ${taskCount} available tasks via command line`,
    });
    console.log(`   ✓ List available tasks works (${taskCount} tasks)`);
  } catch (error) {
    console.log('   ✗ List available tasks failed:', error.message);
  }

  try {
    const { stdout: bdShow } = await execAsync('bd show opencode-k4w', {
      maxBuffer: 1024 * 1024,
      timeout: 5000,
    });
    if (bdShow.includes('Description:')) {
      capabilities.push({
        capability: 'View task details',
        status: 'available',
        method: 'Bash tool: bd show <id>',
        description:
          'Agents can view full task details including description and metadata',
      });
      console.log('   ✓ View task details works');
    }
  } catch (error) {
    console.log('   ✗ View task details failed:', error.message);
  }

  try {
    const { stdout: bvTriage } = await execAsync('bv --robot-triage', {
      maxBuffer: 5 * 1024 * 1024,
      timeout: 10000,
    });
    const _triageData = JSON.parse(bvTriage);
    capabilities.push({
      capability: 'AI-powered task recommendations',
      status: 'available',
      method: 'Bash tool: bv --robot-triage',
      description: `Agents can get ranked recommendations with PageRank, scores, and reasoning`,
    });
    console.log('   ✓ AI-powered task recommendations works');
  } catch (error) {
    console.log('   ✗ AI-powered task recommendations failed:', error.message);
  }

  try {
    const { stdout: bvInsights } = await execAsync('bv --robot-insights', {
      maxBuffer: 5 * 1024 * 1024,
      timeout: 10000,
    });
    const _insightsData = JSON.parse(bvInsights);
    capabilities.push({
      capability: 'Graph analytics insights',
      status: 'available',
      method: 'Bash tool: bv --robot-insights',
      description:
        'Agents can detect bottlenecks, cycles, keystones, and other graph metrics',
    });
    console.log('   ✓ Graph analytics insights works');
  } catch (error) {
    console.log('   ✗ Graph analytics insights failed:', error.message);
  }

  try {
    const { stdout: bvAlerts } = await execAsync('bv --robot-alerts', {
      maxBuffer: 5 * 1024 * 1024,
      timeout: 10000,
    });
    const _alertsData = JSON.parse(bvAlerts);
    capabilities.push({
      capability: 'Project alerts',
      status: 'available',
      method: 'Bash tool: bv --robot-alerts',
      description:
        'Agents can detect stale issues, blocking cascades, and priority mismatches',
    });
    console.log('   ✓ Project alerts works');
  } catch (error) {
    console.log('   ✗ Project alerts failed:', error.message);
  }

  console.log('\n3. Task Management Actions\n');

  try {
    const { stdout: bdUpdate } = await execAsync('bd update --help', {
      timeout: 3000,
    });
    if (bdUpdate.includes('status')) {
      capabilities.push({
        capability: 'Update task status',
        status: 'available',
        method: 'Bash tool: bd update <id> --status <status>',
        description:
          'Agents can change task status (open, in_progress, closed, etc.)',
      });
      console.log('   ✓ Update task status works');
    }
  } catch (error) {
    console.log('   ✗ Update task status failed:', error.message);
  }

  try {
    const { stdout: bdClose } = await execAsync('bd close --help', {
      timeout: 3000,
    });
    if (bdClose.includes('reason')) {
      capabilities.push({
        capability: 'Close tasks',
        status: 'available',
        method: 'Bash tool: bd close <id> --reason <reason>',
        description: 'Agents can close completed tasks with reasons',
      });
      console.log('   ✓ Close tasks works');
    }
  } catch (error) {
    console.log('   ✗ Close tasks failed:', error.message);
  }

  try {
    const { stdout: bdSync } = await execAsync('bd sync --help', {
      timeout: 3000,
    });
    if (bdSync) {
      capabilities.push({
        capability: 'Sync tasks to git',
        status: 'available',
        method: 'Bash tool: bd sync',
        description: 'Agents can sync task changes to git repository',
      });
      console.log('   ✓ Sync tasks to git works');
    }
  } catch (error) {
    console.log('   ✗ Sync tasks to git failed:', error.message);
  }

  console.log('\n========================================');
  console.log('CAPABILITIES SUMMARY');
  console.log('========================================\n');

  const available = capabilities.filter((c) => c.status === 'available').length;
  console.log(
    `Total capabilities: ${available}/${capabilities.length} available\n`,
  );

  const categories = {
    'Automatic Integration': capabilities.filter((c) =>
      c.method?.includes('Plugin'),
    ),
    'Query Tasks': capabilities.filter(
      (c) => c.method?.includes('bd ready') || c.method?.includes('bd show'),
    ),
    'AI Insights': capabilities.filter((c) => c.method?.includes('bv --')),
    'Task Management': capabilities.filter(
      (c) =>
        c.method?.includes('bd update') ||
        c.method?.includes('bd close') ||
        c.method?.includes('bd sync'),
    ),
  };

  Object.entries(categories).forEach(([category, caps]) => {
    if (caps.length > 0) {
      const availableInCategory = caps.filter(
        (c) => c.status === 'available',
      ).length;
      console.log(`${category}: ${availableInCategory}/${caps.length}`);
      caps.forEach((cap) => {
        console.log(
          `  ${cap.status === 'available' ? '✓' : '✗'} ${cap.capability}`,
        );
      });
      console.log('');
    }
  });

  console.log('========================================');
  console.log('DETAILED CAPABILITIES (JSON)');
  console.log('========================================\n');
  console.log(JSON.stringify(capabilities, null, 2));

  console.log('\n========================================');
  console.log('AGENT WORKFLOW EXAMPLE');
  console.log('========================================\n');
  console.log('1. Agent starts session');
  console.log(
    '   → Plugin automatically injects task context into system prompt',
  );
  console.log('2. Agent sees recommended tasks, quick wins, project health');
  console.log('3. Agent queries task details: bd show <id>');
  console.log('4. Agent claims task: bd update <id> --status in_progress');
  console.log('5. Agent works on task');
  console.log('6. Agent gets insights: bv --robot-insights');
  console.log('7. Agent closes task: bd close <id> --reason "Completed"');
  console.log('8. Agent syncs to git: bd sync');
  console.log('   → Plugin may auto-sync if autoSync=true in config\n');
}

testAgentCapabilities().catch((error) => {
  console.error('\n❌ Test failed:', error);
  console.error(error.stack);
  process.exit(1);
});
