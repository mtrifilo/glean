import { describe, expect, test } from "bun:test";
import {
  detectFormat,
  isDocBytes,
  isDocxBytes,
  looksLikeHtml,
  looksLikeRtf,
} from "../src/lib/contentDetect";

describe("looksLikeHtml", () => {
  test("detects standard HTML tags", () => {
    expect(looksLikeHtml("<div>hello</div>")).toBe(true);
    expect(looksLikeHtml("<p>text</p>")).toBe(true);
    expect(looksLikeHtml("<br>")).toBe(true);
    expect(looksLikeHtml('<a href="url">link</a>')).toBe(true);
  });

  test("detects HTML entities", () => {
    expect(looksLikeHtml("&lt;div&gt;")).toBe(true);
  });

  test("returns false for empty or whitespace", () => {
    expect(looksLikeHtml("")).toBe(false);
    expect(looksLikeHtml("   ")).toBe(false);
    expect(looksLikeHtml("\n\t")).toBe(false);
  });

  test("returns false for plain text", () => {
    expect(looksLikeHtml("Hello world")).toBe(false);
    expect(looksLikeHtml("Just some text")).toBe(false);
  });
});

describe("looksLikeRtf", () => {
  test("detects RTF header", () => {
    expect(looksLikeRtf("{\\rtf1\\ansi\\deff0}")).toBe(true);
  });

  test("detects RTF with leading whitespace", () => {
    expect(looksLikeRtf("  {\\rtf1\\ansi}")).toBe(true);
    expect(looksLikeRtf("\n{\\rtf1}")).toBe(true);
  });

  test("returns false for non-RTF", () => {
    expect(looksLikeRtf("<div>html</div>")).toBe(false);
    expect(looksLikeRtf("plain text")).toBe(false);
    expect(looksLikeRtf("")).toBe(false);
    expect(looksLikeRtf("{not rtf}")).toBe(false);
  });
});

describe("isDocBytes", () => {
  test("detects OLE2 magic bytes", () => {
    const magic = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
    expect(isDocBytes(magic)).toBe(true);
  });

  test("returns false for too-short buffer", () => {
    const short = new Uint8Array([0xd0, 0xcf, 0x11]);
    expect(isDocBytes(short)).toBe(false);
  });

  test("returns false for wrong bytes", () => {
    const wrong = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(isDocBytes(wrong)).toBe(false);
  });

  test("returns false for empty buffer", () => {
    expect(isDocBytes(new Uint8Array(0))).toBe(false);
  });
});

describe("isDocxBytes", () => {
  test("detects ZIP magic bytes", () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    expect(isDocxBytes(zip)).toBe(true);
  });

  test("returns false for too-short buffer", () => {
    const short = new Uint8Array([0x50, 0x4b]);
    expect(isDocxBytes(short)).toBe(false);
  });

  test("returns false for wrong bytes", () => {
    const wrong = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    expect(isDocxBytes(wrong)).toBe(false);
  });

  test("returns false for empty buffer", () => {
    expect(isDocxBytes(new Uint8Array(0))).toBe(false);
  });

  test("returns false for OLE2 (DOC) bytes", () => {
    const ole2 = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(isDocxBytes(ole2)).toBe(false);
  });
});

describe("detectFormat", () => {
  test("detects HTML from string", () => {
    expect(detectFormat("<div>hello</div>")).toBe("html");
  });

  test("detects RTF from string", () => {
    expect(detectFormat("{\\rtf1\\ansi}")).toBe("rtf");
  });

  test("RTF takes priority over HTML when both could match", () => {
    // RTF containing HTML-like angle brackets — should detect as RTF
    expect(detectFormat("{\\rtf1\\ansi <b>bold</b>}")).toBe("rtf");
  });

  test("returns unknown for plain text", () => {
    expect(detectFormat("just plain text")).toBe("unknown");
  });

  test("returns unknown for empty string", () => {
    expect(detectFormat("")).toBe("unknown");
  });

  test("detects DOC from Uint8Array", () => {
    const docMagic = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
    expect(detectFormat(docMagic)).toBe("doc");
  });

  test("detects RTF from Uint8Array", () => {
    const rtfBytes = new TextEncoder().encode("{\\rtf1\\ansi}");
    expect(detectFormat(rtfBytes)).toBe("rtf");
  });

  test("detects HTML from Uint8Array", () => {
    const htmlBytes = new TextEncoder().encode("<div>hello</div>");
    expect(detectFormat(htmlBytes)).toBe("html");
  });

  test("returns unknown from Uint8Array with plain text", () => {
    const plainBytes = new TextEncoder().encode("just text");
    expect(detectFormat(plainBytes)).toBe("unknown");
  });

  test("detects DOCX from Uint8Array (ZIP magic)", () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    expect(detectFormat(zipBytes)).toBe("docx");
  });

  test("DOC (OLE2) takes priority over DOCX (ZIP)", () => {
    const docMagic = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(detectFormat(docMagic)).toBe("doc");
  });
});
