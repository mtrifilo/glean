# glean

Get markdown from HTML for your LLM as fast as possible.

## Just `glean`

Run `glean` to transform your buffer's HTML into clean Markdown. Then paste the markdown into your agent.

```bash
glean

```

## Why this exists

Copying HTML from browser DevTools usually includes wrapper markup, styling attributes, nav/footer blocks, and other page furniture that burns tokens in chat context windows.  
This tool keeps the meaningful content and drops most of the noise.

## Install (fastest paths)

Pick one command path and run it.

macOS/Linux (Homebrew):

```bash
brew tap mtrifilo/tap https://github.com/mtrifilo/homebrew-tap && brew install mtrifilo/tap/glean
```

Windows (Scoop):

```powershell
scoop bucket add mtrifilo https://github.com/mtrifilo/scoop-bucket; scoop install mtrifilo/glean
```

No package manager? Use the release installer:

```bash
curl -fsSL https://raw.githubusercontent.com/mtrifilo/glean/main/install | GLEAN_REPO=mtrifilo/glean bash
```

```powershell
$env:GLEAN_REPO="mtrifilo/glean"; irm https://raw.githubusercontent.com/mtrifilo/glean/main/install.ps1 | iex
```

Verify install:

```bash
glean --help
```

Quick first run:

```bash
pbpaste | glean clean | pbcopy
```

Current prebuilt targets:

- `darwin-arm64`
- `linux-x64`
- `windows-x64`

For unsupported targets (for example macOS `x64`, Linux `arm64`, Windows `arm64`), use source install.

## Upgrade

From a compiled binary:

```bash
glean update
```

Or re-run your install command (`brew upgrade`, `scoop update`, or installer script).
Use `GLEAN_VERSION=<tag>` to pin a specific release.

## Source install (development or unsupported targets)

Requirements:

- Bun `>= 1.3`
- macOS only if you want clipboard output via `--copy`

```bash
bun install
bun link
```

After linking, `glean` is available in your shell.

Installer env vars (script path only):

- `GLEAN_VERSION` (default: `latest`)
- `GLEAN_INSTALL_DIR` (custom binary destination)

## Commands

- `glean` - interactive mode (clipboard-first, auto-process + auto-copy + stats)
- `glean clean` - deterministic HTML cleanup + markdown conversion
- `glean extract` - Readability-first extraction, then cleanup + markdown conversion
- `glean stats` - report character/token estimate deltas between input and markdown output
- `glean update` - self-update to the latest release (compiled binaries only)
- `glean --version` - print the current version

## No-subcommand options (`glean`)

- `--mode clean|extract` choose pipeline for interactive/no-subcommand runs (default: `clean`)
- `--aggressive` enable stronger pruning for interactive/no-subcommand runs (default: off)
- `--tui` launch the full-screen OpenTUI interface with color-coded stats, bordered panels, and live clipboard detection (requires TTY; falls back to standard interactive mode if TUI startup fails)

## Common options (`clean`, `extract`, `stats`)

- `-i, --input <path>` read HTML from file instead of stdin
- `--copy` copy output to clipboard using `pbcopy` (macOS)
- `--keep-links` preserve markdown links (default)
- `--strip-links` keep link text, remove URLs
- `--keep-images` preserve images
- `--strip-images` remove images (default)
- `--no-preserve-tables` remove table output
- `--max-heading-level <1-6>` clamp heading depth
- `--aggressive` stronger pruning heuristics

## Stats-only options

- `--mode clean|extract` pipeline used before reporting (default: `clean`)
- `--format md|json` output format (default: `md`)

## Interactive mode

Run `glean` with no subcommand to enter interactive mode.

- Uses defaults automatically (`clean`, aggressive off)
- Does not prompt for mode/pruning choices during normal flow (use flags to override)
- Detects HTML in clipboard and runs immediately
- If clipboard has no HTML, prompts you to copy HTML first and press Enter to retry
- Copies parsed markdown to clipboard automatically
- Shows current-run stats and session totals (tokens/chars saved)
- Use `--tui` for a full-screen OpenTUI variant with styled stats panels, color-coded output, and live clipboard polling

Session stats are persisted to `~/.glean/stats.json` by default.  
Set `GLEAN_STATS_PATH` to override the stats file location.

## Examples

```bash
# Clipboard-first workflow on macOS
pbpaste | glean clean | pbcopy

# No-arg interactive workflow (recommended for everyday use)
glean

# No-arg interactive, but use extract mode + aggressive pruning
glean --mode extract --aggressive

# Copy directly from command output
pbpaste | glean clean --copy

# Run extract mode against a local HTML snippet
glean extract -i snippet.html

# Compare reductions as JSON
glean stats -i snippet.html --format json

# Full-screen OpenTUI mode
glean --tui
```

## LLM Session Handoff

For fast session resume and context-efficient drilldown:

- `docs/llm-context.md` - compact project snapshot for LLM bootstrapping
- `docs/RESUME_PROMPT.md` - copy/paste resume prompt templates
- `docs/CONTRIBUTING.md` - repo-specific implementation and validation rules
- `docs/README.md` - docs index and recommended load order
- `docs/plans/GLEAN_CLI_PLAN.md` - implementation and roadmap source of truth

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
