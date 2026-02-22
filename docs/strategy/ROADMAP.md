# Glean Roadmap (Active)

For the full historical plan and milestone history, see `human-docs/archive/GLEAN_CLI_PLAN_V1.md`.

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

### v0.5.0 — Word Document and RTF Support

Auto-detect content type (HTML, RTF, DOCX) and route through the appropriate converter. The core pipeline stays unchanged — a new detection + conversion layer produces HTML, then reuses everything. Full spec: `docs/specs/WORD_RTF_SUPPORT.md`.

**Phase 1 — Content Detection + RTF/DOC Support**

- [ ] `src/lib/contentDetect.ts` — consolidate duplicated `looksLikeHtml()`, add `looksLikeRtf()`, `isDocBytes()`, `detectFormat()`
- [ ] `src/lib/convert.ts` — `convertRtfToHtml()`, `convertDocToHtml()` via macOS `textutil` (zero new deps)
- [ ] `readClipboardRtf()` in `io.ts`
- [ ] Wire detection into interactive + TUI clipboard polling
- [ ] Wire RTF/DOC path into `runTransform()` in `cli.ts`
- [ ] Test fixtures + unit/integration tests for RTF/DOC path

**Phase 2 — DOCX Support**

- [ ] Add `mammoth` dependency
- [ ] `isDocxBytes()` in `contentDetect.ts`, `readInputBytes()` in `io.ts`
- [ ] `convertDocxToHtml()` in `convert.ts`
- [ ] `src/pipeline/processContent.ts` — format-aware wrapper around `processHtml()`
- [ ] Wire file-based DOCX path through CLI
- [ ] Test fixtures + unit/integration tests for DOCX path

**Phase 3 — Polish + Release**

- [ ] Add `sourceFormat` / `sourceChars` to `ContentStats`
- [ ] Update dev scripts (`update-golden.ts`, `smoke-check.ts`) for new fixtures
- [ ] Update docs (README, CHANGELOG, llm-context.md)
- [ ] End-to-end validation, cut v0.5.0 release

## Open Decisions

- Should `extract` become the default for `clean`, or remain explicit-only?
- Should we switch from heuristic token estimates to model-specific tokenizers?
- Should we include optional source URL / front matter metadata in output?
- Should we add a strict mode that prioritizes token compression over fidelity?

## Risks and Mitigations

- **Over-pruning useful content** — safe default mode plus `--aggressive` opt-in
- **Inconsistent output across diverse site structures** — broad fixture corpus and iterative rule tuning
- **Token estimator mismatch with target LLM tokenizer** — support pluggable tokenizers, label estimate type
