import TurndownService from "turndown";
import turndownPluginGfm from "turndown-plugin-gfm";
import type { TransformOptions } from "../lib/types";

function clampHeadingLevels(markdown: string, maxHeadingLevel: number): string {
  const clamped = Math.max(1, Math.min(6, Math.floor(maxHeadingLevel)));
  if (clamped === 6) {
    return markdown;
  }

  return markdown.replace(/^(#{1,6})(\s+)/gm, (match, hashes: string, spacing: string) => {
    if (hashes.length <= clamped) {
      return match;
    }
    return `${"#".repeat(clamped)}${spacing}`;
  });
}

function normalizeMarkdown(markdown: string, options: TransformOptions): string {
  let output = markdown.replace(/\r\n/g, "\n");
  output = output.replace(/[ \t]+\n/g, "\n");
  output = clampHeadingLevels(output, options.maxHeadingLevel);
  output = output.replace(/^\s*#{1,6}\s*$/gm, "");
  output = output.replace(/\n{3,}/g, "\n\n");

  return output.trim();
}

export function toMarkdown(cleanedHtml: string, options: TransformOptions): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
  });

  turndown.use(turndownPluginGfm.gfm);

  if (!options.keepLinks) {
    turndown.addRule("stripLinks", {
      filter: "a",
      replacement: (content: string) => content,
    });
  }

  if (!options.keepImages) {
    turndown.addRule("stripImages", {
      filter: "img",
      replacement: () => "",
    });
  }

  const converted = turndown.turndown(cleanedHtml);
  return normalizeMarkdown(converted, options);
}
