import { describe, expect, test } from "bun:test";
import { readFile, unlink } from "node:fs/promises";

interface CliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function uniqueStatsPath(): string {
  return `${process.cwd()}/.tmp/glean-test-${Date.now()}-${Math.random()
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
      GLEAN_STATS_PATH: resolvedStatsPath,
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

describe("glean cli", () => {
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
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.mode).toBe("clean");
    expect(parsed.outputChars).toBeLessThan(parsed.inputChars);
    expect(parsed.outputTokensEstimate).toBeLessThan(parsed.inputTokensEstimate);
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
      result.stderr.includes("Input HTML is empty.");
    expect(hasExpectedMessage).toBe(true);
  });

  test("tui flag requires a tty", async () => {
    const result = await runCli(["--tui"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("requires an interactive terminal");
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
