# Atomic Task Implementation - Step-by-Step Dev Process

## Overview
Complete lifecycle of implementing a single atomic task from start to finish, following the 6-stage enhanced workflow.

## Stage 0: Discovery & Planning (15-30 min)

### Step 0.1: Get Context from cass_memory
```bash
cm context "implementing user authentication" --json
```

**Returns:**
- `relevantBullets` - Rules to follow (e.g., "Always write unit tests first")
- `antiPatterns` - Pitfalls to avoid (e.g., "Never store passwords in plain text")
- `historySnippets` - Similar past sessions with outcomes

**Action:** Include relevant rules in task prompt/implementation notes.

### Step 0.2: Review Requirements
**Input:**
- PRD document or task description
- Figma design specification (if applicable)
- Acceptance criteria

**Action:** Understand what needs to be built, success criteria, constraints.

### Step 0.3: Verify Task is Atomic
**Check:**
- Task size: ≤4 hours estimated
- File count: ≤3 files touched
- Dependencies: Clearly identified
- No circular dependencies

**Action:** If task too large, split into smaller tasks.

**Output:** Ready to start Stage 1.

---

## Stage 1: Test Specification & Generation (30-60 min)

### Step 1.1: Analyze Acceptance Criteria
**Input:** Feature requirements, Figma designs

**Action:** Break down requirements into testable scenarios.

**Example:**
```
Requirement: User can login with email and password

Test Scenarios:
1. Valid credentials → Login successful
2. Invalid email → Error message
3. Invalid password → Error message
4. Empty fields → Validation errors
5. Rate limiting → Throttle after 5 failed attempts
```

### Step 1.2: Generate Unit Tests
**Tool:** test-specialist agent or manual

**Create:** `tests/unit/auth.test.js`

```javascript
describe('User Authentication', () => {
  test('should login with valid credentials', async () => {
    const result = await login('user@example.com', 'password123');
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  test('should reject invalid email', async () => {
    const result = await login('invalid-email', 'password123');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  test('should reject invalid password', async () => {
    const result = await login('user@example.com', 'wrong-password');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });
});
```

### Step 1.3: Generate Integration Tests
**Create:** `tests/integration/auth-flow.test.js`

```javascript
describe('Authentication Flow', () => {
  test('should complete full login flow', async () => {
    // 1. User submits login form
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');

    // 2. Verify redirect to dashboard
    expect(page.url()).toContain('/dashboard');

    // 3. Verify token stored
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).toBeDefined();
  });
});
```

### Step 1.4: Generate E2E Tests
**Tool:** Playwright or Cypress

**Create:** `tests/e2e/login-e2e.test.js`

```javascript
test('User login E2E', async ({ page }) => {
  await page.goto('/login');
  
  // Fill and submit form
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('[type="submit"]');
  
  // Verify success
  await expect(page.locator('.dashboard')).toBeVisible();
});
```

### Step 1.5: Create Test Fixtures
**Create:** `tests/fixtures/auth-fixtures.js`

```javascript
module.exports = {
  validUser: {
    email: 'test@example.com',
    password: 'SecurePass123!'
  },
  invalidUser: {
    email: 'invalid-email',
    password: 'wrong-password'
  }
};
```

### Step 1.6: Create Test Mocks
**Create:** `tests/mocks/api-mocks.js`

```javascript
module.exports = {
  loginSuccess: {
    success: true,
    token: 'mock-jwt-token-123'
  },
  loginFailure: {
    success: false,
    error: 'Invalid credentials'
  }
};
```

### Step 1.7: Update package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage"
  }
}
```

**Output:**
- `test-specification.md` - Test plan document
- `tests/unit/*.test.js` - Unit tests
- `tests/integration/*.test.js` - Integration tests
- `tests/e2e/*.test.js` - E2E tests
- `tests/fixtures/*.js` - Test fixtures
- `tests/mocks/*.js` - Test mocks
- `package.json` - Updated test scripts

**Success Criteria:**
- ✅ All acceptance criteria have corresponding tests
- ✅ Test files created
- ✅ Fixtures and mocks created
- ✅ Test scripts added to package.json

---

## Stage 2: Code Implementation (60-120 min)

### Step 2.1: Create/Modify Source Files
**Tool:** Specialist droids or manual

**Create:** `src/auth/login.js`

```javascript
import { validateEmail, validatePassword } from './validators';
import { hashPassword } from './crypto';
import { generateToken } from './jwt';

export async function login(email, password) {
  // Validate inputs
  if (!validateEmail(email)) {
    return { success: false, error: 'Invalid email format' };
  }
  if (!validatePassword(password)) {
    return { success: false, error: 'Password too weak' };
  }

  // Check rate limiting
  const attempts = await getLoginAttempts(email);
  if (attempts >= 5) {
    return { success: false, error: 'Too many attempts, try again in 15 min' };
  }

  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    await recordFailedLoginAttempt(email);
    return { success: false, error: 'Invalid credentials' };
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    await recordFailedLoginAttempt(email);
    return { success: false, error: 'Invalid credentials' };
  }

  // Generate token
  const token = generateToken({ userId: user.id });

  // Reset login attempts
  await resetLoginAttempts(email);

  return { success: true, token, user: { id: user.id, email: user.email } };
}
```

### Step 2.2: Create Type Definitions (if TypeScript)
**Create:** `src/auth/types.ts`

```typescript
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: { id: string; email: string };
  error?: string;
}
```

### Step 2.3: Create Error Handling
**Create:** `src/auth/errors.js`

```javascript
export class AuthenticationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

export function handleAuthError(error) {
  if (error instanceof AuthenticationError) {
    return {
      status: 401,
      body: { error: error.message, code: error.code }
    };
  }
  throw error;
}
```

### Step 2.4: Add Dependencies to package.json
```json
{
  "dependencies": {
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0"
  }
}
```

### Step 2.5: Install Dependencies
```bash
npm install
```

**Output:**
- Source code files (implementation)
- Type definitions (if TypeScript)
- Error handling modules
- Updated package.json with dependencies

**Success Criteria:**
- ✅ Implementation matches test specifications
- ✅ All imports and dependencies resolved
- ✅ Code follows project conventions
- ✅ Type safety enforced (TypeScript, mypy, etc.)
- ✅ No hardcoded secrets or values
- ✅ Error handling implemented

---

## Stage 3: Static Analysis & Security Scanning (15-30 min)

### Step 3.1: Run Linter
```bash
npm run lint
```

**Expected:** 0 errors, ≤10 warnings

**Action:** Fix any lint errors.

### Step 3.2: Run Type Checker
```bash
npm run typecheck
```

**Expected:** 0 type errors

**Action:** Fix any type errors.

### Step 3.3: Run Formatter
```bash
npm run format
```

**Expected:** Code formatted consistently

### Step 3.4: Run Security Scan (Snyk)
```bash
npx snyk test
```

**Expected:** 0 vulnerabilities

**Action:** Update vulnerable dependencies or fix code issues.

### Step 3.5: Run Dependency Audit
```bash
npm audit
```

**Expected:** 0 critical vulnerabilities

**Action:** Update dependencies to fix vulnerabilities.

### Step 3.6: Check Code Complexity
```bash
npx complexity-report src/auth/login.js
```

**Expected:** Cyclomatic complexity ≤ 10

**Action:** Refactor if too complex.

**Output:**
- `lint-report.json` - Linting results
- `security-report.json` - Security scan results
- `complexity-report.json` - Code complexity analysis
- `dependency-report.json` - Dependency vulnerability report

**Success Criteria:**
- ✅ Linting passes (0 errors)
- ✅ No security vulnerabilities (0 critical)
- ✅ Code complexity ≤ 10
- ✅ Dependencies secure and updated

---

## Stage 4: Test Execution & Validation (15-30 min)

### Step 4.1: Run Unit Tests
```bash
npm run test:unit
```

**Expected:** 100% pass rate

**Action:** If tests fail, go to Step 4.6.

### Step 4.2: Run Integration Tests
```bash
npm run test:integration
```

**Expected:** 100% pass rate

**Action:** If tests fail, go to Step 4.6.

### Step 4.3: Run E2E Tests
```bash
npm run test:e2e
```

**Expected:** 100% pass rate

**Action:** If tests fail, go to Step 4.6.

### Step 4.4: Check Test Coverage
```bash
npm run test:coverage
```

**Expected:** ≥ 80% coverage

**Action:** If coverage < 80%, go to Step 4.6.

### Step 4.5: Check Performance Benchmarks
```bash
npm run test:performance
```

**Expected:** No regression from baseline

**Action:** If performance degraded, go to Step 4.6.

### Step 4.6: Fix Cycle (If Any Test Fails)

#### 4.6.1: Analyze Failure
```bash
# View detailed test output
npm run test:unit -- --verbose

# View coverage report
open coverage/index.html
```

**Action:** Identify root cause of failure.

#### 4.6.2: Fix Implementation
```bash
# Edit source files to fix the issue
vim src/auth/login.js
```

**Action:** Apply fix based on test failure.

#### 4.6.3: Re-run Tests
```bash
npm run test:unit
```

**Expected:** All tests now pass.

**Action:** Repeat 4.6.1 - 4.6.3 until all tests pass.

**Max Retries:** 3 iterations

**Output:**
- `test-results.json` - Comprehensive test results
- `coverage-report.json` - Coverage analysis
- `performance-report.json` - Performance metrics

**Success Criteria:**
- ✅ Unit tests pass (100%)
- ✅ Integration tests pass (100%)
- ✅ E2E tests pass (100%)
- ✅ Test coverage ≥ 80%
- ✅ No performance regression

---

## Stage 5: Code Review & Validation (15-30 min)

### Step 5.1: Run Automated Review Checks

#### 5.1.1: Check PR Size
```bash
git diff origin/main --shortstat
```

**Expected:** ≤ 400 lines changed

**Action:** If PR too large, split into smaller PRs.

#### 5.1.2: Check for TODO/FIXME
```bash
grep -r "TODO\|FIXME" src/
```

**Expected:** 0 occurrences

**Action:** Resolve or remove TODO/FIXME comments.

#### 5.1.3: Check for Debug Statements
```bash
grep -r "console.log\|debugger" src/
```

**Expected:** 0 occurrences

**Action:** Remove debug statements.

#### 5.1.4: Check Documentation
```bash
# Check all functions have JSDoc/Docstring
npx documentation src/auth/login.js
```

**Expected:** All functions documented

**Action:** Add missing documentation.

### Step 5.2: Run Code Review Agent
**Tool:** code-reviewer agent

**Input:**
- PR diff
- Test results
- Coverage report

**Output:** Automated review with categorized comments.

### Step 5.3: Address Review Comments (if any)

#### 5.3.1: Parse Review Comments
**Tool:** code-reviewer agent

**Categories:**
- `security` → "Fix Security Issues" (P0)
- `bug` → "Fix Review Bugs" (P0)
- `architecture` → "Refactor Architecture Issues" (P1)
- `performance` → "Optimize Performance Issues" (P1)
- `accessibility` → "Fix Accessibility Issues" (P1)
- `documentation` → "Add Missing Documentation" (P2)
- `style` → "Address Style Comments" (P3)

#### 5.3.2: Create Tasks for Each Category
```bash
# Example: If security issues found
bd create \
  --title="Fix Security Issues" \
  --description="Code review found security vulnerabilities:\n\n1. SQL injection risk in login function\n2. Missing rate limiting" \
  --type=bug \
  --priority=0 \
  --depends_on=[currentTaskId]
```

#### 5.3.3: Fix Issues
```bash
# Edit source files to address comments
vim src/auth/login.js
```

**Action:** Apply fixes based on review comments.

#### 5.3.4: Re-run Tests
```bash
npm run test
npm run lint
```

**Expected:** All checks still pass after fixes.

**Output:**
- `code-review-report.json` - Automated review results
- `performance-assessment.json` - Performance impact analysis
- `security-assessment.json` - Security implications
- `accessibility-report.json` - A11y compliance
- `documentation-checklist.json` - Documentation verification

**Success Criteria:**
- ✅ Automated review checks pass
- ✅ Design patterns followed
- ✅ Performance implications assessed
- ✅ Security implications verified
- ✅ Documentation complete
- ✅ All review comments addressed (if any)

---

## Stage 6: Deployment & Monitoring (15-30 min)

### Step 6.1: Commit Changes
```bash
git add .
git commit -m "Implement user authentication

- Add login function with email/password validation
- Add rate limiting (5 failed attempts)
- Add JWT token generation
- Add error handling
- Add unit tests (100% coverage)
- Add integration tests
- Add E2E tests

Tests: Unit 12/12 ✓, Integration 3/3 ✓, E2E 2/2 ✓
Coverage: 85%
Security: 0 vulnerabilities"
```

### Step 6.2: Run Pre-commit Hooks (Automatic)
**Trigger:** `git commit`

**What runs automatically:**
1. ESLint on staged files
2. Prettier formatting
3. TypeScript type checking
4. Black/Pylint for Python files
5. Auto-add formatted files

**Expected:** All hooks pass

**Action:** If hooks fail, fix and re-commit.

### Step 6.3: Push to Remote
```bash
git push origin feature/user-authentication
```

### Step 6.4: Deploy to Staging (if applicable)
```bash
npm run deploy:staging
```

**Expected:** Deployment successful

### Step 6.5: Run Smoke Tests
```bash
npm run test:smoke
```

**Expected:** All smoke tests pass

**Action:** If smoke tests fail, rollback deployment.

### Step 6.6: Check Health Endpoints
```bash
curl https://staging.example.com/health
```

**Expected:** Status: OK

**Action:** If health checks fail, investigate logs.

### Step 6.7: Monitor for Issues
**Tools:**
- Sentry (error tracking)
- Prometheus/Grafana (metrics)
- PagerDuty (alerting)

**Duration:** Monitor for 15-30 minutes after deployment.

**Action:** If issues detected, create rollback task.

**Output:**
- `deployment-report.json` - Deployment results
- `health-check-report.json` - Service health status
- `monitoring-config.json` - Monitoring configuration

**Success Criteria:**
- ✅ Staging deployment successful
- ✅ Smoke tests pass
- ✅ Health checks pass
- ✅ Monitoring configured
- ✅ No errors in last 30 minutes

---

## Complete Atomic Task Lifecycle Summary

```
Stage 0: Discovery (15-30 min)
  ├── Get cass_memory context
  ├── Review requirements
  └── Verify task is atomic

Stage 1: Test Specification (30-60 min)
  ├── Analyze acceptance criteria
  ├── Generate unit tests
  ├── Generate integration tests
  ├── Generate E2E tests
  ├── Create fixtures
  ├── Create mocks
  └── Update package.json

Stage 2: Code Implementation (60-120 min)
  ├── Create/modify source files
  ├── Add type definitions
  ├── Create error handling
  ├── Add dependencies
  └── Install dependencies

Stage 3: Static Analysis (15-30 min)
  ├── Run linter
  ├── Run type checker
  ├── Run formatter
  ├── Run security scan
  ├── Run dependency audit
  └── Check code complexity

Stage 4: Test Execution (15-30 min)
  ├── Run unit tests → [Fail?] → Fix → Retry
  ├── Run integration tests → [Fail?] → Fix → Retry
  ├── Run E2E tests → [Fail?] → Fix → Retry
  ├── Check coverage (≥80%)
  └── Check performance (no regression)

Stage 5: Code Review (15-30 min)
  ├── Run automated checks (PR size, TODO/FIXME, debug statements)
  ├── Run code-reviewer agent
  ├── Parse review comments
  ├── Create tasks for issues
  ├── Fix issues
  └── Re-run tests

Stage 6: Deployment (15-30 min)
  ├── Commit changes (pre-commit hooks run automatically)
  ├── Push to remote
  ├── Deploy to staging
  ├── Run smoke tests
  ├── Check health endpoints
  └── Monitor for issues
```

**Total Time:** 2.5 - 5 hours per atomic task

**Automation Level:** 93% (manual intervention only for complex issues)

**Quality Gates:** All stages must pass before proceeding to next stage.

**Failure Handling:** Each stage creates dependent tasks if failures occur.

**Learning:** cass_memory captures patterns from successes and failures.
