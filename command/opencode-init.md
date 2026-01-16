---
description: Initialize opencode - Check tools, install missing, start services, initialize workspace
agent: build
---

description: Initialize opencode - Check tools, PM2, services, install missing, start services, initialize workspace
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
command -v pm2 && echo "pm2: INSTALLED" || echo "pm2: MISSING"
command -v opencode-init && echo "opencode-init: IN_PATH" || echo "opencode-init: NOT_IN_PATH"
```

## Step 2: Check PM2 Status

Run these commands to check PM2:

```
# Check if PM2 is installed
command -v pm2 && echo "pm2: INSTALLED" || echo "pm2: MISSING"

# Check PM2 version
command -v pm2 && pm2 --version

# Check PM2 processes
command -v pm2 && pm2 list 2>/dev/null || echo "pm2_list: ERROR"

# Check PM2 startup script
command -v pm2 && pm2 startup 2>/dev/null | head -5 || echo "pm2_startup: NOT_CONFIGURED"

# Check PM2 save
command -v pm2 && pm2 save 2>/dev/null && echo "pm2_save: CONFIGURED" || echo "pm2_save: NOT_CONFIGURED"
```

## Step 3: Check Running Services

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

# Check PM2-managed processes
command -v pm2 && pm2 jlist 2>/dev/null | grep -q "name" && echo "pm2_procs: ACTIVE" || echo "pm2_procs: NONE"
```

## Step 4: Check Workspace Initialization

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
[ -f "ecosystem.config.js" ] && echo "pm2_ecosystem: PRESENT" || echo "pm2_ecosystem: MISSING"
```

## Step 5: Present Status Report

Create a clear status report with emoji:

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
| PM2 installed    | YES/NO                    |
| Startup script   | CONFIGURED/NOT_CONFIGURED |
| Save configured  | YES/NO                    |
| Active processes | COUNT/NONE                |

### 🔄 Services

| Service     | Status          | Port | PM2 Managed |
| ----------- | --------------- | ---- | ----------- |
| TLDR daemon | RUNNING/STOPPED | 3000 | YES/NO      |
| GPTCache    | RUNNING/STOPPED | 8000 | YES/NO      |
| cass_memory | RUNNING/STOPPED | -    | YES/NO      |

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

## Step 6: Use question Tool for Interactive Selection

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

## Step 7: Execute Based on Selection

Based on the user's selection, execute the appropriate commands:

### If "Install Tools + PM2" or "Do All":

Run: `~/.config/opencode/bin/opencode-init --quiet`

Then install PM2 globally:

```bash
npm install -g pm2
```

### If "Setup PM2" or "Do All":

```bash
# Install PM2 if not installed
command -v pm2 || npm install -g pm2

# Create ecosystem.config.js for opencode services
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'tldr',
      script: 'tldr',
      args: 'daemon start',
      cwd: '/Users/buddhi/.config/opencode',
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
      cwd: '/Users/buddhi/.config/opencode',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 5000,
    },
    {
      name: 'cass_memory',
      script: 'cass',
      args: 'serve',
      cwd: '/Users/buddhi/.config/opencode',
      interpreter: 'none',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 5000,
    }
  ]
};
EOF

# Setup PM2 startup
sudo pm2 startup

# Start all services via PM2
pm2 start ecosystem.config.js

# Save current process list
pm2 save

# Show status
pm2 list
```

### If "Start Services" or "Do All":

```bash
# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Check if ecosystem file exists
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
    pm2 save
else
    # Start services individually
    command -v tldr && tldr daemon start 2>/dev/null
    command -v gptcache-server && gptcache-server &
    command -v cass_memory && cass_memory --daemon & 2>/dev/null || cass_memory serve & 2>/dev/null
fi

# Show status
pm2 list
```

### If "Init Workspace" or "Do All":

Run: `~/.config/opencode/bin/workspace-init --force`

## Step 8: Report Results

After execution, provide a clear summary:

### ✅ Completed Actions

- List all tools installed
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
- PM2 is critical for keeping services running persistently
- PM2 ecosystem file should be committed to git
- PM2 startup script survives reboots
- Use `pm2 save` after any process changes
- Services to manage with PM2:
  - TLDR daemon (tldr daemon start)
  - GPTCache (gptcache-server)
  - cass_memory (cass serve / cass_memory --daemon)
- Use emoji (✅ ❌ ⚠️ 🔄 🛠️ 📁 🔄) for visual clarity
