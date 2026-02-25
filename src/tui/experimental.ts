import { detectFormat } from "../lib/contentDetect";
import { convertRtfToHtml } from "../lib/convert";

import { copyToClipboard, readClipboardRtf, readClipboardText } from "../lib/io";
import { recordRunStats } from "../lib/sessionStats";
import type { StatsMode, TransformOptions } from "../lib/types";
import { processHtml, type ProcessResult } from "../pipeline/processHtml";
import { parseMarkdownSections } from "../pipeline/tokenBudget";
import { estimateTokens } from "../pipeline/stats";
import { runSectionPicker, splitIntoParagraphs } from "./sectionPicker";

interface TuiRunOptions {
  mode: StatsMode;
  aggressive: boolean;
  maxTokens?: number;
}

// Color palette
const ACCENT = "#7dd3fc";
const SUCCESS = "#4ade80";
const MUTED = "#6b7280";
const STAT_LABEL = "#94a3b8";
const STAT_VALUE = "#f1f5f9";
const HIGHLIGHT = "#fbbf24";

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

function fmt(n: number): string {
  return n.toLocaleString();
}

async function waitForExitKey(renderer: { keyInput: any }): Promise<void> {
  await new Promise<void>((resolve) => {
    const handler = (event: { name?: string }) => {
      const key = (event.name ?? "").toLowerCase();
      if (key === "q" || key === "escape" || key === "return" || key === "enter") {
        renderer.keyInput.off("keypress", handler);
        resolve();
      }
    };

    renderer.keyInput.on("keypress", handler);
  });
}

export async function runExperimentalTui(options: TuiRunOptions): Promise<boolean> {
  try {
    const { createCliRenderer, Box, Text, ScrollBox, TextAttributes } = await import("@opentui/core");
    const renderer = await createCliRenderer({
      exitOnCtrlC: true,
      useAlternateScreen: true,
    });

    const BOLD = TextAttributes.BOLD;

    const clearScreen = () => {
      const children = renderer.root.getChildren();
      for (const child of children) {
        renderer.root.remove(child.id);
      }
    };

    const outerBox = {
      border: true,
      borderStyle: "rounded" as const,
      borderColor: MUTED,
      padding: 1,
      width: "100%" as const,
      height: "100%" as const,
      flexDirection: "column" as const,
      title: "decant",
      titleAlignment: "left" as const,
    };

    const innerBox = (title: string) => ({
      border: true,
      borderStyle: "rounded" as const,
      borderColor: MUTED,
      title,
      titleAlignment: "left" as const,
      flexDirection: "column" as const,
      padding: 1,
      width: "100%" as const,
      flexShrink: 0,
    });

    const renderWaitingScreen = (spinChar: string) => {
      clearScreen();
      renderer.root.add(
        Box(
          outerBox,
          // Config line: dim labels, bright values
          Box(
            { flexDirection: "row" as const, flexShrink: 0 },
            Text({ content: "Mode: ", fg: MUTED }),
            Text({ content: options.mode, fg: STAT_VALUE, attributes: BOLD }),
            Text({ content: "    " }),
            Text({ content: "Aggressive: ", fg: MUTED }),
            Text({ content: options.aggressive ? "on" : "off", fg: STAT_VALUE, attributes: BOLD }),
            ...(options.maxTokens != null
              ? [
                  Text({ content: "    " }),
                  Text({ content: "Budget: ", fg: MUTED }),
                  Text({ content: `${options.maxTokens.toLocaleString()} tokens`, fg: STAT_VALUE, attributes: BOLD }),
                ]
              : []),
          ),
          Text({ content: " " }),
          // Spinner line: accent + bold
          Text({
            content: `${spinChar} Waiting for HTML in clipboard...`,
            fg: ACCENT,
            attributes: BOLD,
          }),
          // Helper text
          Text({
            content: "Copy HTML, RTF, or Word content",
            fg: MUTED,
          }),
          Text({
            content: "and this screen will auto-process it.",
            fg: MUTED,
          }),
          // Spacer pushes footer to bottom
          Box({ flexGrow: 1 }),
          // Footer hint
          Text({
            content: "Ctrl+C to cancel",
            fg: MUTED,
          }),
        ),
      );
      renderer.requestRender();
    };

    const renderProcessingScreen = () => {
      clearScreen();
      renderer.root.add(
        Box(
          outerBox,
          Text({ content: " " }),
          Text({
            content: "Processing HTML...",
            fg: ACCENT,
          }),
          Text({ content: " " }),
        ),
      );
      renderer.requestRender();
    };

    const allPreviewLines = (markdown: string) =>
      markdown.trim() ? markdown.trim().split("\n") : ["(empty output)"];

    const colorLine = (line: string) => {
      if (/^#{1,6}\s+/.test(line)) return Text({ content: line, fg: ACCENT, flexShrink: 0 });
      if (/^```/.test(line)) return Text({ content: line, fg: MUTED, flexShrink: 0 });
      if (/^>/.test(line)) return Text({ content: line, fg: MUTED, flexShrink: 0 });
      if (/^---$/.test(line) || /^\*\*\*$/.test(line)) return Text({ content: line, fg: MUTED, flexShrink: 0 });
      return Text({ content: line, fg: STAT_VALUE, flexShrink: 0 });
    };

    const renderResultsScreen = (
      processed: ProcessResult,
      session: { today: { runs: number; tokensSaved: number }; lifetime: { runs: number; tokensSaved: number } },
    ) => {
      clearScreen();
      const stats = processed.stats;
      const lines = allPreviewLines(processed.markdown);

      renderer.root.add(
        Box(
          outerBox,
          // Success line
          Text({
            content: "\u2713 Markdown copied to clipboard",
            fg: SUCCESS,
            attributes: BOLD,
          }),
          Text({ content: " " }),
          // Stats box
          Box(
            innerBox("Stats"),
            Box(
              { flexDirection: "row" as const, flexShrink: 0 },
              Text({ content: "Chars    ", fg: STAT_LABEL }),
              Text({ content: `${fmt(stats.inputChars)} \u2192 ${fmt(stats.outputChars)}  `, fg: STAT_VALUE }),
              Text({ content: `(${percent(stats.charReductionPct)} saved)`, fg: HIGHLIGHT }),
            ),
            Box(
              { flexDirection: "row" as const, flexShrink: 0 },
              Text({ content: "Tokens   ", fg: STAT_LABEL }),
              Text({ content: `${fmt(stats.inputTokensEstimate)} \u2192 ${fmt(stats.outputTokensEstimate)}  `, fg: STAT_VALUE }),
              Text({ content: `(${percent(stats.tokenReductionPct)} saved)`, fg: HIGHLIGHT }),
            ),
          ),
          Text({ content: " " }),
          // Session box
          Box(
            innerBox("Session"),
            Box(
              { flexDirection: "row" as const, flexShrink: 0 },
              Text({ content: "Today: ", fg: STAT_LABEL }),
              Text({ content: `${fmt(session.today.runs)} runs \u00b7 ${fmt(session.today.tokensSaved)} tokens saved`, fg: STAT_VALUE }),
            ),
            Box(
              { flexDirection: "row" as const, flexShrink: 0 },
              Text({ content: "Lifetime: ", fg: STAT_LABEL }),
              Text({ content: `${fmt(session.lifetime.runs)} runs \u00b7 ${fmt(session.lifetime.tokensSaved)} tokens saved`, fg: STAT_VALUE }),
            ),
          ),
          Text({ content: " " }),
          // Scrollable output preview
          ScrollBox(
            {
              border: true,
              borderStyle: "rounded" as const,
              borderColor: MUTED,
              title: "Output preview",
              titleAlignment: "left" as const,
              scrollY: true,
              viewportCulling: true,
              contentOptions: {
                flexDirection: "column" as const,
              },
              flexGrow: 1,
              flexShrink: 1,
              minHeight: 3,
            },
            ...lines.map(colorLine),
          ),
          // Footer pinned at bottom
          Text({
            content: "Scroll: \u2191\u2193/mouse  \u00b7  q/Enter/Esc exit",
            fg: MUTED,
            flexShrink: 0,
          }),
        ),
      );
      renderer.requestRender();
    };

    try {
      const spinner = ["\u25d0", "\u25d3", "\u25d1", "\u25d2"];
      let spin = 0;
      let clipboardHtml = "";

      while (!clipboardHtml) {
        const text = await readClipboardText();
        if (text) {
          const format = detectFormat(text);
          if (format === "html") {
            clipboardHtml = text;
            break;
          }
          if (format === "rtf") {
            clipboardHtml = await convertRtfToHtml(text);
            break;
          }
        }

        const rtf = await readClipboardRtf();
        if (rtf) {
          const format = detectFormat(rtf);
          if (format === "rtf") {
            clipboardHtml = await convertRtfToHtml(rtf);
            break;
          }
        }

        renderWaitingScreen(spinner[spin % spinner.length]);
        spin += 1;
        await Bun.sleep(500);
      }

      renderProcessingScreen();

      const transformOptions = defaultTransformOptions(options.aggressive);
      const processed = processHtml(options.mode, clipboardHtml, transformOptions);

      // Section picker: if maxTokens set and >= 2 sections, let user choose
      let finalMarkdown = processed.markdown;
      if (options.maxTokens != null) {
        let sections = parseMarkdownSections(processed.markdown);
        // Fall back to paragraph splitting for single-section docs
        if (sections.length < 2) {
          const paragraphs = splitIntoParagraphs(processed.markdown);
          if (paragraphs.length >= 2) {
            sections = paragraphs;
          }
        }
        if (sections.length >= 2) {
          const pickerResult = await runSectionPicker({
            sections,
            maxTokens: options.maxTokens,
            renderer,
            Box,
            Text,
            ScrollBox,
            TextAttributes,
          });

          if (!pickerResult.canceled) {
            finalMarkdown = pickerResult.selectedSections.map((s) => s.content).join("\n");
            // Recompute output stats for filtered content
            processed.stats.outputChars = finalMarkdown.length;
            processed.stats.outputTokensEstimate = estimateTokens(finalMarkdown);
            processed.stats.charReduction = processed.stats.inputChars - processed.stats.outputChars;
            processed.stats.charReductionPct =
              processed.stats.inputChars === 0
                ? 0
                : Math.round(((processed.stats.inputChars - processed.stats.outputChars) / processed.stats.inputChars) * 10000) / 100;
            processed.stats.tokenReduction = processed.stats.inputTokensEstimate - processed.stats.outputTokensEstimate;
            processed.stats.tokenReductionPct =
              processed.stats.inputTokensEstimate === 0
                ? 0
                : Math.round(((processed.stats.inputTokensEstimate - processed.stats.outputTokensEstimate) / processed.stats.inputTokensEstimate) * 10000) / 100;
          }
          // If canceled, finalMarkdown stays as full processed.markdown
        }
      }

      // Update processed.markdown reference for results screen
      processed.markdown = finalMarkdown;

      await copyToClipboard(processed.markdown);
      const session = await recordRunStats(processed.stats);

      renderResultsScreen(processed, session);

      await waitForExitKey(renderer);
    } finally {
      renderer.destroy();
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown TUI failure.";
    process.stderr.write(`OpenTUI mode failed: ${message}\n`);
    return false;
  }
}
