---
description: Initialize opencode - Check tools, install missing, start services, initialize workspace
agent: build
---

You are an opencode initialization assistant. Use the `question` tool to present options to the user for interactive selection.

## Step 1: Check System Tools

Run these commands to get the system tools status:

```
command -v cm && echo "cm: INSTALLED" || echo "cm: MISSING"
command -v bd && echo "bd: INSTALLED" || echo "bd: MISSING"
command -v bv && echo "bv: INSTALLED" || echo "bv: MISSING"
command -v tldr && echo "tldr: INSTALLED" || echo "tldr: MISSING"
command -v biome && echo "biome: INSTALLED" || echo "biome: MISSING"
command -v prettier && echo "prettier: INSTALLED" || echo "prettier: MISSING"
command -v ubs && echo "ubs: INSTALLED" || echo "ubs: MISSING"
command -v opencode-init && echo "opencode-init: IN_PATH" || echo "opencode-init: NOT_IN_PATH"
```

## Step 2: Check Running Services

Run these commands to get the services status:

```
# Check TLDR daemon
TLDR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
[ "$TLDR_STATUS" = "200" ] && echo "tldr: RUNNING" || echo "tldr: STOPPED"

# Check GPTCache
GPTCACHE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/cache_status 2>/dev/null || echo "000")
[ "$GPTCACHE_STATUS" = "200" ] && echo "gptcache: RUNNING" || echo "gptcache: STOPPED"

# Check cass_memory
pgrep -f "cass_memory" > /dev/null 2>&1 && echo "cass_memory: RUNNING" || echo "cass_memory: STOPPED"
```

## Step 3: Check Workspace Initialization

Run these commands to get the workspace status:

```
[ -d ".git" ] && echo "git: INITIALIZED" || echo "git: NOT_INITIALIZED"
[ -d ".beads" ] && echo "beads: INITIALIZED" || echo "beads: NOT_INITIALIZED"
[ -d ".cass" ] && echo "cass_workspace: INITIALIZED" || echo "cass_workspace: NOT_INITIALIZED"
[ -d ".tldr" ] && echo "tldr_index: CREATED" || echo "tldr_index: NOT_CREATED"
[ -f "biome.json" ] && echo "biome: PRESENT" || echo "biome: MISSING"
[ -f ".prettierrc" ] && echo "prettier: PRESENT" || echo "prettier: MISSING"
[ -f "opencode.json" ] && echo "opencode_json: PRESENT" || echo "opencode_json: MISSING"
[ -f ".git/hooks/pre-commit" ] && echo "git_hooks: INSTALLED" || echo "git_hooks: NOT_INSTALLED"
```

## Step 4: Present Status Report

Create a clear status report with emoji:

### 🛠️ System Tools

| Tool              | Status            |
| ----------------- | ----------------- |
| cm (cass_memory)  | INSTALLED/MISSING |
| bd (Beads CLI)    | INSTALLED/MISSING |
| bv (Beads Viewer) | INSTALLED/MISSING |
| TLDR              | INSTALLED/MISSING |
| Biome             | INSTALLED/MISSING |
| Prettier          | INSTALLED/MISSING |
| UBS               | INSTALLED/MISSING |

### 🔄 Services

| Service     | Status          | Port |
| ----------- | --------------- | ---- |
| TLDR daemon | RUNNING/STOPPED | 3000 |
| GPTCache    | RUNNING/STOPPED | 8000 |
| cass_memory | RUNNING/STOPPED | -    |

### 📁 Workspace

| Component     | Status                      |
| ------------- | --------------------------- |
| Git           | INITIALIZED/NOT_INITIALIZED |
| Beads         | INITIALIZED/NOT_INITIALIZED |
| cass_memory   | INITIALIZED/NOT_INITIALIZED |
| TLDR index    | CREATED/NOT_CREATED         |
| biome.json    | PRESENT/MISSING             |
| .prettierrc   | PRESENT/MISSING             |
| opencode.json | PRESENT/MISSING             |
| Git hooks     | INSTALLED/NOT_INSTALLED     |

## Step 5: Use question Tool for Interactive Selection

Use the `question` tool to present options:

```javascript
await question({
  questions: [
    {
      header: 'OpenCode Setup',
      question: 'What would you like to do? Select an option:',
      options: [
        {
          label: 'Install Tools',
          description: 'Install missing system tools (~5 min)',
        },
        {
          label: 'Start Services',
          description: 'Start TLDR, GPTCache, and cass_memory',
        },
        {
          label: 'Init Workspace',
          description: 'Initialize this project workspace',
        },
        {
          label: 'Do All',
          description: 'Install tools, start services, init workspace',
        },
        {
          label: 'Skip',
          description: "Don't do anything",
        },
      ],
    },
  ],
});
```

## Step 6: Execute Based on Selection

Based on the user's selection, execute the appropriate commands:

### If "Install Tools" or "Do All":

Run: `~/.config/opencode/bin/opencode-init --quiet`

### If "Start Services" or "Do All":

Run these commands:

```
# Start TLDR daemon (if installed)
command -v tldr && tldr daemon start 2>/dev/null

# Start GPTCache (if installed)
command -v gptcache-server && gptcache-server &

# Start cass_memory (if installed)
command -v cass_memory && cass_memory --daemon & 2>/dev/null || cass_memory serve & 2>/dev/null
```

### If "Init Workspace" or "Do All":

Run: `~/.config/opencode/bin/workspace-init --force`

## Step 7: Report Results

After execution, provide a clear summary:

### ✅ Completed Actions

- List all actions that were performed
- List all tools installed
- List all services started
- List all workspace components initialized

### ❌ Errors

- Report any errors that occurred
- Suggest fixes if possible

### 💡 Next Steps

- Suggest useful commands to run next
- Example: "Run `bd ready` to see available tasks"
- Example: "Run `cm context \"your task\"` to get context"

## Important Notes

- Always use the `question` tool for user selection - don't ask them to type responses
- Be clear about what will happen before executing
- Use emoji (✅ ❌ ⚠️ 🔄 🛠️ 📁 🔄) for visual clarity
- Confirm successful startup of services
- Report errors in a user-friendly way
