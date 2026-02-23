# Decant — LLM Context

> Entry point for Claude Code sessions. Read this first.

## Recent Work

- v0.9.0 — URL fetching via `--url`/`-u` flag. Added `src/lib/fetchUrl.ts` (`isValidUrl()`, `fetchUrl()`), wired into CLI `resolveHtmlInput()`, added `"url"` to `ContentFormat`. Full test coverage in `test/fetchUrl.test.ts` + CLI integration tests.
- v0.8.0 shipped — PDF text extraction via `unpdf` (MIT, cross-platform). Added `isPdfBytes()`, `convertPdfToHtml()`, wired into CLI `resolveHtmlInput()`. Test fixture + full test coverage.
- v0.7.0 shipped — interactive mode polish (colors, spinner, formatted stats, word-wrapped preview) + raw markdown syntax highlighting replacing `marked`/`marked-terminal`.
- v0.6.1 — renamed project from `glean` to `decant` (CLI, env vars, paths, docs, CI, installers)
- v0.6.0 — DOCX file support via `mammoth.js`, source tracking in stats, `--verbose` flag

## Checkpoint

- **Current state:** v0.9.0 URL fetching implemented. 130 tests passing (+ 2 skipped), 239 expect() calls across 7 test files.
- **What's working:** HTML, RTF, DOC, DOCX, PDF → clean markdown. URL fetching via `--url`/`-u` with content-type validation, timeout, redirect following. Scanned/image PDFs return a placeholder comment (OCR deferred to v0.22.0).
- **What's next:** See `docs/strategy/ROADMAP.md` — next up is token budget (v0.10.0).

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
| URL fetching | Stable | `--url`/`-u` flag, content-type validation, 15s timeout |
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

# URL fetching
decant clean --url https://example.com/article
decant extract -u https://example.com/article
decant stats --url https://example.com --format json

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
- `src/lib/fetchUrl.ts` - URL fetching (`isValidUrl`, `fetchUrl`) — HTTP fetch with User-Agent, timeout, content-type validation
- `src/lib/io.ts` - stdin/file/clipboard I/O (`readInput`, `readInputBytes`, `readClipboardRtf`)
- `src/lib/rules.ts` - cleanup heuristics
- `src/lib/sessionStats.ts` - persistent session metrics
- `src/lib/types.ts` - shared types

### Developer scripts

- `scripts/update-golden.ts` - regenerates `.expected.md` golden fixtures from current pipeline
- `scripts/smoke-check.ts` - quality threshold guard (per-fixture ≥30% char reduction, mean ≥40%)

### Validation

- `test/pipeline.test.ts` - pipeline behavior
- `test/cli.test.ts` - command-level behavior (includes RTF, DOCX, PDF, URL integration tests)
- `test/fetchUrl.test.ts` - URL fetching unit tests (validation, HTML/XHTML, content-type rejection, HTTP errors, redirects, timeout)
- `test/contentDetect.test.ts` - content detection unit tests (HTML, RTF, DOC, DOCX, PDF)
- `test/convert.test.ts` - RTF/DOC conversion tests (macOS-gated) + DOCX + PDF conversion tests (cross-platform)
- `test/preview.test.ts` - preview rendering tests (syntax highlighting, truncation, inline patterns)
- `test/update.test.ts` - update command unit + integration tests

## Priorities

1. v0.10.0 — Token budget
2. v0.11.0 — TUI enhancements

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
