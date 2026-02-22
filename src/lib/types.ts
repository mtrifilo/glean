export type StatsFormat = "md" | "json";
export type StatsMode = "clean" | "extract";

export interface TransformOptions {
  keepLinks: boolean;
  keepImages: boolean;
  preserveTables: boolean;
  maxHeadingLevel: number;
  aggressive: boolean;
}

export interface InputOptions {
  input?: string;
  copy?: boolean;
}

export interface CleanResult {
  cleanedHtml: string;
}

export interface ExtractResult {
  cleanedHtml: string;
  usedReadability: boolean;
  extractionReason: string;
}

export interface ContentStats {
  mode: StatsMode;
  inputChars: number;
  outputChars: number;
  inputTokensEstimate: number;
  outputTokensEstimate: number;
  charReduction: number;
  charReductionPct: number;
  tokenReduction: number;
  tokenReductionPct: number;
  sourceFormat?: string;
  sourceChars?: number;
}
