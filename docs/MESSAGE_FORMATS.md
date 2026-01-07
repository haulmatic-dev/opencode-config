---
name: MESSAGE_FORMATS
---
# MCP Agent Mail Message Format Standards

## Overview

This document defines the standard message formats for droid-to-droid communication via MCP Agent Mail. All messages must conform to these formats to ensure interoperability.

## Common Fields

All message types share these base fields:

```json
{
  "version": "1.0.0",
  "timestamp": "2025-12-25T12:00:00Z",
  "sender_id": "orchestrator",
  "message_id": "msg-uuid-v4",
  "type": "message_type"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Message format version (currently "1.0.0") |
| `timestamp` | ISO 8601 | Yes | When message was created (UTC) |
| `sender_id` | string | Yes | Name of the sending agent |
| `message_id` | string | Yes | Unique identifier (UUID v4) |
| `type` | string | Yes | Message type identifier |

---
## Message Types

### 1. Task Assignment

**Purpose:** Delegate a task from one agent to another

**Type:** `task_assignment`

```json
{
  "version": "1.0.0",
  "timestamp": "2025-12-25T12:00:00Z",
  "sender_id": "orchestrator",
  "message_id": "msg-123e4567-e89b-12d3-a456-426614174000",
  "type": "task_assignment",
  "task_id": "bd-42",
  "description": "Implement user authentication UI with login form",
  "specification": {
    "acceptance_criteria": [
      "Login form displays correctly",
      "Password validation (min 8 chars)",
      "Error messages for failed login",
      "OAuth integration for Google/GitHub"
    ],
    "technical_requirements": [
      "Use React Hook Form",
      "Integrate with backend API /api/auth/login",
      "Store JWT token in secure cookie"
    ]
  },
  "file_patterns": [
    "src/frontend/auth/**/*.ts",
    "src/frontend/components/auth/**/*.tsx",
    "src/frontend/services/auth.ts"
  ],
  "priority": "high",
  "priority_value": 1,
  "dependencies": [
    "bd-41",
    "bd-40"
  ],
  "estimated_duration_minutes": 120,
  "deadline": "2025-12-31T23:59:59Z",
  "metadata": {
    "labels": ["frontend", "authentication"],
    "component": "auth-system",
    "epic": "user-onboarding"
  }
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | string | Yes | Reference to bd task ID |
| `description` | string | Yes | Human-readable task description |
| `specification` | object | Yes | Detailed task specification |
| `specification.acceptance_criteria` | array | Yes | List of acceptance criteria |
| `specification.technical_requirements` | array | No | Technical constraints/requirements |
| `file_patterns` | array | Yes | Glob patterns for affected files |
| `priority` | string | Yes | "low", "normal", "high", "urgent" |
| `priority_value` | number | Yes | Numeric priority (0=urgent, 1=high, 2=normal, 3=low) |
| `dependencies` | array | No | List of dependent task IDs |
| `estimated_duration_minutes` | number | No | Estimated time to complete |
| `deadline` | ISO 8601 | No | When task must be completed |
| `metadata` | object | No | Additional metadata |
| `metadata.labels` | array | No | Categorical labels |
| `metadata.component` | string | No | Affected component |
| `metadata.epic` | string | No | Parent epic |

---
### 2. Task Completion

**Purpose:** Notify that a task has been completed

**Type:** `task_completion`

```json
{
  "version": "1.0.0",
  "timestamp": "2025-12-25T14:30:00Z",
  "sender_id": "frontend-developer",
  "message_id": "msg-223e4567-e89b-12d3-a456-426614174001",
  "type": "task_completion",
  "task_id": "bd-42",
  "status": "complete",
  "completion_summary": "Implemented authentication UI with all acceptance criteria met",
  "files_modified": [
    "src/frontend/auth/LoginForm.tsx",
    "src/frontend/auth/RegisterForm.tsx",
    "src/frontend/services/auth.ts",
    "src/frontend/hooks/useAuth.ts"
  ],
  "test_results": {
    "unit_tests": {
      "total": 15,
      "passed": 15,
      "failed": 0,
      "coverage": 92
    },
    "integration_tests": {
      "total": 8,
      "passed": 8,
      "failed": 0
    }
  },
  "errors_encountered": [],
  "warnings": [
    "OAuth integration tested in dev only, needs staging verification"
  ],
  "time_spent_minutes": 115,
  "next_tasks": [
    {
      "task_id": "bd-43",
      "relationship": "follows",
      "reason": "Authentication UI complete, now add password reset flow"
    }
  ],
  "metadata": {
    "completion_method": "implementation",
    "verification_status": "verified"
  }
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | string | Yes | Reference to completed task |
| `status` | string | Yes | "complete", "partial", "blocked" |
| `completion_summary` | string | Yes | Summary of what was done |
| `files_modified` | array | Yes | List of modified files |
| `test_results` | object | Yes | Test execution results |
| `test_results.unit_tests` | object | No | Unit test summary |
| `test_results.integration_tests` | object | No | Integration test summary |
| `errors_encountered` | array | Yes | List of errors (empty if none) |
| `warnings` | array | No | List of warnings |
| `time_spent_minutes` | number | No | Actual time spent |
| `next_tasks` | array | No | Suggested follow-up tasks |
| `metadata` | object | No | Additional metadata |

**Status Values:**
- `complete` - Task fully completed
- `partial` - Partially completed (document what's missing)
- `blocked` - Cannot complete due to blockers

---
### 3. Error Report

**Purpose:** Report errors encountered during task execution

**Type:** `error_report`

```json
{
  "version": "1.0.0",
  "timestamp": "2025-12-25T15:45:00Z",
  "sender_id": "backend-developer",
  "message_id": "msg-323e4567-e89b-12d3-a456-426614174002",
  "type": "error_report",
  "task_id": "bd-45",
  "severity": "blocking",
  "error": {
    "code": "API_CONNECTION_ERROR",
    "message": "Cannot connect to external payment API endpoint",
    "stack_trace": "TypeError: fetch failed\n    at PaymentService.processPayment...",
    "context": {
      "api_endpoint": "https://api.payment-provider.com/v1/charge",
      "request_id": "req-abc123",
      "timestamp": "2025-12-25T15:44:30Z"
    }
  },
  "attempted_solutions": [
    {
      "solution": "Checked network connectivity",
      "result": "successful",
      "details": "Ping to external API succeeds"
    },
    {
      "solution": "Verified API credentials",
      "result": "failed",
      "details": "API key valid and not expired"
    },
    {
      "solution": "Tested with curl",
      "result": "failed",
      "details": "curl returns 403 Forbidden"
    }
  ],
  "reproduction_steps": [
    "1. Trigger payment flow in checkout",
    "2. Enter test credit card details",
    "3. Click 'Pay' button",
    "4. Error occurs during API call"
  ],
  "needs_human_intervention": false,
  "suggested_actions": [
    "Contact payment provider support",
    "Check if API key has IP whitelist restrictions",
    "Verify sandbox vs production environment"
  ],
  "impact": {
    "affected_users": "all",
    "affected_features": ["checkout", "subscription"],
    "workaround": "Manually process payments via admin panel"
  },
  "attachments": [
    {
      "type": "log",
      "filename": "payment-error.log",
      "url": "artifact://payment-error.log"
    }
  ]
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | string | Yes | Task during which error occurred |
| `severity` | string | Yes | "low", "medium", "high", "blocking" |
| `error` | object | Yes | Error details |
| `error.code` | string | Yes | Machine-readable error code |
| `error.message` | string | Yes | Human-readable error message |
| `error.stack_trace` | string | No | Stack trace if available |
| `error.context` | object | No | Additional error context |
| `attempted_solutions` | array | No | Solutions already tried |
| `reproduction_steps` | array | Yes | Steps to reproduce |
| `needs_human_intervention` | boolean | Yes | Whether human help needed |
| `suggested_actions` | array | No | Suggested resolution steps |
| `impact` | object | No | Impact assessment |
| `attachments` | array | No | Attached files (logs, screenshots) |

**Severity Levels:**
- `low` - Minor error, can work around
- `medium` - Partially blocking, needs attention
- `high` - Major issue, blocking progress
- `blocking` - Cannot proceed without resolution

---
### 4. Status Update

**Purpose:** Provide periodic status updates on task progress

**Type:** `status_update`

```json
{
  "version": "1.0.0",
  "timestamp": "2025-12-25T16:00:00Z",
  "sender_id": "database-engineer",
  "message_id": "msg-423e4567-e89b-12d3-a456-426614174003",
  "type": "status_update",
  "task_id": "bd-47",
  "update_type": "progress",
  "status_summary": "Database schema migration in progress, 70% complete",
  "progress": {
    "percentage": 70,
    "completed_steps": [
      "Schema design",
      "Migration script generation",
      "Test data setup"
    ],
    "current_step": "Running migration in staging",
    "remaining_steps": [
      "Verify staging migration",
      "Schedule production migration",
      "Monitor production rollout"
    ],
    "estimated_completion": "2025-12-25T18:00:00Z"
  },
  "metrics": {
    "tables_migrated": 12,
    "total_tables": 15,
    "data_rows_processed": 1500000,
    "performance": "1200 rows/second"
  },
  "blockers": [],
  "next_milestone": "Staging migration verification",
  "metadata": {
    "update_frequency": "hourly",
    "last_checkin": "2025-12-25T15:00:00Z"
  }
}
```

**Update Types:**
- `progress` - Regular progress update
- `milestone` - Milestone reached
- `blocker` - New blocker discovered
- `unblocker` - Blocker resolved

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | string | Yes | Task being updated |
| `update_type` | string | Yes | Type of update |
| `status_summary` | string | Yes | Brief status summary |
| `progress` | object | No | Progress details (for `progress` type) |
| `progress.percentage` | number | No | Completion percentage (0-100) |
| `progress.completed_steps` | array | No | Steps completed |
| `progress.current_step` | string | No | Current work |
| `progress.remaining_steps` | array | No | Steps remaining |
| `progress.estimated_completion` | ISO 8601 | No | ETA |
| `metrics` | object | No | Relevant metrics |
| `blockers` | array | Yes | List of current blockers (empty if none) |
| `next_milestone` | string | No | Next milestone target |
| `metadata` | object | No | Additional metadata |

---
### 5. Coordination Request

**Purpose:** Request coordination between multiple agents

**Type:** `coordination_request`

```json
{
  "version": "1.0.0",
  "timestamp": "2025-12-25T17:00:00Z",
  "sender_id": "orchestrator",
  "message_id": "msg-523e4567-e89b-12d3-a456-426614174004",
  "type": "coordination_request",
  "request_type": "parallel_execution",
  "participants": [
    "frontend-developer",
    "backend-developer",
    "test-automator"
  ],
  "coordination_topic": "Feature release: User authentication system",
  "shared_resources": [
    {
      "type": "files",
      "patterns": ["src/api/auth/**/*.ts", "src/frontend/auth/**/*.tsx"],
      "access_mode": "read_write"
    },
    {
      "type": "database",
      "schema": "users",
      "access_mode": "read_only"
    }
  ],
  "schedule": {
    "start_time": "2025-12-25T18:00:00Z",
    "duration_minutes": 180,
    "checkpoint_interval_minutes": 30
  },
  "communication_protocol": {
    "primary_channel": "mcp_agent_mail",
    "fallback_channel": "direct",
    "escalation_contact": "human_reviewer"
  },
  "success_criteria": [
    "All acceptance criteria met",
    "Tests passing (coverage > 80%)",
    "No regressions in existing features"
  ],
  "metadata": {
    "epic": "user-onboarding",
    "sprint": "sprint-12"
  }
}
```

**Request Types:**
- `parallel_execution` - Coordinate parallel work
- `handoff` - Coordinate work handoff between agents
- `review` - Request review of work
- `sync` - Sync status across agents

---
### 6. File Reservation Request

**Purpose:** Request file reservations for conflict prevention

**Type:** `file_reservation`

```json
{
  "version": "1.0.0",
  "timestamp": "2025-12-25T18:00:00Z",
  "sender_id": "frontend-developer",
  "message_id": "msg-623e4567-e89b-12d3-a456-426614174005",
  "type": "file_reservation",
  "task_id": "bd-42",
  "reservation_request": {
    "mode": "exclusive",
    "file_patterns": [
      "src/frontend/auth/**/*.ts",
      "src/frontend/auth/**/*.tsx"
    ],
    "duration_minutes": 120,
    "reason": "Implementing authentication UI, need exclusive access to prevent conflicts"
  },
  "alternatives": [
    {
      "pattern": "src/frontend/components/**/*.tsx",
      "mode": "shared",
      "note": "Other agents can read but not modify"
    }
  ]
}
```

**Reservation Modes:**
- `exclusive` - Only this agent can access
- `shared_read` - Multiple agents can read, one can write
- `shared_write` - Multiple agents can read and write (with coordination)

---
## Error Handling

### Invalid Message Format

If a message doesn't conform to the standard, receivers should:

1. Reject with error message: `{"error": "invalid_format", "details": "Missing required field: task_id"}`
2. Include the `message_id` from original for correlation
3. Notify sender via `error_report` message

### Unknown Message Type

If message type is not recognized:

1. Respond with `error_report` indicating unknown type
2. Include sender's `message_id` for correlation
3. Log for analysis

---
## Versioning

**Current Version:** 1.0.0

**Version Format:** MAJOR.MINOR.PATCH

- **MAJOR:** Breaking changes, incompatible with previous versions
- **MINOR:** New message types or fields (backward compatible)
- **PATCH:** Bug fixes, documentation updates

**Version Negotiation:**
1. Sender includes their version in `version` field
2. Receiver checks compatibility with their supported version
3. If incompatible, receiver responds with version mismatch error

---
## Security Considerations

1. **Authentication:** All messages sent through authenticated MCP Agent Mail channel
2. **Authorization:** Agents should only accept messages from authorized senders
3. **Data Sanitization:** Validate all input fields to prevent injection attacks
4. **Sensitive Data:** Never include passwords, API keys, or secrets in messages
5. **Audit Trail:** All messages are logged in MCP Agent Mail for audit purposes

---
## Best Practices

1. **Use UUIDs for message IDs:** Ensure uniqueness across all agents
2. **Include timestamps in UTC:** Standardize on UTC timezone
3. **Keep messages concise:** Only include necessary information
4. **Use structured data:** Prefer arrays/objects over free-form text
5. **Handle errors gracefully:** Always provide `error_report` for failures
6. **Acknowledge messages:** Use MCP Agent Mail's acknowledgment mechanism
7. **Document edge cases:** Note any non-standard usage in `metadata`

---
## Examples by Use Case

### Scenario 1: Orchestrator Delegates Task to Specialist

```json
{
  "type": "task_assignment",
  "task_id": "bd-42",
  "description": "Implement user authentication UI",
  "file_patterns": ["src/frontend/auth/**/*.tsx"],
  "priority": "high"
}
```

### Scenario 2: Specialist Reports Completion

```json
{
  "type": "task_completion",
  "task_id": "bd-42",
  "status": "complete",
  "files_modified": ["src/frontend/auth/LoginForm.tsx"],
  "test_results": {"unit_tests": {"passed": 15, "failed": 0}}
}
```

### Scenario 3: Agent Encounters Error

```json
{
  "type": "error_report",
  "task_id": "bd-45",
  "severity": "blocking",
  "error": {"code": "API_ERROR", "message": "Cannot connect to payment API"},
  "needs_human_intervention": true
}
```

### Scenario 4: Progress Update for Long-Running Task

```json
{
  "type": "status_update",
  "task_id": "bd-47",
  "update_type": "progress",
  "status_summary": "Migration 70% complete",
  "progress": {"percentage": 70, "current_step": "Running staging migration"}
}
```

---
## Implementation Checklist

For each droid that uses MCP Agent Mail:

- [ ] Import message format constants from this spec
- [ ] Validate outgoing messages against schema
- [ ] Validate incoming messages before processing
- [ ] Handle unknown/invalid messages gracefully
- [ ] Include all required fields
- [ ] Use proper data types for all fields
- [ ] Generate UUIDs for `message_id`
- [ ] Use UTC timestamps
- [ ] Send appropriate error reports
- [ ] Acknowledge received messages

---
## Related Documentation

- [MCP Agent Mail Integration Guide](./MCP_AGENT_MAIL_INTEGRATION.md)
- [MCP Agent Mail Setup](./MCP_AGENT_MAIL_SETUP.md)
- [AGENTS.md](./AGENTS.md) - Overall agent coordination guidelines
