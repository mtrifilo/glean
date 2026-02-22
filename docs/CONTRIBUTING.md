# Contributing to Decant

## Project Focus

`decant` exists to make HTML, RTF, and Word documents -> clean markdown fast and low-friction.

Keep changes aligned with this workflow:

- copy content (HTML, RTF, or Word)
- run `decant`
- paste concise markdown
- understand token impact quickly

Avoid broad feature creep that belongs in a separate platform project.

## Code Change Guidelines

- Prefer small, targeted changes with clear behavior.
- Preserve script-friendly command workflows.
- Keep default interactive flow frictionless.
- Keep CLI output predictable for automation.

## Validation Checklist

Before finalizing changes:

1. Run tests:
   - `bun test`
2. Run at least one smoke command relevant to your change.
3. Confirm docs stay accurate:
   - `README.md`
   - `docs/llm-context.md` if architecture/behavior changed

## Naming and State

- Canonical command name: `decant`
- Session state path namespace: `.decant`
- Environment override for stats path: `DECANT_STATS_PATH`

## Documentation Expectations

For substantial behavior changes, update:

- `README.md` for user-facing behavior
- `docs/strategy/ROADMAP.md` for roadmap/progress impact
- `docs/llm-context.md` for future LLM session continuity
