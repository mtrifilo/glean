# TUI File Drop — Research & Design

**Status:** Research complete, pending prioritization
**Target iteration:** v0.11.0 (TUI Enhancements)
**Date:** 2026-02-22

## Problem

The TUI (`--tui`) only accepts input via clipboard polling. Users cannot drag-and-drop files (HTML, RTF, DOC, DOCX) into the terminal to process them. This is a natural interaction — Claude Code supports drag-and-drop of images, and users expect it.

## How Terminal Drag-and-Drop Works

When a user drags a file from Finder (or any file manager) into a terminal emulator, **the terminal pastes the file's absolute path as text**. Most modern terminals wrap this in [bracketed paste mode](https://en.wikipedia.org/wiki/Bracketed-paste) escape sequences (`\x1b[200~`...`\x1b[201~`), which allows TUI applications to distinguish pasted text from typed input.

### Terminal Support Matrix

| Terminal        | Drag-and-drop | Behavior | Path quoting |
|-----------------|:---:|---|---|
| **iTerm2**      | Yes | Pastes full path, backslash-escapes spaces | `path/to/my\ file.html` |
| **Kitty**       | Yes | Pastes full path | Unescaped (known issue with special chars) |
| **WezTerm**     | Yes | Configurable via `quote_dropped_files` | None / SpacesOnly / Posix / Windows |
| **Ghostty**     | Yes | Pastes full path, multiple files space-separated | Varies by platform |
| **Terminal.app** | Yes | Pastes full path, backslash-escapes spaces | `path/to/my\ file.html` |
| **VS Code terminal** | Yes | Pastes full path | Varies |

**Key insight:** Every major macOS terminal already does this. No special protocol is needed — we just need to detect pasted file paths.

### How Claude Code Does It

Claude Code (Anthropic's CLI) uses the same approach: the terminal pastes a file path, and the TUI detects it as a path rather than typed text. It uses the paste event (via bracketed paste) to receive the text, then checks if it resolves to a file on disk. For images, it base64-encodes the file content.

Sources:
- [Claude Code image paste guide](https://www.arsturn.com/blog/claude-code-paste-image-guide)
- [Claude Code + Kitty drag-drop regression](https://github.com/anthropics/claude-code/issues/21863)

### How OpenCode Does It

[OpenCode](https://github.com/anomalyco/opencode) (also built on OpenTUI) has a working implementation in their TUI prompt's `onPaste` handler. Their approach:

1. Receive pasted text via OpenTUI's `PasteEvent`
2. Normalize line endings (`\r\n` → `\n`)
3. Strip surrounding single quotes and unescape spaces (`\ ` → ` `)
4. Check if the text is a URL (skip file detection if so)
5. Use `mime-types.lookup()` to check the file extension
6. If it's an image, read the file from disk and attach as base64
7. If file read fails, silently fall through to treating it as regular text

Key details from their implementation:
- **ANSI stripping**: `Bun.stripANSI()` is applied to paste content in `KeyHandler.processPaste()` before the event reaches the handler
- **Extension-based detection**: They use `mime-types.lookup()` rather than checking file existence first — extension check is fast, file read can fail gracefully
- **Graceful fallback**: All file reads use `.catch(() => {})` so invalid paths silently fall through to normal paste behavior

Source: [`packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`](https://github.com/anomalyco/opencode)

## OpenTUI Support

OpenTUI already provides everything we need at the framework level:

**Bracketed paste detection** — `StdinBuffer` in `@opentui/core` detects `\x1b[200~`...`\x1b[201~` escape sequences and emits a separate `"paste"` event (distinct from `"data"` for keypresses). It correctly handles paste content arriving in multiple chunks.

**PasteEvent API:**

```typescript
import { type PasteEvent } from "@opentui/core"

keyHandler.on("paste", (event: PasteEvent) => {
  console.log("Pasted text:", event.text)
  event.preventDefault()      // prevent default paste behavior
  event.stopPropagation()     // stop event propagation
})
```

**ANSI cleanup** — `KeyHandler.processPaste()` runs `Bun.stripANSI()` on paste content before emitting, so handlers receive clean text.

Source: [OpenTUI keyboard docs](https://opentui.com/docs/core-concepts/keyboard)

## Proposed Implementation

### Detection Logic

When a `paste` event fires during the waiting screen:

1. **Normalize the path** — trim whitespace, remove backslash escapes (`my\ file.html` → `my file.html`), expand `~`
2. **Check if it looks like a file path** — starts with `/`, `~`, or `./`; has a supported extension
3. **Verify the file exists** — `await Bun.file(path).exists()`
4. **Route by format:**
   - `.html` / `.htm` → read file, feed to pipeline directly
   - `.rtf` → read file, convert via `convertRtfToHtml()`
   - `.doc` → read file, convert via `convertDocToHtml()`
   - `.docx` → read file, convert via `convertDocxToHtml()`
5. **If not a file path** — ignore (continue clipboard polling as normal)

### Where It Fits in Current Code

In `src/tui/experimental.ts`, the waiting loop (lines 251–277) currently only polls the clipboard. The paste listener would run **in parallel** with clipboard polling:

```typescript
// Set up paste listener for drag-and-drop file paths
let pastedFilePath: string | null = null;
const pasteHandler = (event: PasteEvent) => {
  const normalized = normalizePastedPath(event.text);
  if (normalized && isSupportedFile(normalized)) {
    pastedFilePath = normalized;
  }
};
renderer.keyInput.on("paste", pasteHandler);

// Existing clipboard polling loop — now also checks pastedFilePath
while (!clipboardHtml && !pastedFilePath) {
  // ... existing clipboard polling ...
}

renderer.keyInput.off("paste", pasteHandler);

// If we got a file path, read and convert it
if (pastedFilePath) {
  clipboardHtml = await readAndConvertFile(pastedFilePath);
}
```

### Helper Functions Needed

```typescript
function normalizePastedPath(raw: string): string | null {
  // Normalize line endings (Windows ConPTY sends CR-only)
  let path = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  // Strip surrounding quotes (single or double)
  path = path.replace(/^['"]|['"]$/g, "");
  // Remove backslash escapes (iTerm2, Terminal.app style)
  path = path.replace(/\\ /g, " ");
  // Strip file:// URI prefix (some file managers use this)
  if (path.startsWith("file://")) {
    path = path.slice("file://".length);
  }
  // Expand ~
  if (path.startsWith("~")) {
    path = path.replace("~", process.env.HOME ?? "");
  }
  // Must look like an absolute or relative path
  if (path.startsWith("/") || path.startsWith("./")) {
    return path;
  }
  return null;
}

const SUPPORTED_EXTENSIONS = new Set([
  ".html", ".htm", ".rtf", ".doc", ".docx",
]);

function isSupportedFile(path: string): boolean {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}
```

### UI Changes

- **Waiting screen text** should update to mention drag-and-drop:
  - Current: `"Copy HTML, RTF, or Word content"`
  - Updated: `"Copy content to clipboard or drag a file here"`
- **Processing screen** should show the filename when processing a dropped file
- **Keyboard shortcut bar** (planned for v0.11.0) should include a drop hint

### Edge Cases

| Case | Behavior |
|------|----------|
| Path with spaces | Normalize backslash escapes (`\ ` → ` `) |
| Multiple files dropped | Take the first valid file, ignore rest |
| Pasted text that isn't a path | Ignore, continue clipboard polling |
| File doesn't exist | Silently ignore (`.catch(() => {})`), continue polling |
| Unsupported extension | Ignore, continue polling |
| Relative path (`./file.html`) | Resolve against `process.cwd()` |
| Quoted paths (`'path'` or `"path"`) | Strip outer quotes |
| `file://` URI prefix | Strip prefix, extract path |
| Windows line endings in paste | Normalize `\r\n` / `\r` → `\n` |
| ANSI escape codes in paste | Already stripped by OpenTUI's `Bun.stripANSI()` |
| Pasted HTML content (not a path) | Doesn't start with `/`, `~`, `./` — ignored by path detection |

## Complexity

**Low.** This is a straightforward addition:
- OpenTUI already provides the `paste` event
- File reading and conversion already exist in `io.ts` and `convert.ts`
- Detection logic is ~30 lines of code
- No new dependencies required

## Recommendation

Add this to v0.11.0 (TUI Enhancements) as a first-class feature alongside the other planned improvements. It could also be implemented earlier as a standalone enhancement since it has no dependencies on other v0.11.0 features.
