#!/usr/bin/env bun

import { Command, InvalidArgumentError } from "commander";
import { version } from "../package.json";
import { runUpdate } from "./commands/update";
import { runInteractive } from "./interactive/runInteractive";
import { detectFormat } from "./lib/contentDetect";
import { convertDocToHtml, convertDocxToHtml, convertPdfToHtml, convertRtfToHtml } from "./lib/convert";
import { copyToClipboard, readInput, readInputBytes } from "./lib/io";
import { recordRunStats } from "./lib/sessionStats";
import type { StatsFormat, StatsMode, TransformOptions } from "./lib/types";
import { fetchUrl, isValidUrl } from "./lib/fetchUrl";
import { processHtml } from "./pipeline/processHtml";
import { type SourceInfo, formatStatsMarkdown } from "./pipeline/stats";
import {
  buildSectionBreakdown,
  formatSectionBreakdown,
  formatTokenBudgetError,
  formatTokenBudgetWarning,
  parseMarkdownSections,
  truncateToTokenBudget,
} from "./pipeline/tokenBudget";

interface CommonOptions {
  input?: string;
  url?: string;
  copy?: boolean;
  keepLinks?: boolean;
  stripLinks?: boolean;
  keepImages?: boolean;
  stripImages?: boolean;
  preserveTables?: boolean;
  maxHeadingLevel?: number;
  aggressive?: boolean;
  verbose?: boolean;
  maxTokens?: number;
}

interface StatsOptions extends CommonOptions {
  mode?: StatsMode;
  format?: StatsFormat;
}

interface RootOptions {
  tui?: boolean;
  mode?: StatsMode;
  aggressive?: boolean;
  maxTokens?: number;
}

function parseHeadingLevel(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 6) {
    throw new InvalidArgumentError("Heading level must be an integer from 1 to 6.");
  }
  return parsed;
}

function parseStatsMode(value: string): StatsMode {
  if (value === "clean" || value === "extract") {
    return value;
  }
  throw new InvalidArgumentError("Mode must be one of: clean, extract.");
}

function parseTransformMode(value: string): StatsMode {
  if (value === "clean" || value === "extract") {
    return value;
  }
  throw new InvalidArgumentError("Mode must be one of: clean, extract.");
}

function parseMaxTokens(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new InvalidArgumentError("--max-tokens must be a positive integer.");
  }
  return parsed;
}

function parseStatsFormat(value: string): StatsFormat {
  if (value === "md" || value === "json") {
    return value;
  }
  throw new InvalidArgumentError("Format must be one of: md, json.");
}

function addCommonOptions(command: Command): Command {
  return command
    .option("-i, --input <path>", "Read input from a file path (HTML, RTF, DOC, DOCX, or PDF)")
    .option("-u, --url <url>", "Fetch and convert a web page URL")
    .option("--copy", "Copy command output to the macOS clipboard")
    .option("--keep-links", "Preserve markdown links (default behavior)")
    .option("--strip-links", "Strip links and keep only their text")
    .option("--keep-images", "Preserve images in markdown output")
    .option("--strip-images", "Strip images from markdown output")
    .option("--no-preserve-tables", "Remove tables for smaller output")
    .option(
      "--max-heading-level <n>",
      "Maximum heading depth to keep in output (1-6)",
      parseHeadingLevel,
      6,
    )
    .option("--aggressive", "Apply stronger pruning heuristics")
    .option("--verbose", "Show conversion warnings (e.g. from DOCX processing)")
    .option("--max-tokens <n>", "Maximum token budget for output (truncates if exceeded)", parseMaxTokens);
}

function resolveTransformOptions(options: CommonOptions): TransformOptions {
  const keepLinks = options.stripLinks ? false : true;
  const keepImages = options.stripImages ? false : Boolean(options.keepImages);
  const preserveTables = options.preserveTables ?? true;
  const maxHeadingLevel = options.maxHeadingLevel ?? 6;
  const aggressive = Boolean(options.aggressive);

  return {
    keepLinks,
    keepImages,
    preserveTables,
    maxHeadingLevel,
    aggressive,
  };
}

function writeStdout(text: string): void {
  const output = text.endsWith("\n") ? text : `${text}\n`;
  process.stdout.write(output);
}

async function maybeCopyOutput(copy: boolean | undefined, text: string): Promise<void> {
  if (!copy) {
    return;
  }

  await copyToClipboard(text);

  if (process.stderr.isTTY) {
    process.stderr.write("Output copied to clipboard.\n");
  }
}

interface ResolvedInput {
  html: string;
  source: SourceInfo;
}

async function resolveHtmlInput(
  inputPath?: string,
  options?: { verbose?: boolean; url?: string },
): Promise<ResolvedInput> {
  if (inputPath && options?.url) {
    throw new Error("Cannot use --input and --url together. Provide one or the other.");
  }

  if (options?.url) {
    const result = await fetchUrl(options.url, { verbose: options.verbose });
    return { html: result.html, source: { sourceFormat: "url", sourceChars: result.html.length } };
  }

  if (inputPath && /\.pdf$/i.test(inputPath)) {
    const bytes = await readInputBytes(inputPath);
    const sourceChars = bytes.length;
    const html = await convertPdfToHtml(bytes, { verbose: options?.verbose });
    return { html, source: { sourceFormat: "pdf", sourceChars } };
  }

  if (inputPath && /\.docx$/i.test(inputPath)) {
    const bytes = await readInputBytes(inputPath);
    const html = await convertDocxToHtml(bytes, { verbose: options?.verbose });
    return { html, source: { sourceFormat: "docx", sourceChars: bytes.length } };
  }

  if (inputPath && /\.doc$/i.test(inputPath)) {
    const html = await convertDocToHtml(inputPath);
    return { html, source: { sourceFormat: "doc" } };
  }

  const input = await readInput(inputPath);
  if (!input.trim()) {
    throw new Error("Input is empty.");
  }

  const format = detectFormat(input);
  if (format === "rtf") {
    const html = await convertRtfToHtml(input);
    return { html, source: { sourceFormat: "rtf", sourceChars: input.length } };
  }

  return { html: input, source: {} };
}

async function runTransform(commandName: "clean" | "extract", options: CommonOptions) {
  const { html, source } = await resolveHtmlInput(options.input, { verbose: options.verbose, url: options.url });

  const transformOptions = resolveTransformOptions(options);
  const processed = processHtml(commandName, html, transformOptions, source);

  if (options.maxTokens != null) {
    const sections = parseMarkdownSections(processed.markdown);
    const breakdown = buildSectionBreakdown(sections, options.maxTokens);

    if (breakdown.overBudget) {
      if (!process.stdout.isTTY) {
        process.stderr.write(`${formatTokenBudgetError(breakdown)}\n`);
        process.exit(1);
      }

      const truncation = truncateToTokenBudget(sections, options.maxTokens);
      process.stderr.write(`${formatTokenBudgetWarning(breakdown, truncation)}\n`);
      await maybeCopyOutput(options.copy, truncation.markdown);
      await recordRunStats(processed.stats);
      writeStdout(truncation.markdown);
      return;
    }
  }

  await maybeCopyOutput(options.copy, processed.markdown);
  await recordRunStats(processed.stats);
  writeStdout(processed.markdown);
}

async function runStats(options: StatsOptions) {
  const { html, source } = await resolveHtmlInput(options.input, { verbose: options.verbose, url: options.url });

  const mode = options.mode ?? "clean";
  const format = options.format ?? "md";
  const transformOptions = resolveTransformOptions(options);

  const processed = processHtml(mode, html, transformOptions, source);

  if (options.maxTokens != null) {
    const sections = parseMarkdownSections(processed.markdown);
    const breakdown = buildSectionBreakdown(sections, options.maxTokens);

    processed.stats.sections = sections.map((s) => ({
      heading: s.heading,
      level: s.level,
      tokens: s.tokens,
    }));
    processed.stats.maxTokens = options.maxTokens;
    processed.stats.overBudget = breakdown.overBudget;
  }

  let output: string;
  if (format === "json") {
    output = JSON.stringify(processed.stats, null, 2);
  } else {
    output = formatStatsMarkdown(processed.stats);
    if (options.maxTokens != null) {
      const sections = parseMarkdownSections(processed.markdown);
      const breakdown = buildSectionBreakdown(sections, options.maxTokens);
      output += `\n\n${formatSectionBreakdown(breakdown)}`;
    }
  }

  await maybeCopyOutput(options.copy, output);
  writeStdout(output);
}

const program = new Command();

program
  .name("decant")
  .description("Clean noisy HTML and convert it into markdown context.")
  .version(version, "-V, --version")
  .enablePositionalOptions()
  .option(
    "--mode <mode>",
    "Default pipeline for no-subcommand runs: clean or extract",
    parseTransformMode,
    "clean",
  )
  .option("--aggressive", "Apply stronger pruning heuristics for no-subcommand runs")
  .option("--max-tokens <n>", "Maximum token budget for output (enables section picker in TUI)", parseMaxTokens)
  .option(
    "--tui",
    "Launch interactive mode and attempt experimental full-screen TUI first",
  )
  .showHelpAfterError();

addCommonOptions(
  program
    .command("clean")
    .description("Clean noisy HTML and output markdown.")
    .action(async function (this: Command) {
      await runTransform("clean", this.opts<CommonOptions>());
    }),
);

addCommonOptions(
  program
    .command("extract")
    .description("Readability-first extraction, then markdown conversion.")
    .action(async function (this: Command) {
      await runTransform("extract", this.opts<CommonOptions>());
    }),
);

addCommonOptions(
  program
    .command("stats")
    .description("Show input/output size and token estimate deltas.")
    .option(
      "--mode <mode>",
      "Pipeline used before stats output: clean or extract",
      parseStatsMode,
      "clean",
    )
    .option("--format <format>", "Output format: md or json", parseStatsFormat, "md")
    .action(async function (this: Command) {
      await runStats(this.opts<StatsOptions>());
    }),
);

program
  .command("update")
  .description("Update decant to the latest version.")
  .option("--force", "Reinstall even if already on the latest version")
  .action(async function (this: Command) {
    await runUpdate(this.opts<{ force?: boolean }>());
  });

program.action(async function (this: Command) {
  const options = this.opts<RootOptions>();
  const mode = options.mode ?? "clean";
  const aggressive = Boolean(options.aggressive);

  if (options.tui && !process.stdin.isTTY) {
    throw new Error("--tui requires an interactive terminal (TTY).");
  }

  const shouldRunInteractive = process.stdin.isTTY || Boolean(options.tui);

  if (shouldRunInteractive) {
    await runInteractive({
      forceTui: Boolean(options.tui),
      mode,
      aggressive,
      maxTokens: options.maxTokens,
    });
    return;
  }

  await runTransform(mode, { aggressive, maxTokens: options.maxTokens });
});

try {
  await program.parseAsync();
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unexpected failure while running decant.";
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
