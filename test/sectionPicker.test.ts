import { describe, expect, test } from "bun:test";
import { autoFitSelection, budgetColor, computeSelectedTokens, splitIntoParagraphs } from "../src/tui/sectionPicker";
import type { MarkdownSection } from "../src/pipeline/tokenBudget";

function makeSection(heading: string, tokens: number): MarkdownSection {
  return { heading, level: 1, content: `# ${heading}\n\nBody text.`, tokens };
}

describe("autoFitSelection", () => {
  test("greedy fill within budget", () => {
    const sections = [makeSection("A", 100), makeSection("B", 100), makeSection("C", 100)];
    const result = autoFitSelection(sections, 250);

    expect(result).toEqual([true, true, false]);
  });

  test("first section always included even if over budget", () => {
    const sections = [makeSection("A", 500), makeSection("B", 100)];
    const result = autoFitSelection(sections, 100);

    expect(result).toEqual([true, false]);
  });

  test("all fit within budget", () => {
    const sections = [makeSection("A", 50), makeSection("B", 50), makeSection("C", 50)];
    const result = autoFitSelection(sections, 999);

    expect(result).toEqual([true, true, true]);
  });

  test("none fit beyond first section", () => {
    const sections = [makeSection("A", 90), makeSection("B", 100), makeSection("C", 100)];
    const result = autoFitSelection(sections, 100);

    expect(result).toEqual([true, false, false]);
  });

  test("empty sections returns empty array", () => {
    const result = autoFitSelection([], 100);
    expect(result).toEqual([]);
  });

  test("exact budget boundary includes section", () => {
    const sections = [makeSection("A", 50), makeSection("B", 50)];
    const result = autoFitSelection(sections, 100);

    expect(result).toEqual([true, true]);
  });
});

describe("computeSelectedTokens", () => {
  const sections = [makeSection("A", 100), makeSection("B", 200), makeSection("C", 300)];

  test("sums selected sections", () => {
    expect(computeSelectedTokens(sections, [true, false, true])).toBe(400);
  });

  test("nothing selected returns 0", () => {
    expect(computeSelectedTokens(sections, [false, false, false])).toBe(0);
  });

  test("all selected returns total", () => {
    expect(computeSelectedTokens(sections, [true, true, true])).toBe(600);
  });

  test("single selected", () => {
    expect(computeSelectedTokens(sections, [false, true, false])).toBe(200);
  });
});

describe("budgetColor", () => {
  test("green when under 80%", () => {
    expect(budgetColor(70, 100)).toBe("#4ade80");
  });

  test("green at 79%", () => {
    expect(budgetColor(79, 100)).toBe("#4ade80");
  });

  test("amber at exactly 80%", () => {
    expect(budgetColor(80, 100)).toBe("#fbbf24");
  });

  test("amber at 99%", () => {
    expect(budgetColor(99, 100)).toBe("#fbbf24");
  });

  test("amber at exactly 100%", () => {
    expect(budgetColor(100, 100)).toBe("#fbbf24");
  });

  test("red when over 100%", () => {
    expect(budgetColor(101, 100)).toBe("#ef4444");
  });

  test("red at 150%", () => {
    expect(budgetColor(150, 100)).toBe("#ef4444");
  });
});

describe("splitIntoParagraphs", () => {
  test("splits markdown into paragraph-level sections", () => {
    const md = "# Title\n\nFirst paragraph content.\n\nSecond paragraph here.\n\nThird paragraph.";
    const result = splitIntoParagraphs(md);

    expect(result.length).toBe(4);
    expect(result[0].heading).toBe("# Title");
    expect(result[1].heading).toContain("First paragraph");
    expect(result[2].heading).toContain("Second paragraph");
  });

  test("returns empty for single paragraph", () => {
    const md = "Just one paragraph with no breaks.";
    const result = splitIntoParagraphs(md);
    expect(result).toEqual([]);
  });

  test("truncates long first lines in heading", () => {
    const md = "Short intro.\n\nThis is a very long paragraph first line that exceeds fifty characters easily and keeps going on and on.\n\nAnother paragraph.";
    const result = splitIntoParagraphs(md);

    expect(result.length).toBe(3);
    expect(result[1].heading.length).toBeLessThanOrEqual(53); // "¶ " + 47 + "..."
  });

  test("preserves heading markers for heading lines", () => {
    const md = "Preamble text.\n\n## Section One\n\nBody text.\n\n## Section Two\n\nMore text.";
    const result = splitIntoParagraphs(md);

    expect(result.length).toBe(5);
    expect(result[1].heading).toBe("## Section One");
    expect(result[1].level).toBe(2);
    expect(result[3].heading).toBe("## Section Two");
  });

  test("each section has token estimate", () => {
    const md = "First block.\n\nSecond block.";
    const result = splitIntoParagraphs(md);

    expect(result.length).toBe(2);
    for (const s of result) {
      expect(s.tokens).toBeGreaterThan(0);
    }
  });
});
