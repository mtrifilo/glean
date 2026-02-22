# Decant — Claude Code Bootstrap

Decant is a CLI tool that converts HTML, RTF, and Word documents into clean, token-efficient markdown.

## Session Start

1. Read `docs/llm-context.md` — current state, architecture, checkpoint, task routing
2. Read `docs/strategy/ROADMAP.md` — planned iterations and open decisions
3. Summarize where things stand and ask the user what to work on

Do not assume what's next — the user directs priority.

## Key Commands

```bash
bun test              # Run test suite
bun run build:binary  # Build single binary
decant                 # Interactive mode (clipboard-first)
pbpaste | decant clean | pbcopy  # Pipe workflow
```

## Naming Conventions

- CLI command: `decant`
- Namespace: `.decant` (e.g. `~/.decant/stats.json`)
- Env var: `DECANT_STATS_PATH`

## Scope Guardrails

Stay focused on the HTML/RTF/Word → clean markdown workflow. Do not scope-creep into a broad multi-source context platform. A separate project (`ctxkit` concept) is planned for that.

## Doc Layout

- `docs/llm-context.md` — primary LLM session bootstrap
- `docs/strategy/ROADMAP.md` — planned iterations and open decisions
- `docs/specs/` — feature specs and design documents
- `docs/` — also contains human-facing guides (CONTRIBUTING, FAQ, RELEASE, TROUBLESHOOTING, etc.)

## Keeping Docs Current

As you work, update docs to reflect what you learn and accomplish. Do not wait until the end of a session — update incrementally to prevent drift.

- **After completing a task:** Update `docs/llm-context.md` — refresh Recent Work, Checkpoint, and Priorities.
- **After architectural changes:** Update the Architecture section and Key Files in `docs/llm-context.md`.
- **After shipping a milestone:** Update `docs/strategy/ROADMAP.md` — mark completed items, advance the current iteration.
- **After adding a new feature:** Update `README.md` with user-facing changes, and add a `CHANGELOG.md` entry under `[Unreleased]`.
- **After adding a new spec:** Add it to `docs/specs/README.md`.

Docs are only useful if they reflect reality. Treat doc updates as part of the task, not a separate chore.

## Validation Checklist

Before finalizing any change:

1. `bun test` passes
2. Smoke-test a relevant command (`decant`, `decant clean`, `decant --tui`)
3. Update `docs/llm-context.md` if architecture or behavior changed
4. Update `README.md` if user-facing behavior changed
5. Update `CHANGELOG.md` under `[Unreleased]` for notable changes
