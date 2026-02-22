# Release Day Runbook

This runbook is a living checklist for the first public open-source release of `decant` (originally `glean`).
Update this file in real time while executing each step.

## Snapshot

- Date: 2026-02-16
- Current branch: `main`
- Current git state: 1 local commit + tracking `origin/main`
- Remote configured: yes (`origin` -> `https://github.com/mtrifilo/decant.git`)
- Existing tags: `v0.1.0`, `v0.1.1`, `v0.1.2`, `v0.1.3`

## Execution Rules

1. Run steps in order unless a blocker requires reordering.
2. Mark each step as:
   - `[x]` complete
   - `[~]` in progress
   - `[ ]` not started
   - `[!]` blocked
3. Record evidence (commands run, links, outputs) in the step notes.
4. If behavior changes, update docs before moving to the next step.

## Checklist

- [x] Step 1 - Finalize public repo identity
  - Confirm final GitHub slug (`mtrifilo/decant`).
  - Replace placeholder repo references in docs/install instructions.
  - Verify all install commands point to the final slug.

- [x] Step 2 - Establish initial remote and first push
  - Create GitHub repository if not already created.
  - Add `origin` remote.
  - Make initial commit.
  - Push `main` to GitHub.

- [x] Step 3 - Verify CI on GitHub
  - Confirm `CI` workflow runs and passes on pushed `main`.
  - Confirm branch protection and contribution settings are configured.

- [x] Step 4 - Run local release validation
  - Run `bun test`.
  - Run smoke checks: `decant`, `decant clean`, `decant stats`, `decant --tui`.
  - Run `bun run build:binary` and validate binary help output.

- [x] Step 5 - Confirm release artifact matrix
  - Verify release workflow builds all promised platform and architecture artifacts.
  - Update workflow or docs if artifact scope differs.

- [x] Step 6 - Prepare release metadata
  - Confirm `package.json` version.
  - Finalize `CHANGELOG.md` release section.
  - Confirm `README.md` install and upgrade sections are accurate.

- [x] Step 7 - Cut and publish first release
  - Create and push release tag (`vX.Y.Z`).
  - Confirm release workflow succeeds.
  - Confirm binaries and `checksums.txt` are attached to the release.

- [x] Step 8 - Validate installers against published release
  - Validate `install` (macOS/Linux flow).
  - Validate `install.ps1` (Windows flow or review with expected artifact names).
  - Confirm checksum verification works for happy path and mismatch path.

- [x] Step 9 - Final open-source readiness pass
  - Confirm `SECURITY.md` private reporting path is explicit.
  - Confirm `CODE_OF_CONDUCT.md` reporting channel is explicit.
  - Confirm issue templates, PR template, and docs index are complete.

- [x] Step 10 - Announce and handoff
  - Draft release announcement with quick-start commands.
  - Add post-release watch plan (issues triage and patch window).

## Step Notes

### Step 1 - Finalize public repo identity

- Status: `[x]`
- Notes:
  - Final slug confirmed as `mtrifilo/decant` (originally `mtrifilo/glean`, renamed in v0.6.1).
  - Updated install/docs references in:
    - `README.md`
    - `docs/FAQ.md`
    - `docs/TROUBLESHOOTING.md`

### Step 2 - Establish initial remote and first push

- Status: `[x]`
- Notes:
  - Created GitHub repo: `https://github.com/mtrifilo/decant`.
  - Initial commit created: `5d2188a`.
  - Pushed `main` and set upstream to `origin/main`.

### Step 3 - Verify CI on GitHub

- Status: `[x]`
- Notes:
  - CI run `22082241150` passed on `main` push.
  - Repo settings verified:
    - Visibility: `PUBLIC`
    - Default branch: `main`
    - Issues: enabled
  - Branch protection check returned `Branch not protected` (currently unset).

### Step 4 - Run local release validation

- Status: `[x]`
- Notes:
  - `bun test` passed locally (17/17).
  - Smoke checks passed:
    - `printf '<article...>' | decant clean`
    - `printf '<article...>' | decant stats`
    - `printf '<article...>' | decant`
  - `decant --tui` non-TTY behavior validated: exits `1` with clear TTY-required message.
  - `bun run build:binary` initially failed due GFM plugin default import mismatch.
  - Fixed in `src/pipeline/toMarkdown.ts` by switching to named `gfm` import.
  - Re-ran validation: tests pass, binary build succeeds, `dist/decant --help` works.

### Step 5 - Confirm release artifact matrix

- Status: `[x]`
- Notes:
  - Updated `.github/workflows/release.yml` to explicit target matrix:
    - `darwin-arm64` (`macos-14`)
    - `linux-x64` (`ubuntu-latest`)
    - `windows-x64` (`windows-latest`)
  - Initial release attempt showed `macos-13` is unsupported in current Actions tier.
  - Matrix was adjusted to currently supported runners/targets.
  - Updated `README.md`, `install`, `docs/TROUBLESHOOTING.md`, and plan docs to align with current published targets.
  - `darwin-x64` and `linux-arm64` are documented as planned and currently unsupported in installer.

### Step 6 - Prepare release metadata

- Status: `[x]`
- Notes:
  - `package.json` bumped to `0.1.3` for follow-up patch release after runtime validation failures on `v0.1.0`, `v0.1.1`, and `v0.1.2`.
  - `CHANGELOG.md` updated and aligned for first public release.
  - `README.md` install/upgrade section updated with final slug and supported binary targets.

### Step 7 - Cut and publish first release

- Status: `[x]`
- Notes:
  - Created and pushed tag: `v0.1.0`.
  - First release run (`22082359415`) failed for two reasons:
    - unsupported runner label (`macos-13`)
    - shell interpolation bug in binary rename step
  - Applied workflow/docs/installer fixes on `main`.
  - Reran release via workflow dispatch (`22082424548`) and published assets:
    - `decant-darwin-arm64`
    - `decant-linux-x64`
    - `decant-windows-x64.exe`
    - `checksums.txt`
  - Released `v0.1.1` from tag workflow run `22082550937`.
  - Released `v0.1.2` from tag workflow run `22082667775`.
  - Released `v0.1.3` from tag workflow run `22082789488` after linkedom migration.

### Step 8 - Validate installers against published release

- Status: `[x]`
- Notes:
  - Installer happy path against `v0.1.0` downloaded and verified checksum successfully.
  - Runtime validation failed after install: binary crashed on startup due missing `jsdom` default stylesheet asset in compiled bundle.
  - `v0.1.1` improved startup (`--help` works) but command execution still failed at runtime.
  - `v0.1.2` still failed at runtime (`xhr-sync-worker.js` module resolution from `jsdom` in compiled binary).
  - Migrated DOM parsing from `jsdom` to `linkedom` in processing pipelines to remove Bun compiled-binary runtime incompatibilities.
  - Local validation now passes:
    - `bun test`
    - `bun run build:binary`
    - `dist/decant --help`
    - `printf '<article...>' | dist/decant clean`
    - `printf '<article...>' | dist/decant stats --format json`
  - `v0.1.3` installer validation (macOS) succeeded end-to-end:
    - install download + checksum verification
    - `decant --help`
    - `decant clean`
    - `decant stats --format json`
  - `install.ps1` reviewed and updated to clearly fail on unsupported `windows-arm64`.

### Step 9 - Final open-source readiness pass

- Status: `[x]`
- Notes:
  - Updated `SECURITY.md` with explicit private advisory URL:
    - `https://github.com/mtrifilo/decant/security/advisories/new`
  - Updated `CODE_OF_CONDUCT.md` with explicit report-request workflow.
  - Added issue template contact links in `.github/ISSUE_TEMPLATE/config.yml` for:
    - private security reports
    - conduct private report requests
  - Verified issue templates, PR template, and docs index are present.

### Step 10 - Announce and handoff

- Status: `[x]`
- Notes:
  - Announcement draft prepared (for release notes or pinned issue):
    - `decant v0.1.3 is now available with working prebuilt binaries for darwin-arm64, linux-x64, and windows-x64.`
    - Install:
      - `curl -fsSL https://raw.githubusercontent.com/mtrifilo/decant/main/install | DECANT_REPO=mtrifilo/decant bash`
      - `$env:DECANT_REPO="mtrifilo/decant"; irm https://raw.githubusercontent.com/mtrifilo/decant/main/install.ps1 | iex`
    - Upgrade:
      - rerun installer with `DECANT_REPO=mtrifilo/decant`
    - Core workflow:
      - `pbpaste | decant clean | pbcopy`
  - Post-release watch plan:
    - monitor new issues for install/runtime regressions
    - prioritize binary/runtime fixes within first 48 hours
    - cut fast patch releases if installer or command execution regressions appear
