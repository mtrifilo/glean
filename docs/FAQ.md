# FAQ

## What is Glean?

Glean converts noisy HTML (for example copied from Chrome DevTools) into concise
markdown so you can provide better LLM context with fewer tokens.

## How do I install Glean with one command?

Use the installer scripts documented in `README.md`:

- macOS/Linux: `install`
- Windows: `install.ps1`

Set `GLEAN_REPO=mtrifilo/glean` for this repository.

## Is Glean available in package managers?

Yes.

- Homebrew tap:
  - `brew tap mtrifilo/tap https://github.com/mtrifilo/homebrew-tap`
  - `brew install mtrifilo/tap/glean`
- Scoop bucket:
  - `scoop bucket add mtrifilo https://github.com/mtrifilo/scoop-bucket`
  - `scoop install mtrifilo/glean`

Current prebuilt targets are `darwin-arm64`, `linux-x64`, and `windows-x64`.

## What is the difference between `clean` and `extract`?

- `clean`: deterministic cleanup and conversion.
- `extract`: content extraction first, then cleanup (better for pages with lots
  of unrelated UI elements).

## When should I use `--aggressive`?

Use it when output still contains too much boilerplate or low-value content.
Keep it off if you need maximum content retention.

## Is interactive mode configurable?

Yes. No-subcommand mode defaults to `clean` with aggressive pruning off, and
you can override with:

- `--mode clean|extract`
- `--aggressive`

## Where are run/session stats stored?

- Default: `~/.glean/stats.json`
- Override with `GLEAN_STATS_PATH`

## Does Glean require OpenTUI?

No. Standard interactive mode and CLI commands work without full-screen TUI.
`--tui` enables the OpenTUI path.

## Is Glean intended to be a general context platform?

Not in this repo. Glean stays focused on the DevTools HTML -> markdown workflow.
Broader context-platform ideas are tracked separately.
