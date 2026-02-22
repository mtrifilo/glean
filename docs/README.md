# Glean Docs

This folder contains both LLM-facing and human-facing documentation. Files are designed for fast session bootstrapping without loading the full codebase.

## Fast Load Order (Minimal)

For most sessions, read in this order:

1. `docs/llm-context.md` (current project snapshot, architecture, checkpoint)
2. `docs/strategy/ROADMAP.md` (planned iterations and open decisions)
3. Only then drill into specific source files relevant to the task

## Documentation Map

### LLM workspace

- `docs/llm-context.md` — primary session bootstrap (read first)
- `docs/strategy/ROADMAP.md` — iteration plan, open decisions, risks
- `docs/specs/` — feature specs and design documents ([index](./specs/README.md))

### Human-facing guides

- `docs/CONTRIBUTING.md` — contribution rules and validation checklist
- `docs/RESUME_PROMPT.md` — copy/paste prompt templates for restarting an LLM session
- `docs/RELEASE.md` — maintainer release checklist
- `docs/RELEASE_RUNBOOK.md` — step-by-step release runbook
- `docs/WORKFLOW.md` — branch strategy and PR process
- `docs/FAQ.md` — quick answers for users and contributors
- `docs/TROUBLESHOOTING.md` — common operational and environment issues
- `docs/PACKAGE_MANAGERS.md` — Homebrew/Scoop distribution guide

### Historical

- `docs/plans/GLEAN_CLI_PLAN.md` — original v1 implementation plan (historical reference)
