# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow
Semantic Versioning after `1.0.0`.

## [Unreleased]

- No changes yet.

## [0.1.1] - 2026-02-16

### Fixed

- Compiled binaries no longer crash on startup due missing `jsdom` stylesheet asset paths in Bun compiled mode.
- Release workflow now avoids unsupported macOS runner labels and correctly renames artifacts without shell interpolation issues.

### Changed

- Published binary target matrix is now:
  - `darwin-arm64`
  - `linux-x64`
  - `windows-x64`
- Installer and troubleshooting docs now clearly direct unsupported platforms (`darwin-x64`, `linux-arm64`) to source install.

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
