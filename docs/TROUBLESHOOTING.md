# Troubleshooting

## `glean: command not found`

- Run `bun link` from the repository root.
- Ensure Bun bin path is in your shell PATH:
  - `export PATH="$HOME/.bun/bin:$PATH"`

## Installer says repository is missing

- The installer needs `GLEAN_REPO` set to `mtrifilo/glean`.
- Example:
  - `curl -fsSL https://raw.githubusercontent.com/mtrifilo/glean/main/install | GLEAN_REPO=mtrifilo/glean bash`

## Installer cannot find matching release asset

- Confirm your release includes platform binaries named like:
  - `glean-darwin-arm64`
  - `glean-linux-x64`
  - `glean-windows-x64.exe`
- Confirm you are installing from the intended repository and release tag.

## Clipboard not detected in interactive mode

- Confirm HTML is copied in DevTools before running `glean`.
- In interactive mode, press Enter to re-check clipboard after copying.
- On non-macOS systems, clipboard workflows may differ from `pbcopy`/`pbpaste`.

## `--copy` fails

- `--copy` uses `pbcopy` and currently targets macOS workflows.
- If clipboard write fails, pipe to stdout and copy manually as fallback.

## `--tui` fails to start

- `--tui` requires an interactive TTY.
- If OpenTUI initialization fails, Glean should fall back to standard interactive mode.
- Try plain `glean` to continue without full-screen TUI.

## Output seems too aggressive

- Use `clean` mode instead of `extract`.
- Disable aggressive pruning (`--aggressive` off).
- Try `--keep-links` or table-preserving defaults depending on content type.

## Output is empty or missing expected content

- Verify the copied HTML actually contains target content (not just wrappers).
- Try `glean extract` for article-heavy content with lots of page chrome.
- Compare `clean` vs `extract` outputs and choose the better result.

## Stats file location

- Default: `~/.glean/stats.json`
- Override path:
  - `GLEAN_STATS_PATH=/custom/path/stats.json glean`
