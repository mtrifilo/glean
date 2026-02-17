import { copyToClipboard, readClipboardText } from "../lib/io";
import { recordRunStats } from "../lib/sessionStats";
import type { StatsMode, TransformOptions } from "../lib/types";
import { processHtml } from "../pipeline/processHtml";

interface TuiRunOptions {
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

function looksLikeHtml(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  if (/<[a-zA-Z][\w:-]*(\s[^>]*)?>/.test(value)) {
    return true;
  }

  return /&lt;[a-zA-Z][\w:-]*/.test(value);
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
    const { createCliRenderer, Box, Text } = await import("@opentui/core");
    const renderer = await createCliRenderer({
      exitOnCtrlC: true,
      useAlternateScreen: true,
    });

    const setScreen = (title: string, lines: string[]) => {
      const children = renderer.root.getChildren();
      for (const child of children) {
        renderer.root.remove(child.id);
      }

      renderer.root.add(
        Box(
          {
            border: true,
            borderStyle: "rounded",
            padding: 1,
            width: "100%",
            height: "100%",
            flexDirection: "column",
            gap: 1,
          },
          Text({ content: title, fg: "#7dd3fc", wrapMode: "word" }),
          Text({ content: lines.join("\n"), wrapMode: "word" }),
        ),
      );
      renderer.requestRender();
    };

    try {
      const spinner = ["|", "/", "-", "\\"];
      let spin = 0;
      let clipboardHtml = "";

      while (!clipboardHtml) {
        const clipboard = await readClipboardText();
        if (clipboard && looksLikeHtml(clipboard)) {
          clipboardHtml = clipboard;
          break;
        }

        setScreen("glean --tui", [
          `Mode: ${options.mode}`,
          `Aggressive pruning: ${options.aggressive ? "on" : "off"}`,
          "",
          `${spinner[spin % spinner.length]} Waiting for HTML in clipboard...`,
          "Copy HTML from Chrome DevTools and this screen will auto-process it.",
          "",
          "Press Ctrl+C to cancel.",
        ]);
        spin += 1;
        await Bun.sleep(500);
      }

      setScreen("glean --tui", [
        "HTML detected in clipboard.",
        "Processing and copying markdown...",
      ]);

      const transformOptions = defaultTransformOptions(options.aggressive);
      const processed = processHtml(options.mode, clipboardHtml, transformOptions);
      await copyToClipboard(processed.markdown);
      const session = await recordRunStats(processed.stats);

      setScreen("glean --tui", [
        "Processing complete. Markdown copied to clipboard.",
        "",
        "Current run stats:",
        `- input chars: ${processed.stats.inputChars}`,
        `- output chars: ${processed.stats.outputChars}`,
        `- chars saved: ${processed.stats.charReduction} (${percent(processed.stats.charReductionPct)})`,
        `- input tokens (est): ${processed.stats.inputTokensEstimate}`,
        `- output tokens (est): ${processed.stats.outputTokensEstimate}`,
        `- tokens saved: ${processed.stats.tokenReduction} (${percent(processed.stats.tokenReductionPct)})`,
        "",
        "Session stats:",
        `- today runs: ${session.today.runs}`,
        `- today tokens saved: ${session.today.tokensSaved}`,
        `- lifetime runs: ${session.lifetime.runs}`,
        `- lifetime tokens saved: ${session.lifetime.tokensSaved}`,
        "",
        "Output preview:",
        ...previewLines(processed.markdown),
        "",
        "Press q, Enter, or Esc to exit.",
      ]);

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
