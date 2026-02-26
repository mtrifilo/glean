# Decant — LLM Context

> Entry point for Claude Code sessions. Read this first.

## Recent Work

- v0.13.0 in progress — Diff mode: `--diff` flag on CLI subcommands, `d` toggle in TUI for two-pane diff view (original HTML with kept/removed coloring + clean markdown). New module: `src/lib/diff.ts` (prettyPrintHtml, computeDiff, formatDiffAnsi). New TUI helper: `colorDiffLine` in tuiHighlight.ts. Extended `ProcessResult` with optional `inputHtml`. 17 new tests in `test/diff.test.ts`. New dep: `diff` (jsdiff).
- v0.12.0 shipped — TUI enhancements: scrollable windowed preview (j/k/arrows/PageUp/PageDown/mouse wheel), rich syntax highlighting (headings, bold, italic, code, links, lists, blockquotes, code fences), shortcut bar on all screens, continuous mode (c to continue), option toggling (a=aggressive, m=mode), URL auto-detection in clipboard, file drag-and-drop via paste event. New modules: `src/tui/tuiHighlight.ts` (shared colors, colorLineRich, buildFenceStateMap, shortcutBar), `src/tui/tuiFileDrop.ts` (normalizePastedPath, isSupportedFile, readAndConvertFile). Duplicate clipboard detection via content hashing.
- v0.11.0 shipped — Interactive section selection TUI. New `src/tui/sectionPicker.ts` module with two-pane picker screen (section list + content preview), real-time budget counter, keyboard + mouse navigation, windowed scroll. `--max-tokens` threaded to root command for TUI use. Auto-fit greedy selection, over-budget warning (not blocking). Fixed ScrollBox layout (was overriding OpenTUI's internal flexDirection).
- v0.10.0 shipped — Token budget via `--max-tokens N`. Section-aware parsing, piped error path (exit 1 + breakdown), TTY smart truncation (drop from end + warning), stats enrichment with per-section tokens and budget fields. New module `src/pipeline/tokenBudget.ts`.
- v0.9.0 shipped — URL fetching via `--url`/`-u` flag. Bun built-in `fetch()`, 15s timeout, content-type validation, redirect following. Mutually exclusive with `--input`.
- v0.8.0 shipped — PDF text extraction via `unpdf` (MIT, cross-platform). Scanned/image PDFs return placeholder (OCR deferred to v0.23.0).
- v0.7.0 shipped — interactive mode polish (colors, spinner, formatted stats, word-wrapped preview) + raw markdown syntax highlighting.
- v0.6.1 shipped — renamed project from `glean` to `decant`.
- v0.6.0 shipped — DOCX file support via `mammoth.js`, source tracking in stats, `--verbose` flag.

## Checkpoint

- **Current state:** v0.13.0 in progress. 253 tests passing (+ 2 skipped), 494 expect() calls across 12 test files. All tests pass in full-suite runs.
- **What's working:** HTML, RTF, DOC, DOCX, PDF → clean markdown. URL → HTML via `--url`/`-u`. Token budget via `--max-tokens`. Interactive clipboard-first mode. TUI full-screen mode. TUI section picker via `--tui --max-tokens N`. TUI scrollable preview, syntax highlighting, continuous mode, option toggling, URL detection, file drag-and-drop. Diff mode via `--diff` flag and TUI `d` toggle.
- **What's next:** Ship v0.13.0. Then v0.14.0 Quality Score.

## Product Intent

Keep `decant` laser-focused on the HTML/RTF/DOC/DOCX/PDF/URL → clean markdown workflow. Minimize friction: fast default behavior, clipboard-first, useful stats. Preserve scriptability and power-user workflows.

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
| Token budget | Stable | `--max-tokens N`, section-aware truncation, piped error + TTY warning, TUI section picker |
| Interactive mode | Stable | Clipboard-first, auto-detect HTML/RTF |
| TUI mode | Stable | OpenTUI full-screen, clipboard polling, URL detection, file drag-and-drop, continuous mode, option toggling, scrollable highlighted preview |
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

# Token budget
pbpaste | decant clean --max-tokens 2000 | pbcopy
decant clean -i large-doc.html --max-tokens 4000
decant stats -i report.pdf --max-tokens 2000

# Full-screen TUI path
decant --tui

# TUI with interactive section picker
decant --tui --max-tokens 2000
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
  - polished OpenTUI full-screen flow used by `--tui` — clipboard polling, URL detection, file drag-and-drop, continuous mode, option toggling, windowed scrollable results
- `src/tui/sectionPicker.ts`
  - interactive section picker screen for `--tui --max-tokens N` — two-pane layout, keyboard + mouse navigation, windowed scroll, budget counter
- `src/tui/tuiHighlight.ts`
  - shared TUI color palette, rich markdown line highlighting (colorLineRich), code fence state tracking (buildFenceStateMap), shortcut bar builder
- `src/tui/tuiFileDrop.ts`
  - file drag-and-drop support — path normalization, extension checking, file reading and conversion

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
- `src/pipeline/tokenBudget.ts`
  - section parsing, budget analysis, truncation, formatted error/warning output

### Shared utilities and state

- `src/lib/ansi.ts` - zero-dep ANSI color helpers (accent, success, muted, highlight, removed, bold, dim; respects `NO_COLOR` and `FORCE_COLOR`)
- `src/lib/diff.ts` - diff engine for comparing original HTML vs clean markdown (prettyPrintHtml, computeDiff, formatDiffAnsi)
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
- `test/cli.test.ts` - command-level behavior (includes RTF, DOCX, PDF, URL, token budget integration tests)
- `test/tokenBudget.test.ts` - token budget unit tests (section parsing, breakdown, truncation, formatters)
- `test/sectionPicker.test.ts` - section picker pure logic tests (auto-fit, token computation, budget colors)
- `test/tuiHighlight.test.ts` - TUI highlighting tests (colorLineRich, buildFenceStateMap, shortcutBar)
- `test/tuiFileDrop.test.ts` - file drop tests (path normalization, extension checking)
- `test/diff.test.ts` - diff engine tests (prettyPrintHtml, computeDiff, formatDiffAnsi)
- `test/fetchUrl.test.ts` - URL fetching unit tests (validation, HTML/XHTML, content-type rejection, HTTP errors, redirects, timeout)
- `test/contentDetect.test.ts` - content detection unit tests (HTML, RTF, DOC, DOCX, PDF)
- `test/convert.test.ts` - RTF/DOC conversion tests (macOS-gated) + DOCX + PDF conversion tests (cross-platform)
- `test/preview.test.ts` - preview rendering tests (syntax highlighting, truncation, inline patterns)
- `test/update.test.ts` - update command unit + integration tests

## Priorities

1. v0.13.0 — Diff mode (implemented, ready to ship)
2. v0.14.0 — Quality score
3. v0.15.0 — Section filtering

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
