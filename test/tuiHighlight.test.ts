import { describe, expect, test } from "bun:test";
import {
  buildFenceStateMap,
  colorLineRich,
  COLORS,
  shortcutBar,
} from "../src/tui/tuiHighlight";

// --- Mock OpenTUI factories ---

interface TextProps {
  content: string;
  fg?: string;
  attributes?: number;
  flexShrink?: number;
}

function MockText(props: TextProps) {
  return { type: "text", ...props };
}

function MockBox(props: any, ...children: any[]) {
  return { type: "box", props, children };
}

const BOLD = 1; // mock TextAttributes.BOLD

// --- buildFenceStateMap ---

describe("buildFenceStateMap", () => {
  test("no fences → all false", () => {
    const lines = ["# Hello", "Some text", "More text"];
    expect(buildFenceStateMap(lines)).toEqual([false, false, false]);
  });

  test("single code fence block", () => {
    const lines = ["before", "```js", "const x = 1;", "const y = 2;", "```", "after"];
    expect(buildFenceStateMap(lines)).toEqual([false, false, true, true, false, false]);
  });

  test("multiple code fence blocks", () => {
    const lines = ["text", "```", "code1", "```", "gap", "```", "code2", "```"];
    expect(buildFenceStateMap(lines)).toEqual([false, false, true, false, false, false, true, false]);
  });

  test("unclosed code fence", () => {
    const lines = ["text", "```", "code line", "still code"];
    expect(buildFenceStateMap(lines)).toEqual([false, false, true, true]);
  });

  test("empty array", () => {
    expect(buildFenceStateMap([])).toEqual([]);
  });

  test("code fence with language identifier", () => {
    const lines = ["```typescript", "type Foo = string;", "```"];
    expect(buildFenceStateMap(lines)).toEqual([false, true, false]);
  });
});

// --- colorLineRich ---

describe("colorLineRich", () => {
  test("heading → accent + bold", () => {
    const nodes = colorLineRich("# My Heading", false, MockText, { BOLD });
    expect(nodes).toHaveLength(1);
    expect(nodes[0].content).toBe("# My Heading");
    expect(nodes[0].fg).toBe(COLORS.ACCENT);
    expect(nodes[0].attributes).toBe(BOLD);
  });

  test("h2–h6 headings get accent", () => {
    for (const h of ["## H2", "### H3", "#### H4", "##### H5", "###### H6"]) {
      const nodes = colorLineRich(h, false, MockText, { BOLD });
      expect(nodes[0].fg).toBe(COLORS.ACCENT);
    }
  });

  test("code fence delimiter → muted", () => {
    const nodes = colorLineRich("```js", false, MockText);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].fg).toBe(COLORS.MUTED);
  });

  test("line inside code fence → muted", () => {
    const nodes = colorLineRich("const x = 1;", true, MockText);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].fg).toBe(COLORS.MUTED);
  });

  test("blockquote → muted marker + inline content", () => {
    const nodes = colorLineRich("> Some quoted text", false, MockText);
    expect(nodes[0].content).toBe("> ");
    expect(nodes[0].fg).toBe(COLORS.MUTED);
    expect(nodes.length).toBeGreaterThanOrEqual(2);
  });

  test("horizontal rule (---) → muted", () => {
    const nodes = colorLineRich("---", false, MockText);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].fg).toBe(COLORS.MUTED);
  });

  test("horizontal rule (***) → muted", () => {
    const nodes = colorLineRich("***", false, MockText);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].fg).toBe(COLORS.MUTED);
  });

  test("horizontal rule (___) → muted", () => {
    const nodes = colorLineRich("___", false, MockText);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].fg).toBe(COLORS.MUTED);
  });

  test("unordered list item → accent marker + content", () => {
    const nodes = colorLineRich("- list item", false, MockText);
    expect(nodes[0].content).toBe("- ");
    expect(nodes[0].fg).toBe(COLORS.ACCENT);
    expect(nodes.length).toBeGreaterThanOrEqual(2);
  });

  test("ordered list item → accent marker", () => {
    const nodes = colorLineRich("1. first item", false, MockText);
    expect(nodes[0].content).toBe("1. ");
    expect(nodes[0].fg).toBe(COLORS.ACCENT);
  });

  test("bold inline → muted delimiters + bold content", () => {
    const nodes = colorLineRich("Hello **world** there", false, MockText, { BOLD });
    const texts = nodes.map((n: any) => n.content).join("");
    expect(texts).toBe("Hello **world** there");
    // Should have muted ** delimiters
    const mutedNodes = nodes.filter((n: any) => n.content === "**");
    expect(mutedNodes.length).toBe(2);
    for (const n of mutedNodes) {
      expect(n.fg).toBe(COLORS.MUTED);
    }
  });

  test("italic inline (*text*) → muted delimiters", () => {
    const nodes = colorLineRich("Hello *world* there", false, MockText);
    const texts = nodes.map((n: any) => n.content).join("");
    expect(texts).toBe("Hello *world* there");
    const starNodes = nodes.filter((n: any) => n.content === "*");
    expect(starNodes.length).toBe(2);
  });

  test("inline code → highlight color", () => {
    const nodes = colorLineRich("Use `console.log` here", false, MockText);
    const codeNode = nodes.find((n: any) => n.content === "`console.log`");
    expect(codeNode).toBeDefined();
    expect(codeNode.fg).toBe(COLORS.HIGHLIGHT);
  });

  test("link → accent text + muted URL", () => {
    const nodes = colorLineRich("Visit [Example](https://example.com) now", false, MockText);
    const linkTextNode = nodes.find((n: any) => n.content === "[Example]");
    const urlNode = nodes.find((n: any) => n.content === "(https://example.com)");
    expect(linkTextNode).toBeDefined();
    expect(linkTextNode.fg).toBe(COLORS.ACCENT);
    expect(urlNode).toBeDefined();
    expect(urlNode.fg).toBe(COLORS.MUTED);
  });

  test("normal text → stat value color", () => {
    const nodes = colorLineRich("Just a plain line", false, MockText);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].fg).toBe(COLORS.STAT_VALUE);
  });

  test("empty line → single node", () => {
    const nodes = colorLineRich("", false, MockText);
    expect(nodes).toHaveLength(1);
  });
});

// --- shortcutBar ---

describe("shortcutBar", () => {
  test("creates box with alternating key/label nodes", () => {
    const result = shortcutBar(
      [
        { key: "j/k", label: "scroll" },
        { key: "q", label: "quit" },
      ],
      MockBox,
      MockText,
    );

    expect(result.type).toBe("box");
    // j/k, " scroll", spacer, q, " quit" = 5 nodes
    expect(result.children).toHaveLength(5);
    expect(result.children[0].content).toBe("j/k");
    expect(result.children[0].fg).toBe(COLORS.STAT_LABEL);
    expect(result.children[1].content).toBe(" scroll");
    expect(result.children[1].fg).toBe(COLORS.MUTED);
  });

  test("single shortcut has no spacer", () => {
    const result = shortcutBar(
      [{ key: "q", label: "quit" }],
      MockBox,
      MockText,
    );

    expect(result.children).toHaveLength(2);
  });

  test("empty shortcuts array", () => {
    const result = shortcutBar([], MockBox, MockText);
    expect(result.children).toHaveLength(0);
  });
});
