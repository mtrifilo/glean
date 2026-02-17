import type { ContentStats, StatsMode, TransformOptions } from "../lib/types";
import { cleanHtml } from "./cleanHtml";
import { extractContent } from "./extractContent";
import { buildStats } from "./stats";
import { toMarkdown } from "./toMarkdown";

export interface ProcessResult {
  markdown: string;
  stats: ContentStats;
}

export function processHtml(
  mode: StatsMode,
  inputHtml: string,
  options: TransformOptions,
): ProcessResult {
  const cleanedHtml =
    mode === "extract"
      ? extractContent(inputHtml, options).cleanedHtml
      : cleanHtml(inputHtml, options).cleanedHtml;

  const markdown = toMarkdown(cleanedHtml, options);
  const stats = buildStats(mode, inputHtml, markdown);

  return { markdown, stats };
}
