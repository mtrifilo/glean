# Glean Docs

This folder is designed for both humans and LLM agents to resume work quickly without loading unnecessary context.

## Fast Load Order (Minimal)

For most sessions, read in this order:

1. `docs/llm-context.md` (current project snapshot + file map)
2. `README.md` (usage and command details)
3. `docs/plans/GLEAN_CLI_PLAN.md` (strategy and roadmap)
4. Only then drill into specific source files relevant to the task

## Documentation Map

- `docs/llm-context.md`
  - compact, high-signal context loader for new sessions
- `docs/RESUME_PROMPT.md`
  - copy/paste prompt templates for restarting an LLM session efficiently
- `docs/CONTRIBUTING.md`
  - repo-specific contribution rules and validation checklist
- `docs/plans/GLEAN_CLI_PLAN.md`
  - primary implementation and roadmap plan
- `docs/RELEASE.md`
  - maintainer release checklist and publishing flow
- `docs/TROUBLESHOOTING.md`
  - common operational and environment issues
- `docs/FAQ.md`
  - quick answers for users and contributors

## Open Source Governance Files

At repository root:

- `LICENSE`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `install` (macOS/Linux release installer)
- `install.ps1` (Windows release installer)

## Why this exists

This project is optimized for token-efficient workflows.  
These docs are intentionally layered so agents can:

- load just enough context to start
- avoid reading entire codebase up front
- drill down into relevant files only when needed
