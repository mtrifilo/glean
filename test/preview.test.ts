import { describe, expect, test } from "bun:test";

// Force chalk colors so marked-terminal applies ANSI codes in CI/test.
process.env.FORCE_COLOR = "3";

const { renderPreviewMarkdown } = await import(
  "../src/interactive/runInteractive"
);

/** Strip ANSI escape sequences for plain-text assertions. */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Check that a string contains an ANSI bold open sequence. */
function hasBold(str: string): boolean {
  return str.includes("\x1b[1m");
}

describe("renderPreviewMarkdown", () => {
  test("renders bold inside list items (marked-terminal bug fix)", () => {
    const md = "- **Bold item** with text\n- **Another** one";
    const result = renderPreviewMarkdown(md);

    expect(result).not.toContain("**");
    expect(hasBold(result)).toBe(true);
    expect(stripAnsi(result)).toContain("Bold item");
    expect(stripAnsi(result)).toContain("Another");
  });

  test("renders bold in paragraphs", () => {
    const md = "Hello **world** today";
    const result = renderPreviewMarkdown(md);

    expect(result).not.toContain("**");
    expect(hasBold(result)).toBe(true);
    expect(stripAnsi(result)).toContain("world");
  });

  test("renders links", () => {
    const md = "Visit [Example](https://example.com) now";
    const result = renderPreviewMarkdown(md);

    expect(stripAnsi(result)).toContain("Example");
    expect(stripAnsi(result)).toContain("https://example.com");
  });

  test("renders headings", () => {
    const md = "# My Heading\n\nSome text";
    const result = renderPreviewMarkdown(md);

    expect(stripAnsi(result)).toContain("My Heading");
  });

  test("truncates long output", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Paragraph ${i + 1}.`);
    const md = lines.join("\n\n");
    const result = renderPreviewMarkdown(md, 12);
    const rendered = result.split("\n");

    // Should have at most 12 content lines + trailing "..."
    expect(stripAnsi(result)).toContain("...");
    // First paragraph present, last paragraph absent
    expect(stripAnsi(result)).toContain("Paragraph 1.");
    expect(stripAnsi(result)).not.toContain("Paragraph 50.");
  });

  test("returns empty output placeholder", () => {
    const result = renderPreviewMarkdown("");
    expect(stripAnsi(result)).toContain("(empty output)");
  });
});
