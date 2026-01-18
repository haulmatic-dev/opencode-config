# Remaining Enhancements: Implementation Plan

## Summary

| Category                    | Total  | Completed | Remaining |
| --------------------------- | ------ | --------- | --------- |
| Local Setup Enhancements    | 7      | 1         | 6         |
| MCP Agent Mail Improvements | 7      | 5         | 2         |
| **Total**                   | **14** | **6**     | **8**     |

---

## Phase 1: Error Handling & Configuration (P1)

### Task 1.1: Improve Error Handling in Gates

**Goal:** Replace silent error handling with explicit error types and exit codes

**Changes:**

- `lib/runner/gates.js` - Add error type classification
- `lib/runner/utils/errors.js` - New error types module

**Error Types:**

```javascript
const ErrorTypes = {
  MISSING_TOOL: { code: 10, exitCode: 1, category: 'expected' },
  VALIDATION_ERROR: { code: 20, exitCode: 2, category: 'critical' },
  CONFIGURATION_ERROR: { code: 30, exitCode: 3, category: 'critical' },
  RUNTIME_ERROR: { code: 40, exitCode: 4, category: 'error' },
  TIMEOUT: { code: 50, exitCode: 5, category: 'error' },
};
```

**Acceptance:**

- [ ] Gates don't silently skip errors
- [ ] Clear error messages with remediation hints
- [ ] Exit codes distinguish error types

---

### Task 1.2: Configurable Thresholds

**Goal:** Move hardcoded thresholds to configuration file

**Files:**

- `config/gates.json` - New configuration file
- `lib/runner/gates.js` - Use config instead of hardcoded values

**Configuration:**

```json
{
  "gates": {
    "timeout": 30000,
    "failOnMissingTools": true,
    "continueOnError": false
  },
  "thresholds": {
    "mutation": 80,
    "coverage": 80,
    "maxDuration": 60000
  },
  "testPatterns": ["**/*.test.js", "**/*.test.mjs", "**/*.spec.js", "**/__tests__/**/*"]
}
```

**Acceptance:**

- [ ] Thresholds configurable via JSON file
- [ ] Environment variable overrides supported
- [ ] Validation of configuration values

---

### Task 1.3: Improved Test File Detection

**Goal:** Support multiple test patterns across frameworks

**Files:**

- `lib/runner/utils/test-detector.js` - New test detection module
- `lib/runner/gates/tdd-enforcer.js` - Use improved detection

**Detection Patterns:**

```javascript
const testPatterns = {
  jest: ['**/*.test.js', '**/*.spec.js', '**/__tests__/**/*'],
  vitest: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*'],
  mocha: ['**/test/*.js', '**/tests/*.js', '**/*.spec.js'],
};
```

**Acceptance:**

- [ ] Detects Jest, Vitest, Mocha test files
- [ ] Reads framework config from package.json
- [ ] Supports custom patterns via configuration

---

## Phase 2: Caching & Performance (P2)

### Task 2.1: Gate Result Caching

**Goal:** Cache gate results based on file hashes to avoid re-running on unchanged files

**Files:**

- `lib/runner/cache.js` - New caching module
- `lib/runner/gates.js` - Integrate caching

**Cache Strategy:**

```javascript
class GateCache {
  async get(filePath, strategy = 'mtime') {
    const cacheKey = await this.generateKey(filePath, strategy);
    return this.cache.get(cacheKey);
  }

  async set(filePath, result, strategy = 'mtime') {
    const cacheKey = await this.generateKey(filePath, strategy);
    this.cache.set(cacheKey, {
      result,
      fileHash: await this.hashFile(filePath),
      timestamp: Date.now(),
    });
  }
}
```

**Acceptance:**

- [ ] Caches gate results based on file hash/mtime
- [ ] Invalidates cache on file changes
- [ ] Configurable cache location and TTL

---

### Task 2.2: Performance Metrics Collection

**Goal:** Track and report gate execution metrics

**Files:**

- `lib/runner/metrics.js` - New metrics module
- `bin/gate-metrics.js` - CLI for metrics display

**Metrics Tracked:**

- Execution time per gate (p50, p95, p99)
- Success/failure rates
- Cache hit rates
- Trend over time

**Acceptance:**

- [ ] Collects timing metrics
- [ ] Tracks success/failure rates
- [ ] CLI tool for metrics display

---

### Task 2.3: Visual Status Dashboard

**Goal:** Simple terminal-based status display

**Files:**

- `bin/gate-status.js` - New status CLI
- `lib/runner/status.js` - Status generation module

**Output Format:**

```
=== Quality Gates Status ===
Last Run: 2026-01-18 12:00:00
Status: ✓ All passed

Gates:
  lint:      ✓ 245ms
  mutation:  ✓ 12.5s
  tdd:       ✓ 8.2s
  coverage:  ✓ 3.1s

Cache: 78% hit rate
```

**Acceptance:**

- [ ] Shows current gate status
- [ ] Displays last run metrics
- [ ] Shows cache effectiveness

---

## Phase 3: File Reservation Integration (P2)

### Task 3.1: File Reservation Integration

**Goal:** Hook file reservations into agent execution lifecycle

**Files:**

- `lib/runner/file-reservation.js` - New reservation module
- `plugin/file-reservation.mjs` - Plugin for agent execution
- `bin/file-reservation.js` - CLI for manual reservations

**Integration Pattern:**

```javascript
async function executeWithReservation(agent, filePatterns) {
  // Reserve files before edit
  const reservation = await lockManager.acquire(filePatterns, {
    ttl: 30000,
    owner: agent.id,
  });

  try {
    await agent.execute();
  } finally {
    await reservation.release();
  }
}
```

**Acceptance:**

- [ ] Files reserved before agent edits
- [ ] TTL-based expiration
- [ ] Cleanup on agent death

---

## Task 3.2: SPOF Mitigation (File-Based Fallback)

**Goal:** Add file-based fallback for coordinator

**Files:**

- `lib/parallel-task-coordinator/file-coordinator.js` - Fallback coordinator
- `bin/coordinator-fallback.js` - CLI to switch modes

**Acceptance:**

- [ ] Fallback to file-based coordination if server down
- [ ] Clear mode selection (server vs file)
- [ ] Health checks for both modes

---

## Implementation Order

| Order | Task                        | Effort | Dependencies |
| ----- | --------------------------- | ------ | ------------ |
| 1     | 1.1 Error Handling          | 1 day  | None         |
| 2     | 1.2 Configurable Thresholds | 1 day  | None         |
| 3     | 1.3 Test Detection          | 1 day  | None         |
| 4     | 2.1 Gate Caching            | 2 days | None         |
| 5     | 2.2 Metrics Collection      | 1 day  | None         |
| 6     | 2.3 Dashboard               | 1 day  | 2.2          |
| 7     | 3.1 File Reservation        | 2 days | None         |
| 8     | 3.2 SPOF Mitigation         | 1 day  | 3.1          |

**Total Estimated Effort: 10 days**

---

## Files to Create/Modify

### New Files (8)

- `config/gates.json`
- `lib/runner/utils/errors.js`
- `lib/runner/utils/test-detector.js`
- `lib/runner/cache.js`
- `lib/runner/metrics.js`
- `bin/gate-metrics.js`
- `bin/gate-status.js`
- `lib/runner/file-reservation.js`

### Modified Files (4)

- `lib/runner/gates.js`
- `lib/runner/gates/tdd-enforcer.js`
- `plugin/file-reservation.mjs`
- `ecosystem.config.cjs`

---

## Testing Strategy

Each task should include:

1. Unit tests for new modules
2. Integration tests for gate execution
3. Manual testing for CLI tools

Run with:

```bash
node tests/integration/test-parallel-coordinator.mjs
```
