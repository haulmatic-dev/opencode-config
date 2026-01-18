import { tool } from '@opencode-ai/plugin';
import { BeadsClient, BeadsViewerClient } from '../lib/beads-client.mjs';
import {
  enhanceBeadCreateWithTLDR,
  extractScopeFromDescription,
  formatImpactForDisplay,
  getBeadImpactFromNotes,
  validateScopeAgainstImpact,
} from '../lib/beads-tldr.mjs';
import { createTLDRClient } from '../lib/tldr-client.mjs';

const beadsClient = new BeadsClient();
const bvClient = new BeadsViewerClient();
const tldrClient = createTLDRClient();

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
        description: `Show details of a specific bead. Automatically detects and displays TLDR impact analysis if present.

⚠️ SCOPE GUARDRAIL: Compare modified files in task to impact analysis. Alert if scope appears to be expanding.`,
        args: {
          id: tool.schema.string(),
        },
        async execute({ id }) {
          const result = await beadsClient.show(id);

          if (!result) {
            return JSON.stringify(
              { success: false, error: 'Bead not found' },
              null,
              2,
            );
          }

          const impactContext = await getBeadImpactFromNotes(id);

          if (impactContext) {
            const scope = extractScopeFromDescription(result);
            const validation = validateScopeAgainstImpact(scope, {
              success: true,
              impact: impactContext.impact,
            });

            const enhancedResult = {
              ...JSON.parse(result),
              tldrImpact: impactContext,
              impactDisplay: formatImpactForDisplay(impactContext),
              scopeValidation: validation,
            };

            return JSON.stringify(enhancedResult, null, 2);
          }

          return result;
        },
      }),

      beads_create: tool({
        description: `Create a new bead. Optionally run TLDR impact analysis on files mentioned in description.

⚠️ SCOPE GUARDRAIL: If autoImpact=true and files are detected in description, TLDR impact will be analyzed and stored in task context.
If impact exceeds scope, STOP work and create new task.`,
        args: {
          options: tool.schema.string(),
        },
        async execute({ options }) {
          let parsedOptions;
          try {
            parsedOptions = JSON.parse(options);
          } catch {
            return JSON.stringify(
              { success: false, error: 'Invalid JSON options' },
              null,
              2,
            );
          }

          const autoImpact = parsedOptions.autoImpact === true;

          const { options: enhancedOptions, impactContext } =
            await enhanceBeadCreateWithTLDR({
              ...parsedOptions,
              autoImpact,
            });

          const result = await beadsClient.create(enhancedOptions);

          if (result && impactContext) {
            return JSON.stringify(
              {
                success: true,
                beadId: result,
                impactAnalysis: impactContext,
                scopeGuardrail:
                  'TLDR output is informational, not permissive. If scope exceeds impact, create new task.',
              },
              null,
              2,
            );
          }

          return JSON.stringify({ success: true, beadId: result }, null, 2);
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
        description:
          'Get AI-powered task triage recommendations with parallel execution analysis',
        args: {},
        async execute() {
          const [triageResult, planResult, orphanResult] = await Promise.all([
            bvClient.triage(),
            bvClient.plan(),
            bvClient.orphans(),
          ]);

          if (!triageResult) {
            return JSON.stringify(
              { success: false, error: 'Failed to get triage' },
              null,
              2,
            );
          }

          const recommendations = triageResult?.triage?.recommendations || [];

          if (recommendations.length === 0) {
            return JSON.stringify(
              { ...triageResult, parallel_analysis: { status: 'no_tasks' } },
              null,
              2,
            );
          }

          const parallelCandidates = [];
          const sequentialRequirements = [];

          const tracks = planResult?.plan?.tracks || [];
          const hasOrphans =
            orphanResult &&
            orphanResult.orphans &&
            orphanResult.orphans.length > 0;

          if (tracks.length > 0) {
            for (const track of tracks) {
              if (track.items && track.items.length > 1) {
                const trackItems = track.items.map((item) => ({
                  id: item.id,
                  title: item.title,
                }));
                sequentialRequirements.push({
                  track_id: track.track_id,
                  items: trackItems,
                  reason: `Tasks in same track must execute sequentially`,
                });
              }
            }

            for (let i = 0; i < tracks.length; i++) {
              for (let j = i + 1; j < tracks.length; j++) {
                const trackA = tracks[i];
                const trackB = tracks[j];
                parallelCandidates.push({
                  tracks: [trackA.track_id, trackB.track_id],
                  items: [
                    trackA.items.map((item) => item.id),
                    trackB.items.map((item) => item.id),
                  ],
                  reason: `Different tracks can execute in parallel`,
                });
              }
            }
          }

          const blockedCount =
            triageResult?.triage?.quick_ref?.blocked_count || 0;
          const blockedTasks = recommendations.filter(
            (r) => r.status === 'blocked' || r.unblocks > 0,
          );

          for (const rec of recommendations.slice(0, 10)) {
            if (
              rec.status === 'blocked' ||
              (rec.unblocks && rec.unblocks > 0)
            ) {
              sequentialRequirements.push({
                id: rec.id,
                title: rec.title,
                reason:
                  rec.status === 'blocked'
                    ? 'Task is blocked'
                    : 'Task blocks other work',
              });
            }
          }

          let executionStrategy = 'parallel';
          if (blockedTasks.length > 3) {
            executionStrategy = 'hybrid';
          } else if (
            blockedTasks.length > blockedCount * 0.5 &&
            blockedCount > 5
          ) {
            executionStrategy = 'sequential';
          } else if (hasOrphans) {
            executionStrategy = 'parallel_with_orphan_review';
          }

          const rationaleMap = {
            parallel:
              'Multiple independent task tracks identified - safe for parallel execution',
            hybrid:
              'Blocked tasks detected - mix of parallel and sequential execution recommended',
            sequential:
              'Many blocked/blocking tasks - execute tasks in dependency order',
            parallel_with_orphan_review:
              'Parallel execution possible but orphan commits need review',
          };

          const parallelAnalysis = {
            parallel_candidates: parallelCandidates.slice(0, 10),
            sequential_requirements: sequentialRequirements.slice(0, 10),
            conflict_risk: {
              overall_probability:
                blockedTasks.length / Math.max(recommendations.length, 1),
              tracks_parallel: tracks.length,
              tasks_with_blockers: blockedTasks.length,
              blocked_count: blockedCount,
              high_risk_pairs: blockedTasks.filter(
                (t) => t.status === 'blocked',
              ).length,
              details: blockedTasks.slice(0, 10).map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                unblocks: t.unblocks || 0,
              })),
            },
            execution_strategy: {
              recommended: executionStrategy,
              rationale:
                rationaleMap[executionStrategy] || 'Default parallel execution',
              parallel_track_count: tracks.length,
              sequential_track_count: sequentialRequirements.length,
              has_orphans: hasOrphans,
              total_actionable:
                triageResult?.triage?.quick_ref?.actionable_count || 0,
            },
            orphans_detected: hasOrphans,
            summary: {
              total_tracks: tracks.length,
              parallel_opportunities: parallelCandidates.length,
              sequential_requirements: sequentialRequirements.length,
              blocked_tasks: blockedTasks.length,
            },
          };

          return JSON.stringify(
            { ...triageResult, parallel_analysis: parallelAnalysis },
            null,
            2,
          );
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

      tldr_impact: tool({
        description: `Analyze impact of code changes using TLDR. Use this when creating tasks to understand scope.

⚠️ SCOPE GUARDRAIL: This tool reveals dependencies but does NOT authorize scope expansion.
If impact analysis shows more affected code than your task scope:
1. STOP work
2. Create new Beads task with findings
3. Wait for task approval before proceeding

TLDR output is informational, not permissive.`,
        args: {
          filePath: tool.schema.string(),
          depth: tool.schema.optional(tool.schema.number()),
        },
        async execute({ filePath, depth = 2 }) {
          try {
            const impact = await tldrClient.getImpact(filePath, { depth });
            if (impact && !impact.error) {
              return JSON.stringify({ success: true, impact }, null, 2);
            }
            return JSON.stringify(
              {
                success: false,
                error: impact?.error || 'Failed to get impact',
              },
              null,
              2,
            );
          } catch (error) {
            return JSON.stringify(
              { success: false, error: error.message },
              null,
              2,
            );
          }
        },
      }),

      tldr_callgraph: tool({
        description: `Get call graph for a function using TLDR. Shows who calls it and what it calls.

⚠️ SCOPE GUARDRAIL: This tool reveals dependencies but does NOT authorize scope expansion.
If call graph shows more affected code than your task scope:
1. STOP work
2. Create new Beads task with findings
3. Wait for task approval before proceeding

TLDR output is informational, not permissive.`,
        args: {
          functionName: tool.schema.string(),
          depth: tool.schema.optional(tool.schema.number()),
          direction: tool.schema.optional(
            tool.schema.enum(['callers', 'callees', 'both']),
          ),
        },
        async execute({ functionName, depth = 2, direction = 'both' }) {
          try {
            const graph = await tldrClient.getCallGraph(functionName, {
              depth,
              direction,
            });
            if (graph && !graph.error) {
              return JSON.stringify(
                { success: true, callGraph: graph },
                null,
                2,
              );
            }
            return JSON.stringify(
              {
                success: false,
                error: graph?.error || 'Failed to get call graph',
              },
              null,
              2,
            );
          } catch (error) {
            return JSON.stringify(
              { success: false, error: error.message },
              null,
              2,
            );
          }
        },
      }),

      tldr_context: tool({
        description: `Extract structured code context (AST, functions, imports) using TLDR.

⚠️ SCOPE GUARDRAIL: This tool reveals dependencies but does NOT authorize scope expansion.
If context shows more affected code than your task scope:
1. STOP work
2. Create new Beads task with findings
3. Wait for task approval before proceeding

TLDR output is informational, not permissive.`,
        args: {
          filePath: tool.schema.string(),
          depth: tool.schema.optional(tool.schema.number()),
          maxTokens: tool.schema.optional(tool.schema.number()),
        },
        async execute({ filePath, depth = 2, maxTokens = 1000 }) {
          try {
            const context = await tldrClient.getContext(filePath, {
              depth,
              maxTokens,
            });
            if (context && !context.error) {
              return JSON.stringify({ success: true, context }, null, 2);
            }
            return JSON.stringify(
              {
                success: false,
                error: context?.error || 'Failed to get context',
              },
              null,
              2,
            );
          } catch (error) {
            return JSON.stringify(
              { success: false, error: error.message },
              null,
              2,
            );
          }
        },
      }),

      tldr_change_impact: tool({
        description: `Analyze which tests to run based on changed files using TLDR.
Use this to determine selective testing scope.

Input: Comma-separated list of changed files
Output: Recommended tests to run

⚠️ SCOPE GUARDRAIL: This tool reveals test dependencies but does NOT authorize scope expansion.
If impact shows more affected tests than expected:
1. STOP work
2. Create new Beads task with findings
3. Wait for task approval before proceeding

TLDR output is informational, not permissive.`,
        args: {
          changedFiles: tool.schema.string(),
        },
        async execute({ changedFiles }) {
          try {
            const files = changedFiles.split(',').map((f) => f.trim());
            const impacts = await Promise.all(
              files.map((f) => tldrClient.getImpact(f, { depth: 3 })),
            );

            const allTests = new Set();
            const allModules = new Set();

            impacts.forEach((impact) => {
              if (impact?.impact) {
                if (impact.impact.tests) {
                  impact.impact.tests.forEach((t) => {
                    allTests.add(t);
                  });
                }
                if (impact.impact.modules) {
                  impact.impact.modules.forEach((m) => {
                    allModules.add(m);
                  });
                }
              }
            });

            return JSON.stringify(
              {
                success: true,
                recommendedTests: Array.from(allTests),
                affectedModules: Array.from(allModules),
                summary: `${files.length} files analyzed, ${allTests.size} tests potentially affected`,
              },
              null,
              2,
            );
          } catch (error) {
            return JSON.stringify(
              { success: false, error: error.message },
              null,
              2,
            );
          }
        },
      }),
    },
  };
};
