/**
 * Diff engine for comparing original HTML against clean markdown output.
 * Uses jsdiff to identify what the pipeline kept vs removed.
 */

import { diffLines } from "diff";
import { toMarkdown } from "../pipeline/toMarkdown";
import type { TransformOptions } from "./types";

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
 * 2. Convert original HTML to markdown naively (no cleaning) to get a text baseline
 * 3. Use diffLines() to compare naive markdown vs clean markdown
 * 4. Map diff hunks back to HTML lines — lines whose content made it to
 *    the clean output are "kept", others are "removed"
 */
export function computeDiff(originalHtml: string, cleanMarkdown: string): DiffResult {
  const prettyHtml = prettyPrintHtml(originalHtml);
  const htmlLineTexts = prettyHtml.split("\n");

  // Naive conversion: turn the original HTML into markdown with no cleaning
  const naiveMarkdown = toMarkdown(originalHtml, naiveOptions);
  const naiveLines = naiveMarkdown.split("\n");
  const cleanLines = cleanMarkdown.split("\n");

  // Build a set of content from clean markdown for fast lookup
  const cleanContentSet = new Set<string>();
  for (const line of cleanLines) {
    const trimmed = line.trim();
    if (trimmed) cleanContentSet.add(trimmed);
  }

  // Diff naive vs clean to find which naive lines survived
  const diff = diffLines(naiveMarkdown, cleanMarkdown);
  const removedNaiveContent = new Set<string>();
  for (const part of diff) {
    if (part.removed) {
      const partLines = part.value.split("\n");
      for (const pl of partLines) {
        const trimmed = pl.trim();
        if (trimmed) removedNaiveContent.add(trimmed);
      }
    }
  }

  // Now classify each HTML line
  const htmlLines: DiffLine[] = [];
  let kept = 0;
  let removed = 0;

  for (const htmlLine of htmlLineTexts) {
    const trimmed = htmlLine.trim();

    if (!trimmed) {
      htmlLines.push({ text: htmlLine, type: "context" });
      continue;
    }

    // Check if any clean markdown line contains text from this HTML line
    // Strip tags from the HTML line to get its text content
    const textContent = trimmed.replace(/<[^>]*>/g, "").trim();

    if (!textContent) {
      // Pure markup tags — classify as removed if they're structural/noise
      // Check if the tag itself is likely structural
      const isStructural = /^<\/?(div|span|nav|header|footer|aside|section|script|style|link|meta|noscript)/i.test(trimmed);
      if (isStructural) {
        htmlLines.push({ text: htmlLine, type: "removed" });
        removed++;
      } else {
        htmlLines.push({ text: htmlLine, type: "kept" });
        kept++;
      }
      continue;
    }

    // Check if the text content appears in the clean output
    let found = false;
    for (const cleanLine of cleanContentSet) {
      if (cleanLine.includes(textContent) || textContent.includes(cleanLine)) {
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
