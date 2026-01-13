# beads-api.mjs - CLI Wrapper for Beads Plugin

A Node.js CLI wrapper that provides direct access to the `BeadsClient` and `BeadsViewerClient` APIs from the shell.

## Installation

Already installed at `/Users/buddhi/.config/opencode/bin/beads-api.mjs` and executable.

## Usage

```bash
node bin/beads-api.mjs <method> [args...]
```

## Available Commands

### BeadsClient Methods

```bash
# List all beads (returns JSON)
beads-api.mjs list

# Get ready beads
beads-api.mjs ready

# Show specific bead
beads-api.mjs show <id>

# Create a new bead
beads-api.mjs create '{"title":"Fix bug","priority":1,"type":"bug"}'

# Update a bead
beads-api.mjs update <id> '{"status":"in_progress"}'

# Close a bead
beads-api.mjs close <id> "Reason for closing"

# Delete beads
beads-api.mjs delete <id1,id2,id3> '{"cascade":true,"force":true}'

# Sync beads to git
beads-api.mjs sync

# Search beads
beads-api.mjs search "query" '{"status":"open"}'

# Count beads
beads-api.mjs count '{"status":"open"}'

# Dependencies
beads-api.mjs depAdd <blockedId> <blockerId> "blocks"
beads-api.mjs depRemove <blockedId> <blockerId>
beads-api.mjs depList <id> "dependents"
beads-api.mj depTree <id>
beads-api.mj depCycles

# Labels
beads-api.mjs addLabel <id1,id2> "label1,label2"
beads-api.mjs removeLabel <id1,id2> "label1,label2"

# Comments
beads-api.mjs addComment <id> "Comment text"
```

### BeadsViewerClient Methods

```bash
# Get triage recommendations
beads-api.mjs bvTriage

# Get execution plan
beads-api.mjs bvPlan '{}'

# Get graph insights
beads-api.mjs bvInsights '{}'

# Get alerts
beads-api.mjs bvAlerts

# Get history
beads-api.mjs bvHistory

# Get label health
beads-api.mj bvLabelHealth

# Get next recommended task
beads-api.mjs bvNext

# Search semantically
beads-api.mjs bvSearch "query" '{}'

# File analysis
beads-api.mjs bvFileBeads "/path/to/file"
beads-api.mjs bvFileHotspots
beads-api.mjs bvFileRelations "/path/to/file"

# Impact analysis
beads-api.mjs bvImpact "/path/to/file1,/path/to/file2"
beads-api.mjs bvImpactNetwork "<beadId>"
beads-api.mjs bvRelated "<beadId>"
beads-api.mjs bvCausality "<beadId>"
beads-api.mjs bvBlockerChain "<beadId>"
```

## Examples

### Delete All Beads (Original Use Case)

```bash
# Get all IDs and delete them with cascade and force
ids=$(node bin/beads-api.mjs list | jq -r '.[].id' | tr '\n' ',' | sed 's/,$//')
node bin/beads-api.mjs delete "$ids" '{"cascade":true,"force":true}'
```

### Create a Task

```bash
node bin/beads-api.mjs create '{
  "title": "Fix authentication bug",
  "priority": 1,
  "type": "bug",
  "labels": ["urgent", "security"],
  "description": "Users cannot log in due to token expiration issue"
}'
```

### Get Recommendations and Claim Top Task

```bash
# Get triage data
node bin/beads-api.mjs bvTriage | jq '.triage.recommendations[0]'

# Claim top recommendation
node bin/beads-api.mjs update <id> '{"status":"in_progress"}'
```

### Analyze File Impact

```bash
node bin/beads-api.mjs bvImpact "src/auth.js,src/token.js"
```

## Output Format

- Most commands return **JSON** (easy to parse with `jq`)
- String-based methods return raw text
- Boolean methods return `true` or `false`

## Why This Matters

Previously, the BeadsClient was only accessible through opencode plugin lifecycle hooks. This wrapper exposes all functionality to shell scripts and automation, enabling:

- Shell-based workflows
- CI/CD integration
- Direct agent invocation via the `bash` tool
- Automated bead management
- Graph analysis pipelines

## Technical Details

- **Source**: `lib/beads-client.js` (imported from `plugin/beads.mjs`)
- **Format**: ESM (ECMAScript Modules)
- **Dependencies**: Node.js built-ins only (`node:child_process`)
- **Compatibility**: Works with existing `bd` CLI tool
