---
description: Initialize opencode - Check tools, PM2, services, install missing, start services, initialize workspace
agent: build
---

You are an opencode initialization assistant. Use the `question` tool to present options to the user for interactive selection.

## Step 1: Check System Tools (Parallel + Silent)

Run all system tool checks in parallel, redirecting output to temp files:

```
# Create temp files for parallel results
SYSTEM_TOOLS=$(mktemp)
PM2_STATUS=$(mktemp)
SERVICES_STATUS=$(mktemp)
WORKSPACE_STATUS=$(mktemp)

# Run all checks in parallel (hide output)
{
  # System tools check
  {
    echo "cm:$(command -v cm && echo INSTALLED || echo MISSING)"
    echo "bd:$(command -v bd && echo INSTALLED || echo MISSING)"
    echo "bv:$(command -v bv && echo INSTALLED || echo MISSING)"
    echo "tldr:$(command -v tldr && echo INSTALLED || echo MISSING)"
    echo "biome:$(command -v biome && echo INSTALLED || echo MISSING)"
    echo "prettier:$(command -v prettier && echo INSTALLED || echo MISSING)"
    echo "ubs:$(command -v ubs && echo INSTALLED || echo MISSING)"
    echo "pm2:$(command -v pm2 && echo INSTALLED || echo MISSING)"
    echo "opencode-init:$(command -v opencode-init && echo IN_PATH || echo NOT_IN_PATH)"
  } > "$SYSTEM_TOOLS" &

  # PM2 status check
  if command -v pm2 &> /dev/null; then
    {
      echo "pm2_version:$(pm2 --version 2>/dev/null || echo ERROR)"
      echo "pm2_startup:$(pm2 startup 2>/dev/null | head -1 || echo NOT_CONFIGURED)"
      echo "pm2_save:$(pm2 save 2>/dev/null && echo CONFIGURED || echo NOT_CONFIGURED)"
      echo "pm2_count:$(pm2 list 2>/dev/null | grep -c "●" || echo 0)"
    } > "$PM2_STATUS" &
  else
    echo "pm2_version:MISSING" > "$PM2_STATUS" &
    echo "pm2_startup:NOT_CONFIGURED" >> "$PM2_STATUS" &
    echo "pm2_save:NOT_CONFIGURED" >> "$PM2_STATUS" &
    echo "pm2_count:0" >> "$PM2_STATUS" &
  fi

  # Services status check (parallel)
  {
    TLDR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
    [ "$TLDR_STATUS" = "200" ] && echo "tldr:RUNNING" || echo "tldr:STOPPED"

    GPTCACHE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/cache_status 2>/dev/null || echo "000")
    [ "$GPTCACHE_STATUS" = "200" ] && echo "gptcache:RUNNING" || echo "gptcache:STOPPED"

    pgrep -f "cass_memory" > /dev/null 2>&1 && echo "cass_memory:RUNNING" || echo "cass_memory:STOPPED"

    command -v pm2 &> /dev/null && pm2 jlist 2>/dev/null | grep -q "name" && echo "pm2_procs:ACTIVE" || echo "pm2_procs:NONE"
  } > "$SERVICES_STATUS" &

  # Workspace status check (parallel)
  {
    [ -d ".git" ] && echo "git:INITIALIZED" || echo "git:NOT_INITIALIZED"
    [ -d ".beads" ] && echo "beads:INITIALIZED" || echo "beads:NOT_INITIALIZED"
    [ -d ".cass" ] && echo "cass_workspace:INITIALIZED" || echo "cass_workspace:NOT_INITIALIZED"
    [ -d ".tldr" ] && echo "tldr_index:CREATED" || echo "tldr_index:NOT_CREATED"
    [ -f "biome.json" ] && echo "biome:PRESENT" || echo "biome:MISSING"
    [ -f ".prettierrc" ] && echo "prettier:PRESENT" || echo "prettier:MISSING"
    [ -f "opencode.json" ] && echo "opencode_json:PRESENT" || echo "opencode_json:MISSING"
    [ -f ".git/hooks/pre-commit" ] && echo "git_hooks:INSTALLED" || echo "git_hooks:NOT_INSTALLED"
    [ -f "ecosystem.config.js" ] && echo "pm2_ecosystem:PRESENT" || echo "pm2_ecosystem:MISSING"
  } > "$WORKSPACE_STATUS" &

  # Wait for all background jobs
  wait

  # Clean up temp files
  rm -f "$SYSTEM_TOOLS" "$PM2_STATUS" "$SERVICES_STATUS" "$WORKSPACE_STATUS"
} 2>/dev/null
```

## Step 2: Present Status Report

After all parallel checks complete, read the results and present a clear status report with emoji:

### 🛠️ System Tools

| Tool              | Status                |
| ----------------- | --------------------- |
| cm (cass_memory)  | INSTALLED/MISSING     |
| bd (Beads CLI)    | INSTALLED/MISSING     |
| bv (Beads Viewer) | INSTALLED/MISSING     |
| TLDR              | INSTALLED/MISSING     |
| Biome             | INSTALLED/MISSING     |
| Prettier          | INSTALLED/MISSING     |
| UBS               | INSTALLED/MISSING     |
| **PM2**           | **INSTALLED/MISSING** |

### 🔄 PM2 Status

| Check            | Status                    |
| ---------------- | ------------------------- |
| PM2 version      | VERSION/ERROR             |
| Startup script   | CONFIGURED/NOT_CONFIGURED |
| Save configured  | YES/NO                    |
| Active processes | COUNT                     |

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
| PM2 ecosystem | PRESENT/MISSING             |

## Step 3: Use question Tool for Interactive Selection

Use the `question` tool to present options:

```javascript
await question({
  questions: [
    {
      header: 'OpenCode Setup',
      question: 'What would you like to do? Select an option:',
      options: [
        {
          label: 'Install Tools + PM2',
          description: 'Install missing system tools and PM2 process manager',
        },
        {
          label: 'Setup PM2',
          description: 'Configure PM2, create ecosystem file, enable startup',
        },
        {
          label: 'Start Services',
          description: 'Start TLDR, GPTCache, and cass_memory via PM2',
        },
        {
          label: 'Init Workspace',
          description: 'Initialize this project workspace',
        },
        {
          label: 'Do All',
          description: 'Install tools, setup PM2, start services, init workspace',
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

## Step 4: Execute Based on Selection

Based on the user's selection, execute the appropriate commands (hide all output):

### If "Install Tools + PM2" or "Do All":

Run silently: `~/.config/opencode/bin/opencode-init --quiet 2>/dev/null`

Then install PM2 silently:

```bash
npm install -g pm2 2>/dev/null
```

### If "Setup PM2" or "Do All":

```bash
# Install PM2 if not installed (silent)
command -v pm2 || npm install -g pm2 2>/dev/null

# Create ecosystem.config.js for opencode services (silent)
cat > ecosystem.config.js << 'EOF' 2>/dev/null
module.exports = {
  apps: [
    {
      name: 'tldr',
      script: 'tldr',
      args: 'daemon start',
      cwd: process.cwd(),
      interpreter: 'none',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 5000,
      exp_backoff_restart_delay: 100,
    },
    {
      name: 'gptcache',
      script: 'gptcache-server',
      cwd: process.cwd(),
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 5000,
    },
    {
      name: 'cass_memory',
      script: 'cass',
      args: 'serve',
      cwd: process.cwd(),
      interpreter: 'none',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 5000,
    }
  ]
};
EOF

# Setup PM2 startup (silent)
sudo pm2 startup 2>/dev/null

# Start all services via PM2 (silent)
pm2 start ecosystem.config.js 2>/dev/null

# Save current process list (silent)
pm2 save 2>/dev/null
```

### If "Start Services" or "Do All":

```bash
# Check if PM2 is installed, install if missing (silent)
command -v pm2 || npm install -g pm2 2>/dev/null

# Check if ecosystem file exists, start services (silent)
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js 2>/dev/null
    pm2 save 2>/dev/null
else
    # Start services individually (silent)
    command -v tldr && tldr daemon start 2>/dev/null
    command -v gptcache-server && gptcache-server 2>/dev/null &
    command -v cass_memory && (cass_memory --daemon 2>/dev/null || cass_memory serve 2>/dev/null &) &
fi
```

### If "Init Workspace" or "Do All":

Run silently: `~/.config/opencode/bin/workspace-init --force 2>/dev/null`

## Step 5: Report Results

After execution, provide a clear summary (hide command output):

### ✅ Completed Actions

- All tools installed
- PM2 installation status
- PM2 ecosystem file created
- Services started via PM2
- PM2 startup configured
- All workspace components initialized

### 🔄 PM2 Specific Results

| Action             | Status          |
| ------------------ | --------------- |
| PM2 installed      | YES/NO          |
| Ecosystem file     | CREATED/UPDATED |
| Services started   | COUNT           |
| Startup configured | YES/NO          |
| Save configured    | YES/NO          |

### ❌ Errors

- Report any errors that occurred
- Suggest fixes if possible

### 💡 Next Steps

- Suggest useful commands:
  - `pm2 list` - View all processes
  - `pm2 logs` - View logs
  - `pm2 monit` - Monitor in real-time
  - `pm2 restart all` - Restart all services
  - `pm2 save` - Save process list
  - `bd ready` - See available tasks
  - `cm context "your task"` - Get context

## Important Notes

- Always use the `question` tool for user selection
- Run all checks in parallel using background jobs with `&` and `wait`
- Redirect all command output to `/dev/null` or temp files to hide from user
- Only show the final status tables and results to the user
- PM2 is critical for keeping services running persistently
- PM2 ecosystem file should be committed to git
- PM2 startup script survives reboots
- Use `pm2 save` after any process changes
- Services to manage with PM2:
  - TLDR daemon (tldr daemon start)
  - GPTCache (gptcache-server)
  - cass_memory (cass serve / cass_memory --daemon)
- Use emoji (✅ ❌ ⚠️ 🔄 🛠️ 📁 🔄) for visual clarity
