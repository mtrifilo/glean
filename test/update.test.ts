import { describe, expect, test } from "bun:test";
import { version } from "../package.json";
import {
  detectPlatform,
  isCompiledBinary,
  isNewer,
  parseChecksumsFile,
  parseVersion,
} from "../src/commands/update";

interface CliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runCli(args: string[]): Promise<CliRunResult> {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: process.cwd(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  if (proc.stdin && typeof proc.stdin !== "number") {
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

describe("parseVersion", () => {
  test("strips v prefix", () => {
    expect(parseVersion("v1.2.3")).toBe("1.2.3");
  });

  test("returns unchanged when no prefix", () => {
    expect(parseVersion("1.2.3")).toBe("1.2.3");
  });

  test("strips v from v0.0.1", () => {
    expect(parseVersion("v0.0.1")).toBe("0.0.1");
  });
});

describe("isNewer", () => {
  test("returns true when remote major is greater", () => {
    expect(isNewer("2.0.0", "1.0.0")).toBe(true);
  });

  test("returns true when remote minor is greater", () => {
    expect(isNewer("1.1.0", "1.0.0")).toBe(true);
  });

  test("returns true when remote patch is greater", () => {
    expect(isNewer("1.0.1", "1.0.0")).toBe(true);
  });

  test("returns false when versions are equal", () => {
    expect(isNewer("1.0.0", "1.0.0")).toBe(false);
  });

  test("returns false when local is newer", () => {
    expect(isNewer("1.0.0", "1.0.1")).toBe(false);
  });

  test("handles different segment lengths", () => {
    expect(isNewer("1.0.0.1", "1.0.0")).toBe(true);
    expect(isNewer("1.0.0", "1.0.0.1")).toBe(false);
  });
});

describe("parseChecksumsFile", () => {
  const darwinHash = "a".repeat(64);
  const linuxHash = "b".repeat(64);
  const windowsHash = "c".repeat(64);

  const content = [
    `${darwinHash}  decant-darwin-arm64`,
    `${linuxHash}  decant-linux-x64`,
    `${windowsHash}  decant-windows-x64.exe`,
  ].join("\n");

  test("finds matching asset hash", () => {
    expect(parseChecksumsFile(content, "decant-linux-x64")).toBe(linuxHash);
  });

  test("returns null for unknown asset", () => {
    expect(parseChecksumsFile(content, "decant-freebsd-x64")).toBeNull();
  });

  test("handles empty content", () => {
    expect(parseChecksumsFile("", "decant-darwin-arm64")).toBeNull();
  });

  test("handles trailing newlines", () => {
    expect(parseChecksumsFile(content + "\n\n", "decant-windows-x64.exe")).toBe(windowsHash);
  });
});

describe("detectPlatform", () => {
  test("returns a string or null", () => {
    const result = detectPlatform();
    // On any CI/dev machine this should return a known value or null
    if (result !== null) {
      expect(result).toMatch(/^decant-/);
    }
  });
});

describe("isCompiledBinary", () => {
  test("returns false when running from source via bun", () => {
    // When tests run under bun, process.argv[1] ends in .ts and execPath contains bun
    expect(isCompiledBinary()).toBe(false);
  });
});

describe("decant update (source mode)", () => {
  test("prints source-mode message and suggests git pull", async () => {
    const result = await runCli(["update"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("running decant from source");
    expect(result.stderr).toContain("git pull");
  });
});

describe("decant --version", () => {
  test("prints version matching package.json", async () => {
    const result = await runCli(["--version"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(version);
  });
});
