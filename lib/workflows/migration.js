export const migrationWorkflow = {
  start: 'additive_schema',
  transitions: {
    additive_schema: {
      onSuccess: 'backfill_dryrun',
      onFail: 'human_escalation',
      gates: ['lint', 'compile'],
      config: {
        agent: 'migration-specialist',
        model: 'gpt-4',
        timeout: 600000,
        phase: 1,
        description: 'Additive Schema - Add nullable columns (Autonomous)',
        irreversible: false,
      },
    },
    backfill_dryrun: {
      onSuccess: 'execution',
      onFail: 'additive_schema',
      gates: ['tdd', 'validation'],
      config: {
        agent: 'migration-specialist',
        model: 'gpt-4',
        timeout: 900000,
        phase: 2,
        description:
          'Backfill Dry-Run - Validate logic without writes (Autonomous)',
        irreversible: false,
      },
    },
    execution: {
      onSuccess: 'constraint_enforcement',
      onFail: 'human_escalation',
      gates: ['manual_approval'],
      config: {
        agent: 'migration-specialist',
        model: 'claude-opus',
        timeout: 1200000,
        phase: 3,
        description: 'Execution - Actual data modification (BLOCKED)',
        irreversible: true,
        requiresHumanApproval: true,
      },
    },
    constraint_enforcement: {
      onSuccess: 'cleanup',
      onFail: 'human_escalation',
      gates: ['lint', 'database_validation'],
      config: {
        agent: 'migration-specialist',
        model: 'gpt-4',
        timeout: 600000,
        phase: 4,
        description:
          'Constraint Enforcement - Add NOT NULL/FKs post-exec (Autonomous)',
        irreversible: false,
      },
    },
    cleanup: {
      onSuccess: 'complete',
      onFail: 'human_escalation',
      gates: ['lint'],
      config: {
        agent: 'migration-specialist',
        model: 'gpt-4',
        timeout: 300000,
        phase: 5,
        description: 'Cleanup - Remove temp columns/data (Autonomous)',
        irreversible: false,
      },
    },
    complete: {
      onSuccess: null,
      onFail: null,
      gates: [],
    },
    human_escalation: {
      onSuccess: null,
      onFail: null,
      gates: [],
    },
  },
  global: {
    retryBudgets: {
      additive_schema: 2,
      backfill_dryrun: 2,
      execution: 0,
      constraint_enforcement: 2,
      cleanup: 1,
    },
    guardrails: {
      enabled: true,
    },
    strictTDD: true,
  },
};

export function getMigrationPhase(state) {
  const stateConfig = migrationWorkflow.transitions[state];
  return stateConfig?.config?.phase || null;
}

export function isIrreversiblePhase(state) {
  const stateConfig = migrationWorkflow.transitions[state];
  return stateConfig?.config?.irreversible === true;
}

export function requiresHumanApproval(state) {
  const stateConfig = migrationWorkflow.transitions[state];
  return stateConfig?.config?.requiresHumanApproval === true;
}

export function getPhaseDescription(state) {
  const stateConfig = migrationWorkflow.transitions[state];
  return stateConfig?.config?.description || state;
}
