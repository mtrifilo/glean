# Glean - HTML to Markdown Context Cleaner CLI Plan (Bun)

## Problem Statement

When copying content from Chrome DevTools, the clipboard usually contains a large amount of noisy HTML:

- Deep wrapper markup that is not relevant to the article content
- Inline `style` attributes, classes, IDs, tracking attributes, and layout scaffolding
- Navigation, ads, footer, and other unrelated page furniture

Pasting this raw HTML into an LLM chat wastes tokens and obscures the real context.  
We need a CLI tool that converts copied HTML into clean, compact markdown focused on meaningful content.

## Current Workflow (As-Is)

1. Build a project while working with Codex.
2. Need to include an article section from a website for context.
3. Open Chrome DevTools and copy an element containing the needed text.
4. Paste the copied HTML into Convex/LLM chat.
5. The pasted content includes too much markup and metadata, causing token waste.

## Desired Workflow (To-Be)

1. Copy element HTML from DevTools as usual.
2. Run a command like `pbpaste | glean clean`.
3. Get clean markdown output with only useful content.
4. Paste concise markdown into LLM chat for better context density.

## Goals

- Convert arbitrary copied HTML to readable markdown.
- Remove non-content noise aggressively but safely.
- Preserve semantic structure (headings, lists, links, emphasis, tables when possible).
- Make clipboard-first usage fast (pipe input, clipboard output option).
- Keep output token-efficient for LLM context windows.

## Non-Goals (Initial Version)

- Pixel-perfect page rendering in markdown.
- Full website scraping or crawling.
- JavaScript execution for dynamic pages.
- Perfect extraction for every possible site on day one.

## Success Criteria

- Typical copied DevTools snippet shrinks by at least 60 to 90 percent in character count.
- Output preserves primary article meaning and structure.
- Command completes in under 1 second for common snippets.
- User can run it with one-liner clipboard workflows.

## Runtime Decision

Build v1 with Bun + TypeScript.

Why Bun for this project:

- Fast local iteration for CLI and parsing heuristics.
- Great fit for JavaScript ecosystem libraries used in content extraction.
- Built-in package manager, runtime, and test runner (`bun install`, `bun run`, `bun test`).
- Easy path to a distributable single binary later (`bun build --compile`).

Re-evaluate a Go port only after we validate extraction quality and workflows with real snippets.

## Progress Update (2026-02-16)

V1 has been implemented and validated.

- Bun + TypeScript CLI scaffold is complete (`package.json`, `tsconfig.json`, local `glean` bin entry).
- Core commands are implemented: `clean`, `extract`, and `stats`.
- Input/output paths are implemented: stdin, `--input`, stdout, and macOS clipboard via `--copy`.
- Cleaning and extraction pipelines are implemented with deterministic cleanup plus Readability-first extraction in `extract` mode.
- Fixture corpus and snapshot-style expectations are in place across blog/docs/marketing/e-commerce/article patterns.
- Automated coverage is in place for pipeline behavior and CLI behavior.
- Latest validation run: `bun test` passing (17 tests).

### UX Upgrade Progress (Interactive-First)

- `glean` with no subcommand now launches an interactive clipboard-first flow.
- Interactive flow runs automatically with defaults (`clean`, aggressive off) and auto-copies parsed markdown to clipboard.
- Mode and pruning are now controlled via no-subcommand flags (`--mode`, `--aggressive`) instead of interactive prompts.
- Current-run stats are displayed immediately after processing (chars/tokens saved).
- Persistent session totals are tracked (runs, tokens saved, chars saved).
- `--tui` now launches a minimal real OpenTUI full-screen flow with clipboard auto-detection, processing, stats, and output preview.
- LLM continuity docs are now in place for efficient future session handoff:
  - `docs/llm-context.md`
  - `docs/RESUME_PROMPT.md`
  - `docs/CONTRIBUTING.md`
  - `docs/README.md`
- Open-source governance baseline is in place:
  - `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, root `CONTRIBUTING.md`
- GitHub collaboration scaffolding has been added:
  - issue templates, PR template, and CI workflow
- Release infrastructure scaffolding has been added:
  - GitHub release workflow for multi-platform binaries + checksums
  - installer scripts: `install` and `install.ps1`

## CLI Product Scope (v1)

### Core Commands

- `glean clean`  
  Clean HTML and output markdown (default command behavior).

- `glean extract`  
  Extract likely main-content nodes before markdown conversion.

- `glean stats`  
  Show token and size deltas (input chars/tokens vs output chars/tokens).

### Input/Output Modes

- Read from stdin (default if piped).
- Read from file via `-i <path>`.
- Write to stdout (default).
- Optional clipboard output flag (`--copy`) on macOS.

### Useful Flags

- `--keep-links` / `--strip-links`
- `--keep-images` / `--strip-images`
- `--max-heading-level <n>`
- `--preserve-tables`
- `--aggressive` (stronger pruning)
- `--format json|md` (json for diagnostics)

## Content Cleaning Pipeline

1. Parse HTML into DOM.
2. Remove known noise tags (`script`, `style`, `noscript`, `iframe`, `svg`, etc.).
3. Drop noisy attributes (all style/layout attrs by default).
4. Remove likely boilerplate blocks:
   - nav/header/footer/sidebar containers
   - cookie banners
   - social share blocks
   - ad containers
5. Score candidate content blocks by:
   - text density
   - punctuation/sentence ratio
   - link density penalty
   - heading/paragraph richness
6. Keep top content region(s).
7. Convert cleaned DOM to markdown.
8. Post-process markdown:
   - collapse excess whitespace
   - normalize heading spacing
   - remove empty sections
   - optionally wrap lines

## Candidate Libraries (Bun + TypeScript)

- HTML parsing: `linkedom` (implemented)
- Readability-style extraction: `@mozilla/readability` (implemented)
- HTML to markdown: `turndown` + `turndown-plugin-gfm` (implemented)
- CLI framework: `commander` (implemented)
- TUI framework: `@opentui/core` (implemented for `--tui`)
- Clipboard integration (macOS optional): shell `pbcopy` (implemented)
- Token estimation: lightweight estimator (implemented for v1)

## Technical Architecture (Implemented in V1)

- `package.json` - Bun scripts, dependencies, and CLI `bin` entry
- `tsconfig.json` - TypeScript config for Bun runtime compatibility
- `src/cli.ts` - command registration and flags
- `src/interactive/runInteractive.ts` - no-subcommand interactive flow
- `src/lib/io.ts` - stdin/file input and clipboard output helpers
- `src/pipeline/cleanHtml.ts` - noise stripping and DOM cleanup
- `src/pipeline/extractContent.ts` - content block scoring/extraction
- `src/pipeline/toMarkdown.ts` - markdown conversion and post-processing
- `src/pipeline/stats.ts` - size/token delta reporting
- `src/tui/experimental.ts` - minimal OpenTUI full-screen flow
- `src/lib/rules.ts` - reusable tag/attribute removal rules
- `src/lib/types.ts` - shared interfaces
- `test/fixtures/` - real-world HTML inputs and markdown snapshots
- `test/pipeline.test.ts` - pipeline behavior coverage
- `test/cli.test.ts` - command and option behavior coverage
- `README.md` - install, usage, and workflow docs

## Edge Cases to Handle

- HTML fragments with no `<html>`/`<body>` wrapper.
- Nested tables/lists copied from docs pages.
- Code snippets and preformatted blocks.
- Sites with semantic tags missing (div-only markup).
- Relative links and malformed HTML.

## Testing Strategy

### Unit Tests

- Tag and attribute stripping rules.
- Markdown conversion of headings/lists/links/tables/code.
- Post-processing normalization.
- Run with `bun test`.

### Fixture Tests

- Real copied snippets from:
  - blog article
  - docs page
  - marketing site
  - e-commerce product page
- Snapshot expected markdown output.
- Validate token reduction thresholds.

### Manual Smoke Tests

- `pbpaste | glean clean | pbcopy`
- Compare raw HTML vs output in LLM context usefulness.

## Milestone Plan

### Milestone 1 - MVP (Complete)

- bootstrap Bun project with TypeScript and CLI entrypoint
- stdin/file input, stdout output
- core cleaning rules
- markdown conversion
- basic tests and fixtures

### Milestone 2 - Better Extraction (Complete)

- readability/content scoring
- `extract` command
- aggressive mode heuristics

### Milestone 3 - Workflow Polish (Complete)

- clipboard flags
- stats command with token deltas
- error messages and help text improvements
- package/distribution workflow (`bun link`, optional single binary build)

### Milestone 4 - Release and Tuning (Proposed Next Steps)

Phase A (interactive UX simplification) is complete.
Open-source/release scaffolding is now in progress; remaining scope:

- add a minimal release flow:
  - version bump scripts in `package.json` (`release:patch`, `release:minor`, `release:major`)
  - binary build output into `dist/` via `bun build --compile`
  - release checklist in `README.md` (test, build, smoke test)
- add golden fixture update workflow for heuristic tuning:
  - create `scripts/update-golden.ts` to regenerate `test/fixtures/*.expected.md`
  - support `--mode clean|extract` and optional `--fixture <name>` targeting
  - run this script when cleaning heuristics change, then review fixture diffs
- add quick smoke helpers:
  - script to run representative fixture reductions and print char/token deltas
  - optional threshold guard to catch major regression in reduction quality

## Distribution Strategy (OpenCode-Style UX)

Goal: provide one-command install and easy upgrades while keeping package manager options.

### Primary Distribution Model

- Ship precompiled binaries per platform/arch from GitHub Releases.
- Keep install UX script-first (single command), similar to modern CLI tools.
- Keep package-manager channels as secondary install paths for discoverability.

### Binary Artifacts (Per Release)

- macOS: `darwin-arm64` (`darwin-x64` planned)
- Linux: `linux-x64` (`linux-arm64` planned)
- Windows: `windows-x64`
- Include `checksums.txt` (and optional signatures) alongside release artifacts.

### Install Channels

- Primary: install script (`curl -fsSL ... | bash`) for macOS/Linux.
- Primary (Windows): PowerShell installer (`irm ... | iex`).
- Secondary: Homebrew tap (`brew install <tap>/glean`).
- Tertiary: npm/bun global package for JS-native users.

### Installer Behavior

- Detect OS/architecture and choose correct release artifact.
- Verify checksums before placing binary.
- Respect install dir priority:
  - `GLEAN_INSTALL_DIR`
  - `XDG_BIN_DIR`
  - `~/bin`
  - `~/.glean/bin`
- Print post-install checks:
  - `glean --version`
  - `glean`

### Upgrade Experience

- Add `glean self-update` (or `glean upgrade`) command:
  - checks latest release
  - downloads matching binary
  - verifies checksum
  - atomically swaps executable
- Keep install script rerun as fallback upgrade path.

### Release Automation

- GitHub Actions release workflow:
  - matrix build across target platforms
  - package and upload release artifacts
  - generate/publish `checksums.txt`
- Add versioning scripts in `package.json`:
  - `release:patch`, `release:minor`, `release:major`
- Add release checklist (test, build, smoke install, upgrade test).

## Next Steps (Execution Order)

1. Implement cross-platform build and release GitHub Actions workflow.
2. Add install scripts (Bash + PowerShell) and checksum verification.
3. Add `self-update`/`upgrade` command path in CLI.
4. Add Homebrew tap metadata and publish flow.
5. Update README with install/upgrade matrix and troubleshooting.
6. Add CI smoke tests for install and upgrade flows.

## Risks and Mitigations

- Over-pruning useful content  
  Mitigation: safe default mode plus `--aggressive` opt-in.

- Inconsistent output across diverse site structures  
  Mitigation: broad fixture corpus and iterative rule tuning.

- Token estimator mismatch with target LLM tokenizer  
  Mitigation: support pluggable tokenizers and label estimate type.

## Example Usage (Target UX)

```bash
# Dev mode (before global link)
pbpaste | bun run src/cli.ts clean | pbcopy

# No-subcommand interactive mode (default clean, aggressive off)
glean

# No-subcommand interactive mode with overrides
glean --mode extract --aggressive

# Clean from file
bun run src/cli.ts clean -i snippet.html > snippet.md

# Inspect reduction stats
pbpaste | bun run src/cli.ts stats

# After linking the local CLI package
pbpaste | glean clean | pbcopy
```

## Open Decisions (Post-V1)

- Should `extract` become default for `clean`, or remain explicit-only?
- Should we switch from heuristic token estimates to model-specific tokenizers?
- Should we include optional source URL/front matter metadata in output?
- Should we add a strict mode that prioritizes token compression over fidelity?

## Definition of Done (v1)

- Bun-based CLI is installable locally (`bun link`) with a working `glean` command.
- User can paste copied DevTools HTML and get concise markdown quickly.
- Token reduction and readability improvements are measurable.
- README includes setup, examples, and troubleshooting.
- Fixture and CLI test suites are passing in Bun test runs.
