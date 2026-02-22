/**
 * Lightweight ANSI color helpers — zero dependencies.
 * Respects NO_COLOR (https://no-color.org) and TERM=dumb.
 */

const enabled =
  !process.env.NO_COLOR &&
  process.env.TERM !== "dumb" &&
  (process.stdout.isTTY === true || "FORCE_COLOR" in process.env);

const wrap = (open: string, close: string) =>
  enabled ? (s: string) => `${open}${s}${close}` : (s: string) => s;

// Attributes
export const bold = wrap("\x1b[1m", "\x1b[22m");
export const dim = wrap("\x1b[2m", "\x1b[22m");

// 256-color palette (matching TUI hex codes)
// TUI #7dd3fc → ANSI 117 (bright sky blue)
export const accent = wrap("\x1b[38;5;117m", "\x1b[39m");
// TUI #4ade80 → ANSI 114 (green)
export const success = wrap("\x1b[38;5;114m", "\x1b[39m");
// TUI #6b7280 → ANSI 245 (gray)
export const muted = wrap("\x1b[38;5;245m", "\x1b[39m");
// TUI #fbbf24 → ANSI 214 (amber)
export const highlight = wrap("\x1b[38;5;214m", "\x1b[39m");
// TUI #94a3b8 → ANSI 146 (slate)
export const statLabel = wrap("\x1b[38;5;146m", "\x1b[39m");
// TUI #f1f5f9 → ANSI 253 (near-white)
export const statValue = wrap("\x1b[38;5;253m", "\x1b[39m");

/** Carriage-return + clear-to-end-of-line (for inline spinner updates). */
export const clearLine = () => process.stdout.write("\r\x1b[K");
