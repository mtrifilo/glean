# Glean LLM Context

Use this file as the primary context bootstrap for coding sessions.

## Product Intent (Non-Negotiable)

- Keep `glean` laser-focused on the DevTools HTML -> clean markdown workflow.
- Minimize friction: fast default behavior, clipboard-first, useful stats.
- Preserve scriptability and power-user workflows.

## Current Status Snapshot

- CLI command is `glean` (hard switch from previous name).
- Commands implemented: `clean`, `extract`, `stats`, plus no-subcommand interactive mode.
- No-subcommand mode defaults to:
  - `clean`
  - aggressive pruning off
- Overrides are available via:
  - `--mode clean|extract`
  - `--aggressive`
- `--tui` launches a minimal OpenTUI full-screen flow.
- Session stats are tracked at:
  - `~/.glean/stats.json`
  - override with `GLEAN_STATS_PATH`
- Open-source/release scaffolding is present:
  - `.github` issue/PR templates and CI/release workflows
  - installer scripts: `install`, `install.ps1`
- Latest known automated status: tests passing (`bun test`).

## Fast Command Cheat Sheet

```bash
# Default interactive flow
glean

# Clipboard pipeline (script-friendly)
pbpaste | glean clean | pbcopy

# Extraction-first with stronger pruning
pbpaste | glean extract --aggressive | pbcopy

# Stats
glean stats -i snippet.html --format json

# Full-screen TUI path
glean --tui
```

## Architecture Drilldown (Read as Needed)

### Entry and UX

- `src/cli.ts`
  - command registration, root options, no-subcommand flow
- `src/interactive/runInteractive.ts`
  - clipboard-first interactive logic and summary output
- `src/tui/experimental.ts`
  - OpenTUI full-screen flow used by `--tui`

### Core pipelines

- `src/pipeline/processHtml.ts`
  - shared orchestration for clean/extract -> markdown -> stats
- `src/pipeline/cleanHtml.ts`
  - deterministic cleanup rules
- `src/pipeline/extractContent.ts`
  - Readability-first extraction with fallback
- `src/pipeline/toMarkdown.ts`
  - HTML -> markdown conversion and normalization
- `src/pipeline/stats.ts`
  - token/char estimation and formatted stats output

### Shared utilities and state

- `src/lib/rules.ts` - cleanup heuristics
- `src/lib/io.ts` - stdin/file/clipboard I/O
- `src/lib/sessionStats.ts` - persistent session metrics
- `src/lib/types.ts` - shared types

### Validation

- `test/pipeline.test.ts` - pipeline behavior
- `test/cli.test.ts` - command-level behavior

## Current Priorities

1. Distribution workflow completion:
   - wire final public repo slug in release/install docs
   - run first tagged release and validate installer flows
   - decide near-term upgrade UX (`self-update` vs installer rerun)
2. Fixture maintenance tooling:
   - regenerate expected outputs quickly
3. Regression safety:
   - smoke checks and reduction thresholds

## Scope Guardrails

- Do not turn `glean` into a broad multi-source context platform.
- Keep this repo optimized for the single high-value workflow above.
- A broader TUI/power-CLI platform is planned separately (`ctxkit` concept).
