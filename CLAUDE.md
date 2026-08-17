## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

### One-time local setup (each contributor/machine)

`.claude/settings.json` (the PreToolUse hooks that nudge toward `graphify query` before raw grep/read) is gitignored — it bakes in an absolute local path to the `graphify` binary, which only works on the machine it was generated on. Similarly, the git post-commit/post-checkout hooks live in `.git/hooks/`, which git never tracks at all.

Each contributor needs to run these once, locally, after cloning:
```
graphify hook install    # git post-commit/post-checkout auto-rebuild
graphify claude install  # writes this section + the local .claude/settings.json hooks
```
`graphify-out/graph.json`, `GRAPH_REPORT.md`, `graph.html`, `manifest.json`, and `.graphify_labels.json` ARE committed and don't need regenerating from scratch — these two commands just wire up the local automation that keeps them current going forward.
