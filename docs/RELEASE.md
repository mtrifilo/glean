# Release Guide

This guide describes how to cut and publish a new Decant release.

## Preconditions

- `bun test` passes locally.
- `README.md` reflects current behavior.
- `CHANGELOG.md` has release notes drafted.

## Suggested Release Flow

> **Note:** `main` has branch protection — direct pushes are not allowed. Release commits must go through a PR.

1. Start on `main` with a clean working tree:
   ```bash
   git checkout main && git pull
   ```
2. Create a release branch:
   ```bash
   git checkout -b chore/release-vX.Y.Z
   ```
3. Update version in `package.json`.
4. Move key notes from `Unreleased` into a dated version section in `CHANGELOG.md`.
5. Run validation:
   - `bun test`
   - smoke checks for:
     - `decant`
     - `decant clean`
     - `decant stats`
     - `decant --tui`
6. Commit and push the release branch:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release vX.Y.Z"
   git push -u origin chore/release-vX.Y.Z
   ```
7. Open a PR and wait for CI to pass, then merge.
8. Tag the merge commit on `main`:
   ```bash
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
9. Confirm GitHub release workflow succeeds:
   - `.github/workflows/release.yml`
   - artifacts uploaded for each platform
   - `checksums.txt` attached
10. Announce release with usage examples.

## Smoke Commands

```bash
printf '%s' '<article><h1>hello</h1><p>world</p></article>' | decant clean
printf '%s' '<article><h1>hello</h1><p>world</p></article>' | decant stats
```

## Post-Release

- Confirm install docs remain accurate.
- Confirm one-command installers work:
  - `install` (macOS/Linux)
  - `install.ps1` (Windows)
- Update roadmap status in `docs/strategy/ROADMAP.md` if needed.
- Collect first user-reported issues and patch quickly.
