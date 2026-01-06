# AI Dev Tasks Integration - Team Setup Guide

## Overview

This document explains our custom Droid integration with the [ai-dev-tasks](https://github.com/snarktank/ai-dev-tasks) methodology for comprehensive feature planning. This setup provides team-wide access to sophisticated planning tools without the overhead of separate installations or tools.

---

## The Problem We're Solving

**Standard Droid Task Management (bd):**
- ✅ Fast and lightweight with `bd create`
- ✅ Great for simple tasks and bug fixes
- ❌ Limited structure for complex features
- ❌ No formal requirements documentation
- ❌ Flat task list (hard to estimate complex work)
- ❌ Missing scope boundaries and success criteria

**Complex Features Need:**
- Comprehensive requirements documentation (PRDs)
- Hierarchical task breakdowns (parent → sub-tasks)
- Clear scope boundaries (what's IN and what's OUT)
- Success metrics and acceptance criteria
- Stakeholder alignment before coding starts
- Better time estimation through task hierarchy

---

## The Solution: Two Custom Droids

We've integrated the ai-dev-tasks methodology into Droid through two custom droids that are available globally across all projects:

### 1. `@prd` - Product Requirements Document Generator
**Purpose:** Transform feature ideas into comprehensive, structured requirements documents

**What it does:**
1. Asks 3-5 clarifying questions with multiple-choice options
2. Generates a detailed PRD with:
   - Introduction/Overview
   - Goals (measurable objectives)
   - User Stories
   - Functional Requirements (numbered)
   - Non-Goals (explicit scope boundaries)
   - Design Considerations
   - Technical Considerations
   - Success Metrics
   - Open Questions

**When to use:**
- Complex multi-component features
- Unclear or ambiguous requirements
- Need stakeholder alignment
- Features taking >1 week
- Team collaboration required

### 2. `@generate-tasks` - Hierarchical Task Generator
**Purpose:** Convert PRDs or feature descriptions into implementation-ready task lists

**What it does:**
1. Analyzes requirements and scope
2. Generates complete hierarchical structure:
   - Task 0.0: Feature branch creation
   - Parent tasks (1.0, 2.0, etc.): ~5 high-level phases
   - Sub-tasks (1.1, 1.2, etc.): Detailed implementation steps
3. Identifies relevant files to modify
4. Includes testing notes and instructions
5. Creates markdown checklist with [ ] checkboxes

**When to use:**
- After creating a PRD
- Directly for medium-complexity features
- When you need structured implementation guidance
- To estimate work more accurately

---

## Design Decisions & Rationale

### Why Global Setup (`~/.config/opencode/` vs Project-Level)

**Decision:** Install in `~/.config/opencode/` instead of per-project `.config/opencode/`

**Rationale:**
- ✅ Available across all projects immediately
- ✅ Single source of truth for templates
- ✅ Easy to update once, applies everywhere
- ✅ No project directory pollution
- ✅ Consistent planning methodology across team

### Why Git-Tracked Templates

**Decision:** Clone the ai-dev-tasks repo instead of copying files

**Rationale:**
- ✅ Easy updates: `git pull` gets latest improvements
- ✅ Can track changes upstream
- ✅ Can fork and customize for team needs
- ✅ Version control for template modifications
- ✅ Transparent update history

### Why Single-Phase Task Generation

**Decision:** Modified `@generate-tasks` to output complete hierarchy in one response

**Original ai-dev-tasks approach:**
1. Generate parent tasks → wait for "Go"
2. For each parent → expand to sub-tasks → wait for "Go"

**Our approach:**
1. Generate complete hierarchy (parents + all sub-tasks) → done

**Rationale:**
- ✅ Faster workflow (1 interaction vs 3-5)
- ✅ See full scope immediately for better estimates
- ✅ Better integration with Droid's interactive model
- ✅ Still maintains hierarchical structure in output
- ⚠️ Trade-off: Longer initial output, less refinement opportunity

### Why Fixed Model (Claude Sonnet 4.5)

**Decision:** Both droids always use Claude Sonnet 4.5, regardless of default model

**Rationale:**
- ✅ Consistent output quality across team
- ✅ Planning benefits from reasoning-optimized model
- ✅ Prevents degraded output if someone's default is a weaker model
- ✅ Can be changed per-droid if needed
- ✅ Doesn't affect other Droid operations

---

## Setup Instructions for Team Members

### Prerequisites
- Droid CLI installed and configured
- Git installed
- Access to your `~/.config/opencode/` directory

### Installation Steps

**Step 1: Create Directory Structure**
```bash
mkdir -p ~/.config/opencode/droids ~/.config/opencode/templates
```

**Step 2: Clone Templates Repository**
```bash
cd ~/.config/opencode/templates
git clone https://github.com/snarktank/ai-dev-tasks.git
```

**Step 3: Create PRD Droid**

Create file: `~/.config/opencode/droids/prd.json`

```json
{
  "identifier": "prd",
  "description": "This droid generates comprehensive Product Requirements Documents (PRDs) for software features by first gathering essential context through structured clarifying questions, then producing detailed, developer-ready specifications. It focuses exclusively on documentation—defining what to build and why—without implementing solutions. The droid ensures PRDs are explicit, unambiguous, and suitable for junior developers, covering goals, user stories, functional requirements, non-goals, success metrics, and open questions.",
  "model": "claude-sonnet-4-5",
  "systemPrompt": "You are a Product Requirements Document (PRD) specialist who transforms feature requests into comprehensive, developer-ready specifications. Follow the template and guidelines in ~/.config/opencode/templates/ai-dev-tasks/create-prd.md.\n\nYour workflow is strictly two-phased:\n\nPHASE 1 - Clarifying Questions:\nAsk 3-5 essential clarifying questions formatted as numbered items with lettered multiple-choice options. Example format:\n1. What is the primary goal of this feature?\n   A. Improve user onboarding\n   B. Increase retention\n   C. Reduce support burden\n   D. Generate revenue\n\nMake it easy for users to respond with answers like '1A, 2C, 3B'. Only ask questions when answers aren't reasonably inferable from the prompt.\n\nPHASE 2 - Generate PRD:\nAfter receiving answers, generate a detailed PRD with this structure:\n- Introduction/Overview: Feature description and problem it solves\n- Goals: Specific, measurable objectives\n- User Stories: Narrative format describing usage and benefits\n- Functional Requirements: Numbered list of specific functionalities\n- Non-Goals (Out of Scope): What this feature will NOT include\n- Design Considerations (Optional): UI/UX requirements, mockups\n- Technical Considerations (Optional): Technical constraints, dependencies\n- Success Metrics: How to measure feature success\n- Open Questions: Remaining areas needing clarification\n\nWrite for junior developers: be explicit, avoid jargon, focus on WHAT and WHY (never HOW). Keep requirements atomic and testable. Save output as 'prd-[feature-name].md' in the /tasks directory. Never suggest implementation steps or start coding—your role ends at documentation. Ensure every PRD is actionable and unambiguous."
}
```

**Step 4: Create Generate-Tasks Droid**

Create file: `~/.config/opencode/droids/generate-tasks.json`

```json
{
  "identifier": "generate-tasks",
  "description": "This droid transforms product requirements and feature descriptions into comprehensive, hierarchical task breakdowns optimized for implementation by junior developers. It produces complete markdown task lists in a single pass, organizing work into parent phases and detailed sub-tasks with clear file mappings, testing guidance, and actionable steps. All outputs follow a standardized checklist format and are saved to the /tasks directory as tasks-[feature-name].md files.",
  "model": "claude-sonnet-4-5",
  "systemPrompt": "You are a hierarchical task breakdown specialist for software development projects. Follow the template and guidelines in ~/.config/opencode/templates/ai-dev-tasks/generate-tasks.md, with ONE KEY MODIFICATION: Generate the complete task hierarchy (parent tasks AND sub-tasks) in a single output instead of waiting for confirmation between phases.\n\nYour mission is to analyze PRDs or feature descriptions and generate complete, implementation-ready task lists.\n\nStructure every task list as follows:\n\n1. **Relevant Files Section First:**\n   List all source and test files that will need creation or modification:\n   - `path/to/file.ts` - Description of why relevant\n   - `path/to/file.test.ts` - Unit tests for file.ts\n   Include testing notes (Jest commands, test file locations)\n\n2. **Instructions for Completing Tasks:**\n   Explain how to check off tasks by changing `- [ ]` to `- [x]`\n\n3. **Complete Task Hierarchy:**\n   - Task 0.0: Create feature branch (omit only if user explicitly says no branch)\n     - 0.1: Create and checkout new branch (e.g., `git checkout -b feature/[feature-name]`)\n   - Parent tasks (1.0, 2.0, etc.): 4-6 major implementation phases\n     - Sub-tasks (1.1, 1.2, etc.): 2-5 concrete, actionable steps per parent\n   - Each sub-task must specify:\n     * What to do (using imperative verbs: Create, Implement, Add, Test)\n     * Which files to modify\n     * What success looks like\n\nFormat as markdown with [ ] checkboxes for each task. Write for junior developers with explicit, specific instructions. Avoid vague tasks like 'implement feature'—every task must specify concrete deliverables.\n\nSave output as 'tasks-[feature-name].md' in /tasks directory.\n\nIMPORTANT: Generate the COMPLETE hierarchy in one output—both parent tasks and all their sub-tasks. Do not wait for confirmation or split into multiple phases."
}
```

**Step 5: Verify Installation**
```bash
# Check droids are created
ls -lh ~/.config/opencode/droids/*.json

# Check templates are cloned
ls -lh ~/.config/opencode/templates/ai-dev-tasks/

# Verify git repository
cd ~/.config/opencode/templates/ai-dev-tasks && git remote -v
```

Expected output:
```
~/.config/opencode/droids/prd.json
~/.config/opencode/droids/generate-tasks.json
~/.config/opencode/templates/ai-dev-tasks/create-prd.md
~/.config/opencode/templates/ai-dev-tasks/generate-tasks.md
origin  https://github.com/snarktank/ai-dev-tasks.git (fetch)
```

**Step 6: Test the Setup**
```bash
# Start Droid in any project directory
droid

# Test @prd
@prd "Add user authentication with email/password"

# After answering questions, test @generate-tasks
@generate-tasks "Based on tasks/prd-user-authentication.md"
```

---

## Usage Workflow

### For Complex Features

```bash
# 1. Generate PRD
@prd "Build a notification system with email, SMS, and push notifications that supports user preferences, delivery scheduling, and retry logic"

# 2. Answer clarifying questions
1A, 2C, 3B, 4D

# 3. Review generated PRD
# File created at: tasks/prd-notification-system.md

# 4. Generate implementation tasks
@generate-tasks "Based on tasks/prd-notification-system.md"

# 5. Review and implement
# File created at: tasks/tasks-notification-system.md
# Check off tasks as you complete them: - [ ] → - [x]
```

### For Medium Features (Skip PRD)

```bash
# Generate tasks directly with detailed description
@generate-tasks "Implement OAuth login with Google and GitHub. Should support account linking, handle token refresh, and store user profile data. Include error handling for auth failures."
```

### For Simple Features

```bash
# Use `bd create` or `@task-coordinator` for quick task creation
# Just describe what you need, Droid will create tasks in beads
```

---

## Decision Matrix: Which Tool to Use?

| Scenario | Tool | Why |
|----------|------|-----|
| Multi-component feature (>3 services) | `@prd` + `@generate-tasks` | Need comprehensive planning and scope management |
| Unclear requirements | `@prd` + `@generate-tasks` | Clarifying questions ensure you build the right thing |
| Stakeholder sign-off needed | `@prd` + `@generate-tasks` | PRD serves as contract and documentation |
| >1 week implementation | `@prd` + `@generate-tasks` | Hierarchical breakdown improves estimates |
| Team collaboration | `@prd` + `@generate-tasks` | Shared understanding through documentation |
| Medium feature (3-5 days) | `@generate-tasks` only | Get structured tasks without PRD overhead |
| Well-defined feature | `@generate-tasks` only | Requirements clear, just need implementation plan |
| Bug fix | `bd create` | Fast, no planning overhead needed |
| Simple enhancement (<1 day) | `bd create` | Overkill to create formal planning docs |
| Rapid prototyping | `bd create` | Speed matters more than structure |

---

## Maintenance & Updates

### Updating Templates

The templates are git-tracked. To get latest improvements:

```bash
cd ~/.config/opencode/templates/ai-dev-tasks
git pull origin main
```

**Recommended:** Update monthly or when significant changes are announced in the [ai-dev-tasks repository](https://github.com/snarktank/ai-dev-tasks).

### Customizing the Model

If Claude Sonnet 4.5 isn't available or you prefer a different model:

1. Edit the droid file:
   ```bash
   nano ~/.config/opencode/droids/prd.json
   # or
   nano ~/.config/opencode/droids/generate-tasks.json
   ```

2. Change the `"model"` field:
   ```json
   {
     "identifier": "prd",
     "model": "gpt-4o",  // Change to preferred model
     "systemPrompt": "..."
   }
   ```

3. Save and the change takes effect immediately

Available models:
- `claude-sonnet-4-5` (current default)
- `claude-3-5-sonnet-20241022`
- `gpt-4-turbo`
- `gpt-4o`
- Any custom models from `~/.config/opencode/config.json`

### Team Customizations

If your team wants different templates or conventions:

**Option 1: Fork the Repository**
```bash
# Your team forks https://github.com/snarktank/ai-dev-tasks
# Then each team member clones your fork:
cd ~/.config/opencode/templates
rm -rf ai-dev-tasks
git clone https://github.com/yourteam/ai-dev-tasks.git
```

**Option 2: Custom Branch**
```bash
cd ~/.config/opencode/templates/ai-dev-tasks
git checkout -b team-customizations
# Make your changes to create-prd.md or generate-tasks.md
git commit -am "Add team-specific conventions"

# To update from upstream:
git fetch origin
git merge origin/main
```

---

## Expected Output Examples

### PRD Output (`@prd`)

Generated file: `tasks/prd-[feature-name].md`

Typical size: 2-4 pages

Contents:
- 1-2 paragraph overview
- 3-5 measurable goals
- 5-10 user stories
- 10-20 numbered functional requirements
- Explicit out-of-scope items
- Success metrics with targets
- Open questions

### Task List Output (`@generate-tasks`)

Generated file: `tasks/tasks-[feature-name].md`

Typical structure:
- Relevant Files section (5-15 files)
- Task 0.0: Branch creation
- 4-6 parent tasks (1.0, 2.0, etc.)
- 20-40 sub-tasks total (detailed implementation steps)
- Testing notes and commands
- Checkboxes for progress tracking

---

## Troubleshooting

### Droids Not Showing Up

**Problem:** `@prd` or `@generate-tasks` not recognized

**Solution:**
```bash
# Verify files exist
ls -la ~/.config/opencode/droids/prd.json
ls -la ~/.config/opencode/droids/generate-tasks.json

# Check JSON is valid
cat ~/.config/opencode/droids/prd.json | python -m json.tool

# Restart Droid session
exit
droid
```

### Templates Not Found Error

**Problem:** Droid says it can't find templates

**Solution:**
```bash
# Verify templates exist
ls -la ~/.config/opencode/templates/ai-dev-tasks/create-prd.md
ls -la ~/.config/opencode/templates/ai-dev-tasks/generate-tasks.md

# Re-clone if needed
cd ~/.config/opencode/templates
rm -rf ai-dev-tasks
git clone https://github.com/snarktank/ai-dev-tasks.git
```

### Model Not Available Error

**Problem:** Claude Sonnet 4.5 not available in your Droid setup

**Solution:**
Change model in both droid files to an available model:
```bash
# Edit both files
nano ~/.config/opencode/droids/prd.json
nano ~/.config/opencode/droids/generate-tasks.json

# Change "model": "claude-sonnet-4-5" to "model": "gpt-4o"
# Or check available models: cat ~/.config/opencode/config.json
```

### Output Quality Issues

**Problem:** Generated PRDs or tasks are too vague or missing details

**Solution:**
1. Provide more context in your initial prompt
2. Be specific about constraints and requirements
3. Mention technology stack and existing architecture
4. Specify target users and use cases
5. Answer clarifying questions thoroughly (don't skip)

---

## Best Practices

### Writing Good Prompts for @prd

**❌ Bad:**
```
@prd "Add notifications"
```

**✅ Good:**
```
@prd "Build a notification system that sends alerts to users via email, SMS, and push notifications. Users should be able to set preferences for which notifications they receive and how. The system needs to handle delivery failures with retry logic and support scheduled notifications for future delivery."
```

### Writing Good Prompts for @generate-tasks

**❌ Bad:**
```
@generate-tasks "Implement the feature"
```

**✅ Good:**
```
@generate-tasks "Based on tasks/prd-notification-system.md. We're using Node.js with Express, PostgreSQL database, Redis for queuing, SendGrid for email, and Twilio for SMS. Need to integrate with existing user authentication system."
```

### Task Tracking Tips

1. **Check off tasks as you complete them:** Change `- [ ]` to `- [x]`
2. **Update the file after each sub-task:** Helps track progress
3. **Add notes:** Comment in the file if you deviate from plan
4. **Reference in PRs:** Link to the task file in your pull requests
5. **Archive completed tasks:** Move to `tasks/completed/` when done

---

## FAQ

**Q: Can I use this for personal projects?**  
A: Yes! It's installed globally in `~/.config/opencode/`, works for all projects.

**Q: Does this replace TodoWrite?**  
A: No, it complements it. Use TodoWrite for simple tasks, these droids for complex features.

**Q: Can I customize the templates?**  
A: Yes, edit files in `~/.config/opencode/templates/ai-dev-tasks/` or fork the repo.

**Q: Will updates break my customizations?**  
A: If you edit templates directly, `git pull` may conflict. Use a custom branch to manage this.

**Q: Can different team members use different models?**  
A: Yes, each person can edit their local `prd.json` and `generate-tasks.json` files.

**Q: Do the generated files get committed?**  
A: That's up to you. Many teams commit PRDs for documentation, may skip task lists as they're working documents.

**Q: What if ai-dev-tasks repository is updated?**  
A: Run `git pull` in `~/.config/opencode/templates/ai-dev-tasks/` to get latest changes.

---

## Additional Resources

- **Original Project:** https://github.com/snarktank/ai-dev-tasks
- **Droid Documentation:** https://docs.factory.ai
- **Quick Reference:** `~/.config/opencode/QUICK-START-AI-DEV-TASKS.md`
- **Full Documentation:** `~/.config/opencode/droids/README-ai-dev-tasks.md`
- **Setup Verification:** `~/.config/opencode/AI-DEV-TASKS-SETUP.md`

---

## Summary

This setup provides your team with:
- ✅ Consistent planning methodology across all projects
- ✅ Comprehensive documentation for complex features
- ✅ Structured task breakdowns for better estimates
- ✅ Scope management and success criteria
- ✅ Zero per-project setup overhead
- ✅ Easy to maintain and update

Use `@prd` + `@generate-tasks` for complex features, use `bd create` or `@task-coordinator` for simple tasks. Both approaches work together to provide the right tool for the job.

---

**Setup Time:** ~5 minutes  
**Maintenance:** ~5 minutes/month (template updates)  
**Value:** Better planning, fewer misses, improved estimates

Happy planning! 🚀
