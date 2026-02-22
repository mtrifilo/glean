import { describe, expect, test } from "bun:test";
import type { TransformOptions } from "../src/lib/types";
import { cleanHtml } from "../src/pipeline/cleanHtml";
import { extractContent } from "../src/pipeline/extractContent";
import { buildStats } from "../src/pipeline/stats";
import { toMarkdown } from "../src/pipeline/toMarkdown";

const defaultOptions: TransformOptions = {
  keepLinks: true,
  keepImages: false,
  preserveTables: true,
  maxHeadingLevel: 6,
  aggressive: false,
};

async function readFixture(name: string): Promise<string> {
  return Bun.file(`test/fixtures/${name}`).text();
}

async function renderCleanFixture(
  name: string,
  options: TransformOptions = defaultOptions,
): Promise<string> {
  const input = await readFixture(name);
  const cleaned = cleanHtml(input, options);
  return toMarkdown(cleaned.cleanedHtml, options);
}

describe("clean pipeline fixtures", () => {
  const fixtureCases = [
    { input: "blog.html", expected: "blog.expected.md" },
    { input: "docs.html", expected: "docs.expected.md" },
    { input: "marketing.html", expected: "marketing.expected.md" },
    { input: "ecommerce.html", expected: "ecommerce.expected.md" },
  ];

  for (const fixtureCase of fixtureCases) {
    test(`clean output matches snapshot for ${fixtureCase.input}`, async () => {
      const markdown = await renderCleanFixture(fixtureCase.input);
      const expected = (await readFixture(fixtureCase.expected)).trim();
      expect(markdown).toBe(expected);
    });
  }
});

describe("clean pipeline options", () => {
  test("strip links keeps anchor text but removes urls", async () => {
    const input = await readFixture("blog.html");
    const options: TransformOptions = {
      ...defaultOptions,
      keepLinks: false,
    };
    const cleaned = cleanHtml(input, options);
    const markdown = toMarkdown(cleaned.cleanedHtml, options);

    expect(markdown).toContain("industry report");
    expect(markdown).not.toContain("](");
  });

  test("no preserve tables removes markdown table output", async () => {
    const input = await readFixture("marketing.html");
    const options: TransformOptions = {
      ...defaultOptions,
      preserveTables: false,
    };
    const cleaned = cleanHtml(input, options);
    const markdown = toMarkdown(cleaned.cleanedHtml, options);

    expect(markdown).not.toContain("| --- |");
  });
});

describe("extract pipeline", () => {
  test("extract keeps article core and drops page furniture", async () => {
    const input = await readFixture("article-with-noise.html");
    const extraction = extractContent(input, defaultOptions);
    const markdown = toMarkdown(extraction.cleanedHtml, defaultOptions);
    const expected = (await readFixture("article-with-noise.extract.expected.md")).trim();

    expect(extraction.usedReadability).toBe(true);
    expect(markdown).toBe(expected);
    expect(markdown).not.toContain("Comments are closed");
    expect(markdown).not.toContain("global-nav");
  });
});

describe("stats", () => {
  test("stats report meaningful reduction", async () => {
    const input = await readFixture("docs.html");
    const cleaned = cleanHtml(input, defaultOptions);
    const markdown = toMarkdown(cleaned.cleanedHtml, defaultOptions);
    const stats = buildStats("clean", input, markdown);

    expect(stats.outputChars).toBeLessThan(stats.inputChars);
    expect(stats.outputTokensEstimate).toBeLessThan(stats.inputTokensEstimate);
    expect(stats.charReductionPct).toBeGreaterThan(0);
    expect(stats.tokenReductionPct).toBeGreaterThan(0);
  });

  test("stats include source info when provided", () => {
    const stats = buildStats("clean", "<p>hello</p>", "hello", {
      sourceFormat: "docx",
      sourceChars: 5000,
    });

    expect(stats.sourceFormat).toBe("docx");
    expect(stats.sourceChars).toBe(5000);
  });

  test("stats omit source info when not provided", () => {
    const stats = buildStats("clean", "<p>hello</p>", "hello");

    expect(stats.sourceFormat).toBeUndefined();
    expect(stats.sourceChars).toBeUndefined();
  });
});
