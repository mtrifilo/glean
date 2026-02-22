# FAQ

## What is Decant?

Decant converts noisy HTML, RTF, and Word documents into concise
markdown so you can provide better LLM context with fewer tokens.

## How do I install Decant with one command?

Use the installer scripts documented in `README.md`:

- macOS/Linux: `install`
- Windows: `install.ps1`

Set `DECANT_REPO=mtrifilo/decant` for this repository.

## Is Decant available in package managers?

Yes.

- Homebrew tap:
  - `brew tap mtrifilo/tap https://github.com/mtrifilo/homebrew-tap`
  - `brew install mtrifilo/tap/decant`
- Scoop bucket:
  - `scoop bucket add mtrifilo https://github.com/mtrifilo/scoop-bucket`
  - `scoop install mtrifilo/decant`

Current prebuilt targets are `darwin-arm64`, `linux-x64`, and `windows-x64`.

## How do I update Decant?

If you installed a compiled binary (via installer, Homebrew, or Scoop), run:

```bash
decant update
```

This checks GitHub for the latest release, verifies the download checksum, and
replaces the binary in place. Use `decant update --force` to reinstall even if
already on the latest version.

If you are running from source, use `git pull && bun install` instead.

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

- Default: `~/.decant/stats.json`
- Override with `DECANT_STATS_PATH`

## Does Decant require OpenTUI?

No. Standard interactive mode and CLI commands work without full-screen TUI.
`--tui` enables the OpenTUI path.

## Is Decant intended to be a general context platform?

Not in this repo. Decant stays focused on the HTML/RTF/Word -> markdown workflow.
Broader context-platform ideas are tracked separately.
