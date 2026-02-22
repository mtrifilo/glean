/**
 * Regenerates all .expected.md golden fixtures from current pipeline output.
 *
 * Fixture map is explicit — pipeline routing (clean vs extract) can't be
 * inferred from filenames. Keep in sync with pipeline.test.ts and smoke-check.ts.
 */

import type { TransformOptions } from "../src/lib/types";
import { cleanHtml } from "../src/pipeline/cleanHtml";
import { extractContent } from "../src/pipeline/extractContent";
import { toMarkdown } from "../src/pipeline/toMarkdown";

const defaultOptions: TransformOptions = {
  keepLinks: true,
  keepImages: false,
  preserveTables: true,
  maxHeadingLevel: 6,
  aggressive: false,
};

const cleanFixtures = ["blog", "docs", "marketing", "ecommerce"];
const extractFixtures = ["article-with-noise"];

async function updateGolden() {
  let updated = 0;

  for (const name of cleanFixtures) {
    const input = await Bun.file(`test/fixtures/${name}.html`).text();
    const cleaned = cleanHtml(input, defaultOptions);
    const markdown = toMarkdown(cleaned.cleanedHtml, defaultOptions);
    const outPath = `test/fixtures/${name}.expected.md`;
    await Bun.write(outPath, markdown + "\n");
    console.log(`  ✓ ${outPath}`);
    updated++;
  }

  for (const name of extractFixtures) {
    const input = await Bun.file(`test/fixtures/${name}.html`).text();
    const extraction = extractContent(input, defaultOptions);
    const markdown = toMarkdown(extraction.cleanedHtml, defaultOptions);
    const outPath = `test/fixtures/${name}.extract.expected.md`;
    await Bun.write(outPath, markdown + "\n");
    console.log(`  ✓ ${outPath}`);
    updated++;
  }

  console.log(`\nUpdated ${updated} golden fixtures.`);
}

updateGolden();
