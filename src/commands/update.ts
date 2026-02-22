import { createHash } from "node:crypto";
import { access, constants, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { version as localVersion } from "../../package.json";

const REPO_SLUG = "mtrifilo/decant";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface ReleasePayload {
  tag_name: string;
  assets: ReleaseAsset[];
}

interface UpdateOptions {
  force?: boolean;
}

export function parseVersion(tag: string): string {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}

export function isNewer(remote: string, local: string): boolean {
  const remoteParts = remote.split(".").map(Number);
  const localParts = local.split(".").map(Number);
  const length = Math.max(remoteParts.length, localParts.length);

  for (let i = 0; i < length; i++) {
    const r = remoteParts[i] ?? 0;
    const l = localParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }

  return false;
}

export function isCompiledBinary(): boolean {
  const script = process.argv[1] ?? "";
  if (script.endsWith(".ts") || script.endsWith(".js")) {
    return false;
  }

  if (process.execPath.includes("bun") || process.execPath.includes("node")) {
    return false;
  }

  return true;
}

export function detectPlatform(): string | null {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin" && arch === "arm64") return "decant-darwin-arm64";
  if (platform === "linux" && arch === "x64") return "decant-linux-x64";
  if (platform === "win32" && arch === "x64") return "decant-windows-x64.exe";

  return null;
}

export function parseChecksumsFile(content: string, assetName: string): string | null {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Format: <hash>  <filename>  (two spaces between)
    const match = trimmed.match(/^([a-f0-9]{64})\s+(.+)$/);
    if (match && match[2] === assetName) {
      return match[1];
    }
  }

  return null;
}

export function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function fetchLatestRelease(): Promise<ReleasePayload> {
  const url = `https://api.github.com/repos/${REPO_SLUG}/releases/latest`;
  const headers: Record<string, string> = {
    "User-Agent": "decant-self-update",
    Accept: "application/vnd.github+json",
  };

  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to check for updates (${response.status} ${response.statusText}).`,
    );
  }

  return (await response.json()) as ReleasePayload;
}

async function downloadAsset(url: string): Promise<Buffer> {
  const headers: Record<string, string> = {
    "User-Agent": "decant-self-update",
    Accept: "application/octet-stream",
  };

  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to download asset (${response.status} ${response.statusText}).`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function atomicSwap(binaryPath: string, newData: Buffer): Promise<void> {
  const dir = dirname(binaryPath);
  const tmpPath = join(dir, `.decant-update-${Date.now()}.tmp`);

  try {
    await writeFile(tmpPath, newData, { mode: 0o755 });
    await rename(tmpPath, binaryPath);
  } catch (error) {
    try {
      await unlink(tmpPath);
    } catch {
      // best-effort cleanup
    }
    throw error;
  }
}

export async function runUpdate(options: UpdateOptions = {}): Promise<void> {
  // Step 1: bail if running from source
  if (!isCompiledBinary()) {
    process.stderr.write(
      "You are running decant from source. Self-update is only available for compiled binaries.\n" +
        "To update, run: git pull && bun install\n",
    );
    return;
  }

  // Step 2: detect platform
  const assetName = detectPlatform();
  if (!assetName) {
    throw new Error(
      `Unsupported platform: ${process.platform}-${process.arch}. ` +
        "Self-update is available for darwin-arm64, linux-x64, and windows-x64.",
    );
  }

  // Step 3: fetch latest release
  process.stderr.write("Checking for updates...\n");
  const release = await fetchLatestRelease();
  const remoteVersion = parseVersion(release.tag_name);

  // Step 4: compare versions
  if (!options.force && !isNewer(remoteVersion, localVersion)) {
    process.stderr.write(
      `Already up to date (v${localVersion}).\n`,
    );
    return;
  }

  process.stderr.write(
    `Updating v${localVersion} -> v${remoteVersion}...\n`,
  );

  // Step 5: find binary + checksums assets
  const binaryAsset = release.assets.find((a) => a.name === assetName);
  if (!binaryAsset) {
    throw new Error(
      `Release ${release.tag_name} does not include ${assetName}.`,
    );
  }

  const checksumsAsset = release.assets.find((a) => a.name === "checksums.txt");

  // Step 6: check binary path is writable before downloading
  const binaryPath = await realpath(process.execPath);
  try {
    await access(binaryPath, constants.W_OK);
  } catch {
    throw new Error(
      `Cannot write to ${binaryPath}. Try running with elevated permissions.`,
    );
  }

  // Step 7: download binary
  process.stderr.write("Downloading...\n");
  const binaryData = await downloadAsset(binaryAsset.browser_download_url);

  // Step 8: verify SHA256 checksum
  if (checksumsAsset) {
    const checksumsData = await downloadAsset(checksumsAsset.browser_download_url);
    const checksumsContent = checksumsData.toString("utf8");
    const expectedHash = parseChecksumsFile(checksumsContent, assetName);

    if (expectedHash) {
      const actualHash = sha256(binaryData);
      if (actualHash !== expectedHash) {
        throw new Error(
          `Checksum mismatch for ${assetName}.\n` +
            `  Expected: ${expectedHash}\n` +
            `  Got:      ${actualHash}`,
        );
      }
    } else {
      process.stderr.write(
        `Warning: no checksum entry found for ${assetName} in checksums.txt. Skipping verification.\n`,
      );
    }
  } else {
    process.stderr.write(
      "Warning: checksums.txt not found in release. Skipping checksum verification.\n",
    );
  }

  // Step 9: atomic swap
  await atomicSwap(binaryPath, binaryData);

  // Step 10: success
  process.stderr.write(
    `Successfully updated decant to v${remoteVersion}.\n`,
  );
}
