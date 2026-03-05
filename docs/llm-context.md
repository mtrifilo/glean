# Decant — LLM Context

> Entry point for Claude Code sessions. Read this first.

## Recent Work

- v1.0.1 shipped — Restored stashed polish work lost during v1.0.0 release: TUI blank-line filtering, in-place aggressive reprocessing, aggressive stats row, auto-indent for diff left pane, h/l pan, output hash recording, token count diff titles, removed mode toggle. Pipeline: expanded content-protected tags, container protection. Diff: removed-line tag splitting, incomplete tag stripping. 3 noise keyword tests.
- v1.0.0 shipped — TUI is now the default interactive mode. Running `decant` with no subcommand in a TTY launches the full-screen TUI. `--tui` flag removed, replaced by `--no-tui` to opt out. Falls back to standard clipboard mode if TUI initialization fails.
- v0.13.0 shipped — Diff mode: `--diff` flag on CLI subcommands, `d` toggle in TUI for two-pane diff view. `src/lib/diff.ts` (prettyPrintHtml, computeDiff, formatDiffAnsi; entity-aware text matching, no external deps). `colorDiffLine` in tuiHighlight.ts. 21 tests in `test/diff.test.ts`. Fixed ANSI color helpers lazy env var evaluation.
- v0.12.0 shipped — TUI enhancements: scrollable preview, syntax highlighting, shortcut bar, continuous mode, option toggling, URL detection, file drag-and-drop. New modules: tuiHighlight.ts, tuiFileDrop.ts.
- v0.11.0 shipped — Interactive section selection TUI via `--max-tokens N`.
- v0.10.0 shipped — Token budget via `--max-tokens N`.
- v0.9.0 shipped — URL fetching via `--url`/`-u`.
- v0.8.0 shipped — PDF text extraction via `unpdf`.
- v0.7.0 shipped — Interactive mode polish + raw markdown syntax highlighting.
- v0.6.1 shipped — Renamed project from `glean` to `decant`.
- v0.6.0 shipped — DOCX file support via `mammoth.js`.

## Checkpoint

- **Current state:** v1.0.1 shipped. 260 tests passing (+ 2 skipped), 506 expect() calls across 12 test files.
- **What's working:** HTML, RTF, DOC, DOCX, PDF → clean markdown. URL → HTML via `--url`/`-u`. Token budget via `--max-tokens`. TUI as default interactive mode (full-screen, clipboard polling, URL detection, file drag-and-drop, continuous mode, aggressive toggle, diff view). Standard clipboard mode via `--no-tui`. TUI section picker via `--max-tokens N`. Diff mode via `--diff` flag and TUI `d` toggle.
- **What's next:** v1.1.0 Quality Score. See ROADMAP.md.

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
| Interactive mode | Stable | TUI is default; `--no-tui` for standard clipboard mode |
| TUI mode | Stable | OpenTUI full-screen (default), clipboard polling, URL detection, file drag-and-drop, continuous mode, aggressive toggle, diff view, scrollable highlighted preview |
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

# Standard clipboard mode (skip TUI)
decant --no-tui

# TUI with interactive section picker
decant --max-tokens 2000
```

## Architecture

### Entry and UX

- `src/entry.ts`
  - bootstrap entry point — imports `./cli.ts`
- `src/cli.ts`
  - command registration, root options (`--no-tui`, `--mode`, `--aggressive`, `--max-tokens`), no-subcommand flow, `resolveHtmlInput()` for format detection + conversion
- `src/commands/update.ts`
  - self-update logic (platform detection, GitHub release fetch, checksum verify, atomic swap)
- `src/interactive/runInteractive.ts`
  - interactive entry point — launches TUI by default (`skipTui: false`), falls back to standard clipboard mode. ANSI-colored stats, syntax-highlighted preview with word-wrap
- `src/tui/experimental.ts`
  - polished OpenTUI full-screen flow (default interactive mode) — clipboard polling, URL detection, file drag-and-drop, continuous mode, aggressive toggle, diff view, windowed scrollable results
- `src/tui/sectionPicker.ts`
  - interactive section picker screen for `--max-tokens N` — two-pane layout, keyboard + mouse navigation, windowed scroll, budget counter
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
- `src/lib/diff.ts` - diff engine for comparing original HTML vs clean markdown (prettyPrintHtml, computeDiff, formatDiffAnsi); entity-aware text matching, no external deps
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

1. v1.1.0 — Quality score
2. v1.2.0 — Section filtering
3. OpenTUI adoption — MarkdownRenderable, DiffRenderable, TextTableRenderable

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
