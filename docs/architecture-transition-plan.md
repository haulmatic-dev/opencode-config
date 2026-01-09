# Architecture Transition Plan: Consolidation & VM Readiness

## Executive Summary

We analyzed current Beads tasks (48 total) and identified significant misalignment with the new architecture we designed. This document provides:

1. **Task consolidation plan** - Clean up obsolete tasks, create new aligned tasks
2. **VM setup requirements** - Components needed for remote deployment
3. **Implementation roadmap** - Clear path forward

---

## Current State Analysis

### Beads Task Overview

| Status | Count | % | Action Needed |
|---------|--------|----|---------------|
| **Tombstone** | 24 | 50% | **DELETE** (obsolete Factory migration tasks) |
| **Closed** | 15 | 31% | Review, keep |
| **In Progress** | 2 | 4% | Monitor |
| **Open** | 7 | 15% | Review, reassign |

**Key Finding:** 50% of tasks are tombstoned and represent obsolete Factory CLI migration work. These should be removed to reduce noise and align with new architecture.

### Top Blocked Tasks

| Task | Status | Blocked By | Action |
|------|--------|-----------|--------|
| opencode-o0b (Hook-based service check) | Tombstone | opencode-0bc | Consolidate into new tasks |
| opencode-wns (Service check tests) | Tombstone | opencode-o0b | Consolidate into new tasks |

**Note:** These blocked by obsolete Factory migration task (opencode-0bc).

---

## Task Consolidation Plan

### Phase 1: Delete Obsolete Tasks (13 tasks)

**Factory Migration Tasks (Obsolete):**

```bash
# These tasks were for migrating Factory CLI to opencode
# We're building NEW architecture instead - these should be deleted

bd delete opencode-0bc   # "Migrate Factory CLI to opencode with cass_memory"
bd delete opencode-9bz   # "Migrate droids from Factory CLI to opencode agent/"
bd delete opencode-ivn   # "Migrate skills from Factory CLI to opencode skills/"
bd delete opencode-pqy   # "Investigate and plan agent migration"
bd delete opencode-hfi   # "Convert prd.md - remove Factory dependencies"
bd delete opencode-7u8   # "Convert generate-tasks.md - remove Factory dependencies"
bd delete opencode-yl1   # "Remove Factory-specific agent files"
bd delete opencode-8eu   # "Create workspace-init script"
```

**Infrastructure Consolidation (Consolidate into new tasks):**

```bash
# These partial infrastructure tasks should be consolidated into new architecture tasks
bd delete opencode-o0b   # "Create hook-based service check architecture"
bd delete opencode-6n7   # "Migrate MCP Agent Mail integration to opencode"
bd delete opencode-0zl   # "Integrate MCP Agent Mail into opencode-init"
bd delete opencode-4wm   # "Create opencode MCP Agent Mail client helper"
bd delete opencode-7ts   # "Test MCP Agent Mail integration"
```

**Verify UBS Tasks:**

```bash
# opencode-jub may still be needed - verify before deleting
# opencode-q4a is CLOSED (UBS integration tested successfully)
# opencode-7ts is already deleted above (consolidated)

bd show opencode-jub   # Review if still needed
```

### Phase 2: Create New Architecture Tasks (6 tasks)

**Priority 1: Core Infrastructure (Epic)**

```bash
# TASK 1: Implement Parallel Agent Spawn Middleware
bd create \
  --title "Implement Parallel Agent Spawn Middleware" \
  --type "epic" \
  --priority 1 \
  --labels "infrastructure,core,high-impact" \
  --description "Create shared middleware (lib/parallel-agent-middleware.js) for spawning headless opencode workers via PM2 or subprocess. Includes: spawn_headless_worker(), wait_for_completion(), monitor_workers(), cleanup_workers(). Supports up to 6 parallel workers with health monitoring and automatic restart."

# TASK 2: Implement Orchestrator Main Loop
bd create \
  --title "Implement Orchestrator Main Loop" \
  --type "epic" \
  --priority 1 \
  --labels "orchestrator,core,high-impact" \
  --description "Update orchestrator (agent/orchestrator.md) with continuous orchestration loop: bd.ready() polling, MCP message handling, periodic status reporting (every 5 min), user command handling (status/pause/resume/stop), and minimal state tracking (conserve context window)."

# TASK 3: Integrate MCP Agent Mail End-to-End
bd create \
  --title "Integrate MCP Agent Mail End-to-End" \
  --type "task" \
  --priority 1 \
  --depends-on "implement-parallel-agent-spawn-middleware,implement-orchestrator-main-loop" \
  --labels "mcp,integration,core" \
  --description "Register orchestrator with MCP Agent Mail, test agent-to-agent communication, verify message passing, test worker spawning via middleware, and validate full orchestration flow."
```

**Priority 2: Agent Integration (Tasks)**

```bash
# TASK 4: Add Research Integration to PRD Agent
bd create \
  --title "Add Research Integration to PRD Agent" \
  --type "task" \
  --priority 2 \
  --depends-on "implement-parallel-agent-spawn-middleware" \
  --labels "agent,prd,research" \
  --description "Update agent/prd.md with optional parallel research spawning using middleware. Integrate research results from codebase-researcher, file-picker-agent, git-history-analyzer, domain-specialist, best-practices-researcher. Create research tasks as Beads tasks (optional)."

# TASK 5: Add Research Integration to Generate-Tasks Agent
bd create \
  --title "Add Research Integration to Generate-Tasks Agent" \
  --type "task" \
  --priority 2 \
  --depends-on "implement-parallel-agent-spawn-middleware" \
  --labels "agent,generate-tasks,research" \
  --description "Update agent/generate-tasks.md with optional parallel research spawning using middleware. Integrate research results from git-history-analyzer, library-source-reader, best-practices-researcher. Create research tasks as Beads tasks (optional)."

# TASK 6: Test End-to-End Figma Workflow
bd create \
  --title "Test End-to-End Figma Workflow" \
  --type "task" \
  --priority 2 \
  --depends-on "integrate-mcp-agent-mail,end-to-end,add-research-integration-to-prd-agent,add-research-integration-to-generate-tasks-agent" \
  --labels "testing,figma,e2e,workflow" \
  --description "Test complete workflow: Annotated Figma → PRD Agent → Generate-Tasks Agent → Beads → Orchestrator → Implementation Workers. Verify: Figma design extraction, PRD generation, task breakdown, Beads task creation, MCP communication, headless worker spawning, quality gates (UBS, lint, typecheck, test)."
```

**Priority 3: VM Setup (Optional - If Deploying to Remote)**

```bash
# TASK 7: Set Up Remote VM Environment (Optional)
bd create \
  --title "Set Up Remote VM Environment" \
  --type "task" \
  --priority 3 \
  --labels "infrastructure,vm,setup,optional" \
  --description "Set up remote VM environment for opencode orchestration. Includes: VM provisioning, dependency installation (Node.js 18+, Go, Python 3.10+, PM2), MCP Agent Mail server setup (standalone/Docker/systemd), firewall configuration (port 8000), monitoring setup (Prometheus/Grafana optional), and health verification."

# TASK 8: Create VM Provisioning Script (Optional)
bd create \
  --title "Create VM Provisioning Script" \
  --type "task" \
  --priority 3 \
  --depends-on "set-up-remote-vm-environment" \
  --labels "infrastructure,vm,automation,optional" \
  --description "Create automated VM provisioning script (opencode-vm-setup.sh) for one-command setup. Includes: dependency installation verification, MCP server bootstrap, PM2 ecosystem startup, systemd service configuration, firewall setup, and health checks. Test script on fresh VM."
```

---

## VM Setup Requirements

### Core Components (Same for Local & Remote)

| Component | Version | Purpose | Installation |
|-----------|---------|--------|--------------|
| **Node.js** | 18+ | Runtime | `nvm install 18 && nvm use 18` |
| **Beads CLI** | Latest | Task tracking | `go install github.com/steveyegge/beads@latest` |
| **OpenCode CLI** | Latest | Agent execution | Git clone from repo |
| **PM2** | Latest | Process manager (headless workers) | `npm install -g pm2` |
| **UBS** | Latest | Static analysis (quality gate) | `curl -sSL https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh | bash` |
| **Python** | 3.10+ | MCP Agent Mail server | `sudo apt install python3.10` |
| **Pip/pipx** | Latest | Python package manager | `python3 -m pipx ensurepath` |

### Remote-Only Components

| Component | Purpose | Recommended Setup | Complexity |
|-----------|---------|-------------------|------------|
| **MCP Agent Mail Server** | Central message broker | Standalone with systemd (preferred) | Medium |
| **Systemd Service** | Auto-start MCP server | systemd unit file | Low |
| **Firewall** | Open MCP port (8000) | `sudo ufw allow 8000/tcp` | Low |
| **Monitoring** | Track VM health | Prometheus + Grafana (recommended) | Medium |
| **Log Aggregation** | Centralize logs | Loki + Promtail (simple) or ELK (full) | High |
| **Alerting** | Notify on failures | Prometheus Alertmanager | Medium |
| **Backup** | Disaster recovery | Automated daily backups (cron) | Low |
| **SSL/TLS** | Secure MCP communication | Certbot + Nginx (production) | Medium |

### Quick VM Setup (One Command)

```bash
# Clone opencode repo (includes setup script)
git clone https://github.com/your-org/opencode.git
cd opencode

# Run automated VM setup script
./scripts/vm-setup.sh

# This script does:
# ✅ Install all dependencies (Node.js, Go, Python, PM2, Beads, UBS)
# ✅ Setup MCP Agent Mail server (systemd service, start, enable)
# ✅ Configure firewall (open port 8000)
# ✅ Setup PM2 ecosystem (start MCP server, orchestrator)
# ✅ Health checks (verify MCP server, PM2 processes)
# ✅ Optional: Setup monitoring (Prometheus, Grafana, Alerting)
```

---

## Implementation Roadmap

### Week 1: Cleanup & Planning

| Day | Tasks | Output |
|-----|--------|--------|
| **Day 1** | Delete 13 obsolete tasks | Clean Beads, aligned task list |
| **Day 2** | Create 6 new architecture tasks | Clear task hierarchy, proper dependencies |
| **Day 3** | Verify dependencies and labels | Ready for implementation |
| **Day 4** | Review VM setup requirements | Optional: decide on VM deployment |
| **Day 5** | Update AGENTS.md with new workflow | Document new architecture |

### Week 2: Core Infrastructure (Priority 1)

| Day | Tasks | Output |
|-----|--------|--------|
| **Day 1-2** | Implement Parallel Agent Spawn Middleware | `lib/parallel-agent-middleware.js` |
| **Day 3-4** | Implement Orchestrator Main Loop | Updated `agent/orchestrator.md` |
| **Day 5** | Integrate MCP Agent Mail E2E | Working MCP communication, worker spawning |

### Week 3: Agent Integration (Priority 2)

| Day | Tasks | Output |
|-----|--------|--------|
| **Day 1** | Add Research Integration to PRD Agent | Updated `agent/prd.md` |
| **Day 2** | Add Research Integration to Generate-Tasks | Updated `agent/generate-tasks.md` |
| **Day 3-5** | Test End-to-End Figma Workflow | Working: Figma → PRD → Tasks → Implementation |

### Week 4: VM Setup (Optional - Priority 3)

| Day | Tasks | Output |
|-----|--------|--------|
| **Day 1-2** | Set Up Remote VM Environment | Running VM with all services |
| **Day 3** | Create VM Provisioning Script | Automated setup script |
| **Day 4-5** | Test VM Setup & Monitoring | Production-ready deployment |

---

## Expected Outcomes

### After Phase 1 (Cleanup)

- **Current:** 48 tasks (24 tombstoned)
- **After:** ~35 tasks (cleaner, aligned)
- **Improvement:**
  - ✅ No obsolete Factory migration tasks
  - ✅ Clear task hierarchy
  - ✅ Proper dependencies
  - ✅ Aligned with new architecture

### After Phase 2-3 (Implementation)

- **New Core Components:**
  - ✅ Parallel Agent Spawn Middleware (shared component)
  - ✅ Orchestrator Main Loop (continuous orchestration)
  - ✅ MCP Agent Mail Integration (end-to-end)

- **Agent Capabilities:**
  - ✅ PRD Agent can spawn parallel research (optional)
  - ✅ Generate-Tasks Agent can spawn parallel research (optional)
  - ✅ Research tasks created as Beads (reusable)

- **Workflow Supported:**
  - ✅ Annotated Figma → PRD → Tasks → Implementation
  - ✅ JIRA ticket → Direct implementation
  - ✅ Bug fixes, capability development, architecture design
  - ✅ Multiple workers in parallel via MCP

### After Phase 4 (VM Setup - Optional)

- **VM Ready for:**
  - ✅ Production orchestration
  - ✅ 24/7 uptime
  - ✅ Team collaboration
  - ✅ Centralized monitoring
  - ✅ Automated backups
  - ✅ Disaster recovery

---

## Key Architecture Changes

### Before (Current State)

```
Orchestrator → Delegates via Task tool (direct)
    ↓
PRD Agent → Uses direct tools (Read, Grep, Glob)
    ↓
Generate-Tasks Agent → Uses direct tools (Read, Grep, Execute)
    ↓
Beads Tasks → Factory migration (obsolete)
```

### After (New Architecture)

```
Orchestrator (Coordinator)
    ├─→ Spawns headless workers via Parallel Agent Spawn Middleware
    ├─→ Communicates via MCP Agent Mail only
    ├─→ Reads Beads for ready tasks
    ├─→ Reports status periodically (every 5 min)
    └─→ Minimal context tracking

Parallel Agent Spawn Middleware (Shared Component)
    ├─→ Spawns headless opencode (PM2 or subprocess)
    ├─→ Manages worker lifecycle
    └─→ Used by: Orchestrator, PRD, Generate-Tasks, any agent needing parallelism

Research Tasks (Beads Tasks - Visible & Reusable)
    ├─→ Created by research droids
    ├─→ Visible in Beads triage
    ├─→ Can be picked up by any agent
    └─→ Reusable (no duplication)

PRD Agent (Standalone - Research-Ready)
    ├─→ Reads annotated Figma (via figma-design-extractor)
    ├─→ Reads JIRA tickets (when no Figma)
    ├─→ Generates PRD documents
    └─→ Uses middleware to spawn parallel research (optional)

Generate-Tasks Agent (Standalone - Research-Ready)
    ├─→ Reads PRD files
    ├─→ Creates Beads tasks with dependencies
    ├─→ Generates task breakdown files
    └─→ Uses middleware to spawn parallel research (optional)

Implementation Agents (Headless Workers)
    ├─→ Execute tasks via MCP Agent Mail
    ├─→ Run quality gates (UBS, lint, typecheck, test)
    ├─→ Complete Beads tasks
    └─→ Report back to orchestrator
```

---

## Decision Points

### 1. Local vs Remote Deployment

**Question:** Should we deploy to remote VM?

**Considerations:**
- ✅ **Remote:** 24/7 uptime, team collaboration, scalable, production-ready
- ✅ **Local:** Free, faster setup, no latency, better for development

**Recommendation:**
- **Phase 1-3:** Local development (test architecture, fix bugs)
- **Phase 4:** Optional VM setup (production deployment)

### 2. MCP Agent Mail Deployment

**Question:** Should we use standalone server or integrate into orchestrator?

**Options:**
- ✅ **Standalone Server** (Recommended): Centralized, production-ready, works with any orchestrator instance
- ⚠️ **Embedded in Orchestrator:** Simpler setup, single process, less flexible

**Recommendation:** Standalone server (better for multi-user/team scenarios)

### 3. Monitoring Stack

**Question:** Which monitoring stack to use?

**Options:**
- ✅ **Loki + Promtail:** Simple, lightweight, good for logs only
- ✅ **Prometheus + Grafana:** Full-featured, metrics + visualization, supports alerting
- ⚠️ **ELK Stack:** Heavy, complex, overkill for this use case

**Recommendation:** Prometheus + Grafana (best balance of features vs complexity)

---

## Next Actions

### Immediate (This Session)

1. ✅ **Review this plan** - Confirm task deletions and new task creation
2. ⏭️ **Execute Phase 1** - Delete 13 obsolete tasks
3. ⏭️ **Create 6 new tasks** - Align with new architecture
4. ⏭️ **Update AGENTS.md** - Document new workflow

### This Week

5. ⏭️ **Implement Phase 2** - Parallel Agent Spawn Middleware
6. ⏭️ **Implement Phase 2** - Orchestrator Main Loop
7. ⏭️ **Implement Phase 2** - MCP Agent Mail Integration

### This Month

8. ⏭️ **Implement Phase 3** - PRD/Generate-Tasks research integration
9. ⏭️ **Test Phase 3** - End-to-end Figma workflow
10. ⏭️ **Decide on VM deployment** - Local vs remote

### Optional (Next Quarter)

11. ⏭️ **Phase 4** - VM setup (if deploying to remote)
12. ⏭️ **Setup monitoring** - Prometheus, Grafana, Alerting
13. ⏭️ **Setup backup** - Automated daily backups
14. ⏭️ **Setup disaster recovery** - Tested restore procedures

---

## Success Criteria

### Phase 1: Consolidation Complete

- [ ] 13 obsolete tasks deleted from Beads
- [ ] 6 new architecture tasks created
- [ ] Task dependencies verified
- [ ] AGENTS.md updated with new workflow

### Phase 2: Core Infrastructure Complete

- [ ] Parallel Agent Spawn Middleware implemented
- [ ] Orchestrator Main Loop implemented
- [ ] MCP Agent Mail integrated end-to-end
- [ ] All tests passing

### Phase 3: Agent Integration Complete

- [ ] PRD Agent can spawn parallel research (optional)
- [ ] Generate-Tasks Agent can spawn parallel research (optional)
- [ ] Research tasks created as Beads tasks
- [ ] End-to-end Figma workflow tested and working

### Phase 4: VM Setup Complete (Optional)

- [ ] VM provisioned with all services
- [ ] MCP Agent Mail server running (systemd)
- [ ] PM2 ecosystem running
- [ ] Monitoring configured (Prometheus + Grafana)
- [ ] Backup automation working
- [ ] Disaster recovery tested

---

## Documents Created

| Document | Location | Purpose |
|----------|------------|--------|
| **Beads Consolidation Plan** | `docs/beads-consolidation-plan.md` | Detailed task cleanup plan |
| **VM Setup Requirements** | `docs/vm-setup-requirements.md` | VM setup guide with monitoring |
| **Architecture Design** | `docs/architecture/parallel-agent-orchestration.md` | New architecture overview |
| **Transition Plan** | `docs/architecture-transition-plan.md` | This document - consolidated roadmap |

---

## Summary

**Status:** Ready to execute Phase 1 (task consolidaton)

**Expected Benefits:**
- ✅ Cleaner task list (aligned with architecture)
- ✅ Clear implementation roadmap
- ✅ VM-ready infrastructure (optional)
- ✅ Support for both local and remote deployment
- ✅ Parallel agent spawning via shared middleware
- ✅ Research tasks as Beads (reusable)
- ✅ Full workflow support: Figma → PRD → Tasks → Implementation

**Timeline:** 2-4 weeks for full implementation (Phase 2-3). VM setup (Phase 4) optional.

