/**
 * Diff engine for comparing original HTML against clean markdown output.
 * Classifies HTML lines as kept or removed based on whether their text
 * content appears in the clean markdown output.
 */

// --- Types ---

export interface DiffLine {
  text: string;
  type: "kept" | "removed" | "context";
}

export interface DiffResult {
  htmlLines: DiffLine[];
  markdownLines: string[];
  stats: { kept: number; removed: number; total: number };
}

// --- HTML pretty-printer ---

/**
 * Regex-based HTML pretty-printer. Puts each tag on its own line
 * and indents nested elements for readable diff output.
 */
export function prettyPrintHtml(html: string): string {
  // Normalize whitespace first
  let s = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Insert newlines before and after tags
  s = s.replace(/>\s*</g, ">\n<");

  // Split into lines and indent
  const lines = s.split("\n");
  const result: string[] = [];
  let indent = 0;

  const voidElements = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check if this is a closing tag
    const isClosing = /^<\//.test(line);
    // Check if this is a self-closing or void tag
    const tagMatch = line.match(/^<\/?(\w+)/);
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : "";
    const isVoid = voidElements.has(tagName) || /\/>$/.test(line);
    // Check if this is an opening tag (not closing, not void)
    const isOpening = /^<[a-zA-Z]/.test(line) && !isClosing && !isVoid;

    if (isClosing) {
      indent = Math.max(0, indent - 1);
    }

    result.push(`${"  ".repeat(indent)}${line}`);

    if (isOpening) {
      indent += 1;
    }
  }

  return result.join("\n");
}

// --- Text normalization helpers ---

/** Decode common HTML entities to plain text for comparison. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Strip markdown formatting syntax to get plain text for comparison. */
function stripMarkdownSyntax(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")   // ![alt](url) → alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")     // [text](url) → text
    .replace(/\*\*([^*]+)\*\*/g, "$1")            // **bold** → bold
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")   // *italic* → italic
    .replace(/(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, "$1") // _italic_ → italic
    .replace(/`([^`]+)`/g, "$1")                  // `code` → code
    .replace(/^#{1,6}\s+/, "")                    // ## heading → heading
    .replace(/^[-*+]\s+/, "")                     // - list → list
    .replace(/^\d+\.\s+/, "")                     // 1. list → list
    .replace(/^>\s*/, "")                         // > quote → quote
    .trim();
}

/** Normalize text for comparison: decode entities, strip markdown, collapse whitespace. */
function normalizeForComparison(text: string): string {
  return decodeEntities(stripMarkdownSyntax(text)).replace(/\s+/g, " ").trim().toLowerCase();
}

// --- Diff computation ---

/** Default transform options for naive conversion (no cleaning). */
const naiveOptions: TransformOptions = {
  keepLinks: true,
  keepImages: true,
  preserveTables: true,
  maxHeadingLevel: 6,
  aggressive: false,
};

/**
 * Compute a diff between original HTML and the clean markdown output.
 *
 * Strategy:
 * 1. Pretty-print the original HTML
 * 2. For each HTML line, strip tags and decode entities to get plain text
 * 3. Normalize clean markdown lines (strip formatting syntax) for comparison
 * 4. Classify HTML lines as kept (text found in clean output) or removed
 */
export function computeDiff(originalHtml: string, cleanMarkdown: string): DiffResult {
  const prettyHtml = prettyPrintHtml(originalHtml);
  const htmlLineTexts = prettyHtml.split("\n");
  const cleanLines = cleanMarkdown.split("\n");

  // Build normalized plain-text versions of clean markdown lines for comparison
  const cleanNormalized: string[] = [];
  for (const line of cleanLines) {
    const norm = normalizeForComparison(line);
    if (norm) cleanNormalized.push(norm);
  }

  // Classify each HTML line
  const htmlLines: DiffLine[] = [];
  let kept = 0;
  let removed = 0;

  for (const htmlLine of htmlLineTexts) {
    const trimmed = htmlLine.trim();

    if (!trimmed) {
      htmlLines.push({ text: htmlLine, type: "context" });
      continue;
    }

    // Strip tags and decode entities to get plain text content
    const textContent = decodeEntities(trimmed.replace(/<[^>]*>/g, "")).trim();

    // Pure markup tags (no text content) or very short text — classify as context
    if (!textContent || textContent.length < 3) {
      htmlLines.push({ text: htmlLine, type: "context" });
      continue;
    }

    // Normalize the HTML text for comparison
    const normalizedHtml = textContent.replace(/\s+/g, " ").trim().toLowerCase();

    // Check if the text content appears in any clean markdown line
    let found = false;
    for (const cleanNorm of cleanNormalized) {
      if (cleanNorm.includes(normalizedHtml) || normalizedHtml.includes(cleanNorm)) {
        found = true;
        break;
      }
    }

    if (found) {
      htmlLines.push({ text: htmlLine, type: "kept" });
      kept++;
    } else {
      htmlLines.push({ text: htmlLine, type: "removed" });
      removed++;
    }
  }

  return {
    htmlLines,
    markdownLines: cleanLines,
    stats: { kept, removed, total: kept + removed },
  };
}

// --- ANSI formatting ---

/**
 * Format a DiffResult as ANSI-colored text for TTY output.
 * Red = removed from pipeline, green = kept in output.
 * Uses lazy imports to avoid eagerly loading ansi.ts (which evaluates
 * the ANSI `enabled` flag at module load time and can conflict with
 * test files that set FORCE_COLOR before their own imports).
 */
export async function formatDiffAnsi(diff: DiffResult): Promise<string> {
  const { bold, dim, muted, success, removed } = await import("./ansi");

  const lines: string[] = [];

  lines.push(bold("─── Diff: Original HTML (kept/removed) ───"));
  lines.push("");

  for (const line of diff.htmlLines) {
    switch (line.type) {
      case "kept":
        lines.push(success(`  ${line.text}`));
        break;
      case "removed":
        lines.push(removed(`- ${line.text}`));
        break;
      case "context":
        lines.push(dim(`  ${line.text}`));
        break;
    }
  }

  lines.push("");
  lines.push(
    muted(
      `${diff.stats.kept} kept, ${diff.stats.removed} removed, ${diff.stats.total} total`,
    ),
  );

  return lines.join("\n");
}
