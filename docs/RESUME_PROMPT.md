# Resume Prompt Templates

Use these prompts to restart an LLM session efficiently.

## Fast Resume (Recommended)

```text
You are resuming work on the `glean` CLI project.

Read these files first, in order:
1) docs/llm-context.md
2) docs/strategy/ROADMAP.md

Then:
- Summarize current status in 5 bullets max.
- Identify the smallest next executable task.
- Implement it directly (no long planning unless needed).
- Run relevant tests and report outcomes.

Constraints:
- Keep `glean` focused on HTML/RTF/Word -> clean markdown workflow.
- Prefer token-efficient investigation (targeted file reads, not broad scans).
```

## Deep-Dive Resume (When task is ambiguous)

```text
You are resuming development on `glean`.

Start with:
- docs/llm-context.md
- docs/strategy/ROADMAP.md
- docs/specs/

Then create:
1) A concise status summary
2) A short plan with ordered implementation steps
3) Immediate execution of step 1

Validation requirements:
- Run focused tests first
- Run full test suite if behavior changed broadly
- Report any risk of scope creep away from `glean` core intent
```

## Bug-Fix Resume

```text
Resume `glean` and fix the reported issue.

First read:
- docs/llm-context.md
- README.md

Then:
- Reproduce with minimal commands
- Fix root cause with minimal surface-area changes
- Add or update tests
- Report exact verification commands + results
```
