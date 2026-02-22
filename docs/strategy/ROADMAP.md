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

### v0.4.0 — Developer Experience and Heuristic Safety

- Golden fixture update script (`scripts/update-golden.ts`)
- Smoke check with threshold guards (`scripts/smoke-check.ts`)
- Integrate smoke check into CI as a required check
- "Tuning Heuristics" section in `human-docs/CONTRIBUTING.md`

### v0.5.0 — Word Document and RTF Support

- Auto-detect content type (HTML, RTF, DOCX) and route through appropriate converter
- RTF clipboard path via macOS `textutil` (zero new deps)
- DOCX file path via `mammoth.js`
- See `docs/specs/WORD_RTF_SUPPORT.md` for full spec

## Open Decisions

- Should `extract` become the default for `clean`, or remain explicit-only?
- Should we switch from heuristic token estimates to model-specific tokenizers?
- Should we include optional source URL / front matter metadata in output?
- Should we add a strict mode that prioritizes token compression over fidelity?

## Risks and Mitigations

- **Over-pruning useful content** — safe default mode plus `--aggressive` opt-in
- **Inconsistent output across diverse site structures** — broad fixture corpus and iterative rule tuning
- **Token estimator mismatch with target LLM tokenizer** — support pluggable tokenizers, label estimate type
