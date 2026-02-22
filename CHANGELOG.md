# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow
Semantic Versioning after `1.0.0`.

## [Unreleased]

## [0.7.0] - 2026-02-22

### Changed

- Polished interactive mode (`decant` with no subcommand) — colored output, animated spinner while waiting for clipboard, formatted stats with arrows and reduction highlights, session totals, word-wrapped markdown preview (72 chars, truncated at 16 visual lines). Matches the TUI's visual style without requiring full-screen mode.
- Preview now shows raw markdown source with syntax highlighting (colored headings, bold markers, links, inline code, etc.) instead of rendered output. Markers like `**`, `#`, `[]()` stay visible but get colored for scannability.

### Added

- `src/lib/highlightMarkdown.ts` — regex-based ANSI syntax highlighting for raw markdown source (headings, bold, italic, links, inline code, code fences, blockquotes, lists, horizontal rules).
- `src/lib/ansi.ts` — zero-dependency ANSI color utility. Respects `NO_COLOR` env var, `TERM=dumb`, and `FORCE_COLOR` per [no-color.org](https://no-color.org).

### Removed

- `marked` and `marked-terminal` dependencies — preview no longer renders markdown into display output.

## [0.6.1] - 2026-02-22

### Fixed

- Lifetime session stats (runs, tokens saved) no longer reset after upgrading from the pre-rename `glean` builds. On first run, stats from `~/.glean/stats.json` are merged into `~/.decant/stats.json` and the legacy file is removed.

## [0.6.0] - 2026-02-22

### Added

- DOCX file support via `mammoth.js` — cross-platform, no macOS dependency required.
  - File: `decant clean -i file.docx`.
  - Auto-detected by ZIP magic bytes in content detection layer.
- `--verbose` flag on `clean`, `extract`, and `stats` commands — shows conversion warnings (e.g. mammoth messages during DOCX processing).
- `readInputBytes()` binary I/O helper for file-based binary format reading.
- `sourceFormat` and `sourceChars` fields in stats JSON output — tracks the original input format and size before conversion to HTML. Only included for non-HTML formats (RTF, DOC, DOCX).

### Changed

- **Project renamed from `glean` to `decant`** — CLI command, binary names, env vars (`GLEAN_*` → `DECANT_*`), config paths (`~/.glean/` → `~/.decant/`), GitHub URLs, installers, CI workflows, and all documentation updated. Historical changelog entries below are preserved as-is.
- `--input` help text updated to indicate DOCX support alongside HTML, RTF, and DOC.
- Content detection now recognizes DOCX (ZIP) magic bytes (`isDocxBytes()`).
- Stats markdown output header changed from `glean` to `decant`.

## [0.5.0] - 2026-02-21

### Added

- RTF and DOC input support (macOS) — auto-detected and converted to HTML via `textutil` (zero new dependencies).
  - Clipboard: interactive and TUI modes detect RTF from Word/TextEdit automatically.
  - File: `glean clean -i file.rtf` or `glean clean -i file.doc`.
  - Pipe: `cat file.rtf | glean clean`.
- Content detection module (`contentDetect.ts`) — unified format detection for HTML, RTF, DOC, and unknown input.
- RTF clipboard reading via `pbpaste -Prefer rtf` for Word/TextEdit compatibility.
- Golden fixture regeneration script (`bun run update-golden`) — rebuilds all `.expected.md` files from current pipeline output.
- Pipeline smoke check with quality thresholds (`bun run smoke-check`) — enforces per-fixture and aggregate char-reduction floors to catch heuristic regressions.
- Smoke check integrated into CI as a required step after tests.
- "Tuning Heuristics" section in `CONTRIBUTING.md` — documents the safe workflow for changing pipeline rules.

### Changed

- `looksLikeHtml()` consolidated from duplicated copies in `runInteractive.ts` and `experimental.ts` into shared `contentDetect.ts`.
- Interactive mode prompt updated to mention Word/RTF content alongside HTML.
- `--input` help text updated to indicate HTML, RTF, and DOC support.

## [0.3.0] - 2026-02-21

### Added

- CI smoke test workflow (`.github/workflows/smoke-test.yml`) — validates release binaries on all three platforms (download, checksum verify, `--version`, `glean clean` pipeline).

### Fixed

- Fixed TUI results screen where output preview text overlapped the "Press q, Enter, or Esc to exit" footer on smaller terminals. Preview now clips within available space and footer stays pinned at the bottom.

## [0.2.0] - 2026-02-21

### Added

- `glean update` self-update command for compiled binaries (downloads latest release, verifies SHA256 checksum, atomic binary swap).
- `glean --version` / `-V` flag to print the current version.
- Package-manager distribution scaffolding:

  - Homebrew formula generator (`scripts/generate-package-manager-manifests.ts`)
  - Scoop manifest generator (same script output)
  - automation workflow (`.github/workflows/package-managers.yml`)
- Generated maintainer-managed package metadata:
  - `packaging/homebrew/glean.rb`
  - `packaging/scoop/glean.json`
- New maintainer guide:
  - `docs/PACKAGE_MANAGERS.md`

### Changed

- Polished `--tui` full-screen mode with structured layout, color palette, and visual hierarchy (bordered Stats/Session boxes, colored stat labels and values, spinner characters, flex-based spacing).

## [0.1.3] - 2026-02-16

### Fixed

- Compiled binaries now correctly run `clean`/`extract`/`stats` by switching DOM parsing from `jsdom` to `linkedom`, avoiding `jsdom` compiled-binary runtime module loading failures.

### Changed

- Install docs and installer behavior now explicitly mark `windows-arm64` as source-install-only alongside other unsupported binary targets.

## [0.1.2] - 2026-02-16

### Changed

- Added a `jsdom` preload fallback for compiled binaries; this reduced startup failures but was insufficient for full command execution and is superseded by `0.1.3`.

## [0.1.1] - 2026-02-16

### Fixed

- Release workflow now avoids unsupported macOS runner labels and correctly renames artifacts without shell interpolation issues.

### Changed

- Published binary target matrix is now:
  - `darwin-arm64`
  - `linux-x64`
  - `windows-x64`
- Installer and troubleshooting docs now clearly direct unsupported platforms (`darwin-x64`, `linux-arm64`) to source install.
- Added an initial `jsdom` compiled-binary compatibility shim (superseded by `0.1.2` preload approach).

## [0.1.0] - 2026-02-16

### Added

- Initial Glean CLI with commands:
  - `clean`
  - `extract`
  - `stats`
- No-subcommand interactive mode (clipboard-first default flow).
- `--tui` minimal OpenTUI full-screen mode.
- Session stats tracking at `~/.glean/stats.json` (`GLEAN_STATS_PATH` override).
- Fixture and CLI test coverage with Bun test runner.
- Open-source governance docs:
  - `LICENSE`
  - `CODE_OF_CONDUCT.md`
  - `SECURITY.md`
  - root `CONTRIBUTING.md`
- Project docs and maintainer guides:
  - `docs/RELEASE.md`
  - `docs/TROUBLESHOOTING.md`
  - `docs/FAQ.md`
  - `docs/llm-context.md`
  - `docs/RESUME_PROMPT.md`
  - `docs/CONTRIBUTING.md`
- GitHub collaboration and automation scaffolding:
  - issue templates and PR template
  - CI workflow
  - release workflow with checksums publishing
- Installer scripts:
  - `install` (macOS/Linux)
  - `install.ps1` (Windows)

### Changed

- Binary build now supports `bun build --compile` reliably by using a named GFM plugin import in markdown conversion.
- Release artifact matrix and docs are aligned to published targets:
  - `darwin-arm64`
  - `linux-x64`
  - `windows-x64`
