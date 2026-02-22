/**
 * Quality guard that catches regressions even when golden fixtures are updated.
 *
 * bun test verifies output matches goldens, but if someone updates goldens after
 * a bad heuristic change, tests still pass. This script enforces absolute quality
 * floors on char reduction.
 *
 * Fixture map is explicit — keep in sync with pipeline.test.ts and update-golden.ts.
 */

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

// Thresholds
const PER_FIXTURE_MIN_CHAR_REDUCTION_PCT = 30;
const AGGREGATE_MIN_CHAR_REDUCTION_PCT = 40;

interface FixtureEntry {
  name: string;
  mode: "clean" | "extract";
}

const fixtures: FixtureEntry[] = [
  { name: "blog", mode: "clean" },
  { name: "docs", mode: "clean" },
  { name: "marketing", mode: "clean" },
  { name: "ecommerce", mode: "clean" },
  { name: "article-with-noise", mode: "extract" },
];

interface FixtureResult {
  name: string;
  mode: string;
  inputChars: number;
  outputChars: number;
  charReductionPct: number;
  pass: boolean;
}

async function runSmokeCheck(): Promise<boolean> {
  const results: FixtureResult[] = [];

  for (const fixture of fixtures) {
    const input = await Bun.file(`test/fixtures/${fixture.name}.html`).text();
    let markdown: string;

    if (fixture.mode === "clean") {
      const cleaned = cleanHtml(input, defaultOptions);
      markdown = toMarkdown(cleaned.cleanedHtml, defaultOptions);
    } else {
      const extraction = extractContent(input, defaultOptions);
      markdown = toMarkdown(extraction.cleanedHtml, defaultOptions);
    }

    const stats = buildStats(fixture.mode, input, markdown);
    const sanityPass = stats.outputChars < stats.inputChars;
    const thresholdPass = stats.charReductionPct >= PER_FIXTURE_MIN_CHAR_REDUCTION_PCT;
    const pass = sanityPass && thresholdPass;

    results.push({
      name: fixture.name,
      mode: fixture.mode,
      inputChars: stats.inputChars,
      outputChars: stats.outputChars,
      charReductionPct: stats.charReductionPct,
      pass,
    });
  }

  // Print table
  const nameWidth = Math.max(...results.map((r) => r.name.length), 4);
  const header = `${"Fixture".padEnd(nameWidth)}  Mode     Input    Output   Reduction  Status`;
  const divider = "-".repeat(header.length);

  console.log("\nPipeline Smoke Check");
  console.log(divider);
  console.log(header);
  console.log(divider);

  for (const r of results) {
    const status = r.pass ? "PASS" : "FAIL";
    const line = [
      r.name.padEnd(nameWidth),
      r.mode.padEnd(7),
      String(r.inputChars).padStart(8),
      String(r.outputChars).padStart(8),
      `${r.charReductionPct.toFixed(1)}%`.padStart(10),
      `  ${status}`,
    ].join("  ");
    console.log(line);
  }

  console.log(divider);

  // Aggregate check
  const meanReduction =
    results.reduce((sum, r) => sum + r.charReductionPct, 0) / results.length;
  const allPassed = results.every((r) => r.pass);
  const aggregatePass = meanReduction >= AGGREGATE_MIN_CHAR_REDUCTION_PCT;

  console.log(`\nMean char reduction: ${meanReduction.toFixed(1)}% (floor: ${AGGREGATE_MIN_CHAR_REDUCTION_PCT}%)`);
  console.log(`Per-fixture floor:   ${PER_FIXTURE_MIN_CHAR_REDUCTION_PCT}%`);

  const overallPass = allPassed && aggregatePass;
  console.log(`\nResult: ${overallPass ? "PASS" : "FAIL"}`);

  return overallPass;
}

const passed = await runSmokeCheck();
process.exit(passed ? 0 : 1);
