# Development Workflow

This guide covers the branch-to-release cycle for Glean contributions.

## Branch Strategy

All work happens on short-lived feature branches off `main`.

### Branch naming

| Prefix     | Use case                        |
|------------|---------------------------------|
| `feat/`    | New features or enhancements    |
| `fix/`     | Bug fixes                       |
| `chore/`   | Maintenance, deps, CI changes   |
| `docs/`    | Documentation-only changes      |

Examples: `feat/tui-polish`, `fix/clipboard-fallback`, `chore/update-deps`

## Feature Development

1. **Create a branch** from `main`:
   ```bash
   git checkout main && git pull
   git checkout -b feat/my-feature
   ```

2. **Make changes** — keep commits focused and atomic.

3. **Validate locally**:
   ```bash
   bun test
   # Smoke-test relevant commands
   glean
   glean --tui
   ```

4. **Update docs** if behavior changed:
   - `README.md` (user-facing behavior)
   - `docs/llm-context.md` (architecture/status snapshot)
   - `CHANGELOG.md` (add entry under `[Unreleased]`)

## Opening a Pull Request

Push your branch and open a PR against `main`.

```bash
git push -u origin feat/my-feature
```

Use the `/pr` Claude Code skill or `gh pr create` to open the PR. Every PR should clearly document:

- **What** changed (concrete summary of modifications)
- **Why** it changed (motivation, user problem, or context)
- **How to test** (steps a reviewer can follow)
- **Scope check** (stays within Glean's core workflow focus)

See `.github/PULL_REQUEST_TEMPLATE.md` for the full template.

### PR guidelines

- Keep PRs small and focused on a single concern.
- Reference related issues with `Closes #N` or `Related: #N`.
- Include before/after screenshots for visual changes (TUI, CLI output).
- All CI checks must pass before merging.

## Merging

- Maintainers review and merge PRs into `main`.
- Prefer **squash merge** for feature branches to keep `main` history clean.
- Delete the feature branch after merging.

## Branch Protection

`main` has branch protection enabled:
- Direct pushes to `main` are **not allowed**.
- All changes (including releases) must go through a PR.
- The `test` CI status check must pass before merging.

This means release commits cannot be pushed directly — they must go through a `chore/release-vX.Y.Z` branch and PR, with the tag pushed separately after merge.

## Releasing a New Version

After merging one or more PRs, cut a release when ready. Use the `/release` Claude Code skill or follow `docs/RELEASE.md` manually.

### Quick release checklist

1. Ensure `main` is clean and CI passes.
2. Decide the version bump (`patch`, `minor`, or `major`).
3. Create a release branch: `git checkout -b chore/release-vX.Y.Z`
4. Update `package.json` version.
5. Move `[Unreleased]` entries in `CHANGELOG.md` to a dated version section.
6. Commit the version bump: `chore: release vX.Y.Z`
7. Push the branch and open a PR:
   ```bash
   git push -u origin chore/release-vX.Y.Z
   gh pr create --title "chore: release vX.Y.Z" --body "..."
   ```
8. After CI passes and the PR is merged, tag the merge commit:
   ```bash
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
9. The `release.yml` workflow builds binaries and publishes a GitHub release.
10. The `package-managers.yml` workflow updates Homebrew and Scoop manifests.

For full details, see `docs/RELEASE.md` and `docs/PACKAGE_MANAGERS.md`.
