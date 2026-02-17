# Package Manager Distribution

This guide covers how `glean` is published to Homebrew, Scoop, and (optionally) Winget.

## Goals

- Keep install UX simple for end users.
- Keep updates low-touch for maintainers.
- Reuse GitHub release assets + checksums as the source of truth.

## Current Maintainer Assets

- Homebrew formula template/output: `packaging/homebrew/glean.rb`
- Scoop manifest template/output: `packaging/scoop/glean.json`
- Manifest generator script:
  - `bun run package:manifests -- --tag vX.Y.Z --owner <owner> --repo <repo>`
- Publish workflow:
  - `.github/workflows/package-managers.yml`

## 1) Homebrew (recommended first)

Create a tap repository:

- `mtrifilo/homebrew-tap`

Tap structure:

- `Formula/glean.rb`

End-user install:

```bash
brew tap mtrifilo/tap https://github.com/mtrifilo/homebrew-tap
brew install mtrifilo/tap/glean
```

## 2) Scoop (Windows)

Create a bucket repository:

- `mtrifilo/scoop-bucket`

Bucket structure:

- `bucket/glean.json`

End-user install:

```powershell
scoop bucket add mtrifilo https://github.com/mtrifilo/scoop-bucket
scoop install mtrifilo/glean
```

## 3) Automation Setup

`package-managers.yml` can generate and publish Homebrew + Scoop metadata from a release tag.

Required secret in `glean` repo:

- `PACKAGE_MANAGER_PAT`
  - personal access token with `contents:write` access to:
    - `mtrifilo/homebrew-tap`
    - `mtrifilo/scoop-bucket`

Optional repo variables in `glean` repo:

- `HOMEBREW_TAP_REPO` (default: `<owner>/homebrew-tap`)
- `SCOOP_BUCKET_REPO` (default: `<owner>/scoop-bucket`)

Run manually:

1. Actions -> `Update Package Managers`
2. Input tag (example: `v0.1.3`)
3. Confirm generated artifact + published commits

The workflow also runs automatically when a GitHub release is published.

## 4) Winget (manual channel)

Winget is a separate public manifest repo (`microsoft/winget-pkgs`).
Start manual submissions after Homebrew + Scoop are stable.

Recommended process:

1. Generate a new manifest using winget tooling.
2. Point installer URL at `glean-windows-x64.exe` GitHub release asset.
3. Use release checksum in the manifest.
4. Submit PR to `microsoft/winget-pkgs`.

## Notes on Platform Support

Prebuilt binaries currently ship for:

- `darwin-arm64`
- `linux-x64`
- `windows-x64`

Unsupported architectures should use source install (`bun install`, `bun link`) until release artifacts expand.
