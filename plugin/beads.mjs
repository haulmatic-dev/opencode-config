import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

class BeadsClient {
  constructor() {
    this.enabled = true;
  }

  async ready() {
    if (!this.enabled) return [];
    try {
      const { stdout } = await execAsync('bd ready', {
        maxBuffer: 1024 * 1024,
      });
      return this.parseOutput(stdout);
    } catch (error) {
      console.error('[Beads] Error getting ready tasks:', error.message);
      return [];
    }
  }

  async show(id) {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(`bd show ${id}`, {
        maxBuffer: 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      console.error('[Beads] Error showing task:', error.message);
      return null;
    }
  }

  async update(id, options = {}) {
    if (!this.enabled) return false;
    try {
      const args = Object.entries(options)
        .map(([k, v]) => `--${k} ${v}`)
        .join(' ');
      await execAsync(`bd update ${id} ${args}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error updating task:', error.message);
      return false;
    }
  }

  async close(id, reason = 'Completed') {
    if (!this.enabled) return false;
    try {
      await execAsync(`bd close ${id} --reason="${reason}"`);
      return true;
    } catch (error) {
      console.error('[Beads] Error closing task:', error.message);
      return false;
    }
  }

  async sync() {
    if (!this.enabled) return false;
    try {
      await execAsync('bd sync');
      return true;
    } catch (error) {
      console.error('[Beads] Error syncing:', error.message);
      return false;
    }
  }

  parseOutput(output) {
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
  }
}

class BeadsViewerClient {
  constructor() {
    this.enabled = true;
  }

  async triage() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-triage', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting triage:', error.message);
      return null;
    }
  }

  async plan(options = {}) {
    if (!this.enabled) return null;
    try {
      const args = Object.entries(options)
        .map(([k, v]) => `--${k} ${v}`)
        .join(' ');
      const { stdout } = await execAsync(`bv --robot-plan ${args}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting plan:', error.message);
      return null;
    }
  }

  async insights(options = {}) {
    if (!this.enabled) return null;
    try {
      const args = Object.entries(options)
        .map(([k, v]) => `--${k} ${v}`)
        .join(' ');
      const { stdout } = await execAsync(`bv --robot-insights ${args}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting insights:', error.message);
      return null;
    }
  }

  async alerts() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-alerts', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting alerts:', error.message);
      return null;
    }
  }

  async history() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-history', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting history:', error.message);
      return null;
    }
  }

  async labelHealth() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-label-health', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting label health:', error.message);
      return null;
    }
  }
}

let beadsClient = null;
let bvClient = null;

class BeadsMiddleware {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.autoTriage = options.autoTriage !== false;
    this.autoClaim = options.autoClaim !== false;
    this.autoClose = options.autoClose !== false;
    this.autoSync = options.autoSync !== false;
  }

  async formatRecommendations(triageData) {
    if (!triageData) return '';

    const parts = [];

    if (triageData.quick_ref) {
      parts.push('## Quick Reference (from bv --robot-triage)\n');
      parts.push(
        `- Ready tasks: ${triageData.quick_ref.actionable_count || triageData.quick_ref.open_count || 0}`,
      );
      parts.push(`- Open tasks: ${triageData.quick_ref.open_count || 0}`);
      parts.push(
        `- Total tasks: ${triageData.meta?.issue_count || triageData.quick_ref.open_count || 0}`,
      );
      parts.push('');
    }

    if (triageData.recommendations && triageData.recommendations.length > 0) {
      parts.push('## Recommended Tasks (from bv --robot-triage)\n');
      triageData.recommendations.slice(0, 3).forEach((rec, idx) => {
        parts.push(`${idx + 1}. [${rec.id}] ${rec.title}`);
        parts.push(`   - Priority: ${rec.priority}`);
        parts.push(`   - Score: ${rec.score?.toFixed(2) || 'N/A'}`);
        parts.push(`   - Unblocks: ${rec.unblocks || 0}`);
        parts.push(`   - Reason: ${rec.reasons?.join(', ') || 'N/A'}`);
        if (triageData.commands?.claim) {
          parts.push(`   - Command: ${triageData.commands.claim}`);
        }
        parts.push('');
      });
    }

    if (triageData.quick_wins && triageData.quick_wins.length > 0) {
      parts.push('## Quick Wins (low-effort, high-impact)\n');
      triageData.quick_wins.slice(0, 3).forEach((win, idx) => {
        parts.push(`${idx + 1}. [${win.id}] ${win.title}`);
        parts.push(`   - Impact: ${win.reason || 'N/A'}`);
        if (triageData.commands?.claim) {
          parts.push(`   - Command: bd update ${win.id} --status in_progress`);
        } else {
          parts.push(`   - Command: bd update ${win.id} --status in_progress`);
        }
        parts.push('');
      });
    }

    if (
      triageData.blockers_to_clear &&
      triageData.blockers_to_clear.length > 0
    ) {
      parts.push('## Blockers to Clear (unblocks most work)\n');
      triageData.blockers_to_clear.slice(0, 3).forEach((blocker, idx) => {
        parts.push(`${idx + 1}. [${blocker.id}] ${blocker.title}`);
        parts.push(`   - Blocks: ${blocker.blocks?.length || 0}`);
        parts.push(`   - Command: ${blocker.command || 'N/A'}`);
        parts.push('');
      });
    }

    if (triageData.project_health) {
      parts.push('## Project Health\n');
      const health = triageData.project_health;
      if (health.counts?.by_status) {
        parts.push(
          '- Status:',
          Object.entries(health.counts.by_status)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', '),
        );
      }
      if (health.counts?.by_type) {
        parts.push(
          '- Types:',
          Object.entries(health.counts.by_type)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', '),
        );
      }
      if (health.counts?.by_priority) {
        parts.push(
          '- Priorities:',
          Object.entries(health.counts.by_priority)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', '),
        );
      }
      if (health.graph?.density) {
        parts.push(`- Graph Density: ${health.graph.density.toFixed(3)}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  async formatInsights(insightsData) {
    if (!insightsData) return '';

    const parts = [];

    if (insightsData.Cycles && insightsData.Cycles.length > 0) {
      parts.push('## ⚠️ CRITICAL: Circular Dependencies Detected\n');
      parts.push('The following cycles must be fixed:\n');
      insightsData.Cycles.forEach((cycle, idx) => {
        parts.push(`${idx + 1}. ${cycle.map((id) => id).join(' → ')}`);
      });
      parts.push('');
    }

    if (insightsData.bottlenecks && insightsData.bottlenecks.length > 0) {
      parts.push('## Bottlenecks (high betweenness)\n');
      insightsData.bottlenecks.slice(0, 5).forEach((b, idx) => {
        parts.push(`${idx + 1}. [${b.id}] Score: ${b.value?.toFixed(3)}`);
      });
      parts.push('');
    }

    if (insightsData.keystones && insightsData.keystones.length > 0) {
      parts.push('## Critical Path Tasks (zero slack)\n');
      insightsData.keystones.slice(0, 5).forEach((k, idx) => {
        parts.push(`${idx + 1}. [${k.id}] Impact: ${k.value?.toFixed(1)}`);
      });
      parts.push('');
    }

    if (insightsData.stats) {
      const stats = insightsData.stats;
      parts.push('## Graph Metrics\n');
      if (stats.density !== undefined) {
        parts.push(
          `- Density: ${stats.density?.toFixed(3)} (${stats.density < 0.05 ? 'healthy' : stats.density > 0.15 ? 'warning' : 'normal'})`,
        );
      }
      if (stats.topologicalOrder) {
        parts.push(`- Valid execution order: Yes`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  async formatAlerts(alertsData) {
    if (!alertsData) return '';

    const parts = [];

    if (alertsData.stale_issues && alertsData.stale_issues.length > 0) {
      parts.push('## Stale Issues\n');
      alertsData.stale_issues.slice(0, 5).forEach((issue, idx) => {
        parts.push(
          `${idx + 1}. [${issue.id}] ${issue.title} (${issue.age || 'unknown'})`,
        );
      });
      parts.push('');
    }

    if (
      alertsData.blocking_cascades &&
      alertsData.blocking_cascades.length > 0
    ) {
      parts.push('## Blocking Cascades\n');
      alertsData.blocking_cascades.slice(0, 5).forEach((cascade, idx) => {
        parts.push(
          `${idx + 1}. [${cascade.id}] Blocks ${cascade.blocked_count || 0} tasks`,
        );
      });
      parts.push('');
    }

    if (
      alertsData.priority_mismatches &&
      alertsData.priority_mismatches.length > 0
    ) {
      parts.push('## Priority Mismatches\n');
      alertsData.priority_mismatches.slice(0, 5).forEach((mismatch, idx) => {
        parts.push(
          `${idx + 1}. [${mismatch.id}] Current: ${mismatch.current_priority}, Suggested: ${mismatch.suggested_priority}`,
        );
      });
      parts.push('');
    }

    return parts.join('\n');
  }
}

let middleware = null;

export const beads = async ({
  project: _project,
  client: _client,
  $: _$,
  directory: _directory,
  worktree: _worktree,
}) => {
  const configPath = new URL('../config/beads.json', import.meta.url);
  let config = {
    enabled: true,
    autoTriage: true,
    autoClaim: false,
    autoClose: true,
    autoSync: false,
  };

  try {
    const configContent = await fetch(configPath);
    if (configContent.ok) {
      config = await configContent.json();
    }
  } catch (_e) {
    console.log('[BeadsPlugin] No config found, using defaults');
  }

  if (!beadsClient) {
    beadsClient = new BeadsClient();
  }

  if (!bvClient) {
    bvClient = new BeadsViewerClient();
  }

  if (!middleware) {
    middleware = new BeadsMiddleware(config);
  }

  return {
    'agent.execute.before': async (_input, output) => {
      if (!middleware || !config.enabled) {
        return;
      }

      if (middleware.autoTriage) {
        const triage = await bvClient.triage();

        if (triage?.triage) {
          const triagePrompt = await middleware.formatRecommendations(
            triage.triage,
          );
          output.systemPrompt = triagePrompt;
          output.beadsTriage = triage.triage;
        }
      }
    },

    'agent.execute.after': async (_input, output) => {
      const { response, error, beadsTask } = output;

      if (!middleware || !config.enabled) {
        return;
      }

      if (middleware.autoClaim && beadsTask && !error) {
        const topRecommendation = output.beadsTriage?.recommendations?.[0];
        if (topRecommendation) {
          await beadsClient.update(topRecommendation.id, {
            status: 'in_progress',
          });
          console.log(
            `[BeadsPlugin] Auto-claimed task: ${topRecommendation.id}`,
          );
        }
      }

      if (middleware.autoClose && beadsTask && !error && response) {
        await beadsClient.close(beadsTask.id, 'Completed via beads plugin');
        console.log(`[BeadsPlugin] Auto-closed task: ${beadsTask.id}`);
      }

      if (middleware.autoSync && !error) {
        await beadsClient.sync();
        console.log('[BeadsPlugin] Auto-synced beads to git');
      }

      if (error) {
        console.error(
          '[BeadsPlugin] Agent execution failed, not updating beads',
        );
      }
    },
  };
};
