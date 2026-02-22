import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { detectFormat } from "../lib/contentDetect";
import { convertRtfToHtml } from "../lib/convert";
import { copyToClipboard, readClipboardRtf, readClipboardText } from "../lib/io";
import { recordRunStats } from "../lib/sessionStats";
import type { StatsMode, TransformOptions } from "../lib/types";
import { processHtml } from "../pipeline/processHtml";
import { runExperimentalTui } from "../tui/experimental";

interface InteractiveOptions {
  forceTui: boolean;
  mode: StatsMode;
  aggressive: boolean;
}

function defaultTransformOptions(aggressive: boolean): TransformOptions {
  return {
    keepLinks: true,
    keepImages: false,
    preserveTables: true,
    maxHeadingLevel: 6,
    aggressive,
  };
}

function percent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function printIntro(): void {
  const intro = [
    "",
    "glean interactive mode",
    "Clipboard-first flow: copy HTML, run glean, paste clean markdown.",
    "",
  ];

  process.stdout.write(`${intro.join("\n")}`);
}

async function resolveClipboard(): Promise<string | null> {
  const text = await readClipboardText();
  if (text) {
    const format = detectFormat(text);
    if (format === "html") return text;
    if (format === "rtf") return convertRtfToHtml(text);
  }

  const rtf = await readClipboardRtf();
  if (rtf) {
    const format = detectFormat(rtf);
    if (format === "rtf") return convertRtfToHtml(rtf);
  }

  return null;
}

async function waitForClipboardContent(): Promise<string> {
  const first = await resolveClipboard();
  if (first) return first;

  const rl = createInterface({ input, output });
  try {
    while (true) {
      const answer = (
        await rl.question(
          "No convertible content in clipboard. Copy HTML from DevTools or content from Word, then press Enter to retry (q to cancel): ",
        )
      )
        .trim()
        .toLowerCase();

      if (answer === "q" || answer === "quit" || answer === "exit") {
        throw new Error("Interactive mode canceled.");
      }

      const resolved = await resolveClipboard();
      if (resolved) return resolved;

      process.stdout.write("Still no convertible clipboard content detected.\n");
    }
  } finally {
    rl.close();
  }
}

function renderSummary(
  mode: StatsMode,
  aggressive: boolean,
  markdown: string,
  statsBlock: string,
): void {
  process.stdout.write(
    [
      "",
      "Processing complete.",
      "Markdown copied to clipboard.",
      "",
      `Mode: ${mode}`,
      `Aggressive pruning: ${aggressive ? "on" : "off"}`,
      "",
      "Output markdown:",
      "----------------",
      markdown.trim() || "(empty output)",
      "",
      "Stats:",
      "------",
      statsBlock,
      "",
    ].join("\n"),
  );
}

export async function runInteractive(options: InteractiveOptions): Promise<void> {
  if (options.forceTui) {
    const handled = await runExperimentalTui({
      mode: options.mode,
      aggressive: options.aggressive,
    });
    if (handled) {
      return;
    }
  }

  printIntro();
  const html = await waitForClipboardContent();

  if (!html.trim()) {
    throw new Error("No HTML was provided in clipboard.");
  }

  const transformOptions = defaultTransformOptions(options.aggressive);
  const processed = processHtml(options.mode, html, transformOptions);

  await copyToClipboard(processed.markdown);
  const session = await recordRunStats(processed.stats);

  const currentRunStatsLines = [
    `- input chars: ${processed.stats.inputChars}`,
    `- output chars: ${processed.stats.outputChars}`,
    `- chars saved: ${processed.stats.charReduction} (${percent(processed.stats.charReductionPct)})`,
    `- input tokens (est): ${processed.stats.inputTokensEstimate}`,
    `- output tokens (est): ${processed.stats.outputTokensEstimate}`,
    `- tokens saved: ${processed.stats.tokenReduction} (${percent(processed.stats.tokenReductionPct)})`,
    `- aggressive mode: ${options.aggressive ? "on" : "off"}`,
  ];

  const sessionStatsLines = [
    "",
    "Session totals:",
    `- today (${session.todayKey}) runs: ${session.today.runs}`,
    `- today tokens saved: ${session.today.tokensSaved}`,
    `- lifetime runs: ${session.lifetime.runs}`,
    `- lifetime tokens saved: ${session.lifetime.tokensSaved}`,
    `- tracking file: ${session.available ? session.statsPath : "unavailable in this environment"}`,
  ];

  renderSummary(options.mode, options.aggressive, processed.markdown, [
    ...currentRunStatsLines,
    ...sessionStatsLines,
  ].join("\n"));
}
