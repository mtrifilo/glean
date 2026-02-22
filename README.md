# decant

Token-efficient document-to-markdown for LLMs. Local, fast, interactive.

## Just `decant`

Copy content from anywhere — a web page, a Word doc, an RTF file — then run `decant`. Clean markdown lands on your clipboard, ready to paste into your agent.

```bash
decant
```

## Why this exists

Most document-to-markdown tools stop at conversion. Decant focuses on what happens next: feeding that content into an LLM.

Every document carries noise — wrapper markup, nav blocks, styling attributes, boilerplate footers. That noise burns context window tokens and dilutes the signal your model sees. Decant strips it out and tells you exactly how much you saved.

**Token-aware output.** Decant doesn't just convert — it measures. Every run reports character and token reduction so you know how efficiently your content fits a context window.

**Interactive, clipboard-first.** No flags, no file paths for the common case. Copy content, run `decant`, paste clean markdown. The full-screen TUI (`--tui`) adds live clipboard detection, color-coded stats, and styled preview panels.

**Local and fast.** Single binary, zero runtime dependencies, works offline. Install with one command, update with `decant update`. No API keys, no cloud, no Python environment.

**Scriptable.** Pipes work exactly how you'd expect: `pbpaste | decant clean | pbcopy`. JSON stats output, file input, and all options are flag-driven for easy automation.

## What's ahead

Decant's roadmap is focused on the space between document conversion and LLM consumption — the workflow intelligence that no other tool provides:

- **Token budget** (`--max-tokens`) — trim output to fit a context window
- **TUI workspace** — syntax-highlighted preview, scrollable output, option toggling, continuous mode
- **Diff mode** — see exactly what the pipeline removed
- **Quality scoring** — know how clean your output is before you paste it
- **Chunking for RAG** — split documents into sized chunks for retrieval pipelines
- **URL fetching** — skip the clipboard, convert web pages directly
- **PDF and more** — expanding format support beyond HTML/RTF/DOC/DOCX

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

- `-i, --input <path>` read from file instead of stdin (HTML, RTF, DOC, or DOCX)
- `--copy` copy output to clipboard using `pbcopy` (macOS)
- `--keep-links` preserve markdown links (default)
- `--strip-links` keep link text, remove URLs
- `--keep-images` preserve images
- `--strip-images` remove images (default)
- `--no-preserve-tables` remove table output
- `--max-heading-level <1-6>` clamp heading depth
- `--aggressive` stronger pruning heuristics
- `--verbose` show conversion warnings (e.g. from DOCX processing)

## Stats-only options

- `--mode clean|extract` pipeline used before reporting (default: `clean`)
- `--format md|json` output format (default: `md`)

## Interactive mode

Run `decant` with no subcommand to enter interactive mode.

- Uses defaults automatically (`clean`, aggressive off)
- Does not prompt for mode/pruning choices during normal flow (use flags to override)
- Detects HTML or RTF in clipboard and runs immediately (Word/TextEdit copies work automatically)
- If clipboard has no convertible content, prompts you to copy and press Enter to retry
- Copies parsed markdown to clipboard automatically
- Shows current-run stats and session totals (tokens/chars saved)
- Use `--tui` for a full-screen OpenTUI variant with styled stats panels, color-coded output, and live clipboard polling

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
glean clean -i document.docx

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
