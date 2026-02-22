# Glean Roadmap (Active)

For the full historical plan and milestone history, see `docs/plans/GLEAN_CLI_PLAN.md`.

## Post-v1 Iterations

### v0.2.1 — Stability and Polish (Done)

- TUI preview overlap fix, defensive `flexShrink: 0` on fixed-height elements

### v0.3.0 — Distribution Confidence (Done)

- [x] Audit and wire final repo slug in all placeholders
- [x] CI smoke test workflow for release binaries (download, checksum, `glean --version`, `glean clean`)
- [x] Review installer scripts — confirmed production-ready, no changes needed
- [x] Manual end-to-end installer validation on macOS (fresh install + `glean clean` pipeline)
- [x] `glean update` upgrade-path validation (v0.2.0 → v0.3.0)
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

**Phase 1 — DOCX Conversion**

- [ ] Add `mammoth` dependency
- [ ] `isDocxBytes()` in `contentDetect.ts`, `readInputBytes()` in `io.ts`
- [ ] `convertDocxToHtml()` in `convert.ts`
- [ ] Wire file-based DOCX path through CLI
- [ ] Test fixtures + unit/integration tests for DOCX path

**Phase 2 — Stats Extension + Polish**

- [ ] Add `sourceFormat` / `sourceChars` to `ContentStats`
- [ ] Update dev scripts (`update-golden.ts`, `smoke-check.ts`) for new fixtures
- [ ] Update docs (README, CHANGELOG, llm-context.md)
- [ ] End-to-end validation, cut v0.6.0 release

### v0.6.1 — Rename to `decant`

Rename the project from `glean` to `decant` ("to pour off the clear liquid, leaving sediment behind"). The name `glean` conflicts with Meta's [facebookincubator/glean](https://github.com/facebookincubator/glean) code indexing system. `decant` is distinctive, memorable, and the metaphor is perfect — separating clean content from HTML sediment.

This is a full sweep across the entire project:

- [ ] CLI command: `glean` → `decant`
- [ ] Package name in `package.json`
- [ ] Namespace: `.glean/` → `.decant/`, `GLEAN_*` env vars → `DECANT_*`
- [ ] All code references, imports, comments
- [ ] README, CHANGELOG, all docs
- [ ] Installer scripts (`install`, `install.ps1`)
- [ ] Homebrew tap (`homebrew-tap`) and Scoop bucket (`scoop-bucket`)
- [ ] GitHub repo rename (`mtrifilo/glean` → `mtrifilo/decant`)
- [ ] GitHub releases, CI workflows
- [ ] Binary artifact names
- [ ] Update `glean update` → `decant update` self-update logic

Should land before major new features ship to avoid a rename after the tool gains broader adoption.

#### Tier 1 — Core Differentiators

*What makes people try Glean. Table-stakes format support plus the LLM-workflow and UX features no other tool offers.*

### v0.7.0 — PDF Support

Extract text from PDF files. PDFs are one of the most common document types people need to feed into LLMs. Likely requires a library like `pdf-parse` or `pdfjs-dist`. Needs to handle text-based PDFs; scanned/image PDFs can defer to OCR support in a later iteration.

### v0.8.0 — URL Fetching

Fetch and convert web pages directly (`glean clean --url https://...`). Skips the copy-paste-from-browser step entirely — the single biggest friction point in the current workflow. Needs to handle fetching, stripping chrome/nav/footer, and feeding the content HTML into the existing pipeline.

### v0.9.0 — Token Budget

Add `--max-tokens N` flag to truncate or intelligently trim output to fit a context window. Extremely practical for LLM workflows where users need to stay within a token limit. Consider smart truncation strategies (sentence boundaries, section boundaries) vs. hard cutoff.

### v0.10.0 — TUI Enhancements

Major upgrade to the full-screen TUI (`--tui`). Preserves the zero-friction clipboard-first default while layering in interactivity. Currently the TUI is single-shot with a plain text preview — this iteration makes it a polished, re-usable workspace.

- **URL detection in clipboard** — polling loop detects URLs and auto-fetches + converts (requires v0.8.0 URL fetching). No new flags — just paste a URL instead of HTML.
- **Syntax-highlighted markdown preview** — color headings, bold, code blocks, links, lists, and blockquotes using regex-based highlighting with OpenTUI's per-text `fg` colors.
- **Scrollable preview** — replace the 20-line hard cap with `j`/`k` or arrow key scrolling so users can inspect the full output.
- **Option toggling without restarting** — press `a` to toggle aggressive mode, `m` to switch clean/extract, and re-process instantly from the results screen (input stays in memory).
- **Continuous mode** — after processing, return to the waiting screen for the next clipboard change instead of exiting. Process multiple items in sequence. Press `q` to exit when done.
- **Keyboard shortcut bar** — persistent contextual footer showing available keys (e.g. `[a] aggressive  [m] mode  [↑↓] scroll  [q] quit`). Updates based on current screen state.

#### Tier 2 — LLM Workflow Intelligence

*What makes Glean uniquely useful. Features that go beyond conversion — helping users understand, control, and optimize their output for LLM consumption.*

### v0.11.0 — Diff Mode

Show a before/after comparison of what was removed during cleaning (`glean clean -i page.html --diff`). Useful for understanding what the pipeline is stripping and for tuning options. Consider side-by-side vs. unified diff output.

### v0.12.0 — Quality Score

Estimate how "clean" the output is — ratio of meaningful content to boilerplate, formatting noise, or repeated patterns. Helps users decide whether to use `clean` vs. `extract`, or whether `--aggressive` is needed.

### v0.13.0 — Section Filtering

Extract specific sections of a document by heading name, heading level, or CSS selector instead of converting the entire document. Useful for pulling a single chapter, section, or content block from a large document.

### v0.14.0 — Chunking for RAG

Split long documents into sized chunks for RAG ingestion pipelines (`--chunk-size 1000 --chunk-overlap 100`). Output as multiple files or JSON array. Critical for users building retrieval-augmented generation systems.

### v0.15.0 — Output Formats

Add `--format json` for structured output (title, body, metadata, stats) and `--format text` for plain text (no markdown syntax). JSON output enables programmatic integration with other tools and pipelines.

#### Tier 3 — Power User Workflow

*Productivity and ergonomics. Features that make Glean faster and more comfortable for daily use.*

### v0.16.0 — Batch Processing

Process multiple files or an entire directory at once (`glean clean -i ./docs/`). Output individual markdown files or concatenated output. Enables bulk conversion workflows — becomes a force multiplier as format support grows.

### v0.17.0 — Output to File

Smart output-to-file with auto-naming (`glean clean -i report.pdf -o` → `report.md`). Support explicit output path (`-o output.md`) and auto-derived names. For batch processing, output to a mirrored directory structure.

### v0.18.0 — Config File

Support a `.gleanrc` or `.glean/config.toml` for persisting default options. As the option surface grows (max-tokens, aggressive, output format, etc.), users shouldn't have to repeat flags every time. Support project-level and user-level config with sensible merge behavior.

### v0.19.0 — Prompt Wrapping

Wrap output in a user-defined template (`--wrap "Summarize the following document:\n\n{content}"`). Supports template strings with `{content}`, `{filename}`, `{stats}` placeholders. Saves a manual step when feeding output directly into LLM prompts.

### v0.20.0 — Verbose Stats

Extended stats breakdown beyond token/char counts — section count, heading structure, image count, link count, table count, estimated reading time. Useful for understanding document structure at a glance.

#### Tier 4 — Format Expansion

*Breadth. Additional input formats, prioritized after the core workflow and intelligence features are solid.*

### v0.21.0 — Image OCR

Extract text from images (PNG, JPG, TIFF, etc.) using OCR. Covers screenshots, photos of documents, scanned PDFs, and other image-based text. Evaluate options like `tesseract.js` (local, zero external deps) vs. cloud OCR APIs.

### v0.22.0 — PowerPoint / Keynote Support

Extract text from presentation files (.pptx, .key). Slide decks are a common source of text content in professional settings. Evaluate `pptx-parser` or similar libraries. Keynote may be convertible via macOS `textutil` or Automator.

### v0.23.0 — EPUB Support

Extract text from EPUB e-books. EPUBs are ZIP archives containing XHTML — the existing HTML pipeline can be reused once content is unpacked. Evaluate lightweight EPUB parsing libraries or direct ZIP + XHTML extraction.

### v0.24.0 — Email Support (.eml / .mbox)

Extract body text from saved email files. Handles both individual `.eml` files and `.mbox` archives. Needs to handle MIME multipart (HTML + plain text alternatives), strip signatures/quoted replies, and handle attachments gracefully.

### v0.25.0 — LaTeX Support

Convert LaTeX `.tex` files to clean markdown. Academic papers and technical documents commonly use LaTeX. Since `.tex` is already plain text, this is primarily a syntax transformation (stripping preambles, converting commands to markdown equivalents). Evaluate `pandoc` as a conversion backend vs. custom parsing.

### v0.26.0 — CSV/TSV to Markdown Tables

Convert tabular data files (CSV, TSV) into markdown tables. Useful for feeding spreadsheet exports and data files into LLMs in a readable format. Handle edge cases like large files (truncation/sampling), quoted fields, and encoding detection.

#### Tier 5 — Experimental

*Ideas that push scope boundaries. Evaluate carefully before committing.*

### v0.27.0 — Watch Mode

Monitor the clipboard or a directory for new content and auto-convert as it appears (`glean --watch` or `glean --watch-dir ./inbox/`). Enables continuous workflows where users repeatedly copy content and want it cleaned automatically. Note: approaches `ctxkit` scope boundary — evaluate whether this belongs here or in a separate tool.

## Open Decisions

- Should `extract` become the default for `clean`, or remain explicit-only?
- Should we switch from heuristic token estimates to model-specific tokenizers?
- Should we include optional source URL / front matter metadata in output?
- Should we add a strict mode that prioritizes token compression over fidelity?

## Risks and Mitigations

- **Over-pruning useful content** — safe default mode plus `--aggressive` opt-in
- **Inconsistent output across diverse site structures** — broad fixture corpus and iterative rule tuning
- **Token estimator mismatch with target LLM tokenizer** — support pluggable tokenizers, label estimate type
