# opencode Test Suite

This directory contains integration tests for the opencode workflow runner framework.

## Integration Tests (`tests/integration/`)

These tests validate the actual implementation of the runner components against real Beads tasks.

### Running Tests

```bash
# Run all integration tests
npm test

# Run specific test suites
npm run test:workflow       # Complete workflow execution
npm run test:handoff        # Handoff between agents
npm run test:gates          # Gate failures and retry loops

# Run standalone integration tests
npm run test:guardrails     # Guardrails enforcement
npm run test:handoff-runner # Handoff runner implementation
```

### Test Files

- `test-workflow-execution.mjs` - Tests complete workflow from planning through completion
- `test-handoff-agents.mjs` - Tests agent spawning and state transitions
- `test-gates-retry.mjs` - Tests quality gates and retry logic

### Component Tests (`tests/components/sections-1-5/`)

Tests for individual components of the runner system.

```bash
npm run test:components
```

### Unit Tests (`tests/unit/`)

Unit tests for utilities and helper functions.

```bash
npm run test:unit
```

## Test Coverage

### Workflow Execution Tests

- ✅ Workflow structure validation
- ✅ State transitions
- ✅ Agent assignment verification
- ✅ Guardrails integration
- ✅ Quality gates availability
- ✅ Agent spawning and monitoring

### Handoff Between Agents Tests

- ✅ Agent assignment by state
- ✅ Next state determination (pass/fail gates)
- ✅ Agent spawning for different agent types
- ✅ Handoff iteration loop

### Gate Failures and Retry Loops Tests

- ✅ Individual gate functions (TDD, lint, mutation)
- ✅ Multiple gates execution
- ✅ Gate failure handling
- ✅ Guardrail exception handling
- ✅ Workflow retry budgets

## Running with a Specific Task

All integration tests accept an optional task ID parameter:

```bash
node tests/integration/test-workflow-execution.mjs opencode-abc123
node tests/integration/test-handoff-agents.mjs opencode-abc123
```

If no task ID is provided, tests use a default test task ID.

## Current Test Status

All integration tests are passing and validate against actual implementations in `lib/runner/`:

- ✅ Guardrails enforcement (`lib/runner/guardrails.js`)
- ✅ Handoff and relay (`lib/runner/handoff.js`)
- ✅ Quality gates (`lib/runner/gates.js`)
- ✅ Workflow definition (`lib/workflows/feature-dev.js`)
- ✅ Beads client integration (`lib/beads-client.mjs`)

## Notes

- Tests use actual Beads task management via the Beads client
- Agent spawning is tested but agents themselves are not implemented
- Some tests expect timeouts or specific Beads states
- Full end-to-end workflow execution requires agent implementations
