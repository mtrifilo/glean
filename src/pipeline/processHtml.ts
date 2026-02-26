import type { ContentStats, StatsMode, TransformOptions } from "../lib/types";
import { cleanHtml } from "./cleanHtml";
import { extractContent } from "./extractContent";
import { type SourceInfo, buildStats } from "./stats";
import { toMarkdown } from "./toMarkdown";

export interface ProcessResult {
  markdown: string;
  stats: ContentStats;
  /** Original HTML input, retained when retainInput option is set. */
  inputHtml?: string;
}

export interface ProcessHtmlOptions {
  /** When true, include the original inputHtml on the result for diff mode. */
  retainInput?: boolean;
}

export function processHtml(
  mode: StatsMode,
  inputHtml: string,
  options: TransformOptions,
  source?: SourceInfo,
  processOptions?: ProcessHtmlOptions,
): ProcessResult {
  const cleanedHtml =
    mode === "extract"
      ? extractContent(inputHtml, options).cleanedHtml
      : cleanHtml(inputHtml, options).cleanedHtml;

  const markdown = toMarkdown(cleanedHtml, options);
  const stats = buildStats(mode, inputHtml, markdown, source);

  const result: ProcessResult = { markdown, stats };
  if (processOptions?.retainInput) {
    result.inputHtml = inputHtml;
  }
  return result;
}
