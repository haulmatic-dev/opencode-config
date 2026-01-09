# Custom opencode completion for zsh
# Filters out subagents and task-coordinator from agent completion

_opencode_agent_completion() {
  # Primary agents only - these should appear in tab completion
  # Note: task-coordinator is excluded here (it's now a subagent for MCP Agent Mail)
  local primary_agents="orchestrator prd generate-tasks"

  # Complete based on current word
  _arguments -C \
    '1: :($primary_agents)' \
    '2: :(--help --version --print-logs --log-level --path --description --mode --tools --model)'
}

# Register completion for opencode agent command
compdef _opencode_agent_completion opencode-agent
compdef _opencode_agent_completion "opencode agent"

# Keep opencode's default completion for other commands
source <(opencode completion zsh 2>/dev/null) 2>/dev/null || true

