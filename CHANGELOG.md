# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow
Semantic Versioning after `1.0.0`.

## [Unreleased]

### Added

- Open-source governance docs:
  - `LICENSE`
  - `CODE_OF_CONDUCT.md`
  - `SECURITY.md`
  - root `CONTRIBUTING.md`
- Maintainer docs:
  - `docs/RELEASE.md`
  - `docs/TROUBLESHOOTING.md`
  - `docs/FAQ.md`

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
