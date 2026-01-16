# opencode Commands

This section documents the opencode CLI commands available in the development environment.

## Setup Commands

| Command                             | Description                                                                |
| ----------------------------------- | -------------------------------------------------------------------------- |
| [opencode-init](opencode-init.md)   | System-wide setup - installs and configures all tools                      |
| [workspace-init](workspace-init.md) | Project workspace initialization - sets up project-specific configurations |

## Tool Commands

### Task Management

| Command               | Description                                          |
| --------------------- | ---------------------------------------------------- |
| [bd](beads.md)        | Beads CLI - Task tracking with dependency management |
| [bv](beads-viewer.md) | Beads Viewer - Terminal UI for browsing tasks        |

### Learning & Memory

| Command              | Description                                              |
| -------------------- | -------------------------------------------------------- |
| [cm](cass_memory.md) | cass_memory - Cross-agent learning and procedural memory |

### Code Analysis

| Command         | Description                                           |
| --------------- | ----------------------------------------------------- |
| [tldr](tldr.md) | 5-layer code analysis with semantic search            |
| [ubs](ubs.md)   | Ultimate Bug Scanner - Multi-language static analysis |

### Linting & Formatting

| Command                 | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| [biome](biome.md)       | Biome - Modern linting and formatting (20+ languages) |
| [prettier](prettier.md) | Prettier - Code formatter                             |

## Script Reference

### Hooks

| Script                                                   | Description                     |
| -------------------------------------------------------- | ------------------------------- |
| [session-start.sh](../../hooks/session-start.sh)         | Verify all services are running |
| [check-cass-memory.sh](../../hooks/check-cass-memory.sh) | Verify cass_memory              |
| [check-beads.sh](../../hooks/check-beads.sh)             | Verify Beads CLI                |
| [check-bv.sh](../../hooks/check-bv.sh)                   | Verify Beads Viewer             |
| [check-ubs.sh](../../hooks/check-ubs.sh)                 | Verify UBS                      |
| [check-gptcache.sh](../../hooks/check-gptcache.sh)       | Verify GPTCache                 |

### Bin Scripts

| Script                                             | Description                            |
| -------------------------------------------------- | -------------------------------------- |
| [beads-api.mjs](../../bin/beads-api.mjs)           | Beads API for programmatic access      |
| [gptcache-control](../../bin/gptcache-control)     | GPTCache management                    |
| [gptcache-wrapper](../../bin/gptcache-wrapper)     | GPTCache wrapper script                |
| [headless-worker.js](../../bin/headless-worker.js) | Headless worker for parallel execution |
| [runner](../../bin/runner)                         | Task runner for agent execution        |

## Quick Start

### 1. System Setup

```bash
~/.config/opencode/bin/opencode-init
```

### 2. Workspace Setup

```bash
cd /path/to/your/project
~/.config/opencode/bin/workspace-init
```

### 3. Verify Setup

```bash
~/.config/opencode/hooks/session-start.sh
```

### 4. Start Working

```bash
bd ready              # See available tasks
bd create "task"      # Create a new task
cm context "task"     # Get context from cass_memory
```

## Command Conventions

### Standard Options

| Option        | Description              |
| ------------- | ------------------------ |
| `--help, -h`  | Show help message        |
| `--version`   | Show version information |
| `--quiet, -q` | Run in quiet mode        |

### Output Conventions

- **Success:** Green `✓` with exit code 0
- **Warning:** Yellow `⚠` or `○` with informational message
- **Error:** Red `✗` with exit code 1
- **Headers:** Blue text for section titles

## Related Documentation

- [Installation Guide](../README.md#installation--setup)
- [Development Workflow](../README.md#typical-session-flow)
- [Task-to-Commit Workflow](../task-to-commit.md)
- [Plugin System](../README.md#plugin-system)
