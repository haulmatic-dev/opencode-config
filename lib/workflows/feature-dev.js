export const workflow = {
  start: 'planning',
  transitions: {
    planning: {
      onSuccess: 'coding',
      onFail: 'human_escalation',
      gates: [],
      config: {
        agent: 'prd-agent',
        model: 'claude-opus',
        timeout: 600000,
      },
    },
    coding: {
      onSuccess: 'testing',
      onFail: 'coding_fix_loop',
      gates: ['lint', 'compile'],
      config: {
        agent: 'implementation-specialist',
        model: 'gpt-4',
        timeout: 1200000,
      },
    },
    testing: {
      onSuccess: 'security_audit',
      onFail: 'coding_fix_loop',
      gates: ['tdd', 'coverage'],
      config: {
        agent: 'testing-specialist',
        model: 'gpt-4',
        timeout: 600000,
      },
    },
    coding_fix_loop: {
      onSuccess: 'testing',
      onFail: 'human_escalation',
      gates: [],
      config: {
        agent: 'fixing-specialist',
        model: 'claude-opus',
        maxRetries: 3,
      },
    },
    security_audit: {
      onSuccess: 'complete',
      onFail: 'security_fix_loop',
      gates: ['ubs', 'security-scan'],
      config: {
        agent: 'security-specialist',
        timeout: 900000,
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
      security: 1,
      lint: 3,
      compile: 2,
      test: 3,
      tdd: 3,
    },
    guardrails: {
      enabled: true,
    },
  },
};
