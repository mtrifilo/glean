import { describe, expect, test } from "bun:test";
import { normalizePastedPath, isSupportedFile } from "../src/tui/tuiFileDrop";

describe("normalizePastedPath", () => {
  test("absolute path passes through", () => {
    expect(normalizePastedPath("/Users/me/doc.html")).toBe("/Users/me/doc.html");
  });

  test("strips surrounding single quotes", () => {
    expect(normalizePastedPath("'/Users/me/doc.html'")).toBe("/Users/me/doc.html");
  });

  test("strips surrounding double quotes", () => {
    expect(normalizePastedPath('"/Users/me/doc.html"')).toBe("/Users/me/doc.html");
  });

  test("unescapes backslash spaces (iTerm2 style)", () => {
    expect(normalizePastedPath("/Users/me/my\\ file.html")).toBe("/Users/me/my file.html");
  });

  test("strips file:// prefix", () => {
    expect(normalizePastedPath("file:///Users/me/doc.html")).toBe("/Users/me/doc.html");
  });

  test("decodes percent-encoded file:// URIs", () => {
    expect(normalizePastedPath("file:///Users/me/my%20file.html")).toBe("/Users/me/my file.html");
  });

  test("expands tilde to HOME", () => {
    const home = process.env.HOME ?? "";
    expect(normalizePastedPath("~/doc.html")).toBe(`${home}/doc.html`);
  });

  test("resolves relative paths (./)", () => {
    const result = normalizePastedPath("./doc.html");
    expect(result).not.toBeNull();
    expect(result!.startsWith("/")).toBe(true);
    expect(result!.endsWith("/doc.html")).toBe(true);
  });

  test("resolves relative paths (../)", () => {
    const result = normalizePastedPath("../doc.html");
    expect(result).not.toBeNull();
    expect(result!.startsWith("/")).toBe(true);
  });

  test("returns null for non-path text", () => {
    expect(normalizePastedPath("Hello world")).toBeNull();
  });

  test("returns null for plain URL", () => {
    expect(normalizePastedPath("https://example.com")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(normalizePastedPath("")).toBeNull();
  });

  test("handles CRLF line endings", () => {
    expect(normalizePastedPath("/Users/me/doc.html\r\n")).toBe("/Users/me/doc.html");
  });

  test("takes first line for multi-file drops", () => {
    expect(normalizePastedPath("/Users/me/first.html\n/Users/me/second.html")).toBe("/Users/me/first.html");
  });

  test("trims whitespace", () => {
    expect(normalizePastedPath("  /Users/me/doc.html  ")).toBe("/Users/me/doc.html");
  });

  test("combined: quoted path with spaces", () => {
    expect(normalizePastedPath("'/Users/me/my file.html'")).toBe("/Users/me/my file.html");
  });
});

describe("isSupportedFile", () => {
  test.each([
    ["/path/to/doc.html", true],
    ["/path/to/doc.htm", true],
    ["/path/to/doc.rtf", true],
    ["/path/to/doc.doc", true],
    ["/path/to/doc.docx", true],
    ["/path/to/doc.pdf", true],
    ["/path/to/doc.HTML", true],
    ["/path/to/doc.PDF", true],
  ])("%s → %s", (path: string, expected: boolean) => {
    expect(isSupportedFile(path)).toBe(expected);
  });

  test.each([
    ["/path/to/doc.txt", false],
    ["/path/to/doc.md", false],
    ["/path/to/doc.json", false],
    ["/path/to/doc.png", false],
    ["/path/to/noext", false],
  ])("%s → %s", (path: string, expected: boolean) => {
    expect(isSupportedFile(path)).toBe(expected);
  });
});
