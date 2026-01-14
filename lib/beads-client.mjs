import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class BeadsClient {
  constructor() {
    this.enabled = true;
  }

  async ready() {
    if (!this.enabled) return [];
    try {
      const { stdout } = await execAsync('bd ready', {
        maxBuffer: 1024 * 1024,
      });
      return this.parseListOutput(stdout);
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
      if (options.labels?.length)
        flags.push(`--labels "${options.labels.join(',')}"`);
      if (options.deps?.length)
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
    if (!this.enabled) return [];
    try {
      const args = Object.entries(filters)
        .filter(([_k, v]) => v !== undefined && v !== false)
        .map(([k, v]) => `--${k} "${v}"`)
        .join(' ');
      const { stdout } = await execAsync(`bd list ${args}`, {
        maxBuffer: 5 * 1024 * 1024,
      });
      return this.parseListOutput(stdout);
    } catch (error) {
      console.error('[Beads] Error listing issues:', error.message);
      return [];
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

  async depList(id, direction = 'down') {
    if (!this.enabled) return null;
    try {
      const directionFlag =
        direction && direction !== 'down' ? `--direction=${direction}` : '';
      const { stdout } = await execAsync(`bd dep list ${id} ${directionFlag}`, {
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

  parseListOutput(output) {
    const lines = output.split('\n').filter((line) => line.trim());
    const tasks = [];

    for (const line of lines) {
      const parts = line.split(' ');
      if (parts.length >= 5) {
        const id = parts[0];
        const priority = parts[1];
        const type = parts[2];
        const status = parts[3];
        const title = parts.slice(5).join(' ');
        tasks.push({ id, priority, type, status, title });
      }
    }

    return tasks;
  }
}

export class BeadsViewerClient {
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
