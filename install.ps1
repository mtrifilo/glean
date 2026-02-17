param(
  [string]$Repo = $env:GLEAN_REPO,
  [string]$Version = $env:GLEAN_VERSION,
  [string]$InstallDir = $env:GLEAN_INSTALL_DIR
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Repo)) {
  throw "Missing repository. Set GLEAN_REPO or pass -Repo owner/repo."
}

if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = "latest"
}

if ([string]::IsNullOrWhiteSpace($InstallDir)) {
  $InstallDir = Join-Path $HOME ".glean\bin"
}

$archRaw = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
switch ($archRaw) {
  "x64" { $arch = "x64" }
  "arm64" { throw "Windows arm64 binaries are not published yet. Use Bun-based install from source for now." }
  default { throw "Unsupported architecture: $archRaw" }
}

$assetName = "glean-windows-$arch.exe"

if ($Version -eq "latest") {
  $apiUrl = "https://api.github.com/repos/$Repo/releases/latest"
} else {
  $apiUrl = "https://api.github.com/repos/$Repo/releases/tags/$Version"
}

Write-Host "Fetching release metadata for $Repo ($Version)..."
$release = Invoke-RestMethod -Uri $apiUrl
$asset = $release.assets | Where-Object { $_.name -eq $assetName } | Select-Object -First 1
if (-not $asset) {
  throw "Could not find release asset '$assetName' for $Repo."
}

$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("glean-install-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmpDir | Out-Null

try {
  $binaryPath = Join-Path $tmpDir $assetName
  Write-Host "Downloading $assetName..."
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $binaryPath

  $checksumsAsset = $release.assets | Where-Object { $_.name -eq "checksums.txt" } | Select-Object -First 1
  if ($checksumsAsset) {
    Write-Host "Verifying checksum..."
    $checksumsPath = Join-Path $tmpDir "checksums.txt"
    Invoke-WebRequest -Uri $checksumsAsset.browser_download_url -OutFile $checksumsPath
    $expectedLine = Get-Content $checksumsPath | Where-Object { $_ -match "\s$assetName$" } | Select-Object -First 1
    if ($expectedLine) {
      $expectedHash = ($expectedLine -split '\s+')[0].ToLowerInvariant()
      $actualHash = (Get-FileHash -Algorithm SHA256 -Path $binaryPath).Hash.ToLowerInvariant()
      if ($actualHash -ne $expectedHash) {
        throw "Checksum mismatch for $assetName."
      }
    } else {
      Write-Warning "No checksum entry found for $assetName. Skipping verification."
    }
  }

  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  $targetPath = Join-Path $InstallDir "glean.exe"
  Copy-Item -Path $binaryPath -Destination $targetPath -Force
  Write-Host "Installed glean to $targetPath"

  $pathEntries = ($env:Path -split ';')
  if ($pathEntries -notcontains $InstallDir) {
    Write-Host "Note: '$InstallDir' is not currently in PATH."
    Write-Host "Add it to PATH, then run: glean --help"
  } else {
    Write-Host "Run: glean --help"
  }
}
finally {
  if (Test-Path $tmpDir) {
    Remove-Item -Recurse -Force $tmpDir
  }
}
