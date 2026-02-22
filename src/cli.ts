#!/usr/bin/env bun

import { Command, InvalidArgumentError } from "commander";
import { version } from "../package.json";
import { runUpdate } from "./commands/update";
import { runInteractive } from "./interactive/runInteractive";
import { detectFormat } from "./lib/contentDetect";
import { convertDocToHtml, convertRtfToHtml } from "./lib/convert";
import { copyToClipboard, readInput } from "./lib/io";
import { recordRunStats } from "./lib/sessionStats";
import type { StatsFormat, StatsMode, TransformOptions } from "./lib/types";
import { processHtml } from "./pipeline/processHtml";
import { formatStatsMarkdown } from "./pipeline/stats";

interface CommonOptions {
  input?: string;
  copy?: boolean;
  keepLinks?: boolean;
  stripLinks?: boolean;
  keepImages?: boolean;
  stripImages?: boolean;
  preserveTables?: boolean;
  maxHeadingLevel?: number;
  aggressive?: boolean;
}

interface StatsOptions extends CommonOptions {
  mode?: StatsMode;
  format?: StatsFormat;
}

interface RootOptions {
  tui?: boolean;
  mode?: StatsMode;
  aggressive?: boolean;
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

function parseStatsFormat(value: string): StatsFormat {
  if (value === "md" || value === "json") {
    return value;
  }
  throw new InvalidArgumentError("Format must be one of: md, json.");
}

function addCommonOptions(command: Command): Command {
  return command
    .option("-i, --input <path>", "Read HTML input from a file path")
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
    .option("--aggressive", "Apply stronger pruning heuristics");
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

async function resolveHtmlInput(inputPath?: string): Promise<string> {
  if (inputPath && /\.doc$/i.test(inputPath)) {
    return convertDocToHtml(inputPath);
  }

  const input = await readInput(inputPath);
  if (!input.trim()) {
    throw new Error("Input is empty.");
  }

  const format = detectFormat(input);
  if (format === "rtf") {
    return convertRtfToHtml(input);
  }

  return input;
}

async function runTransform(commandName: "clean" | "extract", options: CommonOptions) {
  const html = await resolveHtmlInput(options.input);

  const transformOptions = resolveTransformOptions(options);
  const processed = processHtml(commandName, html, transformOptions);

  await maybeCopyOutput(options.copy, processed.markdown);
  await recordRunStats(processed.stats);
  writeStdout(processed.markdown);
}

async function runStats(options: StatsOptions) {
  const html = await resolveHtmlInput(options.input);

  const mode = options.mode ?? "clean";
  const format = options.format ?? "md";
  const transformOptions = resolveTransformOptions(options);

  const processed = processHtml(mode, html, transformOptions);

  const output =
    format === "json"
      ? JSON.stringify(processed.stats, null, 2)
      : formatStatsMarkdown(processed.stats);

  await maybeCopyOutput(options.copy, output);
  writeStdout(output);
}

const program = new Command();

program
  .name("glean")
  .description("Clean noisy HTML and convert it into markdown context.")
  .version(version, "-V, --version")
  .option(
    "--mode <mode>",
    "Default pipeline for no-subcommand runs: clean or extract",
    parseTransformMode,
    "clean",
  )
  .option("--aggressive", "Apply stronger pruning heuristics for no-subcommand runs")
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
  .description("Update glean to the latest version.")
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
    });
    return;
  }

  await runTransform(mode, { aggressive });
});

try {
  await program.parseAsync();
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unexpected failure while running glean.";
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
