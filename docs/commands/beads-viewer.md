# Beads Viewer (bv)

Terminal UI for browsing and managing Beads tasks.

## Synopsis

```bash
bv [options]
```

## Description

Beads Viewer provides a terminal UI for browsing tasks with multiple views including List, Kanban, Graph, and Tree views.

## Robot Commands (AI Integration)

| Command               | Description                     |
| --------------------- | ------------------------------- |
| `bv --robot-triage`   | AI-powered task recommendations |
| `bv --robot-next`     | Next recommended task           |
| `bv --robot-insights` | Full project metrics            |
| `bv --robot-plan`     | Parallel execution tracks       |

## Keyboard Shortcuts

| Key         | Action             |
| ----------- | ------------------ |
| `j` / `k`   | Navigate down/up   |
| `g` / `G`   | Jump to top/bottom |
| `Enter`     | Open/Select        |
| `/`         | Start search       |
| `b`         | Kanban board       |
| `i`         | Insights dashboard |
| `g`         | Graph visualizer   |
| `E`         | Tree view          |
| `h`         | History view       |
| `?`         | Help               |
| `q` / `Esc` | Quit               |

## Options

| Option       | Description  |
| ------------ | ------------ |
| `--help, -h` | Show help    |
| `--version`  | Show version |

## Examples

```bash
# Task triage
bv --robot-triage

# Next recommendation
bv --robot-next

# Project insights
bv --robot-insights
```

## Related Commands

- [bd](beads.md) - Beads CLI
- [workspace-init](workspace-init.md) - Initialize project workspace
