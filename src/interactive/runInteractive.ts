import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  accent,
  bold,
  clearLine,
  highlight,
  muted,
  statLabel,
  statValue,
  success,
} from "../lib/ansi";
import { detectFormat } from "../lib/contentDetect";
import { convertRtfToHtml } from "../lib/convert";
import { copyToClipboard, readClipboardRtf, readClipboardText } from "../lib/io";
import { recordRunStats } from "../lib/sessionStats";
import type { ContentStats, StatsMode, TransformOptions } from "../lib/types";
import { processHtml } from "../pipeline/processHtml";
import { runExperimentalTui } from "../tui/experimental";

interface InteractiveOptions {
  forceTui: boolean;
  mode: StatsMode;
  aggressive: boolean;
}

const SPINNER = ["\u25d0", "\u25d3", "\u25d1", "\u25d2"];
const SEPARATOR = "\u2500".repeat(37);

function defaultTransformOptions(aggressive: boolean): TransformOptions {
  return {
    keepLinks: true,
    keepImages: false,
    preserveTables: true,
    maxHeadingLevel: 6,
    aggressive,
  };
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function percent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function previewLines(markdown: string, limit = 20): string[] {
  const lines = markdown.trim() ? markdown.trim().split("\n") : ["(empty output)"];
  if (lines.length <= limit) return lines;
  return [...lines.slice(0, limit), "..."];
}

function printIntro(mode: StatsMode, aggressive: boolean): void {
  const lines = [
    "",
    `${bold(accent("decant"))} ${muted("\u00b7")} ${muted("interactive mode")}`,
    `${muted("Mode:")} ${bold(statValue(mode))}    ${muted("Aggressive:")} ${bold(statValue(aggressive ? "on" : "off"))}`,
    "",
  ];
  process.stdout.write(lines.join("\n"));
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

  // Show waiting state with helper text
  process.stdout.write(
    [
      `${muted("Copy HTML, RTF, or Word content to your clipboard.")}`,
      `${muted("Press Enter to retry \u00b7 q to cancel")}`,
      "",
    ].join("\n"),
  );

  // Start spinner on the prompt line
  let spin = 0;
  const spinnerInterval = setInterval(() => {
    clearLine();
    const ch = SPINNER[spin % SPINNER.length];
    process.stdout.write(accent(`${ch} Waiting for clipboard content...`));
    spin += 1;
  }, 500);

  const rl = createInterface({ input, output });
  try {
    while (true) {
      clearInterval(spinnerInterval);
      clearLine();

      const answer = (await rl.question(muted("Press Enter to retry (q to cancel): ")))
        .trim()
        .toLowerCase();

      if (answer === "q" || answer === "quit" || answer === "exit") {
        throw new Error("Interactive mode canceled.");
      }

      const resolved = await resolveClipboard();
      if (resolved) {
        return resolved;
      }

      process.stdout.write(`${muted("No convertible content detected. Try again.")}\n`);
    }
  } finally {
    clearInterval(spinnerInterval);
    rl.close();
  }
}

function renderSection(title: string, lines: string[]): string {
  return [
    `${accent(title)}`,
    muted(SEPARATOR),
    ...lines,
  ].join("\n");
}

function renderStats(stats: ContentStats): string {
  return renderSection("Stats", [
    `${statLabel("Chars    ")}${statValue(`${fmt(stats.inputChars)} \u2192 ${fmt(stats.outputChars)}`)}  ${highlight(`(${percent(stats.charReductionPct)} saved)`)}`,
    `${statLabel("Tokens   ")}${statValue(`${fmt(stats.inputTokensEstimate)} \u2192 ${fmt(stats.outputTokensEstimate)}`)}  ${highlight(`(${percent(stats.tokenReductionPct)} saved)`)}`,
  ]);
}

function renderSession(session: {
  today: { runs: number; tokensSaved: number };
  lifetime: { runs: number; tokensSaved: number };
}): string {
  return renderSection("Session", [
    `${statLabel("Today:    ")}${statValue(`${fmt(session.today.runs)} runs \u00b7 ${fmt(session.today.tokensSaved)} tokens saved`)}`,
    `${statLabel("Lifetime: ")}${statValue(`${fmt(session.lifetime.runs)} runs \u00b7 ${fmt(session.lifetime.tokensSaved)} tokens saved`)}`,
  ]);
}

function renderPreview(markdown: string): string {
  return renderSection("Preview", previewLines(markdown));
}

function renderSummary(
  markdown: string,
  stats: ContentStats,
  session: {
    available: boolean;
    statsPath: string;
    today: { runs: number; tokensSaved: number };
    lifetime: { runs: number; tokensSaved: number };
  },
): void {
  const lines = [
    "",
    bold(success("\u2713 Markdown copied to clipboard")),
    "",
    renderStats(stats),
    "",
    renderSession(session),
    "",
    renderPreview(markdown),
    "",
    muted(`Tracking: ${session.available ? session.statsPath : "unavailable"}`),
    "",
  ];
  process.stdout.write(lines.join("\n"));
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

  printIntro(options.mode, options.aggressive);
  const html = await waitForClipboardContent();

  if (!html.trim()) {
    throw new Error("No HTML was provided in clipboard.");
  }

  // Processing indicator
  process.stdout.write(`\n${accent("\u25d0 Processing...")}\n`);

  const transformOptions = defaultTransformOptions(options.aggressive);
  const processed = processHtml(options.mode, html, transformOptions);

  await copyToClipboard(processed.markdown);
  const session = await recordRunStats(processed.stats);

  // Clear processing line and show results
  clearLine();
  renderSummary(processed.markdown, processed.stats, session);
}
