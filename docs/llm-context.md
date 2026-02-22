# Glean — LLM Context

> Entry point for Claude Code sessions. Read this first.

## Recent Work

- v0.5.0 released — content detection + RTF/DOC support via macOS `textutil` (zero new deps)
- Consolidated duplicated `looksLikeHtml()` into shared `contentDetect.ts`
- Interactive + TUI clipboard polling now detects RTF from Word/TextEdit
- CLI `resolveHtmlInput()` handles file, pipe, and stdin RTF/DOC
- Dev tooling (golden fixture regen, smoke check) bundled into v0.5.0

## Checkpoint

- **Current state:** v0.5.0 released. RTF/DOC input works across all paths (clipboard, file, pipe). 63 tests passing.
- **What's working:** HTML, RTF, and DOC → clean markdown. Interactive, TUI, CLI pipe, and file input paths. Auto-detection with no user flags required.
- **What's next:** See `docs/strategy/ROADMAP.md` — v0.6.0 (DOCX support via `mammoth.js`)

## Product Intent

Keep `glean` laser-focused on the HTML/RTF/DOC → clean markdown workflow. Minimize friction: fast default behavior, clipboard-first, useful stats. Preserve scriptability and power-user workflows.

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
| DOCX support | Planned | v0.6.0 via `mammoth.js` |
| Interactive mode | Stable | Clipboard-first, auto-detect HTML/RTF |
| TUI mode | Stable | OpenTUI full-screen, clipboard polling |
| Dev tooling | Stable | Golden fixtures, smoke check, CI integration |

## Command Cheat Sheet

```bash
# Default interactive flow
glean

# Clipboard pipeline (script-friendly)
pbpaste | glean clean | pbcopy

# Extraction-first with stronger pruning
pbpaste | glean extract --aggressive | pbcopy

# Stats
glean stats -i snippet.html --format json

# RTF/DOC input (macOS — auto-detected)
glean clean -i document.rtf
cat document.rtf | glean clean

# Full-screen TUI path
glean --tui
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

- `src/lib/contentDetect.ts` - format detection (`ContentFormat`, `detectFormat`, `looksLikeHtml`, `looksLikeRtf`, `isDocBytes`)
- `src/lib/convert.ts` - RTF/DOC → HTML conversion via macOS `textutil` (zero deps)
- `src/lib/io.ts` - stdin/file/clipboard I/O (includes `readClipboardRtf`)
- `src/lib/rules.ts` - cleanup heuristics
- `src/lib/sessionStats.ts` - persistent session metrics
- `src/lib/types.ts` - shared types

### Developer scripts

- `scripts/update-golden.ts` - regenerates `.expected.md` golden fixtures from current pipeline
- `scripts/smoke-check.ts` - quality threshold guard (per-fixture ≥30% char reduction, mean ≥40%)

### Validation

- `test/pipeline.test.ts` - pipeline behavior
- `test/cli.test.ts` - command-level behavior (includes RTF integration tests)
- `test/contentDetect.test.ts` - content detection unit tests
- `test/convert.test.ts` - RTF/DOC conversion tests (macOS-gated)
- `test/update.test.ts` - update command unit + integration tests

## Priorities

1. v0.6.0 — DOCX file support via `mammoth.js` (spec: `docs/specs/WORD_RTF_SUPPORT.md`)
2. Stats extension — `sourceFormat` / `sourceChars` in `ContentStats`

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

- Do not turn `glean` into a broad multi-source context platform.
- Keep this repo optimized for the single high-value workflow above.
- A broader TUI/power-CLI platform is planned separately (`ctxkit` concept).
