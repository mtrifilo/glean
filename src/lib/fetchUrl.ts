import { version } from "../../package.json";

const USER_AGENT = `Decant/${version} (https://github.com/mtrifilo/decant)`;
const DEFAULT_TIMEOUT_MS = 15_000;

export interface FetchUrlOptions {
  timeoutMs?: number;
  verbose?: boolean;
}

export interface FetchUrlResult {
  html: string;
  url: string;
  contentLength: number;
}

export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function fetchUrl(
  url: string,
  options?: FetchUrlOptions,
): Promise<FetchUrlResult> {
  if (!isValidUrl(url)) {
    throw new Error(`Invalid URL: "${url}" — only http:// and https:// URLs are supported.`);
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const verbose = options?.verbose ?? false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (verbose) {
    process.stderr.write(`Fetching ${url} ...\n`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !isHtmlContentType(contentType)) {
    throw new Error(
      `URL returned ${contentType} instead of HTML. Use --input for local files.`,
    );
  }

  const html = await response.text();

  if (verbose) {
    process.stderr.write(`HTTP ${response.status} — ${html.length} chars received\n`);
  }

  return {
    html,
    url: response.url,
    contentLength: html.length,
  };
}

function isHtmlContentType(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return lower.includes("text/html") || lower.includes("application/xhtml+xml");
}
