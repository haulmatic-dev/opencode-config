import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';

const execAsync = promisify(exec);

const BEADS_KEYWORDS = [
  'bead',
  'bd ',
  'bd,',
  'bd.',
  'beads',
  'task',
  'issue',
  'beads',
  'update ',
  'close ',
  'create ',
  'delete ',
  'reopen ',
  'status',
  'bv ',
  'triage',
  'insights',
  'orphans',
  'drift',
  'sprint',
  'dependency',
  'blocker',
  'unblock',
  'priority',
  'assignee',
];

const BEADS_GUIDE_PATH = new URL('../skills/beads-agent.md', import.meta.url);

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

  async delete(ids, options = {}) {
    if (!this.enabled) return false;
    try {
      const idsArray = Array.isArray(ids) ? ids : [ids];
      const flags = [];
      if (options.cascade) flags.push('--cascade');
      if (options.force) flags.push('--force');
      if (options.hard) flags.push('--hard');
      if (options.dryRun) flags.push('--dry-run');
      if (options.reason) flags.push(`--reason="${options.reason}"`);
      await execAsync(`bd delete ${idsArray.join(' ')} ${flags.join(' ')}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error deleting issues:', error.message);
      return false;
    }
  }

  async create(options = {}) {
    if (!this.enabled) return null;
    try {
      const flags = [];
      if (options.title) flags.push(options.title);
      if (options.description)
        flags.push(`--description "${options.description}"`);
      if (options.assignee) flags.push(`--assignee "${options.assignee}"`);
      if (options.priority) flags.push(`--priority ${options.priority}`);
      if (options.type) flags.push(`--type ${options.type}`);
      if (options.labels && options.labels.length)
        flags.push(`--labels "${options.labels.join(',')}"`);
      if (options.deps && options.deps.length)
        flags.push(`--deps "${options.deps.join(',')}"`);
      if (options.due) flags.push(`--due "${options.due}"`);
      if (options.estimate) flags.push(`--estimate ${options.estimate}`);
      if (options.design) flags.push(`--design "${options.design}"`);
      if (options.notes) flags.push(`--notes "${options.notes}"`);
      if (options.acceptance)
        flags.push(`--acceptance "${options.acceptance}"`);
      if (options.parent) flags.push(`--parent ${options.parent}`);
      if (options.rig) flags.push(`--rig ${options.rig}`);
      if (options.silent) flags.push('--silent');
      const { stdout } = await execAsync(`bd create ${flags.join(' ')}`);
      return stdout.trim();
    } catch (error) {
      console.error('[Beads] Error creating issue:', error.message);
      return null;
    }
  }

  async edit(id, field = 'description') {
    if (!this.enabled) return false;
    try {
      const validFields = [
        'title',
        'description',
        'design',
        'notes',
        'acceptance',
      ];
      if (!validFields.includes(field)) {
        throw new Error(
          `Invalid field: ${field}. Must be one of: ${validFields.join(', ')}`,
        );
      }
      await execAsync(`bd edit ${id} --${field}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error editing issue:', error.message);
      return false;
    }
  }

  async search(query, filters = {}) {
    if (!this.enabled) return null;
    try {
      const args = Object.entries(filters)
        .map(([k, v]) => `--${k} "${v}"`)
        .join(' ');
      const { stdout } = await execAsync(`bd search "${query}" ${args}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      console.error('[Beads] Error searching issues:', error.message);
      return null;
    }
  }

  async list(filters = {}) {
    if (!this.enabled) return null;
    try {
      const args = Object.entries(filters)
        .filter(([k, v]) => v !== undefined && v !== false)
        .map(([k, v]) => `--${k} "${v}"`)
        .join(' ');
      const { stdout } = await execAsync(`bd list ${args}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      console.error('[Beads] Error listing issues:', error.message);
      return null;
    }
  }

  async reopen(ids, reason = '') {
    if (!this.enabled) return false;
    try {
      const idsArray = Array.isArray(ids) ? ids : [ids];
      const reasonFlag = reason ? `--reason "${reason}"` : '';
      await execAsync(`bd reopen ${idsArray.join(' ')} ${reasonFlag}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error reopening issues:', error.message);
      return false;
    }
  }

  async duplicate(id, canonicalId) {
    if (!this.enabled) return false;
    try {
      await execAsync(`bd duplicate ${id} --of ${canonicalId}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error marking duplicate:', error.message);
      return false;
    }
  }

  async defer(ids, until) {
    if (!this.enabled) return false;
    try {
      const idsArray = Array.isArray(ids) ? ids : [ids];
      const untilFlag = until ? `--until="${until}"` : '';
      await execAsync(`bd defer ${idsArray.join(' ')} ${untilFlag}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error deferring issues:', error.message);
      return false;
    }
  }

  async undefer(ids) {
    if (!this.enabled) return false;
    try {
      const idsArray = Array.isArray(ids) ? ids : [ids];
      await execAsync(`bd undefer ${idsArray.join(' ')}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error undefering issues:', error.message);
      return false;
    }
  }

  async supersede(id, successorId) {
    if (!this.enabled) return false;
    try {
      await execAsync(`bd supersede ${id} ${successorId}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error superseding issue:', error.message);
      return false;
    }
  }

  async addComment(id, comment) {
    if (!this.enabled) return false;
    try {
      await execAsync(`bd comments add ${id} "${comment}"`);
      return true;
    } catch (error) {
      console.error('[Beads] Error adding comment:', error.message);
      return false;
    }
  }

  async addLabel(ids, labels) {
    if (!this.enabled) return false;
    try {
      const idsArray = Array.isArray(ids) ? ids : [ids];
      const labelsArray = Array.isArray(labels) ? labels : [labels];
      await execAsync(
        `bd label add ${idsArray.join(' ')} ${labelsArray.join(' ')}`,
      );
      return true;
    } catch (error) {
      console.error('[Beads] Error adding labels:', error.message);
      return false;
    }
  }

  async removeLabel(ids, labels) {
    if (!this.enabled) return false;
    try {
      const idsArray = Array.isArray(ids) ? ids : [ids];
      const labelsArray = Array.isArray(labels) ? labels : [labels];
      await execAsync(
        `bd label remove ${idsArray.join(' ')} ${labelsArray.join(' ')}`,
      );
      return true;
    } catch (error) {
      console.error('[Beads] Error removing labels:', error.message);
      return false;
    }
  }

  async depAdd(blockedId, blockerId, type = 'blocks') {
    if (!this.enabled) return false;
    try {
      await execAsync(`bd dep add ${blockedId} ${type}:${blockerId}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error adding dependency:', error.message);
      return false;
    }
  }

  async depRemove(blockedId, blockerId) {
    if (!this.enabled) return false;
    try {
      await execAsync(`bd dep remove ${blockedId} ${blockerId}`);
      return true;
    } catch (error) {
      console.error('[Beads] Error removing dependency:', error.message);
      return false;
    }
  }

  async depList(id, direction = 'dependents') {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(`bd dep list ${id} ${direction}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      console.error('[Beads] Error listing dependencies:', error.message);
      return null;
    }
  }

  async depTree(id) {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(`bd dep tree ${id}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      console.error('[Beads] Error showing dependency tree:', error.message);
      return null;
    }
  }

  async depCycles() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bd dep cycles', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      console.error('[Beads] Error detecting cycles:', error.message);
      return null;
    }
  }

  async stale(options = {}) {
    if (!this.enabled) return null;
    try {
      const flags = [];
      if (options.days) flags.push(`--days ${options.days}`);
      if (options.limit) flags.push(`--limit ${options.limit}`);
      if (options.status) flags.push(`--status ${options.status}`);
      const { stdout } = await execAsync(`bd stale ${flags.join(' ')}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      console.error('[Beads] Error finding stale issues:', error.message);
      return null;
    }
  }

  async count(filters = {}) {
    if (!this.enabled) return null;
    try {
      const args = Object.entries(filters)
        .map(([k, v]) => `--${k} "${v}"`)
        .join(' ');
      const { stdout } = await execAsync(`bd count ${args}`);
      return parseInt(stdout.trim(), 10);
    } catch (error) {
      console.error('[Beads] Error counting issues:', error.message);
      return null;
    }
  }

  async status() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bd status', {
        maxBuffer: 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      console.error('[Beads] Error getting status:', error.message);
      return null;
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

  async next() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-next', {
        maxBuffer: 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting next task:', error.message);
      return null;
    }
  }

  async capacity(options = {}) {
    if (!this.enabled) return null;
    try {
      const args = Object.entries(options)
        .map(([k, v]) => (v !== undefined ? `--${k} "${v}"` : ''))
        .filter(Boolean)
        .join(' ');
      const { stdout } = await execAsync(`bv --robot-capacity ${args}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting capacity:', error.message);
      return null;
    }
  }

  async drift(options = {}) {
    if (!this.enabled) return null;
    try {
      const args = Object.entries(options)
        .map(([k, v]) => (v !== undefined ? `--${k} "${v}"` : ''))
        .filter(Boolean)
        .join(' ');
      const { stdout } = await execAsync(`bv --robot-drift ${args}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting drift:', error.message);
      return null;
    }
  }

  async search(query, options = {}) {
    if (!this.enabled) return null;
    try {
      const args = Object.entries(options)
        .map(([k, v]) => (v !== undefined ? `--${k} "${v}"` : ''))
        .filter(Boolean)
        .join(' ');
      const { stdout } = await execAsync(
        `bv --robot-search --search "${query}" ${args}`,
        {
          maxBuffer: 5 * 1024 * 1024,
        },
      );
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error searching:', error.message);
      return null;
    }
  }

  async fileBeads(filePath) {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(
        `bv --robot-file-beads "${filePath}"`,
        {
          maxBuffer: 5 * 1024 * 1024,
        },
      );
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting file beads:', error.message);
      return null;
    }
  }

  async fileHotspots() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-file-hotspots', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error(
        '[BeadsViewer] Error getting file hotspots:',
        error.message,
      );
      return null;
    }
  }

  async fileRelations(filePath) {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(
        `bv --robot-file-relations "${filePath}"`,
        {
          maxBuffer: 5 * 1024 * 1024,
        },
      );
      return JSON.parse(stdout);
    } catch (error) {
      console.error(
        '[BeadsViewer] Error getting file relations:',
        error.message,
      );
      return null;
    }
  }

  async impact(filePaths) {
    if (!this.enabled) return null;
    try {
      const paths = Array.isArray(filePaths) ? filePaths.join(',') : filePaths;
      const { stdout } = await execAsync(`bv --robot-impact "${paths}"`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error analyzing impact:', error.message);
      return null;
    }
  }

  async impactNetwork(beadId = '') {
    if (!this.enabled) return null;
    try {
      const idArg = beadId ? `"${beadId}"` : '';
      const { stdout } = await execAsync(`bv --robot-impact-network ${idArg}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error(
        '[BeadsViewer] Error getting impact network:',
        error.message,
      );
      return null;
    }
  }

  async related(beadId) {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(`bv --robot-related "${beadId}"`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error(
        '[BeadsViewer] Error getting related beads:',
        error.message,
      );
      return null;
    }
  }

  async causality(beadId) {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(`bv --robot-causality "${beadId}"`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting causality:', error.message);
      return null;
    }
  }

  async blockerChain(beadId) {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(
        `bv --robot-blocker-chain "${beadId}"`,
        {
          maxBuffer: 5 * 1024 * 1024,
        },
      );
      return JSON.parse(stdout);
    } catch (error) {
      console.error(
        '[BeadsViewer] Error getting blocker chain:',
        error.message,
      );
      return null;
    }
  }

  async correlationStats() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-correlation-stats', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error(
        '[BeadsViewer] Error getting correlation stats:',
        error.message,
      );
      return null;
    }
  }

  async confirmCorrelation(sha, beadId) {
    if (!this.enabled) return false;
    try {
      await execAsync(`bv --robot-confirm-correlation "${sha}:${beadId}"`);
      return true;
    } catch (error) {
      console.error(
        '[BeadsViewer] Error confirming correlation:',
        error.message,
      );
      return false;
    }
  }

  async rejectCorrelation(sha, beadId) {
    if (!this.enabled) return false;
    try {
      await execAsync(`bv --robot-reject-correlation "${sha}:${beadId}"`);
      return true;
    } catch (error) {
      console.error(
        '[BeadsViewer] Error rejecting correlation:',
        error.message,
      );
      return false;
    }
  }

  async explainCorrelation(sha, beadId) {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(
        `bv --robot-explain-correlation "${sha}:${beadId}"`,
        {
          maxBuffer: 5 * 1024 * 1024,
        },
      );
      return JSON.parse(stdout);
    } catch (error) {
      console.error(
        '[BeadsViewer] Error explaining correlation:',
        error.message,
      );
      return null;
    }
  }

  async orphans() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-orphans', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting orphans:', error.message);
      return null;
    }
  }

  async sprintList() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-sprint-list', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error listing sprints:', error.message);
      return null;
    }
  }

  async sprintShow(sprintId) {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync(
        `bv --robot-sprint-show "${sprintId}"`,
        {
          maxBuffer: 5 * 1024 * 1024,
        },
      );
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error showing sprint:', error.message);
      return null;
    }
  }

  async recipes() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --robot-recipes', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error getting recipes:', error.message);
      return null;
    }
  }

  async checkDrift() {
    if (!this.enabled) return null;
    try {
      const { stdout } = await execAsync('bv --check-drift', {
        maxBuffer: 5 * 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[BeadsViewer] Error checking drift:', error.message);
      return null;
    }
  }

  async saveBaseline(description = '') {
    if (!this.enabled) return false;
    try {
      const descArg = description ? `"${description}"` : '';
      await execAsync(`bv --save-baseline ${descArg}`);
      return true;
    } catch (error) {
      console.error('[BeadsViewer] Error saving baseline:', error.message);
      return false;
    }
  }

  async exportMd(outputPath) {
    if (!this.enabled) return false;
    try {
      await execAsync(`bv --export-md "${outputPath}"`);
      return true;
    } catch (error) {
      console.error('[BeadsViewer] Error exporting Markdown:', error.message);
      return false;
    }
  }

  async exportGraph(outputPath, format = 'dot') {
    if (!this.enabled) return false;
    try {
      await execAsync(
        `bv --export-graph "${outputPath}" --graph-format ${format}`,
      );
      return true;
    } catch (error) {
      console.error('[BeadsViewer] Error exporting graph:', error.message);
      return false;
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
    'agent.execute.before': async (input, output) => {
      if (!middleware || !config.enabled) {
        return;
      }

      const userInput = input?.prompt || input?.message || input?.content || '';
      const inputLower = userInput.toLowerCase();

      const needsBeadsContext = BEADS_KEYWORDS.some((keyword) =>
        inputLower.includes(keyword.toLowerCase()),
      );

      if (needsBeadsContext) {
        try {
          const beadsGuide = readFileSync(BEADS_GUIDE_PATH, 'utf8');
          output.beadsGuide = beadsGuide;
          output.systemPrompt += '\n\n' + beadsGuide;
          console.log('[BeadsPlugin] Injected beads context for task');
        } catch (e) {
          console.log('[BeadsPlugin] Could not load beads guide:', e.message);
        }
      }

      if (middleware.autoTriage) {
        const triage = await bvClient.triage();

        if (triage?.triage) {
          const triagePrompt = await middleware.formatRecommendations(
            triage.triage,
          );
          output.systemPrompt += '\n\n' + triagePrompt;
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
