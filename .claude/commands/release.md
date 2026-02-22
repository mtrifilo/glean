Release a new version of Decant.

**Important:** `main` has branch protection requiring CI status checks. You cannot push directly to main. Releases must go through a PR.

Follow these steps:

1. Verify preconditions (run in parallel):
   - `git status` — working tree must be clean
   - `git branch --show-current` — must be on `main`
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

5. Create a release branch:
   ```
   git checkout -b chore/release-vX.Y.Z
   ```

6. Update `package.json` with the new version.

7. Update `CHANGELOG.md`:
   - Rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD` (use today's date)
   - Add a new empty `[Unreleased]` section above it

8. Run `bun test` again to confirm nothing broke.

9. Stage and commit:
   ```
   git add package.json CHANGELOG.md
   git commit -m "chore: release vX.Y.Z"
   ```

10. Push the branch and open a PR:
    ```
    git push -u origin chore/release-vX.Y.Z
    ```
    Create a PR with `gh pr create`. The PR body should list the version bump and summarize the changelog entries. Include a reminder in the PR body:
    > **After merging:** tag the merge commit and push the tag to trigger the release workflow:
    > ```
    > git checkout main && git pull
    > git tag vX.Y.Z
    > git push origin vX.Y.Z
    > ```

11. Report the result:
    - Provide the PR URL
    - Remind the user that after the PR merges, they need to tag + push, then update the release notes:
      ```
      git checkout main && git pull
      git tag vX.Y.Z
      git push origin vX.Y.Z
      ```
    - Remind the user that `.github/workflows/release.yml` will build and publish binaries and `.github/workflows/package-managers.yml` will update Homebrew/Scoop manifests
    - Provide the future release link: `https://github.com/<owner>/<repo>/releases/tag/vX.Y.Z`

12. After the user confirms the tag is pushed and the release workflow has completed, update the GitHub release description with the changelog entries for this version:
    - Extract the relevant section from `CHANGELOG.md` (everything under `[X.Y.Z]` until the next version heading)
    - Use `gh release edit vX.Y.Z --notes "..."` to set the release body
    - Confirm the release page looks correct
