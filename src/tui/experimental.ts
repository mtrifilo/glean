import { detectFormat } from "../lib/contentDetect";
import { convertRtfToHtml } from "../lib/convert";
import { copyToClipboard, readClipboardRtf, readClipboardText } from "../lib/io";
import { recordRunStats } from "../lib/sessionStats";
import type { StatsMode, TransformOptions } from "../lib/types";
import { processHtml, type ProcessResult } from "../pipeline/processHtml";

interface TuiRunOptions {
  mode: StatsMode;
  aggressive: boolean;
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

function previewLines(markdown: string, limit = 20): string[] {
  const lines = markdown.trim() ? markdown.trim().split("\n") : ["(empty output)"];
  if (lines.length <= limit) {
    return lines;
  }

  return [...lines.slice(0, limit), "..."];
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
    const { createCliRenderer, Box, Text, TextAttributes } = await import("@opentui/core");
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

    const renderResultsScreen = (
      processed: ProcessResult,
      session: { today: { runs: number; tokensSaved: number }; lifetime: { runs: number; tokensSaved: number } },
    ) => {
      clearScreen();
      const stats = processed.stats;

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
          // Output preview
          Text({
            content: "Output preview:",
            fg: MUTED,
            flexShrink: 0,
          }),
          Text({
            content: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
            fg: MUTED,
            flexShrink: 0,
          }),
          // Preview container: fills remaining space, clips overflow
          Box(
            {
              flexGrow: 1,
              flexShrink: 1,
              overflow: "hidden" as const,
              minHeight: 1,
            },
            Text({
              content: previewLines(processed.markdown).join("\n"),
              wrapMode: "word",
            }),
          ),
          // Footer pinned at bottom
          Text({
            content: "Press q, Enter, or Esc to exit",
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
