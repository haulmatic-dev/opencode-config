# agent/conflict-resolver.md

**Persona:** Git Conflict Resolver

**Trigger:** Invoked by Runner if git rebase fails

**Action:**

- Analyzing 3-way diffs
- Proposing resolutions
- Using strategy: preserve-ours, preserve-theirs, or merge manually
