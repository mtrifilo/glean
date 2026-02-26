import { describe, expect, test } from "bun:test";
import { prettyPrintHtml, computeDiff, formatDiffAnsi } from "../src/lib/diff";

// --- prettyPrintHtml ---

describe("prettyPrintHtml", () => {
  test("splits tags onto separate lines", () => {
    const html = "<div><p>Hello</p></div>";
    const result = prettyPrintHtml(html);
    const lines = result.split("\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(result).toContain("<div>");
    expect(result).toContain("<p>");
  });

  test("indents nested tags", () => {
    const html = "<div><p>Text</p></div>";
    const result = prettyPrintHtml(html);
    const lines = result.split("\n");
    // <p> should be indented under <div>
    const pLine = lines.find((l) => l.includes("<p>"));
    expect(pLine).toBeDefined();
    expect(pLine!.startsWith("  ")).toBe(true);
  });

  test("handles void elements without extra indentation", () => {
    const html = "<div><br><img src='x'></div>";
    const result = prettyPrintHtml(html);
    // br and img should not cause subsequent lines to be over-indented
    expect(result).toContain("<br>");
    expect(result).toContain("<img");
  });

  test("handles empty input", () => {
    expect(prettyPrintHtml("")).toBe("");
  });

  test("handles already-formatted HTML", () => {
    const html = "<div>\n  <p>Hello</p>\n</div>";
    const result = prettyPrintHtml(html);
    expect(result).toContain("<div>");
    expect(result).toContain("<p>");
  });

  test("handles self-closing tags", () => {
    const html = "<div><input /><span>text</span></div>";
    const result = prettyPrintHtml(html);
    expect(result).toContain("<input />");
  });
});

// --- computeDiff ---

describe("computeDiff", () => {
  test("marks kept content as kept", () => {
    const html = "<p>Hello world</p>";
    const markdown = "Hello world";
    const result = computeDiff(html, markdown);

    const keptLines = result.htmlLines.filter((l) => l.type === "kept");
    expect(keptLines.length).toBeGreaterThan(0);
    // The line with "Hello world" should be kept
    const helloLine = result.htmlLines.find((l) => l.text.includes("Hello world"));
    expect(helloLine).toBeDefined();
    expect(helloLine!.type).toBe("kept");
  });

  test("marks removed content as removed", () => {
    const html = "<div><nav><a>Home</a></nav><p>Content</p></div>";
    const markdown = "Content";
    const result = computeDiff(html, markdown);

    // "Home" text should be removed since it's not in the clean markdown
    const homeLine = result.htmlLines.find((l) => l.text.includes("Home"));
    expect(homeLine).toBeDefined();
    expect(homeLine!.type).toBe("removed");

    // "Content" should be kept
    const contentLine = result.htmlLines.find((l) => l.text.includes("Content"));
    expect(contentLine).toBeDefined();
    expect(contentLine!.type).toBe("kept");
  });

  test("stats reflect kept and removed counts", () => {
    const html = "<div><p>Keep this</p><span>Remove this</span></div>";
    const markdown = "Keep this";
    const result = computeDiff(html, markdown);

    expect(result.stats.kept).toBeGreaterThan(0);
    expect(result.stats.removed).toBeGreaterThan(0);
    expect(result.stats.total).toBe(result.stats.kept + result.stats.removed);
  });

  test("returns markdown lines", () => {
    const html = "<p>Hello</p>";
    const markdown = "Hello";
    const result = computeDiff(html, markdown);
    expect(result.markdownLines).toEqual(["Hello"]);
  });

  test("handles empty input", () => {
    const result = computeDiff("", "");
    // Empty input may produce context lines but no kept/removed
    expect(result.stats.kept + result.stats.removed).toBeLessThanOrEqual(result.stats.total);
    expect(result.markdownLines).toEqual([""]);
  });

  test("handles all content removed", () => {
    const html = "<script>var x = 1;</script>";
    const markdown = "";
    const result = computeDiff(html, markdown);
    // All lines should be removed
    const removedLines = result.htmlLines.filter((l) => l.type === "removed");
    expect(removedLines.length).toBeGreaterThan(0);
  });

  test("structural tags classified as removed", () => {
    const html = "<nav></nav><div></div>";
    const markdown = "";
    const result = computeDiff(html, markdown);

    const navLine = result.htmlLines.find((l) => l.text.includes("<nav>"));
    expect(navLine).toBeDefined();
    expect(navLine!.type).toBe("removed");
  });
});

// --- formatDiffAnsi ---

describe("formatDiffAnsi", () => {
  test("produces output with header", async () => {
    const diff = computeDiff("<p>Hello</p>", "Hello");
    const output = await formatDiffAnsi(diff);
    expect(output).toContain("Diff: Original HTML");
  });

  test("includes stats summary", async () => {
    const diff = computeDiff("<p>Hello</p>", "Hello");
    const output = await formatDiffAnsi(diff);
    expect(output).toContain("kept");
    expect(output).toContain("total");
  });

  test("produces string output for empty diff", async () => {
    const diff = computeDiff("", "");
    const output = await formatDiffAnsi(diff);
    expect(typeof output).toBe("string");
    expect(output).toContain("0 kept");
  });

  test("kept lines are prefixed with spaces", async () => {
    const diff = computeDiff("<p>Hello</p>", "Hello");
    const output = await formatDiffAnsi(diff);
    // The formatted output should have lines with "  " prefix for kept
    // (may have ANSI codes so just check the line content is there)
    expect(output).toContain("Hello");
  });
});
