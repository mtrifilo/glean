Release a new version of Glean.

Follow these steps:

1. Verify preconditions (run in parallel):
   - `git status` — working tree must be clean
   - `git branch --show-current` — must be on `main`
   - `git log --oneline -1 origin/main..main` — check if local is ahead of remote
   - `bun test` — all tests must pass
   - Read `CHANGELOG.md` to check for `[Unreleased]` entries
   - Read `package.json` to get current version

2. If the working tree is dirty, tests fail, or you're not on main, stop and explain what needs to be fixed.

3. If there are no entries under `[Unreleased]` in CHANGELOG.md, stop and explain there's nothing to release.

4. Determine the version bump. $ARGUMENTS may specify `patch`, `minor`, or `major`. If not specified, infer from the changelog entries:
   - Bug fixes only → patch
   - New features or enhancements → minor
   - Breaking changes → major
   Ask the user to confirm the version number before proceeding.

5. Update `package.json` with the new version.

6. Update `CHANGELOG.md`:
   - Rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD` (use today's date)
   - Add a new empty `[Unreleased]` section above it

7. Run `bun test` again to confirm nothing broke.

8. Stage and commit:
   ```
   git add package.json CHANGELOG.md
   git commit -m "chore: release vX.Y.Z"
   ```

9. Tag the release:
   ```
   git tag vX.Y.Z
   ```

10. Show the user a summary of what was done and ask for confirmation before pushing. Then:
    ```
    git push origin main --follow-tags
    ```

11. Report the result:
    - Confirm the tag was pushed
    - Remind that `.github/workflows/release.yml` will build and publish binaries
    - Remind that `.github/workflows/package-managers.yml` will update Homebrew/Scoop manifests
    - Provide a link to check the release: `https://github.com/<owner>/<repo>/releases/tag/vX.Y.Z`
