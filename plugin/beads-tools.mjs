import { tool } from '@opencode-ai/plugin';
import { BeadsClient, BeadsViewerClient } from '../lib/beads-client.mjs';

const beadsClient = new BeadsClient();
const bvClient = new BeadsViewerClient();

export const BeadsToolsPlugin = async () => {
  return {
    tool: {
      beads_list: tool({
        description: 'List beads with optional filters',
        args: {
          filters: tool.schema.optional(tool.schema.string()),
        },
        async execute({ filters }) {
          const result = await beadsClient.list(
            filters ? JSON.parse(filters) : {},
          );
          return JSON.stringify(result, null, 2);
        },
      }),

      beads_show: tool({
        description: 'Show details of a specific bead',
        args: {
          id: tool.schema.string(),
        },
        async execute({ id }) {
          return await beadsClient.show(id);
        },
      }),

      beads_create: tool({
        description: 'Create a new bead',
        args: {
          options: tool.schema.string(),
        },
        async execute({ options }) {
          return await beadsClient.create(JSON.parse(options));
        },
      }),

      beads_update: tool({
        description: "Update a bead's status or fields",
        args: {
          id: tool.schema.string(),
          options: tool.schema.string(),
        },
        async execute({ id, options }) {
          return await beadsClient.update(id, JSON.parse(options));
        },
      }),

      beads_close: tool({
        description: 'Close a bead',
        args: {
          id: tool.schema.string(),
          reason: tool.schema.optional(tool.schema.string()),
        },
        async execute({ id, reason }) {
          return await beadsClient.close(id, reason || 'Completed');
        },
      }),

      beads_delete: tool({
        description: 'Delete one or more beads',
        args: {
          ids: tool.schema.string(),
          options: tool.schema.optional(tool.schema.string()),
        },
        async execute({ ids, options }) {
          const idsArray = ids.split(',');
          const opts = options ? JSON.parse(options) : {};
          return await beadsClient.delete(idsArray, opts);
        },
      }),

      beads_ready: tool({
        description: 'Get ready (actionable) beads',
        args: {},
        async execute() {
          return JSON.stringify(await beadsClient.ready(), null, 2);
        },
      }),

      beads_count: tool({
        description: 'Count beads with optional filters',
        args: {
          filters: tool.schema.optional(tool.schema.string()),
        },
        async execute({ filters }) {
          return await beadsClient.count(filters ? JSON.parse(filters) : {});
        },
      }),

      beads_status: tool({
        description: 'Get beads database status',
        args: {},
        async execute() {
          return await beadsClient.status();
        },
      }),

      beads_sync: tool({
        description: 'Sync beads to git',
        args: {},
        async execute() {
          return await beadsClient.sync();
        },
      }),

      beads_reopen: tool({
        description: 'Reopen a closed bead',
        args: {
          ids: tool.schema.string(),
          reason: tool.schema.optional(tool.schema.string()),
        },
        async execute({ ids, reason }) {
          return await beadsClient.reopen(ids.split(','), reason || '');
        },
      }),

      beads_dep_add: tool({
        description: 'Add dependency between beads',
        args: {
          blockedId: tool.schema.string(),
          blockerId: tool.schema.string(),
          type: tool.schema.optional(tool.schema.string()),
        },
        async execute({ blockedId, blockerId, type }) {
          return await beadsClient.depAdd(
            blockedId,
            blockerId,
            type || 'blocks',
          );
        },
      }),

      beads_dep_remove: tool({
        description: 'Remove dependency between beads',
        args: {
          blockedId: tool.schema.string(),
          blockerId: tool.schema.string(),
        },
        async execute({ blockedId, blockerId }) {
          return await beadsClient.depRemove(blockedId, blockerId);
        },
      }),

      beads_dep_tree: tool({
        description: 'Show dependency tree for a bead',
        args: {
          id: tool.schema.string(),
        },
        async execute({ id }) {
          return await beadsClient.depTree(id);
        },
      }),

      beads_dep_cycles: tool({
        description: 'Check for dependency cycles',
        args: {},
        async execute() {
          return await beadsClient.depCycles();
        },
      }),

      beads_add_label: tool({
        description: 'Add labels to beads',
        args: {
          ids: tool.schema.string(),
          labels: tool.schema.string(),
        },
        async execute({ ids, labels }) {
          return await beadsClient.addLabel(ids.split(','), labels.split(','));
        },
      }),

      beads_remove_label: tool({
        description: 'Remove labels from beads',
        args: {
          ids: tool.schema.string(),
          labels: tool.schema.string(),
        },
        async execute({ ids, labels }) {
          return await beadsClient.removeLabel(
            ids.split(','),
            labels.split(','),
          );
        },
      }),

      beads_search: tool({
        description: 'Search beads',
        args: {
          query: tool.schema.string(),
          filters: tool.schema.optional(tool.schema.string()),
        },
        async execute({ query, filters }) {
          return await beadsClient.search(
            query,
            filters ? JSON.parse(filters) : {},
          );
        },
      }),

      beads_stale: tool({
        description: 'Find stale beads',
        args: {
          options: tool.schema.optional(tool.schema.string()),
        },
        async execute({ options }) {
          return await beadsClient.stale(options ? JSON.parse(options) : {});
        },
      }),

      // BeadsViewer tools
      bv_triage: tool({
        description: 'Get AI-powered task triage recommendations',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.triage(), null, 2);
        },
      }),

      bv_next: tool({
        description: 'Get next recommended task',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.next(), null, 2);
        },
      }),

      bv_insights: tool({
        description: 'Get graph insights (bottlenecks, cycles, keystones)',
        args: {
          options: tool.schema.optional(tool.schema.string()),
        },
        async execute({ options }) {
          return JSON.stringify(
            await bvClient.insights(options ? JSON.parse(options) : {}),
            null,
            2,
          );
        },
      }),

      bv_alerts: tool({
        description: 'Get alerts (stale issues, blocking cascades)',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.alerts(), null, 2);
        },
      }),

      bv_file_beads: tool({
        description: 'Get beads related to a file',
        args: {
          filePath: tool.schema.string(),
        },
        async execute({ filePath }) {
          return JSON.stringify(await bvClient.fileBeads(filePath), null, 2);
        },
      }),

      bv_file_hotspots: tool({
        description: 'Get file hotspots (high-change files)',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.fileHotspots(), null, 2);
        },
      }),

      bv_impact: tool({
        description: 'Get impact analysis for files',
        args: {
          filePaths: tool.schema.string(),
        },
        async execute({ filePaths }) {
          return JSON.stringify(await bvClient.impact(filePaths), null, 2);
        },
      }),

      bv_impact_network: tool({
        description: 'Get impact network for a bead',
        args: {
          beadId: tool.schema.optional(tool.schema.string()),
        },
        async execute({ beadId }) {
          return JSON.stringify(
            await bvClient.impactNetwork(beadId || ''),
            null,
            2,
          );
        },
      }),

      bv_related: tool({
        description: 'Get related beads',
        args: {
          beadId: tool.schema.string(),
        },
        async execute({ beadId }) {
          return JSON.stringify(await bvClient.related(beadId), null, 2);
        },
      }),

      bv_causality: tool({
        description: 'Get causality chain for a bead',
        args: {
          beadId: tool.schema.string(),
        },
        async execute({ beadId }) {
          return JSON.stringify(await bvClient.causality(beadId), null, 2);
        },
      }),

      bv_blocker_chain: tool({
        description: 'Get blocker chain for a bead',
        args: {
          beadId: tool.schema.string(),
        },
        async execute({ beadId }) {
          return JSON.stringify(await bvClient.blockerChain(beadId), null, 2);
        },
      }),

      bv_orphans: tool({
        description: 'Get orphan beads (no dependencies)',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.orphans(), null, 2);
        },
      }),

      bv_history: tool({
        description: 'Get git-history correlation stats',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.history(), null, 2);
        },
      }),

      bv_label_health: tool({
        description: 'Get label health metrics',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.labelHealth(), null, 2);
        },
      }),

      bv_check_drift: tool({
        description: 'Check for baseline drift',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.checkDrift(), null, 2);
        },
      }),

      bv_recipes: tool({
        description: 'Get available recipes',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.recipes(), null, 2);
        },
      }),

      bv_sprint_list: tool({
        description: 'List sprints',
        args: {},
        async execute() {
          return JSON.stringify(await bvClient.sprintList(), null, 2);
        },
      }),

      bv_sprint_show: tool({
        description: 'Show sprint details',
        args: {
          sprintId: tool.schema.string(),
        },
        async execute({ sprintId }) {
          return JSON.stringify(await bvClient.sprintShow(sprintId), null, 2);
        },
      }),

      bv_capacity: tool({
        description: 'Get capacity recommendations',
        args: {
          options: tool.schema.optional(tool.schema.string()),
        },
        async execute({ options }) {
          return JSON.stringify(
            await bvClient.capacity(options ? JSON.parse(options) : {}),
            null,
            2,
          );
        },
      }),

      bv_drift: tool({
        description: 'Get drift analysis',
        args: {
          options: tool.schema.optional(tool.schema.string()),
        },
        async execute({ options }) {
          return JSON.stringify(
            await bvClient.drift(options ? JSON.parse(options) : {}),
            null,
            2,
          );
        },
      }),

      bv_search: tool({
        description: 'Semantic search of beads',
        args: {
          query: tool.schema.string(),
          options: tool.schema.optional(tool.schema.string()),
        },
        async execute({ query, options }) {
          return JSON.stringify(
            await bvClient.search(query, options ? JSON.parse(options) : {}),
            null,
            2,
          );
        },
      }),
    },
  };
};
