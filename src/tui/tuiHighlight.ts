/**
 * TUI syntax highlighting for OpenTUI Text nodes.
 * Ports the ANSI-based highlightMarkdown.ts logic to return arrays of
 * Text() VNodes with fg color props, suitable for OpenTUI rendering.
 */

// --- Shared color palette (single source of truth for all TUI screens) ---

export const COLORS = {
  ACCENT: "#7dd3fc",
  SUCCESS: "#4ade80",
  MUTED: "#6b7280",
  STAT_LABEL: "#94a3b8",
  STAT_VALUE: "#f1f5f9",
  HIGHLIGHT: "#fbbf24",
  OVER_BUDGET: "#ef4444",
} as const;

// --- Code fence state map ---

/**
 * Pre-compute per-line "inside code fence" state.
 * Returns a boolean[] where fenceState[i] is true if line i is inside a code fence.
 * Code fence delimiter lines themselves are NOT inside the fence (they toggle state).
 */
export function buildFenceStateMap(lines: string[]): boolean[] {
  const state: boolean[] = new Array(lines.length);
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      state[i] = false; // delimiter line is never "inside"
      inFence = !inFence;
    } else {
      state[i] = inFence;
    }
  }

  return state;
}

// --- Inline segment parsing ---

interface Segment {
  text: string;
  fg: string;
  bold?: boolean;
  dim?: boolean;
}

/**
 * Split a line into inline-highlighted segments.
 * Handles: inline code, links, bold, italic (asterisk and underscore).
 */
function highlightInlineSegments(text: string): Segment[] {
  if (!text) return [{ text: "", fg: COLORS.STAT_VALUE }];

  // Tokenize inline patterns left-to-right
  const segments: Segment[] = [];
  let remaining = text;

  // Combined regex: code spans, links, bold, italic (* and _)
  const pattern =
    /`([^`]+)`|\[([^\]]*)\]\(([^)]*)\)|\*\*([^*]+)\*\*|(?<!\*)\*([^*]+)\*(?!\*)|(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(remaining)) !== null) {
    // Push plain text before this match
    if (match.index > lastIndex) {
      segments.push({ text: remaining.slice(lastIndex, match.index), fg: COLORS.STAT_VALUE });
    }

    if (match[1] !== undefined) {
      // Inline code: `code`
      segments.push({ text: `\`${match[1]}\``, fg: COLORS.HIGHLIGHT });
    } else if (match[2] !== undefined) {
      // Link: [text](url)
      segments.push({ text: `[${match[2]}]`, fg: COLORS.ACCENT });
      segments.push({ text: `(${match[3]})`, fg: COLORS.MUTED });
    } else if (match[4] !== undefined) {
      // Bold: **text**
      segments.push({ text: "**", fg: COLORS.MUTED });
      segments.push({ text: match[4], fg: COLORS.STAT_VALUE, bold: true });
      segments.push({ text: "**", fg: COLORS.MUTED });
    } else if (match[5] !== undefined) {
      // Italic: *text*
      segments.push({ text: "*", fg: COLORS.MUTED });
      segments.push({ text: match[5], fg: COLORS.STAT_VALUE, dim: true });
      segments.push({ text: "*", fg: COLORS.MUTED });
    } else if (match[6] !== undefined) {
      // Italic: _text_
      segments.push({ text: "_", fg: COLORS.MUTED });
      segments.push({ text: match[6], fg: COLORS.STAT_VALUE, dim: true });
      segments.push({ text: "_", fg: COLORS.MUTED });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text
  if (lastIndex < remaining.length) {
    segments.push({ text: remaining.slice(lastIndex), fg: COLORS.STAT_VALUE });
  }

  return segments.length > 0 ? segments : [{ text, fg: COLORS.STAT_VALUE }];
}

// --- Rich line highlighting ---

/**
 * Convert a single markdown line into an array of OpenTUI Text() nodes.
 * Uses the pre-computed inCodeFence state.
 */
export function colorLineRich(
  line: string,
  inCodeFence: boolean,
  Text: any,
  TextAttributes?: any,
): any[] {
  const BOLD = TextAttributes?.BOLD;

  // Code fence delimiter
  if (/^```/.test(line)) {
    return [Text({ content: line, fg: COLORS.MUTED, flexShrink: 0 })];
  }

  // Inside code fence → dim entire line
  if (inCodeFence) {
    return [Text({ content: line, fg: COLORS.MUTED, flexShrink: 0 })];
  }

  // Headings
  if (/^#{1,6} /.test(line)) {
    return [Text({ content: line, fg: COLORS.ACCENT, ...(BOLD ? { attributes: BOLD } : {}), flexShrink: 0 })];
  }

  // Horizontal rules
  if (/^[-]{3,}$/.test(line) || /^[_]{3,}$/.test(line) || /^[*]{3,}$/.test(line)) {
    return [Text({ content: line, fg: COLORS.MUTED, flexShrink: 0 })];
  }

  // Blockquotes
  const bqMatch = line.match(/^(>\s?)(.*)/);
  if (bqMatch) {
    const nodes = [Text({ content: bqMatch[1], fg: COLORS.MUTED, flexShrink: 0 })];
    const inlineSegments = highlightInlineSegments(bqMatch[2]);
    for (const seg of inlineSegments) {
      nodes.push(Text({ content: seg.text, fg: seg.fg, flexShrink: 0 }));
    }
    return nodes;
  }

  // List items
  const listMatch = line.match(/^(\s*)([*+\-]|\d+\.)\s/);
  if (listMatch) {
    const indent = listMatch[1];
    const marker = listMatch[2];
    const rest = line.slice(indent.length + marker.length + 1);
    const nodes = [
      Text({ content: `${indent}${marker} `, fg: COLORS.ACCENT, flexShrink: 0 }),
    ];
    const inlineSegments = highlightInlineSegments(rest);
    for (const seg of inlineSegments) {
      nodes.push(Text({
        content: seg.text,
        fg: seg.fg,
        ...(seg.bold && BOLD ? { attributes: BOLD } : {}),
        flexShrink: 0,
      }));
    }
    return nodes;
  }

  // Normal line → inline patterns
  const segments = highlightInlineSegments(line);
  return segments.map((seg) =>
    Text({
      content: seg.text,
      fg: seg.fg,
      ...(seg.bold && BOLD ? { attributes: BOLD } : {}),
      flexShrink: 0,
    }),
  );
}

// --- Diff line highlighting ---

const DIFF_COLORS = {
  KEPT: "#4ade80",    // green — same as SUCCESS
  REMOVED: "#ef4444", // red — same as OVER_BUDGET
  CONTEXT: "#6b7280", // gray — same as MUTED
} as const;

export type DiffLineType = "kept" | "removed" | "context";

/**
 * Convert a DiffLine into a Text node with red/green coloring for TUI diff view.
 */
export function colorDiffLine(
  text: string,
  type: DiffLineType,
  Text: any,
): any {
  switch (type) {
    case "kept":
      return Text({ content: `  ${text}`, fg: DIFF_COLORS.KEPT, flexShrink: 0 });
    case "removed":
      return Text({ content: `- ${text}`, fg: DIFF_COLORS.REMOVED, flexShrink: 0 });
    case "context":
      return Text({ content: `  ${text}`, fg: DIFF_COLORS.CONTEXT, flexShrink: 0 });
  }
}

// --- Shortcut bar ---

export interface Shortcut {
  key: string;
  label: string;
}

/**
 * Build a shortcut bar as a Box with alternating key/label Text nodes.
 * Keys are bright (STAT_LABEL), labels are muted.
 */
export function shortcutBar(
  shortcuts: Shortcut[],
  Box: any,
  Text: any,
): any {
  const nodes: any[] = [];
  for (let i = 0; i < shortcuts.length; i++) {
    if (i > 0) {
      nodes.push(Text({ content: "   ", fg: COLORS.MUTED }));
    }
    nodes.push(Text({ content: shortcuts[i].key, fg: COLORS.STAT_LABEL }));
    nodes.push(Text({ content: ` ${shortcuts[i].label}`, fg: COLORS.MUTED }));
  }

  return Box(
    { flexDirection: "row" as const, flexShrink: 0 },
    ...nodes,
  );
}
