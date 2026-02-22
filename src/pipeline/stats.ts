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

export function buildStats(
  mode: StatsMode,
  input: string,
  output: string,
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

  return {
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
}

export function formatStatsMarkdown(stats: ContentStats): string {
  return [
    `# decant stats (${stats.mode})`,
    "",
    `- input_chars: ${stats.inputChars}`,
    `- output_chars: ${stats.outputChars}`,
    `- char_reduction: ${stats.charReduction} (${stats.charReductionPct}%)`,
    `- input_tokens_estimate: ${stats.inputTokensEstimate}`,
    `- output_tokens_estimate: ${stats.outputTokensEstimate}`,
    `- token_reduction: ${stats.tokenReduction} (${stats.tokenReductionPct}%)`,
  ].join("\n");
}
