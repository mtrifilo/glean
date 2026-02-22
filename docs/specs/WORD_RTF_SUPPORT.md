# v0.5.0 — Word Document and RTF Support

## Goal

Auto-detect content type (HTML, RTF, DOC, DOCX) and route through the appropriate converter before the existing cleanup pipeline. The core pipeline (`cleanHtml`/`extractContent` → `toMarkdown` → `buildStats`) stays unchanged — a new detection + conversion layer produces HTML, then reuses everything.

## Motivation

Users frequently copy content from Word documents and paste it into their workflow. On macOS, copying from Word puts RTF on the clipboard — not HTML — so Glean currently rejects it. Supporting RTF clipboard input (zero new deps) and DOCX file input (one new dep) covers the two most common Word-to-markdown paths.

## Architecture

```
Input (clipboard / stdin / file)
  │
  ▼
detectFormat()          ← NEW: contentDetect.ts
  │
  ├── html  → pass through
  ├── rtf   → convertRtfToHtml()   ← NEW: convert.ts (textutil subprocess)
  ├── doc   → convertDocToHtml()   ← NEW: convert.ts (textutil subprocess)
  └── docx  → convertDocxToHtml()  ← NEW: convert.ts (mammoth.js)
  │
  ▼
processHtml()           ← EXISTING: unchanged
  │
  ▼
markdown + stats
```

## Content Detection

**New module:** `src/lib/contentDetect.ts`

### Functions

| Function | Input | Detection method |
|----------|-------|-----------------|
| `looksLikeHtml(text)` | string | Regex for `<tag>` or `&lt;tag` — consolidated from `runInteractive.ts` and `experimental.ts` |
| `looksLikeRtf(text)` | string | Starts with `{\rtf` |
| `isDocBytes(buffer)` | Uint8Array | OLE2 magic bytes (`D0 CF 11 E0 A1 B1 1A E1`) |
| `isDocxBytes(buffer)` | Uint8Array | PK ZIP magic bytes (`50 4B 03 04`) |
| `detectFormat(input)` | string \| Uint8Array | Returns `"html"` \| `"rtf"` \| `"doc"` \| `"docx"` \| `"unknown"` |

### Consolidation

`looksLikeHtml()` is currently duplicated identically in:
- `src/interactive/runInteractive.ts` (lines 25-35)
- `src/tui/experimental.ts` (lines 29-39)

Both copies will be removed and replaced with an import from `contentDetect.ts`.

## RTF Support (zero new deps)

### Clipboard path (macOS-only)

Copying from Word on macOS puts RTF on the clipboard.

**Reading RTF from clipboard:**

```bash
pbpaste -Prefer rtf
```

This is an officially documented macOS `pbpaste` flag. Returns raw RTF content.

**Converting RTF → HTML:**

```bash
textutil -stdin -stdout -convert html -format rtf
```

`textutil` is a macOS system utility (ships with every macOS install). It converts RTF to reasonably clean HTML with no external dependencies.

**New I/O function:** `readClipboardRtf()` in `src/lib/io.ts` — spawns `pbpaste -Prefer rtf`, returns string or null.

### File path

RTF files passed via `--input` or stdin are detected by `looksLikeRtf()` (checks for `{\rtf` header) and converted via the same `textutil` call.

### Clipboard polling changes

Both `runInteractive.ts` and `experimental.ts` currently poll the clipboard and check `looksLikeHtml()`. The updated flow:

1. Read clipboard text (existing `readClipboardText()`)
2. Call `detectFormat(text)`
3. If `"html"` → use directly (current behavior)
4. If `"rtf"` → call `convertRtfToHtml(text)` → feed HTML to pipeline
5. If `"unknown"` → try `readClipboardRtf()` as fallback, detect again
6. If still unknown → prompt user (current behavior)

### Platform behavior

- **macOS:** Full RTF clipboard + file support via `pbpaste -Prefer rtf` + `textutil`
- **Linux/Windows:** RTF clipboard not supported (no zero-dep equivalent). Falls back gracefully — user can save as `.rtf` file and use `--input` flag if `textutil` equivalent is available.

## DOC Support (legacy Word, zero new deps)

**macOS-only.** Legacy `.doc` files (OLE2 Compound Document format) are supported via the same `textutil` utility used for RTF. `mammoth` does not support `.doc`.

### Detection

- By file extension: `.doc` on `--input` path
- By magic bytes: `D0 CF 11 E0 A1 B1 1A E1` (OLE2 header) for stdin/piped input

### Conversion

```bash
textutil -convert html -stdout input.doc
```

Same `textutil` subprocess as RTF, different `-format` flag. File-based only (`.doc` is not a clipboard format).

### Platform behavior

- **macOS:** Full support via `textutil`
- **Linux/Windows:** Not supported. Users would need to convert to `.docx` first.

## DOCX File Path (mammoth.js)

### Dependency

[mammoth.js](https://github.com/mwilliamson/mammoth.js) — zero-dep, mature library for DOCX → HTML conversion. Well-maintained, widely used, ~200KB.

### Detection

- By file extension: `.docx` on `--input` path
- By magic bytes: `50 4B 03 04` (PK ZIP header) for stdin/piped input

### Conversion

```typescript
import mammoth from "mammoth";

async function convertDocxToHtml(buffer: Uint8Array): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}
```

### New I/O function

`readInputBytes(inputPath?)` in `src/lib/io.ts` — reads input as `Uint8Array` instead of string. Needed because DOCX is a binary format.

### CLI wiring

`runTransform()` and `runStats()` in `cli.ts` will use `readInputBytes()` when a file path ends in `.docx`, or when piped input starts with PK ZIP magic bytes.

## Pipeline Wrapper

**New module:** `src/pipeline/processContent.ts`

```typescript
async function processContent(
  mode: StatsMode,
  input: string | Uint8Array,
  options: TransformOptions
): Promise<ProcessResult> {
  const format = detectFormat(input);
  let html: string;

  switch (format) {
    case "html":
      html = typeof input === "string" ? input : new TextDecoder().decode(input);
      break;
    case "rtf":
      html = await convertRtfToHtml(input as string);
      break;
    case "doc":
      html = await convertDocToHtml(input as Uint8Array);
      break;
    case "docx":
      html = await convertDocxToHtml(input as Uint8Array);
      break;
    default:
      // Fall through — treat as HTML (best effort)
      html = typeof input === "string" ? input : new TextDecoder().decode(input);
  }

  return processHtml(mode, html, options);
}
```

## Stats Extension

Add optional fields to `ContentStats`:

```typescript
interface ContentStats {
  // ... existing fields ...
  sourceFormat?: "html" | "rtf" | "doc" | "docx";  // detected input format
  sourceChars?: number;                      // pre-conversion char count (before HTML conversion)
}
```

These are additive — no breaking changes to existing stats output.

## Test Strategy

### Fixtures needed

| Fixture | Source | Purpose |
|---------|--------|---------|
| `test/fixtures/sample.rtf` | Hand-crafted minimal RTF | RTF detection + conversion |
| `test/fixtures/sample.docx` | Hand-crafted minimal DOCX | DOCX detection + conversion |
| `test/fixtures/sample.rtf.expected.md` | Golden output | Pipeline regression |
| `test/fixtures/sample.docx.expected.md` | Golden output | Pipeline regression |

### Unit tests

- `contentDetect.ts`: detection accuracy for HTML, RTF, DOC, DOCX, and unknown content
- `convert.ts`: RTF → HTML conversion output, DOCX → HTML conversion output
- `processContent.ts`: end-to-end format routing

### Integration tests

- `cli.test.ts`: `echo '<rtf>' | glean clean` and `glean clean --input sample.docx`
- Interactive mode: clipboard polling with RTF content (mock-based)

## Implementation Phases

### Phase 1 — Content Detection + RTF/DOC Support (Done — released as v0.5.0)

**Branch:** `feat/v050-phase1-rtf` (merged)

Deliverables:
- [x] `src/lib/contentDetect.ts` — `looksLikeHtml()`, `looksLikeRtf()`, `isDocBytes()`, `detectFormat()`
- [x] Remove duplicated `looksLikeHtml()` from `runInteractive.ts` and `experimental.ts`
- [x] `src/lib/convert.ts` — `convertRtfToHtml()`, `convertDocToHtml()` via `textutil`
- [x] `readClipboardRtf()` in `io.ts`
- [x] Wire detection into interactive + TUI clipboard polling
- [x] Wire RTF/DOC path into `resolveHtmlInput()` in `cli.ts`
- [x] `test/fixtures/sample.rtf`
- [x] Unit + integration tests for RTF/DOC path

Zero new dependencies. RTF clipboard is macOS-only; RTF/DOC file conversion works anywhere `textutil` is available.

### Phase 2 — DOCX Support (planned for v0.6.0)

**Branch:** TBD

Deliverables:
- [ ] Add `mammoth` dependency
- [ ] `isDocxBytes()` in `contentDetect.ts`
- [ ] `readInputBytes()` in `io.ts`
- [ ] `convertDocxToHtml()` in `convert.ts`
- [ ] Surface mammoth conversion warnings via `--verbose` flag
- [ ] Wire file-based DOCX path through CLI
- [ ] `test/fixtures/sample.docx` + expected output
- [ ] Unit + integration tests for DOCX path

### Phase 3 — Stats Extension + Polish (planned for v0.6.0)

**Branch:** TBD

Deliverables:
- [ ] Add `sourceFormat` / `sourceChars` to `ContentStats`
- [ ] Update stats display to show source format when not HTML
- [ ] Update `update-golden.ts` and `smoke-check.ts` for new fixtures
- [ ] Update README.md (usage examples for DOCX)
- [ ] Update CHANGELOG.md
- [ ] Update `docs/llm-context.md`
- [ ] End-to-end validation of all input paths
- [ ] Cut v0.6.0 release

## Decided

1. **RTF file input is included in Phase 1.** `textutil` handles both clipboard and file RTF, so it's trivial.
2. **Legacy `.doc` support is included in Phase 1.** Same `textutil` infrastructure, ~10-15 lines of extra code. macOS-only (mammoth can't handle `.doc`).
3. **Rename `processHtml()` → `processContent()` in Phase 3.** The wrapper approach in Phase 2 introduces `processContent.ts`, and Phase 3 will fold the old `processHtml()` into it and update all call sites.
4. **Surface mammoth conversion warnings in verbose mode.** Mammoth returns a `messages` array; log them when a `--verbose` flag is present (Phase 2).
