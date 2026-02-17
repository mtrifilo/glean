# Release Guide

This guide describes how to cut and publish a new Glean release.

## Preconditions

- `bun test` passes locally.
- `README.md` reflects current behavior.
- `CHANGELOG.md` has release notes drafted.

## Suggested Release Flow

1. Update version in `package.json`.
2. Move key notes from `Unreleased` into a dated version section in `CHANGELOG.md`.
3. Run validation:
   - `bun test`
   - smoke checks for:
     - `glean`
     - `glean clean`
     - `glean stats`
     - `glean --tui`
4. Build binary:
   - `bun run build:binary`
5. Verify binary:
   - run `dist/glean --help`
6. Push a release tag:
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
7. Confirm GitHub release workflow succeeds:
   - `.github/workflows/release.yml`
   - artifacts uploaded for each platform
   - `checksums.txt` attached
8. Announce release with usage examples.

## Smoke Commands

```bash
printf '%s' '<article><h1>hello</h1><p>world</p></article>' | glean clean
printf '%s' '<article><h1>hello</h1><p>world</p></article>' | glean stats
```

## Post-Release

- Confirm install docs remain accurate.
- Confirm one-command installers work:
  - `install` (macOS/Linux)
  - `install.ps1` (Windows)
- Update roadmap status in `docs/plans/GLEAN_CLI_PLAN.md` if needed.
- Collect first user-reported issues and patch quickly.
