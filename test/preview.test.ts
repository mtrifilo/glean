import { describe, expect, test } from "bun:test";

// Force ANSI colors in non-TTY test environment.
process.env.FORCE_COLOR = "3";

const { renderPreviewMarkdown } = await import(
  "../src/interactive/runInteractive"
);
const { highlightMarkdown, highlightMarkdownLine } = await import(
  "../src/lib/highlightMarkdown"
);

/** Strip ANSI escape sequences for plain-text assertions. */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Check that a string contains an ANSI bold open sequence. */
function hasBold(str: string): boolean {
  return str.includes("\x1b[1m");
}

/** Check for accent color (ANSI 117). */
function hasAccent(str: string): boolean {
  return str.includes("\x1b[38;5;117m");
}

/** Check for muted color (ANSI 245). */
function hasMuted(str: string): boolean {
  return str.includes("\x1b[38;5;245m");
}

/** Check for highlight/amber color (ANSI 214). */
function hasHighlight(str: string): boolean {
  return str.includes("\x1b[38;5;214m");
}

/** Check for dim sequence. */
function hasDim(str: string): boolean {
  return str.includes("\x1b[2m");
}

describe("highlightMarkdown", () => {
  test("headings get accent + bold", () => {
    const result = highlightMarkdown("# My Heading");
    expect(stripAnsi(result)).toBe("# My Heading");
    expect(hasBold(result)).toBe(true);
    expect(hasAccent(result)).toBe(true);
  });

  test("bold markers are preserved with muted delimiters", () => {
    const result = highlightMarkdown("Hello **world** today");
    expect(stripAnsi(result)).toBe("Hello **world** today");
    expect(result).toContain("**");
    expect(hasMuted(result)).toBe(true);
    expect(hasBold(result)).toBe(true);
  });

  test("italic markers are preserved", () => {
    const result = highlightMarkdown("Hello *world* today");
    expect(stripAnsi(result)).toBe("Hello *world* today");
    expect(hasMuted(result)).toBe(true);
    expect(hasDim(result)).toBe(true);
  });

  test("links show accent text and muted URL", () => {
    const result = highlightMarkdown("Visit [Example](https://example.com) now");
    expect(stripAnsi(result)).toBe("Visit [Example](https://example.com) now");
    expect(hasAccent(result)).toBe(true);
    expect(hasMuted(result)).toBe(true);
  });

  test("inline code gets highlight color", () => {
    const result = highlightMarkdown("Use `console.log` here");
    expect(stripAnsi(result)).toBe("Use `console.log` here");
    expect(hasHighlight(result)).toBe(true);
  });

  test("list markers get accent color", () => {
    const result = highlightMarkdown("- item one\n- item two");
    expect(stripAnsi(result)).toBe("- item one\n- item two");
    expect(hasAccent(result)).toBe(true);
  });

  test("numbered list markers get accent color", () => {
    const result = highlightMarkdown("1. first\n2. second");
    expect(stripAnsi(result)).toBe("1. first\n2. second");
    expect(hasAccent(result)).toBe(true);
  });

  test("code fences are muted, body is dim", () => {
    const result = highlightMarkdown("```js\nconst x = 1;\n```");
    expect(stripAnsi(result)).toBe("```js\nconst x = 1;\n```");
    expect(hasMuted(result)).toBe(true);
    expect(hasDim(result)).toBe(true);
  });

  test("blockquotes have muted marker and dim content", () => {
    const result = highlightMarkdown("> Some quote");
    expect(stripAnsi(result)).toBe("> Some quote");
    expect(hasMuted(result)).toBe(true);
    expect(hasDim(result)).toBe(true);
  });

  test("horizontal rules are muted", () => {
    const result = highlightMarkdown("---");
    expect(stripAnsi(result)).toBe("---");
    expect(hasMuted(result)).toBe(true);
  });

  test("inline patterns inside list items", () => {
    const result = highlightMarkdown("- **Bold item** with `code`");
    expect(stripAnsi(result)).toBe("- **Bold item** with `code`");
    expect(hasBold(result)).toBe(true);
    expect(hasHighlight(result)).toBe(true);
  });
});

describe("highlightMarkdownLine", () => {
  test("toggles code fence state", () => {
    const open = highlightMarkdownLine("```", false);
    expect(open.inCodeFence).toBe(true);

    const close = highlightMarkdownLine("```", true);
    expect(close.inCodeFence).toBe(false);
  });

  test("dims lines inside code fence", () => {
    const { result } = highlightMarkdownLine("const x = 1;", true);
    expect(hasDim(result)).toBe(true);
    expect(stripAnsi(result)).toBe("const x = 1;");
  });
});

describe("renderPreviewMarkdown", () => {
  test("truncates long output", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Paragraph ${i + 1}.`);
    const md = lines.join("\n\n");
    const result = renderPreviewMarkdown(md, 12);

    expect(stripAnsi(result)).toContain("...");
    expect(stripAnsi(result)).toContain("Paragraph 1.");
    expect(stripAnsi(result)).not.toContain("Paragraph 50.");
  });

  test("returns empty output placeholder", () => {
    const result = renderPreviewMarkdown("");
    expect(stripAnsi(result)).toContain("(empty output)");
  });

  test("preserves raw markdown syntax in output", () => {
    const result = renderPreviewMarkdown("# Hello **world**");
    const plain = stripAnsi(result);
    expect(plain).toContain("# Hello");
    expect(plain).toContain("**world**");
  });
});
