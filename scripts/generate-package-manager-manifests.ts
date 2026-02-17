#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  digest?: string;
}

interface ReleasePayload {
  tag_name: string;
  assets: ReleaseAsset[];
}

interface CliArgs {
  tag?: string;
  owner: string;
  repo: string;
}

function parseArgs(argv: string[]): CliArgs {
  const parsed: CliArgs = {
    owner: process.env.GLEAN_GITHUB_OWNER ?? "mtrifilo",
    repo: process.env.GLEAN_GITHUB_REPO ?? "glean",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--tag" && next) {
      parsed.tag = next;
      index += 1;
      continue;
    }

    if (arg === "--owner" && next) {
      parsed.owner = next;
      index += 1;
      continue;
    }

    if (arg === "--repo" && next) {
      parsed.repo = next;
      index += 1;
      continue;
    }
  }

  return parsed;
}

function normalizeTag(rawTag: string): string {
  if (rawTag.startsWith("v")) {
    return rawTag;
  }

  return `v${rawTag}`;
}

function versionFromTag(tag: string): string {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}

function shaFromDigest(asset: ReleaseAsset): string | null {
  if (!asset.digest) {
    return null;
  }

  const [algorithm, hash] = asset.digest.split(":");
  if (algorithm !== "sha256" || !hash) {
    return null;
  }

  return hash;
}

async function fetchJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    "User-Agent": "glean-package-manager-generator",
    Accept: "application/vnd.github+json",
  };

  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? process.env.GLEAN_GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed for ${url} (${response.status} ${response.statusText}).`);
  }

  return (await response.json()) as T;
}

async function downloadSha256(url: string): Promise<string> {
  const headers: Record<string, string> = {
    "User-Agent": "glean-package-manager-generator",
  };

  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? process.env.GLEAN_GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Download failed for ${url} (${response.status} ${response.statusText}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return createHash("sha256").update(buffer).digest("hex");
}

function requireAsset(assets: ReleaseAsset[], name: string): ReleaseAsset {
  const asset = assets.find((entry) => entry.name === name);
  if (!asset) {
    throw new Error(`Release asset not found: ${name}`);
  }
  return asset;
}

async function resolveSha(asset: ReleaseAsset): Promise<string> {
  const fromDigest = shaFromDigest(asset);
  if (fromDigest) {
    return fromDigest;
  }

  return await downloadSha256(asset.browser_download_url);
}

function renderHomebrewFormula(input: {
  owner: string;
  repo: string;
  version: string;
  tag: string;
  darwinArmUrl: string;
  darwinArmSha: string;
  linuxX64Url: string;
  linuxX64Sha: string;
  sourceTarballSha: string;
}): string {
  return `class Glean < Formula
  desc "Clean noisy HTML into compact markdown for LLM context"
  homepage "https://github.com/${input.owner}/${input.repo}"
  license "MIT"
  version "${input.version}"

  url "https://github.com/${input.owner}/${input.repo}/archive/refs/tags/${input.tag}.tar.gz"
  sha256 "${input.sourceTarballSha}"

  on_macos do
    if Hardware::CPU.arm?
      url "${input.darwinArmUrl}"
      sha256 "${input.darwinArmSha}"
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "${input.linuxX64Url}"
      sha256 "${input.linuxX64Sha}"
    end
  end

  def install
    binary_name =
      if OS.mac? && Hardware::CPU.arm?
        "glean-darwin-arm64"
      elsif OS.linux? && Hardware::CPU.intel?
        "glean-linux-x64"
      else
        odie <<~EOS
          Prebuilt binaries are currently available for:
            - macOS arm64
            - Linux x64
            - Windows x64 (via Scoop/installer)

          For unsupported platforms, use source install:
            bun install
            bun link
        EOS
      end

    bin.install binary_name => "glean"
  end

  test do
    assert_match "Usage: glean", shell_output("#{bin}/glean --help")
  end
end
`;
}

function renderScoopManifest(input: {
  owner: string;
  repo: string;
  version: string;
  windowsX64Url: string;
  windowsX64Sha: string;
}): string {
  const payload = {
    version: input.version,
    description: "Clean noisy HTML and convert it to markdown for LLM context.",
    homepage: `https://github.com/${input.owner}/${input.repo}`,
    license: "MIT",
    architecture: {
      "64bit": {
        url: input.windowsX64Url,
        hash: input.windowsX64Sha,
      },
    },
    bin: "glean-windows-x64.exe",
    checkver: {
      github: `https://github.com/${input.owner}/${input.repo}`,
    },
    autoupdate: {
      architecture: {
        "64bit": {
          url: `https://github.com/${input.owner}/${input.repo}/releases/download/v$version/glean-windows-x64.exe`,
        },
      },
    },
    notes: [
      `If you hit an issue, open a report: https://github.com/${input.owner}/${input.repo}/issues`,
    ],
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.tag) {
    throw new Error("Missing --tag. Example: bun run scripts/generate-package-manager-manifests.ts -- --tag v0.1.3");
  }

  const tag = normalizeTag(args.tag);
  const version = versionFromTag(tag);
  const releaseUrl = `https://api.github.com/repos/${args.owner}/${args.repo}/releases/tags/${tag}`;
  const release = await fetchJson<ReleasePayload>(releaseUrl);

  const darwinArmAsset = requireAsset(release.assets, "glean-darwin-arm64");
  const linuxX64Asset = requireAsset(release.assets, "glean-linux-x64");
  const windowsX64Asset = requireAsset(release.assets, "glean-windows-x64.exe");

  const [darwinArmSha, linuxX64Sha, windowsX64Sha, sourceTarballSha] = await Promise.all([
    resolveSha(darwinArmAsset),
    resolveSha(linuxX64Asset),
    resolveSha(windowsX64Asset),
    downloadSha256(`https://github.com/${args.owner}/${args.repo}/archive/refs/tags/${tag}.tar.gz`),
  ]);

  const formula = renderHomebrewFormula({
    owner: args.owner,
    repo: args.repo,
    version,
    tag,
    darwinArmUrl: darwinArmAsset.browser_download_url,
    darwinArmSha,
    linuxX64Url: linuxX64Asset.browser_download_url,
    linuxX64Sha,
    sourceTarballSha,
  });

  const scoopManifest = renderScoopManifest({
    owner: args.owner,
    repo: args.repo,
    version,
    windowsX64Url: windowsX64Asset.browser_download_url,
    windowsX64Sha,
  });

  const homebrewDir = join("packaging", "homebrew");
  const scoopDir = join("packaging", "scoop");
  await mkdir(homebrewDir, { recursive: true });
  await mkdir(scoopDir, { recursive: true });

  await writeFile(join(homebrewDir, "glean.rb"), formula, "utf8");
  await writeFile(join(scoopDir, "glean.json"), scoopManifest, "utf8");

  process.stdout.write(`Generated:\n- ${join(homebrewDir, "glean.rb")}\n- ${join(scoopDir, "glean.json")}\n`);
}

await main();
