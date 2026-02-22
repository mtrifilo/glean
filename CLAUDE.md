# Glean — Claude Code Bootstrap

Glean is a CLI tool that converts HTML, RTF, and Word documents into clean, token-efficient markdown.

## Session Start

1. Read `docs/llm-context.md` — current state, architecture, checkpoint, task routing
2. Read `docs/strategy/ROADMAP.md` — planned iterations and open decisions
3. Summarize where things stand and ask the user what to work on

Do not assume what's next — the user directs priority.

## Key Commands

```bash
bun test              # Run test suite
bun run build:binary  # Build single binary
glean                 # Interactive mode (clipboard-first)
pbpaste | glean clean | pbcopy  # Pipe workflow
```

## Naming Conventions

- CLI command: `glean`
- Namespace: `.glean` (e.g. `~/.glean/stats.json`)
- Env var: `GLEAN_STATS_PATH`

## Scope Guardrails

Stay focused on the HTML/RTF/Word → clean markdown workflow. Do not scope-creep into a broad multi-source context platform. A separate project (`ctxkit` concept) is planned for that.

## Doc Layout

- `docs/` — LLM workspace (specs, strategy, llm-context.md)
- `human-docs/` — Human-focused guides (contributing, workflow, release, FAQ, troubleshooting)

## Validation Checklist

Before finalizing any change:

1. `bun test` passes
2. Smoke-test a relevant command (`glean`, `glean clean`, `glean --tui`)
3. Update `docs/llm-context.md` if architecture or behavior changed
4. Update `README.md` if user-facing behavior changed
5. Update `CHANGELOG.md` under `[Unreleased]` for notable changes
