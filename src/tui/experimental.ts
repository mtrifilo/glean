import { detectFormat } from "../lib/contentDetect";
import { convertRtfToHtml } from "../lib/convert";
import { isValidUrl, fetchUrl } from "../lib/fetchUrl";

import { copyToClipboard, readClipboardRtf, readClipboardText } from "../lib/io";
import { recordRunStats } from "../lib/sessionStats";
import type { StatsMode, TransformOptions } from "../lib/types";
import { processHtml, type ProcessResult } from "../pipeline/processHtml";
import { parseMarkdownSections } from "../pipeline/tokenBudget";
import { estimateTokens } from "../pipeline/stats";
import { runSectionPicker, splitIntoParagraphs } from "./sectionPicker";
import { buildFenceStateMap, colorLineRich, COLORS, shortcutBar } from "./tuiHighlight";
import { normalizePastedPath, isSupportedFile, readAndConvertFile } from "./tuiFileDrop";

const { ACCENT, SUCCESS, MUTED, STAT_LABEL, STAT_VALUE, HIGHLIGHT } = COLORS;

interface TuiRunOptions {
  mode: StatsMode;
  aggressive: boolean;
  maxTokens?: number;
}

type ResultsAction = "quit" | "continue" | "reprocess";

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

/** Simple hash for duplicate clipboard detection. */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
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

    // Mutable options for continuous mode
    let mode: StatsMode = options.mode;
    let aggressive = options.aggressive;
    let lastInputHash = 0;

    const configLine = () =>
      Box(
        { flexDirection: "row" as const, flexShrink: 0 },
        Text({ content: "Mode: ", fg: MUTED }),
        Text({ content: mode, fg: STAT_VALUE, attributes: BOLD }),
        Text({ content: "    " }),
        Text({ content: "Aggressive: ", fg: MUTED }),
        Text({ content: aggressive ? "on" : "off", fg: STAT_VALUE, attributes: BOLD }),
        ...(options.maxTokens != null
          ? [
              Text({ content: "    " }),
              Text({ content: "Budget: ", fg: MUTED }),
              Text({ content: `${options.maxTokens.toLocaleString()} tokens`, fg: STAT_VALUE, attributes: BOLD }),
            ]
          : []),
      );

    const renderWaitingScreen = (spinChar: string) => {
      clearScreen();
      renderer.root.add(
        Box(
          outerBox,
          configLine(),
          Text({ content: " " }),
          Text({
            content: `${spinChar} Waiting for input...`,
            fg: ACCENT,
            attributes: BOLD,
          }),
          Text({
            content: "Copy content or a URL, or drag a file here",
            fg: MUTED,
          }),
          Text({
            content: "and this screen will auto-process it.",
            fg: MUTED,
          }),
          Box({ flexGrow: 1 }),
          shortcutBar(
            [{ key: "Ctrl+C", label: "cancel" }],
            Box,
            Text,
          ),
        ),
      );
      renderer.requestRender();
    };

    const renderProcessingScreen = (label?: string) => {
      clearScreen();
      renderer.root.add(
        Box(
          outerBox,
          Text({ content: " " }),
          Text({
            content: label ?? "Processing...",
            fg: ACCENT,
          }),
          Text({ content: " " }),
        ),
      );
      renderer.requestRender();
    };

    const renderFetchingScreen = (url: string) => {
      clearScreen();
      renderer.root.add(
        Box(
          outerBox,
          Text({ content: " " }),
          Text({
            content: `Fetching ${url}...`,
            fg: ACCENT,
            attributes: BOLD,
          }),
          Text({ content: " " }),
        ),
      );
      renderer.requestRender();
    };

    const allPreviewLines = (markdown: string) =>
      markdown.trim() ? markdown.trim().split("\n") : ["(empty output)"];

    // --- Results screen with windowed scroll and rich highlighting ---

    const waitForResultsAction = (
      processed: ProcessResult,
      session: { today: { runs: number; tokensSaved: number }; lifetime: { runs: number; tokensSaved: number } },
    ): Promise<ResultsAction> => {
      const lines = allPreviewLines(processed.markdown);
      const fenceState = buildFenceStateMap(lines);
      const stats = processed.stats;

      // Windowed scroll state
      // Chrome: outer border(2) + padding(2) + success(1) + space(1) + stats box(~6) + space(1) + session box(~4) + space(1) + preview border(2) + shortcut bar(1) = ~21
      const CHROME_LINES = 21;
      const visibleRows = Math.max(3, renderer.height - CHROME_LINES);
      let scrollOffset = 0;

      const adjustScroll = () => {
        const maxOffset = Math.max(0, lines.length - visibleRows);
        scrollOffset = Math.max(0, Math.min(scrollOffset, maxOffset));
      };

      const renderResults = () => {
        clearScreen();
        adjustScroll();

        const windowedLines = lines.slice(scrollOffset, scrollOffset + visibleRows);
        const previewNodes: any[] = [];
        for (let i = 0; i < visibleRows; i++) {
          if (i < windowedLines.length) {
            const lineIdx = scrollOffset + i;
            const lineNodes = colorLineRich(windowedLines[i], fenceState[lineIdx], Text, TextAttributes);
            previewNodes.push(
              Box(
                { flexDirection: "row" as const, flexShrink: 0, height: 1 },
                ...lineNodes,
              ),
            );
          } else {
            // Pad with empty rows to keep preview height stable
            previewNodes.push(
              Box({ flexShrink: 0, height: 1 }),
            );
          }
        }

        // Scroll indicator
        const scrollPct = lines.length <= visibleRows
          ? ""
          : ` (${Math.round((scrollOffset / Math.max(1, lines.length - visibleRows)) * 100)}%)`;
        const previewTitle = `Output preview [${lines.length} lines]${scrollPct}`;

        renderer.root.add(
          Box(
            outerBox,
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
            // Windowed output preview
            Box(
              {
                border: true,
                borderStyle: "rounded" as const,
                borderColor: MUTED,
                title: previewTitle,
                titleAlignment: "left" as const,
                flexDirection: "column" as const,
                flexGrow: 1,
                flexShrink: 1,
                minHeight: 3,
                overflow: "hidden" as const,
                onMouseScroll: (event: { scroll?: { direction: string } }) => {
                  if (!event.scroll) return;
                  const maxOffset = Math.max(0, lines.length - visibleRows);
                  if (event.scroll.direction === "up") {
                    scrollOffset = Math.max(0, scrollOffset - 3);
                  } else if (event.scroll.direction === "down") {
                    scrollOffset = Math.min(maxOffset, scrollOffset + 3);
                  }
                  renderResults();
                },
              },
              ...previewNodes,
            ),
            // Shortcut bar
            shortcutBar(
              [
                { key: "j/k", label: "scroll" },
                { key: "a", label: "aggressive" },
                { key: "m", label: "mode" },
                { key: "c", label: "continue" },
                { key: "q", label: "quit" },
              ],
              Box,
              Text,
            ),
          ),
        );
        renderer.requestRender();
      };

      return new Promise<ResultsAction>((resolve) => {
        renderResults();

        const handler = (event: { name?: string }) => {
          const key = (event.name ?? "").toLowerCase();

          switch (key) {
            case "up":
            case "k":
              scrollOffset = Math.max(0, scrollOffset - 1);
              renderResults();
              return;
            case "down":
            case "j":
              scrollOffset = Math.min(Math.max(0, lines.length - visibleRows), scrollOffset + 1);
              renderResults();
              return;
            case "pageup":
              scrollOffset = Math.max(0, scrollOffset - visibleRows);
              renderResults();
              return;
            case "pagedown":
              scrollOffset = Math.min(Math.max(0, lines.length - visibleRows), scrollOffset + visibleRows);
              renderResults();
              return;
            case "home":
              scrollOffset = 0;
              renderResults();
              return;
            case "end":
              scrollOffset = Math.max(0, lines.length - visibleRows);
              renderResults();
              return;
            case "a":
              renderer.keyInput.off("keypress", handler);
              aggressive = !aggressive;
              resolve("reprocess");
              return;
            case "m":
              renderer.keyInput.off("keypress", handler);
              mode = mode === "clean" ? "extract" : "clean";
              resolve("reprocess");
              return;
            case "c":
              renderer.keyInput.off("keypress", handler);
              resolve("continue");
              return;
            case "q":
            case "escape":
            case "return":
            case "enter":
              renderer.keyInput.off("keypress", handler);
              resolve("quit");
              return;
          }
        };

        renderer.keyInput.on("keypress", handler);
      });
    };

    // --- Main loop ---

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const spinner = ["\u25d0", "\u25d3", "\u25d1", "\u25d2"];
        let spin = 0;
        let clipboardHtml = "";
        let sourceLabel: string | undefined;

        // Set up paste listener for drag-and-drop file paths
        let pastedFilePath: string | null = null;
        const pasteHandler = (event: { text: string; preventDefault?: () => void }) => {
          const normalized = normalizePastedPath(event.text);
          if (normalized && isSupportedFile(normalized)) {
            pastedFilePath = normalized;
            event.preventDefault?.();
          }
        };
        renderer.keyInput.on("paste", pasteHandler);

        while (!clipboardHtml && !pastedFilePath) {
          const text = await readClipboardText();
          if (text) {
            const trimmed = text.trim();
            const hash = simpleHash(trimmed);

            // Skip if same content as last run (duplicate detection)
            if (hash !== lastInputHash) {
              const format = detectFormat(text);
              if (format === "html") {
                clipboardHtml = text;
                lastInputHash = hash;
                break;
              }
              if (format === "rtf") {
                clipboardHtml = await convertRtfToHtml(text);
                lastInputHash = hash;
                break;
              }

              // URL detection
              if (isValidUrl(trimmed)) {
                lastInputHash = hash;
                renderFetchingScreen(trimmed);
                try {
                  const result = await fetchUrl(trimmed);
                  clipboardHtml = result.html;
                  sourceLabel = `Fetched: ${trimmed}`;
                } catch (err) {
                  // Fetch failed — show error briefly and continue polling
                  clearScreen();
                  renderer.root.add(
                    Box(
                      outerBox,
                      Text({ content: `Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}`, fg: COLORS.OVER_BUDGET }),
                      Text({ content: "Continuing to wait for input...", fg: MUTED }),
                    ),
                  );
                  renderer.requestRender();
                  await Bun.sleep(2000);
                }
                if (clipboardHtml) break;
              }
            }

            const rtf = await readClipboardRtf();
            if (rtf) {
              const rtfHash = simpleHash(rtf);
              if (rtfHash !== lastInputHash) {
                const rtfFormat = detectFormat(rtf);
                if (rtfFormat === "rtf") {
                  clipboardHtml = await convertRtfToHtml(rtf);
                  lastInputHash = rtfHash;
                  break;
                }
              }
            }
          }

          renderWaitingScreen(spinner[spin % spinner.length]);
          spin += 1;
          await Bun.sleep(500);
        }

        renderer.keyInput.off("paste", pasteHandler);

        // Handle file drop
        if (pastedFilePath && !clipboardHtml) {
          sourceLabel = `File: ${pastedFilePath}`;
          renderProcessingScreen(`Processing ${pastedFilePath}...`);
          try {
            clipboardHtml = await readAndConvertFile(pastedFilePath);
            lastInputHash = simpleHash(clipboardHtml);
          } catch (err) {
            clearScreen();
            renderer.root.add(
              Box(
                outerBox,
                Text({ content: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`, fg: COLORS.OVER_BUDGET }),
                Text({ content: "Continuing to wait for input...", fg: MUTED }),
              ),
            );
            renderer.requestRender();
            await Bun.sleep(2000);
            continue; // Back to waiting loop
          }
        }

        if (!clipboardHtml) continue;

        // Inner loop: process → results → reprocess (or break out)
        let action: ResultsAction = "reprocess";
        while (action === "reprocess") {
          renderProcessingScreen(sourceLabel ? `Processing... (${sourceLabel})` : undefined);
          sourceLabel = undefined; // only show source on first pass

          const transformOptions = defaultTransformOptions(aggressive);
          const processed = processHtml(mode, clipboardHtml, transformOptions);

          // Section picker: if maxTokens set and >= 2 sections, let user choose
          let finalMarkdown = processed.markdown;
          if (options.maxTokens != null) {
            let sections = parseMarkdownSections(processed.markdown);
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
            }
          }

          processed.markdown = finalMarkdown;

          await copyToClipboard(processed.markdown);
          const session = await recordRunStats(processed.stats);

          action = await waitForResultsAction(processed, session);
        }

        if (action === "quit") {
          break;
        }

        // "continue" → back to waiting loop
      }
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
