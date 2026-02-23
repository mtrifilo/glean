import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Server } from "bun";
import { readFile, unlink } from "node:fs/promises";

interface CliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function uniqueStatsPath(): string {
  return `${process.cwd()}/.tmp/decant-test-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.json`;
}

const textEncoder = new TextEncoder();

async function runCli(args: string[], input?: string, statsPath?: string): Promise<CliRunResult> {
  const resolvedStatsPath = statsPath ?? uniqueStatsPath();
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: process.cwd(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      DECANT_STATS_PATH: resolvedStatsPath,
    },
  });

  if (proc.stdin && typeof proc.stdin !== "number") {
    if (typeof input === "string") {
      proc.stdin.write(textEncoder.encode(input));
    }
    proc.stdin.end();
  }

  if (!proc.stdout || typeof proc.stdout === "number") {
    throw new Error("Expected spawned process stdout to be a readable stream.");
  }

  if (!proc.stderr || typeof proc.stderr === "number") {
    throw new Error("Expected spawned process stderr to be a readable stream.");
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

async function readFixture(name: string): Promise<string> {
  return Bun.file(`test/fixtures/${name}`).text();
}

describe("decant cli", () => {
  test("clean reads from file and matches snapshot", async () => {
    const expected = (await readFixture("blog.expected.md")).trim();
    const result = await runCli(["clean", "-i", "test/fixtures/blog.html"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(expected);
  });

  test("clean reads from stdin", async () => {
    const input = await readFixture("docs.html");
    const expected = (await readFixture("docs.expected.md")).trim();
    const result = await runCli(["clean"], input);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(expected);
  });

  test("no-arg mode still supports stdin pipelines for scripts", async () => {
    const input = await readFixture("docs.html");
    const expected = (await readFixture("docs.expected.md")).trim();
    const result = await runCli([], input);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(expected);
  });

  test("no-arg mode supports --mode flag for script runs", async () => {
    const input = await readFixture("article-with-noise.html");
    const expected = (await readFixture("article-with-noise.extract.expected.md")).trim();
    const result = await runCli(["--mode", "extract"], input);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(expected);
  });

  test("extract command outputs expected article markdown", async () => {
    const expected = (await readFixture("article-with-noise.extract.expected.md")).trim();
    const result = await runCli(["extract", "-i", "test/fixtures/article-with-noise.html"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(expected);
  });

  test("stats supports json format", async () => {
    const result = await runCli(["stats", "-i", "test/fixtures/marketing.html", "--format", "json"]);
    const parsed = JSON.parse(result.stdout) as {
      mode: string;
      inputChars: number;
      outputChars: number;
      inputTokensEstimate: number;
      outputTokensEstimate: number;
      sourceFormat?: string;
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.mode).toBe("clean");
    expect(parsed.outputChars).toBeLessThan(parsed.inputChars);
    expect(parsed.outputTokensEstimate).toBeLessThan(parsed.inputTokensEstimate);
    expect(parsed.sourceFormat).toBeUndefined();
  });

  test("strip-links removes markdown links", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/blog.html", "--strip-links"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("industry report");
    expect(result.stdout).not.toContain("](");
  });

  test("missing input returns a clear error", async () => {
    const result = await runCli(["clean"]);

    expect(result.exitCode).toBe(1);
    const hasExpectedMessage =
      result.stderr.includes("No input detected") ||
      result.stderr.includes("Input is empty.");
    expect(hasExpectedMessage).toBe(true);
  });

  test("tui flag requires a tty", async () => {
    const result = await runCli(["--tui"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("requires an interactive terminal");
  });
});

describe("DOCX input", () => {
  test("clean converts DOCX file via --input", async () => {
    const expected = (await readFixture("sample.docx.expected.md")).trim();
    const result = await runCli(["clean", "-i", "test/fixtures/sample.docx"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(expected);
  });

  test("extract converts DOCX file", async () => {
    const result = await runCli(["extract", "-i", "test/fixtures/sample.docx"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Sample Document");
    expect(result.stdout).toContain("Section One");
  });

  test("stats works with DOCX file input and includes source metadata", async () => {
    const result = await runCli(["stats", "-i", "test/fixtures/sample.docx", "--format", "json"]);
    const parsed = JSON.parse(result.stdout) as {
      inputChars: number;
      outputChars: number;
      sourceFormat?: string;
      sourceChars?: number;
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.inputChars).toBeGreaterThan(0);
    expect(parsed.sourceFormat).toBe("docx");
    expect(parsed.sourceChars).toBeGreaterThan(0);
  });

  test("--verbose flag is accepted", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/sample.docx", "--verbose"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Sample Document");
  });
});

describe("PDF input", () => {
  test("clean converts PDF file via --input", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/sample.pdf"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Introduction to Testing");
    expect(result.stdout).toContain("Key Features");
  });

  test("extract converts PDF file via --input", async () => {
    const result = await runCli(["extract", "-i", "test/fixtures/sample.pdf"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Introduction to Testing");
    expect(result.stdout).toContain("decant CLI tool");
  });

  test("stats works with PDF file input and includes source metadata", async () => {
    const result = await runCli(["stats", "-i", "test/fixtures/sample.pdf", "--format", "json"]);
    const parsed = JSON.parse(result.stdout) as {
      inputChars: number;
      outputChars: number;
      sourceFormat?: string;
      sourceChars?: number;
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.inputChars).toBeGreaterThan(0);
    expect(parsed.sourceFormat).toBe("pdf");
    expect(parsed.sourceChars).toBeGreaterThan(0);
  });

  test("--verbose flag is accepted", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/sample.pdf", "--verbose"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Introduction to Testing");
    expect(result.stderr).toContain("page(s)");
  });
});

const isMacOS = process.platform === "darwin";

describe("RTF/DOC input", () => {
  test.skipIf(!isMacOS)("clean converts RTF file via --input", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/sample.rtf"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Hello World");
  });

  test.skipIf(!isMacOS)("clean converts RTF piped via stdin", async () => {
    const rtf = await readFixture("sample.rtf");
    const result = await runCli(["clean"], rtf);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Hello World");
  });

  test.skipIf(!isMacOS)("stats works with RTF file input", async () => {
    const result = await runCli(["stats", "-i", "test/fixtures/sample.rtf", "--format", "json"]);
    const parsed = JSON.parse(result.stdout) as {
      inputChars: number;
      outputChars: number;
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.inputChars).toBeGreaterThan(0);
  });
});

describe("URL input", () => {
  let urlServer: Server;
  let urlBase: string;

  beforeAll(() => {
    urlServer = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/page") {
          return new Response(
            "<html><head><title>Test Page</title></head><body><h1>Hello from URL</h1><p>This is fetched content.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }
        return new Response("Not Found", { status: 404 });
      },
    });
    urlBase = `http://localhost:${urlServer.port}`;
  });

  afterAll(() => {
    urlServer.stop(true);
  });

  test("clean converts URL via --url", async () => {
    const result = await runCli(["clean", "--url", `${urlBase}/page`]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Hello from URL");
    expect(result.stdout).toContain("fetched content");
  });

  test("extract converts URL via --url", async () => {
    const result = await runCli(["extract", "--url", `${urlBase}/page`]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Hello from URL");
  });

  test("stats works with URL and includes sourceFormat", async () => {
    const result = await runCli(["stats", "--url", `${urlBase}/page`, "--format", "json"]);
    const parsed = JSON.parse(result.stdout) as {
      sourceFormat?: string;
      sourceChars?: number;
      inputChars: number;
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.sourceFormat).toBe("url");
    expect(parsed.sourceChars).toBeGreaterThan(0);
  });

  test("--url and --input together errors", async () => {
    const result = await runCli(["clean", "--url", `${urlBase}/page`, "-i", "test/fixtures/blog.html"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot use --input and --url together");
  });

  test("--url with invalid URL errors", async () => {
    const result = await runCli(["clean", "--url", "not-a-url"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid URL");
  });

  test("--url with HTTP 404 errors", async () => {
    const result = await runCli(["clean", "--url", `${urlBase}/nonexistent`]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("HTTP 404");
  });

  test("--verbose logs fetch details", async () => {
    const result = await runCli(["clean", "--url", `${urlBase}/page`, "--verbose"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Fetching");
    expect(result.stderr).toContain("chars received");
  });

  test("-u short flag works", async () => {
    const result = await runCli(["clean", "-u", `${urlBase}/page`]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Hello from URL");
  });
});

describe("lifetime stats accumulation", () => {
  test("lifetime totals accumulate across multiple runs", async () => {
    const statsPath = uniqueStatsPath();

    // Run 1
    const run1 = await runCli(["clean", "-i", "test/fixtures/blog.html"], undefined, statsPath);
    expect(run1.exitCode).toBe(0);

    const storeAfterRun1 = JSON.parse(await readFile(statsPath, "utf8")) as {
      lifetime: { runs: number; tokensSaved: number };
    };
    expect(storeAfterRun1.lifetime.runs).toBe(1);
    const tokensSavedAfterRun1 = storeAfterRun1.lifetime.tokensSaved;
    expect(tokensSavedAfterRun1).toBeGreaterThan(0);

    // Run 2 — same stats file
    const run2 = await runCli(["clean", "-i", "test/fixtures/docs.html"], undefined, statsPath);
    expect(run2.exitCode).toBe(0);

    const storeAfterRun2 = JSON.parse(await readFile(statsPath, "utf8")) as {
      lifetime: { runs: number; tokensSaved: number };
    };
    expect(storeAfterRun2.lifetime.runs).toBe(2);
    expect(storeAfterRun2.lifetime.tokensSaved).toBeGreaterThan(tokensSavedAfterRun1);

    // Cleanup
    try {
      await unlink(statsPath);
    } catch {
      // best-effort
    }
  });
});

describe("--max-tokens flag", () => {
  test("over budget piped: exitCode 1, empty stdout, stderr has Error: and section breakdown", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/docs.html", "--max-tokens", "10"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Error:");
    expect(result.stderr).toContain("budget: 10 tokens");
    expect(result.stderr).toContain("Suggestions:");
  });

  test("under budget piped: exitCode 0, normal output", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/docs.html", "--max-tokens", "99999"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stderr).not.toContain("Error:");
  });

  test("stats --max-tokens markdown format: includes budget lines + section table", async () => {
    const result = await runCli([
      "stats",
      "-i",
      "test/fixtures/docs.html",
      "--max-tokens",
      "10",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("max_tokens_budget: 10");
    expect(result.stdout).toContain("over_budget: yes");
    expect(result.stdout).toContain("Section breakdown");
  });

  test("stats --max-tokens --format json: has maxTokens, overBudget, sections array", async () => {
    const result = await runCli([
      "stats",
      "-i",
      "test/fixtures/docs.html",
      "--max-tokens",
      "10",
      "--format",
      "json",
    ]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      maxTokens?: number;
      overBudget?: boolean;
      sections?: Array<{ heading: string; level: number; tokens: number }>;
    };
    expect(parsed.maxTokens).toBe(10);
    expect(parsed.overBudget).toBe(true);
    expect(parsed.sections).toBeInstanceOf(Array);
    expect(parsed.sections!.length).toBeGreaterThan(0);
    expect(parsed.sections![0]).toHaveProperty("heading");
    expect(parsed.sections![0]).toHaveProperty("level");
    expect(parsed.sections![0]).toHaveProperty("tokens");
  });

  test("stats --max-tokens under budget shows overBudget false", async () => {
    const result = await runCli([
      "stats",
      "-i",
      "test/fixtures/docs.html",
      "--max-tokens",
      "99999",
      "--format",
      "json",
    ]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as { overBudget?: boolean };
    expect(parsed.overBudget).toBe(false);
  });

  test("invalid value (abc): exitCode 1, error message", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/docs.html", "--max-tokens", "abc"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--max-tokens must be a positive integer");
  });

  test("zero value: exitCode 1, error message", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/docs.html", "--max-tokens", "0"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--max-tokens must be a positive integer");
  });

  test("negative value: exitCode 1, error message", async () => {
    const result = await runCli(["clean", "-i", "test/fixtures/docs.html", "--max-tokens", "-5"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--max-tokens must be a positive integer");
  });
});
