# Downloads ffmpeg + ffprobe static builds for Windows x64 and names them
# with the Rust target triple suffix Tauri's externalBin mechanism expects.
#
# Usage: from src-tauri/binaries/, run:
#   powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$ScriptDir = $PSScriptRoot
$TargetTriple = 'x86_64-pc-windows-msvc'
$ZipUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
$Sha256Url = "$ZipUrl.sha256"
$ZipPath = Join-Path $ScriptDir 'ffmpeg.zip'
$ExtractPath = Join-Path $ScriptDir '_ffmpeg_extracted'
$FfmpegDest  = Join-Path $ScriptDir "ffmpeg-$TargetTriple.exe"
$FfprobeDest = Join-Path $ScriptDir "ffprobe-$TargetTriple.exe"

if ((Test-Path $FfmpegDest) -and (Test-Path $FfprobeDest)) {
    Write-Host "Sidecars already present:" -ForegroundColor Green
    Write-Host "  $FfmpegDest"
    Write-Host "  $FfprobeDest"
    Write-Host "Delete them and re-run this script to refresh." -ForegroundColor DarkGray
    exit 0
}

try {
    Write-Host "Downloading ffmpeg static build from gyan.dev..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing

    Write-Host "Verifying SHA-256 checksum..." -ForegroundColor Cyan
    $ExpectedHash = (Invoke-WebRequest -Uri $Sha256Url -UseBasicParsing).Content.Trim().Split()[0].ToLowerInvariant()
    $ActualHash = (Get-FileHash -Path $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($ExpectedHash -ne $ActualHash) {
        throw "SHA-256 mismatch! Expected $ExpectedHash but got $ActualHash. Aborting — the downloaded zip may be corrupted or tampered with."
    }
    Write-Host "  Checksum OK: $ActualHash" -ForegroundColor DarkGray

    Write-Host "Extracting..." -ForegroundColor Cyan
    if (Test-Path $ExtractPath) { Remove-Item $ExtractPath -Recurse -Force }
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force

    $BinDir = Get-ChildItem -Path $ExtractPath -Recurse -Directory | Where-Object { $_.Name -eq 'bin' } | Select-Object -First 1
    if (-not $BinDir) { throw "Could not find bin/ in extracted archive" }

    $FfmpegSrc  = Join-Path $BinDir.FullName 'ffmpeg.exe'
    $FfprobeSrc = Join-Path $BinDir.FullName 'ffprobe.exe'

    Copy-Item -Path $FfmpegSrc  -Destination $FfmpegDest  -Force
    Copy-Item -Path $FfprobeSrc -Destination $FfprobeDest -Force
}
finally {
    if (Test-Path $ZipPath)     { Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue }
    if (Test-Path $ExtractPath) { Remove-Item $ExtractPath -Recurse -Force -ErrorAction SilentlyContinue }
}

Write-Host "Smoke-testing ffmpeg..." -ForegroundColor Cyan
$VersionLine = (& $FfmpegDest -version 2>&1 | Select-Object -First 1)
if ($LASTEXITCODE -ne 0 -or -not $VersionLine) {
    throw "ffmpeg smoke test failed. The binary may be quarantined by Windows Defender or otherwise unrunnable."
}
Write-Host "  $VersionLine" -ForegroundColor DarkGray

Write-Host "Done. Sidecars ready:" -ForegroundColor Green
Write-Host "  $FfmpegDest"
Write-Host "  $FfprobeDest"
