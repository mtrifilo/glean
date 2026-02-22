#!/usr/bin/env bun

// Bun's tty.isatty() can falsely report non-TTY, causing chalk (used by
// marked-terminal) to disable colors. Set FORCE_COLOR before any module
// loads so every supports-color instance picks it up at evaluation time.
if (
  !("NO_COLOR" in process.env) &&
  !("FORCE_COLOR" in process.env) &&
  process.env.TERM !== "dumb"
) {
  process.env.FORCE_COLOR = "3";
}

await import("./cli.ts");
