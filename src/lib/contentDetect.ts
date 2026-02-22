export type ContentFormat = "html" | "rtf" | "doc" | "docx" | "unknown";

export function looksLikeHtml(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  if (/<[a-zA-Z][\w:-]*(\s[^>]*)?>/.test(value)) {
    return true;
  }

  return /&lt;[a-zA-Z][\w:-]*/.test(value);
}

export function looksLikeRtf(value: string): boolean {
  return value.trimStart().startsWith("{\\rtf");
}

const OLE2_MAGIC = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

// ZIP magic matches all ZIP-based formats (DOCX, EPUB, XLSX, etc.).
// Currently only DOCX is supported — refine when adding other ZIP formats.
const ZIP_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

export function isDocxBytes(buffer: Uint8Array): boolean {
  if (buffer.length < ZIP_MAGIC.length) {
    return false;
  }

  for (let i = 0; i < ZIP_MAGIC.length; i++) {
    if (buffer[i] !== ZIP_MAGIC[i]) {
      return false;
    }
  }

  return true;
}

export function isDocBytes(buffer: Uint8Array): boolean {
  if (buffer.length < OLE2_MAGIC.length) {
    return false;
  }

  for (let i = 0; i < OLE2_MAGIC.length; i++) {
    if (buffer[i] !== OLE2_MAGIC[i]) {
      return false;
    }
  }

  return true;
}

export function detectFormat(input: string | Uint8Array): ContentFormat {
  if (input instanceof Uint8Array) {
    if (isDocBytes(input)) {
      return "doc";
    }
    if (isDocxBytes(input)) {
      return "docx";
    }

    const text = new TextDecoder().decode(input);
    if (looksLikeRtf(text)) {
      return "rtf";
    }
    if (looksLikeHtml(text)) {
      return "html";
    }

    return "unknown";
  }

  if (looksLikeRtf(input)) {
    return "rtf";
  }
  if (looksLikeHtml(input)) {
    return "html";
  }

  return "unknown";
}
