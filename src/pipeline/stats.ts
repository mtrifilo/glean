import type { ContentStats, StatsMode } from "../lib/types";

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function estimateTokens(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return 0;
  }

  const byChars = Math.ceil(normalized.length / 4);
  const words = normalized.split(" ").filter(Boolean).length;
  const byWords = Math.ceil(words * 1.33);

  return Math.max(1, Math.round((byChars + byWords) / 2));
}

export interface SourceInfo {
  sourceFormat?: string;
  sourceChars?: number;
}

export function buildStats(
  mode: StatsMode,
  input: string,
  output: string,
  source?: SourceInfo,
): ContentStats {
  const inputChars = input.length;
  const outputChars = output.length;
  const inputTokensEstimate = estimateTokens(input);
  const outputTokensEstimate = estimateTokens(output);

  const charReduction = inputChars - outputChars;
  const tokenReduction = inputTokensEstimate - outputTokensEstimate;

  const charReductionPct = inputChars === 0 ? 0 : (charReduction / inputChars) * 100;
  const tokenReductionPct =
    inputTokensEstimate === 0 ? 0 : (tokenReduction / inputTokensEstimate) * 100;

  const stats: ContentStats = {
    mode,
    inputChars,
    outputChars,
    inputTokensEstimate,
    outputTokensEstimate,
    charReduction,
    charReductionPct: roundToTwo(charReductionPct),
    tokenReduction,
    tokenReductionPct: roundToTwo(tokenReductionPct),
  };

  if (source?.sourceFormat) {
    stats.sourceFormat = source.sourceFormat;
  }
  if (source?.sourceChars != null) {
    stats.sourceChars = source.sourceChars;
  }

  return stats;
}

export function formatStatsMarkdown(stats: ContentStats): string {
  const lines = [
    `# decant stats (${stats.mode})`,
    "",
  ];

  if (stats.sourceFormat && stats.sourceFormat !== "html") {
    lines.push(`- source_format: ${stats.sourceFormat}`);
    if (stats.sourceChars != null) {
      lines.push(`- source_chars: ${stats.sourceChars}`);
    }
  }

  lines.push(
    `- input_chars: ${stats.inputChars}`,
    `- output_chars: ${stats.outputChars}`,
    `- char_reduction: ${stats.charReduction} (${stats.charReductionPct}%)`,
    `- input_tokens_estimate: ${stats.inputTokensEstimate}`,
    `- output_tokens_estimate: ${stats.outputTokensEstimate}`,
    `- token_reduction: ${stats.tokenReduction} (${stats.tokenReductionPct}%)`,
  );

  return lines.join("\n");
}
