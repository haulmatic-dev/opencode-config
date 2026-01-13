#!/usr/bin/env node
import { BeadsClient, BeadsViewerClient } from '../lib/beads-client.mjs';

const beadsClient = new BeadsClient();
const bvClient = new BeadsViewerClient();

const COMMANDS = {
  ready: { client: 'bd', method: 'ready', json: true },
  show: { client: 'bd', method: 'show', args: ['id'] },
  update: {
    client: 'bd',
    method: 'update',
    args: ['id', 'options'],
    json: ['options'],
  },
  close: { client: 'bd', method: 'close', args: ['id', 'reason'] },
  sync: { client: 'bd', method: 'sync' },
  delete: {
    client: 'bd',
    method: 'delete',
    args: ['ids', 'options'],
    comma: ['ids'],
    json: ['options'],
  },
  create: {
    client: 'bd',
    method: 'create',
    args: ['options'],
    json: ['options'],
  },
  edit: { client: 'bd', method: 'edit', args: ['id', 'field'] },
  search: {
    client: 'bd',
    method: 'search',
    args: ['query', 'filters'],
    json: ['filters'],
  },
  list: {
    client: 'bd',
    method: 'list',
    args: ['filters'],
    json: ['filters'],
    jsonOut: true,
  },
  reopen: {
    client: 'bd',
    method: 'reopen',
    args: ['ids', 'reason'],
    comma: ['ids'],
  },
  duplicate: { client: 'bd', method: 'duplicate', args: ['id', 'canonicalId'] },
  defer: {
    client: 'bd',
    method: 'defer',
    args: ['ids', 'until'],
    comma: ['ids'],
  },
  undefer: { client: 'bd', method: 'undefer', args: ['ids'], comma: ['ids'] },
  supersede: { client: 'bd', method: 'supersede', args: ['id', 'successorId'] },
  addComment: { client: 'bd', method: 'addComment', args: ['id', 'comment'] },
  addLabel: {
    client: 'bd',
    method: 'addLabel',
    args: ['ids', 'labels'],
    comma: ['ids', 'labels'],
  },
  removeLabel: {
    client: 'bd',
    method: 'removeLabel',
    args: ['ids', 'labels'],
    comma: ['ids', 'labels'],
  },
  depAdd: {
    client: 'bd',
    method: 'depAdd',
    args: ['blockedId', 'blockerId', 'type'],
  },
  depRemove: {
    client: 'bd',
    method: 'depRemove',
    args: ['blockedId', 'blockerId'],
  },
  depList: {
    client: 'bd',
    method: 'depList',
    args: ['id'],
    optionalArgs: ['direction'],
    flagify: { direction: '--direction' },
  },
  depTree: { client: 'bd', method: 'depTree', args: ['id'] },
  depCycles: { client: 'bd', method: 'depCycles' },
  stale: {
    client: 'bd',
    method: 'stale',
    args: ['options'],
    json: ['options'],
  },
  count: {
    client: 'bd',
    method: 'count',
    args: ['filters'],
    json: ['filters'],
  },
  status: { client: 'bd', method: 'status' },
  bvTriage: { client: 'bv', method: 'triage', json: true },
  bvPlan: {
    client: 'bv',
    method: 'plan',
    args: ['options'],
    json: ['options'],
    jsonOut: true,
  },
  bvInsights: {
    client: 'bv',
    method: 'insights',
    args: ['options'],
    json: ['options'],
    jsonOut: true,
  },
  bvAlerts: { client: 'bv', method: 'alerts', json: true },
  bvHistory: { client: 'bv', method: 'history', json: true },
  bvLabelHealth: { client: 'bv', method: 'labelHealth', json: true },
  bvNext: { client: 'bv', method: 'next', json: true },
  bvCapacity: {
    client: 'bv',
    method: 'capacity',
    args: ['options'],
    json: ['options'],
    jsonOut: true,
  },
  bvDrift: {
    client: 'bv',
    method: 'drift',
    args: ['options'],
    json: ['options'],
    jsonOut: true,
  },
  bvSearch: {
    client: 'bv',
    method: 'search',
    args: ['query', 'options'],
    json: ['options'],
    jsonOut: true,
  },
  bvFileBeads: {
    client: 'bv',
    method: 'fileBeads',
    args: ['filePath'],
  },
  bvFileHotspots: { client: 'bv', method: 'fileHotspots', json: true },
  bvFileRelations: {
    client: 'bv',
    method: 'fileRelations',
    args: ['filePath'],
  },
  bvImpact: { client: 'bv', method: 'impact', args: ['filePaths'] },
  bvImpactNetwork: {
    client: 'bv',
    method: 'impactNetwork',
    args: ['beadId'],
  },
  bvRelated: { client: 'bv', method: 'related', args: ['beadId'] },
  bvCausality: { client: 'bv', method: 'causality', args: ['beadId'] },
  bvBlockerChain: {
    client: 'bv',
    method: 'blockerChain',
    args: ['beadId'],
  },
  bvCorrelationStats: { client: 'bv', method: 'correlationStats', json: true },
  bvConfirmCorrelation: {
    client: 'bv',
    method: 'confirmCorrelation',
    args: ['sha', 'beadId'],
  },
  bvRejectCorrelation: {
    client: 'bv',
    method: 'rejectCorrelation',
    args: ['sha', 'beadId'],
  },
  bvExplainCorrelation: {
    client: 'bv',
    method: 'explainCorrelation',
    args: ['sha', 'beadId'],
  },
  bvOrphans: { client: 'bv', method: 'orphans', json: true },
  bvSprintList: { client: 'bv', method: 'sprintList', json: true },
  bvSprintShow: { client: 'bv', method: 'sprintShow', args: ['sprintId'] },
  bvRecipes: { client: 'bv', method: 'recipes', json: true },
  bvCheckDrift: { client: 'bv', method: 'checkDrift', json: true },
  bvSaveBaseline: {
    client: 'bv',
    method: 'saveBaseline',
    args: ['description'],
  },
  bvExportMd: { client: 'bv', method: 'exportMd', args: ['outputPath'] },
  bvExportGraph: {
    client: 'bv',
    method: 'exportGraph',
    args: ['outputPath', 'format'],
  },
};

const method = process.argv[2];
const cmd = COMMANDS[method];

if (!cmd) {
  console.error('Unknown method:', method);
  console.error('Available methods:', Object.keys(COMMANDS).join(', '));
  process.exit(1);
}

const client = cmd.client === 'bd' ? beadsClient : bvClient;
const methodName = cmd.method;

const parseArg = (arg, index) => {
  const raw = process.argv[3 + index];
  if (cmd.json?.includes(arg)) {
    return raw ? JSON.parse(raw) : {};
  }
  if (cmd.comma?.includes(arg)) {
    return raw ? raw.split(',') : [];
  }
  return raw;
};

const buildArgs = () => {
  if (!cmd.args) return [];

  const parsed = cmd.args.map((arg, i) => parseArg(arg, i));

  if (cmd.flagify) {
    const result = [];
    cmd.args.forEach((arg, i) => {
      const value = parsed[i];
      if (cmd.flagify[arg] && value) {
        result.push(cmd.flagify[arg], value);
      } else if (!cmd.flagify[arg]) {
        result.push(value);
      }
    });
    return result;
  }

  if (cmd.optionalArgs) {
    const result = parsed.slice(0, cmd.args.length);
    cmd.optionalArgs.forEach((arg, i) => {
      const value = parseArg(arg, cmd.args.length + i);
      if (cmd.flagify?.[arg] && value) {
        result.push(cmd.flagify[arg], value);
      } else if (value) {
        result.push(value);
      }
    });
    return result;
  }

  return parsed;
};

const args = cmd.args ? buildArgs() : [];

(async () => {
  const result = await client[methodName](...args);
  console.log(
    cmd.json || cmd.jsonOut ? JSON.stringify(result, null, 2) : result,
  );
})();
