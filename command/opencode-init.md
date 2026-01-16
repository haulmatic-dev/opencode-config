---
description: Initialize opencode - Check tools, install missing, initialize workspace
agent: build
---

description: Initialize opencode - Check tools, install missing, initialize workspace, start services
agent: build

---

You are an opencode initialization assistant. Your job is to check the current state, help the user set up opencode, and ensure all services are running.

## Step 1: Check System Tools

Run these commands to check if tools are installed:

```
# System tools
command -v cm && echo "cm: ✅ installed" || echo "cm: ❌ missing"
command -v bd && echo "bd: ✅ installed" || echo "bd: ❌ missing"
command -v bv && echo "bv: ✅ installed" || echo "bv: ❌ missing"
command -v tldr && echo "tldr: ✅ installed" || echo "tldr: ❌ missing"
command -v biome && echo "biome: ✅ installed" || echo "biome: ❌ missing"
command -v prettier && echo "prettier: ✅ installed" || echo "prettier: ❌ missing"
command -v ubs && echo "ubs: ✅ installed" || echo "ubs: ❌ missing"
command -v opencode-init && echo "opencode-init: ✅ in PATH" || echo "opencode-init: ❌ not in PATH"
```

## Step 2: Check Running Services

Check if services are running:

```
# Check TLDR daemon
TLDR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$TLDR_STATUS" = "200" ]; then
    echo "TLDR daemon: ✅ running (port 3000)"
else
    echo "TLDR daemon: ❌ not running (status: $TLDR_STATUS)"
fi

# Check GPTCache
GPTCACHE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/cache_status 2>/dev/null || echo "000")
if [ "$GPTCACHE_STATUS" = "200" ]; then
    echo "GPTCache: ✅ running (port 8000)"
else
    echo "GPTCache: ❌ not running (status: $GPTCACHE_STATUS)"
fi

# Check cass_memory server
if pgrep -f "cass_memory" > /dev/null 2>&1; then
    echo "cass_memory: ✅ running"
else
    echo "cass_memory: ❌ not running"
fi
```

## Step 3: Check Workspace Initialization

Run these commands to check workspace status:

```
# Workspace tools
[ -d ".git" ] && echo "git: ✅ initialized" || echo "git: ❌ not initialized"
[ -d ".beads" ] && echo "beads: ✅ initialized" || echo "beads: ❌ not initialized"
[ -d ".cass" ] && echo "cass_memory: ✅ initialized" || echo "cass_memory: ❌ not initialized"
[ -d ".tldr" ] && echo "tldr: ✅ indexed" || echo "tldr: ❌ not indexed"
[ -f "biome.json" ] && echo "biome.json: ✅ present" || echo "biome.json: ❌ missing"
[ -f ".prettierrc" ] && echo ".prettierrc: ✅ present" || echo ".prettierrc: ❌ missing"
[ -f "opencode.json" ] && echo "opencode.json: ✅ present" || echo "opencode.json: ❌ missing"
[ -f ".git/hooks/pre-commit" ] && echo "git-hooks: ✅ installed" || echo "git-hooks: ❌ missing"
```

## Step 4: Present Status Report

Create a nice markdown table showing:

### System Tools Status

| Tool              | Status | Action |
| ----------------- | ------ | ------ |
| cm (cass_memory)  | ✅/❌  | -      |
| bd (Beads CLI)    | ✅/❌  | -      |
| bv (Beads Viewer) | ✅/❌  | -      |
| TLDR              | ✅/❌  | -      |
| Biome             | ✅/❌  | -      |
| Prettier          | ✅/❌  | -      |
| UBS               | ✅/❌  | -      |

### Services Status

| Service     | Status | Port | Action     |
| ----------- | ------ | ---- | ---------- |
| TLDR daemon | ✅/❌  | 3000 | start/stop |
| GPTCache    | ✅/❌  | 8000 | start/stop |
| cass_memory | ✅/❌  | -    | start/stop |

### Workspace Status

| Component     | Status | Action |
| ------------- | ------ | ------ |
| Git           | ✅/❌  | -      |
| Beads         | ✅/❌  | -      |
| cass_memory   | ✅/❌  | -      |
| TLDR index    | ✅/❌  | -      |
| biome.json    | ✅/❌  | -      |
| .prettierrc   | ✅/❌  | -      |
| opencode.json | ✅/❌  | -      |
| Git hooks     | ✅/❌  | -      |

## Step 5: Offer Options

Ask the user what they want to do:

1. **Install missing system tools** - Run `~/.config/opencode/bin/opencode-init --quiet`
2. **Start all services** - Run:
   - `tldr daemon start` (if installed)
   - `gptcache-server &` (if installed)
   - `cass_memory --daemon &` (if installed)
3. **Initialize workspace** - Run `~/.config/opencode/bin/workspace-init --force`
4. **Do all of the above** - Install tools, start services, init workspace
5. **Skip** - Don't do anything

Wait for user input and then execute the appropriate command(s).

## Step 6: Execute and Report

After running the chosen commands, summarize what was done:

### For System Installation:

- List all tools that were installed

### For Services Started:

- List all services that were started
- Report any failures

### For Workspace Init:

- List all components that were initialized

### Report Errors:

- Report errors in a user-friendly way
- Suggest next steps (e.g., "Run `bd ready` to see available tasks")

## Important

- Always be clear about what's missing and what will be installed/started
- Confirm with user before making changes
- Report errors in a user-friendly way
- Use emoji (✅ ❌ ⚠️ 🔄) for visual status indicators
- Services to check and start:
  - TLDR daemon: `tldr daemon start`
  - GPTCache: `gptcache-server &`
  - cass_memory: `cass_memory --daemon &` or `cass_memory serve &`
