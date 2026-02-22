# Troubleshooting

## `decant: command not found`

- Run `bun link` from the repository root.
- Ensure Bun bin path is in your shell PATH:
  - `export PATH="$HOME/.bun/bin:$PATH"`

## Installer says repository is missing

- The installer needs `DECANT_REPO` set to `mtrifilo/decant`.
- Example:
  - `curl -fsSL https://raw.githubusercontent.com/mtrifilo/decant/main/install | DECANT_REPO=mtrifilo/decant bash`

## Installer cannot find matching release asset

- Confirm your release includes platform binaries named like:
  - `decant-darwin-arm64`
  - `decant-linux-x64`
  - `decant-windows-x64.exe`
- Confirm you are installing from the intended repository and release tag.

## Homebrew install issues

- Confirm tap setup:
  - `brew tap mtrifilo/tap https://github.com/mtrifilo/homebrew-tap`
- Then install:
  - `brew install mtrifilo/tap/decant`
- On unsupported architectures, Homebrew formula will direct you to source install.

## Scoop install issues

- Confirm bucket setup:
  - `scoop bucket add mtrifilo https://github.com/mtrifilo/scoop-bucket`
- Then install:
  - `scoop install mtrifilo/decant`
- If Scoop blocks execution, ensure your PowerShell execution policy allows Scoop usage.

## macOS x64 install support

- macOS x64 prebuilt binaries are not currently published.
- Use source install for now:
  - `bun install`
  - `bun link`

## Linux arm64 install support

- Linux arm64 prebuilt binaries are not currently published.
- Use source install for now:
  - `bun install`
  - `bun link`

## Windows arm64 install support

- Windows arm64 prebuilt binaries are not currently published.
- Use source install for now:
  - `bun install`
  - `bun link`

## `decant update` says "running from source"

- Self-update only works with compiled binaries.
- If you installed via `bun link`, update with `git pull && bun install` instead.

## `decant update` fails with a permission error

- The binary path may require elevated permissions to overwrite.
- On macOS/Linux, try `sudo decant update`.
- On Windows, run PowerShell as Administrator.

## Clipboard not detected in interactive mode

- Confirm HTML is copied in DevTools before running `decant`.
- In interactive mode, press Enter to re-check clipboard after copying.
- On non-macOS systems, clipboard workflows may differ from `pbcopy`/`pbpaste`.

## `--copy` fails

- `--copy` uses `pbcopy` and currently targets macOS workflows.
- If clipboard write fails, pipe to stdout and copy manually as fallback.

## `--tui` fails to start

- `--tui` requires an interactive TTY.
- If OpenTUI initialization fails, Decant should fall back to standard interactive mode.
- Try plain `decant` to continue without full-screen TUI.

## Output seems too aggressive

- Use `clean` mode instead of `extract`.
- Disable aggressive pruning (`--aggressive` off).
- Try `--keep-links` or table-preserving defaults depending on content type.

## Output is empty or missing expected content

- Verify the copied HTML actually contains target content (not just wrappers).
- Try `decant extract` for article-heavy content with lots of page chrome.
- Compare `clean` vs `extract` outputs and choose the better result.

## Stats file location

- Default: `~/.decant/stats.json`
- Override path:
  - `DECANT_STATS_PATH=/custom/path/stats.json decant`
