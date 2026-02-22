# Contributing

Thanks for your interest in contributing to Glean.

For project-specific contribution guidance, start here:

- `docs/CONTRIBUTING.md` (code guidelines and validation checklist)
- `docs/WORKFLOW.md` (branch, PR, and release workflow)

## Quick Start

```bash
bun install
bun test
```

## Before Opening a PR

- Run `bun test` and ensure all tests pass.
- Update docs when behavior or UX changes:
  - `README.md`
  - `docs/llm-context.md`
  - `docs/plans/GLEAN_CLI_PLAN.md` (if roadmap/progress changed)
- Keep changes aligned with Glean's core workflow focus.

## Tuning Heuristics

Glean's cleaning pipeline uses heuristic rules in `src/lib/rules.ts` and `src/pipeline/cleanHtml.ts`. When changing these, follow this workflow to avoid regressions:

### Workflow

1. Make your heuristic change
2. `bun test` — see which golden fixtures broke
3. Review the failures — confirm the new output is actually better
4. `bun run update-golden` — regenerate all `.expected.md` files
5. `git diff test/fixtures/` — review every change to golden output
6. `bun run smoke-check` — verify quality floors still pass
7. Commit the heuristic change and updated fixtures together

### Key Files

| File | Role |
| --- | --- |
| `src/lib/rules.ts` | Tag lists, keyword lists, attribute rules |
| `src/pipeline/cleanHtml.ts` | Cleanup pipeline logic |
| `test/fixtures/*.html` | Input HTML fixtures |
| `test/fixtures/*.expected.md` | Golden output (auto-generated) |
| `scripts/update-golden.ts` | Regenerates golden files from current pipeline |
| `scripts/smoke-check.ts` | Enforces quality thresholds (CI-required) |

### Adding a New Fixture

1. Add the HTML file to `test/fixtures/` (e.g. `forum.html`)
2. Add the fixture to the arrays in all three files:
   - `test/pipeline.test.ts` — `fixtureCases` or extract test
   - `scripts/update-golden.ts` — `cleanFixtures` or `extractFixtures`
   - `scripts/smoke-check.ts` — `fixtures` array
3. Run `bun run update-golden` to generate the initial `.expected.md`
4. Run `bun test` and `bun run smoke-check` to verify

## Conduct and Security

- Conduct expectations: `CODE_OF_CONDUCT.md`
- Security reporting: `SECURITY.md`
