Open a pull request for the current branch against main.

Follow these steps:

1. Run these commands in parallel to understand the current state:
   - `git status` to see uncommitted changes
   - `git log main..HEAD --oneline` to see all commits on this branch
   - `git diff main...HEAD --stat` to see which files changed
   - `git branch --show-current` to confirm the branch name
   - `git diff main...HEAD` to see the full diff

2. If there are uncommitted changes, ask whether to commit them first.

3. If the branch has no commits ahead of main, stop and explain there's nothing to open a PR for.

4. Analyze ALL commits and the full diff to understand the complete set of changes. Do not just look at the latest commit.

5. Push the branch if it hasn't been pushed yet:
   ```
   git push -u origin <branch-name>
   ```

6. Draft the PR title and body:
   - Title: short (under 70 chars), imperative mood (e.g., "Add TUI color palette" not "Added TUI color palette")
   - Body: fill in the PR template sections (What changed, Why, How it works, Testing, Screenshots, Scope check)
   - Be specific and concrete — these PR descriptions serve as historical documentation
   - Check the Testing boxes that apply based on what was actually done
   - Include the Screenshots section only if there are visual changes

7. Create the PR:
   ```
   gh pr create --title "<title>" --body "<body>"
   ```
   Use a HEREDOC for the body to preserve formatting.

8. Return the PR URL.

$ARGUMENTS - Optional: a short description of the PR focus to guide the summary. If not provided, infer from the commits and diff.
