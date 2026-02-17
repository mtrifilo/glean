# Release Day Runbook

This runbook is a living checklist for the first public open-source release of `glean`.
Update this file in real time while executing each step.

## Snapshot

- Date: 2026-02-16
- Current branch: `main`
- Current git state: no commits yet
- Remote configured: no
- Existing tags: none

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
  - Confirm final GitHub slug (`mtrifilo/glean`).
  - Replace placeholder repo references in docs/install instructions.
  - Verify all install commands point to the final slug.

- [~] Step 2 - Establish initial remote and first push
  - Create GitHub repository if not already created.
  - Add `origin` remote.
  - Make initial commit.
  - Push `main` to GitHub.

- [ ] Step 3 - Verify CI on GitHub
  - Confirm `CI` workflow runs and passes on pushed `main`.
  - Confirm branch protection and contribution settings are configured.

- [ ] Step 4 - Run local release validation
  - Run `bun test`.
  - Run smoke checks: `glean`, `glean clean`, `glean stats`, `glean --tui`.
  - Run `bun run build:binary` and validate binary help output.

- [ ] Step 5 - Confirm release artifact matrix
  - Verify release workflow builds all promised platform and architecture artifacts.
  - Update workflow or docs if artifact scope differs.

- [ ] Step 6 - Prepare release metadata
  - Confirm `package.json` version.
  - Finalize `CHANGELOG.md` release section.
  - Confirm `README.md` install and upgrade sections are accurate.

- [ ] Step 7 - Cut and publish first release
  - Create and push release tag (`vX.Y.Z`).
  - Confirm release workflow succeeds.
  - Confirm binaries and `checksums.txt` are attached to the release.

- [ ] Step 8 - Validate installers against published release
  - Validate `install` (macOS/Linux flow).
  - Validate `install.ps1` (Windows flow or review with expected artifact names).
  - Confirm checksum verification works for happy path and mismatch path.

- [ ] Step 9 - Final open-source readiness pass
  - Confirm `SECURITY.md` private reporting path is explicit.
  - Confirm `CODE_OF_CONDUCT.md` reporting channel is explicit.
  - Confirm issue templates, PR template, and docs index are complete.

- [ ] Step 10 - Announce and handoff
  - Draft release announcement with quick-start commands.
  - Add post-release watch plan (issues triage and patch window).

## Step Notes

### Step 1 - Finalize public repo identity

- Status: `[x]`
- Notes:
  - Final slug confirmed as `mtrifilo/glean`.
  - Updated install/docs references in:
    - `README.md`
    - `docs/FAQ.md`
    - `docs/TROUBLESHOOTING.md`

### Step 2 - Establish initial remote and first push

- Status: `[~]`
- Notes:
  - Baseline check: no `origin` remote configured.

### Step 3 - Verify CI on GitHub

- Status: `[ ]`
- Notes:
  - Cannot run until first push is complete.

### Step 4 - Run local release validation

- Status: `[ ]`
- Notes:
  - Pending execution.

### Step 5 - Confirm release artifact matrix

- Status: `[ ]`
- Notes:
  - Current workflow matrix is OS-only (`ubuntu`, `macos`, `windows`).
  - Need to verify if this meets promised per-arch artifacts.

### Step 6 - Prepare release metadata

- Status: `[ ]`
- Notes:
  - `package.json` currently `0.1.0`.
  - `CHANGELOG.md` has `0.1.0` section and `Unreleased`.

### Step 7 - Cut and publish first release

- Status: `[ ]`
- Notes:
  - Pending first remote push and tag.

### Step 8 - Validate installers against published release

- Status: `[ ]`
- Notes:
  - Pending published release assets.

### Step 9 - Final open-source readiness pass

- Status: `[ ]`
- Notes:
  - Security and conduct docs exist; may need explicit reporting channels.

### Step 10 - Announce and handoff

- Status: `[ ]`
- Notes:
  - Pending release completion.
