/**
 * File drag-and-drop support for the TUI.
 * Handles path normalization from terminal paste events and file reading/conversion.
 */

import { resolve } from "path";
import { convertRtfToHtml, convertDocToHtml, convertDocxToHtml, convertPdfToHtml } from "../lib/convert";

const SUPPORTED_EXTENSIONS = new Set([
  ".html", ".htm", ".rtf", ".doc", ".docx", ".pdf",
]);

/**
 * Normalize a pasted path from a terminal drag-and-drop event.
 * Returns the cleaned absolute path, or null if the text doesn't look like a file path.
 */
export function normalizePastedPath(raw: string): string | null {
  // Normalize line endings (Windows ConPTY sends CR-only)
  let path = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Take only the first line (multi-file drops)
  const firstLine = path.split("\n")[0].trim();
  if (!firstLine) return null;
  path = firstLine;

  // Strip surrounding quotes (single or double)
  if ((path.startsWith("'") && path.endsWith("'")) || (path.startsWith('"') && path.endsWith('"'))) {
    path = path.slice(1, -1);
  }

  // Remove backslash escapes for spaces (iTerm2, Terminal.app style)
  path = path.replace(/\\ /g, " ");

  // Strip file:// URI prefix
  if (path.startsWith("file://")) {
    path = decodeURIComponent(path.slice("file://".length));
  }

  // Expand ~ to home directory
  if (path.startsWith("~/") || path === "~") {
    const home = process.env.HOME ?? "";
    path = path.replace(/^~/, home);
  }

  // Resolve relative paths
  if (path.startsWith("./") || path.startsWith("../")) {
    path = resolve(process.cwd(), path);
  }

  // Must be an absolute path at this point
  if (!path.startsWith("/")) {
    return null;
  }

  return path;
}

/**
 * Check if a file path has a supported extension for conversion.
 */
export function isSupportedFile(filePath: string): boolean {
  const dotIndex = filePath.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filePath.slice(dotIndex).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Read a file and convert it to HTML based on its extension.
 * Throws if the file doesn't exist or conversion fails.
 */
export async function readAndConvertFile(filePath: string): Promise<string> {
  const dotIndex = filePath.lastIndexOf(".");
  const ext = dotIndex !== -1 ? filePath.slice(dotIndex).toLowerCase() : "";

  const file = Bun.file(filePath);
  const exists = await file.exists();
  if (!exists) {
    throw new Error(`File not found: ${filePath}`);
  }

  switch (ext) {
    case ".html":
    case ".htm": {
      return await file.text();
    }
    case ".rtf": {
      const content = await file.text();
      return await convertRtfToHtml(content);
    }
    case ".doc": {
      return await convertDocToHtml(filePath);
    }
    case ".docx": {
      const buffer = new Uint8Array(await file.arrayBuffer());
      return await convertDocxToHtml(buffer);
    }
    case ".pdf": {
      const buffer = new Uint8Array(await file.arrayBuffer());
      return await convertPdfToHtml(buffer);
    }
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
