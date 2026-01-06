# Incremental Development Guide - MCP Agent Mail Integration

**Status:** Tasks created in beads with test/fix cycles
**Approach:** Small, testable increments with validation at each step
**Total Tasks:** 59 (with test/fix/verify cycles)

---

## 🎯 Development Philosophy

### Problem with "Big Bang" Approach
- Merge 10+ changes at once
- Something breaks → debug 10 things simultaneously
- Hard to isolate which change caused failure
- Long delay between implementation and feedback

### Our Incremental Approach
- **ONE implementation task at a time**
- **Test immediately after implementation**
- **Fix before proceeding** (if test fails)
- **Verify before moving to next**
- **Clear signal at each step**: ✅ PASS → next task | ❌ FAIL → fix now

---

## 📋 Task Structure (Test-Driven Development)

For every implementation task, we create **3 supporting tasks**:

```
TASK 1.1: Implementation
  ↓ depends on
TEST 1.1: Test implementation  
  ↓ depends on
FIX 1.1: Fix issues (if test fails)
  ↓ depends on
VERIFY 1.1: Verify and approve to proceed

Next increment depends on VERIFY 1.1
```

### Task Role Definitions

**Implementation Task (blue)**
- Code the feature/functionality
- Make changes to files
- Complete acceptance criteria

**Test Task (yellow)**
- Run validation script
- Verify acceptance criteria
- Document pass/fail result
- **DON'T FIX HERE** - only document what's broken

**Fix Task (orange)**  
- Only created if test fails
- Implement fixes for failures
- Re-run test task
- May cycle test/fix multiple times

**Verify Task (green)**
- Review test results
- Confirm no outstanding issues
- Approve moving to next increment
- **Gate before next task starts**

### Beads Command Reference

```bash
# Check what's ready to work on
bd ready --json

# Claim an implementation task (start working)
bd update .factory-6et --status in_progress --json

# After implementing, mark implementing as done
bd close .factory-6et --reason "Implementation complete"

# Run test task (mark as in_progress during testing)
bd update .factory-5mu --status in_progress
# ... run tests ...

# If test passes:
bd close .factory-5mu --reason "All AC met, passing"
bd close .factory-tsc --reason "No issues found"  # Skip fix
bd close .factory-6ak --reason "Verified, ready for next"

# If test fails:
bd close .factory-5mu --reason "Test failed, see notes"
# Take notes on what failed

# Then work on FIX task:
bd update .factory-tsc --status in_progress
# ... implement fixes ...
bd close .factory-tsc --reason "Fixes implemented"

# Re-run test:
bd reopen .factory-5mu --json
bd update .factory-5mu --status in_progress
# ... re-test ...
# Cycle until test passes, then verify and proceed
```

---

## 🚀 Current Tasks Ready to Work On

### Your Immediate Next Task

**Task ID:** `.factory-6et`
**Title:** `Task 1.1: Detect operating mode and initialize MCP`
**Priority:** P2 (MUST HAVE)
**Status:** Ready (open)

**What to implement:**
```python
# Add to droids/orchestrator.md, Pre-Layer section

import sys
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')
from mcp_agent_mail_client import is_mcp_available

def detect_operating_mode():
    """Detect if MCP Agent Mail is available and set mode"""
    if is_mcp_available():
        # MCP available, use coordination mode
        return True
    else:
        # MCP unavailable, use direct delegation
        print("⚠️  MCP Agent Mail not available (Python 3.10+ required)")
        return False

# At session start
USE_MCP = detect_operating_mode()
```

### Files to Modify
- `droids/orchestrator.md` (lines ~465-513 in Pre-Layer section)

### Acceptance Criteria (from PRD requirement 2.1a)
- ✅ Orchestrator detects operating mode (Spec-Fed vs Direct)
- ✅ Initialises MCP Agent Mail accordingly
- ✅ Handles registration failure gracefully

**Estimated Time:** 1-2 hours

---

## 🔄 Incremental Workflow to Follow

### Step 1: Implement Task 1.1

```bash
# Claim the task
bd update .factory-6et --status in_progress --json

# Implement the code changes in droids/orchestrator.md
# ... edit files ...

# When done, close implementation task
bd close .factory-6et --reason "Operating mode detection implemented, MCP initialized"
```

### Step 2: Test Task 1.1

```bash
# Claim the test task
bd update .factory-5mu --status in_progress --json

# Run test script
./test-operating-mode.sh  # Verify USE_MCP flag set correctly

# Check if test passes or fails
echo "Does USE_MCP correctly reflect MCP availability?"
```

**If test PASSES:**
```bash
# Close test as passed
bd close .factory-5mu --reason "All AC met, USE_MCP flag working correctly"
# Skip fix task (no issues)
bd close .factory-tsc --reason "No fixes needed, test passed"
# Run verification
bd update .factory-6ak --status in_progress
# Verify manually... then close
bd close .factory-6ak --reason "Verified working, ready for next"
```

**If test FAILS:**
```bash
# Document what failed
bd close .factory-5mu --reason "Test failed: USE_MCP not set correctly when MCP unavailable"

# Work on FIX task
bd update .factory-tsc --status in_progress
# ... implement fixes ...
bd close .factory-tsc --reason "Fixed USE_MCP initialization logic"

# Re-run test
bd reopen .factory-5mu --json
bd update .factory-5mu --status in_progress
# ... re-test ...

# Repeat until test passes, then verify
```

### Step 3: Continue to Task 1.2

Verification task `.factory-6ak` completion **unlocks** Task 1.2 (`.factory-k8p`)

```bash
# Now Task 1.2 is ready to work on
bd ready --json
# Should show Task 1.2 as ready

# Claim and implement...
bd update .factory-k8p --status in_progress
# ... implement register_agent() call ...
bd close .factory-k8p --reason "Registration implemented"

# Then test/fix/verify cycle for Task 1.2...
# Same pattern as above
```

---

## 📊 All Tasks Created (59 Total)

### Track A: Backend/Infrastructure (Currently Active)

**Phase 2.1a - Orchestrator Registration** (COMPLETE ✅)
- ✅ Task 1.1: Detect operating mode (READY)
- ✅ TEST: Task 1.1 (READY)
- ✅ FIX: Task 1.1 (READY)
- ✅ VERIFY: Task 1.1 (READY)
- ⏭️ Task 1.2: Register orchestrator (BLOCKED - depends on VERIFY 1.1)
- ⏭️ Task 1.3: Graceful failure handling (BLOCKED)

**Phase 2.1b - Orchestrator Messaging** (BLOCKED - depends on Phase 2.1a complete)
- Task 2.1: Send message wrapper (READY)
- Task 2.2: Inbox polling (READY)
- Task 2.3: Usage examples (READY)
- Each has TEST/FIX/VERIFY cycle

### Track B: Droid Updates (Blocked - needs Track A Phase 2 complete)

**Phase 2.2a - PRD Droid** 
- Task 5.1: MCP registration in prd.md (READY)
- Task 5.2: PRD completion messages (BLOCKED)

**Phase 2.2b - Generate-Tasks & Coordinator**
- Task 6.1: generate-tasks.md registration (READY)
- Task 6.2: task-coordinator.md registration (BLOCKED)
- Task 6.3: Verify all Track B droids (BLOCKED)

**Phase 2.2c - Research Droids**
- Task 7.1: Research droid registrations (BLOCKED)

### Tracks C & D: DevOps and Documentation (will be added after A & B)

---

## ✅ Key Principles of This Approach

### 1. TEST BEFORE PROCEEDING
**Rule:** Never move to next task until current task is verified working

**Why:** 
- If 1.1 is broken and we start 1.2, debugging 1.2 will be confusing
- Foundation must be solid before building on it
- Isolates failures to single tasks

### 2. FIX IMMEDIATELY  
**Rule:** If test fails, fix NOW before moving to next increment

**Why:**
- Fresh context = faster fixes
- Prevents debt accumulation
- Each increment is production-ready

### 3. VERIFY AFTER EACH INCREMENT
**Rule:** Explicit verification task before next implementation

**Why:**
- Forces manual review of test results
- Prevents autopilot "just pass tests" mentality
- Confirms entire increment complete (impl + test + potential fix)

### 4. CLEAR DEPENDENCIES
**Rule:** Next task only depends on VERIFY task of previous

**Why:**
- Beads tracks readiness automatically
- Can't accidentally start premature work
- Clear handoff criteria

---

## 🎯 What This Enables

### Small, Testable Increments
Each increment = 1 sub-task (typically 1-3 hours of work)

**Example increment:**
- Implement operating mode detection (1 hour)
- Test it works (15 minutes)
- If fails: fix the detection logic (30 minutes)
- Verify and approve (15 minutes)
- **Total:** 2-3 hours, fully validated

### Isolated Debugging
If Task 1.2 breaks, we know it's in registration code, not mode detection

### Parallel Work (Later)
Once Track A Phase 2 proven:
- Dev 1 continues Track A (Phase 2.1c, 2.1d)
- Dev 2 starts Track B (Phase 2.2a)
- Dev 3 starts Track C (Phase 3.x)

### Production Confidence
Each VERIFY task = "this increment is production-ready"
By end: 61 increments × 3-5 hours = 183-305 hours total, all validated

---

## 📈 Success Metrics

**Test Pass Rate Target:** 90%+
- 1-2 fix cycles per 10 increments is acceptable
- More than that signals implementation issues
- Review patterns if fix rate > 20%

**Increment Velocity Target:** 
- 2-3 increments per developer per day
- 6-8 increments/day with 3 developers in parallel
- Complete track in 1 week, project in 3 weeks

---

## 🔍 Monitoring Progress

### Check Current State
```bash
# What's ready to work on?
bd ready --json

# What's in progress?
bd list --status in_progress --json

# Recent completions?
bd list --status closed --limit 10 --json

# Track progress
bd list --label track-a --json | jq '[.[] | {title: .title, status: .status}]'
```

### Blocked Tasks?
```bash
# Find what's blocked (dependencies not met)
bv --robot-insights  # Shows dependency chains
```

### Velocity Tracking
```bash
# Count tasks by status
bd list --json | jq 'group_by(.status) | map({status: .[0].status, count: length})'
```

---

## 🚀 Starting Your First Increment

**Right Now:**
```bash
# Claim Task 1.1
cd /Users/buddhi/.config/opencode
bd update .factory-6et --status in_progress

# Implement operating mode detection
echo "Add operating mode detection to droids/orchestrator.md..."
# ...edit the file...

# When done
bd close .factory-6et --reason "Implementation complete"

# Then work on TEST 1.1
bd update .factory-5mu --status in_progress
./test-operating-mode.sh  # Your test script

# Pass or fail, follow the cycle
```

---

## 📚 Reference Materials

- **Task Breakdown:** `/tmp/tasks-mcp-agent-mail-atomic.md` (all 61 tasks)
- **Implementation Plan:** `/tmp/IMPLEMENTATION_PLAN.md` (phases and tracks)
- **Development Guide:** This document (incremental workflow)
- **Beads Commands:** See `bd --help` or `bv --help`

---

## 💡 Tips for Success

1. **Start Small**
   - Don't try to implement 3 tasks at once
   - Focus on getting 1.1 → verify → 1.2 → verify rhythm

2. **Test Thoroughly**
   - Don't skip test task even if "looks right"
   - Automated validation catches subtle bugs

3. **Document Failures**
   - When test fails, note exactly what broke
   - Helps identify patterns for future tasks

4. **Ask for Help**
   - If stuck on fix task for >1 hour, escalate
   - Get fresh eyes on the problem

5. **Celebrate Verification**
   - Each VERIFY completion = production-ready increment
   - Build momentum increment by increment

---

## ✅ Ready to Start?

**Your immediate next command:**
```bash
cd /Users/buddhi/.config/opencode
bd update .factory-6et --status in_progress
```

Then implement Task 1.1. You've got this! 🚀

---

**For questions or help:**
- Refer to task breakdown for acceptance criteria
- Check implementation plan for phase dependencies
- Use `bd --help` for command syntax

**Status:** ✅ READY TO IMPLEMENT
**Next:** Task 1.1 (operating mode detection)
