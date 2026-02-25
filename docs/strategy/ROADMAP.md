# Decant Roadmap (Active)

For the full historical plan and milestone history, see `docs/plans/GLEAN_CLI_PLAN.md`.

## Post-v1 Iterations

### v0.2.1 — Stability and Polish (Done)

- TUI preview overlap fix, defensive `flexShrink: 0` on fixed-height elements

### v0.3.0 — Distribution Confidence (Done)

- [x] Audit and wire final repo slug in all placeholders
- [x] CI smoke test workflow for release binaries (download, checksum, `decant --version`, `decant clean`)
- [x] Review installer scripts — confirmed production-ready, no changes needed
- [x] Manual end-to-end installer validation on macOS (fresh install + `decant clean` pipeline)
- [x] `decant update` upgrade-path validation (v0.2.0 → v0.3.0)
- [x] Smoke test workflow passed on all 3 platforms (linux-x64, darwin-arm64, windows-x64)

### v0.4.0 — Developer Experience and Heuristic Safety (Done)

- [x] Golden fixture update script (`scripts/update-golden.ts`)
- [x] Smoke check with threshold guards (`scripts/smoke-check.ts`)
- [x] Integrate smoke check into CI as a required check
- [x] "Tuning Heuristics" section in `CONTRIBUTING.md`

### v0.5.0 — Content Detection + RTF/DOC Support (Done)

Auto-detect content type (HTML, RTF, DOC) and convert via macOS `textutil` (zero new deps). The core pipeline stays unchanged — a new detection + conversion layer produces HTML, then reuses everything.

- [x] `src/lib/contentDetect.ts` — consolidate duplicated `looksLikeHtml()`, add `looksLikeRtf()`, `isDocBytes()`, `detectFormat()`
- [x] `src/lib/convert.ts` — `convertRtfToHtml()`, `convertDocToHtml()` via macOS `textutil`
- [x] `readClipboardRtf()` in `io.ts`
- [x] Wire detection into interactive + TUI clipboard polling
- [x] Wire RTF/DOC path into `resolveHtmlInput()` in `cli.ts`
- [x] Test fixtures + unit/integration tests for RTF/DOC path

### v0.6.0 — DOCX Support

Add DOCX file support via `mammoth.js`. Extends the content detection + conversion layer from v0.5.0. Full spec: `docs/specs/WORD_RTF_SUPPORT.md`.

**Phase 1 — DOCX Conversion (Done)**

- [x] Add `mammoth` dependency
- [x] `isDocxBytes()` in `contentDetect.ts`, `readInputBytes()` in `io.ts`
- [x] `convertDocxToHtml()` in `convert.ts`
- [x] Wire file-based DOCX path through CLI (`--verbose` flag for mammoth warnings)
- [x] Test fixtures + unit/integration tests for DOCX path

**Phase 2 — Stats Extension + Polish (Done)**

- [x] Add `sourceFormat` / `sourceChars` to `ContentStats`
- [x] Dev scripts unchanged — DOCX fixtures use a different path than HTML fixtures
- [x] Update docs (README, CHANGELOG, llm-context.md)
- [x] End-to-end validation, cut v0.6.0 release

### v0.6.1 — Rename to `decant` (Done)

Renamed the project from `glean` to `decant` ("to pour off the clear liquid, leaving sediment behind"). The name `glean` conflicts with Meta's [facebookincubator/glean](https://github.com/facebookincubator/glean) code indexing system. `decant` is distinctive, memorable, and the metaphor is perfect — separating clean content from HTML sediment.

Full sweep across the entire project:

- [x] CLI command: `glean` → `decant`
- [x] Package name in `package.json`
- [x] Namespace: `.glean/` → `.decant/`, `GLEAN_*` env vars → `DECANT_*`
- [x] All code references, imports, comments
- [x] README, CHANGELOG, all docs
- [x] Installer scripts (`install`, `install.ps1`)
- [x] Homebrew formula and Scoop manifest
- [x] GitHub issue/PR templates, CI workflows
- [x] Binary artifact names
- [x] `decant update` self-update logic
- [x] GitHub repo rename (`mtrifilo/glean` → `mtrifilo/decant`) — done, old URL auto-redirects
- [x] Homebrew tap and Scoop bucket repo updates — `decant.rb` and `decant.json` live, old files removed

### v0.7.0 — Interactive Polish + Syntax Highlighting (Done)

Polished interactive mode UX and replaced rendered markdown preview with raw-source syntax highlighting.

- [x] ANSI-colored output, animated spinner, formatted stats with arrows/highlights, session totals
- [x] Word-wrapped preview at 72 chars, truncated at 16 visual lines
- [x] `src/lib/highlightMarkdown.ts` — regex-based ANSI syntax highlighting for raw markdown source
- [x] `src/lib/ansi.ts` — zero-dep ANSI color utility (respects `NO_COLOR`, `FORCE_COLOR`)
- [x] `test/preview.test.ts` — preview rendering tests
- [x] Removed `marked` and `marked-terminal` dependencies

#### Tier 1 — Core Differentiators

*What makes people try Decant. Table-stakes format support plus the LLM-workflow and UX features no other tool offers.*

### v0.8.0 — PDF Support (Done)

Extract text from PDF files and convert to clean markdown. PDFs are one of the most common document types people need to feed into LLMs. Scanned/image PDFs defer to OCR support (v0.23.0).

**Library:** [`unpdf`](https://github.com/unjs/unpdf) — MIT license, 1.8 MB, zero runtime deps, explicit Bun support, ships an optimized serverless build of Mozilla's PDF.js.

**Phase 1 — Core PDF Pipeline (Done)**

- [x] Add `unpdf` dependency
- [x] `isPdfBytes()` in `contentDetect.ts` — detect PDF magic bytes (`%PDF` / `25 50 44 46`)
- [x] Update `ContentFormat` type to include `"pdf"`
- [x] `convertPdfToHtml()` in `convert.ts` — extract text via `extractText()`, split on double-newlines into `<p>` tags
- [x] Wire `.pdf` extension routing in `resolveHtmlInput()` in `cli.ts`
- [x] Wire PDF detection in `detectFormat()` — check PDF magic before ZIP magic to avoid collision
- [x] Test fixture (`sample.pdf`) + detection, conversion, and CLI integration tests
- [x] `--verbose` support — logs page count to stderr
- [x] Empty/scanned PDFs return placeholder HTML comment
- [x] Update README, CHANGELOG, llm-context.md, ROADMAP

**Design notes:**
- Text-to-HTML conversion is intentionally simple — paragraph splitting only. Fancier structure inference (headings from font size, table detection from positional data) can be revisited if real-world PDFs produce poor output.
- `unpdf` exposes the full PDF.js API via `getDocumentProxy()` if we ever need low-level access to font sizes, positions, or marked content for structure inference.
- `getDocumentProxy()` detaches the input ArrayBuffer — byte length must be captured before calling conversion.

### v0.9.0 — URL Fetching (Done)

Fetch and convert web pages directly (`decant clean --url https://...`). Skips the copy-paste-from-browser step entirely.

- [x] `src/lib/fetchUrl.ts` — `isValidUrl()`, `fetchUrl()` with User-Agent, 15s timeout, redirect following
- [x] Content-type validation — accepts `text/html` and `application/xhtml+xml`, rejects non-HTML with actionable message
- [x] `--url`/`-u` flag on `clean`, `extract`, `stats` subcommands
- [x] Mutual exclusivity with `--input`
- [x] `"url"` added to `ContentFormat` type
- [x] `--verbose` logs fetch URL, HTTP status, chars received
- [x] Unit tests (`test/fetchUrl.test.ts`) with local `Bun.serve()` test server
- [x] CLI integration tests for URL path
- [x] Update README, CHANGELOG, llm-context.md

### v0.10.0 — Token Budget (Done)

Section-aware token budget via `--max-tokens N` flag. Post-processing in the CLI layer — core pipeline stays pure.

- [x] `src/pipeline/tokenBudget.ts` — section parsing on heading boundaries, budget analysis, smart truncation (drop from end), formatted error/warning output
- [x] `SectionStats` type and optional budget fields on `ContentStats`
- [x] `--max-tokens` flag on `clean`, `extract`, `stats` subcommands
- [x] Piped (no TTY): error with section breakdown + actionable suggestions, exit 1
- [x] TTY: smart truncation with warning showing kept/dropped sections
- [x] Stats: enriched with per-section tokens, budget amount, over-budget status; section breakdown table in markdown format
- [x] Unit tests (`test/tokenBudget.test.ts`) + CLI integration tests
- [x] Update README, CHANGELOG, llm-context.md

### v0.11.0 — Interactive Section Selection (Done)

Full-screen TUI section picker for `--max-tokens` workflows. When `--tui --max-tokens N` is used, inserts a section selection screen between processing and results.

- [x] `src/tui/sectionPicker.ts` — new module: two-pane picker (section list + content preview), keyboard handling, budget counter
- [x] Pure utility functions: `autoFitSelection()`, `computeSelectedTokens()`, `budgetColor()`
- [x] `--max-tokens` threaded to root `decant` command via `enablePositionalOptions()` (coexists with subcommand `--max-tokens`)
- [x] Plumbing: `cli.ts` → `runInteractive.ts` → `experimental.ts` → `runSectionPicker()`
- [x] Budget display in TUI waiting screen when `--max-tokens` is set
- [x] Stats recomputed after section filtering for accurate results screen
- [x] Auto-fit on open: greedy top-down selection within budget, first section always included
- [x] Over-budget warned (red bar) but not blocked — Enter still confirms
- [x] Cancel (`q`/`Esc`) outputs full markdown, no filtering
- [x] Picker skipped for 0–1 sections
- [x] Keyboard: `↑`/`↓`/`j`/`k` navigate, `Space` toggle, `a` all, `n` none, `f` auto-fit, `Enter` confirm, `q` cancel
- [x] Unit tests (`test/sectionPicker.test.ts`) + CLI integration test for root `--max-tokens`
- [x] Update README, CHANGELOG, llm-context.md, ROADMAP

### v0.12.0 — TUI Enhancements

Major upgrade to the full-screen TUI (`--tui`). Preserves the zero-friction clipboard-first default while layering in interactivity. Currently the TUI is single-shot with a plain text preview — this iteration makes it a polished, re-usable workspace.

- **File drag-and-drop** — detect pasted file paths via OpenTUI's `paste` event, resolve and convert HTML/RTF/DOC/DOCX files. Works across iTerm2, Kitty, WezTerm, Ghostty, and Terminal.app. Full spec: `docs/specs/TUI_FILE_DROP.md`.
- **URL detection in clipboard** — polling loop detects URLs and auto-fetches + converts (requires v0.9.0 URL fetching). No new flags — just paste a URL instead of HTML.
- **Syntax-highlighted markdown preview** — color headings, bold, code blocks, links, lists, and blockquotes using regex-based highlighting with OpenTUI's per-text `fg` colors.
- **Scrollable preview** — replace the 20-line hard cap with `j`/`k` or arrow key scrolling so users can inspect the full output.
- **Option toggling without restarting** — press `a` to toggle aggressive mode, `m` to switch clean/extract, and re-process instantly from the results screen (input stays in memory).
- **Continuous mode** — after processing, return to the waiting screen for the next clipboard change instead of exiting. Process multiple items in sequence. Press `q` to exit when done.
- **Keyboard shortcut bar** — persistent contextual footer showing available keys (e.g. `[a] aggressive  [m] mode  [↑↓] scroll  [q] quit`). Updates based on current screen state.

#### Tier 2 — LLM Workflow Intelligence

*What makes Decant uniquely useful. Features that go beyond conversion — helping users understand, control, and optimize their output for LLM consumption.*

### v0.13.0 — Diff Mode

Show a before/after comparison of what was removed during cleaning (`decant clean -i page.html --diff`). Useful for understanding what the pipeline is stripping and for tuning options. Consider side-by-side vs. unified diff output.

### v0.14.0 — Quality Score

Estimate how "clean" the output is — ratio of meaningful content to boilerplate, formatting noise, or repeated patterns. Helps users decide whether to use `clean` vs. `extract`, or whether `--aggressive` is needed.

### v0.15.0 — Section Filtering

Extract specific sections of a document by heading name, heading level, or CSS selector instead of converting the entire document. Useful for pulling a single chapter, section, or content block from a large document.

### v0.16.0 — Chunking for RAG

Split long documents into sized chunks for RAG ingestion pipelines (`--chunk-size 1000 --chunk-overlap 100`). Output as multiple files or JSON array. Critical for users building retrieval-augmented generation systems.

### v0.17.0 — Output Formats

Add `--format json` for structured output (title, body, metadata, stats) and `--format text` for plain text (no markdown syntax). JSON output enables programmatic integration with other tools and pipelines.

#### Tier 3 — Power User Workflow

*Productivity and ergonomics. Features that make Decant faster and more comfortable for daily use.*

### v0.18.0 — Batch Processing

Process multiple files or an entire directory at once (`decant clean -i ./docs/`). Output individual markdown files or concatenated output. Enables bulk conversion workflows — becomes a force multiplier as format support grows.

### v0.19.0 — Output to File

Smart output-to-file with auto-naming (`decant clean -i report.pdf -o` → `report.md`). Support explicit output path (`-o output.md`) and auto-derived names. For batch processing, output to a mirrored directory structure.

### v0.20.0 — Config File

Support a `.decantrc` or `.decant/config.toml` for persisting default options. As the option surface grows (max-tokens, aggressive, output format, etc.), users shouldn't have to repeat flags every time. Support project-level and user-level config with sensible merge behavior.

### v0.21.0 — Prompt Wrapping

Wrap output in a user-defined template (`--wrap "Summarize the following document:\n\n{content}"`). Supports template strings with `{content}`, `{filename}`, `{stats}` placeholders. Saves a manual step when feeding output directly into LLM prompts.

### v0.22.0 — Verbose Stats

Extended stats breakdown beyond token/char counts — section count, heading structure, image count, link count, table count, estimated reading time. Useful for understanding document structure at a glance.

#### Tier 4 — Format Expansion

*Breadth. Additional input formats, prioritized after the core workflow and intelligence features are solid.*

### v0.23.0 — Image OCR

Extract text from images (PNG, JPG, TIFF, etc.) using OCR. Covers screenshots, photos of documents, scanned PDFs, and other image-based text. Evaluate options like `tesseract.js` (local, zero external deps) vs. cloud OCR APIs.

### v0.24.0 — PowerPoint / Keynote Support

Extract text from presentation files (.pptx, .key). Slide decks are a common source of text content in professional settings. Evaluate `pptx-parser` or similar libraries. Keynote may be convertible via macOS `textutil` or Automator.

### v0.25.0 — EPUB Support

Extract text from EPUB e-books. EPUBs are ZIP archives containing XHTML — the existing HTML pipeline can be reused once content is unpacked. Evaluate lightweight EPUB parsing libraries or direct ZIP + XHTML extraction.

### v0.26.0 — Email Support (.eml / .mbox)

Extract body text from saved email files. Handles both individual `.eml` files and `.mbox` archives. Needs to handle MIME multipart (HTML + plain text alternatives), strip signatures/quoted replies, and handle attachments gracefully.

### v0.27.0 — LaTeX Support

Convert LaTeX `.tex` files to clean markdown. Academic papers and technical documents commonly use LaTeX. Since `.tex` is already plain text, this is primarily a syntax transformation (stripping preambles, converting commands to markdown equivalents). Evaluate `pandoc` as a conversion backend vs. custom parsing.

### v0.28.0 — CSV/TSV to Markdown Tables

Convert tabular data files (CSV, TSV) into markdown tables. Useful for feeding spreadsheet exports and data files into LLMs in a readable format. Handle edge cases like large files (truncation/sampling), quoted fields, and encoding detection.

#### Tier 5 — Experimental

*Ideas that push scope boundaries. Evaluate carefully before committing.*

### v0.29.0 — Watch Mode

Monitor the clipboard or a directory for new content and auto-convert as it appears (`decant --watch` or `decant --watch-dir ./inbox/`). Enables continuous workflows where users repeatedly copy content and want it cleaned automatically. Note: approaches `ctxkit` scope boundary — evaluate whether this belongs here or in a separate tool.

## Open Decisions

- Should `extract` become the default for `clean`, or remain explicit-only?
- Should we switch from heuristic token estimates to model-specific tokenizers?
- Should we include optional source URL / front matter metadata in output?
- Should we add a strict mode that prioritizes token compression over fidelity?

## Risks and Mitigations

- **Over-pruning useful content** — safe default mode plus `--aggressive` opt-in
- **Inconsistent output across diverse site structures** — broad fixture corpus and iterative rule tuning
- **Token estimator mismatch with target LLM tokenizer** — support pluggable tokenizers, label estimate type
