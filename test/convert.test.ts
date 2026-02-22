import { describe, expect, test } from "bun:test";
import { convertDocToHtml, convertRtfToHtml } from "../src/lib/convert";

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

describe("platform guard", () => {
  test.skipIf(isMacOS)("convertRtfToHtml throws on non-macOS", async () => {
    await expect(convertRtfToHtml("{\\rtf1}")).rejects.toThrow("requires macOS");
  });

  test.skipIf(isMacOS)("convertDocToHtml throws on non-macOS", async () => {
    await expect(convertDocToHtml("/tmp/test.doc")).rejects.toThrow("requires macOS");
  });
});
