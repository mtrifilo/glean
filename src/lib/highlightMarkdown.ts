/**
 * Regex-based syntax highlighting for raw markdown source.
 * Applies ANSI colors so markdown structure is visible (like an editor),
 * without rendering/removing the syntax markers.
 */

import { accent, bold, dim, highlight, muted } from "./ansi";

/** Highlight inline markdown patterns within a text segment. */
function highlightInline(text: string): string {
  // 1. Inline code (protect contents from further matching)
  const codeSpans: string[] = [];
  let result = text.replace(/`([^`]+)`/g, (_match, code) => {
    const placeholder = `\x00CODE${codeSpans.length}\x00`;
    codeSpans.push(highlight(`\`${code}\``));
    return placeholder;
  });

  // 2. Links [text](url)
  result = result.replace(
    /\[([^\]]*)\]\(([^)]*)\)/g,
    (_match, linkText, url) =>
      `${accent(`[${linkText}]`)}${muted(`(${url})`)}`,
  );

  // 3. Bold **...**
  result = result.replace(
    /\*\*([^*]+)\*\*/g,
    (_match, content) => `${muted("**")}${bold(content)}${muted("**")}`,
  );

  // 4. Italic *...* (single asterisk, not matching inside **)
  result = result.replace(
    /(?<!\*)\*([^*]+)\*(?!\*)/g,
    (_match, content) => `${muted("*")}${dim(content)}${muted("*")}`,
  );

  // 4b. Italic _..._
  result = result.replace(
    /(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g,
    (_match, content) => `${muted("_")}${dim(content)}${muted("_")}`,
  );

  // Restore code spans
  for (let i = 0; i < codeSpans.length; i++) {
    result = result.replace(`\x00CODE${i}\x00`, codeSpans[i]);
  }

  return result;
}

/** Highlight a single line of markdown, given code fence tracking state. */
export function highlightMarkdownLine(
  line: string,
  inCodeFence: boolean,
): { result: string; inCodeFence: boolean } {
  // Code fence toggle
  if (/^```/.test(line)) {
    return {
      result: muted(line),
      inCodeFence: !inCodeFence,
    };
  }

  // Inside code fence → dim entire line
  if (inCodeFence) {
    return { result: dim(line), inCodeFence };
  }

  // Headings: ^#{1,6}
  if (/^#{1,6} /.test(line)) {
    return { result: bold(accent(line)), inCodeFence };
  }

  // Horizontal rules: ---, ___, ***
  if (/^[-]{3,}$/.test(line) || /^[_]{3,}$/.test(line) || /^[*]{3,}$/.test(line)) {
    return { result: muted(line), inCodeFence };
  }

  // Blockquotes: > ...
  const bqMatch = line.match(/^(>\s?)(.*)/);
  if (bqMatch) {
    return {
      result: muted(bqMatch[1]) + dim(highlightInline(bqMatch[2])),
      inCodeFence,
    };
  }

  // List items: - , * , + , 1.
  const listMatch = line.match(/^(\s*)([*+-]|\d+\.)\s/);
  if (listMatch) {
    const indent = listMatch[1];
    const marker = listMatch[2];
    const rest = line.slice(indent.length + marker.length + 1);
    return {
      result: indent + accent(marker) + " " + highlightInline(rest),
      inCodeFence,
    };
  }

  // Normal line → inline patterns only
  return { result: highlightInline(line), inCodeFence };
}

/**
 * Apply syntax highlighting to raw markdown source.
 * Returns the same text with ANSI color codes wrapping syntax elements.
 */
export function highlightMarkdown(source: string): string {
  const lines = source.split("\n");
  let inCodeFence = false;
  const highlighted: string[] = [];

  for (const line of lines) {
    const { result, inCodeFence: newState } = highlightMarkdownLine(
      line,
      inCodeFence,
    );
    inCodeFence = newState;
    highlighted.push(result);
  }

  return highlighted.join("\n");
}
