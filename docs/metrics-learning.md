# Metrics Collection & Learning System

## Overview

This document describes the metrics collection, monitoring, and learning system for opencode. The system tracks key performance indicators (KPIs), enables continuous learning via cass_memory, and provides visibility into agent performance and workflow efficiency.

---

## Metrics to Track

### Quality Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Code Coverage | Percentage of code covered by tests | ≥ 80% | < 75% |
| Defect Escape Rate | Bugs in production per 1000 LOC | < 1% | > 2% |
| Mean Time to Detection (MTTD) | Time to detect bugs after commit | < 24h | > 48h |
| Mean Time to Resolution (MTTR) | Time to fix bugs | < 8h | > 24h |
| Technical Debt Ratio | Estimated effort / total effort | < 20% | > 30% |
| Code Churn | Lines changed / week | Stable | 2x normal |

### Velocity Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Lead Time | Idea to production | < 2 days | > 5 days |
| Cycle Time | Start to finish | < 4 hours | > 8 hours |
| Throughput | Tasks completed per week | ≥ 20 | < 10 |
| Task Completion Rate | Tasks closed / tasks started | ≥ 85% | < 70% |
| Average Task Duration | Mean task completion time | 2-4 hours | > 6 hours |
| Deployment Frequency | Deployments per day | ≥ 5 | < 2 |

### Workflow Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Test Execution Time | Time to run all tests | < 5 min | > 10 min |
| Pipeline Success Rate | Successful pipeline runs | ≥ 95% | < 90% |
| Flaky Test Rate | Inconsistent test failures | < 5% | > 10% |
| Average PR Size | Lines changed per PR | < 500 | > 1000 |
| Review Turnaround Time | PR review duration | < 2 hours | > 4 hours |
| Rollback Frequency | Rollbacks per week | 0 | ≥ 1 |

### AI Assistance Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| AI Task Completion Rate | Tasks completed without human help | ≥ 70% | < 50% |
| AI-Generated Code Acceptance | AI code accepted / total AI code | ≥ 80% | < 60% |
| Time Saved by AI | Reduction in task completion time | ≥ 50% | < 30% |
| AI Prompt Success Rate | Prompts yielding useful results | ≥ 85% | < 70% |
| Human Intervention Rate | Tasks requiring human help | ≤ 30% | > 50% |

---

## Prometheus Integration

### Setup

Install prom-client:

```bash
npm install prom-client
```

### Metrics Definitions

```javascript
const client = require('prom-client');

// Register default metrics (CPU, memory, etc.)
client.collectDefaultMetrics();

// === Task Completion Metrics ===

const taskDuration = new client.Histogram({
  name: 'opencode_task_duration_seconds',
  help: 'Task completion duration in seconds',
  labelNames: ['agent_type', 'task_type', 'stage', 'success'],
  buckets: [60, 300, 900, 1800, 3600]
});

const taskCounter = new client.Counter({
  name: 'opencode_task_total',
  help: 'Total tasks executed',
  labelNames: ['agent_type', 'task_type', 'success']
});

// === Quality Metrics ===

const codeCoverageGauge = new client.Gauge({
  name: 'opencode_code_coverage_percent',
  help: 'Code coverage percentage'
});

const lintErrorsCounter = new client.Counter({
  name: 'opencode_lint_errors_total',
  help: 'Total lint errors',
  labelNames: ['severity']
});

// === Pipeline Metrics ===

const pipelineDuration = new client.Histogram({
  name: 'opencode_pipeline_duration_seconds',
  help: 'Pipeline execution duration',
  labelNames: ['stage', 'success'],
  buckets: [10, 30, 60, 120, 300]
});

const pipelineFailureCounter = new client.Counter({
  name: 'opencode_pipeline_failures_total',
  help: 'Total pipeline failures',
  labelNames: ['stage', 'failure_type']
});

// === AI Assistance Metrics ===

const aiSuccessRate = new client.Gauge({
  name: 'opencode_ai_success_rate',
  help: 'AI task success rate',
  labelNames: ['agent_type']
});

const humanInterventionCounter = new client.Counter({
  name: 'opencode_human_interventions_total',
  help: 'Total human interventions',
  labelNames: ['reason']
});
```

### Metrics Server

```javascript
import express from 'express';

const app = express();
const PORT = process.env.METRICS_PORT || 9090;

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

app.listen(PORT, () => {
  console.log(`Metrics server listening on port ${PORT}`);
});
```

### Instrumentation Example

```javascript
// Track task execution with metrics
async function executeTask(task) {
  const startTime = Date.now();
  let success = false;

  try {
    const result = await performTask(task);
    success = true;
    
    // Record success metrics
    taskCounter.labels({
      agent_type: task.agent,
      task_type: task.type,
      success: 'true'
    }).inc();
    
    return result;
  } catch (error) {
    // Record failure metrics
    taskCounter.labels({
      agent_type: task.agent,
      task_type: task.type,
      success: 'false'
    }).inc();
    
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    
    taskDuration.labels({
      agent_type: task.agent,
      task_type: task.type,
      stage: task.stage || 'unknown',
      success: success ? 'true' : 'false'
    }).observe(duration);
  }
}
```

---

## cass_memory Learning System

### Integration

The cass_memory plugin (`plugin/cass.mjs`) automatically injects relevant rules and learns from agent execution:

```javascript
// plugin/cass.mjs
export const cass = async ({ ... }) => {
  return {
    'agent.execute.before': async (input, output) => {
      // Fetch relevant rules based on task
      const context = await cassClient.getContext(task);
      
      // Inject into system prompt
      output.systemPrompt = formatContextAsSystemPrompt(context);
    },

    'agent.execute.after': async (input, output) => {
      // Record outcome (success/failure)
      await cassClient.recordOutcome(status, ruleIds);
    }
  };
};
```

### Learning Patterns

#### Failure Pattern Extraction

```javascript
const learning = {
  extractFailurePatterns: async () => {
    // Query recent failures from metrics
    const recentFailures = await queryRecentFailures(7); // Last 7 days
    
    // Group by stage and failure type
    const patterns = groupBy(recentFailures, f => {
      return `${f.stage}:${f.failure_type}`;
    });
    
    // Extract learned patterns
    const learnedPatterns = Object.entries(patterns).map(([key, failures]) => {
      const [stage, failureType] = key.split(':');
      
      return {
        pattern_id: 'p-' + generateId(),
        stage: stage,
        failure_type: failureType,
        occurrence_count: failures.length,
        last_occurrence: failures[0].timestamp,
        resolution_success_rate: calculateSuccessRate(failures),
        avg_time_to_resolve: calculateAvgTime(failures),
        recommended_action: getRecommendedAction(stage, failureType)
      };
    });
    
    // Store in cass_memory for future reference
    await storeInCassMemory('failure_patterns', learnedPatterns);
  }
};
```

#### Success Pattern Extraction

```javascript
const learning = {
  extractSuccessPatterns: async () => {
    const recentSuccesses = await queryRecentSuccesses(7);
    
    // Group by agent type and task type
    const patterns = groupBy(recentSuccesses, s => {
      return `${s.agent_type}:${s.task_type}`;
    });
    
    const learnedPatterns = Object.entries(patterns).map(([key, successes]) => {
      const [agentType, taskType] = key.split(':');
      const attemptCount = getAttemptCount(agentType, taskType);
      
      return {
        pattern_id: 'p-' + generateId(),
        approach: `${agentType}_${taskType}`,
        agent_type: agentType,
        task_type: taskType,
        success_rate: successes.length / attemptCount,
        avg_time_to_complete: calculateAvgTime(successes),
        recommended: successes.length >= 5 // Recommend if proven 5+ times
      };
    });
    
    await storeInCassMemory('success_patterns', learnedPatterns);
  }
};
```

### Context Recommendations

The cass_memory plugin provides context-aware recommendations:

```bash
# Before starting a task (automatically called by plugin)
cm context "implementing user authentication" --json

# Returns:
{
  "success": true,
  "data": {
    "task": "implementing user authentication",
    "relevantBullets": [
      {
        "id": "b-8f3a2c",
        "content": "Always write unit tests before implementing authentication logic",
        "confidence": 0.95,
        "evidence_count": 42,
        "source": "learning"
      },
      {
        "id": "b-3d7e9f",
        "content": "Use JWT tokens with 15-minute expiration",
        "confidence": 0.88,
        "evidence_count": 28,
        "source": "learning"
      }
    ],
    "antiPatterns": [
      {
        "id": "ap-7d1b4f",
        "content": "Never store passwords in plain text",
        "confidence": 0.99,
        "evidence_count": 156,
        "source": "learning"
      }
    ],
    "historySnippets": [
      {
        "session_id": "ses-abc123",
        "title": "Implement OAuth2 login",
        "outcome": "success",
        "duration": "45 min",
        "approach": "test_driven_development",
        "snippet": "Started with unit tests, then implemented...",
        "score": 35.2
      }
    ]
  }
}
```

### Reflection and Learning

Automatic reflection runs periodically:

```javascript
// Run reflection every 24 hours
setInterval(async () => {
  console.log('Running cass_memory reflection...');
  
  // Extract patterns from metrics
  await extractFailurePatterns();
  await extractSuccessPatterns();
  
  // Generate new rules from patterns
  await generateNewRules();
  
  // Deprecate stale rules (90-day half-life)
  await applyConfidenceDecay();
  
  console.log('Reflection complete');
}, 24 * 60 * 60 * 1000);
```

---

## Monitoring Stack

### Components

| Component | Purpose | Port |
|-----------|---------|------|
| **Prometheus** | Metrics collection and storage | 9090 |
| **Grafana** | Dashboards and visualization | 3000 |
| **Sentry** | Error tracking and alerting | - |
| **PagerDuty** | On-call alerting | - |
| **ELK Stack** | Log aggregation and search | 9200 (Elastic), 5601 (Kibana) |

### Health Check Endpoints

```javascript
// app.js
app.get('/health', (req, res) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      prometheus: isServiceRunning('prometheus'),
      cass_memory: isServiceRunning('cm'),
      gptcache: isServiceRunning('gptcache-server'),
      beads: isServiceRunning('bd')
    },
    metrics: {
      tasks_completed_24h: getTaskCount(24),
      success_rate_24h: getSuccessRate(24),
      avg_task_duration_24h: getAvgDuration(24)
    }
  };
  
  const allHealthy = Object.values(checks.services).every(s => s);
  const statusCode = allHealthy ? 200 : 503;
  
  res.status(statusCode).json(checks);
});

app.get('/readiness', (req, res) => {
  // Check if ready to accept traffic
  const ready = 
    isServiceRunning('prometheus') &&
    isServiceRunning('cm') &&
    isServiceRunning('gptcache-server');
  
  res.status(ready ? 200 : 503).json({ ready });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(client.register.metrics());
});

app.get('/version', (req, res) => {
  res.json({
    version: require('./package.json').version,
    commit: process.env.GIT_COMMIT || 'unknown',
    build_time: process.env.BUILD_TIME || 'unknown'
  });
});
```

### Grafana Dashboard

**Key Panels:**

1. **Task Overview**
   - Total tasks completed (24h, 7d, 30d)
   - Success rate trend
   - Average task duration
   - Tasks by agent type

2. **Quality Metrics**
   - Code coverage over time
   - Lint errors trend
   - Test execution time
   - Flaky test rate

3. **Pipeline Performance**
   - Pipeline success rate
   - Pipeline duration trend
   - Failure rate by stage
   - Rollback frequency

4. **AI Assistance**
   - AI success rate
   - Human intervention rate
   - Time saved by AI
   - Prompt success rate

5. **cass_memory Learning**
   - Rules in playbook
   - Rule confidence trend
   - Anti-patterns detected
   - Reflection runs

---

## Alerts

### Prometheus Alert Rules

```yaml
# alerts.yml
groups:
  - name: opencode_alerts
    interval: 30s
    rules:
      # Task failure rate
      - alert: HighTaskFailureRate
        expr: rate(opencode_task_total{success="false"}[1h]) / rate(opencode_task_total[1h]) > 0.2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High task failure rate (>20%)"
          description: "Task failure rate is {{ $value | humanizePercentage }} for the last hour"

      # Pipeline failures
      - alert: PipelineFailureSpike
        expr: rate(opencode_pipeline_failures_total[5m]) > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pipeline failure spike detected"
          description: "{{ $value }} pipeline failures per second"

      # Code coverage drop
      - alert: LowCodeCoverage
        expr: opencode_code_coverage_percent < 75
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Code coverage below 75%"
          description: "Current coverage: {{ $value }}%"

      # Lint errors
      - alert: HighLintErrorRate
        expr: rate(opencode_lint_errors_total[1h]) > 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High lint error rate"
          description: "{{ $value }} lint errors per hour"

      # AI success rate
      - alert: LowAISuccessRate
        expr: opencode_ai_success_rate < 0.6
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "AI success rate below 60%"
          description: "Current AI success rate: {{ $value | humanizePercentage }}"
```

---

## Usage

### Start Metrics Server

```bash
# Start Prometheus metrics server
node lib/metrics-server.js

# Metrics available at http://localhost:9090/metrics
```

### View cass_memory Context

```bash
# Get context for a task (automatically done by plugin)
cm context "fix authentication bug" --json

# Check playbook health
cm stats --json

# View recent rules
cm playbook list

# Check cass_memory status
cm doctor --json
```

### Run Reflection

```bash
# Manual reflection (extract patterns from metrics)
node scripts/reflect.js

# View learned patterns
cm context "recent failures" --json
```

---

## Configuration

### Metrics Config

```javascript
// config/metrics.js
module.exports = {
  prometheus: {
    enabled: true,
    port: 9090,
    collectDefaultMetrics: true
  },
  
  cass_memory: {
    enabled: true,
    contextLimit: 5,
    autoInject: true,
    reflectionInterval: '24h'
  },
  
  alerts: {
    enabled: true,
    webhookUrl: process.env.ALERT_WEBHOOK_URL
  }
};
```

---

## Testing

### Test Metrics Collection

```bash
# Run metrics tests
npm run test:metrics
```

### Test cass_memory Integration

```bash
# Run cass plugin tests
node test-cass.mjs
node test-cass-execution.mjs
./test-cass-integration.sh
```

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)
- [cass_memory Docs](https://github.com/Dicklesworthstone/coding_agent_session_search)
- [GPTCache Integration](../CASS_PLUGIN_INTEGRATION.md)
