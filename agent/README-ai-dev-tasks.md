---
name: README-ai-dev-tasks
---
This directory contains custom droids that integrate the [ai-dev-tasks](https://github.com/snarktank/ai-dev-tasks) planning methodology with Droid for comprehensive feature planning.

These droids are available globally across all projects.

## Available Droids

### 1. `@prd` - Product Requirements Document Generator
**File:** `prd.json`  
**Model:** `claude-sonnet-4-5` (fixed model, overrides default)

Generates comprehensive PRDs for software features with clarifying questions and detailed specifications.

**Usage:**
```
@prd <feature description>
```

**Example:**
```
@prd "Add a user profile editing feature where users can update their avatar, bio, and contact preferences"
```

**Workflow:**
1. Asks 3-5 clarifying questions with multiple-choice options
2. User responds with selections (e.g., "1A, 2C, 3B")
3. Generates detailed PRD saved as `tasks/prd-[feature-name].md`

**PRD Structure:**
- Introduction/Overview
- Goals (measurable objectives)
- User Stories
- Functional Requirements (numbered)
- Non-Goals (Out of Scope)
- Design Considerations
- Technical Considerations
- Success Metrics
- Open Questions

---
### 2. `@generate-tasks` - Hierarchical Task Generator
**File:** `generate-tasks.json`  
**Model:** `claude-sonnet-4-5` (fixed model, overrides default)

Transforms PRDs or feature descriptions into complete hierarchical task breakdowns.

**Usage:**
```
@generate-tasks <PRD or feature description>
```

**Examples:**
```
@generate-tasks "Based on tasks/prd-user-profile-editing.md"
@generate-tasks "Implement OAuth login with Google and GitHub"
```

**Output:**
- Complete task hierarchy (parent + sub-tasks) in one output
- Task 0.0: Create feature branch
- Parent tasks (1.0, 2.0, etc): ~5 high-level phases
- Sub-tasks (1.1, 1.2, etc): Detailed implementation steps
- Relevant Files section (source + test files)
- Testing notes and completion instructions
- Saved as `tasks/tasks-[feature-name].md`

---
## Recommended Workflow

### For Complex Features:
```bash
# Step 1: Create PRD
@prd "Your complex feature description"

# Step 2: Answer clarifying questions
1A, 2C, 3B

# Step 3: Generate tasks from PRD
@generate-tasks "Based on tasks/prd-[feature-name].md"

# Step 4: Review and implement
# The generated tasks/tasks-[feature-name].md has checkboxes [ ] to track progress
```

### For Simple Features:
```bash
# Use bd create for quick tasks
# No need for PRD overhead

@task-coordinator "Create a task for X"
# Or use bd directly:
# bd create "Task title" --description="..." -t task -p 2
```

---
## Directory Structure

```
~/.config/opencode/
├── droids/
│   ├── prd.json                      # @prd droid configuration
│   ├── generate-tasks.json           # @generate-tasks droid configuration
│   └── README-ai-dev-tasks.md        # This file
└── templates/
    └── ai-dev-tasks/                 # Cloned repository
        ├── .git/                     # Git repository
        ├── create-prd.md             # PRD generation template
        ├── generate-tasks.md         # Task generation template
        ├── README.md                 # Original project README
        └── LICENSE
```

---
## Updating Templates

The templates are stored as a git repository. To get the latest updates:

```bash
cd ~/.config/opencode/templates/ai-dev-tasks
git pull origin main
```

This ensures you always have the latest improvements from the upstream project.

---
## Comparison: When to Use What?

### Use `@prd` + `@generate-tasks` when:
- ✅ Feature is complex (multiple components, services, integrations)
- ✅ Need stakeholder alignment before coding
- ✅ Requires clear scope boundaries and success metrics
- ✅ Working with team members who need detailed specs
- ✅ Feature will take >1 week to implement
- ✅ Requirements are unclear or need refinement

### Use `@task-coordinator` or `bd create` directly when:
- ✅ Simple bug fix or small enhancement
- ✅ Requirements are already crystal clear
- ✅ Solo project where you're both author and stakeholder
- ✅ Need to start coding immediately
- ✅ Feature will take <3 days to implement
- ✅ Rapid prototyping phase

For simple task management:
```bash
bd create "Task title" --description="..." -t task -p 2
```

---
## Key Differences from Original ai-dev-tasks

1. **Single-phase task generation**: `@generate-tasks` generates complete hierarchy (parent + sub-tasks) in one output, not two phases
2. **Native Droid integration**: Invoked with `@` prefix like any Droid tool
3. **Git-tracked templates**: Easy to update with `git pull`
4. **Global availability**: Works across all projects from `~/.config/opencode/`
5. **Works with Droid workflows**: Output can be used with other Droid tools
6. **Fixed model**: Both droids use Claude Sonnet 4.5 regardless of your default model setting

---
## Customizing the Model

Both droids are configured to use `claude-3-5-sonnet-20241022` by default. To change the model:

1. Edit the droid JSON file:
   ```bash
   # For @prd:
   nano ~/.config/opencode/droids/prd.json
   
   # For @generate-tasks:
   nano ~/.config/opencode/droids/generate-tasks.json
   ```

2. Modify the `"model"` field:
   ```json
   {
     "identifier": "prd",
     "description": "...",
     "model": "gpt-4-turbo",  // Change this to your preferred model
     "systemPrompt": "..."
   }
   ```

3. Available models include:
   - `claude-sonnet-4-5` (default, recommended for planning)
   - `claude-3-5-sonnet-20241022`
   - `gpt-4-turbo`
   - `gpt-4o`
   - Any custom models from your `~/.config/opencode/config.json`

---
## Customizing for Your Team

If you want to customize the templates for your team's conventions:

### Option 1: Fork and Use Your Fork
```bash
cd ~/.config/opencode/templates
rm -rf ai-dev-tasks
git clone https://github.com/yourteam/ai-dev-tasks.git
```

### Option 2: Modify Locally (with manual merge on updates)
```bash
cd ~/.config/opencode/templates/ai-dev-tasks
# Edit create-prd.md or generate-tasks.md
git add -A
git commit -m "Customize for team conventions"
```

When updating:
```bash
git pull origin main  # May need to resolve merge conflicts
```

### Option 3: Create a Custom Branch
```bash
cd ~/.config/opencode/templates/ai-dev-tasks
git checkout -b team-customizations
# Make your changes
git commit -m "Team customizations"

# To update from upstream:
git fetch origin
git merge origin/main
```

---
## Example Output Quality

For a complex requirement like "Build a multi-tenant SaaS billing system with usage-based pricing":

### `@prd` Output:
- 2-3 page detailed PRD
- 5-7 specific goals
- 7-10 user stories
- 15-20 functional requirements
- Clear scope boundaries
- Success metrics (e.g., "99.9% billing accuracy")

### `@generate-tasks` Output:
- ~6 parent tasks
- ~30-40 sub-tasks total
- Complete file list with descriptions
- Testing strategy
- Implementation order

This level of detail prevents:
- ❌ Scope creep
- ❌ Missing requirements discovered late
- ❌ Unclear success criteria
- ❌ Poor time estimates

---
## Troubleshooting

### Droids not showing up
```bash
# Verify droid files exist
ls -la ~/.config/opencode/droids/prd.json
ls -la ~/.config/opencode/droids/generate-tasks.json

# Restart your Droid session
```

### Templates not found
```bash
# Verify templates are cloned
ls -la ~/.config/opencode/templates/ai-dev-tasks/

# Re-clone if needed
cd ~/.config/opencode/templates
rm -rf ai-dev-tasks
git clone https://github.com/snarktank/ai-dev-tasks.git
```

### Want to use project-specific customizations
You can create project-level overrides in `.config/opencode/droids/` within your project directory. They will take precedence over global droids.

---
## More Information

- Original project: https://github.com/snarktank/ai-dev-tasks
- Droid documentation: https://docs.factory.ai
- Template files: `~/.config/opencode/templates/ai-dev-tasks/`
