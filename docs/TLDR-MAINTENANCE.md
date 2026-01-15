# TLDR Maintenance Guide

This document outlines the recurring maintenance tasks for the TLDR integration system.

## Overview

TLDR (Thought Lightweight Dense Retrieval) provides semantic search and context injection for opencode. Regular maintenance ensures optimal performance and reliability.

## Maintenance Tasks Summary

| Task                       | Frequency | ID           | Priority |
| -------------------------- | --------- | ------------ | -------- |
| TLDR Index Rebuild         | Weekly    | opencode-c8n | P2       |
| TLDR Daemon Health Check   | Daily     | opencode-5l5 | P3       |
| TLDR Performance Review    | Monthly   | opencode-5zz | P2       |
| TLDR Context Quality Audit | Monthly   | opencode-zbx | P2       |

---

## Task Details

### 1. TLDR Index Rebuild (Weekly)

**Bead ID:** `opencode-c8n`  
**Schedule:** Every Monday 9 AM

**Steps:**

1. Stop TLDR daemon: `tldr-cli stop`
2. Clear existing index: `tldr-cli index clear --force`
3. Rebuild index: `tldr-cli index rebuild --all-sources`
4. Restart daemon: `tldr-cli start`
5. Verify health: `tldr-cli health --check-index`

**Success Criteria:**

- Daemon responds to health check within 200ms
- Index contains all expected sources
- Search returns relevant results
- No errors in daemon logs

**Alert Thresholds:**

- ⚠️ Warning: Rebuild takes >15 minutes
- 🔴 Critical: Rebuild takes >30 minutes
- 🔴 Critical: Daemon fails health check after restart
- 🔴 Critical: Index count differs from expected by >5%

---

### 2. TLDR Daemon Health Check (Daily)

**Bead ID:** `opencode-5l5`  
**Schedule:** Every day 8 AM

**Steps:**

1. Check daemon status: `tldr-cli status`
2. Query health endpoint: `curl -s http://localhost:8500/health`
3. Measure response time: `time curl -s http://localhost:8500/ping`
4. Check memory usage: `tldr-cli metrics --memory`
5. Log results to: `logs/tldr/health-$(date +%Y%m%d).log`

**Success Criteria:**

- Daemon status: running
- Health endpoint returns: `{"status":"ok"}`
- Response time: <100ms
- No errors in logs
- Memory usage <500MB

**Alert Thresholds:**

- ⚠️ Warning: Response time >500ms
- 🔴 Critical: Response time >1s
- 🔴 Critical: Health check returns error
- 🔴 Critical: Daemon not running
- ⚠️ Warning: Memory usage >400MB

---

### 3. TLDR Performance Review (Monthly)

**Bead ID:** `opencode-5zz`  
**Schedule:** First day of each month

**Steps:**

1. Run benchmark suite: `tldr-cli benchmark --suite full --output /tmp/benchmark.json`
2. Compare to baseline: `tldr-cli benchmark compare /tmp/benchmark.json --baseline .tldr/benchmarks/baseline.json`
3. Generate report: `tldr-cli benchmark report /tmp/benchmark.json --format markdown`
4. Review significant changes: Identify metrics with >5% deviation
5. Document findings: Update `.tldr/benchmarks/performance-history.md`

**Success Criteria:**

- All benchmarks complete successfully
- Query latency: within 10% of baseline (<110%)
- Indexing speed: within 10% of baseline (>90%)
- Cache hit rate: within 5% of baseline
- Memory efficiency: within 10% of baseline

**Alert Thresholds:**

- ⚠️ Warning: Any metric degraded 5-10%
- 🔴 Critical: Any metric degraded >10%
- 🔴 Critical: Benchmark suite fails to complete
- ⚠️ Warning: Multiple metrics degraded simultaneously

---

### 4. TLDR Context Quality Audit (Monthly)

**Bead ID:** `opencode-zbx`  
**Schedule:** First Friday of each month

**Steps:**

1. Export context logs: `tldr-cli logs export --days=30 --output /tmp/context-logs.json`
2. Sample 10 agent runs: Randomly select from logs
3. Review each context injection: Rate relevance 1-5
4. Calculate average score: Sum scores / total samples
5. Document findings: Update `.tldr/quality/audit-$(date +%Y%m).md`

**Success Criteria:**

- Average relevance score: >4/5
- No single injection scored: <2/5
- Context relevance trend: Stable or improving
- Coverage: All expected source types included

**Alert Thresholds:**

- ⚠️ Warning: Average score 3.5-4.0
- 🔴 Critical: Average score <3.5
- 🔴 Critical: Any injection scored 1/5
- ⚠️ Warning: Coverage gap detected

**Scoring Rubric:**
| Score | Meaning |
|-------|---------|
| 5 | Perfect match, highly relevant |
| 4 | Mostly relevant, minor noise |
| 3 | Partially relevant, some noise |
| 2 | Minimally relevant, mostly noise |
| 1 | Not relevant at all |

---

## Escalation Procedures

### Alert Levels

1. **Warning (⚠️)**: Log and monitor. Review in next task cycle.
2. **Critical (🔴)**: Immediate action required. Notify @tldr-maintainer.

### Escalation Path

1. First critical: Task assignee investigates
2. Second critical (same issue): Create new bug task
3. Third critical: Escalate to team lead
4. Known issue: Document in `.tldr/KNOWN_ISSUES.md`

---

## Quick Commands

```bash
# Daemon control
tldr-cli start      # Start daemon
tldr-cli stop       # Stop daemon
tldr-cli restart    # Restart daemon
tldr-cli status     # Check status

# Health checks
tldr-cli health             # Basic health
tldr-cli health --check-index  # Index health
tldr-cli health --full      # Full diagnostics

# Index management
tldr-cli index status       # View index status
tldr-cli index clear        # Clear index
tldr-cli index rebuild      # Rebuild index

# Performance
tldr-cli benchmark --suite quick    # Quick benchmark
tldr-cli benchmark --suite full     # Full benchmark
tldr-cli metrics                   # View metrics
```

---

## Related Documentation

- [TLDR Plugin](../plugin/tldr.mjs)
- [TLDR Daemon](../daemon/tldr-daemon.mjs)
- [TLDR Configuration](../config/tldr.json)
- [TLDR Benchmarks](../.tldr/benchmarks/)
- [TLDR Quality Metrics](../.tldr/quality/)

---

## Task Dependencies

```
opencode-hsc (Parent: Add Beads tasks for TLDR maintenance)
├── opencode-c8n (TLDR Index Rebuild - Weekly)
├── opencode-5l5 (TLDR Daemon Health Check - Daily)
├── opencode-5zz (TLDR Performance Review - Monthly)
└── opencode-zbx (TLDR Context Quality Audit - Monthly)
```

---

_Last Updated: 2026-01-15_  
_Owner: @tldr-maintainer_
