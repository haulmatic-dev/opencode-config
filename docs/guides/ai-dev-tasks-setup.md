# ✅ AI Dev Tasks Integration - Setup Complete

## What Was Installed

Global Droid integration with [ai-dev-tasks](https://github.com/snarktank/ai-dev-tasks) for comprehensive feature planning across all your projects.

---

## 📦 Installation Summary

### ✅ Custom Droids (Global)
Location: `~/.config/opencode/droids/`

1. **prd.json** - `@prd` droid
   - Generates Product Requirements Documents
   - Interactive clarifying questions
   - Comprehensive specifications

2. **generate-tasks.json** - `@generate-tasks` droid
   - Hierarchical task breakdowns
   - Complete parent + sub-task structure
   - File mapping and testing notes

### ✅ Templates (Git Repository)
Location: `~/.config/opencode/templates/ai-dev-tasks/`

- Cloned from: https://github.com/snarktank/ai-dev-tasks
- Current commit: `efbffaa`
- Contains: `create-prd.md`, `generate-tasks.md`, `README.md`, `LICENSE`
- Update with: `git pull origin main`

### ✅ Documentation
- `~/.config/opencode/droids/README-ai-dev-tasks.md` - Full documentation
- `~/.config/opencode/QUICK-START-AI-DEV-TASKS.md` - Quick reference
- `~/.config/opencode/AI-DEV-TASKS-SETUP.md` - This file

### ✅ Helper Scripts
- `~/.config/opencode/scripts/update-templates.sh` - Auto-update templates

---

## 🎯 How to Use

### Basic Usage
```bash
# For complex features:
@prd "Your feature description"
# Answer questions: 1A, 2C, 3B
@generate-tasks "Based on tasks/prd-[feature-name].md"

# For direct task generation:
@generate-tasks "Feature description"
```

### Output Files
- PRD: `tasks/prd-[feature-name].md`
- Tasks: `tasks/tasks-[feature-name].md`

---

## 🔧 Maintenance

### Update Templates
```bash
cd ~/.config/opencode/templates/ai-dev-tasks
git pull origin main
```

Or run:
```bash
~/.config/opencode/scripts/update-templates.sh
```

### Verify Setup
```bash
# Check droids exist
ls -lh ~/.config/opencode/droids/*.json

# Check templates
ls -lh ~/.config/opencode/templates/ai-dev-tasks/

# View git status
cd ~/.config/opencode/templates/ai-dev-tasks && git status
```

---

## 🆚 Key Difference from Original

The original ai-dev-tasks uses a **two-phase** approach for task generation:
1. Generate parent tasks → wait for "Go"
2. Generate sub-tasks → wait for "Go" per parent

Our `@generate-tasks` droid uses a **single-phase** approach:
- Generates complete hierarchy (parent + all sub-tasks) in one output
- Faster workflow, better for seeing full scope immediately
- Still maintains hierarchical structure in output

---

## 📊 Directory Structure

```
~/.config/opencode/
├── droids/
│   ├── prd.json                          # @prd droid
│   ├── generate-tasks.json               # @generate-tasks droid
│   └── README-ai-dev-tasks.md            # Full docs
├── templates/
│   └── ai-dev-tasks/                     # Git repo
│       ├── .git/                         # Git metadata
│       ├── create-prd.md                 # PRD template
│       ├── generate-tasks.md             # Task template
│       ├── README.md                     # Original docs
│       └── LICENSE
├── scripts/
│   └── update-templates.sh               # Update helper
├── QUICK-START-AI-DEV-TASKS.md           # Quick reference
└── AI-DEV-TASKS-SETUP.md                 # This file
```

---

## 🎓 Learning Resources

1. **Quick Start**: Read `~/.config/opencode/QUICK-START-AI-DEV-TASKS.md`
2. **Full Docs**: Read `~/.config/opencode/droids/README-ai-dev-tasks.md`
3. **Original Project**: Visit https://github.com/snarktank/ai-dev-tasks
4. **Templates**: Review `~/.config/opencode/templates/ai-dev-tasks/*.md`

---

## 🔄 Version Info

- **Setup Date**: 2025-11-06
- **Template Version**: efbffaa (2024 latest)
- **Droid Version**: 1.0.0 (custom integration)
- **Repository**: https://github.com/snarktank/ai-dev-tasks

---

## ✨ Next Steps

1. Try it out:
   ```bash
   @prd "Add user authentication with OAuth"
   ```

2. Review the generated PRD in `tasks/prd-user-authentication.md`

3. Generate tasks:
   ```bash
   @generate-tasks "Based on tasks/prd-user-authentication.md"
   ```

4. Implement following `tasks/tasks-user-authentication.md`

5. Read full documentation for advanced usage

---

## 🐛 Troubleshooting

### Droids not showing up
```bash
ls -la ~/.config/opencode/droids/
# Should show prd.json and generate-tasks.json
```

### Templates not found
```bash
ls -la ~/.config/opencode/templates/ai-dev-tasks/
# Should show create-prd.md and generate-tasks.md

# If missing, re-clone:
cd ~/.config/opencode/templates
rm -rf ai-dev-tasks
git clone https://github.com/snarktank/ai-dev-tasks.git
```

### Need to customize
Fork the repo or create a custom branch:
```bash
cd ~/.config/opencode/templates/ai-dev-tasks
git checkout -b team-customizations
# Edit templates
git commit -am "Team customizations"
```

---

## 📞 Support

- Droid Documentation: https://docs.factory.ai
- ai-dev-tasks Issues: https://github.com/snarktank/ai-dev-tasks/issues
- Local Docs: `~/.config/opencode/droids/README-ai-dev-tasks.md`

---

**Installation completed successfully! 🎉**

You can now use `@prd` and `@generate-tasks` in any project.
