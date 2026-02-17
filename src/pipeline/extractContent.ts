import "../lib/jsdomPreload";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { ExtractResult, TransformOptions } from "../lib/types";
import { cleanHtml } from "./cleanHtml";

function wrapHtml(rawHtml: string): string {
  if (/<html[\s>]/i.test(rawHtml) || /<body[\s>]/i.test(rawHtml)) {
    return rawHtml;
  }

  return `<!doctype html><html><body>${rawHtml}</body></html>`;
}

function normalizedTextLength(input: string): number {
  return input.replace(/\s+/g, " ").trim().length;
}

function shouldFallbackToDeterministic(
  originalTextLength: number,
  extractedTextLength: number,
): boolean {
  if (extractedTextLength === 0) {
    return true;
  }

  const minLength = originalTextLength > 900 ? 220 : 90;
  if (originalTextLength > minLength * 2 && extractedTextLength < minLength) {
    return true;
  }

  const coverage = originalTextLength === 0 ? 1 : extractedTextLength / originalTextLength;
  return originalTextLength > 500 && coverage < 0.12;
}

export function extractContent(rawHtml: string, options: TransformOptions): ExtractResult {
  const sourceDom = new JSDOM(wrapHtml(rawHtml), { url: "https://example.com" });
  const fallbackHeading = sourceDom.window.document
    .querySelector("article h1, main h1, h1")
    ?.textContent?.trim();
  const originalTextLength = normalizedTextLength(
    sourceDom.window.document.body.textContent ?? "",
  );

  const reader = new Readability(sourceDom.window.document, {
    keepClasses: false,
    nbTopCandidates: options.aggressive ? 8 : 5,
  });
  const parsedArticle = reader.parse();

  if (!parsedArticle?.content) {
    const fallback = cleanHtml(rawHtml, options);
    return {
      cleanedHtml: fallback.cleanedHtml,
      usedReadability: false,
      extractionReason: "fallback:no-article",
    };
  }

  const extractedTextLength = normalizedTextLength(parsedArticle.textContent ?? "");
  if (shouldFallbackToDeterministic(originalTextLength, extractedTextLength)) {
    const fallback = cleanHtml(rawHtml, options);
    return {
      cleanedHtml: fallback.cleanedHtml,
      usedReadability: false,
      extractionReason: "fallback:low-confidence",
    };
  }

  const articleHasHeading = /<h1[\s>]/i.test(parsedArticle.content);
  const headingPrefix =
    !articleHasHeading && fallbackHeading ? `<h1>${fallbackHeading}</h1>` : "";
  const cleanedFromArticle = cleanHtml(`${headingPrefix}${parsedArticle.content}`, options);
  return {
    cleanedHtml: cleanedFromArticle.cleanedHtml,
    usedReadability: true,
    extractionReason: "readability",
  };
}
