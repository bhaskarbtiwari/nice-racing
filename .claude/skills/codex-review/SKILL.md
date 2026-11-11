---
name: codex-review
description: Diagnose a bug and produce a minimal verified fix. Use for "codex-review" or "diagnose the problem".
---

1. Reproduce with the given test, error or steps; ask if none are given.
2. Find the smallest code region responsible; cite `file:line` evidence.
3. Make the minimal fix, staying inside the workspace and any stated edit scope.
4. Verify by running the relevant test or the game; iterate if it fails.

Reply with: diagnosis (1-3 sentences), what changed, how it was verified.
