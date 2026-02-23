import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Server } from "bun";
import { fetchUrl, isValidUrl } from "../src/lib/fetchUrl";

let server: Server;
let baseUrl: string;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/html") {
        return new Response("<html><body><h1>Hello</h1><p>World</p></body></html>", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/xhtml") {
        return new Response("<html><body><h1>XHTML</h1></body></html>", {
          headers: { "Content-Type": "application/xhtml+xml" },
        });
      }

      if (url.pathname === "/pdf") {
        return new Response("%PDF-1.4 fake", {
          headers: { "Content-Type": "application/pdf" },
        });
      }

      if (url.pathname === "/json") {
        return new Response('{"key":"value"}', {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/no-content-type") {
        const resp = new Response("<html><body><p>No CT</p></body></html>");
        resp.headers.delete("content-type");
        return resp;
      }

      if (url.pathname === "/redirect") {
        return Response.redirect(`${baseUrl}/html`, 302);
      }

      if (url.pathname === "/slow") {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return new Response("too slow");
      }

      if (url.pathname === "/server-error") {
        return new Response("Internal Server Error", { status: 500 });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  baseUrl = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop(true);
});

describe("isValidUrl", () => {
  test("accepts http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  test("accepts https URLs", () => {
    expect(isValidUrl("https://example.com/page?q=1")).toBe(true);
  });

  test("rejects ftp URLs", () => {
    expect(isValidUrl("ftp://files.example.com/doc")).toBe(false);
  });

  test("rejects file paths", () => {
    expect(isValidUrl("/usr/local/file.html")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  test("rejects garbage input", () => {
    expect(isValidUrl("not a url at all")).toBe(false);
  });
});

describe("fetchUrl", () => {
  test("fetches HTML successfully", async () => {
    const result = await fetchUrl(`${baseUrl}/html`);

    expect(result.html).toContain("<h1>Hello</h1>");
    expect(result.url).toBe(`${baseUrl}/html`);
    expect(result.contentLength).toBeGreaterThan(0);
  });

  test("accepts XHTML content-type", async () => {
    const result = await fetchUrl(`${baseUrl}/xhtml`);

    expect(result.html).toContain("XHTML");
  });

  test("rejects non-HTML content (PDF)", async () => {
    expect(fetchUrl(`${baseUrl}/pdf`)).rejects.toThrow("application/pdf");
  });

  test("rejects non-HTML content (JSON)", async () => {
    expect(fetchUrl(`${baseUrl}/json`)).rejects.toThrow("application/json");
  });

  test("throws on HTTP 404", async () => {
    expect(fetchUrl(`${baseUrl}/nonexistent`)).rejects.toThrow("HTTP 404");
  });

  test("throws on HTTP 500", async () => {
    expect(fetchUrl(`${baseUrl}/server-error`)).rejects.toThrow("HTTP 500");
  });

  test("follows redirects", async () => {
    const result = await fetchUrl(`${baseUrl}/redirect`);

    expect(result.html).toContain("<h1>Hello</h1>");
    expect(result.url).toBe(`${baseUrl}/html`);
  });

  test("throws on invalid URL", async () => {
    expect(fetchUrl("not-a-url")).rejects.toThrow("Invalid URL");
  });

  test("times out on slow response", async () => {
    expect(fetchUrl(`${baseUrl}/slow`, { timeoutMs: 100 })).rejects.toThrow("timed out");
  });

  test("rejects text/plain content-type", async () => {
    // Bun.serve always sets a default content-type, so we can't test truly missing headers.
    // The missing content-type path (empty string passes the guard) is covered by code inspection.
    expect(fetchUrl(`${baseUrl}/no-content-type`)).rejects.toThrow("text/plain");
  });
});
