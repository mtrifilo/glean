# decant

[![CI](https://img.shields.io/github/actions/workflow/status/mtrifilo/decant/ci.yml?branch=main&label=build)](https://github.com/mtrifilo/decant/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/mtrifilo/decant?color=blue)](https://github.com/mtrifilo/decant/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

Transform your clipboard into token-efficient markdown as fast as possible.

## Just `decant`

Copy content from anywhere — a web page, a Word doc, an RTF file — then run `decant`.
Your clipboard will be instantly transformed into markdown, which you can paste into your agent for context.

```bash
decant                                          # clipboard-first
```

## Why this exists

Most document-to-markdown tools stop at conversion. Decant focuses on what happens next: feeding that content into an LLM.

Every document carries noise — wrapper markup, nav blocks, styling attributes, boilerplate footers. That noise burns context window tokens and dilutes the signal your model sees. Decant strips it out and tells you exactly how much you saved.

**Token-aware output.** Decant doesn't just convert — it measures. Every run reports character and token reduction so you know how efficiently your content fits a context window.

**Interactive, clipboard-first.** No flags, no file paths for the common case. Copy content, run `decant`, paste clean markdown. The full-screen TUI (`--tui`) adds live clipboard detection, color-coded stats, and styled preview panels.

**Local and fast.** Single binary, zero runtime dependencies, works offline. Install with one command, update with `decant update`. No API keys, no cloud, no Python environment.

**URL fetching.** Skip the browser entirely — `decant clean --url https://...` fetches, cleans, and converts in one step. Content-type validation ensures you're getting HTML, not a PDF or JSON endpoint.

**Scriptable.** Pipes work exactly how you'd expect: `pbpaste | decant clean | pbcopy`. JSON stats output, file input, URL input, and all options are flag-driven for easy automation.

**Token budget.** Set `--max-tokens N` and Decant handles the rest. In scripts, it errors with a section-by-section breakdown so you never silently lose data. In a terminal, it smart-truncates by dropping sections from the end and tells you exactly what was kept. Stats mode shows the full budget analysis without touching the output.

## What's ahead

Decant's roadmap is focused on the space between document conversion and LLM consumption — the workflow intelligence that no other tool provides:

- **Interactive section selection** — TUI section picker for `--max-tokens` workflows with real-time budget counter and content preview
- **TUI workspace** — syntax-highlighted preview, scrollable output, option toggling, continuous mode
- **Diff mode** — see exactly what the pipeline removed
- **Quality scoring** — know how clean your output is before you paste it
- **Chunking for RAG** — split documents into sized chunks for retrieval pipelines
- **More formats** — OCR for scanned PDFs, PowerPoint, EPUB, and more

See the full [roadmap](docs/strategy/ROADMAP.md) for details.

## Install (fastest paths)

Pick one command path and run it.

macOS/Linux (Homebrew):

```bash
brew tap mtrifilo/tap https://github.com/mtrifilo/homebrew-tap && brew install mtrifilo/tap/decant
```

Windows (Scoop):

```powershell
scoop bucket add mtrifilo https://github.com/mtrifilo/scoop-bucket; scoop install mtrifilo/decant
```

No package manager? Use the release installer:

```bash
curl -fsSL https://raw.githubusercontent.com/mtrifilo/decant/main/install | DECANT_REPO=mtrifilo/decant bash
```

```powershell
$env:DECANT_REPO="mtrifilo/decant"; irm https://raw.githubusercontent.com/mtrifilo/decant/main/install.ps1 | iex
```

Verify install:

```bash
decant --help
```

Quick first run:

```bash
pbpaste | decant clean | pbcopy
```

Current prebuilt targets:

- `darwin-arm64`
- `linux-x64`
- `windows-x64`

For unsupported targets (for example macOS `x64`, Linux `arm64`, Windows `arm64`), use source install.

## Upgrade

From a compiled binary:

```bash
decant update
```

Or re-run your install command (`brew upgrade`, `scoop update`, or installer script).
Use `DECANT_VERSION=<tag>` to pin a specific release.

## Source install (development or unsupported targets)

Requirements:

- Bun `>= 1.3`
- macOS only if you want clipboard output via `--copy`

```bash
bun install
bun link
```

After linking, `decant` is available in your shell.

Installer env vars (script path only):

- `DECANT_VERSION` (default: `latest`)
- `DECANT_INSTALL_DIR` (custom binary destination)

## Commands

- `decant` - interactive mode (clipboard-first, auto-process + auto-copy + stats)
- `decant clean` - deterministic HTML cleanup + markdown conversion
- `decant extract` - Readability-first extraction, then cleanup + markdown conversion
- `decant stats` - report character/token estimate deltas between input and markdown output
- `decant update` - self-update to the latest release (compiled binaries only)
- `decant --version` - print the current version

## No-subcommand options (`decant`)

- `--mode clean|extract` choose pipeline for interactive/no-subcommand runs (default: `clean`)
- `--aggressive` enable stronger pruning for interactive/no-subcommand runs (default: off)
- `--tui` launch the full-screen OpenTUI interface with color-coded stats, bordered panels, and live clipboard detection (requires TTY; falls back to standard interactive mode if TUI startup fails)

## Common options (`clean`, `extract`, `stats`)

- `-i, --input <path>` read from file instead of stdin (HTML, RTF, DOC, DOCX, or PDF)
- `-u, --url <url>` fetch and convert a web page URL (mutually exclusive with `--input`)
- `--copy` copy output to clipboard using `pbcopy` (macOS)
- `--keep-links` preserve markdown links (default)
- `--strip-links` keep link text, remove URLs
- `--keep-images` preserve images
- `--strip-images` remove images (default)
- `--no-preserve-tables` remove table output
- `--max-heading-level <1-6>` clamp heading depth
- `--aggressive` stronger pruning heuristics
- `--verbose` show extra details (URL fetch progress, DOCX conversion warnings, PDF page count)
- `--max-tokens <n>` set a token budget — errors in pipes, smart-truncates in TTY, enriches stats output

## Stats-only options

- `--mode clean|extract` pipeline used before reporting (default: `clean`)
- `--format md|json` output format (default: `md`)

## Interactive mode

Run `decant` with no subcommand to enter interactive mode.

- Uses defaults automatically (`clean`, aggressive off)
- Does not prompt for mode/pruning choices during normal flow (use flags to override)
- Detects HTML or RTF in clipboard and runs immediately (Word/TextEdit copies work automatically)
- If clipboard has no convertible content, shows an animated spinner while you copy, then press Enter to retry
- Copies parsed markdown to clipboard automatically
- Shows color-coded stats (chars/tokens saved with reduction percentages), session totals, and a truncated output preview
- Respects `NO_COLOR` env var for plain-text fallback
- Use `--tui` for a full-screen OpenTUI variant with bordered panels, live clipboard polling, and styled preview

Session stats are persisted to `~/.decant/stats.json` by default.
Set `DECANT_STATS_PATH` to override the stats file location.

## Examples

```bash
# Clipboard-first workflow on macOS
pbpaste | decant clean | pbcopy

# No-arg interactive workflow (recommended for everyday use)
decant

# No-arg interactive, but use extract mode + aggressive pruning
decant --mode extract --aggressive

# Copy directly from command output
pbpaste | decant clean --copy

# Run extract mode against a local HTML snippet
decant extract -i snippet.html

# Clean an RTF or DOC file (macOS — auto-detected)
decant clean -i document.rtf
decant clean -i document.doc

# Clean a DOCX file (cross-platform)
decant clean -i document.docx

# Clean a PDF file (cross-platform, text-based)
decant clean -i document.pdf

# Fetch and clean a web page directly
decant clean --url https://example.com/article
decant extract -u https://example.com/article

# Fetch a URL with verbose logging
decant clean -u https://example.com/article --verbose

# Token budget — error if output exceeds 2000 tokens (piped)
pbpaste | decant clean --max-tokens 2000 | pbcopy

# Token budget — smart truncation in TTY
decant clean -i large-doc.html --max-tokens 4000

# Token budget — section breakdown in stats
decant stats -i report.pdf --max-tokens 2000

# Stats from a URL
decant stats --url https://example.com/article --format json

# Pipe RTF through stdin
cat document.rtf | decant clean

# Compare reductions as JSON
decant stats -i snippet.html --format json

# Full-screen OpenTUI mode
decant --tui
```

## LLM Session Handoff

For fast session resume and context-efficient drilldown:

- `docs/llm-context.md` - compact project snapshot for LLM bootstrapping
- `docs/strategy/ROADMAP.md` - iteration plan and open decisions
- `docs/specs/` - feature specs and design documents
- `docs/RESUME_PROMPT.md` - copy/paste resume prompt templates
- `docs/README.md` - docs index and recommended load order

## Open Source Docs

- `LICENSE`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `docs/RELEASE.md`
- `docs/TROUBLESHOOTING.md`
- `docs/FAQ.md`
- `docs/PACKAGE_MANAGERS.md`

## Development

Run tests:

```bash
bun test
```

Build a single binary (optional):

```bash
bun run build:binary
```
