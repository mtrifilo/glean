import type { MarkdownSection } from "../pipeline/tokenBudget";
import { estimateTokens } from "../pipeline/stats";
import { buildFenceStateMap, colorLineRich, COLORS, shortcutBar } from "./tuiHighlight";

// --- Paragraph splitting for single-section documents ---

export function splitIntoParagraphs(markdown: string): MarkdownSection[] {
  const blocks = markdown.split(/\n\n+/).filter((b) => b.trim());
  if (blocks.length < 2) return [];

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    const firstLine = trimmed.split("\n")[0];
    const isHeading = /^#{1,6}\s+/.test(firstLine);
    const heading = isHeading
      ? firstLine
      : firstLine.length > 50
        ? `\u00b6 ${firstLine.slice(0, 47)}...`
        : `\u00b6 ${firstLine}`;

    return {
      heading,
      level: isHeading ? (firstLine.match(/^(#+)/)?.[1].length ?? 0) : 0,
      content: i === 0 ? trimmed : `\n${trimmed}`,
      tokens: estimateTokens(trimmed),
    };
  });
}

// --- Types ---

export interface SectionPickerOptions {
  sections: MarkdownSection[];
  maxTokens: number;
  renderer: any;
  Box: any;
  Text: any;
  ScrollBox: any;
  TextAttributes: any;
}

export interface SectionPickerResult {
  canceled: boolean;
  selectedSections: MarkdownSection[];
  totalTokens: number;
}

interface PickerState {
  cursor: number;
  selected: boolean[];
  selectedTokens: number;
  scrollOffset: number;
}

// --- Color palette (from shared tuiHighlight.ts) ---

const { ACCENT, SUCCESS, MUTED, STAT_LABEL, STAT_VALUE, HIGHLIGHT, OVER_BUDGET } = COLORS;

// --- Pure utility functions (exported for testing) ---

export function autoFitSelection(sections: MarkdownSection[], maxTokens: number): boolean[] {
  const selected = new Array<boolean>(sections.length).fill(false);
  if (sections.length === 0) return selected;

  // Always include first section
  selected[0] = true;
  let used = sections[0].tokens;

  for (let i = 1; i < sections.length; i++) {
    if (used + sections[i].tokens <= maxTokens) {
      selected[i] = true;
      used += sections[i].tokens;
    } else {
      break;
    }
  }

  return selected;
}

export function computeSelectedTokens(sections: MarkdownSection[], selected: boolean[]): number {
  let total = 0;
  for (let i = 0; i < sections.length; i++) {
    if (selected[i]) {
      total += sections[i].tokens;
    }
  }
  return total;
}

export function budgetColor(selectedTokens: number, maxTokens: number): string {
  const ratio = selectedTokens / maxTokens;
  if (ratio > 1) return OVER_BUDGET;
  if (ratio >= 0.8) return HIGHLIGHT;
  return SUCCESS;
}

// --- Rendering helpers ---

const PREVIEW_MAX_LINES = 25;

function buildPreviewTextNodes(
  section: MarkdownSection,
  Text: any,
  TextAttributes?: any,
): any[] {
  const allLines = section.content.split("\n");
  const lines = allLines.slice(0, PREVIEW_MAX_LINES);
  const nodes: any[] = [];

  // Use colorLineRich for rich inline highlighting
  const fenceState = buildFenceStateMap(lines);

  for (let i = 0; i < lines.length; i++) {
    const lineNodes = colorLineRich(lines[i], fenceState[i], Text, TextAttributes);
    // Wrap each line's nodes in a row so they stay on one line
    nodes.push(...lineNodes);
    if (i < lines.length - 1) {
      nodes.push(Text({ content: "" })); // line break
    }
  }

  if (allLines.length > PREVIEW_MAX_LINES) {
    nodes.push(Text({ content: "...", fg: MUTED }));
  }

  return nodes;
}

function buildSectionRow(
  section: MarkdownSection,
  index: number,
  state: PickerState,
  Text: any,
  Box: any,
  BOLD: any,
  onClickRow?: (index: number) => void,
): any {
  const isSelected = state.selected[index];
  const isCursor = state.cursor === index;
  const checkbox = isSelected ? "[x]" : "[ ]";
  const tokenStr = `${section.tokens}t`;

  // Truncate heading for display
  const heading = section.heading.length > 40
    ? `${section.heading.slice(0, 37)}...`
    : section.heading;

  const label = `${checkbox} ${tokenStr.padStart(6)}  ${heading}`;

  return Box(
    {
      flexDirection: "row" as const,
      flexShrink: 0,
      ...(isCursor ? { bg: "#1e293b" } : {}),
      ...(onClickRow ? { onMouseDown: () => onClickRow(index) } : {}),
    },
    Text({
      content: isCursor ? `> ${label}` : `  ${label}`,
      fg: isSelected ? STAT_VALUE : MUTED,
      ...(isCursor ? { attributes: BOLD } : {}),
    }),
  );
}

function buildBudgetBar(
  state: PickerState,
  maxTokens: number,
  Text: any,
  Box: any,
  BOLD: any,
): any {
  const ratio = Math.min(state.selectedTokens / maxTokens, 1);
  const barWidth = 30;
  const filled = Math.round(ratio * barWidth);
  const empty = barWidth - filled;
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
  const pct = Math.round((state.selectedTokens / maxTokens) * 100);
  const color = budgetColor(state.selectedTokens, maxTokens);
  const status = state.selectedTokens > maxTokens ? "OVER" : "OK";

  return Box(
    { flexDirection: "row" as const, flexShrink: 0 },
    Text({ content: `${state.selectedTokens.toLocaleString()} / ${maxTokens.toLocaleString()} tokens `, fg: color, attributes: BOLD }),
    Text({ content: bar, fg: color }),
    Text({ content: ` ${pct}% ${status}`, fg: color }),
  );
}

// --- Main picker function ---

export function runSectionPicker(options: SectionPickerOptions): Promise<SectionPickerResult> {
  const { sections, maxTokens, renderer, Box, Text, ScrollBox, TextAttributes } = options;
  const BOLD = TextAttributes.BOLD;

  const clearScreen = () => {
    const children = renderer.root.getChildren();
    for (const child of children) {
      renderer.root.remove(child.id);
    }
  };

  // Approximate visible rows: terminal height minus outer border (2), padding (2),
  // inner border (2), budget bar (1), legend (1), title line overlap => ~8 lines of chrome
  const CHROME_LINES = 8;
  const visibleRows = Math.max(3, renderer.height - CHROME_LINES);

  const state: PickerState = {
    cursor: 0,
    selected: autoFitSelection(sections, maxTokens),
    selectedTokens: 0,
    scrollOffset: 0,
  };
  state.selectedTokens = computeSelectedTokens(sections, state.selected);

  // Keep cursor visible within the windowed view
  const adjustScroll = () => {
    if (state.cursor < state.scrollOffset) {
      state.scrollOffset = state.cursor;
    } else if (state.cursor >= state.scrollOffset + visibleRows) {
      state.scrollOffset = state.cursor - visibleRows + 1;
    }
  };

  const renderPickerScreen = () => {
    clearScreen();

    const onClickRow = (index: number) => {
      state.cursor = index;
      state.selected[index] = !state.selected[index];
      state.selectedTokens = computeSelectedTokens(sections, state.selected);
      renderPickerScreen();
    };

    adjustScroll();
    const windowedSections = sections.slice(
      state.scrollOffset,
      state.scrollOffset + visibleRows,
    );
    const sectionRows = windowedSections.map((section, i) => {
      const realIndex = state.scrollOffset + i;
      return buildSectionRow(section, realIndex, state, Text, Box, BOLD, onClickRow);
    });

    const previewSection = sections[state.cursor];
    const previewNodes = previewSection
      ? buildPreviewTextNodes(previewSection, Text, TextAttributes)
      : [Text({ content: "(no section)", fg: MUTED })];

    renderer.root.add(
      Box(
        {
          border: true,
          borderStyle: "rounded" as const,
          borderColor: MUTED,
          padding: 1,
          width: "100%" as const,
          height: "100%" as const,
          flexDirection: "column" as const,
          title: `Section Picker (budget: ${maxTokens.toLocaleString()} tokens)`,
          titleAlignment: "left" as const,
        },
        // Two-pane row
        Box(
          {
            flexDirection: "row" as const,
            flexGrow: 1,
            flexShrink: 1,
            minHeight: 1,
          },
          // Left pane: section list (40%)
          Box(
            {
              border: true,
              borderStyle: "rounded" as const,
              borderColor: MUTED,
              title: "Sections",
              titleAlignment: "left" as const,
              flexDirection: "column" as const,
              width: "40%" as const,
              flexShrink: 0,
              overflow: "hidden" as const,
            },
            ...sectionRows,
          ),
          // Right pane: preview (60%)
          Box(
            {
              border: true,
              borderStyle: "rounded" as const,
              borderColor: MUTED,
              title: "Preview",
              titleAlignment: "left" as const,
              flexDirection: "column" as const,
              width: "60%" as const,
              flexShrink: 1,
              overflow: "hidden" as const,
              padding: 1,
            },
            ...previewNodes,
          ),
        ),
        // Budget bar
        buildBudgetBar(state, maxTokens, Text, Box, BOLD),
        // Shortcut legend
        shortcutBar(
          [
            { key: "\u2191\u2193/j/k", label: "navigate" },
            { key: "Space/Click", label: "toggle" },
            { key: "a", label: "all" },
            { key: "n", label: "none" },
            { key: "f", label: "auto-fit" },
            { key: "Enter", label: "confirm" },
            { key: "q", label: "cancel" },
          ],
          Box,
          Text,
        ),
      ),
    );

    renderer.requestRender();
  };

  return new Promise<SectionPickerResult>((resolve) => {
    renderPickerScreen();

    const handler = (event: { name?: string }) => {
      const key = (event.name ?? "").toLowerCase();

      switch (key) {
        case "up":
        case "k":
          state.cursor = Math.max(0, state.cursor - 1);
          break;
        case "down":
        case "j":
          state.cursor = Math.min(sections.length - 1, state.cursor + 1);
          break;
        case "space":
          state.selected[state.cursor] = !state.selected[state.cursor];
          state.selectedTokens = computeSelectedTokens(sections, state.selected);
          break;
        case "a":
          state.selected.fill(true);
          state.selectedTokens = computeSelectedTokens(sections, state.selected);
          break;
        case "n":
          state.selected.fill(false);
          state.selectedTokens = computeSelectedTokens(sections, state.selected);
          break;
        case "f":
          {
            const fitted = autoFitSelection(sections, maxTokens);
            for (let i = 0; i < fitted.length; i++) {
              state.selected[i] = fitted[i];
            }
            state.selectedTokens = computeSelectedTokens(sections, state.selected);
          }
          break;
        case "return":
        case "enter":
          {
            renderer.keyInput.off("keypress", handler);
            const selectedSections = sections.filter((_, i) => state.selected[i]);
            resolve({
              canceled: false,
              selectedSections,
              totalTokens: state.selectedTokens,
            });
            return;
          }
        case "q":
        case "escape":
          {
            renderer.keyInput.off("keypress", handler);
            resolve({
              canceled: true,
              selectedSections: [],
              totalTokens: 0,
            });
            return;
          }
        default:
          return; // unknown key, no re-render
      }

      renderPickerScreen();
    };

    renderer.keyInput.on("keypress", handler);
  });
}
