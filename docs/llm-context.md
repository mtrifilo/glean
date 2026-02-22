# Decant — LLM Context

> Entry point for Claude Code sessions. Read this first.

## Recent Work

- v0.8.0 in progress — PDF text extraction via `unpdf` (MIT, cross-platform). Added `isPdfBytes()`, `convertPdfToHtml()`, wired into CLI `resolveHtmlInput()`. Test fixture + full test coverage (detection, conversion, CLI integration).
- v0.7.0 shipped — interactive mode polish (colors, spinner, formatted stats, word-wrapped preview) + raw markdown syntax highlighting replacing `marked`/`marked-terminal`. Added `src/lib/highlightMarkdown.ts`, `src/lib/ansi.ts`, `test/preview.test.ts`.
- TUI file drop research — documented terminal drag-and-drop across iTerm2/Kitty/WezTerm/Ghostty, studied OpenCode's implementation, wrote spec at `docs/specs/TUI_FILE_DROP.md` (v0.11.0)
- v0.6.1 — renamed project from `glean` to `decant` (CLI, env vars, paths, docs, CI, installers)
- v0.6.0 — DOCX file support via `mammoth.js`, source tracking in stats, `--verbose` flag
- v0.5.0 — content detection + RTF/DOC support via macOS `textutil` (zero new deps)

## Checkpoint

- **Current state:** v0.8.0 PDF support implemented. 108 tests passing (106 + 2 skipped), 201 expect() calls across 6 test files.
- **What's working:** HTML, RTF, DOC, DOCX, and PDF → clean markdown. PDF uses `unpdf` for text extraction, cross-platform. Scanned/image PDFs return a placeholder comment (OCR deferred to v0.22.0).
- **What's next:** See `docs/strategy/ROADMAP.md` — next up is URL fetching (v0.9.0).

## Product Intent

Keep `decant` laser-focused on the HTML/RTF/DOC/DOCX/PDF → clean markdown workflow. Minimize friction: fast default behavior, clipboard-first, useful stats. Preserve scriptability and power-user workflows.

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
| PDF support | Stable | File input via `unpdf`, cross-platform, text-based |
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

# PDF input (cross-platform, text-based)
decant clean -i document.pdf
decant clean -i document.pdf --verbose

# Full-screen TUI path
decant --tui
```

## Architecture

### Entry and UX

- `src/entry.ts`
  - bootstrap entry point — imports `./cli.ts`
- `src/cli.ts`
  - command registration, root options, no-subcommand flow, `resolveHtmlInput()` for format detection + conversion
- `src/commands/update.ts`
  - self-update logic (platform detection, GitHub release fetch, checksum verify, atomic swap)
- `src/interactive/runInteractive.ts`
  - clipboard-first interactive logic, ANSI-colored stats, syntax-highlighted preview with word-wrap
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

- `src/lib/ansi.ts` - zero-dep ANSI color helpers (accent, success, muted, highlight, bold, dim; respects `NO_COLOR` and `FORCE_COLOR`)
- `src/lib/highlightMarkdown.ts` - regex-based ANSI syntax highlighting for raw markdown source
- `src/lib/contentDetect.ts` - format detection (`ContentFormat`, `detectFormat`, `looksLikeHtml`, `looksLikeRtf`, `isDocBytes`, `isDocxBytes`, `isPdfBytes`)
- `src/lib/convert.ts` - RTF/DOC → HTML via macOS `textutil`, DOCX → HTML via `mammoth.js`, PDF → HTML via `unpdf`
- `src/lib/io.ts` - stdin/file/clipboard I/O (`readInput`, `readInputBytes`, `readClipboardRtf`)
- `src/lib/rules.ts` - cleanup heuristics
- `src/lib/sessionStats.ts` - persistent session metrics
- `src/lib/types.ts` - shared types

### Developer scripts

- `scripts/update-golden.ts` - regenerates `.expected.md` golden fixtures from current pipeline
- `scripts/smoke-check.ts` - quality threshold guard (per-fixture ≥30% char reduction, mean ≥40%)

### Validation

- `test/pipeline.test.ts` - pipeline behavior
- `test/cli.test.ts` - command-level behavior (includes RTF, DOCX, PDF integration tests)
- `test/contentDetect.test.ts` - content detection unit tests (HTML, RTF, DOC, DOCX, PDF)
- `test/convert.test.ts` - RTF/DOC conversion tests (macOS-gated) + DOCX + PDF conversion tests (cross-platform)
- `test/preview.test.ts` - preview rendering tests (syntax highlighting, truncation, inline patterns)
- `test/update.test.ts` - update command unit + integration tests

## Priorities

1. v0.9.0 — URL fetching
2. v0.10.0 — Token budget

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
