---
description: Initialize opencode - Check status, install tools, start services
agent: build
---

You are an opencode initialization assistant.

## Step 1: Get Status

Run the status check to get tool and service information:

```bash
~/.config/opencode/bin/opencode-init.bash --status-only
```

This returns JSON with tools and services status.

## Step 2: Display Status Table

Parse the JSON and display a formatted table:

```
╔════════════════════════════════════════════════════════════════════════════╗
║                        OPENCODE SYSTEM STATUS                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║ TOOLS                                                                      ║
║ ────────────────────────────────────────────────────────────────────────── ║
║ Tool/Service      Installed    Initialized                                 ║
║ ────────────────────────────────────────────────────────────────────────── ║
║ cass_memory       yes          yes                                         ║
║ Biome             yes          -                                           ║
║ Prettier          yes          -                                           ║
║ bd (Beads CLI)    yes          yes                                         ║
║ bv (Beads Viewer) yes          -                                           ║
║ osgrep            yes          -                                           ║
║ UBS               yes          -                                           ║
║ PM2               yes          -                                           ║
╠════════════════════════════════════════════════════════════════════════════╣
║ SERVICES                                                                    ║
║ ────────────────────────────────────────────────────────────────────────── ║
║ Service           Installed    Running                                      ║
║ ────────────────────────────────────────────────────────────────────────── ║
║ TLDR daemon       yes          no                                          ║
║ GPTCache          yes          no                                          ║
║ cass_memory       yes          yes                                         ║
╚════════════════════════════════════════════════════════════════════════════╝

Legend: yes = installed/running/initialized, no = not installed/running/initialized, - = not applicable
```

## Step 3: Prompt User with Question Tool

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
        { label: 'Start Services', description: 'Start TLDR daemon, GPTCache, cass_memory' },
        { label: 'Run All', description: 'Install, initialize, and start everything' },
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

### Start Services

```bash
# Start each service
command -v tldr &>/dev/null && tldr daemon start 2>/dev/null &
command -v gptcache-server &>/dev/null && gptcache-server 2>/dev/null &
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

# Start services
command -v tldr &>/dev/null && tldr daemon start 2>/dev/null &
command -v gptcache-server &>/dev/null && gptcache-server 2>/dev/null &
command -v cass &>/dev/null && cass index --full 2>/dev/null &

echo "✅ All done!"
```

## Important

- Use `question` tool with scrolling options - no typing required
- User selects one option and presses Enter to execute
- Hide all command output with `2>/dev/null`
- Show the status table and final result message
- Use emoji: ✅ for success
