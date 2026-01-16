---
description: Initialize opencode - Check status, install tools, start services
agent: build
---

You are an opencode initialization assistant.

## Step 1: Get Status

Run the status script to get deterministic tool and service status:

```bash
~/.config/opencode/bin/opencode-status.bash
```

## Step 2: Display Status

Render the status as a formatted table:

```bash
~/.config/opencode/bin/opencode-status-table.bash
```

## Step 3: Prompt User

Use the `question` tool to present options:

```javascript
await question({
  questions: [
    {
      header: 'Setup',
      question: 'Current status shown above. What would you like to do?',
      options: [
        { label: 'Install Missing Tools', description: 'Install tools that are not installed' },
        { label: 'Initialize Project', description: 'Initialize .cass and .beads directories' },
        {
          label: 'Investigate Services',
          description: 'Check why services are not running and diagnose issues',
        },
        {
          label: 'Fix Services',
          description: 'Restart broken services (TLDR, GPTCache, cass_memory)',
        },
        { label: 'Start Services', description: 'Start all services if not running' },
        {
          label: 'Run All',
          description: 'Install, initialize, investigate, fix and start everything',
        },
        { label: 'Skip', description: 'Cancel and do nothing' },
      ],
    },
  ],
});
```

Note: User selects one option and presses Enter to execute.

## Step 4: Execute Based on Selection

### Install Missing Tools

```bash
# Install each missing tool
command -v npm &>/dev/null && npm install -g @biomejs/biome prettier pm2 @steveyegge/osgrep
command -v brew &>/dev/null && brew install go
command -v go &>/dev/null && go install github.com/steveyegge/beads/cmd/bd@latest
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh | bash
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh | bash
echo "✅ Missing tools installed"
```

### Initialize Project

```bash
# Initialize for this project
cm init --repo 2>/dev/null
bd init 2>/dev/null
tldr warm . 2>/dev/null
echo "✅ Project initialized"
```

### Initialize Project

```bash
cm init --repo 2>/dev/null
bd init 2>/dev/null
tldr warm . 2>/dev/null
echo "✅ Project initialized"
```

### Investigate Services

Run diagnostics to check why services are not running:

```bash
echo "=== TLDR Daemon ==="
ps aux | grep -E "tldr.*daemon" | grep -v grep || echo "No process found"
timeout 5 tldr daemon status 2>&1 || echo "tldr daemon status failed"

echo ""
echo "=== GPTCache ==="
lsof -i :8000 2>/dev/null | grep LISTEN || echo "Port 8000 not listening"
curl -s --connect-timeout 2 http://localhost:8000/ 2>/dev/null || echo "No HTTP response"
ps aux | grep gptcache | grep -v grep || echo "No process found"

echo ""
echo "=== cass_memory ==="
pgrep -f "cass" || echo "No process found"
ps aux | grep cass | grep -v grep || echo "No process found"
```

### Fix Services

Force restart broken services:

```bash
# Fix TLDR daemon
pkill -f "tldr.*daemon" 2>/dev/null || true
sleep 1
command -v tldr && tldr daemon start 2>/dev/null &

# Fix GPTCache (restart regardless)
pkill -f gptcache 2>/dev/null || true
sleep 1
if command -v gptcache-server &>/dev/null; then
  gptcache-server 2>/dev/null &
elif command -v python3 &>/dev/null; then
  python3 -m gptcache.server 2>/dev/null &
fi

# Fix cass_memory
pkill -f cass 2>/dev/null || true
sleep 1
command -v cass && cass index --full 2>/dev/null &

echo "✅ Services fixed"
```

### Start Services

```bash
# Start TLDR daemon
command -v tldr &>/dev/null && tldr daemon start 2>/dev/null &

# Start GPTCache
# Try gptcache-server command first, fall back to python module
if command -v gptcache-server &>/dev/null; then
  gptcache-server 2>/dev/null &
elif command -v python3 &>/dev/null; then
  python3 -m gptcache.server 2>/dev/null &
fi

# Start cass_memory
command -v cass &>/dev/null && cass index --full 2>/dev/null &

echo "✅ Services started"
```

### Run All

```bash
# Install missing tools
command -v npm &>/dev/null && npm install -g @biomejs/biome prettier pm2 @steveyegge/osgrep
command -v brew &>/dev/null && brew install go
command -v go &>/dev/null && go install github.com/steveyegge/beads/cmd/bd@latest
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh | bash
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh | bash

 # Initialize project
cm init --repo 2>/dev/null
bd init 2>/dev/null
tldr warm . 2>/dev/null

# Investigate services
echo "=== Service Diagnostics ==="
ps aux | grep -E "tldr.*daemon" | grep -v grep || echo "No TLDR process found"
timeout 5 tldr daemon status 2>&1 || echo "TLDR status check failed"
lsof -i :8000 2>/dev/null | grep LISTEN || echo "GPTCache port not listening"
curl -s --connect-timeout 2 http://localhost:8000/ 2>/dev/null || echo "GPTCache HTTP failed"
pgrep -f "cass" || echo "No cass_memory process found"

# Fix services (force restart)
echo "=== Restarting Services ==="
pkill -f "tldr.*daemon" 2>/dev/null || true
pkill -f gptcache 2>/dev/null || true
pkill -f cass 2>/dev/null || true
sleep 1

# Start services
command -v tldr &>/dev/null && tldr daemon start 2>/dev/null &

# Start GPTCache (try command, fall back to python module)
if command -v gptcache-server &>/dev/null; then
  gptcache-server 2>/dev/null &
elif command -v python3 &>/dev/null; then
  python3 -m gptcache.server 2>/dev/null &
fi

# Start cass_memory
command -v cass &>/dev/null && cass index --full 2>/dev/null &

echo "✅ All done!"
```

## Important

- Use `question` tool with single selection (no multiple: true)
- Run status scripts: `~/.config/opencode/bin/opencode-status.bash` and `~/.config/opencode/bin/opencode-status-table.bash`
- Hide all command output with `2>/dev/null`
- Show the status table and final result message
- Use emoji: ✅ for success
