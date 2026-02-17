import { JSDOM } from "jsdom";
import {
  ABSOLUTE_URL_PROTOCOLS,
  AGGRESSIVE_NOISE_KEYWORDS,
  AGGRESSIVE_NOISE_TAGS,
  GLOBAL_ALLOWED_ATTRIBUTES,
  NOISE_KEYWORDS,
  NOISE_ROLE_VALUES,
  NOISE_TAGS,
  NOISY_ATTRIBUTE_PREFIXES,
  TAG_ALLOWED_ATTRIBUTES,
} from "../lib/rules";
import type { CleanResult, TransformOptions } from "../lib/types";

const CONTENT_CANDIDATE_SELECTOR = "article,main,section,div";
const CONTENT_PROTECTED_TAGS = new Set(["article", "main"]);
const textDecoderWhitespace = /\s+/g;

function wrapHtml(rawHtml: string): string {
  if (/<html[\s>]/i.test(rawHtml) || /<body[\s>]/i.test(rawHtml)) {
    return rawHtml;
  }

  return `<!doctype html><html><body>${rawHtml}</body></html>`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(textDecoderWhitespace, " ").trim();
}

function removeByTagName(document: Document, tagName: string): void {
  const nodes = [...document.getElementsByTagName(tagName)];
  for (const node of nodes) {
    node.remove();
  }
}

function shouldDropByRoleOrState(el: Element): boolean {
  const role = el.getAttribute("role");
  if (role && NOISE_ROLE_VALUES.has(role.toLowerCase())) {
    return true;
  }

  if (el.hasAttribute("hidden")) {
    return true;
  }

  const ariaHidden = el.getAttribute("aria-hidden");
  if (ariaHidden && ariaHidden.toLowerCase() === "true") {
    return true;
  }

  return false;
}

function getNoiseKeywordSource(el: Element): string {
  const parts = [
    el.id,
    el.className,
    el.getAttribute("data-testid"),
    el.getAttribute("data-test"),
    el.getAttribute("data-qa"),
    el.getAttribute("name"),
  ]
    .filter(Boolean)
    .join(" ");

  return parts.toLowerCase();
}

function containsNoiseKeyword(el: Element, aggressive: boolean): boolean {
  const source = getNoiseKeywordSource(el);
  if (!source) {
    return false;
  }

  for (const keyword of NOISE_KEYWORDS) {
    if (source.includes(keyword)) {
      return true;
    }
  }

  if (aggressive) {
    for (const keyword of AGGRESSIVE_NOISE_KEYWORDS) {
      if (source.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

function isLowValueContainer(el: Element): boolean {
  const text = normalizeWhitespace(el.textContent ?? "");
  if (!text) {
    return true;
  }

  const paragraphCount = el.querySelectorAll("p").length;
  if (paragraphCount >= 3) {
    return false;
  }

  return text.length < 260;
}

function removeNoiseContainers(document: Document, aggressive: boolean): void {
  const elements = [...document.body.querySelectorAll("*")];
  for (const el of elements) {
    const tag = el.tagName.toLowerCase();

    if (shouldDropByRoleOrState(el)) {
      el.remove();
      continue;
    }

    if (aggressive && AGGRESSIVE_NOISE_TAGS.has(tag)) {
      el.remove();
      continue;
    }

    if (!containsNoiseKeyword(el, aggressive)) {
      continue;
    }

    if (CONTENT_PROTECTED_TAGS.has(tag) && !aggressive) {
      continue;
    }

    if (!aggressive && !isLowValueContainer(el)) {
      continue;
    }

    el.remove();
  }
}

function sanitizeHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("#") || trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed, "https://example.com");
    if (!ABSOLUTE_URL_PROTOCOLS.includes(url.protocol)) {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
}

function stripAttributes(document: Document): void {
  const elements = [...document.body.querySelectorAll("*")];

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    const allowedForTag = TAG_ALLOWED_ATTRIBUTES[tag] ?? new Set<string>();
    const names = [...el.getAttributeNames()];

    for (const attr of names) {
      const lowerAttr = attr.toLowerCase();

      if (GLOBAL_ALLOWED_ATTRIBUTES.has(lowerAttr)) {
        continue;
      }

      if (allowedForTag.has(lowerAttr)) {
        if (tag === "a" && lowerAttr === "href") {
          const sanitized = sanitizeHref(el.getAttribute(attr) ?? "");
          if (sanitized) {
            el.setAttribute("href", sanitized);
          } else {
            el.removeAttribute(attr);
          }
        }
        continue;
      }

      if (NOISY_ATTRIBUTE_PREFIXES.some((prefix) => lowerAttr.startsWith(prefix))) {
        el.removeAttribute(attr);
        continue;
      }

      el.removeAttribute(attr);
    }
  }
}

function unwrapElements(document: Document, selector: string): void {
  const elements = [...document.querySelectorAll(selector)];
  for (const element of elements) {
    const parent = element.parentNode;
    if (!parent) {
      continue;
    }

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }

    parent.removeChild(element);
  }
}

function replaceWithText(node: Element): void {
  const parent = node.parentNode;
  if (!parent) {
    return;
  }

  const text = normalizeWhitespace(node.textContent ?? "");
  parent.insertBefore(node.ownerDocument.createTextNode(text), node);
  parent.removeChild(node);
}

function normalizeHeadingLevels(document: Document, maxHeadingLevel: number): void {
  const capped = Math.max(1, Math.min(6, Math.floor(maxHeadingLevel)));
  if (capped === 6) {
    return;
  }

  for (let level = capped + 1; level <= 6; level += 1) {
    const nodes = [...document.querySelectorAll(`h${level}`)];
    for (const node of nodes) {
      const replacement = document.createElement(`h${capped}`);
      replacement.innerHTML = node.innerHTML;
      node.replaceWith(replacement);
    }
  }
}

function textLength(el: Element): number {
  return normalizeWhitespace(el.textContent ?? "").length;
}

function scoreCandidate(el: Element): number {
  const text = normalizeWhitespace(el.textContent ?? "");
  if (!text || text.length < 80) {
    return 0;
  }

  const linkTextLength = [...el.querySelectorAll("a")]
    .map((link) => normalizeWhitespace(link.textContent ?? "").length)
    .reduce((sum, len) => sum + len, 0);
  const paragraphCount = el.querySelectorAll("p").length;
  const headingCount = el.querySelectorAll("h1,h2,h3,h4,h5,h6").length;
  const listItemCount = el.querySelectorAll("li").length;
  const punctuationCount = (text.match(/[.!?;:]/g) ?? []).length;
  const linkDensity = text.length ? linkTextLength / text.length : 0;

  return (
    text.length +
    paragraphCount * 32 +
    headingCount * 48 +
    listItemCount * 10 +
    punctuationCount * 8 -
    linkDensity * 140
  );
}

function isolatePrimaryContent(document: Document, aggressive: boolean): void {
  const body = document.body;
  const bodyTextLength = textLength(body);
  if (bodyTextLength < 450) {
    return;
  }

  const candidates = [...body.querySelectorAll(CONTENT_CANDIDATE_SELECTOR)];
  if (!candidates.length) {
    return;
  }

  let bestNode: Element | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreCandidate(candidate);
    if (score > bestScore) {
      bestScore = score;
      bestNode = candidate;
    }
  }

  if (!bestNode) {
    return;
  }

  const bestTextLength = textLength(bestNode);
  const isSignificantShare = bestTextLength >= Math.floor(bodyTextLength * 0.28);
  const bodyIsMuchLarger = bodyTextLength >= bestTextLength * (aggressive ? 1.2 : 1.6);
  const minScore = aggressive ? 220 : 300;

  if (bestScore < minScore || !isSignificantShare || !bodyIsMuchLarger) {
    return;
  }

  body.innerHTML = bestNode.outerHTML;
}

function pruneEmptyElements(document: Document): void {
  let changed = true;
  while (changed) {
    changed = false;
    const elements = [...document.body.querySelectorAll("*")];

    for (const el of elements) {
      if (el.children.length > 0) {
        continue;
      }

      const tag = el.tagName.toLowerCase();
      if (["br", "hr", "img", "td", "th"].includes(tag)) {
        continue;
      }

      const text = normalizeWhitespace(el.textContent ?? "");
      if (!text) {
        el.remove();
        changed = true;
      }
    }
  }
}

export function cleanHtml(rawHtml: string, options: TransformOptions): CleanResult {
  const dom = new JSDOM(wrapHtml(rawHtml));
  const { document } = dom.window;

  for (const tag of NOISE_TAGS) {
    removeByTagName(document, tag);
  }

  removeNoiseContainers(document, options.aggressive);

  if (!options.keepImages) {
    for (const tag of ["img", "picture", "source", "figure"]) {
      removeByTagName(document, tag);
    }
  }

  if (!options.preserveTables) {
    removeByTagName(document, "table");
  }

  if (!options.keepLinks) {
    unwrapElements(document, "a");
  }

  for (const node of [...document.querySelectorAll("button,summary")]) {
    replaceWithText(node);
  }

  stripAttributes(document);
  normalizeHeadingLevels(document, options.maxHeadingLevel);
  isolatePrimaryContent(document, options.aggressive);
  pruneEmptyElements(document);

  const cleanedHtml = document.body.innerHTML.trim();
  return { cleanedHtml };
}
