# Parallel Task Enforcement Plan

## Overview

This plan implements parallel task coordination and enforcement using MCP Agent Mail infrastructure. The goal is to replace PID-based race conditions with proper distributed coordination, enable atomic task claiming, and provide worker health monitoring.

## Decisions

| Question           | Decision                                        |
| ------------------ | ----------------------------------------------- |
| Message Format     | Structured objects with JSON serialization      |
| Heartbeat Interval | 30s default, configurable via config            |
| Stale Threshold    | 2min without heartbeat = stale                  |
| Retry Logic        | Max 3 retries, exponential backoff (1s, 2s, 4s) |
| Dead Letter UI     | CLI tool (`dead-letter list/retry`)             |

## Current State Analysis

### Existing Infrastructure

| Component               | Current Implementation                                 | Limitation                           |
| ----------------------- | ------------------------------------------------------ | ------------------------------------ |
| **Task Claiming**       | `headless-worker.js:28-32` uses PID-based delay (0-3s) | Race conditions, wasted cycles       |
| **File Reservations**   | `mcp_agent_mail_client.py:291-346`                     | Not integrated into worker flow      |
| **Worker Health**       | None                                                   | No heartbeat, stale worker detection |
| **Message Delivery**    | Fire-and-forget HTTP POST                              | No guarantees, no retries            |
| **Message Persistence** | In-memory only                                         | Lost on restart                      |

### Bottlenecks Identified

1. **Quality Gates** (`lib/runner/gates.js:133-155`) - Sequential execution
2. **Task Claim Race** (`headless-worker.js:28-32`) - PID delay instead of locking
3. **Context Distillation** (`lib/runner/smart-context.js`) - Sequential file reads
4. **No Worker Health** - Stale workers not detected

---

## Architecture: Parallel Task Coordinator

### Core Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                    Parallel Task Coordinator                     │
│                    (parallel-task-coordinator.js)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Worker 1   │    │  Worker 2   │    │  Worker N   │         │
│  │  (PM2 #1)   │    │  (PM2 #2)   │    │  (PM2 #N)   │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                   MCP Agent Mail                                │
│              (Task Claims, Heartbeats, Messages)                │
│                            │                                     │
│                   ┌────────▼────────┐                           │
│                   │ SQLite Persistence │                        │
│                   │  (messages.db)    │                        │
│                   └───────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Message Format (Structured Objects with JSON)

```typescript
interface Message {
  id: string; // UUID
  type: MessageType; // CLAIM_TASK, HEARTBEAT, TASK_ASSIGNED, etc.
  version: string; // "1.0" for forward compatibility
  timestamp: number; // Unix timestamp
  sender: string; // Worker ID
  recipient: string; // Coordinator or worker ID
  importance: 'low' | 'normal' | 'high' | 'critical';
  payload: Payload; // Type-specific content
  correlation_id?: string; // For request/response tracing
}

type MessageType =
  | 'CLAIM_TASK'
  | 'TASK_ASSIGNED'
  | 'HEARTBEAT'
  | 'TASK_COMPLETE'
  | 'TASK_FAILED'
  | 'RELEASE_CLAIM';
```

### Configuration Defaults

```json
{
  "heartbeat_interval_ms": 30000,
  "stale_threshold_ms": 120000,
  "retry_max_attempts": 3,
  "retry_backoff_ms": [1000, 2000, 4000],
  "dead_letter_enabled": true
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (P1)

| Task | Description                                           | Files                                              |
| ---- | ----------------------------------------------------- | -------------------------------------------------- |
| 1.1  | Create `parallel-task-coordinator.js` base module     | `lib/parallel-task-coordinator/coordination.js`    |
| 1.2  | Add message persistence to `mcp_agent_mail_client.py` | `lib/mcp-agent-mail/mcp_agent_mail_client.py`      |
| 1.3  | Implement worker registry with SQLite                 | `lib/parallel-task-coordinator/worker-registry.js` |
| 1.4  | Add atomic task claim via MCP                         | `lib/parallel-task-coordinator/task-claim.js`      |
| 1.5  | Update `headless-worker.js` to use coordinator        | `bin/headless-worker.js`                           |

### Phase 2: Health Monitoring (P2)

| Task | Description                                  | Files                                              |
| ---- | -------------------------------------------- | -------------------------------------------------- |
| 2.1  | Implement agent heartbeat system             | `lib/parallel-task-coordinator/heartbeat.js`       |
| 2.2  | Add stale worker detection                   | `lib/parallel-task-coordinator/stale-detection.js` |
| 2.3  | Implement task reassignment for dead workers | `lib/parallel-task-coordinator/reassignment.js`    |

### Phase 3: Delivery Guarantees (P2)

| Task | Description                              | Files                                             |
| ---- | ---------------------------------------- | ------------------------------------------------- |
| 3.1  | Add message IDs and tracking             | `lib/parallel-task-coordinator/message-ids.js`    |
| 3.2  | Implement acknowledgment tracking        | `lib/parallel-task-coordinator/acknowledgment.js` |
| 3.3  | Add retry logic with exponential backoff | `lib/parallel-task-coordinator/retry.js`          |

### Phase 4: Reliability Features (P3)

| Task | Description                   | Files                                          |
| ---- | ----------------------------- | ---------------------------------------------- |
| 4.1  | Dead letter handling          | `lib/parallel-task-coordinator/dead-letter.js` |
| 4.2  | Priority queue and escalation | `lib/parallel-task-coordinator/priority.js`    |
| 4.3  | Add parallel gate execution   | `lib/runner/gates.js` (parallelize)            |

---

## Dependency Graph

```
Phase 1: Core Infrastructure
├── 1.1 coordination.js (BASE)
├── 1.2 message persistence (1.1)
├── 1.3 worker registry (1.2)
├── 1.4 task claim (1.2, 1.3)
└── 1.5 headless-worker update (1.4)

Phase 2: Health Monitoring
├── 2.1 heartbeat (1.3)
├── 2.2 stale detection (2.1)
└── 2.3 task reassignment (2.2)

Phase 3: Delivery Guarantees
├── 3.1 message IDs (1.2)
├── 3.2 acknowledgment (3.1)
└── 3.3 retry (3.2)

Phase 4: Reliability
├── 4.1 dead letter (3.3)
├── 4.2 priority (1.2)
└── 4.3 parallel gates (standalone)
```

---

## File Changes Summary

### New Files

| Path                                               | Purpose                          |
| -------------------------------------------------- | -------------------------------- |
| `lib/parallel-task-coordinator/coordination.js`    | Main coordinator module          |
| `lib/parallel-task-coordinator/worker-registry.js` | Worker registration and tracking |
| `lib/parallel-task-coordinator/task-claim.js`      | Atomic task claiming             |
| `lib/parallel-task-coordinator/heartbeat.js`       | Worker heartbeat system          |
| `lib/parallel-task-coordinator/stale-detection.js` | Dead worker detection            |
| `lib/parallel-task-coordinator/reassignment.js`    | Task reassignment logic          |
| `lib/parallel-task-coordinator/message-ids.js`     | Message ID generation            |
| `lib/parallel-task-coordinator/acknowledgment.js`  | ACK tracking                     |
| `lib/parallel-task-coordinator/retry.js`           | Retry logic                      |
| `lib/parallel-task-coordinator/dead-letter.js`     | Dead letter handling             |
| `lib/parallel-task-coordinator/priority.js`        | Priority/escalation              |
| `lib/parallel-task-coordinator/index.js`           | Public API exports               |
| `lib/parallel-task-coordinator/config.js`          | Configuration defaults           |
| `lib/mcp-agent-mail/messages.db`                   | SQLite persistence               |

### Modified Files

| Path                                          | Changes                           |
| --------------------------------------------- | --------------------------------- |
| `lib/mcp-agent-mail/mcp_agent_mail_client.py` | Add persistence layer             |
| `bin/headless-worker.js`                      | Use coordinator for task claiming |
| `lib/runner/gates.js`                         | Parallel gate execution           |
| `hooks/check-mcp-agent-mail.sh`               | Use service wrapper               |

---

## Acceptance Criteria

### Phase 1 (Core Infrastructure)

- [ ] Workers register via MCP Agent Mail
- [ ] Atomic task claiming replaces PID delay
- [ ] Messages persist in SQLite
- [ ] headless-worker.js works with coordinator
- [ ] No race conditions in task claiming

### Phase 2 (Health Monitoring)

- [ ] Workers send heartbeats every 30s
- [ ] Workers marked stale after 2min no heartbeat
- [ ] Tasks from stale workers reassigned
- [ ] Worker status visible via CLI

### Phase 3 (Delivery Guarantees)

- [ ] All messages have unique IDs
- [ ] Acknowledgment tracking works
- [ ] Failed messages retry with backoff
- [ ] Max retry count prevents infinite loops

### Phase 4 (Reliability)

- [ ] Dead letters stored after max retries
- [ ] Dead letter CLI shows failed messages
- [ ] Priority messages process first
- [ ] Critical messages escalate
- [ ] Quality gates run in parallel

---

## Effort Estimate

| Phase     | Files                   | Complexity | Estimated Time |
| --------- | ----------------------- | ---------- | -------------- |
| 1         | 5 new + 1 modified      | High       | 2-3 days       |
| 2         | 3 new                   | Medium     | 1 day          |
| 3         | 3 new                   | Medium     | 1 day          |
| 4         | 3 new + 1 modified      | Medium     | 1 day          |
| **Total** | **14 new + 3 modified** | -          | **5-6 days**   |

---

## Created Beads Tasks

- opencode-a2s: Create parallel-task-coordinator.js with MCP Agent Mail integration
- opencode-i9o: Update headless-worker.js to use coordinator for atomic task claiming
- opencode-8jy: Implement agent heartbeat system via MCP Agent Mail
- opencode-7mg: Add delivery guarantees: message IDs, acknowledgment tracking, retry logic
- opencode-30y: Add message queue persistence with SQLite
- opencode-5w1: Implement dead letter handling for failed messages
- opencode-dw8: Add priority/escalation system for critical messages
