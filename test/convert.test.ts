import { describe, expect, test } from "bun:test";
import { convertDocToHtml, convertDocxToHtml, convertRtfToHtml } from "../src/lib/convert";

const isMacOS = process.platform === "darwin";

describe("convertRtfToHtml", () => {
  test.skipIf(!isMacOS)("converts minimal RTF to HTML", async () => {
    const rtf = await Bun.file("test/fixtures/sample.rtf").text();
    const html = await convertRtfToHtml(rtf);

    expect(html).toContain("<html");
    expect(html).toContain("Hello World");
  });

  test.skipIf(!isMacOS)("converts inline RTF string", async () => {
    const rtf = "{\\rtf1\\ansi{\\b Bold text}}";
    const html = await convertRtfToHtml(rtf);

    expect(html).toContain("<html");
    expect(html).toContain("Bold text");
  });
});

describe("convertDocToHtml", () => {
  test.skipIf(!isMacOS)("returns empty output for nonexistent file", async () => {
    // textutil exits 0 but produces no stdout for missing files
    const html = await convertDocToHtml("/tmp/nonexistent-file.doc");
    expect(html.trim()).toBe("");
  });
});

describe("convertDocxToHtml", () => {
  test("converts sample.docx to HTML", async () => {
    const buffer = new Uint8Array(await Bun.file("test/fixtures/sample.docx").arrayBuffer());
    const html = await convertDocxToHtml(buffer);

    expect(html).toContain("Sample Document");
    expect(html).toContain("Section One");
    expect(html).toContain("bold formatting");
  });

  test("returns HTML with expected structure", async () => {
    const buffer = new Uint8Array(await Bun.file("test/fixtures/sample.docx").arrayBuffer());
    const html = await convertDocxToHtml(buffer);

    expect(html).toContain("<h1>");
    expect(html).toContain("<h2>");
    expect(html).toContain("<strong>");
  });

  test("rejects invalid buffer", async () => {
    const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    await expect(convertDocxToHtml(invalid)).rejects.toThrow("DOCX conversion failed");
  });
});

describe("platform guard", () => {
  test.skipIf(isMacOS)("convertRtfToHtml throws on non-macOS", async () => {
    await expect(convertRtfToHtml("{\\rtf1}")).rejects.toThrow("requires macOS");
  });

  test.skipIf(isMacOS)("convertDocToHtml throws on non-macOS", async () => {
    await expect(convertDocToHtml("/tmp/test.doc")).rejects.toThrow("requires macOS");
  });
});
