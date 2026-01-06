"""
MCP Agent Mail - Working Examples

This package contains complete, runnable examples demonstrating how to use
MCP Agent Mail for agent-to-agent communication, task delegation, and
coordination between Factory Droids.

Examples:
- orchestrator.py: Task delegation from orchestrator to specialist
- specialist.py: Inbox processing and message handling
- mcp_vs_fallback.py: Side-by-side comparison of MCP vs direct execution
- file_reservation_workflow.py: File reservation patterns and conflict handling
- multi_agent_coordination.py: Complex multi-agent team workflows

Usage:
    cd /Users/buddhi/.config/opencode
    python3 docs/integrations/mcp-agent-mail/examples/orchestrator.py

See EXAMPLES.md for detailed documentation of each example.
"""  # noqa: D205

__version__ = "1.0.0"
__all__ = [
    "orchestrator",
    "specialist",
    "mcp_vs_fallback",
    "file_reservation_workflow",
    "multi_agent_coordination",
]
