# Decant — LLM Context

> Entry point for Claude Code sessions. Read this first.

## Recent Work

- v0.6.0 Phase 1 — DOCX file support via `mammoth.js` (cross-platform, no macOS dependency)
- Added `isDocxBytes()` ZIP magic detection, `readInputBytes()` binary I/O, `convertDocxToHtml()` conversion
- CLI `resolveHtmlInput()` handles `.docx` files with new `--verbose` flag for mammoth warnings
- Test fixtures (`sample.docx` + golden output) and unit/integration tests for DOCX path
- Binary build verified — mammoth bundles cleanly with `bun build --compile`
- v0.6.1 — renamed project from `glean` to `decant` (CLI, env vars, paths, docs, CI, installers)
- v0.5.0 — content detection + RTF/DOC support via macOS `textutil` (zero new deps)

## Checkpoint

- **Current state:** v0.6.0 Phase 1 complete. DOCX conversion working end-to-end. 75 tests passing.
- **What's working:** HTML, RTF, DOC, and DOCX → clean markdown. Interactive, TUI, CLI pipe, and file input paths. Auto-detection with no user flags required.
- **What's next:** v0.6.0 Phase 2 — `sourceFormat`/`sourceChars` in ContentStats, dev script updates, cut release.

## Product Intent

Keep `decant` laser-focused on the HTML/RTF/DOC/DOCX → clean markdown workflow. Minimize friction: fast default behavior, clipboard-first, useful stats. Preserve scriptability and power-user workflows.

## Task Routing

| Task | Where to look |
|------|--------------|
| Architecture overview | This file |
| Roadmap & iterations | `docs/strategy/ROADMAP.md` |
| Feature specs | `docs/specs/` |
| Contributing guidelines | `docs/CONTRIBUTING.md` |
| Release process | `docs/RELEASE.md` |
| Troubleshooting | `docs/TROUBLESHOOTING.md` |
| FAQ | `docs/FAQ.md` |

## Status Snapshot

| Component | Status | Notes |
|-----------|--------|-------|
| HTML pipeline | Stable | `clean`, `extract`, `stats` commands |
| RTF support | Stable | Clipboard + file + pipe, macOS `textutil` |
| DOC support | Stable | File input, macOS `textutil` |
| DOCX support | Stable | File input via `mammoth.js`, cross-platform |
| Interactive mode | Stable | Clipboard-first, auto-detect HTML/RTF |
| TUI mode | Stable | OpenTUI full-screen, clipboard polling |
| Dev tooling | Stable | Golden fixtures, smoke check, CI integration |

## Command Cheat Sheet

```bash
# Default interactive flow
decant

# Clipboard pipeline (script-friendly)
pbpaste | decant clean | pbcopy

# Extraction-first with stronger pruning
pbpaste | decant extract --aggressive | pbcopy

# Stats
decant stats -i snippet.html --format json

# RTF/DOC input (macOS — auto-detected)
decant clean -i document.rtf
cat document.rtf | decant clean

# DOCX input (cross-platform)
decant clean -i document.docx
decant clean -i document.docx --verbose

# Full-screen TUI path
decant --tui
```

## Architecture

### Entry and UX

- `src/cli.ts`
  - command registration, root options, no-subcommand flow, `resolveHtmlInput()` for format detection + conversion
- `src/commands/update.ts`
  - self-update logic (platform detection, GitHub release fetch, checksum verify, atomic swap)
- `src/interactive/runInteractive.ts`
  - clipboard-first interactive logic and summary output (detects HTML + RTF on clipboard)
- `src/tui/experimental.ts`
  - polished OpenTUI full-screen flow used by `--tui` (detects HTML + RTF on clipboard)

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

- `src/lib/contentDetect.ts` - format detection (`ContentFormat`, `detectFormat`, `looksLikeHtml`, `looksLikeRtf`, `isDocBytes`, `isDocxBytes`)
- `src/lib/convert.ts` - RTF/DOC → HTML via macOS `textutil`, DOCX → HTML via `mammoth.js`
- `src/lib/io.ts` - stdin/file/clipboard I/O (`readInput`, `readInputBytes`, `readClipboardRtf`)
- `src/lib/rules.ts` - cleanup heuristics
- `src/lib/sessionStats.ts` - persistent session metrics
- `src/lib/types.ts` - shared types

### Developer scripts

- `scripts/update-golden.ts` - regenerates `.expected.md` golden fixtures from current pipeline
- `scripts/smoke-check.ts` - quality threshold guard (per-fixture ≥30% char reduction, mean ≥40%)

### Validation

- `test/pipeline.test.ts` - pipeline behavior
- `test/cli.test.ts` - command-level behavior (includes RTF + DOCX integration tests)
- `test/contentDetect.test.ts` - content detection unit tests (HTML, RTF, DOC, DOCX)
- `test/convert.test.ts` - RTF/DOC conversion tests (macOS-gated) + DOCX conversion tests (cross-platform)
- `test/update.test.ts` - update command unit + integration tests

## Priorities

1. v0.6.0 Phase 2 — `sourceFormat`/`sourceChars` in ContentStats, dev script updates, cut release
2. v0.7.0 — PDF support

The user directs priority. See `docs/strategy/ROADMAP.md` for full iteration plan.

## Maintenance

Keep this file current as you work. After completing a task, update:
- **Recent Work** — add a bullet for what was done
- **Checkpoint** — refresh current state and what's working
- **Status Snapshot** — update component statuses
- **Priorities** — reorder or replace based on what's next
- **Architecture** — if structure changed

Also update `docs/strategy/ROADMAP.md` when iterations advance or new decisions emerge.

## Scope Guardrails

- Do not turn `decant` into a broad multi-source context platform.
- Keep this repo optimized for the single high-value workflow above.
- A broader TUI/power-CLI platform is planned separately (`ctxkit` concept).
