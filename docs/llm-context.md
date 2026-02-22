# Glean LLM Context

Use this file as the primary context bootstrap for coding sessions.

## Product Intent (Non-Negotiable)

- Keep `glean` laser-focused on the DevTools HTML -> clean markdown workflow.
- Minimize friction: fast default behavior, clipboard-first, useful stats.
- Preserve scriptability and power-user workflows.

## Current Status Snapshot

- CLI command is `glean` (hard switch from previous name).
- Commands implemented: `clean`, `extract`, `stats`, `update`, plus no-subcommand interactive mode.
- `--version` / `-V` flag available.
- No-subcommand mode defaults to:
  - `clean`
  - aggressive pruning off
- Overrides are available via:
  - `--mode clean|extract`
  - `--aggressive`
- `--tui` launches a polished OpenTUI full-screen flow with color palette, bordered stat/session panels, and flex-based layout.
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
- `src/commands/update.ts`
  - self-update logic (platform detection, GitHub release fetch, checksum verify, atomic swap)
- `src/interactive/runInteractive.ts`
  - clipboard-first interactive logic and summary output
- `src/tui/experimental.ts`
  - polished OpenTUI full-screen flow used by `--tui` (color palette, bordered panels, flex layout)

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

### Developer scripts

- `scripts/update-golden.ts` - regenerates `.expected.md` golden fixtures from current pipeline
- `scripts/smoke-check.ts` - quality threshold guard (per-fixture ≥30% char reduction, mean ≥40%)

### Validation

- `test/pipeline.test.ts` - pipeline behavior
- `test/cli.test.ts` - command-level behavior
- `test/update.test.ts` - update command unit + integration tests

## Current Priorities

The user directs priority. See `docs/strategy/ROADMAP.md` for planned iterations.

- v0.4.0 — Developer Experience and Heuristic Safety (Done, merged, not released — dev tooling only)
- v0.5.0 — Word Document and RTF Support (3 phases)
  - Phase 1: Content detection foundation + RTF/DOC support via `textutil` (zero new deps)
  - Phase 2: DOCX file support via `mammoth.js`
  - Phase 3: Stats extension, docs, release
  - Full spec: `docs/specs/WORD_RTF_SUPPORT.md`

## Scope Guardrails

- Do not turn `glean` into a broad multi-source context platform.
- Keep this repo optimized for the single high-value workflow above.
- A broader TUI/power-CLI platform is planned separately (`ctxkit` concept).
