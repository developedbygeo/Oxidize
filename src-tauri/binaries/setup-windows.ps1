# Downloads ffmpeg + ffprobe static builds for Windows x64 and names them
# with the Rust target triple suffix Tauri's externalBin mechanism expects.
#
# Usage: from src-tauri/binaries/, run:
#   powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1

$ErrorActionPreference = 'Stop'

$ScriptDir = $PSScriptRoot
$TargetTriple = 'x86_64-pc-windows-msvc'
$ZipUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
$ZipPath = Join-Path $ScriptDir 'ffmpeg.zip'
$ExtractPath = Join-Path $ScriptDir '_ffmpeg_extracted'

Write-Host "Downloading ffmpeg static build from gyan.dev..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath

Write-Host "Extracting..." -ForegroundColor Cyan
if (Test-Path $ExtractPath) { Remove-Item $ExtractPath -Recurse -Force }
Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force

# The zip contains a versioned folder; find its bin directory
$BinDir = Get-ChildItem -Path $ExtractPath -Recurse -Directory | Where-Object { $_.Name -eq 'bin' } | Select-Object -First 1
if (-not $BinDir) { throw "Could not find bin/ in extracted archive" }

$FfmpegSrc  = Join-Path $BinDir.FullName 'ffmpeg.exe'
$FfprobeSrc = Join-Path $BinDir.FullName 'ffprobe.exe'
$FfmpegDest  = Join-Path $ScriptDir "ffmpeg-$TargetTriple.exe"
$FfprobeDest = Join-Path $ScriptDir "ffprobe-$TargetTriple.exe"

Copy-Item -Path $FfmpegSrc  -Destination $FfmpegDest  -Force
Copy-Item -Path $FfprobeSrc -Destination $FfprobeDest -Force

Write-Host "Cleaning up..." -ForegroundColor Cyan
Remove-Item $ZipPath -Force
Remove-Item $ExtractPath -Recurse -Force

Write-Host "Done. Sidecars ready:" -ForegroundColor Green
Write-Host "  $FfmpegDest"
Write-Host "  $FfprobeDest"
