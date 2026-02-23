import { describe, expect, test } from "bun:test";
import {
  buildSectionBreakdown,
  formatSectionBreakdown,
  formatTokenBudgetError,
  formatTokenBudgetWarning,
  parseMarkdownSections,
  truncateToTokenBudget,
} from "../src/pipeline/tokenBudget";

describe("parseMarkdownSections", () => {
  test("splits on multiple heading levels", () => {
    const md = "# Heading 1\nParagraph one.\n## Heading 2\nParagraph two.\n### Heading 3\nDeep.";
    const sections = parseMarkdownSections(md);

    expect(sections).toHaveLength(3);
    expect(sections[0].heading).toBe("# Heading 1");
    expect(sections[0].level).toBe(1);
    expect(sections[1].heading).toBe("## Heading 2");
    expect(sections[1].level).toBe(2);
    expect(sections[2].heading).toBe("### Heading 3");
    expect(sections[2].level).toBe(3);
  });

  test("no headings returns single section at level 0", () => {
    const md = "Just some text\nwith multiple lines.";
    const sections = parseMarkdownSections(md);

    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("(preamble)");
    expect(sections[0].level).toBe(0);
  });

  test("empty markdown returns empty array", () => {
    expect(parseMarkdownSections("")).toHaveLength(0);
  });

  test("empty preamble is omitted", () => {
    const md = "# First Heading\nContent here.";
    const sections = parseMarkdownSections(md);

    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("# First Heading");
  });

  test("non-empty preamble is included", () => {
    const md = "Preamble text.\n\n# First Heading\nContent here.";
    const sections = parseMarkdownSections(md);

    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("(preamble)");
    expect(sections[0].content).toContain("Preamble text.");
  });

  test("token counts are positive for non-empty sections", () => {
    const md = "# Heading\nSome content here with words.";
    const sections = parseMarkdownSections(md);

    for (const s of sections) {
      expect(s.tokens).toBeGreaterThan(0);
    }
  });

  test("content reconstruction approximates original", () => {
    const md = "Preamble.\n\n# Section A\nContent A.\n## Section B\nContent B.";
    const sections = parseMarkdownSections(md);
    const reconstructed = sections.map((s) => s.content).join("\n");

    expect(reconstructed).toBe(md);
  });

  test("handles h4-h6 headings", () => {
    const md = "#### H4\nText.\n##### H5\nMore.\n###### H6\nDeep.";
    const sections = parseMarkdownSections(md);

    expect(sections).toHaveLength(3);
    expect(sections[0].level).toBe(4);
    expect(sections[1].level).toBe(5);
    expect(sections[2].level).toBe(6);
  });
});

describe("buildSectionBreakdown", () => {
  const makeSections = (tokenCounts: number[]) =>
    tokenCounts.map((tokens, i) => ({
      heading: `# Section ${i + 1}`,
      level: 1,
      content: `Section ${i + 1} content`,
      tokens,
    }));

  test("under budget", () => {
    const sections = makeSections([100, 200, 300]);
    const breakdown = buildSectionBreakdown(sections, 1000);

    expect(breakdown.totalTokens).toBe(600);
    expect(breakdown.maxTokens).toBe(1000);
    expect(breakdown.overBudget).toBe(false);
    expect(breakdown.overageTokens).toBe(0);
  });

  test("over budget", () => {
    const sections = makeSections([500, 400, 300]);
    const breakdown = buildSectionBreakdown(sections, 1000);

    expect(breakdown.totalTokens).toBe(1200);
    expect(breakdown.overBudget).toBe(true);
    expect(breakdown.overageTokens).toBe(200);
  });

  test("exactly at budget", () => {
    const sections = makeSections([500, 500]);
    const breakdown = buildSectionBreakdown(sections, 1000);

    expect(breakdown.totalTokens).toBe(1000);
    expect(breakdown.overBudget).toBe(false);
    expect(breakdown.overageTokens).toBe(0);
  });
});

describe("truncateToTokenBudget", () => {
  const makeSections = (tokenCounts: number[]) =>
    tokenCounts.map((tokens, i) => ({
      heading: `# Section ${i + 1}`,
      level: 1,
      content: `# Section ${i + 1}\nContent for section ${i + 1}.`,
      tokens,
    }));

  test("under budget keeps all, no marker", () => {
    const sections = makeSections([100, 200, 300]);
    const result = truncateToTokenBudget(sections, 1000);

    expect(result.keptSections).toHaveLength(3);
    expect(result.droppedSections).toHaveLength(0);
    expect(result.markdown).not.toContain("truncated");
  });

  test("over budget drops last sections", () => {
    const sections = makeSections([100, 200, 300]);
    const result = truncateToTokenBudget(sections, 350);

    expect(result.keptSections).toHaveLength(2);
    expect(result.droppedSections).toHaveLength(1);
    expect(result.keptTokens).toBe(300);
    expect(result.markdown).toContain("truncated");
  });

  test("first section alone exceeds budget — kept anyway", () => {
    const sections = makeSections([500, 200]);
    const result = truncateToTokenBudget(sections, 100);

    expect(result.keptSections).toHaveLength(1);
    expect(result.keptSections[0]).toBe(sections[0]);
    expect(result.droppedSections).toHaveLength(1);
    expect(result.markdown).toContain("truncated");
  });

  test("single section over budget — no drop possible", () => {
    const sections = makeSections([500]);
    const result = truncateToTokenBudget(sections, 100);

    expect(result.keptSections).toHaveLength(1);
    expect(result.droppedSections).toHaveLength(0);
    expect(result.markdown).not.toContain("truncated");
  });

  test("marker appended only when sections dropped", () => {
    const sections = makeSections([100, 200]);

    const underResult = truncateToTokenBudget(sections, 500);
    expect(underResult.markdown).not.toContain("---");

    const overResult = truncateToTokenBudget(sections, 150);
    expect(overResult.markdown).toContain("---");
    expect(overResult.markdown).toContain("Content truncated");
  });

  test("empty sections returns empty result", () => {
    const result = truncateToTokenBudget([], 100);

    expect(result.markdown).toBe("");
    expect(result.keptSections).toHaveLength(0);
    expect(result.droppedSections).toHaveLength(0);
    expect(result.keptTokens).toBe(0);
  });
});

describe("formatSectionBreakdown", () => {
  test("contains budget amount, headings, total, and budget status", () => {
    const sections = [
      { heading: "# Intro", level: 1, content: "Intro content", tokens: 120 },
      { heading: "## Details", level: 2, content: "Details content", tokens: 830 },
    ];
    const breakdown = buildSectionBreakdown(sections, 500);
    const output = formatSectionBreakdown(breakdown);

    expect(output).toContain("budget: 500 tokens");
    expect(output).toContain("# Intro");
    expect(output).toContain("## Details");
    expect(output).toContain("120");
    expect(output).toContain("830");
    expect(output).toContain("950");
    expect(output).toContain("over budget");
  });

  test("shows within budget when under", () => {
    const sections = [{ heading: "# Intro", level: 1, content: "Intro", tokens: 50 }];
    const breakdown = buildSectionBreakdown(sections, 500);
    const output = formatSectionBreakdown(breakdown);

    expect(output).toContain("within budget");
  });
});

describe("formatTokenBudgetError", () => {
  test("contains Error:, section table, and suggestions", () => {
    const sections = [
      { heading: "# Intro", level: 1, content: "content", tokens: 500 },
    ];
    const breakdown = buildSectionBreakdown(sections, 100);
    const output = formatTokenBudgetError(breakdown);

    expect(output).toContain("Error:");
    expect(output).toContain("# Intro");
    expect(output).toContain("Suggestions:");
    expect(output).toContain("--max-tokens");
    expect(output).toContain("extract");
    expect(output).toContain("--aggressive");
    expect(output).toContain("TTY");
  });
});

describe("formatTokenBudgetWarning", () => {
  test("contains Warning:, kept/dropped labels, and kept count", () => {
    const sections = [
      { heading: "# Intro", level: 1, content: "# Intro\ncontent", tokens: 100 },
      { heading: "## Details", level: 2, content: "## Details\nmore", tokens: 500 },
    ];
    const breakdown = buildSectionBreakdown(sections, 200);
    const truncation = truncateToTokenBudget(sections, 200);
    const output = formatTokenBudgetWarning(breakdown, truncation);

    expect(output).toContain("Warning:");
    expect(output).toContain("[kept]");
    expect(output).toContain("[dropped]");
    expect(output).toContain("1 of 2 sections");
  });
});
