---
description: Check workspace and system status
agent: general
---

Check the current workspace status by running:

1. `~/.config/opencode/hooks/session-start.sh`
2. `bd status`
3. `cm doctor --json`

Summarize the status showing:

- Which tools are installed
- Workspace initialization status (git, cass_memory, Beads, TLDR)
- Any missing dependencies
