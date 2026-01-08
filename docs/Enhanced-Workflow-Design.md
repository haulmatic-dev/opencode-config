# Enhanced Iterative Development Workflow Design

**Version:** 1.0
**Date:** January 8, 2026
**Status:** Design Document
**Related Beads Tasks:** opencode-h2t, opencode-8tx, opencode-kx9, opencode-g4a, opencode-k4w

---

## Executive Summary

This document outlines an enhanced iterative development workflow that extends the original 4-stage model with industry best practices, comprehensive quality gates, automatic failure handling, and continuous learning. The workflow leverages existing opencode agents and tools while adding minimal new infrastructure.

**Key Improvements:**
- **6 enhanced stages** (up from 4) with specific quality gates
- **Automatic task creation** for failures and review feedback
- **CI/CD integration** for automated testing and deployment
- **Metrics collection** for continuous improvement
- **Cass memory integration** for learning from failures
- **93% automation** (vs ~70% in original design)

---

## 1. Enhanced Workflow Stages

### Stage 0: Discovery & Planning (NEW)

**Purpose:** Validate requirements, identify risks, and plan execution

**Execution:** `prd` agent + `generate-tasks` agent + `task-coordinator`

**Quality Gates:**
- ✅ PRD created with comprehensive specifications
- ✅ Figma designs extracted (if applicable)
- ✅ Atomic tasks generated (≤4hrs, ≤3 files)
- ✅ Dependency graph validated (no cycles)
- ✅ Risk assessment completed
- ✅ Tasks created in Beads with proper priorities

**Outputs:**
- `prd.json` - Comprehensive requirements document
- `figma-specification.json` - Design tokens (if applicable)
- `tasks.json` - Atomic task breakdown
- `risk-assessment.json` - Identified risks and mitigations

**Dependencies:** None (first stage)

**Success Criteria:**
```
{
  "prd_completeness": "100%",
  "task_count": "≥1",
  "max_task_size": "≤4 hours",
  "dependency_cycles": "0",
  "risks_identified": "≥0",
  "tasks_created_in_beads": true
}
```

**Failure Handling:**
- PRD incomplete → Create "Clarify Requirements" task
- Dependency cycles detected → Create "Resolve Dependency Cycle" task
- Task too large → Split into smaller atomic tasks

---

### Stage 1: Test Specification & Generation

**Purpose:** Generate comprehensive test specifications and test code

**Execution:** `test-specialist` agent (new specialized agent)

**Quality Gates:**
- ✅ Test specifications generated (unit + integration + E2E)
- ✅ Test code written for all acceptance criteria
- ✅ Test coverage ≥ 80% (measured after execution)
- ✅ Test fixtures and mocks created
- ✅ Test data setup implemented
- ✅ Test execution script created

**Outputs:**
- `test-specification.md` - Detailed test plan
- `tests/unit/*.test.js` - Unit test files
- `tests/integration/*.test.js` - Integration test files
- `tests/e2e/*.test.js` - E2E test files (Playwright/Cypress)
- `tests/fixtures/*.js` - Test fixtures
- `tests/mocks/*.js` - Test mocks
- `package.json` - Updated with test scripts

**Dependencies:** Stage 0 (Discovery & Planning)

**Success Criteria:**
```
{
  "test_specifications": "Complete",
  "unit_tests": "≥1",
  "integration_tests": "≥0",
  "e2e_tests": "≥1",
  "test_coverage_target": "≥80%",
  "test_execution_time": "< 60s"
}
```

**Failure Handling:**
- Cannot generate tests → Create "Refine Test Specifications" task
- Test coverage < 80% → Create "Increase Test Coverage" task (depends on Stage 1)
- Tests too slow → Create "Optimize Test Performance" task (depends on Stage 1)

---

### Stage 2: Code Implementation

**Purpose:** Implement feature according to test specifications

**Execution:** Specialist droids (up to 6 parallel)

**Quality Gates:**
- ✅ Implementation matches test specifications
- ✅ All imports and dependencies resolved
- ✅ Code follows project conventions
- ✅ Type safety enforced (TypeScript, mypy, etc.)
- ✅ No hardcoded secrets or values
- ✅ Error handling implemented

**Outputs:**
- Source code files (implementation)
- Updated documentation (README, API docs, etc.)
- Type definitions (if applicable)

**Dependencies:** Stage 1 (Test Specification & Generation)

**Success Criteria:**
```
{
  "all_tests_passing": false,
  "type_errors": "0",
  "import_errors": "0",
  "conformation_to_specifications": "100%",
  "error_handling": "Complete"
}
```

**Failure Handling:**
- Implementation incomplete → Create "Complete Implementation" task (depends on Stage 2)
- Type errors → Create "Fix Type Errors" task (depends on Stage 2)
- Missing error handling → Create "Add Error Handling" task (depends on Stage 2)

---

### Stage 3: Static Analysis & Security Scanning (NEW)

**Purpose:** Verify code quality, security, and compliance before runtime tests

**Execution:** `codebase-researcher` agent + CI/CD tools

**Quality Gates:**
- ✅ Linting passes (ESLint, Prettier, Black, etc.)
- ✅ No security vulnerabilities detected (Snyk, OWASP ZAP)
- ✅ Code complexity within limits (cyclomatic complexity ≤ 10)
- ✅ No duplicate code (> 3% duplication flagged)
- ✅ Dependencies updated and secure (npm audit, pip-audit)
- ✅ License compliance verified

**Outputs:**
- `lint-report.json` - Linting results
- `security-report.json` - Security scan results
- `complexity-report.json` - Code complexity analysis
- `dependency-report.json` - Dependency vulnerability report

**Dependencies:** Stage 2 (Code Implementation)

**Success Criteria:**
```
{
  "lint_errors": "0",
  "lint_warnings": "≤10",
  "security_vulnerabilities": "0",
  "critical_vulnerabilities": "0",
  "complexity_score": "≤10",
  "duplicate_code": "≤3%",
  "vulnerable_dependencies": "0"
}
```

**Failure Handling:**
- Lint errors → Create "Fix Lint Errors" task (depends on Stage 3)
- Security vulnerabilities → Create "Fix Security Vulnerabilities" task (P0, depends on Stage 3)
- Complexity too high → Create "Refactor Complex Code" task (depends on Stage 3)
- Duplicate code → Create "Extract Duplicate Code" task (depends on Stage 3)
- Vulnerable dependencies → Create "Update Dependencies" task (P1, depends on Stage 3)

---

### Stage 4: Test Execution & Validation

**Purpose:** Run all tests and verify implementation correctness

**Execution:** CI/CD pipeline + `test-specialist` agent

**Quality Gates:**
- ✅ Unit tests pass (100% pass rate)
- ✅ Integration tests pass (100% pass rate)
- ✅ E2E tests pass (100% pass rate)
- ✅ Test coverage ≥ 80%
- ✅ No flaky tests (≤ 1% flakiness rate)
- ✅ Performance benchmarks met

**Outputs:**
- `test-results.json` - Comprehensive test results
- `coverage-report.json` - Coverage analysis
- `performance-report.json` - Performance metrics
- `flaky-test-report.json` - Flaky test analysis

**Dependencies:** Stage 3 (Static Analysis & Security Scanning)

**Success Criteria:**
```
{
  "unit_test_pass_rate": "100%",
  "integration_test_pass_rate": "100%",
  "e2e_test_pass_rate": "100%",
  "test_coverage": "≥80%",
  "flaky_test_rate": "≤1%",
  "performance_regression": "No"
}
```

**Failure Handling (AUTOMATIC TASK CREATION):**

**Test Failure Pattern:**
```javascript
// Parse test output to extract failing tests
const failingTests = parseTestResults(testOutput);

// Create individual tasks for each failing test
failingTests.forEach(test => {
  bd.create({
    title: `Fix failing test: ${test.name}`,
    description: `Test failed in ${test.file}: ${test.error}`,
    type: 'bug',
    priority: determinePriority(test.error),
    depends_on: [currentStage4TaskId],
    metadata: {
      test_file: test.file,
      test_name: test.name,
      error_message: test.error,
      stack_trace: test.stack,
      failure_type: test.failureType
    }
  });
});
```

**Priority Determination:**
- **P0 (Critical)**: Security test failure, core functionality test failure
- **P1 (High)**: Integration test failure, E2E test failure
- **P2 (Medium)**: Unit test failure for edge case
- **P3 (Low)**: Performance test degradation

---

### Stage 5: Code Review & Validation (ENHANCED)

**Purpose:** Comprehensive code review with automated checks and human-in-the-loop

**Execution:** `code-reviewer` agent (new specialized agent) + CI/CD automation

**Quality Gates:**
- ✅ Automated review checks pass
- ✅ Design patterns followed
- ✅ Performance implications assessed
- ✅ Security implications verified
- ✅ Accessibility compliance (a11y)
- ✅ Documentation complete
- ✅ Code review comments addressed (if any)

**Automated Review Checks (CI/CD):**
- PR size ≤ 400 lines
- No TODO or FIXME comments
- No console.log or debugging statements
- All functions have JSDoc/Docstring
- API contracts documented
- Migration guide provided (if breaking change)

**Outputs:**
- `code-review-report.json` - Automated review results
- `performance-assessment.json` - Performance impact analysis
- `security-assessment.json` - Security implications
- `accessibility-report.json` - A11y compliance
- `documentation-checklist.json` - Documentation verification

**Dependencies:** Stage 4 (Test Execution & Validation)

**Success Criteria:**
```
{
  "automated_checks": "Pass",
  "pr_size": "≤400 lines",
  "todos_and_fixmes": "0",
  "debugging_statements": "0",
  "documentation_complete": true,
  "design_patterns_followed": true,
  "performance_impact": "Acceptable",
  "security_implications": "None",
  "accessibility_compliant": true
}
```

**Failure Handling (AUTOMATIC TASK CREATION):**

**Review Comment Pattern:**
```javascript
// Extract review comments
const reviewComments = parseReviewComments(reviewOutput);

// Group comments by type
const commentsByType = groupBy(reviewComments, 'type');

// Create tasks for each comment category
Object.entries(commentsByType).forEach(([type, comments]) => {
  const title = getTaskTitle(type);
  const description = formatComments(comments);
  const priority = getPriority(type);

  bd.create({
    title: title,
    description: description,
    type: 'improvement',
    priority: priority,
    depends_on: [currentStage5TaskId],
    metadata: {
      comment_type: type,
      comment_count: comments.length,
      comments: comments
    }
  });
});
```

**Task Title Mappings:**
- `bug` → "Fix Review Bugs"
- `style` → "Address Style Comments"
- `architecture` → "Refactor Architecture Issues"
- `performance` → "Optimize Performance Issues"
- `security` → "Fix Security Issues" (P0)
- `documentation` → "Add Missing Documentation"
- `accessibility` → "Fix Accessibility Issues" (P1)

---

### Stage 6: Deployment & Monitoring (NEW)

**Purpose:** Deploy to staging/production and monitor for issues

**Execution:** CI/CD pipeline + `deployment-specialist` agent (new)

**Quality Gates:**
- ✅ Staging deployment successful
- ✅ Smoke tests pass
- ✅ Health checks pass
- ✅ Monitoring and logging configured
- ✅ Error tracking configured
- ✅ Rollback plan tested
- ✅ Production deployment successful (if applicable)

**Outputs:**
- `deployment-report.json` - Deployment results
- `health-check-report.json` - Service health status
- `monitoring-config.json` - Monitoring configuration
- `rollback-plan.md` - Rollback procedures

**Dependencies:** Stage 5 (Code Review & Validation)

**Success Criteria:**
```
{
  "staging_deployment": "Success",
  "smoke_tests": "Pass",
  "health_checks": "Pass",
  "monitoring_configured": true,
  "error_tracking_configured": true,
  "rollback_plan_tested": true,
  "production_deployment": "Success"
}
```

**Failure Handling (AUTOMATIC TASK CREATION):**

**Deployment Failure Pattern:**
```javascript
// Deployment failed
if (deploymentResult.status === 'failed') {
  // Create rollback task
  bd.create({
    title: 'Rollback failed deployment',
    description: `Deployment failed: ${deploymentResult.error}`,
    type: 'incident',
    priority: 'P0',
    depends_on: [currentStage6TaskId],
    metadata: {
      deployment_error: deploymentResult.error,
      rollback_action: 'immediate'
    }
  });

  // Create investigation task
  bd.create({
    title: 'Investigate deployment failure',
    description: `Analyze logs and identify root cause of deployment failure`,
    type: 'bug',
    priority: 'P0',
    depends_on: [rollbackTaskId],
    metadata: {
      logs: deploymentResult.logs,
      error_trace: deploymentResult.errorTrace
    }
  });
}
```

---

## 2. Implementation Plan Summary

### Phase 1: Foundation (Week 1-2)
- Implement Stage 0 (Discovery & Planning) enhancements
- Implement Stage 1 (Test Specification) with test-specialist agent
- Enhance Stage 2 (Code Implementation) with quality checks
- Implement Stage 3 (Static Analysis & Security Scanning)
- Create GitHub Actions workflow for CI/CD
- Implement Stage 4 (Test Execution) automation
- Implement Stage 5 (Code Review) automation
- Implement Stage 6 (Deployment & Monitoring)

### Phase 2: Automated Failure Handling (Week 3-4)
- Implement test output parsing
- Implement review comment parsing
- Implement automated task creation for failures
- Implement priority determination logic
- Implement retry logic with exponential backoff
- Implement max retries exceeded handling
- Integrate with cass_memory

### Phase 3: Metrics & Monitoring (Week 5-6)
- Implement metrics collection system
- Set up Prometheus metrics endpoint
- Create Grafana dashboard
- Set up error tracking (Sentry)
- Implement health check endpoints
- Set up alerting (PagerDuty, Slack)

### Phase 4: Testing & Polish (Week 7-8)
- Create test scenarios for all stages
- Test automated task creation
- Test retry logic
- Test failure learning
- Test metrics collection
- Write documentation for new workflow
- Create troubleshooting guide
- Deploy to production

---

## 3. Success Metrics

### Quantitative Metrics

**Workflow Efficiency:**
- 3-5x faster task execution (parallelism)
- 93% automation (vs 70% originally)
- < 10% human intervention rate
- < 5 min feedback loop time (CI/CD)

**Quality Improvements:**
- 80%+ test coverage
- 0 critical security vulnerabilities
- < 1% flaky test rate
- < 5% bug escape rate to production

**Velocity Improvements:**
- 2-3x higher throughput (tasks/week)
- 50% shorter cycle time
- 80%+ task completion rate
- < 5% task abandonment rate
