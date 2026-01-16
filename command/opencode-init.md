---
description: Initialize opencode - Check status, install tools, setup PM2, start services
agent: build
---

You are an opencode initialization assistant.

## Quick Status Check

Run these checks to get the current state (hide all output):

```bash
# System tools - capture to variables
CM_STATUS=$([ -f /Users/buddhi/.local/bin/cm ] && echo INSTALLED || echo MISSING)
BD_STATUS=$([ -f /opt/homebrew/bin/bd ] || command -v bd &>/dev/null && echo INSTALLED || echo MISSING)
TLDR_STATUS=$([ -f /Users/buddhi/.pyenv/shims/tldr ] || command -v tldr &>/dev/null && echo INSTALLED || echo MISSING)
PM2_STATUS=$([ -f /Users/buddhi/.nodenv/shims/pm2 ] || command -v pm2 &>/dev/null && echo INSTALLED || echo MISSING)

# PM2 details
PM2_VER=$([ -f /Users/buddhi/.nodenv/shims/pm2 ] && pm2 --version 2>/dev/null || echo "-")
PM2_PROCS=$([ -f /Users/buddhi/.nodenv/shims/pm2 ] && pm2 list 2>/dev/null | grep -c "●" || echo 0)

# Services
TLDR_RUN=$([ $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null) = "200" ] && echo RUNNING || echo STOPPED)
GPTCACHE_RUN=$([ $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/cache_status 2>/dev/null) = "200" ] && echo RUNNING || echo STOPPED)
CASS_RUN=$([ $(pgrep -f "cass_memory" &>/dev/null) ] && echo RUNNING || echo STOPPED)

# Workspace
GIT_INIT=$([ -d ".git" ] && echo YES || echo NO)
BEADS_INIT=$([ -d ".beads" ] && echo YES || echo NO)
CASS_WS=$([ -d ".cass" ] && echo YES || echo NO)
PM2_ECOSYSTEM=$([ -f "ecosystem.config.js" ] && echo YES || echo NO)
```

## Present Clean Status

After getting all values, display a clean status table:

### 🛠️ System Tools

| Tool             | Status       |
| ---------------- | ------------ |
| cm (cass_memory) | $CM_STATUS   |
| bd (Beads CLI)   | $BD_STATUS   |
| TLDR             | $TLDR_STATUS |
| PM2              | $PM2_STATUS  |

### 🔄 PM2 Status

| Item      | Value      |
| --------- | ---------- |
| Version   | $PM2_VER   |
| Processes | $PM2_PROCS |

### 🔄 Services

| Service     | Status        |
| ----------- | ------------- |
| TLDR daemon | $TLDR_RUN     |
| GPTCache    | $GPTCACHE_RUN |
| cass_memory | $CASS_RUN     |

### 📁 Workspace

| Component     | Ready          |
| ------------- | -------------- |
| Git           | $GIT_INIT      |
| Beads         | $BEADS_INIT    |
| cass_memory   | $CASS_WS       |
| PM2 ecosystem | $PM2_ECOSYSTEM |

## Interactive Menu

Use the `question` tool to present options:

```javascript
await question({
  questions: [
    {
      header: 'OpenCode Setup',
      question: 'Current status shown above. What would you like to do?',
      options: [
        { label: 'Install Tools', description: 'Install missing system tools' },
        { label: 'Setup PM2', description: 'Configure PM2 with ecosystem file' },
        { label: 'Start Services', description: 'Start TLDR, GPTCache, cass_memory' },
        { label: 'Init Workspace', description: 'Initialize this project' },
        { label: 'Do All', description: 'Everything above' },
        { label: 'Skip', description: 'Cancel' },
      ],
    },
  ],
});
```

## Execute & Report

Based on selection, execute silently (2>/dev/null) and report only the result:

### If Install Tools

```bash
~/.config/opencode/bin/opencode-init --quiet 2>/dev/null
npm install -g pm2 2>/dev/null
echo "✅ System tools installed"
```

### If Setup PM2

```bash
# Create ecosystem file
cat > ecosystem.config.js << 'EOF' 2>/dev/null
module.exports = {
  apps: [
    { name: 'tldr', script: 'tldr', args: 'daemon start', interpreter: 'none' },
    { name: 'gptcache', script: 'gptcache-server' },
    { name: 'cass_memory', script: 'cass', args: 'serve', interpreter: 'none' }
  ]
};
EOF

pm2 start ecosystem.config.js 2>/dev/null
pm2 save 2>/dev/null
echo "✅ PM2 configured with 3 services"
```

### If Start Services

```bash
pm2 start ecosystem.config.js 2>/dev/null || {
  command -v tldr && tldr daemon start 2>/dev/null
  command -v gptcache-server && gptcache-server 2>/dev/null &
  command -v cass_memory && cass_memory --daemon 2>/dev/null &
}
echo "✅ Services started"
```

### If Init Workspace

```bash
~/.config/opencode/bin/workspace-init --force 2>/dev/null
echo "✅ Workspace initialized"
```

### If Do All

```bash
~/.config/opencode/bin/opencode-init --quiet 2>/dev/null
npm install -g pm2 2>/dev/null
cat > ecosystem.config.js << 'EOF' 2>/dev/null
module.exports = { apps: [
  { name: 'tldr', script: 'tldr', args: 'daemon start', interpreter: 'none' },
  { name: 'gptcache', script: 'gptcache-server' },
  { name: 'cass_memory', script: 'cass', args: 'serve', interpreter: 'none' }
]};
EOF
pm2 start ecosystem.config.js 2>/dev/null
pm2 save 2>/dev/null
~/.config/opencode/bin/workspace-init --force 2>/dev/null
echo "✅ Everything set up!"
```

## Important

- Use `question` tool for selection - no typing
- Run all commands with `2>/dev/null` to hide output
- Only show the status tables and final result message
- Use emoji: ✅ for success, ❌ for errors
