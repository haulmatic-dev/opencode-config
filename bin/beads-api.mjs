#!/usr/bin/env node
import { BeadsClient, BeadsViewerClient } from '../lib/beads-client.mjs';

const beadsClient = new BeadsClient();
const bvClient = new BeadsViewerClient();

const commands = {
  // BeadsClient methods
  ready: async () => {
    const result = await beadsClient.ready();
    console.log(JSON.stringify(result, null, 2));
  },

  show: async () => {
    const id = process.argv[3];
    const result = await beadsClient.show(id);
    console.log(result);
  },

  update: async () => {
    const id = process.argv[3];
    const options = JSON.parse(process.argv[4] || '{}');
    const result = await beadsClient.update(id, options);
    console.log(result);
  },

  close: async () => {
    const id = process.argv[3];
    const reason = process.argv[4] || 'Completed';
    const result = await beadsClient.close(id, reason);
    console.log(result);
  },

  sync: async () => {
    const result = await beadsClient.sync();
    console.log(result);
  },

  delete: async () => {
    const ids = process.argv[3].split(',');
    const options = JSON.parse(process.argv[4] || '{}');
    const result = await beadsClient.delete(ids, options);
    console.log(result);
  },

  create: async () => {
    const options = JSON.parse(process.argv[3]);
    const result = await beadsClient.create(options);
    console.log(result);
  },

  edit: async () => {
    const id = process.argv[3];
    const field = process.argv[4] || 'description';
    const result = await beadsClient.edit(id, field);
    console.log(result);
  },

  search: async () => {
    const query = process.argv[3];
    const filters = JSON.parse(process.argv[4] || '{}');
    const result = await beadsClient.search(query, filters);
    console.log(result);
  },

  list: async () => {
    const filters = JSON.parse(process.argv[3] || '{}');
    const result = await beadsClient.list(filters);
    console.log(JSON.stringify(result, null, 2));
  },

  reopen: async () => {
    const ids = process.argv[3].split(',');
    const reason = process.argv[4] || '';
    const result = await beadsClient.reopen(ids, reason);
    console.log(result);
  },

  duplicate: async () => {
    const id = process.argv[3];
    const canonicalId = process.argv[4];
    const result = await beadsClient.duplicate(id, canonicalId);
    console.log(result);
  },

  defer: async () => {
    const ids = process.argv[3].split(',');
    const until = process.argv[4];
    const result = await beadsClient.defer(ids, until);
    console.log(result);
  },

  undefer: async () => {
    const ids = process.argv[3].split(',');
    const result = await beadsClient.undefer(ids);
    console.log(result);
  },

  supersede: async () => {
    const id = process.argv[3];
    const successorId = process.argv[4];
    const result = await beadsClient.supersede(id, successorId);
    console.log(result);
  },

  addComment: async () => {
    const id = process.argv[3];
    const comment = process.argv[4];
    const result = await beadsClient.addComment(id, comment);
    console.log(result);
  },

  addLabel: async () => {
    const ids = process.argv[3].split(',');
    const labels = process.argv[4].split(',');
    const result = await beadsClient.addLabel(ids, labels);
    console.log(result);
  },

  removeLabel: async () => {
    const ids = process.argv[3].split(',');
    const labels = process.argv[4].split(',');
    const result = await beadsClient.removeLabel(ids, labels);
    console.log(result);
  },

  depAdd: async () => {
    const blockedId = process.argv[3];
    const blockerId = process.argv[4];
    const type = process.argv[5] || 'blocks';
    const result = await beadsClient.depAdd(blockedId, blockerId, type);
    console.log(result);
  },

  depRemove: async () => {
    const blockedId = process.argv[3];
    const blockerId = process.argv[4];
    const result = await beadsClient.depRemove(blockedId, blockerId);
    console.log(result);
  },

  depList: async () => {
    const id = process.argv[3];
    const direction = process.argv[4] || 'dependents';
    const result = await beadsClient.depList(id, direction);
    console.log(result);
  },

  depTree: async () => {
    const id = process.argv[3];
    const result = await beadsClient.depTree(id);
    console.log(result);
  },

  depCycles: async () => {
    const result = await beadsClient.depCycles();
    console.log(result);
  },

  stale: async () => {
    const options = JSON.parse(process.argv[3] || '{}');
    const result = await beadsClient.stale(options);
    console.log(result);
  },

  count: async () => {
    const filters = JSON.parse(process.argv[3] || '{}');
    const result = await beadsClient.count(filters);
    console.log(result);
  },

  status: async () => {
    const result = await beadsClient.status();
    console.log(result);
  },

  // BeadsViewerClient methods
  bvTriage: async () => {
    const result = await bvClient.triage();
    console.log(JSON.stringify(result, null, 2));
  },

  bvPlan: async () => {
    const options = JSON.parse(process.argv[3] || '{}');
    const result = await bvClient.plan(options);
    console.log(JSON.stringify(result, null, 2));
  },

  bvInsights: async () => {
    const options = JSON.parse(process.argv[3] || '{}');
    const result = await bvClient.insights(options);
    console.log(JSON.stringify(result, null, 2));
  },

  bvAlerts: async () => {
    const result = await bvClient.alerts();
    console.log(JSON.stringify(result, null, 2));
  },

  bvHistory: async () => {
    const result = await bvClient.history();
    console.log(JSON.stringify(result, null, 2));
  },

  bvLabelHealth: async () => {
    const result = await bvClient.labelHealth();
    console.log(JSON.stringify(result, null, 2));
  },

  bvNext: async () => {
    const result = await bvClient.next();
    console.log(JSON.stringify(result, null, 2));
  },

  bvCapacity: async () => {
    const options = JSON.parse(process.argv[3] || '{}');
    const result = await bvClient.capacity(options);
    console.log(JSON.stringify(result, null, 2));
  },

  bvDrift: async () => {
    const options = JSON.parse(process.argv[3] || '{}');
    const result = await bvClient.drift(options);
    console.log(JSON.stringify(result, null, 2));
  },

  bvSearch: async () => {
    const query = process.argv[3];
    const options = JSON.parse(process.argv[4] || '{}');
    const result = await bvClient.search(query, options);
    console.log(JSON.stringify(result, null, 2));
  },

  bvFileBeads: async () => {
    const filePath = process.argv[3];
    const result = await bvClient.fileBeads(filePath);
    console.log(JSON.stringify(result, null, 2));
  },

  bvFileHotspots: async () => {
    const result = await bvClient.fileHotspots();
    console.log(JSON.stringify(result, null, 2));
  },

  bvFileRelations: async () => {
    const filePath = process.argv[3];
    const result = await bvClient.fileRelations(filePath);
    console.log(JSON.stringify(result, null, 2));
  },

  bvImpact: async () => {
    const filePaths = process.argv[3];
    const result = await bvClient.impact(filePaths);
    console.log(JSON.stringify(result, null, 2));
  },

  bvImpactNetwork: async () => {
    const beadId = process.argv[3] || '';
    const result = await bvClient.impactNetwork(beadId);
    console.log(JSON.stringify(result, null, 2));
  },

  bvRelated: async () => {
    const beadId = process.argv[3];
    const result = await bvClient.related(beadId);
    console.log(JSON.stringify(result, null, 2));
  },

  bvCausality: async () => {
    const beadId = process.argv[3];
    const result = await bvClient.causality(beadId);
    console.log(JSON.stringify(result, null, 2));
  },

  bvBlockerChain: async () => {
    const beadId = process.argv[3];
    const result = await bvClient.blockerChain(beadId);
    console.log(JSON.stringify(result, null, 2));
  },

  bvCorrelationStats: async () => {
    const result = await bvClient.correlationStats();
    console.log(JSON.stringify(result, null, 2));
  },

  bvConfirmCorrelation: async () => {
    const sha = process.argv[3];
    const beadId = process.argv[4];
    const result = await bvClient.confirmCorrelation(sha, beadId);
    console.log(result);
  },

  bvRejectCorrelation: async () => {
    const sha = process.argv[3];
    const beadId = process.argv[4];
    const result = await bvClient.rejectCorrelation(sha, beadId);
    console.log(result);
  },

  bvExplainCorrelation: async () => {
    const sha = process.argv[3];
    const beadId = process.argv[4];
    const result = await bvClient.explainCorrelation(sha, beadId);
    console.log(JSON.stringify(result, null, 2));
  },

  bvOrphans: async () => {
    const result = await bvClient.orphans();
    console.log(JSON.stringify(result, null, 2));
  },

  bvSprintList: async () => {
    const result = await bvClient.sprintList();
    console.log(JSON.stringify(result, null, 2));
  },

  bvSprintShow: async () => {
    const sprintId = process.argv[3];
    const result = await bvClient.sprintShow(sprintId);
    console.log(JSON.stringify(result, null, 2));
  },

  bvRecipes: async () => {
    const result = await bvClient.recipes();
    console.log(JSON.stringify(result, null, 2));
  },

  bvCheckDrift: async () => {
    const result = await bvClient.checkDrift();
    console.log(JSON.stringify(result, null, 2));
  },

  bvSaveBaseline: async () => {
    const description = process.argv[3] || '';
    const result = await bvClient.saveBaseline(description);
    console.log(result);
  },

  bvExportMd: async () => {
    const outputPath = process.argv[3];
    const result = await bvClient.exportMd(outputPath);
    console.log(result);
  },

  bvExportGraph: async () => {
    const outputPath = process.argv[3];
    const format = process.argv[4] || 'dot';
    const result = await bvClient.exportGraph(outputPath, format);
    console.log(result);
  },
};

const method = process.argv[2];

if (commands[method]) {
  commands[method]();
} else {
  console.error('Unknown method:', method);
  console.error('Available methods:', Object.keys(commands).join(', '));
  process.exit(1);
}
