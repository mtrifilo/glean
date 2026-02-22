import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { ContentStats } from "./types";

interface AggregateStats {
  runs: number;
  inputChars: number;
  outputChars: number;
  charsSaved: number;
  inputTokensEstimate: number;
  outputTokensEstimate: number;
  tokensSaved: number;
}

interface StatsStore {
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  lifetime: AggregateStats;
  daily: Record<string, AggregateStats>;
}

export interface SessionStatsSummary {
  available: boolean;
  statsPath: string;
  todayKey: string;
  today: AggregateStats;
  lifetime: AggregateStats;
}

function emptyAggregate(): AggregateStats {
  return {
    runs: 0,
    inputChars: 0,
    outputChars: 0,
    charsSaved: 0,
    inputTokensEstimate: 0,
    outputTokensEstimate: 0,
    tokensSaved: 0,
  };
}

function createEmptyStore(nowIso: string): StatsStore {
  return {
    schemaVersion: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    lifetime: emptyAggregate(),
    daily: {},
  };
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeAggregate(value: unknown): AggregateStats {
  if (!value || typeof value !== "object") {
    return emptyAggregate();
  }

  const rec = value as Record<string, unknown>;
  return {
    runs: numberOrZero(rec.runs),
    inputChars: numberOrZero(rec.inputChars),
    outputChars: numberOrZero(rec.outputChars),
    charsSaved: numberOrZero(rec.charsSaved),
    inputTokensEstimate: numberOrZero(rec.inputTokensEstimate),
    outputTokensEstimate: numberOrZero(rec.outputTokensEstimate),
    tokensSaved: numberOrZero(rec.tokensSaved),
  };
}

function normalizeStore(value: unknown, nowIso: string): StatsStore {
  if (!value || typeof value !== "object") {
    return createEmptyStore(nowIso);
  }

  const rec = value as Record<string, unknown>;
  const dailyRaw = rec.daily;
  const daily: Record<string, AggregateStats> = {};

  if (dailyRaw && typeof dailyRaw === "object") {
    for (const [key, entry] of Object.entries(dailyRaw as Record<string, unknown>)) {
      daily[key] = normalizeAggregate(entry);
    }
  }

  const createdAt =
    typeof rec.createdAt === "string" && rec.createdAt.length > 0 ? rec.createdAt : nowIso;
  const updatedAt =
    typeof rec.updatedAt === "string" && rec.updatedAt.length > 0 ? rec.updatedAt : nowIso;

  return {
    schemaVersion: 1,
    createdAt,
    updatedAt,
    lifetime: normalizeAggregate(rec.lifetime),
    daily,
  };
}

function resolveStatsPath(): string {
  const override = process.env.DECANT_STATS_PATH?.trim();
  if (override) {
    return override;
  }

  const xdgStateHome = process.env.XDG_STATE_HOME?.trim();
  if (xdgStateHome) {
    return join(xdgStateHome, "decant", "stats.json");
  }

  return join(homedir(), ".decant", "stats.json");
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function applyRun(target: AggregateStats, runStats: ContentStats): void {
  target.runs += 1;
  target.inputChars += runStats.inputChars;
  target.outputChars += runStats.outputChars;
  target.charsSaved += runStats.charReduction;
  target.inputTokensEstimate += runStats.inputTokensEstimate;
  target.outputTokensEstimate += runStats.outputTokensEstimate;
  target.tokensSaved += runStats.tokenReduction;
}

function mergeAggregate(a: AggregateStats, b: AggregateStats): AggregateStats {
  return {
    runs: a.runs + b.runs,
    inputChars: a.inputChars + b.inputChars,
    outputChars: a.outputChars + b.outputChars,
    charsSaved: a.charsSaved + b.charsSaved,
    inputTokensEstimate: a.inputTokensEstimate + b.inputTokensEstimate,
    outputTokensEstimate: a.outputTokensEstimate + b.outputTokensEstimate,
    tokensSaved: a.tokensSaved + b.tokensSaved,
  };
}

function mergeStores(target: StatsStore, source: StatsStore): StatsStore {
  const merged = { ...target };
  merged.lifetime = mergeAggregate(target.lifetime, source.lifetime);
  merged.createdAt =
    source.createdAt < target.createdAt ? source.createdAt : target.createdAt;
  const allDays = new Set([
    ...Object.keys(target.daily),
    ...Object.keys(source.daily),
  ]);
  for (const day of allDays) {
    const a = target.daily[day] ?? emptyAggregate();
    const b = source.daily[day] ?? emptyAggregate();
    merged.daily[day] = mergeAggregate(a, b);
  }
  return merged;
}

/** Resolve the pre-rename stats path (~/.glean/stats.json). */
function legacyStatsPath(): string {
  return join(homedir(), ".glean", "stats.json");
}

async function loadStore(path: string, nowIso: string): Promise<StatsStore> {
  let store: StatsStore;
  try {
    const raw = await readFile(path, "utf8");
    store = normalizeStore(JSON.parse(raw), nowIso);
  } catch {
    store = createEmptyStore(nowIso);
  }

  // One-time migration: merge stats from the pre-rename ~/.glean/stats.json
  const legacy = legacyStatsPath();
  if (path !== legacy && existsSync(legacy)) {
    try {
      const raw = await readFile(legacy, "utf8");
      const legacyStore = normalizeStore(JSON.parse(raw), nowIso);
      store = mergeStores(store, legacyStore);
      // Remove legacy file so we only migrate once
      const { unlink } = await import("node:fs/promises");
      await unlink(legacy);
    } catch {
      // Ignore migration errors — don't block normal operation
    }
  }

  return store;
}

async function saveStore(path: string, store: StatsStore): Promise<boolean> {
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(store, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

function toSummary(available: boolean, statsPath: string, store: StatsStore): SessionStatsSummary {
  const day = todayKey();
  return {
    available,
    statsPath,
    todayKey: day,
    today: store.daily[day] ?? emptyAggregate(),
    lifetime: store.lifetime,
  };
}

export async function recordRunStats(runStats: ContentStats): Promise<SessionStatsSummary> {
  const statsPath = resolveStatsPath();
  const nowIso = new Date().toISOString();
  const day = todayKey();

  const store = await loadStore(statsPath, nowIso);
  if (!store.daily[day]) {
    store.daily[day] = emptyAggregate();
  }

  applyRun(store.lifetime, runStats);
  applyRun(store.daily[day], runStats);
  store.updatedAt = nowIso;

  const available = await saveStore(statsPath, store);
  return toSummary(available, statsPath, store);
}

export async function readSessionStatsSummary(): Promise<SessionStatsSummary> {
  const statsPath = resolveStatsPath();
  const nowIso = new Date().toISOString();
  const store = await loadStore(statsPath, nowIso);

  return toSummary(true, statsPath, store);
}
