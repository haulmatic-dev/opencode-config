# Beads CLI (bd)

Task tracking with dependency management.

## Synopsis

```bash
bd <command> [options]
```

## Description

Beads is the source of truth for work tracking in opencode. All work must be associated with a Beads task.

## Commands

| Command                            | Description                      |
| ---------------------------------- | -------------------------------- |
| `bd ready`                         | List available (unblocked) tasks |
| `bd list`                          | List all tasks                   |
| `bd show <id>`                     | Show task details                |
| `bd create <title>`                | Create a new task                |
| `bd update <id> --status <status>` | Update task status               |
| `bd close <id> --reason <reason>`  | Close a completed task           |
| `bd init`                          | Initialize beads in a project    |
| `bd sync`                          | Sync beads data to git           |

## Options

| Option       | Description  |
| ------------ | ------------ |
| `--help, -h` | Show help    |
| `--version`  | Show version |

## Examples

```bash
# See available tasks
bd ready

# Create a task
bd create "Implement feature X" --description "Description"

# Start working on a task
bd update <id> --status in_progress

# Complete a task
bd close <id> --reason "Done"

# Sync to git
bd sync
```

## Related Commands

- [workspace-init](workspace-init.md) - Initialize project workspace
- [bv](beads-viewer.md) - Terminal UI for tasks
