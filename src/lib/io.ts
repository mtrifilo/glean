import { fstatSync } from "node:fs";

export function hasPipedStdin(): boolean {
  try {
    const stdinStat = fstatSync(0);
    return stdinStat.isFIFO() || stdinStat.isFile() || stdinStat.isSocket();
  } catch {
    return !process.stdin.isTTY;
  }
}

export async function readInputBytes(inputPath?: string): Promise<Uint8Array> {
  if (inputPath) {
    const file = Bun.file(inputPath);
    if (!(await file.exists())) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    return new Uint8Array(await file.arrayBuffer());
  }

  if (!hasPipedStdin()) {
    throw new Error(
      "No input detected. Pipe input through stdin or pass --input <path>.",
    );
  }

  return new Uint8Array(await new Response(Bun.stdin.stream()).arrayBuffer());
}

export async function readInput(inputPath?: string): Promise<string> {
  if (inputPath) {
    const file = Bun.file(inputPath);
    if (!(await file.exists())) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    return file.text();
  }

  if (!hasPipedStdin()) {
    throw new Error(
      "No input detected. Pipe HTML through stdin or pass --input <path>.",
    );
  }

  const piped = await new Response(Bun.stdin.stream()).text();
  return piped;
}

export async function copyToClipboard(output: string): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("--copy currently supports macOS only.");
  }

  const proc = Bun.spawn(["pbcopy"], {
    stdin: "pipe",
    stdout: "ignore",
    stderr: "pipe",
  });

  if (!proc.stdin) {
    throw new Error("Unable to access pbcopy stdin.");
  }

  proc.stdin.write(output);
  proc.stdin.end();

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(
      stderr.trim() ||
        "pbcopy failed. Ensure clipboard access is available for this shell session.",
    );
  }
}

export async function readClipboardText(): Promise<string | null> {
  if (process.platform !== "darwin") {
    return null;
  }

  try {
    const proc = Bun.spawn(["pbpaste"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, output] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
    ]);

    if (exitCode !== 0) {
      return null;
    }

    return output;
  } catch {
    return null;
  }
}

export async function readClipboardRtf(): Promise<string | null> {
  if (process.platform !== "darwin") {
    return null;
  }

  try {
    const proc = Bun.spawn(["pbpaste", "-Prefer", "rtf"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, output] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
    ]);

    if (exitCode !== 0) {
      return null;
    }

    return output;
  } catch {
    return null;
  }
}

