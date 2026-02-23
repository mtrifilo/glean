import { estimateTokens } from "./stats";

export interface MarkdownSection {
  heading: string;
  level: number;
  content: string;
  tokens: number;
}

export interface SectionBreakdown {
  sections: MarkdownSection[];
  totalTokens: number;
  maxTokens: number;
  overBudget: boolean;
  overageTokens: number;
}

export interface TruncationResult {
  markdown: string;
  keptSections: MarkdownSection[];
  droppedSections: MarkdownSection[];
  keptTokens: number;
}

const HEADING_REGEX = /^(#{1,6})\s+/;

const TRUNCATION_MARKER =
  "\n\n---\n\n_[Content truncated — output exceeded token budget. Use `decant stats --max-tokens N` to see full section breakdown.]_";

export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  if (!markdown) {
    return [];
  }

  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];
  let currentLines: string[] = [];
  let currentHeading = "(preamble)";
  let currentLevel = 0;

  function flushSection() {
    const content = currentLines.join("\n");
    if (currentHeading === "(preamble)" && !content.trim()) {
      return;
    }
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content,
      tokens: estimateTokens(content),
    });
  }

  for (const line of lines) {
    const match = line.match(HEADING_REGEX);
    if (match) {
      flushSection();
      currentHeading = line;
      currentLevel = match[1].length;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  flushSection();
  return sections;
}

export function buildSectionBreakdown(
  sections: MarkdownSection[],
  maxTokens: number,
): SectionBreakdown {
  const totalTokens = sections.reduce((sum, s) => sum + s.tokens, 0);
  const overageTokens = Math.max(0, totalTokens - maxTokens);

  return {
    sections,
    totalTokens,
    maxTokens,
    overBudget: totalTokens > maxTokens,
    overageTokens,
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatSectionBreakdown(breakdown: SectionBreakdown): string {
  const { sections, totalTokens, maxTokens, overBudget, overageTokens } = breakdown;

  const lines: string[] = [];
  lines.push(`Section breakdown (budget: ${formatNumber(maxTokens)} tokens):`);
  lines.push("");
  lines.push("  #   Tokens  Section");

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const num = String(i + 1).padStart(3);
    const tok = formatNumber(s.tokens).padStart(8);
    lines.push(`  ${num}${tok}  ${s.heading}`);
  }

  lines.push("  " + "\u2500".repeat(38));

  const totalStr = formatNumber(totalTokens).padStart(8);
  const budgetNote = overBudget
    ? ` (${formatNumber(overageTokens)} over budget)`
    : " (within budget)";
  lines.push(`     ${totalStr}  total${budgetNote}`);

  return lines.join("\n");
}

export function truncateToTokenBudget(
  sections: MarkdownSection[],
  maxTokens: number,
): TruncationResult {
  if (sections.length === 0) {
    return { markdown: "", keptSections: [], droppedSections: [], keptTokens: 0 };
  }

  const kept: MarkdownSection[] = [sections[0]];
  let keptTokens = sections[0].tokens;

  for (let i = 1; i < sections.length; i++) {
    if (keptTokens + sections[i].tokens <= maxTokens) {
      kept.push(sections[i]);
      keptTokens += sections[i].tokens;
    } else {
      break;
    }
  }

  const dropped = sections.slice(kept.length);
  let markdown = kept.map((s) => s.content).join("\n");

  if (dropped.length > 0) {
    markdown += TRUNCATION_MARKER;
  }

  return { markdown, keptSections: kept, droppedSections: dropped, keptTokens };
}

export function formatTokenBudgetError(breakdown: SectionBreakdown): string {
  const lines: string[] = [];
  lines.push("Error: output exceeds token budget.");
  lines.push("");
  lines.push(formatSectionBreakdown(breakdown));
  lines.push("");
  lines.push("Suggestions:");
  lines.push("  - Increase --max-tokens to fit the full output");
  lines.push("  - Use `decant extract` for tighter content extraction");
  lines.push("  - Add --aggressive for stronger pruning");
  lines.push("  - Run in a TTY for automatic smart truncation");

  return lines.join("\n");
}

export function formatTokenBudgetWarning(
  breakdown: SectionBreakdown,
  truncation: TruncationResult,
): string {
  const { sections, maxTokens } = breakdown;
  const keptSet = new Set(truncation.keptSections);

  const lines: string[] = [];
  lines.push("Warning: output exceeded token budget — smart truncation applied.");
  lines.push("");
  lines.push(`Section breakdown (budget: ${formatNumber(maxTokens)} tokens):`);
  lines.push("");
  lines.push("  #   Tokens  Section");

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const num = String(i + 1).padStart(3);
    const tok = formatNumber(s.tokens).padStart(8);
    const label = keptSet.has(s) ? "[kept]" : "[dropped]";
    lines.push(`  ${num}${tok}  ${s.heading}  ${label}`);
  }

  lines.push("");
  lines.push(
    `Kept ${truncation.keptSections.length} of ${sections.length} sections (${formatNumber(truncation.keptTokens)} tokens).`,
  );

  return lines.join("\n");
}
